import { t } from "./i18n.js";
import { state } from "./state.js";
import { toast } from "./toast.js";
import { loadStudents } from "./student-records.js";
import { showUnassignedStudents } from "./admin-records-panel.js";
import { listApprovedTeachers, listAdmins, isAdminRole, revokeTeacher, setTeacherSalary, ROLE_DEVELOPER } from "./roles.js";
import { loadExpenses, addExpense } from "./expenses.js";
import { periodKey, periodLabel } from "./payments.js";
import { money } from "./admin-charts.js";
import { loadClasses } from "./classes.js";
import { provisionStaffAccount } from "./staff-provisioning.js";
import { renderBarList, renderStatTiles, pct } from "./admin-charts.js";
import { showLoadingRow } from "./loading-row.js";

var tilesEl = document.getElementById("team-tiles");
var tableBody = document.getElementById("team-table-body");
var loadChartEl = document.getElementById("team-load-chart");
var staffBody = document.getElementById("team-staff-body");
var addStaffDetails = document.getElementById("add-staff");
var addStaffForm = document.getElementById("add-staff-form");
var addStaffError = document.getElementById("add-staff-error");
var revokePending = null;

/* A teacher is scored on the three things the records actually capture:
 * attendance, homework completion, and exam pass rate. Each is only counted
 * when it has a denominator, so a teacher whose students have no homework
 * assigned yet isn't punished for it — and a teacher with no measurable data
 * at all is reported as "not enough data" rather than scored as zero. */
function scoreTeacher(students) {
    var attended = 0, sessions = 0, hwDone = 0, hwAssigned = 0, passed = 0, exams = 0;
    students.forEach(function (s) {
        attended += Number(s.attendedSessions) || 0;
        sessions += Number(s.totalSessions) || 0;
        hwDone += Number(s.homeworkCompleted) || 0;
        hwAssigned += Number(s.homeworkAssigned) || 0;
        (s.examHistory || []).forEach(function (ex) {
            exams++;
            if (ex.result === "passed") passed++;
        });
    });

    var parts = [];
    if (sessions > 0) parts.push(pct(attended, sessions));
    if (hwAssigned > 0) parts.push(pct(hwDone, hwAssigned));
    if (exams > 0) parts.push(pct(passed, exams));

    var score = parts.length
        ? Math.round(parts.reduce(function (a, b) { return a + b; }, 0) / parts.length)
        : null;

    return {
        attendance: sessions > 0 ? pct(attended, sessions) : null,
        homework: hwAssigned > 0 ? pct(hwDone, hwAssigned) : null,
        exams: exams > 0 ? pct(passed, exams) : null,
        score: score,
    };
}

function ratingFor(score) {
    if (score == null) return { key: "team.ratingNoData", tone: "" };
    if (score >= 80) return { key: "team.ratingStrong", tone: "enrolled" };
    if (score >= 60) return { key: "team.ratingSteady", tone: "contacted" };
    return { key: "team.ratingAttention", tone: "declined" };
}

function cell(text, className) {
    var td = document.createElement("td");
    if (className) td.className = className;
    td.textContent = text;
    return td;
}

function showPct(value) {
    return value == null ? "—" : value + "%";
}

export async function renderTeamPanel() {
    if (!tableBody) return;

    /* Any admin can take on a teacher; only a developer can mint another
       admin, which is also what the Firestore rules enforce on admins/{email}. */
    if (addStaffDetails) addStaffDetails.hidden = !isAdminRole(state.role);
    document.querySelectorAll(".staff-role-admin").forEach(function (opt) {
        opt.hidden = state.role !== ROLE_DEVELOPER;
        opt.disabled = state.role !== ROLE_DEVELOPER;
    });

    showLoadingRow(tableBody, 8, t("admin.loading"));

    var students = await loadStudents();
    var teachers = await listApprovedTeachers();
    var classes = await loadClasses();
    var thisPeriod = periodKey();
    /* Which teachers have already been paid this month, so the Pay button
       can't quietly double-pay someone. */
    var paidSalaries = {};
    (await loadExpenses()).forEach(function (x) {
        if (x.category === "salary" && x.period === thisPeriod && x.paidTo) {
            paidSalaries[x.paidTo.toLowerCase()] = true;
        }
    });

    var classCountByTeacher = {};
    classes.forEach(function (c) {
        var key = (c.teacherEmail || "").toLowerCase();
        if (key) classCountByTeacher[key] = (classCountByTeacher[key] || 0) + 1;
    });

    var rows = teachers.map(function (te) {
        var email = (te.email || "").toLowerCase();
        var mine = students.filter(function (s) {
            return (s.teacherEmail || "").toLowerCase() === email;
        });
        return Object.assign({
            email: te.email,
            name: te.name || "",
            students: mine.length,
            classes: classCountByTeacher[email] || 0,
            salary: Number(te.monthlySalary) || 0,
        }, scoreTeacher(mine));
    });

    rows.sort(function (a, b) { return b.students - a.students; });

    var unassigned = students.filter(function (s) { return !s.teacherEmail; }).length;
    var needsAttention = rows.filter(function (r) { return r.score != null && r.score < 60; }).length;

    renderStatTiles(tilesEl, [
        { label: t("team.totalTeachers"), value: String(teachers.length) },
        { label: t("team.studentsCovered"), value: String(students.length - unassigned) },
        {
            label: t("team.unassignedStudents"), value: String(unassigned),
            tone: unassigned > 0 ? "warn" : "", hint: unassigned > 0 ? t("team.unassignedHint") : "",
            /* Pressable only when there is something to go and look at. A tile
               reading 0 that navigates to an empty list wastes the trip. */
            actionLabel: unassigned > 0 ? t("team.unassignedAction") : "",
            onClick: unassigned > 0 ? showUnassignedStudents : null,
        },
        {
            label: t("team.needsAttention"), value: String(needsAttention),
            tone: needsAttention > 0 ? "danger" : "",
        },
    ]);

    renderBarList(loadChartEl, rows.map(function (r) {
        return { label: r.name || r.email, value: r.students };
    }), { emptyText: t("common.nothingYet") });

    tableBody.innerHTML = "";
    if (!rows.length) {
        var tr = document.createElement("tr");
        tr.className = "empty-row";
        var td = document.createElement("td");
        td.colSpan = 8;
        td.textContent = t("team.emptyTeachers");
        tr.appendChild(td);
        tableBody.appendChild(tr);
    } else {
        rows.forEach(function (r) {
            var tr = document.createElement("tr");
            var tdName = document.createElement("td");
            tdName.appendChild(document.createTextNode(r.name || r.email));
            if (r.name) {
                var sub = document.createElement("div");
                sub.className = "team-row-email";
                sub.textContent = r.email;
                tdName.appendChild(sub);
            }
            tr.appendChild(tdName);
            tr.appendChild(cell(String(r.students) + " · " + r.classes, "muted"));
            tr.appendChild(cell(showPct(r.attendance)));
            tr.appendChild(cell(showPct(r.homework)));
            tr.appendChild(cell(showPct(r.exams)));

            var tdRating = document.createElement("td");
            var rating = ratingFor(r.score);
            var pill = document.createElement("span");
            pill.className = "status-pill " + (rating.tone || "new");
            pill.textContent = t(rating.key) + (r.score != null ? " · " + r.score + "%" : "");
            tdRating.appendChild(pill);
            tr.appendChild(tdRating);

            /* Salary lives beside the workload it pays for. Setting the figure
               and actually paying it are deliberately separate actions — the
               field is the standing agreement, the button books one month of
               it into the expenses ledger. */
            var tdSalary = document.createElement("td");
            if (isAdminRole(state.role)) {
                var salaryWrap = document.createElement("div");
                salaryWrap.className = "finance-record-row";
                var salaryInput = document.createElement("input");
                salaryInput.type = "number";
                salaryInput.min = "0";
                salaryInput.className = "finance-fee-input";
                salaryInput.value = r.salary;
                salaryInput.setAttribute("aria-label", t("team.colSalary"));
                salaryInput.addEventListener("change", async function () {
                    var res = await setTeacherSalary(r.email, Number(salaryInput.value) || 0);
                    toast(t(res.ok ? "admin.savedToast" : "admin.savingFailedToast"));
                    if (res.ok) renderTeamPanel();
                });
                salaryWrap.appendChild(salaryInput);

                var payBtn = document.createElement("button");
                payBtn.type = "button";
                payBtn.className = "btn btn-secondary btn-sm";
                var alreadyPaid = !!paidSalaries[r.email.toLowerCase()];
                payBtn.textContent = alreadyPaid ? t("team.salaryPaid") : t("team.payBtn");
                payBtn.disabled = alreadyPaid || r.salary <= 0;
                payBtn.addEventListener("click", async function () {
                    payBtn.disabled = true;
                    var res = await addExpense({
                        category: "salary",
                        description: t("team.salaryFor") + " " + (r.name || r.email) + " · " + periodLabel(thisPeriod, state.lang),
                        paidTo: r.email,
                        amount: r.salary,
                        period: thisPeriod,
                    });
                    if (res.ok) {
                        toast(t("team.salaryPaidToast"));
                        renderTeamPanel();
                    } else {
                        payBtn.disabled = false;
                        toast(t("admin.savingFailedToast"));
                    }
                });
                salaryWrap.appendChild(payBtn);
                tdSalary.appendChild(salaryWrap);
            } else {
                tdSalary.className = "muted";
                tdSalary.textContent = r.salary ? money(r.salary) : "—";
            }
            tr.appendChild(tdSalary);

            var tdAction = document.createElement("td");
            if (isAdminRole(state.role)) {
                var revokeBtn = document.createElement("button");
                revokeBtn.type = "button";
                revokeBtn.className = "btn btn-secondary btn-sm";
                revokeBtn.textContent = t("team.revokeBtn");
                /* Two-step: revoking locks someone out of the dashboard. */
                revokeBtn.addEventListener("click", async function () {
                    if (revokePending !== r.email) {
                        revokePending = r.email;
                        revokeBtn.textContent = t("admin.confirmDelete");
                        return;
                    }
                    revokeBtn.disabled = true;
                    var result = await revokeTeacher(r.email);
                    if (result.ok) {
                        revokePending = null;
                        toast(t("team.revokedToast"));
                        renderTeamPanel();
                    } else {
                        revokeBtn.disabled = false;
                        toast(t("admin.savingFailedToast"));
                    }
                });
                tdAction.appendChild(revokeBtn);
            } else {
                tdAction.className = "muted";
                tdAction.textContent = "—";
            }
            tr.appendChild(tdAction);

            tableBody.appendChild(tr);
        });
    }

    /* Admins and developers listed separately — they're staff too, but they
       aren't scored on teaching metrics they don't participate in. */
    if (staffBody) {
        showLoadingRow(staffBody, 2, t("admin.loading"));
        /* Unlike its siblings, listAdmins() rethrows — only a developer may
           list the collection, so an ordinary admin opening Team would
           otherwise surface an unhandled permissions rejection. */
        var admins = [];
        try { admins = await listAdmins(); } catch (e) { admins = []; }
        staffBody.innerHTML = "";
        if (!admins.length) {
            var trA = document.createElement("tr");
            trA.className = "empty-row";
            var tdA = document.createElement("td");
            tdA.colSpan = 2;
            tdA.textContent = t("team.emptyAdmins");
            trA.appendChild(tdA);
            staffBody.appendChild(trA);
        } else {
            admins.forEach(function (a) {
                var tr = document.createElement("tr");
                tr.appendChild(cell(a.email));
                tr.appendChild(cell(a.role === ROLE_DEVELOPER ? t("admin.roleDeveloper") : t("admin.roleAdmin")));
                staffBody.appendChild(tr);
            });
        }
    }
}

if (addStaffForm) {
    addStaffForm.addEventListener("submit", async function (e) {
        e.preventDefault();
        addStaffError.classList.remove("show");
        addStaffError.textContent = "";

        var fd = new FormData(addStaffForm);
        var password = (fd.get("password") || "").toString();
        var confirm = (fd.get("passwordConfirm") || "").toString();
        if (password !== confirm) {
            addStaffError.textContent = t("admin.signupPasswordMismatch");
            addStaffError.classList.add("show");
            return;
        }

        var submitBtn = addStaffForm.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        var result = await provisionStaffAccount({
            name: (fd.get("name") || "").toString(),
            email: (fd.get("email") || "").toString(),
            phone: (fd.get("phone") || "").toString(),
            role: (fd.get("role") || "teacher").toString(),
            password: password,
        });
        submitBtn.disabled = false;

        if (result.ok) {
            /* An existing login isn't an error — say which of the two things
               actually happened so the admin knows whether to send a password. */
            toast(t(result.accountCreated ? "team.staffCreatedToast" : "team.staffLinkedToast"));
            addStaffForm.reset();
            addStaffDetails.open = false;
            renderTeamPanel();
        } else {
            var key = result.code === "auth/weak-password" ? "admin.signupWeakPassword"
                : result.code === "auth/invalid-email" ? "team.staffBadEmail"
                : result.code === "missing_fields" ? "team.staffMissingFields"
                : "admin.savingFailedToast";
            addStaffError.textContent = t(key);
            addStaffError.classList.add("show");
        }
    });
}
