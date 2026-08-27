import { t, fmtDate } from "./i18n.js";
import { toast } from "./toast.js";
import { loadTeacherApplications, approveTeacherApplication, rejectTeacherApplication } from "./teacher-applications.js";

var tableBody = document.getElementById("teacher-table-body");
var teacherApps = [];

function statusLabel(status) {
    if (status === "approved") return t("teacher.statusApproved");
    if (status === "rejected") return t("teacher.statusRejected");
    return t("teacher.statusNew");
}

export async function renderTeachersPanel() {
    if (!tableBody) return;
    teacherApps = await loadTeacherApplications();
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
