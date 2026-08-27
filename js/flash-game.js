import { state } from "./state.js";
import { t } from "./i18n.js";

function initFlashGame() {
    var root = document.querySelector(".flash-game");
    if (!root) return;

    var display = root.querySelector(".flash-display");
    var form = root.querySelector(".flash-form");
    var input = root.querySelector("#flash-answer");
    var result = root.querySelector(".flash-result");
    var startBtn = root.querySelector(".flash-start");
    var cta = root.querySelector(".flash-cta");

    var FLASH_MS = 800;
    var GAP_MS = 250;
    var COUNT = 3;
    var sum = 0;
    var running = false;

    function fmtNum(n) {
        return n.toLocaleString(state.lang === "ar" ? "ar-EG" : "en-US");
    }

    function randomNumber() {
        return Math.floor(Math.random() * 20) + 1;
    }

    function flashNumber(i) {
        if (i >= COUNT) {
            display.textContent = "?";
            form.hidden = false;
            input.value = "";
            input.focus();
            running = false;
            startBtn.disabled = false;
            startBtn.textContent = t("tryit.flashStartAgain");
            return;
        }
        var n = randomNumber();
        sum += n;
        display.textContent = fmtNum(n);
        setTimeout(function () {
            display.textContent = "";
            setTimeout(function () { flashNumber(i + 1); }, GAP_MS);
        }, FLASH_MS);
    }

    function startRound() {
        if (running) return;
        running = true;
        sum = 0;
        result.textContent = "";
        result.className = "flash-result";
        form.hidden = true;
        cta.hidden = true;
        startBtn.disabled = true;
        flashNumber(0);
    }

    form.addEventListener("submit", function (e) {
        e.preventDefault();
        var answer = parseInt(input.value, 10);
        if (isNaN(answer)) return;

        if (answer === sum) {
            result.textContent = t("tryit.flashCorrect");
            result.className = "flash-result ok";
        } else {
            result.textContent = t("tryit.flashWrong").replace("{sum}", fmtNum(sum));
            result.className = "flash-result no";
        }
        form.hidden = true;
        cta.hidden = false;
    });

    startBtn.addEventListener("click", startRound);
}

initFlashGame();
