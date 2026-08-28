import {
    collection, doc, getDocs, addDoc, deleteDoc,
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";
import { db, auth } from "./firebase-init.js";

var paymentsCol = collection(db, "payments");

/* Tuition is billed monthly, so every payment is tagged with the month it
   covers ("2026-08") rather than only the date it was handed over — a family
   paying August's fee in September still counts against August. */
export function periodKey(date) {
    var d = date ? new Date(date) : new Date();
    var month = d.getMonth() + 1;
    return d.getFullYear() + "-" + (month < 10 ? "0" + month : String(month));
}

export function periodLabel(period, lang) {
    var parts = String(period || "").split("-");
    if (parts.length !== 2) return period || "";
    var d = new Date(Number(parts[0]), Number(parts[1]) - 1, 1);
    try {
        return d.toLocaleDateString(lang === "ar" ? "ar-EG" : "en-GB", { month: "long", year: "numeric" });
    } catch (e) {
        return period;
    }
}

/* Month name only, for chart axis labels. Built from the locale rather than
   trimming the year off periodLabel() with a regex — \d never matches the
   Arabic-Indic digits ar-EG produces, so the year would survive in Arabic. */
export function periodShortLabel(period, lang) {
    var parts = String(period || "").split("-");
    if (parts.length !== 2) return period || "";
    var d = new Date(Number(parts[0]), Number(parts[1]) - 1, 1);
    try {
        return d.toLocaleDateString(lang === "ar" ? "ar-EG" : "en-GB", { month: "short" });
    } catch (e) {
        return period;
    }
}

/* The last `count` period keys, newest last — used for the revenue trend. */
export function recentPeriods(count) {
    var out = [];
    var now = new Date();
    for (var i = count - 1; i >= 0; i--) {
        out.push(periodKey(new Date(now.getFullYear(), now.getMonth() - i, 1)));
    }
    return out;
}

export async function loadPayments() {
    try {
        var snap = await getDocs(paymentsCol);
        var list = [];
        snap.forEach(function (d) { list.push(Object.assign({ id: d.id }, d.data())); });
        list.sort(function (a, b) { return (b.paidAt || "").localeCompare(a.paidAt || ""); });
        return list;
    } catch (e) {
        return [];
    }
}

export async function addPayment(data) {
    try {
        var ref = await addDoc(paymentsCol, Object.assign({
            currency: "EGP",
            paidAt: new Date().toISOString(),
            recordedBy: (auth.currentUser && auth.currentUser.email) || "",
        }, data));
        return { ok: true, id: ref.id };
    } catch (err) {
        return { ok: false, code: (err && err.code) || "upstream_error" };
    }
}

export async function deletePayment(id) {
    try {
        await deleteDoc(doc(db, "payments", id));
        return { ok: true };
    } catch (err) {
        return { ok: false, code: (err && err.code) || "upstream_error" };
    }
}
