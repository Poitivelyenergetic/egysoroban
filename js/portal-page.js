import "./i18n.js";
import "./theme.js";
import "./mobile-nav.js";
import {
    onAuthStateChanged, signInWithEmailAndPassword, signOut, sendEmailVerification,
    sendPasswordResetEmail, createUserWithEmailAndPassword, updateProfile,
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";
import { auth } from "./firebase-init.js";
import { t, fmtDate, onLanguageChangeCallbacks } from "./i18n.js";
import { toast } from "./toast.js";
import { loadStudentsForAccount } from "./student-records.js";
import { recordPortalAccount } from "./portal-accounts.js";

var gate = document.getElementById("portal-gate");
var loginForm = document.getElementById("portal-login-form");
var roleChoice = document.getElementById("portal-role-choice");
var signupForm = document.getElementById("portal-signup-form");
var signupAsLabel = document.getElementById("portal-signup-as");
var verifyScreen = document.getElementById("portal-verify");
var dashboard = document.getElementById("portal-dashboard");
var emailInput = document.getElementById("portal-email");
var passwordInput = document.getElementById("portal-password");
var loginError = document.getElementById("portal-login-error");
var signupNameInput = document.getElementById("portal-signup-name");
var signupEmailInput = document.getElementById("portal-signup-email");
var signupPasswordInput = document.getElementById("portal-signup-password");
var signupError = document.getElementById("portal-signup-error");
var gotoSignupBtn = document.getElementById("portal-goto-signup");
var gotoLoginBtn = document.getElementById("portal-goto-login");
var studentsWrap = document.getElementById("portal-students");
var signupRole = null; // "parent" | "student"

function showGate() {
    gate.hidden = false; verifyScreen.hidden = true; dashboard.hidden = true;
    roleChoice.hidden = false; loginForm.hidden = true; signupForm.hidden = true;
    gotoLoginBtn.hidden = false; gotoSignupBtn.hidden = true;
}
function showLogin() {
    roleChoice.hidden = true; signupForm.hidden = true; loginForm.hidden = false;
    gotoLoginBtn.hidden = true; gotoSignupBtn.hidden = false;
    loginError.classList.remove("show");
}
function showSignupForm(role) {
    signupRole = role;
    roleChoice.hidden = true; loginForm.hidden = true; signupForm.hidden = false;
    gotoLoginBtn.hidden = false; gotoSignupBtn.hidden = true;
    signupAsLabel.textContent = t(role === "student" ? "portal.signupAsStudent" : "portal.signupAsParent");
    signupError.classList.remove("show");
}
function showVerify() {
    gate.hidden = true; verifyScreen.hidden = false; dashboard.hidden = true;
}

var SVG_NS = "http://www.w3.org/2000/svg";
function buildDonut(percent, color, valueText, label) {
    var size = 84, stroke = 9, r = (size - stroke) / 2, c = 2 * Math.PI * r;
    var pct = Math.max(0, Math.min(100, percent));

    var svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("width", size);
    svg.setAttribute("height", size);
    svg.setAttribute("viewBox", "0 0 " + size + " " + size);

    var track = document.createElementNS(SVG_NS, "circle");
    track.setAttribute("cx", size / 2);
    track.setAttribute("cy", size / 2);
    track.setAttribute("r", r);
    track.setAttribute("fill", "none");
    track.setAttribute("stroke", "var(--paper-sunken)");
    track.setAttribute("stroke-width", stroke);

    var arc = document.createElementNS(SVG_NS, "circle");
    arc.setAttribute("cx", size / 2);
    arc.setAttribute("cy", size / 2);
    arc.setAttribute("r", r);
    arc.setAttribute("fill", "none");
    arc.setAttribute("stroke", color);
    arc.setAttribute("stroke-width", stroke);
    arc.setAttribute("stroke-linecap", "round");
    arc.setAttribute("stroke-dasharray", c);
    arc.setAttribute("stroke-dashoffset", c - (pct / 100) * c);
    arc.setAttribute("transform", "rotate(-90 " + size / 2 + " " + size / 2 + ")");

    svg.appendChild(track);
    svg.appendChild(arc);

    var donut = document.createElement("div");
    donut.className = "portal-donut";
    donut.appendChild(svg);
    var center = document.createElement("div");
    center.className = "portal-donut-center";
    center.textContent = valueText;
    donut.appendChild(center);

    var labelEl = document.createElement("div");
    labelEl.className = "portal-donut-label";
    labelEl.textContent = label;

    var col = document.createElement("div");
    col.className = "portal-donut-col";
    col.appendChild(donut);
    col.appendChild(labelEl);
    return col;
}

function stageInfoForLevel(levelIndex) {
    var n = Number(levelIndex) || 1;
    if (n >= 11) return { title: t("portal.levelGraduate"), desc: "" };
    if (n <= 4) return { title: t("programs.l1title"), desc: t("programs.l1desc") };
    if (n <= 7) return { title: t("programs.l2title"), desc: t("programs.l2desc") };
    return { title: t("programs.l3title"), desc: t("programs.l3desc") };
}

function renderStudentCard(s) {
    var card = document.createElement("div");
    card.className = "portal-student-card";

    var h3 = document.createElement("h3");
    h3.textContent = s.name || t("detail.none");
    card.appendChild(h3);

    var meta = document.createElement("div");
    meta.className = "portal-meta";
    meta.textContent = s.branch || "";
    card.appendChild(meta);

    var levelIndex = Number(s.levelIndex) || 1;
    var stage = stageInfoForLevel(levelIndex);
    var stageNote = document.createElement("div");
    stageNote.className = "portal-stage-note";
    stageNote.textContent = t("portal.levelPrefix") + " " + levelIndex + "/11 — " + stage.title + (stage.desc ? ": " + stage.desc : "");
    card.appendChild(stageNote);

    var progLabel = document.createElement("div");
    progLabel.className = "portal-progress-label";
    progLabel.innerHTML = "<span>" + t("portal.levelLabel") + "</span><span>" + levelIndex + " / 11</span>";
    card.appendChild(progLabel);
    var progBar = document.createElement("div");
    progBar.className = "portal-progress-bar";
    var progFill = document.createElement("div");
    progFill.className = "portal-progress-fill";
    progFill.style.width = Math.round((levelIndex / 11) * 100) + "%";
    progBar.appendChild(progFill);
    card.appendChild(progBar);

    var statsRow = document.createElement("div");
    statsRow.className = "portal-stats-row";
    var attPct = s.totalSessions ? Math.round(((s.attendedSessions || 0) / s.totalSessions) * 100) : 0;
    var hwPct = s.homeworkAssigned ? Math.round(((s.homeworkCompleted || 0) / s.homeworkAssigned) * 100) : 0;
    statsRow.appendChild(buildDonut(attPct, "var(--brass-strong)", (s.attendedSessions || 0) + "/" + (s.totalSessions || 0), t("portal.attendanceLabel")));
    statsRow.appendChild(buildDonut(hwPct, "var(--jade)", (s.homeworkCompleted || 0) + "/" + (s.homeworkAssigned || 0), t("portal.homeworkLabel")));
    card.appendChild(statsRow);

    var examTitle = document.createElement("h4");
    examTitle.textContent = t("portal.examHistoryLabel");
    examTitle.style.marginBottom = "10px";
    card.appendChild(examTitle);
    var examList = document.createElement("div");
    examList.className = "portal-exam-list";
    var exams = s.examHistory || [];
    if (exams.length === 0) {
        var none = document.createElement("p");
        none.className = "muted";
        none.textContent = t("detail.none");
        examList.appendChild(none);
    } else {
        exams.slice().reverse().forEach(function (ex) {
            var row = document.createElement("div");
            row.className = "portal-exam-row";
            var left = document.createElement("span");
            left.textContent = (ex.level || "") + " — " + fmtDate(ex.date);
            var badge = document.createElement("span");
            badge.className = "badge " + (ex.result === "passed" ? "passed" : "failed");
            badge.textContent = ex.result === "passed" ? t("portal.examPassed") : t("portal.examFailed");
            row.appendChild(left);
            row.appendChild(badge);
            examList.appendChild(row);
        });
    }
    card.appendChild(examList);

    return card;
}

async function showDashboard(email) {
    gate.hidden = true; verifyScreen.hidden = true; dashboard.hidden = false;
    studentsWrap.innerHTML = "";
    var loadingMsg = document.createElement("p");
    loadingMsg.className = "section-lede";
    loadingMsg.textContent = t("admin.loading");
    studentsWrap.appendChild(loadingMsg);
    var students = await loadStudentsForAccount(email);
    studentsWrap.innerHTML = "";
    if (students.length === 0) {
        var p = document.createElement("p");
        p.className = "section-lede";
        p.textContent = t("portal.noStudents");
        studentsWrap.appendChild(p);
        return;
    }
    students.forEach(function (s) { studentsWrap.appendChild(renderStudentCard(s)); });
}

onAuthStateChanged(auth, function (user) {
    if (!user) { showGate(); return; }
    if (!user.emailVerified) { showVerify(); return; }
    showDashboard(user.email);
});

loginForm.addEventListener("submit", async function (e) {
    e.preventDefault();
    var btn = loginForm.querySelector('button[type="submit"]');
    btn.disabled = true;
    loginError.classList.remove("show");
    try {
        var cred = await signInWithEmailAndPassword(auth, emailInput.value.trim(), passwordInput.value);
        if (!cred.user.emailVerified) {
            try { await sendEmailVerification(cred.user); } catch (e2) { }
            showVerify();
        }
    } catch (err) {
        loginError.classList.add("show");
        passwordInput.value = "";
        passwordInput.focus();
    }
    btn.disabled = false;
});

document.getElementById("portal-forgot-btn").addEventListener("click", async function () {
    var email = emailInput.value.trim();
    if (!email) { toast(t("admin.resetNeedEmail")); emailInput.focus(); return; }
    try {
        await sendPasswordResetEmail(auth, email);
        toast(t("admin.resetSent"));
    } catch (err) {
        toast(t("admin.resetFailed"));
    }
});

gotoSignupBtn.addEventListener("click", showGate);
gotoLoginBtn.addEventListener("click", showLogin);
document.getElementById("portal-role-parent").addEventListener("click", function () { showSignupForm("parent"); });
document.getElementById("portal-role-student").addEventListener("click", function () { showSignupForm("student"); });

signupForm.addEventListener("submit", async function (e) {
    e.preventDefault();
    signupError.classList.remove("show");
    signupError.textContent = "";
    var btn = signupForm.querySelector('button[type="submit"]');
    btn.disabled = true;
    try {
        var name = signupNameInput.value.trim();
        var cred = await createUserWithEmailAndPassword(auth, signupEmailInput.value.trim(), signupPasswordInput.value);
        try { await updateProfile(cred.user, { displayName: name }); } catch (e4) { }
        try { await recordPortalAccount(signupRole, signupEmailInput.value.trim(), name); } catch (e3) { }
        try { await sendEmailVerification(cred.user); } catch (e2) { }
        showVerify();
    } catch (err) {
        if (err && err.code === "auth/email-already-in-use") signupError.textContent = t("admin.signupEmailInUse");
        else if (err && err.code === "auth/weak-password") signupError.textContent = t("admin.signupWeakPassword");
        else signupError.textContent = t("admin.signupFailed");
        signupError.classList.add("show");
    }
    btn.disabled = false;
});

document.getElementById("portal-verify-check").addEventListener("click", async function () {
    var user = auth.currentUser;
    if (!user) { showGate(); return; }
    try {
        await user.reload();
        if (user.emailVerified) {
            await user.getIdToken(true);
            showDashboard(user.email);
        } else {
            toast(t("admin.verifyLede"));
        }
    } catch (e) {
        toast(t("admin.savingFailedToast"));
    }
});
document.getElementById("portal-verify-resend").addEventListener("click", async function () {
    var user = auth.currentUser;
    if (!user) return;
    try {
        await sendEmailVerification(user);
        toast(t("admin.verifyResendBtn"));
    } catch (e) {
        toast(t("admin.savingFailedToast"));
    }
});
document.getElementById("portal-verify-signout").addEventListener("click", async function () {
    try { await signOut(auth); } catch (e) { }
});

document.getElementById("portal-logout").addEventListener("click", async function () {
    try { await signOut(auth); } catch (e) { }
});

onLanguageChangeCallbacks.push(function () {
    if (!dashboard.hidden) showDashboard(auth.currentUser && auth.currentUser.email);
});
