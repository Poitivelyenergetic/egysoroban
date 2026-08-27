import { t } from "./i18n.js";
import { toast } from "./toast.js";
import { auth } from "./firebase-init.js";
import { state } from "./state.js";
import { ROLE_SUPERADMIN, listAdmins, addAdmin, setAdminRole, removeAdminDoc } from "./roles.js";

var tableBody = document.getElementById("admins-table-body");
var addForm = document.getElementById("add-admin-form");
var addEmailInput = document.getElementById("add-admin-email");
var admins = [];

export async function renderManagePanel() {
    if (!tableBody) return;
    admins = await listAdmins();
    var isSuperAdmin = state.role === ROLE_SUPERADMIN;
    var superAdminCount = admins.filter(function (a) { return a.role === ROLE_SUPERADMIN; }).length;
    var myEmail = (auth.currentUser && auth.currentUser.email || "").toLowerCase();

    tableBody.innerHTML = "";
    admins.forEach(function (admin) {
        var tr = document.createElement("tr");

        var tdEmail = document.createElement("td");
        tdEmail.textContent = admin.email;
        var tdRole = document.createElement("td");
        tdRole.textContent = admin.role === ROLE_SUPERADMIN ? t("admin.roleSuperadmin") : t("admin.roleAdmin");
        var tdActions = document.createElement("td");

        if (isSuperAdmin) {
            var isLastSuperAdmin = admin.role === ROLE_SUPERADMIN && superAdminCount <= 1;

            var toggleBtn = document.createElement("button");
            toggleBtn.type = "button";
            toggleBtn.className = "btn btn-secondary btn-sm";
            toggleBtn.style.marginInlineEnd = "6px";
            toggleBtn.textContent = admin.role === ROLE_SUPERADMIN ? t("admin.makeAdmin") : t("admin.makeSuperadmin");
            toggleBtn.disabled = isLastSuperAdmin && admin.role === ROLE_SUPERADMIN;
            toggleBtn.addEventListener("click", async function () {
                toggleBtn.disabled = true;
                var newRole = admin.role === ROLE_SUPERADMIN ? "admin" : ROLE_SUPERADMIN;
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
            removeBtn.disabled = isLastSuperAdmin;
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
            if (isLastSuperAdmin) {
                var hint = document.createElement("div");
                hint.className = "muted";
                hint.style.fontSize = "0.76rem";
                hint.style.marginTop = "4px";
                hint.textContent = t("admin.lastSuperadmin");
                tdActions.appendChild(hint);
            }
        } else {
            tdActions.className = "muted";
            tdActions.textContent = t("admin.onlySuperadminRemove");
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
