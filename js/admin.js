import {
    signInWithEmailAndPassword, signOut, sendEmailVerification, sendPasswordResetEmail,
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";
import { auth } from "./firebase-init.js";
import { state } from "./state.js";
import { t, fmtDate, onLanguageChangeCallbacks } from "./i18n.js";
import { toast } from "./toast.js";
import { loadApplications, addApplicationDoc, updateApplicationDoc, deleteApplicationDoc } from "./applications.js";
import { ROLE_SUPERADMIN, ROLE_ADMIN, getCurrentRole } from "./roles.js";
import { renderTeachersPanel } from "./admin-teachers-panel.js";
import { renderManagePanel } from "./admin-manage-panel.js";

var adminOverlay = document.getElementById("admin-overlay");
var adminGate = document.getElementById("admin-gate");
var adminVerify = document.getElementById("admin-verify");
var adminDash = document.getElementById("admin-dashboard");
var adminEmailInput = document.getElementById("admin-email");
var adminPasswordInput = document.getElementById("admin-password");
var adminLoginError = document.getElementById("admin-login-error");
var adminUnauthorized = document.getElementById("admin-login-unauthorized");
var detailOverlay = document.getElementById("detail-overlay");
var detailCard = document.getElementById("detail-card");
var adminSearchInput = document.getElementById("admin-search");
var adminFilterSelect = document.getElementById("admin-filter-status");
var adminTabs = document.getElementById("admin-tabs");
var adminTabTeachers = document.getElementById("admin-tab-teachers");
var adminTabManageAdmins = document.getElementById("admin-tab-manage-admins");
var deletePending = null;

function showGate() {
    adminGate.hidden = false;
    adminVerify.hidden = true;
    adminDash.hidden = true;
    adminPasswordInput.value = "";
    adminLoginError.classList.remove("show");
    adminUnauthorized.classList.remove("show");
    setTimeout(function () { adminEmailInput.focus(); }, 50);
}
function showVerifyScreen() {
    adminGate.hidden = true;
    adminVerify.hidden = false;
    adminDash.hidden = true;
}
function openAdminOverlay() {
    adminOverlay.hidden = false;
    if (state.role) {
        showAdminDashboard();
    } else if (auth.currentUser && !auth.currentUser.emailVerified) {
        showVerifyScreen();
    } else if (auth.currentUser) {
        afterVerifiedLogin();
    } else {
        showGate();
    }
}
function closeAdminOverlay() {
    adminOverlay.hidden = true;
}
function setPanel(name) {
    document.querySelectorAll(".admin-panel").forEach(function (p) {
        p.hidden = p.getAttribute("data-panel") !== name;
    });
    document.querySelectorAll(".admin-tab").forEach(function (b) {
        b.classList.toggle("active", b.getAttribute("data-tab") === name);
    });
    if (name === "teachers") renderTeachersPanel();
    if (name === "manage-admins") renderManagePanel();
}
if (adminTabs) {
    adminTabs.addEventListener("click", function (e) {
        var btn = e.target.closest(".admin-tab");
        if (btn) setPanel(btn.getAttribute("data-tab"));
    });
}
async function showAdminDashboard() {
    adminGate.hidden = true;
    adminVerify.hidden = true;
    adminDash.hidden = false;
    state.adminOpen = true;

    var isTeacherOnly = state.role !== ROLE_SUPERADMIN && state.role !== ROLE_ADMIN;
    adminTabTeachers.hidden = isTeacherOnly;
    adminTabManageAdmins.hidden = state.role !== ROLE_SUPERADMIN;
    adminTabs.hidden = isTeacherOnly;
    setPanel("students");

    await loadApplications();
    renderAdminDashboard();
}

async function afterVerifiedLogin() {
    var role = await getCurrentRole();
    if (!role) {
        adminUnauthorized.classList.add("show");
        try { await signOut(auth); } catch (e) { }
        state.isAdmin = false;
        state.role = null;
        showGate();
        return;
    }
    state.role = role;
    showAdminDashboard();
}

document.getElementById("open-admin").addEventListener("click", openAdminOverlay);
document.getElementById("admin-gate-close").addEventListener("click", closeAdminOverlay);
document.getElementById("admin-verify-close").addEventListener("click", closeAdminOverlay);
document.getElementById("admin-dash-close").addEventListener("click", closeAdminOverlay);
adminOverlay.addEventListener("click", function (e) {
    if (e.target === adminOverlay) closeAdminOverlay();
});
document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
        if (!detailOverlay.hidden) closeDetail();
        else if (!adminOverlay.hidden) closeAdminOverlay();
    }
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
    state.isAdmin = false;
    state.role = null;
    closeAdminOverlay();
});

document.getElementById("admin-refresh").addEventListener("click", async function () {
    await loadApplications();
    renderAdminDashboard();
    toast(t("admin.refreshedToast"));
});

function statusLabel(status) {
    var key = "admin.status" + (status ? status.charAt(0).toUpperCase() + status.slice(1) : "New");
    return t(key);
}
function programLabel(program) {
    var map = { "beginner": "programs.l1title", "intermediate": "programs.l2title", "expert": "programs.l3title", "unsure": "apply.optNotSure" };
    return map[program] ? t(map[program]) : (program || t("detail.none"));
}

function filteredApplications() {
    var q = (adminSearchInput.value || "").trim().toLowerCase();
    var statusFilter = adminFilterSelect.value;
    return state.applications
        .filter(function (a) {
            if (statusFilter && a.status !== statusFilter) return false;
            if (!q) return true;
            var hay = [a.studentName, a.parentName, a.phone, a.email].join(" ").toLowerCase();
            return hay.indexOf(q) !== -1;
        })
        .sort(function (a, b) { return (b.submittedAt || "").localeCompare(a.submittedAt || ""); });
}

function renderAdminDashboard() {
    if (!state.adminOpen) return;
    var all = state.applications;
    document.getElementById("sum-total").textContent = all.length;
    document.getElementById("sum-new").textContent = all.filter(function (a) { return a.status === "new"; }).length;
    document.getElementById("sum-contacted").textContent = all.filter(function (a) { return a.status === "contacted"; }).length;
    document.getElementById("sum-enrolled").textContent = all.filter(function (a) { return a.status === "enrolled"; }).length;

    var list = filteredApplications();
    var body = document.getElementById("admin-table-body");
    body.innerHTML = "";

    if (all.length === 0) {
        var tr = document.createElement("tr");
        tr.className = "empty-row";
        var td = document.createElement("td");
        td.colSpan = 5;
        td.textContent = t("admin.emptyList");
        tr.appendChild(td);
        body.appendChild(tr);
        return;
    }
    if (list.length === 0) {
        var tr2 = document.createElement("tr");
        tr2.className = "empty-row";
        var td2 = document.createElement("td");
        td2.colSpan = 5;
        td2.textContent = t("admin.noResults");
        tr2.appendChild(td2);
        body.appendChild(tr2);
        return;
    }

    list.forEach(function (app) {
        var tr = document.createElement("tr");
        tr.addEventListener("click", function () { openDetail(app.id); });

        var tdStudent = document.createElement("td");
        tdStudent.textContent = app.studentName || t("detail.none");
        var tdParent = document.createElement("td");
        tdParent.textContent = app.parentName || t("detail.none");
        var tdProgram = document.createElement("td");
        tdProgram.textContent = programLabel(app.program);
        var tdDate = document.createElement("td");
        tdDate.className = "muted";
        tdDate.textContent = fmtDate(app.submittedAt);
        var tdStatus = document.createElement("td");
        var pill = document.createElement("span");
        pill.className = "status-pill " + (app.status || "new");
        pill.textContent = statusLabel(app.status || "new");
        tdStatus.appendChild(pill);

        tr.appendChild(tdStudent);
        tr.appendChild(tdParent);
        tr.appendChild(tdProgram);
        tr.appendChild(tdDate);
        tr.appendChild(tdStatus);
        body.appendChild(tr);
    });
}
onLanguageChangeCallbacks.push(renderAdminDashboard);

adminSearchInput.addEventListener("input", renderAdminDashboard);
adminFilterSelect.addEventListener("change", renderAdminDashboard);

/* ---------- detail modal ---------- */
function closeDetail() {
    detailOverlay.hidden = true;
    detailCard.innerHTML = "";
    deletePending = null;
}
detailOverlay.addEventListener("click", function (e) {
    if (e.target === detailOverlay) closeDetail();
});

function detailRow(label, value) {
    var wrap = document.createElement("div");
    wrap.className = "row";
    var k = document.createElement("div");
    k.className = "k";
    k.textContent = label;
    var v = document.createElement("div");
    v.className = "v";
    v.textContent = value || t("detail.none");
    wrap.appendChild(k);
    wrap.appendChild(v);
    return wrap;
}

function openDetail(id) {
    var app = state.applications.find(function (a) { return a.id === id; });
    if (!app) return;
    deletePending = null;
    detailCard.innerHTML = "";

    var head = document.createElement("div");
    head.className = "detail-head";
    var h3 = document.createElement("h3");
    h3.textContent = app.studentName || t("detail.title");
    var closeBtn = document.createElement("button");
    closeBtn.className = "icon-btn";
    closeBtn.type = "button";
    closeBtn.setAttribute("aria-label", t("detail.close"));
    closeBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>';
    closeBtn.addEventListener("click", closeDetail);
    head.appendChild(h3);
    head.appendChild(closeBtn);
    detailCard.appendChild(head);

    var meta = document.createElement("div");
    meta.className = "detail-meta";
    meta.textContent = t("detail.submitted") + ": " + fmtDate(app.submittedAt) + "  ·  " + t("detail.source") + ": " + (app.source === "manual" ? t("detail.sourceManual") : t("detail.sourcePublic"));
    detailCard.appendChild(meta);

    var rows = document.createElement("div");
    rows.className = "detail-rows";
    rows.appendChild(detailRow(t("detail.branch"), app.branch));
    rows.appendChild(detailRow(t("detail.studentNameAr"), app.studentNameAr));
    rows.appendChild(detailRow(t("detail.dob"), app.dob));
    rows.appendChild(detailRow(t("detail.nationalId"), app.nationalId));
    rows.appendChild(detailRow(t("detail.gender"), app.gender));
    rows.appendChild(detailRow(t("detail.religion"), app.religion));
    rows.appendChild(detailRow(t("detail.nationality"), app.nationality));
    rows.appendChild(detailRow(t("detail.grade"), app.grade));
    rows.appendChild(detailRow(t("detail.parent"), app.parentName));
    rows.appendChild(detailRow(t("detail.relationship"), app.relationship));
    rows.appendChild(detailRow(t("detail.phone"), app.phone));
    rows.appendChild(detailRow(t("detail.email"), app.email));
    rows.appendChild(detailRow(t("detail.occupation"), app.occupation));
    rows.appendChild(detailRow(t("detail.address"), app.address));
    rows.appendChild(detailRow(t("detail.governorate"), app.governorate));
    rows.appendChild(detailRow(t("detail.city"), app.city));
    rows.appendChild(detailRow(t("detail.schoolName"), app.schoolName));
    rows.appendChild(detailRow(t("detail.schoolType"), app.schoolType));
    rows.appendChild(detailRow(t("detail.program"), programLabel(app.program)));
    var experienceRow = detailRow(t("detail.experience"), app.experience);
    experienceRow.classList.add("full");
    rows.appendChild(experienceRow);
    var hobbiesRow = detailRow(t("detail.hobbies"), app.hobbies);
    hobbiesRow.classList.add("full");
    rows.appendChild(hobbiesRow);
    rows.appendChild(detailRow(t("detail.medical"), app.medical));
    rows.appendChild(detailRow(t("detail.dietary"), app.dietary));
    rows.appendChild(detailRow(t("detail.heard"), app.heard));
    var goalsRow = detailRow(t("detail.goals"), app.goals);
    goalsRow.classList.add("full");
    rows.appendChild(goalsRow);
    detailCard.appendChild(rows);

    var actions = document.createElement("div");
    actions.className = "detail-actions";

    var statusSelect = document.createElement("select");
    ["new", "contacted", "enrolled", "declined"].forEach(function (s) {
        var opt = document.createElement("option");
        opt.value = s;
        opt.textContent = statusLabel(s);
        if ((app.status || "new") === s) opt.selected = true;
        statusSelect.appendChild(opt);
    });
    actions.appendChild(statusSelect);

    var notesWrap = document.createElement("div");
    notesWrap.className = "detail-notes";
    notesWrap.style.width = "100%";
    var notesLabel = document.createElement("label");
    notesLabel.textContent = t("detail.internalNotes");
    notesLabel.style.fontSize = "0.84rem";
    notesLabel.style.fontWeight = "700";
    var notesArea = document.createElement("textarea");
    notesArea.value = app.notes || "";
    notesWrap.appendChild(notesLabel);
    notesWrap.appendChild(notesArea);

    var saveBtn = document.createElement("button");
    saveBtn.type = "button";
    saveBtn.className = "btn btn-jade";
    saveBtn.textContent = t("detail.save");
    saveBtn.addEventListener("click", async function () {
        saveBtn.disabled = true;
        var result = await updateApplicationDoc(app.id, { status: statusSelect.value, notes: notesArea.value });
        saveBtn.disabled = false;
        if (result.ok) {
            toast(t("admin.savedToast"));
            renderAdminDashboard();
            closeDetail();
        } else {
            toast(t("admin.savingFailedToast"));
        }
    });

    var deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "btn btn-secondary";
    deleteBtn.textContent = t("detail.delete");
    deleteBtn.addEventListener("click", async function () {
        if (deletePending !== app.id) {
            deletePending = app.id;
            deleteBtn.textContent = t("admin.confirmDelete");
            return;
        }
        deleteBtn.disabled = true;
        var result = await deleteApplicationDoc(app.id);
        deleteBtn.disabled = false;
        if (result.ok) {
            toast(t("admin.deletedToast"));
            renderAdminDashboard();
            closeDetail();
        } else {
            toast(t("admin.savingFailedToast"));
        }
    });

    actions.appendChild(saveBtn);
    actions.appendChild(deleteBtn);
    detailCard.appendChild(notesWrap);
    detailCard.appendChild(actions);

    detailOverlay.hidden = false;
}

/* ---------- manual add (staff logging a phone/email application) ---------- */
var manualAddForm = document.getElementById("manual-add-form");
manualAddForm.addEventListener("submit", async function (e) {
    e.preventDefault();
    var fd = new FormData(manualAddForm);
    var studentName = (fd.get("studentName") || "").toString().trim();
    if (!studentName) { manualAddForm.querySelector('[name="studentName"]').focus(); return; }
    var app = {
        studentName: studentName,
        dob: (fd.get("dob") || "").toString().trim(),
        grade: "",
        parentName: (fd.get("parentName") || "").toString().trim(),
        phone: (fd.get("phone") || "").toString().trim(),
        email: (fd.get("email") || "").toString().trim(),
        program: (fd.get("program") || "").toString(),
        experience: "",
        heard: "",
        goals: (fd.get("goals") || "").toString().trim(),
        status: "new",
        notes: "",
        source: "manual",
        submittedAt: new Date().toISOString(),
    };
    var result = await addApplicationDoc(app);
    if (result.ok) {
        toast(t("admin.addedToast"));
        manualAddForm.reset();
        document.getElementById("manual-add").open = false;
        renderAdminDashboard();
    } else {
        toast(t("admin.savingFailedToast"));
    }
});
