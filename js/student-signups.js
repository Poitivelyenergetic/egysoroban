import {
    collection, doc, getDocs, updateDoc, query, where,
} from "./fs.js";
import { db, auth } from "./firebase-init.js";
import { addStudent } from "./student-records.js";

/* The review queue for students who are ALREADY in the academy.
 *
 * They should not have to fill in the public application form — they are not
 * applying, they are enrolled. So they create a Parent Portal login for
 * themselves and land here instead: a pending signup that a teacher or an
 * admin accepts, assigning them to a teacher as they do. Accepting is what
 * creates the students/{id} record their portal reads from.
 *
 * The signup itself lives on studentAccounts/{email}, which the student writes
 * at signup. The security rules stop them writing the fields that decide the
 * outcome — status, teacher, record id — so signing up can never be the same
 * thing as being accepted.
 */

var COL = "studentAccounts";

export var STATUS_PENDING = "pending";
export var STATUS_APPROVED = "approved";
export var STATUS_REJECTED = "rejected";

/* A signup made before this queue existed carries no status field. It has
   never been reviewed, so it is pending — reading a missing status as anything
   else would quietly hide real people who signed up when there was nowhere to
   review them. */
export function statusOf(account) {
    var s = account && account.status;
    return s === STATUS_APPROVED || s === STATUS_REJECTED ? s : STATUS_PENDING;
}

export async function loadStudentSignups() {
    try {
        var snap = await getDocs(collection(db, COL));
        var list = [];
        snap.forEach(function (d) {
            var data = d.data() || {};
            list.push(Object.assign({ email: d.id }, data, { status: statusOf(data) }));
        });
        /* Waiting first, then newest — the queue exists to be worked through,
           so the people still waiting belong at the top of it. */
        list.sort(function (a, b) {
            var ap = a.status === STATUS_PENDING ? 0 : 1;
            var bp = b.status === STATUS_PENDING ? 0 : 1;
            if (ap !== bp) return ap - bp;
            return (b.createdAt || "").localeCompare(a.createdAt || "");
        });
        return { ok: true, list: list };
    } catch (err) {
        return { ok: false, code: (err && err.code) || "upstream_error", list: [] };
    }
}

/* Has this email already got a student record? Approving twice would otherwise
   leave the same child in the roster twice.
 *
 * An admin can ask the question directly. A teacher cannot: the rules only let
 * them list students already assigned to them, so a query on studentEmail is
 * refused outright rather than filtered. They get the same answer from the
 * query they ARE allowed to run, narrowed client-side. Neither path can see a
 * record belonging to a different teacher, so a teacher approving someone
 * another teacher already took on is still possible — the studentRecordId
 * written below is what makes the ordinary retry safe. */
async function findExistingRecordId(studentEmail, teacherEmail) {
    var students = collection(db, "students");
    try {
        var byEmail = await getDocs(query(students, where("studentEmail", "==", studentEmail)));
        if (!byEmail.empty) return byEmail.docs[0].id;
        return null;
    } catch (e) { /* not permitted to query that way — fall through */ }
    try {
        var mine = await getDocs(query(students, where("teacherEmail", "==", teacherEmail)));
        var found = null;
        mine.forEach(function (d) {
            var data = d.data() || {};
            if (!found && String(data.studentEmail || "").toLowerCase() === studentEmail) found = d.id;
        });
        return found;
    } catch (e2) {
        return null;
    }
}

/* Accepts a pending signup: creates the student record, then marks the signup
   reviewed. In that order deliberately — the record is the thing that matters,
   and a signup left pending is a visible, retryable state. The reverse order
   would produce a signup marked "approved" with no record behind it, which
   looks finished and is not. */
export async function approveSignup(account, assignment) {
    var email = String((account && account.email) || "").toLowerCase().trim();
    if (!email) return { ok: false, code: "missing_email" };

    var teacherEmail = String((assignment && assignment.teacherEmail) || "").toLowerCase().trim();
    if (!teacherEmail) return { ok: false, code: "no_teacher" };

    var recordId = account.studentRecordId || null;
    if (!recordId) recordId = await findExistingRecordId(email, teacherEmail);

    if (!recordId) {
        var created = await addStudent({
            name: String(assignment.name || account.name || "").trim(),
            /* Blank rather than the student's own address: this is the student's
               login, and writing it here too would let them read the record as
               both parent and student, and would put them in the parent-signup
               directory as their own parent. A parent links themselves later. */
            parentEmail: "",
            studentEmail: email,
            teacherEmail: teacherEmail,
            branch: String(assignment.branch || ""),
            levelIndex: Number(assignment.levelIndex) || 1,
            attendedSessions: 0,
            totalSessions: 0,
            homeworkCompleted: 0,
            homeworkAssigned: 0,
            enrolledAt: new Date().toISOString(),
            /* Tells apart a record typed in by an admin from one that came out
               of this queue, which is worth knowing when a duplicate turns up. */
            source: "portal-signup",
        });
        if (!created.ok) return created;
        recordId = created.id;
    }

    try {
        await updateDoc(doc(db, COL, email), {
            status: STATUS_APPROVED,
            studentRecordId: recordId,
            teacherEmail: teacherEmail,
            reviewedBy: ((auth.currentUser && auth.currentUser.email) || "").toLowerCase(),
            reviewedAt: new Date().toISOString(),
        });
    } catch (err) {
        /* The student record exists; only the bookkeeping failed. Reported
           distinctly so the panel can say "made, but still shows as waiting"
           rather than inviting a retry that would create a second record. */
        return { ok: false, code: "record_created_not_marked", id: recordId };
    }

    return { ok: true, id: recordId };
}

export async function rejectSignup(email) {
    var normalized = String(email || "").toLowerCase().trim();
    if (!normalized) return { ok: false, code: "missing_email" };
    try {
        await updateDoc(doc(db, COL, normalized), {
            status: STATUS_REJECTED,
            reviewedBy: ((auth.currentUser && auth.currentUser.email) || "").toLowerCase(),
            reviewedAt: new Date().toISOString(),
        });
        return { ok: true };
    } catch (err) {
        return { ok: false, code: (err && err.code) || "upstream_error" };
    }
}

/* Puts a reviewed signup back in the queue. A rejection made by mistake locks
   a real student out of their own progress page, so it has to be undoable. */
export async function reopenSignup(email) {
    var normalized = String(email || "").toLowerCase().trim();
    if (!normalized) return { ok: false, code: "missing_email" };
    try {
        await updateDoc(doc(db, COL, normalized), {
            status: STATUS_PENDING,
            reviewedBy: ((auth.currentUser && auth.currentUser.email) || "").toLowerCase(),
            reviewedAt: new Date().toISOString(),
        });
        return { ok: true };
    } catch (err) {
        return { ok: false, code: (err && err.code) || "upstream_error" };
    }
}
