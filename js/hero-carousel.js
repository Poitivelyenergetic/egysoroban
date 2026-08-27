var ROTATE_MS = 10000;

function initHeroCarousel() {
    var root = document.getElementById("hero-carousel");
    if (!root) return;

    var slides = Array.prototype.slice.call(root.querySelectorAll(".hero-slide"));
    var dotsWrap = document.getElementById("hero-carousel-dots");
    if (slides.length === 0) return;

    var index = 0;
    var timer = null;

    var dots = slides.map(function (_, i) {
        var dot = document.createElement("button");
        dot.type = "button";
        dot.setAttribute("aria-label", "Slide " + (i + 1));
        dot.addEventListener("click", function () { goTo(i); restart(); });
        dotsWrap.appendChild(dot);
        return dot;
    });

    function render() {
        slides.forEach(function (slide, i) {
            slide.classList.toggle("active", i === index);
        });
        dots.forEach(function (dot, i) {
            dot.classList.toggle("on", i === index);
        });
    }

    function goTo(i) {
        index = ((i % slides.length) + slides.length) % slides.length;
        render();
    }

    function next() { goTo(index + 1); }
    function prev() { goTo(index - 1); }

    function restart() {
        clearInterval(timer);
        timer = setInterval(next, ROTATE_MS);
    }

    render();
    restart();

    root.addEventListener("mouseenter", function () { clearInterval(timer); });
    root.addEventListener("mouseleave", restart);

    var prevBtn = document.getElementById("hero-carousel-prev");
    var nextBtn = document.getElementById("hero-carousel-next");
    if (prevBtn) prevBtn.addEventListener("click", function () { prev(); restart(); });
    if (nextBtn) nextBtn.addEventListener("click", function () { next(); restart(); });
}

initHeroCarousel();
