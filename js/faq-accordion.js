document.querySelectorAll(".faq-item").forEach(function (item) {
    var btn = item.querySelector(".faq-q");
    btn.addEventListener("click", function () {
        var isOpen = item.getAttribute("data-open") === "true";
        item.setAttribute("data-open", isOpen ? "false" : "true");
    });
});
