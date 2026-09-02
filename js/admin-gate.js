import {
    signInWithEmailAndPassword, signOut, sendEmailVerification, sendPasswordResetEmail,
    createUserWithEmailAndPassword, updateProfile,
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";
import { doc, setDoc } from "./fs.js";
import { auth, db } from "./firebase-init.js";
import { state } from "./state.js";
import { t, onLanguageChangeCallbacks } from "./i18n.js";
import { toast } from "./toast.js";
import { ROLE_TEACHER, getCurrentRole } from "./roles.js";

/* This file is the only admin-related code loaded for every visitor of the
   public homepage — it just shows the staff login gate and resolves who
   signed in. The dashboard itself (records, finance, competition, calendar,
   team, db-limits, and everything they pull in) is dynamically imported from
   ./admin-dashboard.js only once a sign-in actually succeeds, so a signed-out
   visitor's browser never fetches any of that code. */

var adminOverlay = document.getElementById("admin-overlay");
var adminGate = document.getElementById("admin-gate");
var adminGateTitle = document.getElementById("admin-gate-title");
var adminSignup = document.getElementById("admin-signup");
var adminVerify = document.getElementById("admin-verify");
var adminDash = document.getElementById("admin-dashboard");
var adminEmailInput = document.getElementById("admin-email");
var adminPasswordInput = document.getElementById("admin-password");
var adminLoginError = document.getElementById("admin-login-error");
var adminUnauthorized = document.getElementById("admin-login-unauthorized");
var adminGotoSignup = document.getElementById("admin-goto-signup");
var signupUsernameInput = document.getElementById("signup-username");
var signupEmailInput = document.getElementById("signup-email");
var signupPhoneInput = document.getElementById("signup-phone");
var signupPasswordInput = document.getElementById("signup-password");
var signupPasswordConfirmInput = document.getElementById("signup-password-confirm");
var signupError = document.getElementById("admin-signup-error");
var detailOverlay = document.getElementById("detail-overlay");
var loginMode = null; // "teacher" | "admin"
var dashboardModule = null;

function loadDashboardModule() {
    if (!dashboardModule) dashboardModule = import("./admin-dashboard.js");
    return dashboardModule;
}

function showGate() {
    adminGate.hidden = false;
    adminSignup.hidden = true;
    adminVerify.hidden = true;
    adminDash.hidden = true;
    adminPasswordInput.value = "";
    adminLoginError.classList.remove("show");
    adminUnauthorized.classList.remove("show");
    adminGateTitle.textContent = t(loginMode === "admin" ? "admin.gateTitleAdmin" : "admin.gateTitleTeacher");
    adminGotoSignup.hidden = loginMode === "admin";
    setTimeout(function () { adminEmailInput.focus(); }, 50);
}
function showSignup() {
    adminGate.hidden = true;
    adminSignup.hidden = false;
    adminVerify.hidden = true;
    adminDash.hidden = true;
    signupError.classList.remove("show");
    setTimeout(function () { signupUsernameInput.focus(); }, 50);
}
function showVerifyScreen() {
    adminGate.hidden = true;
    adminSignup.hidden = true;
    adminVerify.hidden = false;
    adminDash.hidden = true;
}
async function openAdminOverlay(mode) {
    loginMode = mode === "admin" ? "admin" : "teacher";
    adminOverlay.hidden = false;
    document.body.style.overflow = "hidden";
    if (state.role) {
        var mod = await loadDashboardModule();
        await mod.showAdminDashboard();
    } else if (auth.currentUser && !auth.currentUser.emailVerified) {
        showVerifyScreen();
    } else if (auth.currentUser) {
        await afterVerifiedLogin();
    } else {
        showGate();
    }
}
function closeAdminOverlay() {
    adminOverlay.hidden = true;
    document.body.style.overflow = "";
}

onLanguageChangeCallbacks.push(function () {
    if (!adminGate.hidden) {
        adminGateTitle.textContent = t(loginMode === "admin" ? "admin.gateTitleAdmin" : "admin.gateTitleTeacher");
    }
});

/* staffProfiles writes require a verified email (see firestore.rules) because
   Firebase lets anyone register an account under an email they don't actually
   own, and that email becomes theirs to write under immediately, before it's
   confirmed. So the self-signup form below can't write this doc at signup
   time — it remembers the profile here instead, and this writes it the moment
   a verified session for that email is actually observed. Without it, a
   teacher who signed themselves up would never appear in the approval queue,
   since that queue is built entirely from staffProfiles docs. */
var PENDING_STAFF_PROFILE_KEY = "egysoroban_pending_staff_profile";

async function recordPendingStaffProfileIfAny() {
    var user = auth.currentUser;
    if (!user || !user.email) return;
    var raw;
    try { raw = localStorage.getItem(PENDING_STAFF_PROFILE_KEY); } catch (e) { return; }
    if (!raw) return;
    var pending;
    try { pending = JSON.parse(raw); } catch (e) { pending = null; }
    if (!pending || (pending.email || "").toLowerCase() !== user.email.toLowerCase()) return;
    try {
        await setDoc(doc(db, "staffProfiles", pending.email), {
            username: pending.username, phone: pending.phone, email: pending.email,
            createdAt: pending.createdAt,
        }, { merge: true });
        try { localStorage.removeItem(PENDING_STAFF_PROFILE_KEY); } catch (e) { }
    } catch (e) { /* still not permitted, or a transient error — left for next retry */ }
}

async function afterVerifiedLogin() {
    await recordPendingStaffProfileIfAny();
    var role = await getCurrentRole();
    // An admin using the "teacher" login button isn't a real mismatch — they
    // still get full admin access either way, since tab visibility is driven
    // by the resolved role, not which button was clicked. Only block the
    // other direction: a plain teacher has no admin access at all.
    var modeMismatch = role && (loginMode === "admin" && role === ROLE_TEACHER);
    if (!role || modeMismatch) {
        if (modeMismatch) {
            toast(t(loginMode === "teacher" ? "admin.wrongModeTeacher" : "admin.wrongModeAdmin"));
        } else {
            adminUnauthorized.classList.add("show");
        }
        try { await signOut(auth); } catch (e) { }
        state.isSignedIn = false;
        state.role = null;
        showGate();
        return;
    }
    state.role = role;
    var mod = await loadDashboardModule();
    await mod.showAdminDashboard();
}

document.getElementById("open-teacher-login").addEventListener("click", function () { openAdminOverlay("teacher"); });
document.getElementById("open-admin-login").addEventListener("click", function () { openAdminOverlay("admin"); });
document.getElementById("admin-gate-close").addEventListener("click", closeAdminOverlay);
document.getElementById("admin-signup-close").addEventListener("click", closeAdminOverlay);
document.getElementById("admin-verify-close").addEventListener("click", closeAdminOverlay);
document.getElementById("admin-dash-close").addEventListener("click", closeAdminOverlay);
document.getElementById("admin-goto-signup").addEventListener("click", showSignup);
document.getElementById("admin-goto-gate").addEventListener("click", showGate);
adminOverlay.addEventListener("click", function (e) {
    if (e.target === adminOverlay) closeAdminOverlay();
});
document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    // The detail modal (student application detail) belongs to the dashboard
    // module and closes itself on Escape once loaded; while it's open, this
    // handler steps back so a single press only closes the detail, not both.
    if (detailOverlay && !detailOverlay.hidden) return;
    if (!adminOverlay.hidden) closeAdminOverlay();
});

document.getElementById("admin-login-form").addEventListener("submit", async function (e) {
    e.preventDefault();
    var loginBtn = document.querySelector('#admin-login-form button[type="submit"]');
    if (loginBtn) loginBtn.disabled = true;
    adminLoginError.classList.remove("show");
    adminUnauthorized.classList.remove("show");
    try {
        var cred = await signInWithEmailAndPassword(auth, adminEmailInput.value.trim(), adminPasswordInput.value);
        if (!cred.user.emailVerified) {
            try { await sendEmailVerification(cred.user); } catch (e) { }
            showVerifyScreen();
        } else {
            await afterVerifiedLogin();
        }
    } catch (err) {
        adminLoginError.classList.add("show");
        adminPasswordInput.value = "";
        adminPasswordInput.focus();
    }
    if (loginBtn) loginBtn.disabled = false;
});

document.getElementById("admin-forgot-btn").addEventListener("click", async function () {
    var email = adminEmailInput.value.trim();
    if (!email) {
        toast(t("admin.resetNeedEmail"));
        adminEmailInput.focus();
        return;
    }
    try {
        await sendPasswordResetEmail(auth, email);
        toast(t("admin.resetSent"));
    } catch (err) {
        toast(t("admin.resetFailed"));
    }
});

document.getElementById("admin-signup-form").addEventListener("submit", async function (e) {
    e.preventDefault();
    var signupBtn = document.querySelector('#admin-signup-form button[type="submit"]');
    signupError.classList.remove("show");
    signupError.textContent = "";

    var username = signupUsernameInput.value.trim();
    var email = signupEmailInput.value.trim();
    var phone = signupPhoneInput.value.trim();
    var password = signupPasswordInput.value;
    var passwordConfirm = signupPasswordConfirmInput.value;

    if (password !== passwordConfirm) {
        signupError.textContent = t("admin.signupPasswordMismatch");
        signupError.classList.add("show");
        return;
    }
    if (password.length < 6) {
        signupError.textContent = t("admin.signupWeakPassword");
        signupError.classList.add("show");
        return;
    }

    if (signupBtn) signupBtn.disabled = true;
    try {
        var cred = await createUserWithEmailAndPassword(auth, email, password);
        try { await updateProfile(cred.user, { displayName: username }); } catch (e) { }
        /* Can't write staffProfiles yet — it now requires a verified email,
           and this account isn't verified until the link below is clicked.
           recordPendingStaffProfileIfAny() writes it once that's confirmed. */
        try {
            localStorage.setItem(PENDING_STAFF_PROFILE_KEY, JSON.stringify({
                username: username, phone: phone, email: email.toLowerCase(),
                createdAt: new Date().toISOString(),
            }));
        } catch (e) { }
        try { await sendEmailVerification(cred.user); } catch (e) { }
        showVerifyScreen();
    } catch (err) {
        if (err && err.code === "auth/email-already-in-use") {
            signupError.textContent = t("admin.signupEmailInUse");
        } else if (err && err.code === "auth/weak-password") {
            signupError.textContent = t("admin.signupWeakPassword");
        } else {
            signupError.textContent = t("admin.signupFailed");
        }
        signupError.classList.add("show");
    }
    if (signupBtn) signupBtn.disabled = false;
});

document.getElementById("admin-verify-check").addEventListener("click", async function () {
    var user = auth.currentUser;
    if (!user) { showGate(); return; }
    try {
        await user.reload();
        if (user.emailVerified) {
            await user.getIdToken(true);
            await afterVerifiedLogin();
        } else {
            toast(t("admin.verifyLede"));
        }
    } catch (e) {
        toast(t("admin.savingFailedToast"));
    }
});
document.getElementById("admin-verify-resend").addEventListener("click", async function () {
    var user = auth.currentUser;
    if (!user) return;
    try {
        await sendEmailVerification(user);
        toast(t("admin.verifyResendBtn"));
    } catch (e) {
        toast(t("admin.savingFailedToast"));
    }
});

document.getElementById("admin-logout").addEventListener("click", async function () {
    try { await signOut(auth); } catch (e) { }
    state.adminOpen = false;
    state.isSignedIn = false;
    state.role = null;
    closeAdminOverlay();
});
