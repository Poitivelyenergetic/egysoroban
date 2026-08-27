function initLightbox() {
    var box = document.getElementById("moments-lightbox");
    if (!box) return;

    var imgEl = document.getElementById("lightbox-img");
    var captionEl = document.getElementById("lightbox-caption");
    var closeBtn = document.getElementById("lightbox-close");
    var prevBtn = document.getElementById("lightbox-prev");
    var nextBtn = document.getElementById("lightbox-next");

    var currentImgs = [];
    var index = 0;

    function show(i) {
        if (currentImgs.length === 0) return;
        index = ((i % currentImgs.length) + currentImgs.length) % currentImgs.length;
        var src = currentImgs[index].currentSrc || currentImgs[index].src;
        imgEl.src = src;
        imgEl.alt = currentImgs[index].alt || "";
        captionEl.textContent = currentImgs[index].alt || "";
    }

    function open(imgs, startIndex) {
        currentImgs = imgs;
        show(startIndex);
        box.hidden = false;
        document.body.style.overflow = "hidden";
    }

    function close() {
        box.hidden = true;
        imgEl.src = "";
        document.body.style.overflow = "";
    }

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

    var galleryRoots = Array.prototype.slice.call(document.querySelectorAll(".moments-grid, .carousel"));
    galleryRoots.forEach(function (root) {
        var imgs = Array.prototype.slice.call(root.querySelectorAll("img"));
        imgs.forEach(function (img, i) {
            img.style.cursor = "zoom-in";
            img.addEventListener("click", function () { open(imgs, i); });
        });
    });
}

initLightbox();
