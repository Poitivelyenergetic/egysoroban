function initScrollReveal() {
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!("IntersectionObserver" in window)) return;

    var groups = [
        { selector: ".about-carousel", dir: "left" },
        { selector: ".stat-card", dir: "alt" },
        { selector: ".benefit-card", dir: "alt" },
        { selector: ".level-card", dir: "alt" },
        { selector: ".journey-step", dir: "alt" },
        { selector: ".instructor-card", dir: "alt" },
        { selector: ".quote-card", dir: "alt" },
        { selector: ".achievement-photo", dir: "right" },
        { selector: ".moments-grid img", dir: "up" },
        { selector: ".mv-card", dir: "alt" },
        { selector: ".news-card", dir: "alt" },
        { selector: ".achv-col", dir: "alt" },
        { selector: ".achv-stats", dir: "right" },
        { selector: ".wapr-carousel", dir: "up" },
        { selector: ".faq-item", dir: "up" },
        { selector: ".try-card", dir: "alt" },
        { selector: ".contact-item", dir: "left" },
        { selector: ".contact-map", dir: "right" },
        { selector: ".app-form", dir: "left" },
        { selector: ".apply-side", dir: "right" },
        { selector: ".section-title", dir: "up" },
        { selector: ".section-lede", dir: "up" },
        { selector: ".eyebrow", dir: "up" }
    ];

    var els = [];
    groups.forEach(function (g) {
        var matches = Array.prototype.slice.call(document.querySelectorAll(g.selector)).filter(function (el) {
            return !el.closest(".hero");
        });
        matches.forEach(function (el, i) {
            el.classList.add("reveal-target");
            var dir = g.dir === "alt" ? (i % 2 === 0 ? "left" : "right") : g.dir;
            if (dir === "left") el.classList.add("reveal-left");
            else if (dir === "right") el.classList.add("reveal-right");
            el.style.transitionDelay = (Math.min(i, 6) * 70) + "ms";
            els.push(el);
        });
    });
    if (els.length === 0) return;

    var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            if (entry.isIntersecting) {
                entry.target.classList.add("in-view");
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });

    els.forEach(function (el) { observer.observe(el); });
}

initScrollReveal();
