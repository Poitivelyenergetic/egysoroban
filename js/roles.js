import {
    doc, getDoc, getDocs, collection, setDoc, updateDoc, deleteDoc,
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";
import { db, auth } from "./firebase-init.js";

export var ROLE_SUPERADMIN = "superadmin";
export var ROLE_ADMIN = "admin";
export var ROLE_TEACHER = "teacher";

var adminsCol = collection(db, "admins");

export function isAdminRole(role) {
    return role === ROLE_SUPERADMIN || role === ROLE_ADMIN;
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
            return adminSnap.data().role === ROLE_SUPERADMIN ? ROLE_SUPERADMIN : ROLE_ADMIN;
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

export async function listAdmins() {
    var snap = await getDocs(adminsCol);
    var list = [];
    snap.forEach(function (d) { list.push(Object.assign({ email: d.id }, d.data())); });
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
