import { t, fmtDate } from "./i18n.js";
import { toast } from "./toast.js";
import { loadCompetitionRegistrations, updateCompetitionRegistration, deleteCompetitionRegistration } from "./competition-registrations.js";
import { showLoadingRow } from "./loading-row.js";

var tableBody = document.getElementById("competition-table-body");
var filterSelect = document.getElementById("competition-filter-status");
var detailOverlay = document.getElementById("detail-overlay");
var detailCard = document.getElementById("detail-card");
var regs = [];
var deletePending = null;

var competitionLabels = {
    "summer-2026": "comp.optSummer", "wapr-2026": "comp.optWapr", "other": "apply.optOther",
};
function competitionLabel(value) {
    var key = competitionLabels[value];
    return key ? t(key) : (value || t("detail.none"));
}
function statusLabel(status) {
    var key = "admin.status" + (status ? status.charAt(0).toUpperCase() + status.slice(1) : "New");
    return t(key);
}

export async function renderCompetitionPanel() {
    if (!tableBody) return;
    showLoadingRow(tableBody, 5, t("admin.loading"));
    var all = await loadCompetitionRegistrations();
    var statusFilter = filterSelect ? filterSelect.value : "";
    regs = statusFilter ? all.filter(function (r) { return (r.status || "new") === statusFilter; }) : all;
    tableBody.innerHTML = "";

    if (all.length === 0) {
        var tr = document.createElement("tr");
        tr.className = "empty-row";
        var td = document.createElement("td");
        td.colSpan = 5;
        td.textContent = t("admin.emptyCompetition");
        tr.appendChild(td);
        tableBody.appendChild(tr);
        return;
    }
    if (regs.length === 0) {
        var tr2 = document.createElement("tr");
        tr2.className = "empty-row";
        var td2 = document.createElement("td");
        td2.colSpan = 5;
        td2.textContent = t("admin.noResults");
        tr2.appendChild(td2);
        tableBody.appendChild(tr2);
        return;
    }

    regs.forEach(function (r) {
        var tr = document.createElement("tr");
        tr.addEventListener("click", function () { openDetail(r.id); });

        var tdStudent = document.createElement("td");
        tdStudent.textContent = r.studentName || t("detail.none");
        var tdComp = document.createElement("td");
        tdComp.textContent = competitionLabel(r.competition);
        var tdPhone = document.createElement("td");
        tdPhone.className = "muted";
        tdPhone.textContent = r.phone || t("detail.none");
        var tdDate = document.createElement("td");
        tdDate.className = "muted";
        tdDate.textContent = fmtDate(r.submittedAt);
        var tdStatus = document.createElement("td");
        var pill = document.createElement("span");
        pill.className = "status-pill " + (r.status || "new");
        pill.textContent = statusLabel(r.status || "new");
        tdStatus.appendChild(pill);

        tr.appendChild(tdStudent);
        tr.appendChild(tdComp);
        tr.appendChild(tdPhone);
        tr.appendChild(tdDate);
        tr.appendChild(tdStatus);
        tableBody.appendChild(tr);
    });
}
if (filterSelect) filterSelect.addEventListener("change", renderCompetitionPanel);

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

function openDetail(id) {
    var r = regs.find(function (x) { return x.id === id; });
    if (!r) return;
    deletePending = null;
    detailCard.innerHTML = "";

    var head = document.createElement("div");
    head.className = "detail-head";
    var h3 = document.createElement("h3");
    h3.textContent = r.studentName || t("detail.title");
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
    meta.textContent = t("detail.submitted") + ": " + fmtDate(r.submittedAt);
    detailCard.appendChild(meta);

    var rows = document.createElement("div");
    rows.className = "detail-rows";
    rows.appendChild(detailRow(t("comp.fCompetition"), competitionLabel(r.competition)));
    rows.appendChild(detailRow(t("apply.fNationalId"), r.nationalId));
    rows.appendChild(detailRow(t("apply.fParentName"), r.parentName));
    rows.appendChild(detailRow(t("apply.fPhone"), r.phone));
    rows.appendChild(detailRow(t("apply.fEmail"), r.email));
    var notesRow = detailRow(t("detail.goals"), r.notes);
    notesRow.classList.add("full");
    rows.appendChild(notesRow);
    detailCard.appendChild(rows);

    var actions = document.createElement("div");
    actions.className = "detail-actions";

    var statusSelect = document.createElement("select");
    ["new", "contacted", "enrolled", "declined"].forEach(function (s) {
        var opt = document.createElement("option");
        opt.value = s;
        opt.textContent = statusLabel(s);
        if ((r.status || "new") === s) opt.selected = true;
        statusSelect.appendChild(opt);
    });
    actions.appendChild(statusSelect);

    var saveBtn = document.createElement("button");
    saveBtn.type = "button";
    saveBtn.className = "btn btn-jade";
    saveBtn.textContent = t("detail.save");
    saveBtn.addEventListener("click", async function () {
        saveBtn.disabled = true;
        var result = await updateCompetitionRegistration(r.id, { status: statusSelect.value });
        saveBtn.disabled = false;
        if (result.ok) {
            toast(t("admin.savedToast"));
            renderCompetitionPanel();
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
        if (deletePending !== r.id) {
            deletePending = r.id;
            deleteBtn.textContent = t("admin.confirmDelete");
            return;
        }
        deleteBtn.disabled = true;
        var result = await deleteCompetitionRegistration(r.id);
        deleteBtn.disabled = false;
        if (result.ok) {
            toast(t("admin.deletedToast"));
            renderCompetitionPanel();
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
