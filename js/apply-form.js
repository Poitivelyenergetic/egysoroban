import { state } from "./state.js";
import { t } from "./i18n.js";
import { addApplicationDoc } from "./applications.js";
import { loadOpenSlots, bookSlot } from "./trial-slots.js";

var ADMIN_EMAIL = "info@egysoroban.com";

function buildMailto(app, to, subjectPrefix) {
    var subject = (subjectPrefix || "New Egysoroban application — ") + (app.studentNameEn || app.studentName || "");
    var lines = [
        "Branch: " + (app.branch || "—"),
        "Student name (Arabic): " + (app.studentNameAr || "—"),
        "Student name (English): " + (app.studentNameEn || app.studentName || "—"),
        "Date of birth: " + (app.dob || "—"),
        "National ID: " + (app.nationalId || "—"),
        "Gender: " + (app.gender || "—"),
        "Religion: " + (app.religion || "—"),
        "Nationality: " + (app.nationality || "—"),
        "Grade: " + (app.grade || "—"),
        "Parent/guardian: " + (app.parentName || "—"),
        "Relationship: " + (app.relationship || "—"),
        "Phone: " + (app.phone || "—"),
        "Email: " + (app.email || "—"),
        "Guardian occupation: " + (app.occupation || "—"),
        "Address: " + (app.address || "—"),
        "Governorate: " + (app.governorate || "—"),
        "City: " + (app.city || "—"),
        "School: " + (app.schoolName || "—") + " (" + (app.schoolType || "—") + ")",
        "Preferred level: " + (app.program || "—"),
        "Prior experience: " + (app.experience || "—"),
        "Hobbies: " + (app.hobbies || "—"),
        "Medical notes: " + (app.medical || "—"),
        "Dietary requirements: " + (app.dietary || "—"),
        "Heard about us via: " + (app.heard || "—"),
        "Goals / notes: " + (app.goals || "—"),
    ];
    return "mailto:" + (to || ADMIN_EMAIL) + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(lines.join("\n"));
}

var applyForm = document.getElementById("apply-form");
var formStatus = document.getElementById("form-status");
var branchSelect = document.getElementById("f-branch");
var trialSlotList = document.getElementById("trial-slot-list");

function fmtSlotDate(iso) {
    var d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

async function renderTrialSlots() {
    if (!trialSlotList) return;
    var branch = branchSelect.value;
    trialSlotList.innerHTML = "";
    if (!branch) {
        var hint = document.createElement("p");
        hint.className = "muted";
        hint.textContent = t("apply.trialSlotHint");
        trialSlotList.appendChild(hint);
        return;
    }
    var open = await loadOpenSlots(branch);
    if (open.length === 0) {
        var none = document.createElement("p");
        none.className = "muted";
        none.textContent = t("apply.trialSlotNoneOpen");
        trialSlotList.appendChild(none);
        return;
    }
    open.forEach(function (slot) {
        var label = document.createElement("label");
        label.className = "trial-slot-option";
        var input = document.createElement("input");
        input.type = "radio";
        input.name = "trialSlotId";
        input.value = slot.id;
        input.dataset.dateTime = slot.dateTime;
        var text = document.createElement("span");
        text.textContent = fmtSlotDate(slot.dateTime);
        var spots = document.createElement("span");
        spots.className = "spots";
        spots.textContent = (slot.capacity - slot.bookedCount) + " left";
        label.appendChild(input);
        label.appendChild(text);
        label.appendChild(spots);
        trialSlotList.appendChild(label);
    });
}

if (branchSelect) {
    branchSelect.addEventListener("change", renderTrialSlots);
    renderTrialSlots();
}

function clearFormErrors() {
    applyForm.querySelectorAll(".field.has-error").forEach(function (f) { f.classList.remove("has-error"); });
}
function markFieldError(input) {
    var field = input.closest(".field");
    if (field) field.classList.add("has-error");
}
function validateForm(fd) {
    var required = [
        "branch", "studentNameAr", "studentNameEn", "dob", "gender", "religion",
        "parentName", "relationship", "phone", "email",
        "address", "governorate", "city", "schoolName", "schoolType", "grade",
    ];
    var firstInvalid = null;
    required.forEach(function (name) {
        var input = applyForm.querySelector('[name="' + name + '"]');
        var val = (fd.get(name) || "").toString().trim();
        if (!val) { markFieldError(input); if (!firstInvalid) firstInvalid = input; }
    });
    var emailInput = applyForm.querySelector('[name="email"]');
    var emailVal = (fd.get("email") || "").toString().trim();
    if (emailVal && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) {
        markFieldError(emailInput);
        if (!firstInvalid) firstInvalid = emailInput;
    }
    var nationalIdInput = applyForm.querySelector('[name="nationalId"]');
    var nationalIdVal = (fd.get("nationalId") || "").toString().trim();
    if (nationalIdVal && !/^[23]\d{13}$/.test(nationalIdVal)) {
        markFieldError(nationalIdInput);
        if (!firstInvalid) firstInvalid = nationalIdInput;
    }
    return firstInvalid;
}

if (applyForm) {
    applyForm.addEventListener("submit", async function (e) {
        e.preventDefault();
        clearFormErrors();
        formStatus.className = "form-status";
        formStatus.innerHTML = "";

        var fd = new FormData(applyForm);
        var invalid = validateForm(fd);
        if (invalid) { invalid.focus(); return; }

        var checkedSlot = applyForm.querySelector('input[name="trialSlotId"]:checked');
        if (checkedSlot) {
            var bookResult = await bookSlot(checkedSlot.value);
            if (!bookResult.ok) {
                formStatus.className = "form-status show warn";
                formStatus.textContent = t("apply.trialSlotFullError");
                await renderTrialSlots();
                return;
            }
        }

        var app = {
            branch: (fd.get("branch") || "").toString(),
            trialSlotId: checkedSlot ? checkedSlot.value : "",
            trialDateTime: checkedSlot ? checkedSlot.dataset.dateTime : "",
            studentNameAr: (fd.get("studentNameAr") || "").toString().trim(),
            studentNameEn: (fd.get("studentNameEn") || "").toString().trim(),
            studentName: (fd.get("studentNameEn") || "").toString().trim(),
            dob: (fd.get("dob") || "").toString(),
            nationalId: (fd.get("nationalId") || "").toString().trim(),
            gender: (fd.get("gender") || "").toString(),
            religion: (fd.get("religion") || "").toString(),
            nationality: (fd.get("nationality") || "").toString(),
            grade: (fd.get("grade") || "").toString().trim(),
            parentName: (fd.get("parentName") || "").toString().trim(),
            relationship: (fd.get("relationship") || "").toString(),
            phone: (fd.get("phone") || "").toString().trim(),
            email: (fd.get("email") || "").toString().trim(),
            occupation: (fd.get("occupation") || "").toString().trim(),
            address: (fd.get("address") || "").toString().trim(),
            governorate: (fd.get("governorate") || "").toString(),
            city: (fd.get("city") || "").toString().trim(),
            schoolName: (fd.get("schoolName") || "").toString().trim(),
            schoolType: (fd.get("schoolType") || "").toString(),
            program: (fd.get("program") || "").toString(),
            experience: (fd.get("experience") || "").toString().trim(),
            hobbies: (fd.get("hobbies") || "").toString().trim(),
            medical: (fd.get("medical") || "").toString().trim(),
            dietary: (fd.get("dietary") || "").toString().trim(),
            heard: (fd.get("heard") || "").toString(),
            goals: (fd.get("goals") || "").toString().trim(),
            status: "new",
            notes: "",
            source: "public",
            submittedAt: new Date().toISOString(),
        };

        var submitBtn = document.getElementById("apply-submit");
        var originalLabel = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = t("apply.submitting");

        var result = await addApplicationDoc(app);

        submitBtn.disabled = false;
        submitBtn.textContent = originalLabel;

        if (result.ok) {
            formStatus.className = "form-status show ok";
            formStatus.innerHTML = "";
            var okMsg = document.createElement("p");
            okMsg.style.margin = "0 0 10px";
            okMsg.textContent = t("apply.successOnline");
            formStatus.appendChild(okMsg);
            if (app.email) {
                var copyLink = document.createElement("a");
                copyLink.className = "btn btn-secondary btn-sm";
                copyLink.href = buildMailto(app, app.email, "Your Egysoroban application — ");
                copyLink.textContent = t("apply.emailCopyBtn");
                formStatus.appendChild(copyLink);
            }
            applyForm.reset();
        } else {
            formStatus.className = "form-status show warn";
            formStatus.innerHTML = "";
            var msg = document.createElement("p");
            msg.style.margin = "0 0 4px";
            msg.textContent = t("apply.fallbackMsg");
            var link = document.createElement("a");
            link.className = "btn btn-jade";
            link.href = buildMailto(app);
            link.textContent = t("apply.fallbackBtn");
            formStatus.appendChild(msg);
            formStatus.appendChild(link);
        }
    });
}
