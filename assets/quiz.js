/* Map Atlas — quiz engine
   Modes: Study (explore labels), Find it (tap the right marker), Name it (pick the right name).
   Each practice group is split into sets of five; clear a set with no misses to mark it done. */
(function () {
  "use strict";

  var params = new URLSearchParams(location.search);
  var idx = Math.max(0, ATLAS.findIndex(function (m) { return m.id === params.get("map"); }));
  var M = ATLAS[idx];
  var P = M.places;
  var G = {};
  M.groups.forEach(function (g) { G[g.k] = g; });

  var SIZE = 5;
  var ADV_OK = 700, ADV_NO = 1800;
  var KIND_WORD = { country: "country", city: "city", island: "island", province: "province or territory", region: "region", place: "country or territory" };
  var KIND_LABEL = { country: "Country", city: "City", island: "Island", province: "Province / Territory", region: "Disputed region", place: "Country / Territory" };

  var $ = function (id) { return document.getElementById(id); };
  var kindOf = function (k) { return P[k][6] || G[P[k][1]].kind; };
  var isCity = function (k) { return kindOf(k) === "city"; };
  var isCap = function (k) { return /^★/.test(P[k][4] || ""); };
  var note = function (k) { return (P[k][4] || "").replace(/^★\s*/, ""); };
  var groupLabel = function (k) { return G[P[k][1]].label; };
  var shuffle = function (a) { for (var x = a.length - 1; x > 0; x--) { var y = Math.floor(Math.random() * (x + 1)); var t = a[x]; a[x] = a[y]; a[y] = t; } return a; };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };

  /* ---------- Saved progress (per browser) ---------- */
  var KEY = "atlas:" + M.id;
  var cleared = new Set();
  try { (JSON.parse(localStorage.getItem(KEY) || "{}").cleared || []).forEach(function (c) { cleared.add(c); }); } catch (e) {}
  function save() { try { localStorage.setItem(KEY, JSON.stringify({ cleared: Array.from(cleared) })); } catch (e) {} }

  /* ---------- State ---------- */
  var mode = "study", group = M.groups[0].k, set = 0, order = [], i = 0, results = [], answered = null, opts = [], timer = null;

  var pool = function () { return P.map(function (_, k) { return k; }).filter(function (k) { return group === "all" || P[k][1] === group; }); };
  var nSets = function () { return Math.ceil(pool().length / SIZE); };
  var hasMix = function () { return nSets() > 1; };
  var setItems = function (s) { var p = pool(); return s === nSets() ? p : p.slice(s * SIZE, s * SIZE + SIZE); };
  var setKey = function (s) { return mode + ":" + group + ":" + (s === nSets() ? "mix" : s); };

  /* ---------- Page setup ---------- */
  document.title = M.title + " Map Quiz · Map Atlas";
  $("eyebrow").textContent = "Map quiz " + String(idx + 1).padStart(2, "0") + " of " + String(ATLAS.length).padStart(2, "0");
  $("title").textContent = M.title;
  $("subtitle").textContent = M.sub + " · " + P.length + " places";
  var map = $("map");
  map.style.setProperty("--ar", M.w + " / " + M.h);
  $("mapimg").src = M.img;
  $("mapimg").alt = "Blank outline map of " + M.title;
  var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", "lead");
  svg.setAttribute("viewBox", "0 0 " + M.w + " " + M.h);
  svg.setAttribute("preserveAspectRatio", "none");
  svg.setAttribute("aria-hidden", "true");
  map.appendChild(svg);

  var sel = $("group");
  sel.innerHTML = M.groups.map(function (g) {
    var n = P.filter(function (p) { return p[1] === g.k; }).length;
    return '<option value="' + g.k + '">' + esc(g.label) + " (" + n + ")</option>";
  }).join("") + (M.groups.length > 1 ? '<option value="all">Everything (' + P.length + ")</option>" : "");
  sel.onchange = function () { group = sel.value; start(0); };

  document.querySelectorAll("[data-m]").forEach(function (b) {
    b.onclick = function () {
      mode = b.dataset.m;
      document.querySelectorAll("[data-m]").forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
      start(0);
    };
  });

  // Legend: only the marker kinds this map uses
  var kinds = [];
  P.forEach(function (_, k) { var kd = kindOf(k); if (kinds.indexOf(kd) < 0) kinds.push(kd); });
  var legend = kinds.filter(function (kd) { return kd !== "region"; }).map(function (kd) {
    return '<span><i class="' + kd + '"></i>' + KIND_LABEL[kd] + "</span>";
  });
  if (P.some(function (_, k) { return isCap(k); })) legend.push('<span><i class="cap"></i>Capital city</span>');
  if (Object.keys(M.callouts || {}).length) legend.push('<span><svg width="18" height="8" aria-hidden="true"><line x1="0" y1="4" x2="18" y2="4" stroke="currentColor" stroke-dasharray="3 2"/></svg>Points to a small place</span>');
  $("legend").innerHTML = legend.join("");

  // Reference table
  $("refbody").innerHTML = P.map(function (p, k) {
    return '<tr data-k="' + k + '"><td>' + esc(p[0]) + (isCap(k) ? " ★" : "") + '</td><td class="type">' + esc(KIND_LABEL[kindOf(k)]) + " · " + esc(groupLabel(k)) + "</td><td>" + esc(note(k)) + "</td></tr>";
  }).join("");
  $("refbody").querySelectorAll("tr").forEach(function (tr) {
    tr.onclick = function () { focusPlace(+tr.dataset.k); };
  });

  /* ---------- Markers ---------- */
  function drawPins(list, onTap) {
    map.querySelectorAll(".pin").forEach(function (e) { e.remove(); });
    var co = M.callouts || {};
    svg.innerHTML = list.filter(function (k) { return co[P[k][0]]; }).map(function (k) {
      var t = co[P[k][0]];
      return '<line x1="' + P[k][2] + '" y1="' + P[k][3] + '" x2="' + t[0] + '" y2="' + t[1] + '"/><circle cx="' + t[0] + '" cy="' + t[1] + '" r="2.4"/>';
    }).join("");
    list.forEach(function (k) {
      var p = P[k], side = p[5];
      var b = document.createElement("button");
      b.type = "button";
      b.className = "pin k-" + kindOf(k) + (isCap(k) ? " cap" : "") + (side === "l" ? " left" : side === "u" ? " up" : side === "d" ? " down" : "");
      b.style.left = (p[2] / M.w * 100) + "%";
      b.style.top = (p[3] / M.h * 100) + "%";
      b.dataset.k = k;
      b.setAttribute("aria-label", mode === "study" ? p[0] : "Map marker");
      b.innerHTML = "<i></i>";
      if (onTap) b.onclick = function () { onTap(k, b); }; else b.disabled = true;
      map.appendChild(b);
    });
  }
  var pinEl = function (k) { return map.querySelector('.pin[data-k="' + k + '"]'); };
  function label(k) {
    var el = pinEl(k);
    if (el && !el.querySelector("b")) { var b = document.createElement("b"); b.textContent = P[k][0]; el.appendChild(b); }
  }

  /* ---------- Rendering ---------- */
  function renderSets() {
    var n = nSets();
    $("setsWrap").hidden = mode === "study";
    var chips = [];
    for (var s = 0; s < n; s++) chips.push(s);
    if (hasMix()) chips.push(n);
    $("sets").innerHTML = chips.map(function (s) {
      var done = cleared.has(setKey(s));
      return '<button type="button" class="chip' + (done ? " done" : "") + '" aria-pressed="' + (s === set) + '" data-s="' + s + '">' + (s === n ? "Full mix" : "Set " + (s + 1)) + "</button>";
    }).join("");
    $("sets").querySelectorAll("button").forEach(function (b) { b.onclick = function () { start(+b.dataset.s); }; });
  }

  function renderProgress() {
    var show = mode !== "study";
    $("progress").hidden = !show;
    if (!show) return;
    $("pbar").innerHTML = order.map(function (_, n) {
      return "<i" + (n < results.length ? ' class="' + (results[n] ? "ok" : "no") + '"' : n === i ? ' class="cur"' : "") + "></i>";
    }).join("");
    var right = results.filter(Boolean).length;
    $("pcount").textContent = i < order.length ? "Question " + (i + 1) + " of " + order.length : "Complete";
    $("pscore").textContent = right + " correct" + (results.length - right ? " · " + (results.length - right) + " missed" : "");
  }

  function setPrompt(cls, k, q, t) {
    var pr = $("prompt");
    pr.className = "card-q" + (cls ? " " + cls : "");
    pr.innerHTML = '<span class="k"><span>' + k + "</span></span>" + (q ? '<span class="q">' + q + "</span>" : "") + (t ? '<span class="t">' + t + "</span>" : "");
  }

  function placeInfo(k) {
    return esc(KIND_LABEL[kindOf(k)]) + (isCap(k) ? " · Capital" : "") + " · " + esc(groupLabel(k));
  }

  function start(s) {
    clearTimeout(timer);
    set = Math.min(s, nSets());
    order = shuffle(setItems(set).slice());
    i = 0; results = []; answered = null;
    makeOpts();
    draw();
  }

  function makeOpts() {
    if (mode !== "name" || i >= order.length) return;
    var cur = order[i], kd = kindOf(cur);
    var same = shuffle(P.map(function (_, k) { return k; }).filter(function (k) { return k !== cur && P[k][1] === P[cur][1]; }));
    var more = shuffle(P.map(function (_, k) { return k; }).filter(function (k) { return k !== cur && P[k][1] !== P[cur][1] && isCity(k) === isCity(cur); }));
    opts = shuffle([cur].concat(same.concat(more).slice(0, 3)));
    void kd;
  }

  function draw() {
    $("opts").hidden = true; $("opts").innerHTML = ""; $("actions").innerHTML = "";
    renderSets(); renderProgress();

    if (mode === "study") {
      $("kbd").innerHTML = "";
      setPrompt("", "Study", "Explore the map", "Every marker is labeled. Select one for details, then switch to <b>Find it</b> or <b>Name it</b> to test yourself.");
      var ks = pool();
      drawPins(ks, function (k) {
        map.querySelectorAll(".pin.hl").forEach(function (e) { e.classList.remove("hl"); });
        pinEl(k).classList.add("hl");
        setPrompt("", placeInfo(k), esc(P[k][0]), esc(note(k)));
      });
      ks.forEach(label);
      return;
    }

    if (i >= order.length) return finish();

    var cur = order[i];
    if (mode === "find") {
      $("kbd").innerHTML = "";
      setPrompt("", "Find the " + KIND_WORD[kindOf(cur)], esc(P[cur][0]), "Select its marker on the map.");
      var list = P.map(function (_, k) { return k; }).filter(function (k) { return isCity(k) === isCity(cur); });
      drawPins(list, function (k, el) {
        if (answered !== null) return;
        answered = k;
        var ok = k === cur;
        results.push(ok);
        el.classList.add(ok ? "ok" : "no");
        pinEl(cur).classList.add("ok");
        label(cur); if (!ok) label(k);
        feedback(ok, cur, ok ? "" : "You chose " + esc(P[k][0]) + ".");
      });
    } else {
      $("kbd").innerHTML = "Keyboard: <kbd>1</kbd>–<kbd>4</kbd> to answer";
      setPrompt("", "Name this " + KIND_WORD[kindOf(cur)], "Which place is highlighted?", "");
      drawPins(pool(), null);
      pinEl(cur).classList.add("hl");
      var o = $("opts");
      o.hidden = false;
      o.innerHTML = opts.map(function (k, n) { return '<button type="button" class="opt" data-k="' + k + '"><kbd>' + (n + 1) + "</kbd><span>" + esc(P[k][0]) + "</span></button>"; }).join("");
      o.querySelectorAll("button").forEach(function (b) { b.onclick = function () { pick(+b.dataset.k); }; });
    }
  }

  function pick(k) {
    if (answered !== null || mode !== "name") return;
    var cur = order[i], ok = k === cur;
    answered = k; results.push(ok);
    $("opts").querySelectorAll("button").forEach(function (b) {
      b.disabled = true;
      if (+b.dataset.k === cur) b.classList.add("right"); else if (+b.dataset.k === k) b.classList.add("wrong");
    });
    var el = pinEl(cur); el.classList.remove("hl"); el.classList.add(ok ? "ok" : "no"); label(cur);
    feedback(ok, cur, "");
  }

  function feedback(ok, cur, extra) {
    renderProgress();
    setPrompt(ok ? "ok" : "no", ok ? "Correct" : "Not quite", esc(P[cur][0]), (extra ? extra + " " : "") + esc(note(cur)));
    clearTimeout(timer);
    timer = setTimeout(advance, ok ? ADV_OK : ADV_NO);
  }

  function advance() {
    clearTimeout(timer);
    if (answered === null) return;
    i++; answered = null; makeOpts(); draw();
  }

  function finish() {
    var n = nSets(), total = order.length, right = results.filter(Boolean).length, perfect = right === total;
    if (perfect) { cleared.add(setKey(set)); save(); }
    renderSets(); renderProgress();
    $("kbd").innerHTML = "";
    drawPins(pool(), null);
    order.forEach(function (k, n2) { label(k); pinEl(k).classList.add(results[n2] ? "ok" : "no"); });
    var missed = order.filter(function (_, n2) { return !results[n2]; }).map(function (k) { return esc(P[k][0]); });
    var name = set === n ? "Full mix" : "Set " + (set + 1);
    setPrompt(perfect ? "ok" : "no", name + (perfect ? " · Cleared" : " · Try again"), right + " / " + total,
      perfect ? (set === n || !hasMix() ? "Every place, one run. You know this map." : "Perfect run. The next set is ready.")
              : "Missed: " + missed.join(", ") + ". Clear the set with no misses to move on.");
    var a = $("actions");
    var primary = document.createElement("button");
    primary.type = "button"; primary.className = "btn";
    var last = set === n || !hasMix();
    if (perfect) {
      primary.textContent = last ? "Run it again" : (set + 1 === n ? "Start the full mix" : "Continue to Set " + (set + 2));
      primary.onclick = function () { start(last ? set : set + 1); };
    } else {
      primary.textContent = "Retry " + name;
      primary.onclick = function () { start(set); };
    }
    a.appendChild(primary);
    primary.focus({ preventScroll: true });
  }

  function focusPlace(k) {
    if (mode !== "study") {
      mode = "study";
      document.querySelectorAll("[data-m]").forEach(function (x) { x.setAttribute("aria-pressed", String(x.dataset.m === "study")); });
    }
    if (group !== "all" && P[k][1] !== group) { group = P[k][1]; sel.value = group; }
    start(0);
    var el = pinEl(k);
    if (el) { el.classList.add("hl"); setPrompt("", placeInfo(k), esc(P[k][0]), esc(note(k))); }
    map.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  document.addEventListener("keydown", function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.target.tagName === "SELECT") return;
    if (mode === "name" && answered === null && /^[1-4]$/.test(e.key) && opts[+e.key - 1] !== undefined) { e.preventDefault(); pick(opts[+e.key - 1]); }
    else if (e.key === "Enter" && answered !== null && e.target.tagName !== "BUTTON") advance();
  });

  start(0);
})();
