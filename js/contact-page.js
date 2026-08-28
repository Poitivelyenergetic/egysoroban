import "./i18n.js";
import "./theme.js";
import "./mobile-nav.js";
import "./scroll-reveal.js";
import { t, onLanguageChangeCallbacks } from "./i18n.js";

var mapEl = document.getElementById("contact-map");
var mapToggleBtn = document.getElementById("contact-map-toggle");
var mapToggleLabel = mapToggleBtn ? mapToggleBtn.querySelector("span:last-child") : null;

function syncMapToggleLabel() {
    if (!mapToggleLabel) return;
    mapToggleLabel.textContent = t(mapEl.classList.contains("expanded") ? "contact.mapCollapse" : "contact.mapExpand");
}

if (mapEl && mapToggleBtn) {
    mapToggleBtn.addEventListener("click", function () {
        var expanded = mapEl.classList.toggle("expanded");
        mapToggleBtn.setAttribute("aria-expanded", expanded ? "true" : "false");
        syncMapToggleLabel();
    });
    onLanguageChangeCallbacks.push(syncMapToggleLabel);
}
