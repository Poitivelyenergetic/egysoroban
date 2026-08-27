function initCountUp() {
    var els = Array.prototype.slice.call(document.querySelectorAll("[data-count]"));
    if (els.length === 0) return;

    var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function animate(el) {
        var target = parseInt(el.getAttribute("data-count"), 10) || 0;
        var suffix = el.getAttribute("data-suffix") || "+";
        if (reduceMotion) {
            el.textContent = target + suffix;
            return;
        }
        var duration = 1400;
        var start = null;
        function step(ts) {
            if (start === null) start = ts;
            var progress = Math.min((ts - start) / duration, 1);
            var eased = 1 - Math.pow(1 - progress, 3);
            el.textContent = Math.round(eased * target) + suffix;
            if (progress < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
    }

    if (!("IntersectionObserver" in window)) {
        els.forEach(animate);
        return;
    }

    var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            if (entry.isIntersecting) {
                animate(entry.target);
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.4, rootMargin: "0px 0px -150px 0px" });

    els.forEach(function (el) { observer.observe(el); });
}

initCountUp();
