function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    try { localStorage.setItem("egysoroban_theme", theme); } catch (e) { }
    var themeToggleBtn = document.getElementById("theme-toggle");
    if (themeToggleBtn) themeToggleBtn.textContent = theme === "dark" ? "☀️" : "🌙";
}

var savedTheme = "dark";
try {
    var storedTheme = localStorage.getItem("egysoroban_theme");
    if (storedTheme === "light" || storedTheme === "dark") savedTheme = storedTheme;
} catch (e) { }
applyTheme(savedTheme);

var themeToggleBtn = document.getElementById("theme-toggle");
if (themeToggleBtn) {
    themeToggleBtn.addEventListener("click", function () {
        var current = document.documentElement.getAttribute("data-theme");
        applyTheme(current === "dark" ? "light" : "dark");
    });
}
