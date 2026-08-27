import { t, fmtDate } from "./i18n.js";
import { toast } from "./toast.js";
import {
    loadTeacherApplications, approveTeacherApplication, rejectTeacherApplication,
    loadStaffSignups, approveStaffSignup,
} from "./teacher-applications.js";

var tableBody = document.getElementById("teacher-table-body");
var teacherApps = [];

function statusLabel(status) {
    if (status === "approved") return t("teacher.statusApproved");
    if (status === "rejected") return t("teacher.statusRejected");
    return t("teacher.statusNew");
}

export async function renderTeachersPanel() {
    if (!tableBody) return;
    var apps = await loadTeacherApplications();
    var signups = await loadStaffSignups();
    var appEmails = {};
    apps.forEach(function (a) { appEmails[(a.email || "").toLowerCase()] = true; });
    signups = signups.filter(function (s) { return !appEmails[s.email]; });
    teacherApps = apps.concat(signups);
    tableBody.innerHTML = "";

    if (teacherApps.length === 0) {
        var tr = document.createElement("tr");
        tr.className = "empty-row";
        var td = document.createElement("td");
        td.colSpan = 5;
        td.textContent = t("admin.emptyList");
        tr.appendChild(td);
        tableBody.appendChild(tr);
        return;
    }

    teacherApps.forEach(function (app) {
        var tr = document.createElement("tr");

        var tdName = document.createElement("td");
        tdName.textContent = app.name || t("detail.none");
        var tdEmail = document.createElement("td");
        tdEmail.textContent = app.email || t("detail.none");
        var tdPhone = document.createElement("td");
        tdPhone.textContent = app.phone || t("detail.none");
        var tdDate = document.createElement("td");
        tdDate.className = "muted";
        tdDate.textContent = fmtDate(app.submittedAt);
        var tdStatus = document.createElement("td");

        if (app.status === "approved" || app.status === "rejected") {
            var pill = document.createElement("span");
            pill.className = "status-pill " + (app.status === "approved" ? "enrolled" : "declined");
            pill.textContent = statusLabel(app.status);
            tdStatus.appendChild(pill);
        } else if (app.isSignup) {
            var signupPill = document.createElement("span");
            signupPill.className = "status-pill new";
            signupPill.textContent = t("teacher.statusSignup");
            signupPill.style.marginInlineEnd = "6px";
            var approveSignupBtn = document.createElement("button");
            approveSignupBtn.type = "button";
            approveSignupBtn.className = "btn btn-jade btn-sm";
            approveSignupBtn.textContent = t("admin.approve");
            approveSignupBtn.addEventListener("click", async function (e) {
                e.stopPropagation();
                approveSignupBtn.disabled = true;
                var result = await approveStaffSignup(app.email);
                if (result.ok) {
                    toast(t("admin.savedToast"));
                    renderTeachersPanel();
                } else {
                    approveSignupBtn.disabled = false;
                    toast(t("admin.savingFailedToast"));
                }
            });
            tdStatus.appendChild(signupPill);
            tdStatus.appendChild(approveSignupBtn);
        } else {
            var approveBtn = document.createElement("button");
            approveBtn.type = "button";
            approveBtn.className = "btn btn-jade btn-sm";
            approveBtn.textContent = t("admin.approve");
            approveBtn.style.marginInlineEnd = "6px";
            approveBtn.addEventListener("click", async function (e) {
                e.stopPropagation();
                approveBtn.disabled = true;
                var result = await approveTeacherApplication(app.id, app.email);
                if (result.ok) {
                    toast(t("admin.savedToast"));
                    renderTeachersPanel();
                } else {
                    approveBtn.disabled = false;
                    toast(t("admin.savingFailedToast"));
                }
            });
            var rejectBtn = document.createElement("button");
            rejectBtn.type = "button";
            rejectBtn.className = "btn btn-secondary btn-sm";
            rejectBtn.textContent = t("admin.reject");
            rejectBtn.addEventListener("click", async function (e) {
                e.stopPropagation();
                rejectBtn.disabled = true;
                var result = await rejectTeacherApplication(app.id);
                if (result.ok) {
                    toast(t("admin.savedToast"));
                    renderTeachersPanel();
                } else {
                    rejectBtn.disabled = false;
                    toast(t("admin.savingFailedToast"));
                }
            });
            tdStatus.appendChild(approveBtn);
            tdStatus.appendChild(rejectBtn);
        }

        tr.appendChild(tdName);
        tr.appendChild(tdEmail);
        tr.appendChild(tdPhone);
        tr.appendChild(tdDate);
        tr.appendChild(tdStatus);
        tableBody.appendChild(tr);
    });
}
