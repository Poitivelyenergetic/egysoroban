import {
    collection, doc, getDocs, addDoc, deleteDoc, runTransaction,
} from "./fs.js";
import { db } from "./firebase-init.js";

var slotsCol = collection(db, "trialSlots");

export async function loadAllSlots() {
    try {
        var snap = await getDocs(slotsCol);
        var list = [];
        snap.forEach(function (d) { list.push(Object.assign({ id: d.id }, d.data())); });
        list.sort(function (a, b) { return (a.dateTime || "").localeCompare(b.dateTime || ""); });
        return list;
    } catch (e) {
        return [];
    }
}

export async function loadOpenSlots(branch) {
    var all = await loadAllSlots();
    var now = new Date().toISOString();
    return all.filter(function (s) {
        return s.active !== false && s.bookedCount < s.capacity && s.dateTime > now && (!branch || s.branch === branch);
    });
}

export async function addSlot(data) {
    try {
        var docRef = await addDoc(slotsCol, Object.assign({ bookedCount: 0, active: true }, data));
        return { ok: true, id: docRef.id };
    } catch (err) {
        return { ok: false, code: (err && err.code) || "upstream_error" };
    }
}

export async function deleteSlot(id) {
    try {
        await deleteDoc(doc(db, "trialSlots", id));
        return { ok: true };
    } catch (err) {
        return { ok: false, code: (err && err.code) || "upstream_error" };
    }
}

export async function bookSlot(id) {
    try {
        await runTransaction(db, async function (tx) {
            var ref = doc(db, "trialSlots", id);
            var snap = await tx.get(ref);
            if (!snap.exists()) throw new Error("not-found");
            var data = snap.data();
            if (data.active === false || data.bookedCount >= data.capacity) throw new Error("full");
            tx.update(ref, { bookedCount: data.bookedCount + 1 });
        });
        return { ok: true };
    } catch (err) {
        return { ok: false, code: (err && err.message) || "upstream_error" };
    }
}
