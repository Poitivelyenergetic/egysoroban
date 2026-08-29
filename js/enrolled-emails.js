import {
    collection, doc, getDoc, getDocs, setDoc, deleteDoc,
} from "./fs.js";
import { db } from "./firebase-init.js";

var COL = "enrolledEmails";

/* A parent signing up has to be checked against the families we actually
   teach BEFORE an account exists — which rules out querying students/,
   because that collection only opens up to a parent once they are signed in
   AND email-verified, and both of those come after signup. So this tiny
   directory mirrors "which emails belong to a real student record" and is
   readable by a signed-out visitor.

   That public read is why the document IDs are salted SHA-256 hashes of the
   email rather than the address itself. Someone who already knows an address
   can still check it — that is exactly what the signup form does — but the
   collection never stores a readable address, so the public half of the gate
   can't be turned into a customer email list. Listing is denied to everyone
   but an admin, so it can't be dumped either.

   Nothing security-critical rests on this: it decides who may create a login,
   not who may read a child's record. That is still enforced on students/
   itself, where a parent only ever sees documents whose parentEmail matches
   their verified address. */
export async function emailKey(email) {
    var normalized = String(email || "").toLowerCase().trim();
    var bytes = new TextEncoder().encode("egysoroban:" + normalized);
    var digest = await crypto.subtle.digest("SHA-256", bytes);
    return Array.prototype.map.call(new Uint8Array(digest), function (b) {
        return ("0" + b.toString(16)).slice(-2);
    }).join("");
}

/* Tri-state on purpose. A failed lookup is NOT the same as "no child": if
   Firestore is unreachable we must not tell a real parent they have no
   children, so the caller shows a try-again message instead of a rejection. */
export async function checkEnrolled(email, role) {
    var normalized = String(email || "").toLowerCase().trim();
    if (!normalized) return { ok: true, enrolled: false };
    try {
        var snap = await getDoc(doc(db, COL, await emailKey(normalized)));
        if (!snap.exists()) return { ok: true, enrolled: false };
        var data = snap.data() || {};
        return { ok: true, enrolled: role === "student" ? data.asStudent === true : data.asParent === true };
    } catch (err) {
        return { ok: false, code: (err && err.code) || "upstream_error" };
    }
}

/* Rebuilds the directory from the student records themselves, so it can never
   drift out of step with who is actually enrolled. Admin-only (listing the
   collection requires it), and it writes only the documents that actually
   changed — the common case is an admin opening Student records and nothing
   needing to be written at all. */
export async function syncEnrolledEmails(students) {
    try {
        var desired = {};
        for (var i = 0; i < students.length; i++) {
            var s = students[i];
            var parentEmail = String(s.parentEmail || "").toLowerCase().trim();
            var studentEmail = String(s.studentEmail || "").toLowerCase().trim();
            if (parentEmail) {
                var pk = await emailKey(parentEmail);
                desired[pk] = desired[pk] || { asParent: false, asStudent: false };
                desired[pk].asParent = true;
            }
            if (studentEmail) {
                var sk = await emailKey(studentEmail);
                desired[sk] = desired[sk] || { asParent: false, asStudent: false };
                desired[sk].asStudent = true;
            }
        }

        var snap = await getDocs(collection(db, COL));
        var existing = {};
        snap.forEach(function (d) { existing[d.id] = d.data() || {}; });

        var writes = [];
        Object.keys(desired).forEach(function (key) {
            var want = desired[key];
            var have = existing[key];
            if (!have || have.asParent !== want.asParent || have.asStudent !== want.asStudent) {
                writes.push(setDoc(doc(db, COL, key), {
                    asParent: want.asParent, asStudent: want.asStudent,
                    updatedAt: new Date().toISOString(),
                }));
            }
        });
        /* A family that leaves must lose the ability to create a new login,
           so entries with no student behind them any more are removed.

           Guarded on a non-empty roster, because loadStudents() reports a
           failed read as an empty array — indistinguishable from a genuinely
           empty academy. Without this, one dropped connection would delete
           every entry and lock every existing parent out of signing up. An
           academy that really has removed its last student keeps a few stale
           entries instead, which is recoverable; a wiped directory is not. */
        if (students.length) {
            Object.keys(existing).forEach(function (key) {
                if (!desired[key]) writes.push(deleteDoc(doc(db, COL, key)));
            });
        }

        await Promise.all(writes);
        return { ok: true, changed: writes.length };
    } catch (err) {
        return { ok: false, code: (err && err.code) || "upstream_error" };
    }
}
