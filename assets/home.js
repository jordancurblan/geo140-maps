/* Home page: region cards with saved progress. */
(function () {
  "use strict";
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };
  var total = 0, cities = 0;
  var html = ATLAS.map(function (m, n) {
    total += m.places.length;
    var kinds = {};
    m.groups.forEach(function (g) { kinds[g.k] = g.kind; });
    var c = m.places.filter(function (p) { return kinds[p[1]] === "city"; }).length;
    cities += c;
    var sets = 0;
    m.groups.forEach(function (g) {
      var s = Math.ceil(m.places.filter(function (p) { return p[1] === g.k; }).length / 5);
      sets += s + (s > 1 ? 1 : 0);
    });
    sets *= 2; // Find it + Name it
    var done = 0;
    try { done = ((JSON.parse(localStorage.getItem("atlas:" + m.id) || "{}").cleared) || []).filter(function (k) { return !/:all:/.test(k); }).length; } catch (e) {}
    var pct = Math.min(100, Math.round(done / sets * 100));
    var isNew = n === ATLAS.length - 1;
    return '<a class="card" href="quiz.html?map=' + m.id + '">' +
      '<div class="card-media"><img src="' + m.img + '" alt="" loading="lazy"><span class="card-num">' + String(n + 1).padStart(2, "0") + "</span>" + (isNew ? '<span class="card-tag">New</span>' : "") + "</div>" +
      '<div class="card-body"><h3>' + esc(m.title) + '</h3><p class="sub">' + esc(m.sub) + '</p><p class="desc">' + esc(m.blurb) + "</p>" +
      '<div class="meter" title="' + pct + '% of sets cleared"><i style="width:' + pct + '%"></i></div>' +
      '<div class="card-foot"><span>' + m.places.length + " places · " + (pct ? pct + "% cleared" : m.groups.length + (m.groups.length === 1 ? " group" : " groups")) + '</span><span class="go">Start <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M3 8h10M9 4l4 4-4 4"/></svg></span></div>' +
      "</div></a>";
  }).join("");
  document.getElementById("cards").innerHTML = html;
  document.getElementById("s-regions").textContent = ATLAS.length;
  document.getElementById("s-places").textContent = total;
  document.getElementById("s-cities").textContent = cities;
})();
