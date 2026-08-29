import {
    collection, doc, getDocs, addDoc, deleteDoc,
} from "./fs.js";
import { db, auth } from "./firebase-init.js";

var expensesCol = collection(db, "expenses");

/* Money going out, so the academy can be judged on what it keeps rather than
   only on what it collects. Tagged by the month it belongs to, exactly like a
   tuition payment — an August salary paid in early September is an August
   cost, or the monthly figures wouldn't line up against income. */
export var EXPENSE_CATEGORIES = ["salary", "rent", "materials", "utilities", "marketing", "other"];

export async function loadExpenses() {
    try {
        var snap = await getDocs(expensesCol);
        var list = [];
        snap.forEach(function (d) { list.push(Object.assign({ id: d.id }, d.data())); });
        list.sort(function (a, b) { return (b.paidAt || "").localeCompare(a.paidAt || ""); });
        return list;
    } catch (e) {
        return [];
    }
}

export async function addExpense(data) {
    try {
        var ref = await addDoc(expensesCol, Object.assign({
            currency: "EGP",
            paidAt: new Date().toISOString(),
            recordedBy: (auth.currentUser && auth.currentUser.email) || "",
        }, data));
        return { ok: true, id: ref.id };
    } catch (err) {
        return { ok: false, code: (err && err.code) || "upstream_error" };
    }
}

export async function deleteExpense(id) {
    try {
        await deleteDoc(doc(db, "expenses", id));
        return { ok: true };
    } catch (err) {
        return { ok: false, code: (err && err.code) || "upstream_error" };
    }
}
