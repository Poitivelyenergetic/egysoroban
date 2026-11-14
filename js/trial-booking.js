import { t, onLanguageChangeCallbacks } from "./i18n.js";
import { BRANCHES } from "./branches.js";

/*
 * The homepage's two-step "book a free trial" card. Nothing is stored: the
 * answers become a pre-filled WhatsApp message to the academy, so there is no
 * new place for a child's details to live and nothing new for the Firestore
 * rules to guard. The full application form (apply.html) is still the way to
 * enrol.
 */
var WHATSAPP_NUMBER = "201557794946";

var form = document.getElementById("book-form");
if (form) initBooking(form);
initStickyBar();

function initBooking(form) {
    var stepEls = form.querySelectorAll(".book-step");
    var done = form.querySelector(".book-done");
    var stepNum = document.getElementById("book-step-n");
    var errorEl = form.querySelector(".book-error");
    var branchRow = document.getElementById("book-branches");
    var fallback = document.getElementById("book-wa-fallback");
    var currentStep = 1;
    var errorKey = "";

    /* Online classes aren't open to families yet (see ROADMAP), so a trial is
       only offered at the in-person branches. */
    function renderBranches() {
        var picked = form.querySelector('input[name="book-branch"]:checked');
        var pickedId = picked ? picked.value : "";
        branchRow.innerHTML = "";
        BRANCHES.filter(function (b) { return b.id !== "online"; }).forEach(function (b) {
            var label = document.createElement("label");
            label.className = "chip";
            var input = document.createElement("input");
            input.type = "radio";
            input.name = "book-branch";
            input.value = b.id;
            if (b.id === pickedId) input.checked = true;
            var text = document.createElement("span");
            text.textContent = branchName(b.id);
            label.appendChild(input);
            label.appendChild(text);
            branchRow.appendChild(label);
        });
    }

    function branchName(id) {
        var found = BRANCHES.find(function (b) { return b.id === id; });
        return t("book.branch." + id) || (found ? found.label : id);
    }

    function picked(name) {
        var el = form.querySelector('input[name="' + name + '"]:checked');
        return el ? el.value : "";
    }

    function enter(el, backwards) {
        el.hidden = false;
        el.classList.remove("is-entering", "from-back");
        void el.offsetWidth;    /* restart the slide-in animation */
        el.classList.add("is-entering");
        if (backwards) el.classList.add("from-back");
    }

    function showStep(n, backwards) {
        currentStep = n;
        stepEls.forEach(function (el) { el.hidden = true; });
        done.hidden = true;
        form.setAttribute("data-step", n === 0 ? "done" : String(n));
        if (n === 0) {
            enter(done, false);
            return;
        }
        stepNum.textContent = String(n);
        enter(stepEls[n - 1], backwards);
    }

    function setError(key) {
        errorKey = key;
        errorEl.textContent = key ? t(key) : "";
        if (!key) return;
        form.classList.remove("shake");
        void form.offsetWidth;
        form.classList.add("shake");
    }

    function message() {
        var name = form.querySelector("#book-name").value.trim();
        var lines = [t("book.msgIntro")];
        if (name) lines.push(t("book.msgChild").replace("{name}", name));
        lines.push(t("book.msgAge").replace("{age}", picked("book-age")));
        lines.push(t("book.msgBranch").replace("{branch}", branchName(picked("book-branch"))));
        var time = picked("book-time") || "any";
        lines.push(t("book.msgTime").replace("{time}", t("book.time" + time.charAt(0).toUpperCase() + time.slice(1))));
        return lines.join("\n");
    }

    function goNext() {
        if (!picked("book-age")) {
            setError("book.errAge");
            form.querySelector('input[name="book-age"]').focus();
            return;
        }
        setError("");
        showStep(2, false);
    }

    form.querySelector("[data-book-next]").addEventListener("click", goNext);
    form.querySelector("[data-book-back]").addEventListener("click", function () {
        setError("");
        showStep(1, true);
    });
    form.querySelector("[data-book-again]").addEventListener("click", function () {
        form.reset();
        renderBranches();
        setError("");
        showStep(1, true);
        form.querySelector('input[name="book-age"]').focus();
    });
    form.addEventListener("change", function () { if (errorKey) setError(""); });

    form.addEventListener("submit", function (e) {
        e.preventDefault();
        /* Enter in the name field submits the form; on step 1 that means "next". */
        if (currentStep === 1) { goNext(); return; }
        if (!picked("book-branch")) {
            setError("book.errBranch");
            var first = branchRow.querySelector("input");
            if (first) first.focus();
            return;
        }
        setError("");
        var url = "https://wa.me/" + WHATSAPP_NUMBER + "?text=" + encodeURIComponent(message());
        fallback.href = url;
        window.open(url, "_blank", "noopener");
        showStep(0);
    });

    onLanguageChangeCallbacks.push(function () {
        renderBranches();
        if (errorKey) errorEl.textContent = t(errorKey);
    });

    renderBranches();
    form.setAttribute("data-step", "1");
}

/* Phones only (the bar is display:none above 720px): a "Book a free trial"
   bar that appears once the hero is off screen and steps aside while the
   booking card itself is visible. */
function initStickyBar() {
    var bar = document.querySelector(".book-sticky");
    var hero = document.getElementById("top");
    var book = document.getElementById("book");
    if (!bar || !hero || !book || !("IntersectionObserver" in window)) return;
    var heroVisible = true;
    var bookVisible = false;
    function update() {
        var show = !heroVisible && !bookVisible;
        bar.classList.toggle("is-shown", show);
        bar.setAttribute("aria-hidden", show ? "false" : "true");
        bar.tabIndex = show ? 0 : -1;
    }
    var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            if (entry.target === hero) heroVisible = entry.isIntersecting;
            else bookVisible = entry.isIntersecting;
        });
        update();
    }, { threshold: 0 });
    observer.observe(hero);
    observer.observe(book);
}
