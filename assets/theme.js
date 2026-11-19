/* Theme: follows the system setting until the visitor picks one. */
(function () {
  var root = document.documentElement;
  try { var t = localStorage.getItem("atlas:theme"); if (t) root.setAttribute("data-theme", t); } catch (e) {}
  var btn = document.getElementById("theme");
  if (!btn) return;
  btn.addEventListener("click", function () {
    var cur = root.getAttribute("data-theme") || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    var next = cur === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    try { localStorage.setItem("atlas:theme", next); } catch (e) {}
  });
})();
