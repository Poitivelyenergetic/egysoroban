function initMomentsLightbox() {
    var box = document.getElementById("moments-lightbox");
    if (!box) return;

    var imgs = Array.prototype.slice.call(document.querySelectorAll(".moments-grid img"));
    if (imgs.length === 0) return;
    var imgEl = document.getElementById("lightbox-img");
    var captionEl = document.getElementById("lightbox-caption");
    var closeBtn = document.getElementById("lightbox-close");
    var prevBtn = document.getElementById("lightbox-prev");
    var nextBtn = document.getElementById("lightbox-next");
    var index = 0;

    function show(i) {
        index = ((i % imgs.length) + imgs.length) % imgs.length;
        var src = imgs[index].currentSrc || imgs[index].src;
        imgEl.src = src;
        imgEl.alt = imgs[index].alt || "";
        captionEl.textContent = imgs[index].alt || "";
    }

    function open(i) {
        show(i);
        box.hidden = false;
        document.body.style.overflow = "hidden";
    }

    function close() {
        box.hidden = true;
        imgEl.src = "";
        document.body.style.overflow = "";
    }

    imgs.forEach(function (img, i) {
        img.addEventListener("click", function () { open(i); });
    });

    closeBtn.addEventListener("click", close);
    prevBtn.addEventListener("click", function () { show(index - 1); });
    nextBtn.addEventListener("click", function () { show(index + 1); });
    box.addEventListener("click", function (e) { if (e.target === box) close(); });

    document.addEventListener("keydown", function (e) {
        if (box.hidden) return;
        if (e.key === "Escape") close();
        else if (e.key === "ArrowLeft") show(index - 1);
        else if (e.key === "ArrowRight") show(index + 1);
    });
}

initMomentsLightbox();
