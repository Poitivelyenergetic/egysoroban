import { t } from "./i18n.js";
import { state } from "./state.js";
import { toast } from "./toast.js";
import { loadClasses, addClass, updateClass, deleteClass } from "./classes.js";
import { loadAllSlots } from "./trial-slots.js";
import { listApprovedTeachers, isAdminRole } from "./roles.js";
import { BRANCHES, branchLabel } from "./branches.js";
import { auth } from "./firebase-init.js";
import {
    loadRooms, setRoomLive, setRoomLink, saveRoomForClass, syncRoomSchedule, deleteRoom, isDailyUrl, isLive,
} from "./class-rooms.js";
import { openClassroom } from "./classroom.js";
import { loadStudents, updateStudent } from "./student-records.js";

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
var roomsById = {};

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

    var loaded = await Promise.all([loadClasses(), loadRooms()]);
    var classes = loaded[0];
    roomsById = loaded[1];
    /* Firestore denies `list` on teachers/ to a teacher-only account, so
       fetching the whole directory here would always come back empty for
       them. They only ever see their own classes anyway — just label those
       with their own display name instead of round-tripping for nothing. */
    var myEmailEarly = (auth.currentUser && auth.currentUser.email || "").toLowerCase();
    var teachers = admin ? await listApprovedTeachers() : [];
    teacherNameByEmail = {};
    if (admin) {
        teachers.forEach(function (te) { teacherNameByEmail[te.email.toLowerCase()] = te.name || ""; });
    } else if (myEmailEarly) {
        teacherNameByEmail[myEmailEarly] = (auth.currentUser && auth.currentUser.displayName) || "";
    }
    teacherList = teachers;

    if (admin && teacherSelect) {
        teacherSelect.innerHTML = "";
        /* Every class has to belong to a teacher, so the empty entry is a
           disabled prompt rather than a selectable "Unassigned" — combined
           with `required` on the select, the form won't submit until a real
           teacher is picked. An unowned class would otherwise sit in the
           timetable counting toward nobody's workload in the Team panel. */
        var noneOpt = document.createElement("option");
        noneOpt.value = "";
        noneOpt.disabled = true;
        noneOpt.selected = true;
        noneOpt.textContent = t("calendar.pickTeacher");
        teacherSelect.appendChild(noneOpt);
        teachers.forEach(function (te) {
            var opt = document.createElement("option");
            opt.value = te.email;
            opt.textContent = te.name ? te.name + " (" + te.email + ")" : te.email;
            teacherSelect.appendChild(opt);
        });
    }

    var myEmail = myEmailEarly;
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

            /* Online room controls: an admin on any class, a teacher on their
               own (a teacher only ever sees their own, see `visible` above). */
            var room = roomsById[c.id] || null;
            var live = isLive(room);
            if (room && room.roomUrl) {
                var badges = document.createElement("div");
                badges.className = "class-card-badges";
                var badge = document.createElement("span");
                badge.className = "room-badge" + (live ? " is-live" : "");
                if (live) {
                    var dot = document.createElement("span");
                    dot.className = "live-dot";
                    dot.setAttribute("aria-hidden", "true");
                    badge.appendChild(dot);
                }
                badge.appendChild(document.createTextNode(t(live ? "room.badgeLive" : "room.badgeOnline")));
                badges.appendChild(badge);
                card.appendChild(badges);

                var goLive = document.createElement("button");
                goLive.type = "button";
                goLive.className = "class-card-golive";
                goLive.textContent = t(live ? "room.rejoinBtn" : "room.goLiveBtn");
                goLive.addEventListener("click", function () { startClass(c, room, goLive); });
                card.appendChild(goLive);
            }
            var roomBtn = document.createElement("button");
            roomBtn.type = "button";
            roomBtn.className = "class-card-room";
            roomBtn.textContent = t("room.manageBtn");
            roomBtn.addEventListener("click", function () { openRoomDialog(c); });
            card.appendChild(roomBtn);

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
                    if (result.ok && roomsById[c.id]) await deleteRoom(c.id);
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
        var teacherEmail = (fd.get("teacherEmail") || "").toString().toLowerCase();
        if (!branch || !startTime) return;
        /* `required` on the select already blocks this in the browser; the
           guard is here so the class can't be created without an owner if the
           form is ever submitted another way. */
        if (!teacherEmail) {
            toast(t("calendar.needTeacher"));
            if (teacherSelect) teacherSelect.focus();
            return;
        }
        var submitBtn = addForm.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        var result = await addClass({
            branch: branch,
            dayOfWeek: Number(fd.get("dayOfWeek")) || 0,
            startTime: startTime,
            durationMins: Number(fd.get("durationMins")) || 60,
            teacherEmail: teacherEmail,
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

    /* The blank entry only survives here so a class created before teachers
       were mandatory can still be opened and fixed — saving with it selected
       is refused below. */
    var teacherOpts = [{ value: "", label: t("calendar.pickTeacher") }].concat(
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
        /* Same rule on the way out as on the way in — a class can't be saved
           back into an unassigned state. */
        if (!teacherSel.value) {
            toast(t("calendar.needTeacher"));
            teacherSel.focus();
            return;
        }
        saveBtn.disabled = true;
        var fields = {
            dayOfWeek: Number(daySel.value) || 0,
            startTime: timeInput.value,
            durationMins: Number(durInput.value) || 60,
            branch: branchSel.value,
            teacherEmail: teacherSel.value,
            levelIndex: Number(levelInput.value) || 1,
            capacity: Number(capInput.value) || 10,
        };
        var result = await updateClass(c.id, fields);
        /* Families read the time from the room's own copy, so keep it in step. */
        if (result.ok && roomsById[c.id]) await syncRoomSchedule(Object.assign({ id: c.id }, fields));
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

/* ---------- Online classroom ---------- */

/* Going live is what lets families in outside the 10-minute early window and
   shows them "Live now". Leaving the room takes the class off air again. */
async function startClass(c, room, btn) {
    btn.disabled = true;
    var res = await setRoomLive(c.id, true);
    btn.disabled = false;
    if (!res.ok) { toast(t("admin.savingFailedToast")); return; }
    toast(t("room.liveToast"));
    openClassroom({
        url: room.roomUrl,
        title: (levelLabel(c.levelIndex) || t("calendar.classFallbackTitle")) + " · " + fmtTime(c.startTime, state.lang),
        leaveLabel: t("room.endBtn"),
        onLeave: async function () {
            var off = await setRoomLive(c.id, false);
            toast(off.ok ? t("room.endedToast") : t("admin.savingFailedToast"));
            renderCalendarPanel();
        },
    });
    renderCalendarPanel();
}

function closeDetail() { detailOverlay.hidden = true; detailCard.innerHTML = ""; }

/* One dialog for both roles. A teacher sets the link for their own class; an
   admin also ticks which students belong to it, which is what decides whose
   portal shows the Join button. */
export async function openRoomDialog(c) {
    if (!detailCard || !detailOverlay) return;
    var admin = isAdminRole(state.role);
    var room = roomsById[c.id] || {};
    detailCard.innerHTML = "";
    detailCard.dataset.kind = "room";

    var head = document.createElement("div");
    head.className = "detail-head";
    var h3 = document.createElement("h3");
    h3.textContent = t("room.dialogTitle") + " — " + (levelLabel(c.levelIndex) || t("calendar.classFallbackTitle"));
    var closeBtn = document.createElement("button");
    closeBtn.className = "icon-btn";
    closeBtn.type = "button";
    closeBtn.setAttribute("aria-label", t("detail.close"));
    closeBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>';
    closeBtn.addEventListener("click", closeDetail);
    head.appendChild(h3);
    head.appendChild(closeBtn);
    detailCard.appendChild(head);

    var rows = document.createElement("div");
    rows.className = "detail-rows";

    var linkWrap = document.createElement("div");
    var linkInput = document.createElement("input");
    linkInput.type = "url";
    linkInput.className = "room-link-input";
    linkInput.placeholder = "https://yourteam.daily.co/level-3";
    linkInput.value = room.roomUrl || "";
    linkInput.setAttribute("dir", "ltr");
    linkWrap.appendChild(linkInput);
    var linkHint = document.createElement("p");
    linkHint.className = "room-field-hint";
    linkHint.textContent = t("room.linkHint");
    linkWrap.appendChild(linkHint);
    var linkError = document.createElement("p");
    linkError.className = "room-field-error";
    linkError.hidden = true;
    linkError.textContent = t("room.linkInvalid");
    linkWrap.appendChild(linkError);
    var linkRow = fieldRow(t("room.linkLabel"), linkWrap);
    linkRow.querySelector(".k").id = "room-link-label";
    linkInput.setAttribute("aria-labelledby", "room-link-label");
    rows.appendChild(linkRow);

    var students = [];
    var members = null;
    if (admin) {
        members = document.createElement("div");
        members.className = "room-members";
        for (var i = 0; i < 3; i++) {
            var sk = document.createElement("span");
            sk.className = "skeleton skeleton-line";
            sk.style.height = "34px";
            members.appendChild(sk);
        }
        var membersWrap = document.createElement("div");
        var membersHint = document.createElement("p");
        membersHint.className = "room-field-hint";
        membersHint.textContent = t("room.membersHint");
        membersWrap.appendChild(members);
        membersWrap.appendChild(membersHint);
        rows.appendChild(fieldRow(t("room.membersLabel"), membersWrap));
    }
    detailCard.appendChild(rows);

    var actions = document.createElement("div");
    actions.className = "detail-actions";
    var saveBtn = document.createElement("button");
    saveBtn.type = "button";
    saveBtn.className = "btn btn-jade";
    saveBtn.textContent = t("detail.save");
    actions.appendChild(saveBtn);
    detailCard.appendChild(actions);
    detailOverlay.hidden = false;
    linkInput.focus();

    if (admin) {
        /* Saving before the roster arrives would read an empty list as "no one
           is in this class" — so Save waits for it. */
        saveBtn.disabled = true;
        students = await loadStudents();
        saveBtn.disabled = false;
        members.innerHTML = "";
        if (!students.length) {
            var none = document.createElement("p");
            none.className = "chart-empty";
            none.textContent = t("room.noStudents");
            members.appendChild(none);
        }
        /* This class's students first, then the class teacher's other
           students, then everyone else — the likely picks sit at the top. */
        var teacher = (c.teacherEmail || "").toLowerCase();
        var rank = function (s) {
            if (s.classId === c.id) return 0;
            if ((s.teacherEmail || "").toLowerCase() === teacher) return 1;
            return 2;
        };
        students.slice().sort(function (a, b) {
            return rank(a) - rank(b) || (a.name || "").localeCompare(b.name || "");
        }).forEach(function (s) {
            var label = document.createElement("label");
            label.className = "room-member";
            var box = document.createElement("input");
            box.type = "checkbox";
            box.value = s.id;
            box.checked = s.classId === c.id;
            label.appendChild(box);
            var name = document.createElement("span");
            name.textContent = s.name || t("detail.none");
            label.appendChild(name);
            var note = "";
            if (!s.parentEmail && !s.studentEmail) note = t("room.noEmailWarn");
            else if (s.classId && s.classId !== c.id) note = t("room.inOtherClass");
            if (note) {
                var noteEl = document.createElement("span");
                noteEl.className = "room-member-note";
                noteEl.textContent = note;
                label.appendChild(noteEl);
            }
            members.appendChild(label);
        });
    }

    saveBtn.addEventListener("click", async function () {
        var url = linkInput.value.trim();
        if (url && !isDailyUrl(url)) {
            linkError.hidden = false;
            linkInput.focus();
            return;
        }
        linkError.hidden = true;
        saveBtn.disabled = true;
        var result;
        if (admin) {
            var ids = Array.prototype.map.call(members.querySelectorAll("input:checked"), function (b) { return b.value; });
            result = await saveRoomForClass(c, {
                roomUrl: url, studentIds: ids,
                /* Families see the teacher's name, never their email. */
                teacherName: teacherNameByEmail[(c.teacherEmail || "").toLowerCase()] || "",
            }, students, updateStudent);
        } else {
            result = await setRoomLink(c.id, url);
        }
        saveBtn.disabled = false;
        if (result.ok) {
            toast(t("admin.savedToast"));
            closeDetail();
            renderCalendarPanel();
        } else {
            toast(t("admin.savingFailedToast"));
        }
    });
}
