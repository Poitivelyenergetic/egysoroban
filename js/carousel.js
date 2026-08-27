var ROTATE_MS = 10000;

function initCarousel(root) {
    var slides = Array.prototype.slice.call(root.querySelectorAll(".carousel-slide"));
    var dotsWrap = root.querySelector(".carousel-dots");
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

    var prevBtn = root.querySelector(".carousel-arrow.prev");
    var nextBtn = root.querySelector(".carousel-arrow.next");
    if (prevBtn) prevBtn.addEventListener("click", function () { prev(); restart(); });
    if (nextBtn) nextBtn.addEventListener("click", function () { next(); restart(); });
}

Array.prototype.slice.call(document.querySelectorAll(".carousel")).forEach(initCarousel);
