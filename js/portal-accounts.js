import {
    collection, doc, getDoc, getDocs, setDoc,
} from "./fs.js";
import { db } from "./firebase-init.js";

/* Records a self-created Parent Portal login.
 *
 * A student's row is more than a registry entry: it is their place in the
 * review queue, because a student already in the academy signs up rather than
 * applying, and a teacher or admin then accepts them. So it is created as
 * `pending` and the security rules refuse to let the student write status,
 * teacher, or record id themselves — otherwise signing up would BE approval.
 *
 * A parent's row stays a plain registry entry. Nothing needs reviewing there:
 * parent signup is already gated on the email matching a child we teach. */
export async function recordPortalAccount(role, email, name) {
    var isStudent = role === "student";
    var col = isStudent ? "studentAccounts" : "parentAccounts";
    var normalized = email.toLowerCase().trim();
    var payload = {
        email: normalized, name: (name || "").trim(), createdAt: new Date().toISOString(),
    };
    if (isStudent) payload.status = "pending";
    try {
        await setDoc(doc(db, col, normalized), payload);
        return { ok: true };
    } catch (err) {
        return { ok: false, code: (err && err.code) || "upstream_error" };
    }
}

/* The signed-in student's own row, so the portal can tell them where they
   stand instead of showing an empty progress page. Readable by its owner
   without any staff check — see the rules. */
export async function loadOwnSignup(email) {
    var normalized = String(email || "").toLowerCase().trim();
    if (!normalized) return { ok: true, signup: null };
    try {
        var snap = await getDoc(doc(db, "studentAccounts", normalized));
        return { ok: true, signup: snap.exists() ? Object.assign({ email: normalized }, snap.data()) : null };
    } catch (err) {
        return { ok: false, code: (err && err.code) || "upstream_error", signup: null };
    }
}

export async function loadPortalAccounts() {
    try {
        var parentSnap = await getDocs(collection(db, "parentAccounts"));
        var studentSnap = await getDocs(collection(db, "studentAccounts"));
        var list = [];
        parentSnap.forEach(function (d) { list.push(Object.assign({ role: "parent" }, d.data())); });
        studentSnap.forEach(function (d) { list.push(Object.assign({ role: "student" }, d.data())); });
        list.sort(function (a, b) { return (b.createdAt || "").localeCompare(a.createdAt || ""); });
        return list;
    } catch (e) {
        return [];
    }
}
