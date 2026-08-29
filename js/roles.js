import {
    doc, getDoc, getDocs, collection, setDoc, updateDoc, deleteDoc,
} from "./fs.js";
import { db, auth } from "./firebase-init.js";

export var ROLE_DEVELOPER = "developer";
export var ROLE_ADMIN = "admin";
export var ROLE_TEACHER = "teacher";

/* The developer role was called "superadmin" until it was renamed, and that
   string is still sitting in admins/{email} documents created before the
   change. Every read normalises it to ROLE_DEVELOPER in getCurrentRole() and
   listAdmins(), so this legacy value is known in exactly two places and the
   rest of the app only ever sees "developer". The Firestore rules accept both
   for the same reason — the rules have to keep honouring the old value until
   the last document is migrated, or the rename would lock the existing
   developer out of the one collection needed to fix it. */
export var LEGACY_SUPERADMIN = "superadmin";

export function normaliseRole(role) {
    return role === LEGACY_SUPERADMIN ? ROLE_DEVELOPER : role;
}

var adminsCol = collection(db, "admins");

export function isAdminRole(role) {
    return role === ROLE_DEVELOPER || role === ROLE_ADMIN;
}

/*
 * Determines the signed-in user's role by checking Firestore, keyed by their
 * (lowercased) email. Requires a verified email — see Firestore security rules.
 */
export async function getCurrentRole() {
    var user = auth.currentUser;
    if (!user || !user.emailVerified || !user.email) return null;
    var email = user.email.toLowerCase();
    try {
        var adminSnap = await getDoc(doc(db, "admins", email));
        if (adminSnap.exists()) {
            return normaliseRole(adminSnap.data().role) === ROLE_DEVELOPER ? ROLE_DEVELOPER : ROLE_ADMIN;
        }
    } catch (e) { /* not an admin, or not yet permitted to read — fall through */ }
    try {
        var teacherSnap = await getDoc(doc(db, "teachers", email));
        if (teacherSnap.exists() && teacherSnap.data().status === "approved") {
            return ROLE_TEACHER;
        }
    } catch (e) { /* not an approved teacher */ }
    return null;
}

export async function listApprovedTeachers() {
    try {
        var snap = await getDocs(collection(db, "teachers"));
        var profSnap = await getDocs(collection(db, "staffProfiles"));
        var names = {};
        profSnap.forEach(function (d) { names[d.id.toLowerCase()] = d.data().username || ""; });
        var list = [];
        snap.forEach(function (d) {
            if (d.data().status === "approved") {
                list.push(Object.assign({ email: d.id, name: names[d.id.toLowerCase()] || "" }, d.data()));
            }
        });
        list.sort(function (a, b) { return (a.email || "").localeCompare(b.email || ""); });
        return list;
    } catch (e) {
        return [];
    }
}

/* A teacher's agreed monthly salary, stored on their own teachers/{email} doc.
   Paying it writes a separate expenses record — this field is only the standing
   figure, so changing it never rewrites what was already paid out. */
export async function setTeacherSalary(email, amount) {
    try {
        await updateDoc(doc(db, "teachers", email.toLowerCase().trim()), { monthlySalary: Number(amount) || 0 });
        return { ok: true };
    } catch (err) {
        return { ok: false, code: (err && err.code) || "upstream_error" };
    }
}

/* Revokes a teacher's access by removing their teachers/{email} doc. Their
   login still exists and their students keep pointing at them, so reinstating
   is just re-adding them — but getCurrentRole() will no longer return a role,
   which is what actually locks them out. */
export async function revokeTeacher(email) {
    try {
        await deleteDoc(doc(db, "teachers", email.toLowerCase().trim()));
        return { ok: true };
    } catch (err) {
        return { ok: false, code: (err && err.code) || "upstream_error" };
    }
}

export async function listAdmins() {
    var snap = await getDocs(adminsCol);
    var list = [];
    snap.forEach(function (d) {
        var data = d.data();
        list.push(Object.assign({ email: d.id }, data, { role: normaliseRole(data.role) }));
    });
    list.sort(function (a, b) { return (a.email || "").localeCompare(b.email || ""); });
    return list;
}

export async function addAdmin(email, role) {
    email = email.toLowerCase().trim();
    try {
        await setDoc(doc(db, "admins", email), {
            email: email,
            role: role || ROLE_ADMIN,
            addedAt: new Date().toISOString(),
            addedBy: (auth.currentUser && auth.currentUser.email) || "",
        });
        return { ok: true };
    } catch (err) {
        return { ok: false, code: (err && err.code) || "upstream_error" };
    }
}

export async function setAdminRole(email, role) {
    try {
        await updateDoc(doc(db, "admins", email), { role: role });
        return { ok: true };
    } catch (err) {
        return { ok: false, code: (err && err.code) || "upstream_error" };
    }
}

export async function removeAdminDoc(email) {
    try {
        await deleteDoc(doc(db, "admins", email));
        return { ok: true };
    } catch (err) {
        return { ok: false, code: (err && err.code) || "upstream_error" };
    }
}

/* Rewrites any admins/{email} still holding the old "superadmin" string to
   "developer". Runs when a developer opens Manage admins — they are the only
   role the rules permit to write that collection, and the only one who can see
   the panel. Idempotent, and writes nothing once every document is migrated. */
export async function migrateLegacyDeveloperRole() {
    try {
        var snap = await getDocs(adminsCol);
        var writes = [];
        snap.forEach(function (d) {
            if (d.data().role === LEGACY_SUPERADMIN) {
                writes.push(updateDoc(doc(db, "admins", d.id), { role: ROLE_DEVELOPER }));
            }
        });
        await Promise.all(writes);
        return { ok: true, migrated: writes.length };
    } catch (err) {
        return { ok: false, code: (err && err.code) || "upstream_error" };
    }
}
