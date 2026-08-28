import { t, fmtDate } from "./i18n.js";
import { toast } from "./toast.js";
import { loadStudents, addStudent, updateStudent, addExamResult, deleteStudent } from "./student-records.js";
import { loadPortalAccounts } from "./portal-accounts.js";

var tableBody = document.getElementById("students-table-body");
var addForm = document.getElementById("add-student-form");
var detailOverlay = document.getElementById("detail-overlay");
var detailCard = document.getElementById("detail-card");
var portalAccountsBody = document.getElementById("portal-accounts-table-body");
var students = [];
var deletePending = null;

async function renderPortalAccounts(studentsList) {
    if (!portalAccountsBody) return;
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
        td.colSpan = 4;
        td.textContent = t("admin.emptyList");
        tr.appendChild(td);
        portalAccountsBody.appendChild(tr);
        return;
    }
    accounts.forEach(function (a) {
        var tr = document.createElement("tr");
        var tdEmail = document.createElement("td");
        tdEmail.textContent = a.email || t("detail.none");
        var tdRole = document.createElement("td");
        tdRole.textContent = a.role === "student" ? t("portal.roleStudent") : t("portal.roleParent");
        var tdDate = document.createElement("td");
        tdDate.className = "muted";
        tdDate.textContent = fmtDate(a.createdAt);
        var tdLinked = document.createElement("td");
        var linked = !!linkedEmails[(a.email || "").toLowerCase()];
        var pill = document.createElement("span");
        pill.className = "status-pill " + (linked ? "enrolled" : "new");
        pill.textContent = linked ? t("admin.portalAccountsLinkedYes") : t("admin.portalAccountsLinkedNo");
        tdLinked.appendChild(pill);
        tr.appendChild(tdEmail);
        tr.appendChild(tdRole);
        tr.appendChild(tdDate);
        tr.appendChild(tdLinked);
        portalAccountsBody.appendChild(tr);
    });
}

function levelLabel(levelIndex) {
    var n = Number(levelIndex) || 1;
    if (n >= 11) return t("portal.levelGraduate");
    return t("portal.levelPrefix") + " " + n + "/11";
}

export async function renderRecordsPanel() {
    if (!tableBody) return;
    students = await loadStudents();
    renderPortalAccounts(students);
    tableBody.innerHTML = "";

    if (students.length === 0) {
        var tr = document.createElement("tr");
        tr.className = "empty-row";
        var td = document.createElement("td");
        td.colSpan = 4;
        td.textContent = t("admin.emptyList");
        tr.appendChild(td);
        tableBody.appendChild(tr);
        return;
    }

    students.forEach(function (s) {
        var tr = document.createElement("tr");
        tr.addEventListener("click", function () { openStudentDetail(s.id); });

        var tdName = document.createElement("td");
        tdName.textContent = s.name || t("detail.none");
        var tdEmail = document.createElement("td");
        tdEmail.className = "muted";
        tdEmail.textContent = s.parentEmail || t("detail.none");
        var tdLevel = document.createElement("td");
        tdLevel.textContent = levelLabel(s.levelIndex);
        var tdAttendance = document.createElement("td");
        tdAttendance.textContent = (s.attendedSessions || 0) + " / " + (s.totalSessions || 0);

        tr.appendChild(tdName);
        tr.appendChild(tdEmail);
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

function openStudentDetail(id) {
    var s = students.find(function (x) { return x.id === id; });
    if (!s) return;
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

    var studentEmailWrap = document.createElement("div");
    studentEmailWrap.className = "row";
    var studentEmailK = document.createElement("div");
    studentEmailK.className = "k";
    studentEmailK.textContent = t("admin.studentEmailLabel");
    var studentEmailInput = document.createElement("input");
    studentEmailInput.type = "email";
    studentEmailInput.value = s.studentEmail || "";
    studentEmailWrap.appendChild(studentEmailK);
    studentEmailWrap.appendChild(studentEmailInput);
    rows.appendChild(studentEmailWrap);

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
        var result = await updateStudent(s.id, {
            studentEmail: studentEmailInput.value.trim().toLowerCase(),
            levelIndex: Number(levelSelect.value),
            attendedSessions: Number(attInput.value) || 0,
            totalSessions: Number(totInput.value) || 0,
            homeworkCompleted: Number(hwcInput.value) || 0,
            homeworkAssigned: Number(hwaInput.value) || 0,
        });
        saveBtn.disabled = false;
        if (result.ok) {
            toast(t("admin.savedToast"));
            renderRecordsPanel();
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

    actions.appendChild(saveBtn);
    actions.appendChild(deleteBtn);
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
        var result = await addStudent({
            name: name,
            parentEmail: parentEmail,
            studentEmail: studentEmail,
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
