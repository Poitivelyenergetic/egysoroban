export var state = {
    lang: "en",
    applications: [],
    adminOpen: false,
    isAdmin: false,
    role: null,
    /* Set by admin.js once the dashboard exists, so a panel can send you to
       another panel without importing admin.js — which imports every panel and
       would make the dependency circular. Null until then, so callers check. */
    openPanel: null,
};

try {
    var savedLang = localStorage.getItem("egysoroban_lang");
    if (savedLang === "en" || savedLang === "ar") state.lang = savedLang;
} catch (e) { }
