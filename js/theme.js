/* There is more than one theme switch on the page: the site header's, and the
   admin dashboard's own — the dashboard is an overlay above the header, so
   staff can't reach the header one while they're working in it. Both are
   driven from here so the two can never disagree about the current theme. */
function themeToggleButtons() {
    return document.querySelectorAll("#theme-toggle, .js-theme-toggle");
}

function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    try { localStorage.setItem("egysoroban_theme", theme); } catch (e) { }
    var label = theme === "dark" ? "☀️" : "🌙";
    themeToggleButtons().forEach(function (btn) { btn.textContent = label; });
}

var savedTheme = "dark";
try {
    var storedTheme = localStorage.getItem("egysoroban_theme");
    if (storedTheme === "light" || storedTheme === "dark") savedTheme = storedTheme;
} catch (e) { }
applyTheme(savedTheme);

themeToggleButtons().forEach(function (btn) {
    btn.addEventListener("click", function () {
        var current = document.documentElement.getAttribute("data-theme");
        applyTheme(current === "dark" ? "light" : "dark");
    });
});
