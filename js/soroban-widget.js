import { state } from "./state.js";
import { t } from "./i18n.js";

/* Each rod: 1 heaven bead (value 5) + 4 earth beads (value 1 each). */
function initSoroban() {
    var root = document.getElementById("try-soroban");
    var valueEl = document.getElementById("soroban-value-num");
    if (!root || !valueEl) return;

    var rodCount = parseInt(root.getAttribute("data-rods"), 10) || 3;
    var rods = [];

    function makeBead(label, onClick) {
        var b = document.createElement("button");
        b.type = "button";
        b.className = "try-bead";
        b.setAttribute("aria-label", label);
        b.addEventListener("click", onClick);
        return b;
    }

    function render() {
        var total = 0;
        rods.forEach(function (rod, i) {
            var digit = (rod.heaven ? 5 : 0) + rod.earth;
            total += digit * Math.pow(10, rods.length - 1 - i);
            rod.heavenBtn.classList.toggle("active", rod.heaven);
            rod.heavenBtn.setAttribute("aria-pressed", String(rod.heaven));
            rod.earthBtns.forEach(function (b, j) {
                var active = j < rod.earth;
                b.classList.toggle("active", active);
                b.setAttribute("aria-pressed", String(active));
            });
        });
        valueEl.textContent = total.toLocaleString(state.lang === "ar" ? "ar-EG" : "en-US");
    }

    function buildRod(index) {
        var rod = { heaven: false, earth: 0, heavenBtn: null, earthBtns: [] };

        var col = document.createElement("div");
        col.className = "soroban-rod";

        var heavenArea = document.createElement("div");
        heavenArea.className = "soroban-heaven";
        rod.heavenBtn = makeBead(t("tryit.beadHeaven").replace("{col}", index + 1), function () {
            rod.heaven = !rod.heaven;
            render();
        });
        heavenArea.appendChild(rod.heavenBtn);

        var bar = document.createElement("div");
        bar.className = "soroban-bar";

        var earthArea = document.createElement("div");
        earthArea.className = "soroban-earth";
        for (var j = 0; j < 4; j++) {
            (function (idx) {
                var b = makeBead(t("tryit.beadEarth").replace("{n}", idx + 1).replace("{col}", index + 1), function () {
                    rod.earth = (rod.earth >= idx + 1) ? idx : idx + 1;
                    render();
                });
                rod.earthBtns.push(b);
                earthArea.appendChild(b);
            })(j);
        }

        col.appendChild(heavenArea);
        col.appendChild(bar);
        col.appendChild(earthArea);
        root.appendChild(col);
        return rod;
    }

    for (var r = 0; r < rodCount; r++) {
        rods.push(buildRod(r));
    }
    render();

    function setNumber(n) {
        var max = Math.pow(10, rods.length) - 1;
        n = Math.max(0, Math.min(max, Math.floor(n) || 0));
        var str = String(n).padStart(rods.length, "0");
        rods.forEach(function (rod, i) {
            var digit = Number(str[i]);
            rod.heaven = digit >= 5;
            rod.earth = digit >= 5 ? digit - 5 : digit;
        });
        render();
    }

    var setForm = document.getElementById("soroban-set-form");
    var setInput = document.getElementById("soroban-set-input");
    if (setForm && setInput) {
        setForm.addEventListener("submit", function (e) {
            e.preventDefault();
            setNumber(Number(setInput.value));
        });
    }
}

initSoroban();
