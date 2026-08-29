import {
    collection, doc, query, where, orderBy, limit,
    getDoc as _getDoc, getDocs as _getDocs, getCountFromServer as _getCountFromServer,
    addDoc as _addDoc, setDoc as _setDoc, updateDoc as _updateDoc, deleteDoc as _deleteDoc,
    runTransaction as _runTransaction,
    arrayUnion, arrayRemove, increment, serverTimestamp, documentId,
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";
import { countRead, countWrite, countDelete } from "./usage-meter.js";

/* The one door to Firestore for the rest of the app.
 *
 * Every data module imports from here instead of the CDN, so each read and
 * write is counted exactly once as it happens. That is what turns the Database
 * limits panel from an estimate into a measurement — there is no other way to
 * get real numbers into a browser, since Google's own meters need server
 * credentials.
 *
 * Only usage-meter.js still imports the SDK directly, and deliberately: if the
 * meter's own flush went through these wrappers it would count itself and never
 * settle. It adds its own write back to the tally by hand instead.
 *
 * Each wrapper counts AFTER the call resolves, so an operation rejected by the
 * security rules is not counted. Firestore can still bill some denied requests,
 * which makes these figures a slight undercount — the right direction for a
 * gauge you don't want giving false comfort, and the panel already presents the
 * total as a floor rather than an exact bill. */

export async function getDoc(ref) {
    var snap = await _getDoc(ref);
    /* A miss still costs a read — Firestore bills the lookup, not the result. */
    countRead(1);
    return snap;
}

export async function getDocs(q) {
    var snap = await _getDocs(q);
    /* Billed per document returned, with a minimum of one for an empty result. */
    countRead(Math.max(snap.size, 1));
    return snap;
}

export async function getCountFromServer(q) {
    var snap = await _getCountFromServer(q);
    /* An aggregation is billed as roughly one read per 1,000 index entries
       scanned, not one per document — which is the whole reason the limits
       panel counts with it. One is the right approximation at this scale. */
    countRead(1);
    return snap;
}

export async function addDoc(ref, data) {
    var out = await _addDoc(ref, data);
    countWrite(1);
    return out;
}

export async function setDoc(ref, data, options) {
    var out = options === undefined ? await _setDoc(ref, data) : await _setDoc(ref, data, options);
    countWrite(1);
    return out;
}

export async function updateDoc(ref, data) {
    var out = await _updateDoc(ref, data);
    countWrite(1);
    return out;
}

export async function deleteDoc(ref) {
    var out = await _deleteDoc(ref);
    countDelete(1);
    return out;
}

/* Counted as one read and one write: the callback reads a document and writes
   it back. An approximation — a transaction that touches more would undercount
   — but the only one in the app (booking a trial slot) does exactly that. */
export async function runTransaction(dbRef, fn) {
    var out = await _runTransaction(dbRef, fn);
    countRead(1);
    countWrite(1);
    return out;
}

/* Pass-throughs: these build queries and field values, they don't touch the
   network, so there is nothing to count. */
export {
    collection, doc, query, where, orderBy, limit,
    arrayUnion, arrayRemove, increment, serverTimestamp, documentId,
};
