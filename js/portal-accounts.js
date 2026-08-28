import {
    collection, doc, getDocs, setDoc,
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";
import { db } from "./firebase-init.js";

export async function recordPortalAccount(role, email, name) {
    var col = role === "student" ? "studentAccounts" : "parentAccounts";
    var normalized = email.toLowerCase().trim();
    try {
        await setDoc(doc(db, col, normalized), {
            email: normalized, name: (name || "").trim(), createdAt: new Date().toISOString(),
        });
        return { ok: true };
    } catch (err) {
        return { ok: false, code: (err && err.code) || "upstream_error" };
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
