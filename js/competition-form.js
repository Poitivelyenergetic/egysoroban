import { t } from "./i18n.js";
import { addCompetitionRegistration } from "./competition-registrations.js";

var form = document.getElementById("competition-form");
var formStatus = document.getElementById("form-status");

function clearFormErrors() {
    form.querySelectorAll(".field.has-error").forEach(function (f) { f.classList.remove("has-error"); });
}
function markFieldError(input) {
    var field = input.closest(".field");
    if (field) field.classList.add("has-error");
}
function validateForm(fd) {
    var required = ["competition", "studentName", "parentName", "phone"];
    var firstInvalid = null;
    required.forEach(function (name) {
        var input = form.querySelector('[name="' + name + '"]');
        var val = (fd.get(name) || "").toString().trim();
        if (!val) { markFieldError(input); if (!firstInvalid) firstInvalid = input; }
    });
    var emailInput = form.querySelector('[name="email"]');
    var emailVal = (fd.get("email") || "").toString().trim();
    if (emailVal && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) {
        markFieldError(emailInput);
        if (!firstInvalid) firstInvalid = emailInput;
    }
    var nationalIdInput = form.querySelector('[name="nationalId"]');
    var nationalIdVal = (fd.get("nationalId") || "").toString().trim();
    if (nationalIdVal && !/^[23]\d{13}$/.test(nationalIdVal)) {
        markFieldError(nationalIdInput);
        if (!firstInvalid) firstInvalid = nationalIdInput;
    }
    return firstInvalid;
}

if (form) {
    form.addEventListener("submit", async function (e) {
        e.preventDefault();
        clearFormErrors();
        formStatus.className = "form-status";
        formStatus.innerHTML = "";

        var fd = new FormData(form);
        var invalid = validateForm(fd);
        if (invalid) { invalid.focus(); return; }

        var reg = {
            competition: (fd.get("competition") || "").toString(),
            studentName: (fd.get("studentName") || "").toString().trim(),
            nationalId: (fd.get("nationalId") || "").toString().trim(),
            parentName: (fd.get("parentName") || "").toString().trim(),
            phone: (fd.get("phone") || "").toString().trim(),
            email: (fd.get("email") || "").toString().trim(),
            notes: (fd.get("notes") || "").toString().trim(),
            status: "new",
            submittedAt: new Date().toISOString(),
        };

        var submitBtn = document.getElementById("competition-submit");
        var originalLabel = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = t("apply.submitting");

        var result = await addCompetitionRegistration(reg);

        submitBtn.disabled = false;
        submitBtn.textContent = originalLabel;

        if (result.ok) {
            formStatus.className = "form-status show ok";
            formStatus.textContent = t("comp.successMsg");
            form.reset();
        } else {
            formStatus.className = "form-status show warn";
            formStatus.textContent = t("comp.errorMsg");
        }
    });
}
