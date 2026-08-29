import {
    collection as _collection, doc as _doc, query as _query, where, orderBy, limit,
    getDoc as _getDoc, getDocs as _getDocs, getCountFromServer as _getCountFromServer,
    addDoc as _addDoc, setDoc as _setDoc, updateDoc as _updateDoc, deleteDoc as _deleteDoc,
    runTransaction as _runTransaction,
    arrayUnion, arrayRemove, increment, serverTimestamp, documentId,
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";
import { countRead, countWrite, countDelete } from "./usage-meter.js";
import { auth } from "./firebase-init.js";

/* The one door to Firestore for the rest of the app.
 *
 * Every data module imports from here instead of the CDN, so each read and
 * write is counted exactly once as it happens. That is what turns the Database
 * limits panel from an estimate into a measurement — there is no other way to
 * get real numbers into a browser, since Google's own meters need server
 * credentials.
 *
 * Only usage-meter.js still imports the SDK directly, and deliberately: if the
 * meter's own flush went through these wrappers it would count itself and never
 * settle. It adds its own write back to the tally by hand instead.
 *
 * WHAT IS COUNTED, AND WHY IT IS MORE THAN THE OBVIOUS
 * A Firestore bill is not just the documents you asked for. Three things below
 * are billed but invisible to naive counting, and all three are handled here:
 *   1. Every get()/exists() the SECURITY RULES perform. Checking whether you
 *      are an admin reads admins/{you} — a real, billed document read on top of
 *      the operation that triggered it. Across a staff session that is close to
 *      one extra read per operation, so ignoring it left the panel reporting
 *      roughly half the truth. See RULE_READS below.
 *   2. Operations the rules REJECT. The document is not returned, but the rule
 *      lookups that produced the rejection were still performed and billed.
 *      Each wrapper therefore counts on the failure path too, then rethrows.
 *   3. Empty results. A query matching nothing is still billed one read.
 *
 * WHAT IS STILL NOT COUNTED — the panel says so rather than pretending:
 *   - anything done by hand in the Firebase console;
 *   - visitors who never sign in on this browser (their counts are held in
 *     localStorage and flushed if they ever do — see usage-meter.js — but the
 *     rules will not let a signed-out client write the counter, and opening an
 *     unauthenticated write endpoint in order to measure quota would itself be
 *     a way for anyone to burn it);
 *   - index-entry costs on an aggregation scanning past its first thousand.
 * Only the scheduled job in functions/index.js can see those, because only it
 * can read Google's own meters. Until it runs, this is a tight floor rather
 * than the bill itself. */

/* ---------------------------------------------------------------------------
 * Which collection a reference belongs to.
 *
 * The billed cost of an operation depends on which rules guard it, so the
 * wrappers need to know the collection. The modular SDK exposes no public path
 * on a Query, so instead every reference is tagged as it is built: collection()
 * and doc() are wrapped here — the whole app imports them from this file — and
 * query() carries the tag across. A WeakMap holds the tags, so a discarded
 * reference is still collectable.
 * ------------------------------------------------------------------------- */
var TAG = new WeakMap();

function tag(obj, name) {
    if (obj && name) { try { TAG.set(obj, name); } catch (e) { } }
    return obj;
}

function tagOf(obj) {
    if (!obj || typeof obj !== "object") return null;
    try { return TAG.get(obj) || null; } catch (e) { return null; }
}

/* The database handle is never tagged, so a null parent tag means this is a
   top-level collection and the first path segment names it. A document
   reference is tagged, so anything built from one inherits its root. */
function rootTag(parent, path) {
    var inherited = tagOf(parent);
    if (inherited) return inherited;
    return typeof path === "string" ? path.split("/")[0] : null;
}

export function collection(parent, path) {
    return tag(_collection.apply(null, arguments), rootTag(parent, path));
}

export function doc(parent, path) {
    return tag(_doc.apply(null, arguments), rootTag(parent, path));
}

export function query(q) {
    return tag(_query.apply(null, arguments), tagOf(q));
}

/* ---------------------------------------------------------------------------
 * The cost of the security rules themselves.
 *
 * KEEP THIS TABLE IN STEP WITH firestore.rules — it is a transcription of them,
 * and a rule that gains or loses a get()/exists() changes the numbers here.
 *
 * Each entry is [admin or developer, approved teacher, any other verified
 * user]: the number of documents the rules fetch while deciding that one
 * operation. Firestore caches a lookup per path per request, so a helper that
 * consults the same document twice is billed once.
 *
 * Signed-out and unverified callers cost nothing at all, and are handled before
 * this table is consulted: every helper in the rules opens with isVerified(),
 * and && stops before it reaches the lookup.
 * ------------------------------------------------------------------------- */

/* isAdminOrDeveloper() / isDeveloper(): one look at admins/{me}. */
var A = [1, 1, 1];
/* isStaff() = isAdminOrDeveloper() || isApprovedTeacher(). || short-circuits
   within a single condition, so an admin stops after admins/{me}; everyone else
   misses there and goes on to teachers/{me}. The same shape covers the rules
   written as "isAdminOrDeveloper() || (isApprovedTeacher() && ...) || ...". */
var S = [1, 2, 2];
/* A rule that needs no lookup: `if true`, or a test on the auth token alone. */
var Z = [0, 0, 0];
/* Creating students/: an admin is confirmed by admins/{me} alone. A teacher
   misses there, matches on teachers/{me}, then pays once more for the
   exists() on studentAccounts that proves the signup is real. Anyone else
   misses both and never reaches the exists(). */
var C = [1, 3, 2];

var RULE_READS = {
    studentApplications: { get: S, list: S, create: Z, update: S, delete: A },
    applications: { get: S, list: S },
    teacherApplications: { get: A, list: A, create: Z, update: A, delete: A },
    /* admins: only `allow get: isSignedIn() && own` matches a single-document
       read, and it looks nothing up. Listing needs isDeveloper(). */
    admins: { get: Z, list: A, create: A, update: A, delete: A },
    /* teachers: two statements match a get — the free own-document one and the
       broader `read`. Which is evaluated first is not specified, so this counts
       the dearer path rather than assuming the cheap one wins. */
    teachers: { get: A, list: A, create: A, update: A, delete: A },
    /* staffProfiles: reading needs only a signed-in token. Writing your own is
       free; writing a colleague's falls through to isAdminOrDeveloper(), which
       is what the `self` entry below distinguishes. */
    staffProfiles: { get: Z, list: Z, create: A, update: A, delete: A, self: Z },
    /* parentAccounts / studentAccounts: the rules test the own-account case
       first, so the owner pays nothing and only a staff member reaching into
       someone else's row pays for isStaff(). studentAccounts doubles as the
       student signup queue, which is why staff can update it at all. */
    parentAccounts: { get: S, list: S, create: Z, update: Z, delete: Z, self: Z },
    studentAccounts: { get: S, list: S, create: Z, update: S, delete: A, self: Z },
    students: { get: S, list: S, create: C, update: S, delete: A },
    competitionRegistrations: { get: S, list: S, create: Z, update: S, delete: A },
    /* trialSlots: public to read. A booking by a signed-out visitor costs
       nothing; one by a signed-in visitor pays the isStaff() attempt first. */
    trialSlots: { get: Z, list: Z, create: S, update: S, delete: S },
    classes: { get: S, list: S, create: A, update: A, delete: A },
    payments: { get: A, list: A, create: A, update: A, delete: A },
    expenses: { get: A, list: A, create: A, update: A, delete: A },
    enrolledEmails: { get: Z, list: A, create: A, update: A, delete: A },
    /* usageDaily: this meter's own storage. Adding to it needs only a signed-in
       token, which is what keeps the meter cheaper than the thing it measures.
       Reading it back, as the panel does, is staff-gated and does cost. */
    usageDaily: { get: S, list: S, create: Z, update: Z, delete: Z },
};

/* The app tells us the signed-in user's role once it knows it. Before then, and
   for a parent or student, the third column applies. A plain setter rather than
   a read from roles.js, which imports this file. */
var viewerRole = null;
export function setViewerRole(role) { viewerRole = role || null; }

function roleIndex() {
    /* Tested before emailVerified on purpose: the rules carry one hardcoded
       exception for the dev admin account, which has no verified inbox but is
       an admin all the same and still pays for the lookup. */
    if (viewerRole === "developer" || viewerRole === "admin") return 0;
    if (viewerRole === "teacher") return 1;
    var user = auth.currentUser;
    if (!user || !user.emailVerified) return -1;
    return 2;
}

function myEmail() {
    var user = auth.currentUser;
    return user && user.email ? user.email.toLowerCase() : null;
}

/* How many billed reads the rules perform for one operation on one reference.
   `op` is get | list | create | update | delete. */
function ruleReads(ref, op) {
    var idx = roleIndex();
    if (idx < 0) return 0;
    var name = tagOf(ref);
    var row = name && RULE_READS[name];
    if (!row) return 0;
    /* Several collections are keyed by email and charge nothing for touching
       your own document. Both halves are known here, so this is exact rather
       than averaged. */
    if (row.self && ref && ref.id && myEmail() === String(ref.id).toLowerCase()) {
        return row.self[idx];
    }
    var cost = row[op];
    return cost ? cost[idx] : 0;
}

/* setDoc writes a document whether or not it already existed, so which of the
   two rules applies is not knowable from here. Where they differ, the dearer
   one is assumed: a capacity gauge should not round in the flattering
   direction. */
function writeRuleReads(ref) {
    return Math.max(ruleReads(ref, "create"), ruleReads(ref, "update"));
}

/* ---------------------------------------------------------------------------
 * The wrappers.
 *
 * Each counts the rule lookups whether the call succeeds or fails, and the
 * operation itself only when it actually happened. A rejected read returns no
 * document and is not billed as one, but the lookups that rejected it were.
 * ------------------------------------------------------------------------- */

export async function getDoc(ref) {
    var rules = ruleReads(ref, "get");
    try {
        var snap = await _getDoc(ref);
        /* A miss still costs a read — Firestore bills the lookup, not the
           result. */
        countRead(1 + rules);
        return snap;
    } catch (err) {
        countRead(rules);
        throw err;
    }
}

export async function getDocs(q) {
    var rules = ruleReads(q, "list");
    try {
        var snap = await _getDocs(q);
        /* Billed per document returned, with a minimum of one for an empty
           result. */
        countRead(Math.max(snap.size, 1) + rules);
        return snap;
    } catch (err) {
        countRead(rules);
        throw err;
    }
}

export async function getCountFromServer(q) {
    var rules = ruleReads(q, "list");
    try {
        var snap = await _getCountFromServer(q);
        /* An aggregation is billed as roughly one read per 1,000 index entries
           scanned, not one per document — which is the whole reason the limits
           panel counts with it. One is the right approximation at this scale. */
        countRead(1 + rules);
        return snap;
    } catch (err) {
        countRead(rules);
        throw err;
    }
}

export async function addDoc(ref, data) {
    var rules = ruleReads(ref, "create");
    try {
        var out = await _addDoc(ref, data);
        countWrite(1);
        countRead(rules);
        return out;
    } catch (err) {
        countRead(rules);
        throw err;
    }
}

export async function setDoc(ref, data, options) {
    var rules = writeRuleReads(ref);
    try {
        var out = options === undefined ? await _setDoc(ref, data) : await _setDoc(ref, data, options);
        countWrite(1);
        countRead(rules);
        return out;
    } catch (err) {
        countRead(rules);
        throw err;
    }
}

export async function updateDoc(ref, data) {
    var rules = ruleReads(ref, "update");
    try {
        var out = await _updateDoc(ref, data);
        countWrite(1);
        countRead(rules);
        return out;
    } catch (err) {
        countRead(rules);
        throw err;
    }
}

export async function deleteDoc(ref) {
    var rules = ruleReads(ref, "delete");
    try {
        var out = await _deleteDoc(ref);
        countDelete(1);
        countRead(rules);
        return out;
    } catch (err) {
        countRead(rules);
        throw err;
    }
}

/* Counted as one read and one write: the callback reads a document and writes
   it back. An approximation — a transaction touching more would undercount —
   but the only one in the app (booking a trial slot) does exactly that, and its
   rule lookups are charged on both halves of the round trip. */
export async function runTransaction(dbRef, fn) {
    var out = await _runTransaction(dbRef, fn);
    countRead(1);
    countWrite(1);
    return out;
}

/* Pass-throughs: these build constraints and field values, they don't touch the
   network and they carry no path, so there is nothing to tag or count. */
export {
    where, orderBy, limit,
    arrayUnion, arrayRemove, increment, serverTimestamp, documentId,
};
