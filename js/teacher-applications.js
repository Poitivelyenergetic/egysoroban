import {
    collection, doc, getDocs, addDoc, updateDoc, setDoc,
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";
import { db } from "./firebase-init.js";

var teacherAppsCol = collection(db, "teacherApplications");

export async function loadTeacherApplications() {
    try {
        var snap = await getDocs(teacherAppsCol);
        var list = [];
        snap.forEach(function (d) { list.push(Object.assign({ id: d.id }, d.data())); });
        list.sort(function (a, b) { return (b.submittedAt || "").localeCompare(a.submittedAt || ""); });
        return list;
    } catch (e) {
        return [];
    }
}

export async function addTeacherApplication(app) {
    try {
        await addDoc(teacherAppsCol, app);
        return { ok: true };
    } catch (err) {
        return { ok: false, code: (err && err.code) || "upstream_error" };
    }
}

/* Approving both marks the application approved AND creates the teachers/{email}
   access-control doc that Firestore rules check to grant teacher permissions. */
export async function approveTeacherApplication(id, email) {
    email = email.toLowerCase().trim();
    try {
        await updateDoc(doc(db, "teacherApplications", id), { status: "approved" });
        await setDoc(doc(db, "teachers", email), {
            email: email,
            status: "approved",
            approvedAt: new Date().toISOString(),
        });
        return { ok: true };
    } catch (err) {
        return { ok: false, code: (err && err.code) || "upstream_error" };
    }
}

export async function rejectTeacherApplication(id) {
    try {
        await updateDoc(doc(db, "teacherApplications", id), { status: "rejected" });
        return { ok: true };
    } catch (err) {
        return { ok: false, code: (err && err.code) || "upstream_error" };
    }
}

/* Self-service signups (username/email/phone/password, created via the "Create your
   staff account" form) that don't yet have an approved teachers/{email} doc — i.e.
   people who can log in but have no dashboard access until an admin approves them. */
export async function loadStaffSignups() {
    try {
        var profSnap = await getDocs(collection(db, "staffProfiles"));
        var teacherSnap = await getDocs(collection(db, "teachers"));
        var approvedTeachers = {};
        teacherSnap.forEach(function (d) {
            if (d.data().status === "approved") approvedTeachers[d.id] = true;
        });
        var list = [];
        profSnap.forEach(function (d) {
            var email = d.id.toLowerCase();
            if (approvedTeachers[email]) return;
            var data = d.data();
            list.push({
                id: "signup:" + email, email: email, name: data.username || "",
                phone: data.phone || "", submittedAt: data.createdAt || "", isSignup: true,
            });
        });
        list.sort(function (a, b) { return (b.submittedAt || "").localeCompare(a.submittedAt || ""); });
        return list;
    } catch (e) {
        return [];
    }
}

export async function approveStaffSignup(email) {
    email = email.toLowerCase().trim();
    try {
        await setDoc(doc(db, "teachers", email), {
            email: email, status: "approved", approvedAt: new Date().toISOString(),
        });
        return { ok: true };
    } catch (err) {
        return { ok: false, code: (err && err.code) || "upstream_error" };
    }
}
