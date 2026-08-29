import {
    collection, doc, getDoc, getDocs, setDoc, increment,
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";
import { db, auth } from "./firebase-init.js";

/* Measures what this app actually costs the Firestore quota.
 *
 * Google's own meters live in Cloud Monitoring and need server credentials, so
 * a browser can't read them. What a browser CAN do is count its own work: every
 * read and write goes through js/fs.js, which reports here, and the totals are
 * accumulated into usageDaily/{YYYY-MM-DD}. That makes these numbers measured
 * rather than modelled — but measured from this side of the wire, so be clear
 * about what they do and don't include:
 *   - counted: every Firestore call made by this site, by anyone signed in.
 *   - not counted: signed-out visitors (the rules don't let them write the
 *     counter, and their usage is a single trialSlots read on the apply page),
 *     anything done directly in the Firebase console, and the free daily
 *     allowance resetting on Google's clock rather than the browser's.
 * The panel says so rather than presenting these as Google's own figures.
 */

var pending = { reads: 0, writes: 0, deletes: 0 };
var flushTimer = null;
var FLUSH_AFTER_OPS = 40;
var FLUSH_AFTER_MS = 45000;

function todayKey() {
    var d = new Date();
    var m = d.getMonth() + 1;
    var day = d.getDate();
    return d.getFullYear() + "-" + (m < 10 ? "0" + m : m) + "-" + (day < 10 ? "0" + day : day);
}

function pendingTotal() {
    return pending.reads + pending.writes + pending.deletes;
}

export function countRead(n) { pending.reads += n || 0; schedule(); }
export function countWrite(n) { pending.writes += n || 0; schedule(); }
export function countDelete(n) { pending.deletes += n || 0; schedule(); }

function schedule() {
    if (pendingTotal() >= FLUSH_AFTER_OPS) { flush(); return; }
    if (flushTimer) return;
    flushTimer = setTimeout(function () { flushTimer = null; flush(); }, FLUSH_AFTER_MS);
}

/* Batched on purpose. Writing the counter on every operation would roughly
   double the writes it is supposed to be measuring — the meter has to stay
   small relative to what it meters. */
export async function flush() {
    if (!auth.currentUser) return { ok: false, code: "signed_out" };
    if (!pendingTotal()) return { ok: true, flushed: 0 };

    var batch = pending;
    pending = { reads: 0, writes: 0, deletes: 0 };
    if (flushTimer) { clearTimeout(flushTimer); flushTimer = null; }

    try {
        /* Raw setDoc, not the instrumented one in fs.js — routing this through
           the counter would count the counter and never settle. Instead the
           write is added back to the tally explicitly on the line below, so
           the meter still accounts for its own cost honestly. */
        await setDoc(doc(db, "usageDaily", todayKey()), {
            reads: increment(batch.reads),
            writes: increment(batch.writes + 1),
            deletes: increment(batch.deletes),
            day: todayKey(),
            updatedAt: new Date().toISOString(),
        }, { merge: true });
        return { ok: true, flushed: batch.reads + batch.writes + batch.deletes };
    } catch (err) {
        /* Put it back so a failed flush loses nothing; the next one carries it. */
        pending.reads += batch.reads;
        pending.writes += batch.writes;
        pending.deletes += batch.deletes;
        return { ok: false, code: (err && err.code) || "upstream_error" };
    }
}

/* Anything still pending when the tab goes away would otherwise be lost.
   visibilitychange fires reliably on mobile where pagehide often does not. */
if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", function () {
        if (document.visibilityState === "hidden") flush();
    });
    window.addEventListener("pagehide", function () { flush(); });
}

export function pendingCounts() {
    return { reads: pending.reads, writes: pending.writes, deletes: pending.deletes };
}

/* Reads the recorded days back out for the panel. Uses raw getDocs so that
   opening the usage panel doesn't inflate the usage it is reporting. */
export async function loadUsage() {
    try {
        var snap = await getDocs(collection(db, "usageDaily"));
        var list = [];
        snap.forEach(function (d) { list.push(Object.assign({ day: d.id }, d.data())); });
        list.sort(function (a, b) { return (a.day || "").localeCompare(b.day || ""); });
        return list;
    } catch (e) {
        return [];
    }
}

export async function loadToday() {
    try {
        var snap = await getDoc(doc(db, "usageDaily", todayKey()));
        var base = snap.exists() ? snap.data() : { reads: 0, writes: 0, deletes: 0 };
        /* Include what hasn't been flushed yet, or the panel would under-report
           the session you are sitting in right now. */
        return {
            day: todayKey(),
            reads: (base.reads || 0) + pending.reads,
            writes: (base.writes || 0) + pending.writes,
            deletes: (base.deletes || 0) + pending.deletes,
            /* Written by the scheduled function in functions/index.js, if it is
               deployed. Google's own meters, so they also cover the console and
               signed-out traffic that this browser cannot see. Absent until the
               project is on Blaze and the function is running. */
            server: base.server || null,
        };
    } catch (e) {
        return { day: todayKey(), reads: null, writes: null, deletes: null };
    }
}

export { todayKey };
