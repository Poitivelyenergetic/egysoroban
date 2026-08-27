var navToggle = document.getElementById("nav-toggle");
var mainNav = document.getElementById("main-nav");
if (navToggle && mainNav) {
    navToggle.addEventListener("click", function () {
        var open = mainNav.classList.toggle("is-open");
        navToggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    mainNav.querySelectorAll("a").forEach(function (a) {
        a.addEventListener("click", function () {
            mainNav.classList.remove("is-open");
            navToggle.setAttribute("aria-expanded", "false");
        });
    });
}
