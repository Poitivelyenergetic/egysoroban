import {
    collection, doc, getDocs, addDoc, updateDoc, deleteDoc,
} from "./fs.js";
import { db } from "./firebase-init.js";

var classesCol = collection(db, "classes");

export async function loadClasses() {
    try {
        var snap = await getDocs(classesCol);
        var list = [];
        snap.forEach(function (d) { list.push(Object.assign({ id: d.id }, d.data())); });
        list.sort(function (a, b) {
            var day = (Number(a.dayOfWeek) || 0) - (Number(b.dayOfWeek) || 0);
            if (day !== 0) return day;
            return (a.startTime || "").localeCompare(b.startTime || "");
        });
        return list;
    } catch (e) {
        return [];
    }
}

export async function addClass(data) {
    try {
        var ref = await addDoc(classesCol, Object.assign({ active: true, createdAt: new Date().toISOString() }, data));
        return { ok: true, id: ref.id };
    } catch (err) {
        return { ok: false, code: (err && err.code) || "upstream_error" };
    }
}

export async function updateClass(id, fields) {
    try {
        await updateDoc(doc(db, "classes", id), fields);
        return { ok: true };
    } catch (err) {
        return { ok: false, code: (err && err.code) || "upstream_error" };
    }
}

export async function deleteClass(id) {
    try {
        await deleteDoc(doc(db, "classes", id));
        return { ok: true };
    } catch (err) {
        return { ok: false, code: (err && err.code) || "upstream_error" };
    }
}
