import { t } from "./i18n.js";
import { toast } from "./toast.js";
import { loadAllSlots, addSlot, deleteSlot } from "./trial-slots.js";
import { showLoadingRow } from "./loading-row.js";

var tableBody = document.getElementById("slots-table-body");
var addForm = document.getElementById("add-slot-form");
var branchLabels = {
    mansoura: "Mansoura", talkha: "Talkha", toril: "Toril – Baby Inn",
    "gzert-elward": "Gzert-Elward Sport Club", "glow-international": "Glow International",
    shoha: "Shoha Branch", online: "Online",
};

function fmtSlotDate(iso) {
    if (!iso) return "—";
    var d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export async function renderSlotsPanel() {
    if (!tableBody) return;
    showLoadingRow(tableBody, 4, t("admin.loading"));
    var slots = await loadAllSlots();
    tableBody.innerHTML = "";

    if (slots.length === 0) {
        var tr = document.createElement("tr");
        tr.className = "empty-row";
        var td = document.createElement("td");
        td.colSpan = 4;
        td.textContent = t("admin.emptySlots");
        tr.appendChild(td);
        tableBody.appendChild(tr);
        return;
    }

    slots.forEach(function (s) {
        var tr = document.createElement("tr");
        var tdBranch = document.createElement("td");
        tdBranch.textContent = branchLabels[s.branch] || s.branch || "—";
        var tdWhen = document.createElement("td");
        tdWhen.className = "muted";
        tdWhen.textContent = fmtSlotDate(s.dateTime);
        var tdCap = document.createElement("td");
        tdCap.textContent = (s.bookedCount || 0) + " / " + (s.capacity || 0);
        var tdActions = document.createElement("td");
        var removeBtn = document.createElement("button");
        removeBtn.type = "button";
        removeBtn.className = "btn btn-secondary btn-sm";
        removeBtn.textContent = t("admin.removeSlotBtn");
        removeBtn.addEventListener("click", async function () {
            removeBtn.disabled = true;
            var result = await deleteSlot(s.id);
            if (result.ok) {
                toast(t("admin.deletedToast"));
                renderSlotsPanel();
            } else {
                removeBtn.disabled = false;
                toast(t("admin.savingFailedToast"));
            }
        });
        tdActions.appendChild(removeBtn);

        tr.appendChild(tdBranch);
        tr.appendChild(tdWhen);
        tr.appendChild(tdCap);
        tr.appendChild(tdActions);
        tableBody.appendChild(tr);
    });
}

if (addForm) {
    addForm.addEventListener("submit", async function (e) {
        e.preventDefault();
        var fd = new FormData(addForm);
        var branch = (fd.get("branch") || "").toString();
        var dateTimeLocal = (fd.get("dateTime") || "").toString();
        var capacity = Number(fd.get("capacity")) || 1;
        if (!branch || !dateTimeLocal) return;
        var iso = new Date(dateTimeLocal).toISOString();
        var submitBtn = addForm.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        var result = await addSlot({ branch: branch, dateTime: iso, capacity: capacity });
        submitBtn.disabled = false;
        if (result.ok) {
            toast(t("admin.addedToast"));
            addForm.reset();
            renderSlotsPanel();
        } else {
            toast(t("admin.savingFailedToast"));
        }
    });
}
