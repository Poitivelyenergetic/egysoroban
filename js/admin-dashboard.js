import { state } from "./state.js";
import { t, fmtDate, onLanguageChangeCallbacks } from "./i18n.js";
import { toast } from "./toast.js";
import { loadApplications, addApplicationDoc, updateApplicationDoc, deleteApplicationDoc, migrateOldApplications } from "./applications.js";
import { addStudent, loadStudents } from "./student-records.js";
import { syncEnrolledEmails } from "./enrolled-emails.js";
import { ROLE_DEVELOPER, ROLE_ADMIN, isAdminRole } from "./roles.js";
import { renderTeachersPanel } from "./admin-teachers-panel.js";
import { renderManagePanel } from "./admin-manage-panel.js";
import { renderRecordsPanel, clearRecordsFilter } from "./admin-records-panel.js";
import { renderSlotsPanel } from "./admin-slots-panel.js";
import { renderCompetitionPanel } from "./admin-competition-panel.js";
import { renderAnalyticsPanel } from "./admin-analytics-panel.js";
import { renderCalendarPanel } from "./admin-calendar-panel.js";
import { renderTeamPanel } from "./admin-team-panel.js";
import { renderFinancePanel } from "./admin-finance-panel.js";
import { renderDbLimitsPanel } from "./admin-db-limits-panel.js";

/* Everything in this module is only ever reached after admin-gate.js has
   confirmed a signed-in, role-resolved staff member — it is loaded with a
   dynamic import() from there, never imported at the top level of any page,
   so a signed-out visitor's browser never fetches this file or anything it
   pulls in (records, finance, competition, calendar, team, db-limits). */

var adminGate = document.getElementById("admin-gate");
var adminVerify = document.getElementById("admin-verify");
var adminDash = document.getElementById("admin-dashboard");
var detailOverlay = document.getElementById("detail-overlay");
var detailCard = document.getElementById("detail-card");
var adminSearchInput = document.getElementById("admin-search");
var adminFilterSelect = document.getElementById("admin-filter-status");
var adminTabs = document.getElementById("admin-tabs");
var adminTabTeachers = document.getElementById("admin-tab-teachers");
var adminTabManageAdmins = document.getElementById("admin-tab-manage-admins");
var adminTabRecords = document.getElementById("admin-tab-records");
var adminTabSlots = document.getElementById("admin-tab-slots");
var adminTabCompetition = document.getElementById("admin-tab-competition");
var adminTabAnalytics = document.getElementById("admin-tab-analytics");
var adminTabCalendar = document.getElementById("admin-tab-calendar");
var adminTabTeam = document.getElementById("admin-tab-team");
var adminTabFinance = document.getElementById("admin-tab-finance");
var adminTabDbLimits = document.getElementById("admin-tab-dblimits");
var adminNavGroupAdmin = document.getElementById("admin-nav-group-admin");
var deletePending = null;

function syncAdminCrumb() {
    var crumb = document.getElementById("admin-crumb-current");
    if (!crumb) return;
    var activeBtn = document.querySelector(".admin-tab.active");
    var label = activeBtn && activeBtn.querySelector("[data-i18n]");
    crumb.textContent = label ? label.textContent : "";
}
function updateAdminRoleBadge() {
    var el = document.getElementById("admin-role-badge");
    if (!el) return;
    var key = state.role === ROLE_DEVELOPER ? "admin.roleBadgeDeveloper"
        : state.role === ROLE_ADMIN ? "admin.roleBadgeAdmin" : "admin.roleBadgeTeacher";
    el.textContent = t(key);
}
onLanguageChangeCallbacks.push(syncAdminCrumb);
onLanguageChangeCallbacks.push(updateAdminRoleBadge);
function setPanel(name) {
    document.querySelectorAll(".admin-panel").forEach(function (p) {
        p.hidden = p.getAttribute("data-panel") !== name;
    });
    document.querySelectorAll(".admin-tab").forEach(function (b) {
        b.classList.toggle("active", b.getAttribute("data-tab") === name);
    });
    syncAdminCrumb();
    if (name === "teachers") renderTeachersPanel();
    if (name === "manage-admins") renderManagePanel();
    if (name === "records") renderRecordsPanel();
    if (name === "slots") renderSlotsPanel();
    if (name === "competition") renderCompetitionPanel();
    if (name === "analytics") renderAnalyticsPanel();
    if (name === "calendar") renderCalendarPanel();
    if (name === "team") renderTeamPanel();
    if (name === "finance") renderFinancePanel();
    if (name === "dblimits") renderDbLimitsPanel();
}
if (adminTabs) {
    adminTabs.addEventListener("click", function (e) {
        var btn = e.target.closest(".admin-tab");
        if (!btn) return;
        /* Reaching a panel from its own tab always means "show me everything";
           only the tile that navigates here narrows the view. Without this a
           filter set once would silently persist and look like missing data. */
        clearRecordsFilter();
        setPanel(btn.getAttribute("data-tab"));
    });
}
export async function showAdminDashboard() {
    adminGate.hidden = true;
    adminVerify.hidden = true;
    adminDash.hidden = false;
    state.adminOpen = true;

    var isTeacherOnly = !isAdminRole(state.role);
    adminTabTeachers.hidden = isTeacherOnly;
    adminTabManageAdmins.hidden = state.role !== ROLE_DEVELOPER;
    adminTabRecords.hidden = false;
    adminTabSlots.hidden = isTeacherOnly;
    adminTabCompetition.hidden = isTeacherOnly;
    // Analytics, Team and Finance aggregate the whole academy — including
    // revenue and other teachers' results — so they stay admin-only. The
    // calendar is for everyone; a teacher's view is filtered to their own
    // classes inside the panel.
    adminTabAnalytics.hidden = isTeacherOnly;
    adminTabTeam.hidden = isTeacherOnly;
    adminTabFinance.hidden = isTeacherOnly;
    adminTabDbLimits.hidden = isTeacherOnly;
    adminTabCalendar.hidden = false;
    adminNavGroupAdmin.hidden = isTeacherOnly;
    adminTabs.hidden = false;
    document.getElementById("admin-migrate-applications").hidden = isTeacherOnly;
    updateAdminRoleBadge();
    setPanel("students");

    await loadApplications();
    renderAdminDashboard();
}

document.getElementById("admin-refresh").addEventListener("click", async function () {
    await loadApplications();
    renderAdminDashboard();
    toast(t("admin.refreshedToast"));
});

document.getElementById("admin-migrate-applications").addEventListener("click", async function () {
    var btn = document.getElementById("admin-migrate-applications");
    btn.disabled = true;
    var result = await migrateOldApplications();
    btn.disabled = false;
    if (result.ok) {
        toast(t("admin.migrateDone").replace("{n}", result.count));
        await loadApplications();
        renderAdminDashboard();
    } else {
        toast(t("admin.savingFailedToast"));
    }
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
document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !detailOverlay.hidden) closeDetail();
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

    actions.appendChild(saveBtn);

    /* Marking an application "enrolled" only ever changed a label — it never
       produced the students/{id} record that Student records, the Calendar,
       Finance, the Team ratings and Analytics all read from. This is the step
       that actually moves a family from the funnel into the academy. */
    if (isAdminRole(state.role) && !app.studentRecordId) {
        var enrolBtn = document.createElement("button");
        enrolBtn.type = "button";
        enrolBtn.className = "btn btn-jade";
        enrolBtn.textContent = t("detail.enrolAsStudent");
        enrolBtn.addEventListener("click", async function () {
            enrolBtn.disabled = true;
            var startingLevel = { beginner: 1, intermediate: 4, expert: 7 }[app.program] || 1;
            var created = await addStudent({
                name: app.studentName || app.studentNameAr || "",
                parentEmail: (app.email || "").toLowerCase(),
                studentEmail: "",
                teacherEmail: "",
                branch: app.branch || "",
                levelIndex: startingLevel,
                attendedSessions: 0,
                totalSessions: 0,
                homeworkCompleted: 0,
                homeworkAssigned: 0,
                monthlyFee: 0,
                parentName: app.parentName || "",
                parentPhone: app.phone || "",
                enrolledAt: new Date().toISOString(),
                fromApplicationId: app.id,
            });
            if (!created.ok) {
                enrolBtn.disabled = false;
                toast(t("admin.savingFailedToast"));
                return;
            }
            /* Link both ways and flip the status, so the button can't be used
               twice and the application shows where the student ended up. */
            await updateApplicationDoc(app.id, { status: "enrolled", studentRecordId: created.id });
            /* Open the parent's signup immediately — otherwise they'd be told
               they have no child until an admin happened to open Student
               records, which is where the directory is otherwise rebuilt. */
            try { await syncEnrolledEmails(await loadStudents()); } catch (e) { }
            toast(t("detail.enrolledToast"));
            renderAdminDashboard();
            closeDetail();
        });
        actions.appendChild(enrolBtn);
    }

    if (isAdminRole(state.role)) {
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
        actions.appendChild(deleteBtn);
    }

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
