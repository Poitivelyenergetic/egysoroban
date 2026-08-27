import {
    collection, getDocs, addDoc, updateDoc, deleteDoc, doc,
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";
import { db } from "./firebase-init.js";
import { state } from "./state.js";

/*
 * Public visitors may only create applications (the apply form).
 * Reading, updating and deleting requires a signed-in admin — see
 * Firestore security rules in the Firebase console.
 */
var applicationsCol = collection(db, "applications");

export async function loadApplications() {
    if (!state.isAdmin) return;
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
        await updateDoc(doc(db, "applications", id), fields);
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
        await deleteDoc(doc(db, "applications", id));
        state.applications = state.applications.filter(function (a) { return a.id !== id; });
        return { ok: true };
    } catch (err) {
        return { ok: false, code: (err && err.code) || "upstream_error" };
    }
}
