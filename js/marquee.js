/* The highlights strip slides by exactly one copy of its list, so it needs a
   second copy right after the first for the loop to look endless. The copy is
   hidden from screen readers; its [data-i18n] text still follows language
   changes because applyLanguage() translates every matching node. */
document.querySelectorAll(".marquee-track").forEach(function (track) {
    var group = track.querySelector(".marquee-group");
    if (!group) return;
    var copy = group.cloneNode(true);
    copy.setAttribute("aria-hidden", "true");
    track.appendChild(copy);
});
