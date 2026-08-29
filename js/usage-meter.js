import {
    collection, doc, getDoc, getDocs, setDoc, increment,
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";
import { db, auth } from "./firebase-init.js";

/* Measures what this app actually costs the Firestore quota.
 *
 * Google's own meters live in Cloud Monitoring and need server credentials, so
 * a browser can't read them. What a browser CAN do is count its own work: every
 * read and write goes through js/fs.js, which reports here — including the
 * reads the security rules perform, which are billed and would otherwise be
 * invisible — and the totals are accumulated into usageDaily/{YYYY-MM-DD}.
 *
 * NOTHING COUNTED IS THROWN AWAY
 * Two things used to lose counts outright, and both are why the panel's number
 * drifted below the truth over a day rather than merely lagging it:
 *   - a signed-out visitor, because the rules won't let them write the counter;
 *   - a tab that went away before its last batch was flushed.
 * Both are now held in localStorage and settled later: on the next signed-in
 * page load in that browser, against the day they were actually incurred. A
 * visitor who never signs in anywhere still can't be counted, and opening an
 * unauthenticated write endpoint to fix that would hand anyone a way to burn
 * the very quota this is watching.
 *
 * WHAT REMAINS UNCOUNTED: work done by hand in the Firebase console, and the
 * visitors above. Only functions/index.js sees those, and only once the project
 * is on Blaze. Until then the panel labels this a measurement of the site
 * rather than the bill.
 */

var STORE_KEY = "egysoroban_usage_pending";

/* Keyed by day, because a batch can outlive the day it was counted on: a tab
   left open past midnight, or a signed-out visit settled the following morning,
   must land on the right date or both days are wrong. */
var pending = {};
var flushTimer = null;
var FLUSH_AFTER_OPS = 40;
var FLUSH_AFTER_MS = 45000;

function todayKey() {
    var d = new Date();
    var m = d.getMonth() + 1;
    var day = d.getDate();
    return d.getFullYear() + "-" + (m < 10 ? "0" + m : m) + "-" + (day < 10 ? "0" + day : day);
}

function emptyCounts() {
    return { reads: 0, writes: 0, deletes: 0 };
}

function bucket(day) {
    var key = day || todayKey();
    if (!pending[key]) pending[key] = emptyCounts();
    return pending[key];
}

function dayTotal(c) {
    return (c.reads || 0) + (c.writes || 0) + (c.deletes || 0);
}

function pendingTotal() {
    var sum = 0;
    for (var day in pending) sum += dayTotal(pending[day]);
    return sum;
}

function readStore() {
    try {
        var raw = localStorage.getItem(STORE_KEY);
        var parsed = raw ? JSON.parse(raw) : null;
        return parsed && typeof parsed === "object" ? parsed : {};
    } catch (e) { return {}; }
}

function writeStore(map) {
    try {
        if (!map || !Object.keys(map).length) localStorage.removeItem(STORE_KEY);
        else localStorage.setItem(STORE_KEY, JSON.stringify(map));
    } catch (e) { }
}

/* Takes over whatever an earlier page load left unsettled, and clears the store
   in the same breath so a second tab opening at the same moment cannot claim
   the same backlog and count it twice. The two tabs then keep separate
   in-memory tallies, which is harmless: flush() adds with increment(), and
   switching away from a tab flushes it, so they rarely accumulate at once. */
(function claimBacklog() {
    var stored = readStore();
    writeStore({});
    for (var day in stored) {
        var c = stored[day];
        if (!c) continue;
        var into = bucket(day);
        into.reads += Number(c.reads) || 0;
        into.writes += Number(c.writes) || 0;
        into.deletes += Number(c.deletes) || 0;
    }
})();

/* Crash insurance, written on every batch: whatever is in memory is also on
   disk, so closing the laptop lid loses nothing. */
function persist() {
    var out = {};
    for (var day in pending) {
        if (dayTotal(pending[day])) out[day] = pending[day];
    }
    writeStore(out);
}

export function countRead(n) { bucket().reads += n || 0; schedule(); }
export function countWrite(n) { bucket().writes += n || 0; schedule(); }
export function countDelete(n) { bucket().deletes += n || 0; schedule(); }

function schedule() {
    persist();
    if (pendingTotal() >= FLUSH_AFTER_OPS) { flush(); return; }
    if (flushTimer) return;
    flushTimer = setTimeout(function () { flushTimer = null; flush(); }, FLUSH_AFTER_MS);
}

/* Batched on purpose. Writing the counter on every operation would roughly
   double the writes it is supposed to be measuring — the meter has to stay
   small relative to what it meters. */
export async function flush() {
    if (!auth.currentUser) {
        /* Signed out, so the rules will refuse the write. The counts stay on
           disk and settle on the next signed-in load rather than evaporating. */
        persist();
        return { ok: false, code: "signed_out" };
    }
    if (!pendingTotal()) return { ok: true, flushed: 0 };
    if (flushTimer) { clearTimeout(flushTimer); flushTimer = null; }

    var days = Object.keys(pending);
    var flushed = 0;
    var failure = null;

    for (var i = 0; i < days.length; i++) {
        var day = days[i];
        var batch = pending[day];
        if (!dayTotal(batch)) { delete pending[day]; continue; }
        /* Cleared before the await so operations counted during the round trip
           accumulate into a fresh bucket instead of being wiped by its result;
           put back below if the write fails. */
        pending[day] = emptyCounts();
        try {
            /* Raw setDoc, not the instrumented one in fs.js — routing this
               through the counter would count the counter and never settle.
               Instead the write is added back to the tally on the line below,
               so the meter still accounts for its own cost honestly. Its rule
               lookups cost nothing: writing usageDaily needs only a signed-in
               token, no admins/{me} check. */
            await setDoc(doc(db, "usageDaily", day), {
                reads: increment(batch.reads),
                writes: increment(batch.writes + 1),
                deletes: increment(batch.deletes),
                day: day,
                updatedAt: new Date().toISOString(),
            }, { merge: true });
            flushed += dayTotal(batch);
            if (!dayTotal(pending[day])) delete pending[day];
        } catch (err) {
            /* Put it back so a failed flush loses nothing; the next one carries
               it, and persist() below keeps it across a reload. */
            var back = bucket(day);
            back.reads += batch.reads;
            back.writes += batch.writes;
            back.deletes += batch.deletes;
            failure = (err && err.code) || "upstream_error";
        }
    }

    persist();
    if (failure) return { ok: false, code: failure };
    return { ok: true, flushed: flushed };
}

/* Anything still pending when the tab goes away would otherwise wait for the
   next visit. visibilitychange fires reliably on mobile where pagehide often
   does not; persist() runs first so even a flush that never lands is safe. */
if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", function () {
        if (document.visibilityState === "hidden") { persist(); flush(); }
    });
    window.addEventListener("pagehide", function () { persist(); flush(); });
}

export function pendingCounts() {
    var today = pending[todayKey()] || emptyCounts();
    return { reads: today.reads, writes: today.writes, deletes: today.deletes };
}

/* Reads the recorded days back out for the panel. Uses the raw SDK because
   fs.js imports this file, but counts by hand anyway — opening the panel really
   does spend quota, and a meter that exempted itself would be reporting a
   number it knows to be short. */
export async function loadUsage() {
    try {
        var snap = await getDocs(collection(db, "usageDaily"));
        countRead(Math.max(snap.size, 1) + staffRuleReads());
        var list = [];
        snap.forEach(function (d) { list.push(Object.assign({ day: d.id }, d.data())); });
        list.sort(function (a, b) { return (a.day || "").localeCompare(b.day || ""); });
        return list;
    } catch (e) {
        countRead(staffRuleReads());
        return [];
    }
}

/* Reading usageDaily is gated on isStaff(), which checks admins/{me} first and
   only consults teachers/{me} when that misses. The Database limits tab is
   hidden from teachers (see admin.js), so the only callers of these two
   functions are admins and developers, who always match on the first lookup.
   Exactly one billed read, not an average. */
function staffRuleReads() {
    return 1;
}

export async function loadToday() {
    var key = todayKey();
    try {
        var snap = await getDoc(doc(db, "usageDaily", key));
        countRead(1 + staffRuleReads());
        var base = snap.exists() ? snap.data() : emptyCounts();
        var live = pending[key] || emptyCounts();
        /* Include what hasn't been flushed yet, or the panel would under-report
           the session you are sitting in right now. */
        return {
            day: key,
            reads: (base.reads || 0) + live.reads,
            writes: (base.writes || 0) + live.writes,
            deletes: (base.deletes || 0) + live.deletes,
            /* Written by the scheduled function in functions/index.js, if it is
               deployed. Google's own meters, so they also cover the console and
               signed-out traffic that this browser cannot see. Absent until the
               project is on Blaze and the function is running. */
            server: base.server || null,
        };
    } catch (e) {
        countRead(staffRuleReads());
        return { day: key, reads: null, writes: null, deletes: null };
    }
}

export { todayKey };
