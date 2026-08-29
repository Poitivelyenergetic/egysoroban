import { t } from "./i18n.js";
import { toast } from "./toast.js";
import { auth } from "./firebase-init.js";
import { state } from "./state.js";
import { ROLE_DEVELOPER, listAdmins, addAdmin, setAdminRole, removeAdminDoc, migrateLegacyDeveloperRole } from "./roles.js";
import { showLoadingRow } from "./loading-row.js";

var tableBody = document.getElementById("admins-table-body");
var addForm = document.getElementById("add-admin-form");
var addEmailInput = document.getElementById("add-admin-email");
var admins = [];

export async function renderManagePanel() {
    if (!tableBody) return;
    showLoadingRow(tableBody, 3, t("admin.loading"));
    /* Quietly finish the superadmin -> developer rename in Firestore. A
       developer is the only role the rules let write admins/, and the only one
       who can open this panel, so this is the one place it can run. Idempotent
       and writes nothing once every document has been migrated. */
    if (state.role === ROLE_DEVELOPER) await migrateLegacyDeveloperRole();
    admins = await listAdmins();
    var isDeveloper = state.role === ROLE_DEVELOPER;
    var developerCount = admins.filter(function (a) { return a.role === ROLE_DEVELOPER; }).length;
    var myEmail = (auth.currentUser && auth.currentUser.email || "").toLowerCase();

    tableBody.innerHTML = "";
    admins.forEach(function (admin) {
        var tr = document.createElement("tr");

        var tdEmail = document.createElement("td");
        tdEmail.textContent = admin.email;
        var tdRole = document.createElement("td");
        tdRole.textContent = admin.role === ROLE_DEVELOPER ? t("admin.roleDeveloper") : t("admin.roleAdmin");
        var tdActions = document.createElement("td");

        if (isDeveloper) {
            var isLastDeveloper = admin.role === ROLE_DEVELOPER && developerCount <= 1;

            var toggleBtn = document.createElement("button");
            toggleBtn.type = "button";
            toggleBtn.className = "btn btn-secondary btn-sm";
            toggleBtn.style.marginInlineEnd = "6px";
            toggleBtn.textContent = admin.role === ROLE_DEVELOPER ? t("admin.makeAdmin") : t("admin.makeDeveloper");
            toggleBtn.disabled = isLastDeveloper && admin.role === ROLE_DEVELOPER;
            toggleBtn.addEventListener("click", async function () {
                toggleBtn.disabled = true;
                var newRole = admin.role === ROLE_DEVELOPER ? "admin" : ROLE_DEVELOPER;
                var result = await setAdminRole(admin.email, newRole);
                if (result.ok) {
                    toast(t("admin.savedToast"));
                    renderManagePanel();
                } else {
                    toggleBtn.disabled = false;
                    toast(t("admin.savingFailedToast"));
                }
            });

            var removeBtn = document.createElement("button");
            removeBtn.type = "button";
            removeBtn.className = "btn btn-secondary btn-sm";
            removeBtn.textContent = t("admin.removeAdmin");
            removeBtn.disabled = isLastDeveloper;
            removeBtn.addEventListener("click", async function () {
                if (admin.email === myEmail && !window.confirm(admin.email)) return;
                removeBtn.disabled = true;
                var result = await removeAdminDoc(admin.email);
                if (result.ok) {
                    toast(t("admin.deletedToast"));
                    renderManagePanel();
                } else {
                    removeBtn.disabled = false;
                    toast(t("admin.savingFailedToast"));
                }
            });

            tdActions.appendChild(toggleBtn);
            tdActions.appendChild(removeBtn);
            if (isLastDeveloper) {
                var hint = document.createElement("div");
                hint.className = "muted";
                hint.style.fontSize = "0.76rem";
                hint.style.marginTop = "4px";
                hint.textContent = t("admin.lastDeveloper");
                tdActions.appendChild(hint);
            }
        } else {
            tdActions.className = "muted";
            tdActions.textContent = t("admin.onlyDeveloperRemove");
        }

        tr.appendChild(tdEmail);
        tr.appendChild(tdRole);
        tr.appendChild(tdActions);
        tableBody.appendChild(tr);
    });
}

if (addForm) {
    addForm.addEventListener("submit", async function (e) {
        e.preventDefault();
        var email = (addEmailInput.value || "").trim();
        if (!email) return;
        var submitBtn = addForm.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        var result = await addAdmin(email, "admin");
        submitBtn.disabled = false;
        if (result.ok) {
            toast(t("admin.addedToast"));
            addForm.reset();
            renderManagePanel();
        } else {
            toast(t("admin.savingFailedToast"));
        }
    });
}
