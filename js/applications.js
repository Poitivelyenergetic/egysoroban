import {
    collection, getDocs, addDoc, setDoc, updateDoc, deleteDoc, doc,
} from "./fs.js";
import { db } from "./firebase-init.js";
import { state } from "./state.js";

/*
 * Public visitors may only create applications (the apply form).
 * Reading, updating and deleting requires a signed-in admin — see
 * Firestore security rules in the Firebase console.
 */
var applicationsCol = collection(db, "studentApplications");

export async function loadApplications() {
    if (!state.isSignedIn) return;
    try {
        var snap = await getDocs(applicationsCol);
        var list = [];
        snap.forEach(function (d) { list.push(Object.assign({ id: d.id }, d.data())); });
        state.applications = list;
    } catch (e) {
        /* likely a permissions error if not signed in yet — leave state as-is */
    }
}

export async function addApplicationDoc(app) {
    try {
        var docRef = await addDoc(applicationsCol, app);
        var withId = Object.assign({ id: docRef.id }, app);
        state.applications = state.applications.concat([withId]);
        return { ok: true, app: withId };
    } catch (err) {
        return { ok: false, code: (err && err.code) || "upstream_error" };
    }
}

export async function updateApplicationDoc(id, fields) {
    try {
        await updateDoc(doc(db, "studentApplications", id), fields);
        state.applications = state.applications.map(function (a) {
            return a.id === id ? Object.assign({}, a, fields) : a;
        });
        return { ok: true };
    } catch (err) {
        return { ok: false, code: (err && err.code) || "upstream_error" };
    }
}

export async function deleteApplicationDoc(id) {
    try {
        await deleteDoc(doc(db, "studentApplications", id));
        state.applications = state.applications.filter(function (a) { return a.id !== id; });
        return { ok: true };
    } catch (err) {
        return { ok: false, code: (err && err.code) || "upstream_error" };
    }
}

/* One-time migration: copies every doc from the old "applications" collection
   (the pre-rename name) into "studentApplications" under the same ID, so
   nothing is lost or duplicated. Safe to run more than once — a doc ID
   already present in studentApplications is skipped rather than overwritten,
   so any status/notes an admin has since added there survive a re-run. The
   old collection is left in place untouched as a backup; nothing is deleted. */
export async function migrateOldApplications() {
    try {
        var oldSnap = await getDocs(collection(db, "applications"));
        var newSnap = await getDocs(collection(db, "studentApplications"));
        var existingIds = {};
        newSnap.forEach(function (d) { existingIds[d.id] = true; });
        var count = 0;
        for (var i = 0; i < oldSnap.docs.length; i++) {
            var d = oldSnap.docs[i];
            if (existingIds[d.id]) continue;
            await setDoc(doc(db, "studentApplications", d.id), d.data());
            count++;
        }
        return { ok: true, count: count };
    } catch (err) {
        return { ok: false, code: (err && err.code) || "upstream_error" };
    }
}
