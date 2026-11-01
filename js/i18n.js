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

/* Put a translation into an element without wiping its child elements.
   A label like `Email <span data-i18n="apply.optional">(optional)</span>` only
   has its own words swapped; the <span> stays and is translated by its own key.
   The value always comes from the key, so switching EN/AR back and forth
   replaces the text each time rather than adding to it. */
function setTranslatedText(el, val) {
    if (el.children.length === 0) { el.textContent = val; return; }
    var target = null;
    for (var n = el.firstChild; n; n = n.nextSibling) {
        if (n.nodeType !== 3 || !n.nodeValue.trim()) continue;
        if (!target) target = n;
        else n.nodeValue = "";            /* the key's text covers the whole sentence */
    }
    if (target) {
        /* Keep the spacing around the words so the gap before the child stays. */
        var lead = target.nodeValue.match(/^\s*/)[0];
        var trail = target.nodeValue.match(/\s*$/)[0];
        target.nodeValue = lead + val + trail;
    } else {
        el.insertBefore(document.createTextNode(val + " "), el.firstChild);
    }
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
        if (val) setTranslatedText(nodes[i], val);
    }
    var placeholders = document.querySelectorAll("[data-i18n-placeholder]");
    for (var j = 0; j < placeholders.length; j++) {
        var pkey = placeholders[j].getAttribute("data-i18n-placeholder");
        var pval = t(pkey, lang);
        if (pval) placeholders[j].setAttribute("placeholder", pval);
    }

    /* Controls in the admin toolbars sit outside a .field wrapper and have no
       visible <label>, so their only accessible name is an aria-label — which
       has to be translated like any other visible string. */
    var ariaNodes = document.querySelectorAll("[data-i18n-aria-label]");
    for (var k = 0; k < ariaNodes.length; k++) {
        var akey = ariaNodes[k].getAttribute("data-i18n-aria-label");
        var aval = t(akey, lang);
        if (aval) ariaNodes[k].setAttribute("aria-label", aval);
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
