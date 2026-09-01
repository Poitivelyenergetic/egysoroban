export var state = {
    lang: "en",
    applications: [],
    adminOpen: false,
    isSignedIn: false,
    role: null,
};

try {
    var savedLang = localStorage.getItem("egysoroban_lang");
    if (savedLang === "en" || savedLang === "ar") state.lang = savedLang;
} catch (e) { }
