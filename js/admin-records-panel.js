import { t, fmtDate } from "./i18n.js";
import { renderStatTiles } from "./admin-charts.js";
import { toast } from "./toast.js";
import { loadStudents, loadStudentsForTeacher, addStudent, updateStudent, addExamResult, deleteStudent } from "./student-records.js";
import { loadPortalAccounts } from "./portal-accounts.js";
import {
    loadStudentSignups, approveSignup, rejectSignup, reopenSignup,
    statusOf, STATUS_PENDING, STATUS_APPROVED, STATUS_REJECTED,
} from "./student-signups.js";
import { listApprovedTeachers, isAdminRole } from "./roles.js";
import { syncEnrolledEmails } from "./enrolled-emails.js";
import { BRANCHES } from "./branches.js";
import { auth } from "./firebase-init.js";
import { state } from "./state.js";
import { showLoadingRow } from "./loading-row.js";

var tableBody = document.getElementById("students-table-body");
var addForm = document.getElementById("add-student-form");
var addTeacherSelect = addForm ? addForm.querySelector('[name="teacherEmail"]') : null;
var portalAccountsDetails = document.getElementById("portal-accounts-details");
var signupsDetails = document.getElementById("student-signups-details");
var signupsBody = document.getElementById("student-signups-body");
var filterNotice = document.getElementById("students-filter-notice");
var filterLabel = document.getElementById("students-filter-label");
var filterClear = document.getElementById("students-filter-clear");
var recordsStatTiles = document.getElementById("records-stat-tiles");
var addStudentDetails = document.getElementById("add-student");
var detailOverlay = document.getElementById("detail-overlay");
var detailCard = document.getElementById("detail-card");
var portalAccountsBody = document.getElementById("portal-accounts-table-body");
var students = [];
/* Set by whatever sent you here — the Team panel'''s unassigned-students tile,
   today. Null means show everyone. Cleared whenever Student records is reached
   from its own tab, so a filter can never quietly outlive the trip that set
   it and make the roster look short. */
var activeFilter = null;
var deletePending = null;
var teacherNameByEmail = {};

function teacherLabel(email) {
    if (!email) return t("admin.teacherUnassigned");
    var name = teacherNameByEmail[email.toLowerCase()];
    return name ? name + " (" + email + ")" : email;
}

function fillTeacherSelect(selectEl, teachers, currentValue) {
    selectEl.innerHTML = "";
    var noneOpt = document.createElement("option");
    noneOpt.value = "";
    noneOpt.textContent = t("admin.teacherUnassigned");
    selectEl.appendChild(noneOpt);
    teachers.forEach(function (te) {
        var opt = document.createElement("option");
        opt.value = te.email;
        opt.textContent = te.name ? te.name + " (" + te.email + ")" : te.email;
        if (currentValue && currentValue.toLowerCase() === te.email.toLowerCase()) opt.selected = true;
        selectEl.appendChild(opt);
    });
}

async function renderPortalAccounts(studentsList) {
    if (!portalAccountsBody) return;
    showLoadingRow(portalAccountsBody, 6, t("admin.loading"));
    var accounts = await loadPortalAccounts();
    var linkedEmails = {};
    studentsList.forEach(function (s) {
        if (s.parentEmail) linkedEmails[s.parentEmail.toLowerCase()] = true;
        if (s.studentEmail) linkedEmails[s.studentEmail.toLowerCase()] = true;
    });
    portalAccountsBody.innerHTML = "";
    if (accounts.length === 0) {
        var tr = document.createElement("tr");
        tr.className = "empty-row";
        var td = document.createElement("td");
        td.colSpan = 6;
        td.textContent = t("admin.emptyPortalAccounts");
        tr.appendChild(td);
        portalAccountsBody.appendChild(tr);
        return;
    }
    accounts.forEach(function (a) {
        var tr = document.createElement("tr");
        var tdName = document.createElement("td");
        tdName.textContent = a.name || t("detail.none");
        var tdEmail = document.createElement("td");
        tdEmail.className = "muted";
        tdEmail.textContent = a.email || t("detail.none");
        var tdRole = document.createElement("td");
        tdRole.textContent = a.role === "student" ? t("portal.roleStudent") : t("portal.roleParent");
        var tdDate = document.createElement("td");
        tdDate.className = "muted";
        tdDate.textContent = fmtDate(a.createdAt);

        /* Only a student signup carries a review status. A parent's account is
           gated at signup on already having a child here, so there is nothing
           to review and an empty cell is the honest thing to show. */
        var tdStatus = document.createElement("td");
        if (a.role === "student") {
            var status = statusOf(a);
            var statusPill = document.createElement("span");
            statusPill.className = "status-pill " + (
                status === STATUS_APPROVED ? "enrolled"
                    : status === STATUS_REJECTED ? "declined" : "new"
            );
            statusPill.textContent = t(
                status === STATUS_APPROVED ? "admin.signupsStatusApproved"
                    : status === STATUS_REJECTED ? "admin.signupsStatusRejected"
                        : "admin.signupsStatusPending"
            );
            tdStatus.appendChild(statusPill);
            /* A rejection made by mistake shuts a real student out of their own
               progress page, so it has to be reversible without going near the
               Firebase console. */
            if (status === STATUS_REJECTED) {
                var undo = document.createElement("button");
                undo.type = "button";
                undo.className = "btn btn-ghost btn-sm";
                undo.style.marginTop = "6px";
                undo.style.display = "block";
                undo.textContent = t("admin.signupsReopen");
                undo.addEventListener("click", async function () {
                    undo.disabled = true;
                    var res = await reopenSignup(a.email);
                    if (res.ok) { toast(t("admin.signupsReopenedToast")); renderRecordsPanel(); return; }
                    undo.disabled = false;
                    toast(t("admin.savingFailedToast"));
                });
                tdStatus.appendChild(undo);
            }
        } else {
            tdStatus.className = "muted";
            tdStatus.textContent = t("detail.none");
        }

        var tdLinked = document.createElement("td");
        var linked = !!linkedEmails[(a.email || "").toLowerCase()];
        var pill = document.createElement("span");
        pill.className = "status-pill " + (linked ? "enrolled" : "new");
        pill.textContent = linked ? t("admin.portalAccountsLinkedYes") : t("admin.portalAccountsLinkedNo");
        tdLinked.appendChild(pill);
        tr.appendChild(tdName);
        tr.appendChild(tdEmail);
        tr.appendChild(tdRole);
        tr.appendChild(tdDate);
        tr.appendChild(tdStatus);
        tr.appendChild(tdLinked);
        portalAccountsBody.appendChild(tr);
    });
}

function buildSelect(options, value, className) {
    var sel = document.createElement("select");
    if (className) sel.className = className;
    options.forEach(function (o) {
        var opt = document.createElement("option");
        opt.value = o.value;
        opt.textContent = o.label;
        if (String(value) === String(o.value)) opt.selected = true;
        sel.appendChild(opt);
    });
    return sel;
}

function signupsMessageRow(message) {
    signupsBody.innerHTML = "";
    var tr = document.createElement("tr");
    tr.className = "empty-row";
    var td = document.createElement("td");
    td.colSpan = 5;
    td.textContent = message;
    tr.appendChild(td);
    signupsBody.appendChild(tr);
}

/* The queue for students who are already in the academy.
 *
 * They don't apply — they create a portal login, which lands here as pending.
 * A teacher or an admin picks their teacher, branch and level and accepts,
 * and that is the moment their students/{id} record comes into existence.
 *
 * A teacher may only accept students onto their own roster; an admin may
 * assign to anyone. That is enforced in the security rules, not just here —
 * this only keeps the control honest about what will be permitted. */
async function renderStudentSignups(teachers, admin, myEmail) {
    if (!signupsBody) return;
    showLoadingRow(signupsBody, 5, t("admin.loading"));

    var res = await loadStudentSignups();
    if (!res.ok) {
        if (signupsDetails) signupsDetails.open = false;
        signupsMessageRow(t("admin.signupsLoadFailed"));
        return;
    }

    var pending = res.list.filter(function (a) { return statusOf(a) === STATUS_PENDING; });
    /* Opened only when somebody is actually waiting. A queue nobody notices is
       the same as no queue, and one that is always open is noise. */
    if (signupsDetails) signupsDetails.open = pending.length > 0;

    if (!pending.length) {
        signupsMessageRow(t("admin.signupsEmpty"));
        return;
    }

    /* Accepting means assigning, so with nobody to assign to there is nothing
       useful to offer — say what to do instead of showing a dead control. */
    if (admin && !teachers.length) {
        signupsMessageRow(t("admin.signupsNoTeachers"));
        return;
    }

    var teacherOptions = admin
        ? teachers.map(function (te) {
            return { value: te.email, label: te.name ? te.name + " (" + te.email + ")" : te.email };
        })
        : [{ value: myEmail, label: t("admin.signupsAssignSelf") }];

    var branchOptions = BRANCHES.map(function (b) { return { value: b.id, label: b.label }; });
    var levelOptions = [];
    for (var i = 1; i <= 11; i++) levelOptions.push({ value: i, label: levelLabel(i) });

    signupsBody.innerHTML = "";
    pending.forEach(function (a) {
        var tr = document.createElement("tr");
        /* Rows in this table hold controls, so the table-wide row click that
           opens a student's detail card must not fire here. */
        tr.style.cursor = "default";

        var tdName = document.createElement("td");
        var nameInput = document.createElement("input");
        nameInput.type = "text";
        nameInput.value = a.name || "";
        /* Students type their own name at signup, so let staff correct the
           spelling before it becomes the record everyone reads. */
        nameInput.setAttribute("aria-label", t("admin.colName"));
        tdName.appendChild(nameInput);

        var tdEmail = document.createElement("td");
        tdEmail.className = "muted";
        tdEmail.textContent = a.email;

        var tdDate = document.createElement("td");
        tdDate.className = "muted";
        tdDate.textContent = fmtDate(a.createdAt);

        var tdAssign = document.createElement("td");
        var teacherSel = buildSelect(teacherOptions, admin ? "" : myEmail);
        var branchSel = buildSelect(branchOptions, "");
        var levelSel = buildSelect(levelOptions, 1);
        teacherSel.setAttribute("aria-label", t("admin.assignedTeacherLabel"));
        branchSel.setAttribute("aria-label", t("apply.fBranch"));
        levelSel.setAttribute("aria-label", t("portal.levelLabel"));
        [teacherSel, branchSel, levelSel].forEach(function (el) {
            el.style.display = "block";
            el.style.marginBottom = "6px";
            tdAssign.appendChild(el);
        });

        var tdActions = document.createElement("td");
        var accept = document.createElement("button");
        accept.type = "button";
        accept.className = "btn btn-jade btn-sm";
        accept.textContent = t("admin.signupsAccept");
        var reject = document.createElement("button");
        reject.type = "button";
        reject.className = "btn btn-ghost btn-sm";
        reject.textContent = t("admin.signupsReject");
        reject.style.marginTop = "6px";
        accept.style.display = "block";
        reject.style.display = "block";

        accept.addEventListener("click", async function () {
            var name = nameInput.value.trim();
            if (!name) { nameInput.focus(); return; }
            accept.disabled = true; reject.disabled = true;
            var result = await approveSignup(a, {
                name: name,
                teacherEmail: teacherSel.value,
                branch: branchSel.value,
                levelIndex: Number(levelSel.value) || 1,
            });
            if (result.ok) {
                toast(t("admin.signupsAcceptedToast"));
                renderRecordsPanel();
                return;
            }
            accept.disabled = false; reject.disabled = false;
            /* The record exists but the signup still reads as waiting. Saying
               "failed" would invite a second accept and a duplicate student,
               so this case gets its own wording. */
            toast(t(result.code === "record_created_not_marked"
                ? "admin.signupsPartialToast"
                : "admin.savingFailedToast"));
        });

        reject.addEventListener("click", async function () {
            accept.disabled = true; reject.disabled = true;
            var result = await rejectSignup(a.email);
            if (result.ok) {
                toast(t("admin.signupsRejectedToast"));
                renderRecordsPanel();
                return;
            }
            accept.disabled = false; reject.disabled = false;
            toast(t("admin.savingFailedToast"));
        });

        tdActions.appendChild(accept);
        tdActions.appendChild(reject);

        tr.appendChild(tdName);
        tr.appendChild(tdEmail);
        tr.appendChild(tdDate);
        tr.appendChild(tdAssign);
        tr.appendChild(tdActions);
        signupsBody.appendChild(tr);
    });
}

function levelLabel(levelIndex) {
    var n = Number(levelIndex) || 1;
    if (n >= 11) return t("portal.levelGraduate");
    return t("portal.levelPrefix") + " " + n + "/11";
}

export function clearRecordsFilter() {
    activeFilter = null;
}

function applyFilter(list) {
    if (activeFilter === "unassigned") {
        return list.filter(function (s) { return !s.teacherEmail; });
    }
    return list;
}

/* The whole-academy "how many have no teacher" count belongs here, next to
   the actual roster, rather than in the Team panel where the number was
   previously stranded with no view of the students it describes. Admin-only:
   a teacher's own view of this panel is already filtered to their own
   students, so "unassigned" has no meaning inside it. */
function renderRecordsStatTiles(admin) {
    if (!recordsStatTiles) return;
    if (!admin) { recordsStatTiles.innerHTML = ""; return; }
    var unassigned = students.filter(function (s) { return !s.teacherEmail; }).length;
    renderStatTiles(recordsStatTiles, [
        {
            label: t("team.unassignedStudents"), value: String(unassigned),
            tone: unassigned > 0 ? "warn" : "", hint: unassigned > 0 ? t("team.unassignedHint") : "",
            /* Already on the page the tile describes, so pressing it narrows the
               table below rather than navigating anywhere. */
            actionLabel: unassigned > 0 ? t("team.unassignedAction") : "",
            onClick: unassigned > 0 ? function () { activeFilter = "unassigned"; renderRecordsPanel(); } : null,
        },
    ]);
}

function renderFilterNotice() {
    if (!filterNotice) return;
    filterNotice.hidden = !activeFilter;
    if (activeFilter && filterLabel) filterLabel.textContent = t("admin.filterUnassigned");
}

if (filterClear) {
    filterClear.addEventListener("click", function () {
        clearRecordsFilter();
        renderRecordsPanel();
    });
}

export async function renderRecordsPanel() {
    if (!tableBody) return;
    var admin = isAdminRole(state.role);
    var myEmail = ((auth.currentUser && auth.currentUser.email) || "").toLowerCase();

    if (portalAccountsDetails) portalAccountsDetails.hidden = !admin;
    if (addStudentDetails) addStudentDetails.hidden = !admin;
    /* The signup queue stays visible to teachers as well as admins: the point
       of it is that either can accept a student who is already in the academy
       and take them onto their own roster. */
    if (signupsDetails) signupsDetails.hidden = false;

    showLoadingRow(tableBody, 5, t("admin.loading"));

    if (admin) {
        students = await loadStudents();
        /* Keep the parent-signup directory in step with who is actually
           enrolled. Rebuilt from the records themselves and only writes what
           changed, so the usual case is no writes at all. */
        syncEnrolledEmails(students);
        renderPortalAccounts(students);
        var teachersForAdd = await listApprovedTeachers();
        teacherNameByEmail = {};
        teachersForAdd.forEach(function (te) { teacherNameByEmail[te.email.toLowerCase()] = te.name || ""; });
        if (addTeacherSelect) fillTeacherSelect(addTeacherSelect, teachersForAdd, "");
        renderStudentSignups(teachersForAdd, true, myEmail);
    } else {
        students = await loadStudentsForTeacher(myEmail);
        /* A teacher can't list the teachers collection, and doesn't need to:
           the rules only let them assign a student to themselves. */
        renderStudentSignups([], false, myEmail);
    }
    renderRecordsStatTiles(admin);
    renderFilterNotice();
    /* `students` stays the full roster — openStudentDetail() looks records up
       in it by id, and a filtered view must not make a record unopenable. Only
       what gets drawn is narrowed. */
    var visible = applyFilter(students);
    tableBody.innerHTML = "";

    if (visible.length === 0) {
        var tr = document.createElement("tr");
        tr.className = "empty-row";
        var td = document.createElement("td");
        td.colSpan = 5;
        /* "No students yet" would be wrong and alarming when the roster is
           full and the filter simply matched nothing. */
        td.textContent = activeFilter ? t("admin.filterNoMatches") : t("admin.emptyStudents");
        tr.appendChild(td);
        tableBody.appendChild(tr);
        return;
    }

    visible.forEach(function (s) {
        var tr = document.createElement("tr");
        tr.addEventListener("click", function () { openStudentDetail(s.id); });

        var tdName = document.createElement("td");
        tdName.textContent = s.name || t("detail.none");
        var tdEmail = document.createElement("td");
        tdEmail.className = "muted";
        tdEmail.textContent = s.parentEmail || t("detail.none");
        var tdTeacher = document.createElement("td");
        tdTeacher.className = "muted";
        tdTeacher.textContent = teacherLabel(s.teacherEmail);
        var tdLevel = document.createElement("td");
        tdLevel.textContent = levelLabel(s.levelIndex);
        var tdAttendance = document.createElement("td");
        tdAttendance.textContent = (s.attendedSessions || 0) + " / " + (s.totalSessions || 0);

        tr.appendChild(tdName);
        tr.appendChild(tdEmail);
        tr.appendChild(tdTeacher);
        tr.appendChild(tdLevel);
        tr.appendChild(tdAttendance);
        tableBody.appendChild(tr);
    });
}

/* backdrop click and Escape-to-close are already wired globally in admin.js
   against the same #detail-overlay element; no need to duplicate them here. */
function closeDetail() {
    detailOverlay.hidden = true;
    detailCard.innerHTML = "";
    deletePending = null;
}

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

async function openStudentDetail(id) {
    var s = students.find(function (x) { return x.id === id; });
    if (!s) return;
    var admin = isAdminRole(state.role);
    var teacherOptions = admin ? await listApprovedTeachers() : [];
    deletePending = null;
    detailCard.innerHTML = "";
    detailCard.dataset.kind = "student";

    var head = document.createElement("div");
    head.className = "detail-head";
    var h3 = document.createElement("h3");
    h3.textContent = s.name || t("detail.title");
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
    meta.textContent = (s.parentEmail || "") + "  ·  " + (s.branch || "");
    detailCard.appendChild(meta);

    var rows = document.createElement("div");
    rows.className = "detail-rows";

    /* Name and branch were fixed at creation time with no way to correct a
       typo or move a child to another branch — both are editable by an admin
       now. Teachers still can't touch them; the Firestore rules restrict a
       teacher's update to the progress fields only. */
    var nameInput = null;
    var branchSelect = null;
    if (admin) {
        var nameWrap = document.createElement("div");
        nameWrap.className = "row";
        var nameK = document.createElement("div");
        nameK.className = "k";
        nameK.textContent = t("admin.colStudent");
        nameInput = document.createElement("input");
        nameInput.type = "text";
        nameInput.value = s.name || "";
        nameWrap.appendChild(nameK);
        nameWrap.appendChild(nameInput);
        rows.appendChild(nameWrap);

        var branchWrap = document.createElement("div");
        branchWrap.className = "row";
        var branchK = document.createElement("div");
        branchK.className = "k";
        branchK.textContent = t("detail.branch");
        branchSelect = document.createElement("select");
        var noBranch = document.createElement("option");
        noBranch.value = "";
        noBranch.textContent = t("detail.none");
        branchSelect.appendChild(noBranch);
        BRANCHES.forEach(function (b) {
            var opt = document.createElement("option");
            opt.value = b.id;
            opt.textContent = b.label;
            if (s.branch === b.id) opt.selected = true;
            branchSelect.appendChild(opt);
        });
        branchWrap.appendChild(branchK);
        branchWrap.appendChild(branchSelect);
        rows.appendChild(branchWrap);
    }

    var parentEmailInput = null;
    if (admin) {
        var parentEmailWrap = document.createElement("div");
        parentEmailWrap.className = "row";
        var parentEmailK = document.createElement("div");
        parentEmailK.className = "k";
        parentEmailK.textContent = t("admin.parentEmailLabel");
        parentEmailInput = document.createElement("input");
        parentEmailInput.type = "email";
        parentEmailInput.value = s.parentEmail || "";
        parentEmailWrap.appendChild(parentEmailK);
        parentEmailWrap.appendChild(parentEmailInput);
        rows.appendChild(parentEmailWrap);
    } else {
        rows.appendChild(detailRow(t("admin.parentEmailLabel"), s.parentEmail));
    }

    var studentEmailInput = null;
    if (admin) {
        var studentEmailWrap = document.createElement("div");
        studentEmailWrap.className = "row";
        var studentEmailK = document.createElement("div");
        studentEmailK.className = "k";
        studentEmailK.textContent = t("admin.studentEmailLabel");
        studentEmailInput = document.createElement("input");
        studentEmailInput.type = "email";
        studentEmailInput.value = s.studentEmail || "";
        studentEmailWrap.appendChild(studentEmailK);
        studentEmailWrap.appendChild(studentEmailInput);
        rows.appendChild(studentEmailWrap);
    } else {
        rows.appendChild(detailRow(t("admin.studentEmailLabel"), s.studentEmail));
    }

    var teacherSelect = null;
    if (admin) {
        var teacherWrap = document.createElement("div");
        teacherWrap.className = "row";
        var teacherK = document.createElement("div");
        teacherK.className = "k";
        teacherK.textContent = t("admin.assignedTeacherLabel");
        teacherSelect = document.createElement("select");
        fillTeacherSelect(teacherSelect, teacherOptions, s.teacherEmail || "");
        teacherWrap.appendChild(teacherK);
        teacherWrap.appendChild(teacherSelect);
        rows.appendChild(teacherWrap);
    } else {
        rows.appendChild(detailRow(t("admin.assignedTeacherLabel"), s.teacherEmail));
    }

    var levelWrap = document.createElement("div");
    levelWrap.className = "row";
    var levelK = document.createElement("div");
    levelK.className = "k";
    levelK.textContent = t("portal.levelLabel");
    var levelSelect = document.createElement("select");
    for (var i = 1; i <= 11; i++) {
        var opt = document.createElement("option");
        opt.value = String(i);
        opt.textContent = i === 11 ? "11 — " + t("portal.levelGraduate") : String(i);
        if (Number(s.levelIndex) === i) opt.selected = true;
        levelSelect.appendChild(opt);
    }
    levelWrap.appendChild(levelK);
    levelWrap.appendChild(levelSelect);
    rows.appendChild(levelWrap);

    var attWrap = document.createElement("div");
    attWrap.className = "row";
    var attK = document.createElement("div");
    attK.className = "k";
    attK.textContent = t("portal.attendedLabel");
    var attInput = document.createElement("input");
    attInput.type = "number";
    attInput.min = "0";
    attInput.value = s.attendedSessions || 0;
    attWrap.appendChild(attK);
    attWrap.appendChild(attInput);
    rows.appendChild(attWrap);

    var totWrap = document.createElement("div");
    totWrap.className = "row";
    var totK = document.createElement("div");
    totK.className = "k";
    totK.textContent = t("portal.totalLabel");
    var totInput = document.createElement("input");
    totInput.type = "number";
    totInput.min = "0";
    totInput.value = s.totalSessions || 0;
    totWrap.appendChild(totK);
    totWrap.appendChild(totInput);
    rows.appendChild(totWrap);

    var hwcWrap = document.createElement("div");
    hwcWrap.className = "row";
    var hwcK = document.createElement("div");
    hwcK.className = "k";
    hwcK.textContent = t("portal.hwCompletedLabel");
    var hwcInput = document.createElement("input");
    hwcInput.type = "number";
    hwcInput.min = "0";
    hwcInput.value = s.homeworkCompleted || 0;
    hwcWrap.appendChild(hwcK);
    hwcWrap.appendChild(hwcInput);
    rows.appendChild(hwcWrap);

    var hwaWrap = document.createElement("div");
    hwaWrap.className = "row";
    var hwaK = document.createElement("div");
    hwaK.className = "k";
    hwaK.textContent = t("portal.hwAssignedLabel");
    var hwaInput = document.createElement("input");
    hwaInput.type = "number";
    hwaInput.min = "0";
    hwaInput.value = s.homeworkAssigned || 0;
    hwaWrap.appendChild(hwaK);
    hwaWrap.appendChild(hwaInput);
    rows.appendChild(hwaWrap);

    detailCard.appendChild(rows);

    var examTitle = document.createElement("h4");
    examTitle.textContent = t("portal.examHistoryLabel");
    examTitle.style.marginTop = "18px";
    detailCard.appendChild(examTitle);
    var examList = document.createElement("div");
    (s.examHistory || []).forEach(function (ex) {
        examList.appendChild(detailRow(fmtDate(ex.date), (ex.level || "") + " — " + (ex.result === "passed" ? t("portal.examPassed") : t("portal.examFailed"))));
    });
    if ((s.examHistory || []).length === 0) {
        var noneRow = document.createElement("p");
        noneRow.className = "muted";
        noneRow.textContent = t("detail.none");
        examList.appendChild(noneRow);
    }
    detailCard.appendChild(examList);

    var examForm = document.createElement("div");
    examForm.className = "admin-toolbar";
    examForm.style.marginTop = "10px";
    var examLevelInput = document.createElement("input");
    examLevelInput.type = "text";
    examLevelInput.placeholder = t("portal.examLevelPlaceholder");
    var examResultSelect = document.createElement("select");
    ["passed", "failed"].forEach(function (r) {
        var o = document.createElement("option");
        o.value = r;
        o.textContent = r === "passed" ? t("portal.examPassed") : t("portal.examFailed");
        examResultSelect.appendChild(o);
    });
    var addExamBtn = document.createElement("button");
    addExamBtn.type = "button";
    addExamBtn.className = "btn btn-secondary btn-sm";
    addExamBtn.textContent = t("portal.addExamBtn");
    addExamBtn.addEventListener("click", async function () {
        if (!examLevelInput.value.trim()) { examLevelInput.focus(); return; }
        addExamBtn.disabled = true;
        var result = await addExamResult(s.id, {
            level: examLevelInput.value.trim(), result: examResultSelect.value, date: new Date().toISOString(),
        });
        addExamBtn.disabled = false;
        if (result.ok) {
            toast(t("admin.savedToast"));
            await renderRecordsPanel();
            openStudentDetail(s.id);
        } else {
            toast(t("admin.savingFailedToast"));
        }
    });
    examForm.appendChild(examLevelInput);
    examForm.appendChild(examResultSelect);
    examForm.appendChild(addExamBtn);
    detailCard.appendChild(examForm);

    var actions = document.createElement("div");
    actions.className = "detail-actions";
    actions.style.marginTop = "18px";

    var saveBtn = document.createElement("button");
    saveBtn.type = "button";
    saveBtn.className = "btn btn-jade";
    saveBtn.textContent = t("detail.save");
    saveBtn.addEventListener("click", async function () {
        saveBtn.disabled = true;
        var fields = {
            levelIndex: Number(levelSelect.value),
            attendedSessions: Number(attInput.value) || 0,
            totalSessions: Number(totInput.value) || 0,
            homeworkCompleted: Number(hwcInput.value) || 0,
            homeworkAssigned: Number(hwaInput.value) || 0,
        };
        if (admin) {
            fields.parentEmail = parentEmailInput.value.trim().toLowerCase();
            fields.studentEmail = studentEmailInput.value.trim().toLowerCase();
            if (teacherSelect) fields.teacherEmail = teacherSelect.value;
            if (nameInput) fields.name = nameInput.value.trim();
            if (branchSelect) fields.branch = branchSelect.value;
        }
        var result = await updateStudent(s.id, fields);
        saveBtn.disabled = false;
        if (result.ok) {
            toast(t("admin.savedToast"));
            renderRecordsPanel();
            closeDetail();
        } else {
            toast(t("admin.savingFailedToast"));
        }
    });

    actions.appendChild(saveBtn);

    if (admin) {
        var deleteBtn = document.createElement("button");
        deleteBtn.type = "button";
        deleteBtn.className = "btn btn-secondary";
        deleteBtn.textContent = t("detail.delete");
        deleteBtn.addEventListener("click", async function () {
            if (deletePending !== s.id) {
                deletePending = s.id;
                deleteBtn.textContent = t("admin.confirmDelete");
                return;
            }
            deleteBtn.disabled = true;
            var result = await deleteStudent(s.id);
            deleteBtn.disabled = false;
            if (result.ok) {
                toast(t("admin.deletedToast"));
                renderRecordsPanel();
                closeDetail();
            } else {
                toast(t("admin.savingFailedToast"));
            }
        });
        actions.appendChild(deleteBtn);
    }

    detailCard.appendChild(actions);

    detailOverlay.hidden = false;
}

if (addForm) {
    addForm.addEventListener("submit", async function (e) {
        e.preventDefault();
        var fd = new FormData(addForm);
        var name = (fd.get("name") || "").toString().trim();
        var parentEmail = (fd.get("parentEmail") || "").toString().trim().toLowerCase();
        if (!name || !parentEmail) return;
        var submitBtn = addForm.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        var studentEmail = (fd.get("studentEmail") || "").toString().trim().toLowerCase();
        var teacherEmail = (fd.get("teacherEmail") || "").toString().trim().toLowerCase();
        var result = await addStudent({
            name: name,
            parentEmail: parentEmail,
            studentEmail: studentEmail,
            teacherEmail: teacherEmail,
            branch: (fd.get("branch") || "").toString(),
            levelIndex: Number(fd.get("levelIndex")) || 1,
            attendedSessions: Number(fd.get("attendedSessions")) || 0,
            totalSessions: Number(fd.get("totalSessions")) || 0,
            homeworkCompleted: Number(fd.get("homeworkCompleted")) || 0,
            homeworkAssigned: Number(fd.get("homeworkAssigned")) || 0,
            enrolledAt: new Date().toISOString(),
        });
        submitBtn.disabled = false;
        if (result.ok) {
            toast(t("admin.addedToast"));
            addForm.reset();
            document.getElementById("add-student").open = false;
            renderRecordsPanel();
        } else {
            toast(t("admin.savingFailedToast"));
        }
    });
}
