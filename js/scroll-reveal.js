function initScrollReveal() {
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!("IntersectionObserver" in window)) return;

    var selectors = [
        ".about-carousel", ".stat-card", ".benefit-card", ".level-card", ".journey-step",
        ".instructor-card", ".quote-card", ".achievement-photo", ".moments-grid img",
        ".mv-card", ".news-card", ".achv-col", ".achv-stats",
        ".wapr-carousel", ".faq-item", ".try-card", ".contact-item", ".contact-map",
        ".app-form", ".apply-side", ".section-title", ".section-lede", ".eyebrow"
    ].join(", ");

    var els = Array.prototype.slice.call(document.querySelectorAll(selectors)).filter(function (el) {
        return !el.closest(".hero");
    });
    if (els.length === 0) return;

    els.forEach(function (el) { el.classList.add("reveal-target"); });

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
