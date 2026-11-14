import {
    collection, doc, getDoc, getDocs, setDoc, deleteDoc, updateDoc,
} from "./fs.js";
import { db } from "./firebase-init.js";
import { emailKey } from "./enrolled-emails.js";

/* classRooms/{classId} is the online half of a weekly class: the Daily room
   link, whether the teacher has it live, a copy of the schedule, and the
   salted email keys of the families allowed in. See firestore.rules for why it
   is its own document — classes/ stays staff-only. */
var COL = "classRooms";

/* The same shape the rules enforce, checked here first so a teacher gets a
   clear message instead of a bare "couldn't save". */
var DAILY_RE = /^https:\/\/[a-z0-9-]+\.daily\.co\/[A-Za-z0-9_-]+$/;
export function isDailyUrl(url) {
    return DAILY_RE.test(String(url || "").trim());
}

/* Families may only `get` a room they already know the id of (from their own
   child's record). Tri-state like checkEnrolled: a failure is not "no room". */
export async function loadRoom(classId) {
    if (!classId) return { ok: true, room: null };
    try {
        var snap = await getDoc(doc(db, COL, classId));
        return { ok: true, room: snap.exists() ? Object.assign({ id: snap.id }, snap.data()) : null };
    } catch (err) {
        return { ok: false, code: (err && err.code) || "upstream_error" };
    }
}

/* Staff only — every room, keyed by class id. */
export async function loadRooms() {
    try {
        var snap = await getDocs(collection(db, COL));
        var byId = {};
        snap.forEach(function (d) { byId[d.id] = Object.assign({ id: d.id }, d.data()); });
        return byId;
    } catch (e) {
        return {};
    }
}

/* What a teacher may change on their own class: the link, and live/off-air.
   merge:true makes this a create the first time and an update after, and in
   both cases touches only the fields the rules allow a teacher. */
export async function setRoomLink(classId, url) {
    try {
        await setDoc(doc(db, COL, classId), { roomUrl: String(url || "").trim() }, { merge: true });
        return { ok: true };
    } catch (err) {
        return { ok: false, code: (err && err.code) || "upstream_error" };
    }
}

export async function setRoomLive(classId, live) {
    try {
        await setDoc(doc(db, COL, classId), { live: !!live, liveChangedAt: new Date().toISOString() }, { merge: true });
        return { ok: true };
    } catch (err) {
        return { ok: false, code: (err && err.code) || "upstream_error" };
    }
}

function scheduleOf(cls) {
    return {
        dayOfWeek: Number(cls.dayOfWeek) || 0,
        startTime: cls.startTime || "",
        durationMins: Number(cls.durationMins) || 60,
        levelIndex: Number(cls.levelIndex) || 1,
    };
}

async function keysFor(students) {
    var keys = {};
    for (var i = 0; i < students.length; i++) {
        var p = String(students[i].parentEmail || "").toLowerCase().trim();
        var s = String(students[i].studentEmail || "").toLowerCase().trim();
        if (p) keys[await emailKey(p)] = true;
        if (s) keys[await emailKey(s)] = true;
    }
    return Object.keys(keys);
}

/* Admin: saves a class's link and who is in it. Membership lives on each
   students/{id}.classId (one class per student), so the room's memberKeys are
   always rebuilt from the records rather than edited by hand — and a student
   moved here from another class is taken out of that class's room too, or
   their family would keep a key to a room they no longer belong to. */
export async function saveRoomForClass(cls, opts, allStudents, updateStudent) {
    try {
        var chosen = {};
        (opts.studentIds || []).forEach(function (id) { chosen[id] = true; });
        var touchedClasses = {};
        var writes = [];
        allStudents.forEach(function (s) {
            var was = s.classId || "";
            var want = chosen[s.id] ? cls.id : (was === cls.id ? "" : was);
            if (want !== was) {
                if (was) touchedClasses[was] = true;
                s.classId = want;
                writes.push(updateStudent(s.id, { classId: want }));
            }
        });
        var results = await Promise.all(writes);
        if (results.some(function (r) { return r && r.ok === false; })) return { ok: false, code: "student_update_failed" };

        var members = allStudents.filter(function (s) { return s.classId === cls.id; });
        var fields = Object.assign(scheduleOf(cls), {
            roomUrl: String(opts.roomUrl || "").trim(),
            teacherName: opts.teacherName || "",
            updatedAt: new Date().toISOString(),
        });
        /* loadStudents() reports a failed read as an empty list, the same as an
           academy with no students. Rebuilding the keys from that would lock
           every family out of the room over one dropped connection, so with no
           roster the existing members are left exactly as they were. */
        if (allStudents.length) fields.memberKeys = await keysFor(members);
        await setDoc(doc(db, COL, cls.id), fields, { merge: true });

        var others = Object.keys(touchedClasses).filter(function (id) { return id !== cls.id; });
        for (var i = 0; i < others.length; i++) {
            var otherMembers = allStudents.filter(function (s) { return s.classId === others[i]; });
            try {
                await updateDoc(doc(db, COL, others[i]), { memberKeys: await keysFor(otherMembers) });
            } catch (e) { /* that class never had a room — nothing to take them out of */ }
        }
        return { ok: true };
    } catch (err) {
        return { ok: false, code: (err && err.code) || "upstream_error" };
    }
}

/* Admin: keeps the schedule copy in step when a class is edited, so families
   never see an old time. Only called for classes that already have a room. */
export async function syncRoomSchedule(cls) {
    try {
        await updateDoc(doc(db, COL, cls.id), scheduleOf(cls));
        return { ok: true };
    } catch (err) {
        return { ok: false, code: (err && err.code) || "upstream_error" };
    }
}

export async function deleteRoom(classId) {
    try {
        await deleteDoc(doc(db, COL, classId));
        return { ok: true };
    } catch (err) {
        return { ok: false, code: (err && err.code) || "upstream_error" };
    }
}

/* A teacher who forgets to press "End" must not leave the room open to early
   joiners for days, so "live" only counts for a few hours after it was set. */
var LIVE_STALE_MS = 3 * 60 * 60 * 1000;
var EARLY_JOIN_MS = 10 * 60 * 1000;

export function isLive(room, now) {
    if (!room || !room.live) return false;
    var since = Date.parse(room.liveChangedAt || "");
    return !since || (now || new Date()) - since < LIVE_STALE_MS;
}

/* Where the class stands right now, in the viewer's own clock: running (from
   10 minutes before the start until it ends), or the next start time. */
export function sessionState(room, now) {
    now = now || new Date();
    var parts = String(room.startTime || "").split(":");
    var h = Number(parts[0]) || 0, m = Number(parts[1]) || 0;
    var dur = (Number(room.durationMins) || 60) * 60 * 1000;
    var day = Number(room.dayOfWeek) || 0;
    /* Look from yesterday forward, so a class that started before midnight
       and is still running counts as "now". */
    for (var offset = -1; offset <= 7; offset++) {
        var start = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset, h, m, 0, 0);
        if (start.getDay() !== day) continue;
        var end = new Date(start.getTime() + dur);
        if (end <= now) continue;
        var open = now >= new Date(start.getTime() - EARLY_JOIN_MS);
        return { start: start, end: end, open: open || isLive(room, now), live: isLive(room, now) };
    }
    return { start: null, end: null, open: isLive(room, now), live: isLive(room, now) };
}
