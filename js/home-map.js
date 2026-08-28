import { t, onLanguageChangeCallbacks } from "./i18n.js";

var mapEl = document.getElementById("home-map");
var mapToggleBtn = document.getElementById("home-map-toggle");
var mapHint = mapToggleBtn ? mapToggleBtn.querySelector(".home-map-hint") : null;

function syncMapHint() {
    if (!mapHint) return;
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
