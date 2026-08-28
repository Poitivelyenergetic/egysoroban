import {
    collection, doc, getDocs, addDoc, updateDoc, deleteDoc, query, where, arrayUnion,
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";
import { db } from "./firebase-init.js";

var studentsCol = collection(db, "students");

export async function loadStudents() {
    try {
        var snap = await getDocs(studentsCol);
        var list = [];
        snap.forEach(function (d) { list.push(Object.assign({ id: d.id }, d.data())); });
        list.sort(function (a, b) { return (a.name || "").localeCompare(b.name || ""); });
        return list;
    } catch (e) {
        return [];
    }
}

export async function loadStudentsForTeacher(email) {
    try {
        var q = query(studentsCol, where("teacherEmail", "==", email.toLowerCase().trim()));
        var snap = await getDocs(q);
        var list = [];
        snap.forEach(function (d) { list.push(Object.assign({ id: d.id }, d.data())); });
        list.sort(function (a, b) { return (a.name || "").localeCompare(b.name || ""); });
        return list;
    } catch (e) {
        return [];
    }
}

/* Matches a signed-in account against either the parentEmail or studentEmail
   field, so the same account system serves both a parent's login and a
   student's own separate login. */
export async function loadStudentsForAccount(email) {
    var normalized = email.toLowerCase().trim();
    try {
        var byParent = await getDocs(query(studentsCol, where("parentEmail", "==", normalized)));
        var byStudent = await getDocs(query(studentsCol, where("studentEmail", "==", normalized)));
        var seen = {};
        var list = [];
        byParent.forEach(function (d) { seen[d.id] = true; list.push(Object.assign({ id: d.id }, d.data())); });
        byStudent.forEach(function (d) { if (!seen[d.id]) list.push(Object.assign({ id: d.id }, d.data())); });
        return list;
    } catch (e) {
        return [];
    }
}

export async function addStudent(data) {
    try {
        var docRef = await addDoc(studentsCol, Object.assign({ examHistory: [] }, data));
        return { ok: true, id: docRef.id };
    } catch (err) {
        return { ok: false, code: (err && err.code) || "upstream_error" };
    }
}

export async function updateStudent(id, fields) {
    try {
        await updateDoc(doc(db, "students", id), fields);
        return { ok: true };
    } catch (err) {
        return { ok: false, code: (err && err.code) || "upstream_error" };
    }
}

export async function addExamResult(id, result) {
    try {
        await updateDoc(doc(db, "students", id), { examHistory: arrayUnion(result) });
        return { ok: true };
    } catch (err) {
        return { ok: false, code: (err && err.code) || "upstream_error" };
    }
}

export async function deleteStudent(id) {
    try {
        await deleteDoc(doc(db, "students", id));
        return { ok: true };
    } catch (err) {
        return { ok: false, code: (err && err.code) || "upstream_error" };
    }
}
