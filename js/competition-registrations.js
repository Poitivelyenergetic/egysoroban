import {
    collection, doc, getDocs, addDoc, updateDoc, deleteDoc,
} from "./fs.js";
import { db } from "./firebase-init.js";

var col = collection(db, "competitionRegistrations");

export async function loadCompetitionRegistrations() {
    try {
        var snap = await getDocs(col);
        var list = [];
        snap.forEach(function (d) { list.push(Object.assign({ id: d.id }, d.data())); });
        list.sort(function (a, b) { return (b.submittedAt || "").localeCompare(a.submittedAt || ""); });
        return list;
    } catch (e) {
        return [];
    }
}

export async function addCompetitionRegistration(reg) {
    try {
        await addDoc(col, reg);
        return { ok: true };
    } catch (err) {
        return { ok: false, code: (err && err.code) || "upstream_error" };
    }
}

export async function updateCompetitionRegistration(id, fields) {
    try {
        await updateDoc(doc(db, "competitionRegistrations", id), fields);
        return { ok: true };
    } catch (err) {
        return { ok: false, code: (err && err.code) || "upstream_error" };
    }
}

export async function deleteCompetitionRegistration(id) {
    try {
        await deleteDoc(doc(db, "competitionRegistrations", id));
        return { ok: true };
    } catch (err) {
        return { ok: false, code: (err && err.code) || "upstream_error" };
    }
}
