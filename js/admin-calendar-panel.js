import { t } from "./i18n.js";
import { state } from "./state.js";
import { toast } from "./toast.js";
import { loadClasses, addClass, updateClass, deleteClass } from "./classes.js";
import { loadAllSlots } from "./trial-slots.js";
import { listApprovedTeachers, isAdminRole } from "./roles.js";
import { BRANCHES, branchLabel } from "./branches.js";
import { auth } from "./firebase-init.js";

var detailOverlay = document.getElementById("detail-overlay");
var detailCard = document.getElementById("detail-card");
var teacherList = [];

var gridEl = document.getElementById("calendar-grid");
var addForm = document.getElementById("add-class-form");
var addDetails = document.getElementById("add-class");
var teacherSelect = addForm ? addForm.querySelector('[name="teacherEmail"]') : null;
var mineOnlyToggle = document.getElementById("calendar-mine-only");
var slotsListEl = document.getElementById("calendar-trial-slots");

var teacherNameByEmail = {};

/* Day names come from the browser's own locale data keyed off a known Sunday,
   so the column headers read correctly in Arabic without a second word list. */
function dayNames(lang) {
    var names = [];
    for (var i = 0; i < 7; i++) {
        var d = new Date(Date.UTC(2024, 8, 1 + i)); // 2024-09-01 was a Sunday
        names.push(d.toLocaleDateString(lang === "ar" ? "ar-EG" : "en-GB", { weekday: "long", timeZone: "UTC" }));
    }
    return names;
}

function fmtTime(hhmm, lang) {
    if (!hhmm) return "—";
    var parts = String(hhmm).split(":");
    if (parts.length < 2) return hhmm;
    var d = new Date();
    d.setHours(Number(parts[0]) || 0, Number(parts[1]) || 0, 0, 0);
    try {
        return d.toLocaleTimeString(lang === "ar" ? "ar-EG" : "en-GB", { hour: "numeric", minute: "2-digit" });
    } catch (e) {
        return hhmm;
    }
}

function teacherLabel(email) {
    if (!email) return t("admin.teacherUnassigned");
    return teacherNameByEmail[email.toLowerCase()] || email;
}

function levelLabel(levelIndex) {
    var n = Number(levelIndex) || 0;
    if (!n) return "";
    return n >= 11 ? t("portal.levelGraduate") : t("portal.levelPrefix") + " " + n;
}

function renderTrialSlots(slots) {
    if (!slotsListEl) return;
    slotsListEl.innerHTML = "";
    var upcoming = slots
        .filter(function (s) { return s.dateTime && new Date(s.dateTime) >= new Date(); })
        .sort(function (a, b) { return (a.dateTime || "").localeCompare(b.dateTime || ""); })
        .slice(0, 6);

    if (!upcoming.length) {
        var none = document.createElement("p");
        none.className = "chart-empty";
        none.textContent = t("calendar.noTrialSlots");
        slotsListEl.appendChild(none);
        return;
    }
    upcoming.forEach(function (s) {
        var row = document.createElement("div");
        row.className = "trial-slot-row";
        var when = document.createElement("span");
        when.className = "trial-slot-when";
        when.textContent = new Date(s.dateTime).toLocaleString(state.lang === "ar" ? "ar-EG" : "en-GB", {
            weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
        });
        var where = document.createElement("span");
        where.className = "trial-slot-branch";
        where.textContent = branchLabel(s.branch);
        var cap = document.createElement("span");
        cap.className = "trial-slot-cap";
        cap.textContent = (s.bookedCount || 0) + " / " + (s.capacity || 0);
        row.appendChild(when);
        row.appendChild(where);
        row.appendChild(cap);
        slotsListEl.appendChild(row);
    });
}

export async function renderCalendarPanel() {
    if (!gridEl) return;
    var admin = isAdminRole(state.role);
    if (addDetails) addDetails.hidden = !admin;
    /* A teacher's view is always filtered to their own classes, so the toggle
       would be a control that does nothing — hide it rather than mislead. */
    if (mineOnlyToggle && mineOnlyToggle.parentElement) {
        mineOnlyToggle.parentElement.hidden = !admin;
    }

    gridEl.innerHTML = "";
    var loading = document.createElement("p");
    loading.className = "chart-empty";
    loading.textContent = t("admin.loading");
    gridEl.appendChild(loading);

    var classes = await loadClasses();
    var teachers = await listApprovedTeachers();
    teacherNameByEmail = {};
    teachers.forEach(function (te) { teacherNameByEmail[te.email.toLowerCase()] = te.name || ""; });
    teacherList = teachers;

    if (admin && teacherSelect) {
        teacherSelect.innerHTML = "";
        var noneOpt = document.createElement("option");
        noneOpt.value = "";
        noneOpt.textContent = t("admin.teacherUnassigned");
        teacherSelect.appendChild(noneOpt);
        teachers.forEach(function (te) {
            var opt = document.createElement("option");
            opt.value = te.email;
            opt.textContent = te.name ? te.name + " (" + te.email + ")" : te.email;
            teacherSelect.appendChild(opt);
        });
    }

    var myEmail = (auth.currentUser && auth.currentUser.email || "").toLowerCase();
    /* Teachers only ever see their own timetable; admins can narrow to theirs. */
    var mineOnly = !admin || (mineOnlyToggle && mineOnlyToggle.checked);
    var visible = mineOnly
        ? classes.filter(function (c) { return (c.teacherEmail || "").toLowerCase() === myEmail; })
        : classes;

    var names = dayNames(state.lang);
    gridEl.innerHTML = "";
    for (var day = 0; day < 7; day++) {
        var col = document.createElement("div");
        col.className = "calendar-day";

        var head = document.createElement("div");
        head.className = "calendar-day-head";
        head.textContent = names[day];
        col.appendChild(head);

        var todays = visible.filter(function (c) { return Number(c.dayOfWeek) === day; });
        if (!todays.length) {
            var empty = document.createElement("div");
            empty.className = "calendar-empty";
            empty.textContent = "—";
            col.appendChild(empty);
        }
        todays.forEach(function (c) {
            var card = document.createElement("div");
            card.className = "class-card";

            var time = document.createElement("div");
            time.className = "class-card-time";
            time.textContent = fmtTime(c.startTime, state.lang) + " · " + (c.durationMins || 60) + t("calendar.minsShort");
            card.appendChild(time);

            var title = document.createElement("div");
            title.className = "class-card-title";
            title.textContent = levelLabel(c.levelIndex) || t("calendar.classFallbackTitle");
            card.appendChild(title);

            var meta = document.createElement("div");
            meta.className = "class-card-meta";
            meta.textContent = teacherLabel(c.teacherEmail);
            card.appendChild(meta);

            var where = document.createElement("div");
            where.className = "class-card-meta";
            where.textContent = branchLabel(c.branch);
            card.appendChild(where);

            if (admin) {
                var edit = document.createElement("button");
                edit.type = "button";
                edit.className = "class-card-edit";
                edit.textContent = t("calendar.editBtn");
                edit.addEventListener("click", function () { openClassDetail(c); });
                card.appendChild(edit);

                var del = document.createElement("button");
                del.type = "button";
                del.className = "class-card-remove";
                del.textContent = t("admin.removeSlotBtn");
                del.addEventListener("click", async function () {
                    del.disabled = true;
                    var result = await deleteClass(c.id);
                    if (result.ok) {
                        toast(t("admin.deletedToast"));
                        renderCalendarPanel();
                    } else {
                        del.disabled = false;
                        toast(t("admin.savingFailedToast"));
                    }
                });
                card.appendChild(del);
            }
            col.appendChild(card);
        });
        gridEl.appendChild(col);
    }

    renderTrialSlots(await loadAllSlots());
}

if (mineOnlyToggle) {
    mineOnlyToggle.addEventListener("change", function () { renderCalendarPanel(); });
}

if (addForm) {
    addForm.addEventListener("submit", async function (e) {
        e.preventDefault();
        var fd = new FormData(addForm);
        var branch = (fd.get("branch") || "").toString();
        var startTime = (fd.get("startTime") || "").toString();
        if (!branch || !startTime) return;
        var submitBtn = addForm.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        var result = await addClass({
            branch: branch,
            dayOfWeek: Number(fd.get("dayOfWeek")) || 0,
            startTime: startTime,
            durationMins: Number(fd.get("durationMins")) || 60,
            teacherEmail: (fd.get("teacherEmail") || "").toString().toLowerCase(),
            levelIndex: Number(fd.get("levelIndex")) || 1,
            capacity: Number(fd.get("capacity")) || 10,
        });
        submitBtn.disabled = false;
        if (result.ok) {
            toast(t("admin.addedToast"));
            addForm.reset();
            if (addDetails) addDetails.open = false;
            renderCalendarPanel();
        } else {
            toast(t("admin.savingFailedToast"));
        }
    });
}

/* Editing a class opens the shared detail overlay rather than an inline form —
   a day column is far too narrow to hold seven fields legibly. */
function fieldRow(labelText, control) {
    var wrap = document.createElement("div");
    wrap.className = "row";
    var k = document.createElement("div");
    k.className = "k";
    k.textContent = labelText;
    wrap.appendChild(k);
    wrap.appendChild(control);
    return wrap;
}

function selectFrom(options, current) {
    var sel = document.createElement("select");
    options.forEach(function (o) {
        var opt = document.createElement("option");
        opt.value = String(o.value);
        opt.textContent = o.label;
        if (String(current) === String(o.value)) opt.selected = true;
        sel.appendChild(opt);
    });
    return sel;
}

export function openClassDetail(c) {
    if (!detailCard || !detailOverlay) return;
    detailCard.innerHTML = "";
    detailCard.dataset.kind = "class";

    var head = document.createElement("div");
    head.className = "detail-head";
    var h3 = document.createElement("h3");
    h3.textContent = t("calendar.editClassTitle");
    var closeBtn = document.createElement("button");
    closeBtn.className = "icon-btn";
    closeBtn.type = "button";
    closeBtn.setAttribute("aria-label", t("detail.close"));
    closeBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>';
    closeBtn.addEventListener("click", function () { detailOverlay.hidden = true; detailCard.innerHTML = ""; });
    head.appendChild(h3);
    head.appendChild(closeBtn);
    detailCard.appendChild(head);

    var rows = document.createElement("div");
    rows.className = "detail-rows";

    var names = dayNames(state.lang);
    var daySel = selectFrom(names.map(function (n, i) { return { value: i, label: n }; }), Number(c.dayOfWeek) || 0);
    rows.appendChild(fieldRow(t("calendar.fDay"), daySel));

    var timeInput = document.createElement("input");
    timeInput.type = "time";
    timeInput.value = c.startTime || "";
    rows.appendChild(fieldRow(t("calendar.fStartTime"), timeInput));

    var durInput = document.createElement("input");
    durInput.type = "number";
    durInput.min = "15";
    durInput.step = "5";
    durInput.value = Number(c.durationMins) || 60;
    rows.appendChild(fieldRow(t("calendar.fDuration"), durInput));

    var branchSel = selectFrom(BRANCHES.map(function (b) { return { value: b.id, label: b.label }; }), c.branch);
    rows.appendChild(fieldRow(t("calendar.fBranch"), branchSel));

    var teacherOpts = [{ value: "", label: t("admin.teacherUnassigned") }].concat(
        teacherList.map(function (te) {
            return { value: te.email, label: te.name ? te.name + " (" + te.email + ")" : te.email };
        }));
    var teacherSel = selectFrom(teacherOpts, (c.teacherEmail || "").toLowerCase());
    rows.appendChild(fieldRow(t("calendar.fTeacher"), teacherSel));

    var levelInput = document.createElement("input");
    levelInput.type = "number";
    levelInput.min = "1";
    levelInput.max = "11";
    levelInput.value = Number(c.levelIndex) || 1;
    rows.appendChild(fieldRow(t("calendar.fLevel"), levelInput));

    var capInput = document.createElement("input");
    capInput.type = "number";
    capInput.min = "1";
    capInput.value = Number(c.capacity) || 10;
    rows.appendChild(fieldRow(t("calendar.fCapacity"), capInput));

    detailCard.appendChild(rows);

    var actions = document.createElement("div");
    actions.className = "detail-actions";

    var saveBtn = document.createElement("button");
    saveBtn.type = "button";
    saveBtn.className = "btn btn-jade";
    saveBtn.textContent = t("detail.save");
    saveBtn.addEventListener("click", async function () {
        saveBtn.disabled = true;
        var result = await updateClass(c.id, {
            dayOfWeek: Number(daySel.value) || 0,
            startTime: timeInput.value,
            durationMins: Number(durInput.value) || 60,
            branch: branchSel.value,
            teacherEmail: teacherSel.value,
            levelIndex: Number(levelInput.value) || 1,
            capacity: Number(capInput.value) || 10,
        });
        saveBtn.disabled = false;
        if (result.ok) {
            toast(t("admin.savedToast"));
            detailOverlay.hidden = true;
            detailCard.innerHTML = "";
            renderCalendarPanel();
        } else {
            toast(t("admin.savingFailedToast"));
        }
    });
    actions.appendChild(saveBtn);
    detailCard.appendChild(actions);

    detailOverlay.hidden = false;
}
