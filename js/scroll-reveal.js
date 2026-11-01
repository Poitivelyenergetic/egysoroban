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
        { selector: ".apply-side", dir: "right" },
        { selector: ".section-title", dir: "up" },
        { selector: ".section-lede", dir: "up" },
        { selector: ".eyebrow", dir: "up" }
    ];

    /* Anything inside a form is never revealed: people start typing the moment
       the page loads, and a field that is still fading in (or hidden until it
       scrolls into view) just gets in their way. */
    function insideForm(el) {
        return !!el.closest("form, .app-form") || /^(INPUT|SELECT|TEXTAREA|BUTTON|LABEL)$/.test(el.tagName);
    }

    var els = [];
    groups.forEach(function (g) {
        var matches = Array.prototype.slice.call(document.querySelectorAll(g.selector)).filter(function (el) {
            return !el.closest(".hero") && !insideForm(el);
        });
        matches.forEach(function (el, i) {
            el.classList.add("reveal-target");
            var dir = g.dir === "alt" ? (i % 2 === 0 ? "left" : "right") : g.dir;
            if (dir === "left") el.classList.add("reveal-left");
            else if (dir === "right") el.classList.add("reveal-right");
            els.push(el);
        });
    });
    if (els.length === 0) return;

    /* Stagger by arrival, not by position in the page: items that scroll in
       together step 60ms apart, capped at 300ms, so nothing ever waits long. */
    var STEP = 60, MAX_DELAY = 300, DURATION = 400;

    var observer = new IntersectionObserver(function (entries) {
        var k = 0;
        entries.forEach(function (entry) {
            if (!entry.isIntersecting) return;
            var el = entry.target;
            var delay = Math.min(k++ * STEP, MAX_DELAY);
            el.style.transitionDelay = delay + "ms";
            el.classList.add("in-view");
            observer.unobserve(el);
            /* Once it has landed, hand the element back to its own transitions
               (card hover lift) and drop the delay so hover isn't sluggish. */
            setTimeout(function () {
                el.classList.add("revealed");
                el.style.transitionDelay = "";
            }, delay + DURATION + 50);
        });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });

    els.forEach(function (el) { observer.observe(el); });
}

initScrollReveal();
