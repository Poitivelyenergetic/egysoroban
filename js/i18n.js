import { translations } from "./translations.js";
import { state } from "./state.js";

export var onLanguageChangeCallbacks = [];

export function t(key, lang) {
    var l = lang || state.lang;
    var v = (translations[l] && translations[l][key]) || (translations.en && translations.en[key]);
    return v == null ? "" : v;
}

export function fmtDate(iso) {
    try {
        var d = new Date(iso);
        return d.toLocaleDateString(state.lang === "ar" ? "ar-EG" : "en-GB", { year: "numeric", month: "short", day: "numeric" }) +
            " · " + d.toLocaleTimeString(state.lang === "ar" ? "ar-EG" : "en-GB", { hour: "2-digit", minute: "2-digit" });
    } catch (e) { return iso || ""; }
}

export function applyLanguage(lang) {
    state.lang = lang;
    try { localStorage.setItem("egysoroban_lang", lang); } catch (e) { }
    document.documentElement.setAttribute("lang", lang);
    document.documentElement.setAttribute("dir", lang === "ar" ? "rtl" : "ltr");
    document.documentElement.setAttribute("data-lang", lang);

    var nodes = document.querySelectorAll("[data-i18n]");
    for (var i = 0; i < nodes.length; i++) {
        var key = nodes[i].getAttribute("data-i18n");
        var val = t(key, lang);
        if (val) nodes[i].textContent = val;
    }
    var placeholders = document.querySelectorAll("[data-i18n-placeholder]");
    for (var j = 0; j < placeholders.length; j++) {
        var pkey = placeholders[j].getAttribute("data-i18n-placeholder");
        var pval = t(pkey, lang);
        if (pval) placeholders[j].setAttribute("placeholder", pval);
    }

    var label = lang === "ar" ? "EN / عربي" : "عربي / EN";
    langToggleButtons().forEach(function (btn) { btn.textContent = label; });

    onLanguageChangeCallbacks.forEach(function (cb) { cb(); });
}

/* The admin dashboard sits above the site header and carries its own copy of
   this control, so every instance is wired rather than a single element by id. */
function langToggleButtons() {
    return document.querySelectorAll("#lang-toggle, .js-lang-toggle");
}

langToggleButtons().forEach(function (btn) {
    btn.addEventListener("click", function () {
        applyLanguage(state.lang === "ar" ? "en" : "ar");
    });
});
applyLanguage(state.lang);
