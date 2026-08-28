import "./i18n.js";
import "./theme.js";
import "./mobile-nav.js";
import "./active-nav.js";
import "./location-gate.js";
import "./scroll-reveal.js";
import { t, onLanguageChangeCallbacks } from "./i18n.js";

/* The location card sits under the map and doubles as its expand control, so
   there's one thing to click instead of a separate button floating on top of
   the map covering the pins. */
var mapEl = document.getElementById("contact-map");
var mapToggleBtn = document.getElementById("contact-map-toggle");
var mapHint = mapToggleBtn ? mapToggleBtn.querySelector(".home-map-hint") : null;

function syncMapHint() {
    if (!mapHint || !mapEl) return;
    mapHint.textContent = t(mapEl.classList.contains("expanded") ? "home.mapClickCollapse" : "home.mapClickExpand");
}

if (mapEl && mapToggleBtn) {
    mapToggleBtn.addEventListener("click", function () {
        var expanded = mapEl.classList.toggle("expanded");
        mapToggleBtn.setAttribute("aria-expanded", expanded ? "true" : "false");
        syncMapHint();
    });
    onLanguageChangeCallbacks.push(syncMapHint);
}
