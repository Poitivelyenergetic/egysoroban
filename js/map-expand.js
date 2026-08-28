import { t, onLanguageChangeCallbacks } from "./i18n.js";

/* The homepage map's expand control.
 *
 * It is a button under the map rather than the map itself, because the embed
 * is a cross-origin iframe and swallows every click before the page sees one —
 * making the map its own control simply does nothing. Sitting underneath also
 * keeps it off the pins and Google's own controls.
 *
 * The contact page has its own version of this: there the location card below
 * the map is the control, wired in contact-page.js. */
function mapFor(btn) {
    var block = btn.closest(".contact-map-block");
    return block ? block.querySelector(".contact-map") : null;
}

function syncLabel(btn, map) {
    btn.textContent = t(map.classList.contains("expanded") ? "home.mapClickCollapse" : "home.mapClickExpand");
}

document.querySelectorAll("[data-map-toggle]").forEach(function (btn) {
    var map = mapFor(btn);
    if (!map) return;
    syncLabel(btn, map);
    btn.addEventListener("click", function () {
        var expanded = map.classList.toggle("expanded");
        btn.setAttribute("aria-expanded", expanded ? "true" : "false");
        syncLabel(btn, map);
    });
    onLanguageChangeCallbacks.push(function () { syncLabel(btn, map); });
});
