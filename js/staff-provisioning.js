import { initializeApp, deleteApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";
import {
    getAuth, createUserWithEmailAndPassword, sendEmailVerification, signOut, updateProfile,
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";
import { db, auth, firebaseConfig } from "./firebase-init.js";
import { ROLE_DEVELOPER, ROLE_ADMIN, ROLE_TEACHER } from "./roles.js";

/*
 * Creates a login for a new staff member without disturbing the admin who is
 * doing it.
 *
 * createUserWithEmailAndPassword signs you in as whoever it just created, so
 * calling it on the main Firebase app would silently kick the admin out of
 * their own session. Instead we spin up a second, throwaway Firebase app that
 * has its own auth instance, create the account there, then sign that instance
 * out and dispose of it. The admin's session on the primary app is untouched.
 *
 * The new person still has to verify their email before getCurrentRole() will
 * grant them anything — that check lives in the Firestore rules, not just the
 * client — so a verification mail goes out as part of this.
 */
async function createAuthAccount(email, password, name) {
    var secondary = initializeApp(firebaseConfig, "staff-provisioning-" + Date.now());
    try {
        var secondaryAuth = getAuth(secondary);
        var cred = await createUserWithEmailAndPassword(secondaryAuth, email, password);
        try { await updateProfile(cred.user, { displayName: name }); } catch (e) { /* cosmetic */ }
        try { await sendEmailVerification(cred.user); } catch (e) { /* they can resend from the login screen */ }
        await signOut(secondaryAuth);
        return { created: true };
    } catch (err) {
        var code = (err && err.code) || "upstream_error";
        /* An existing account is not a failure: the person may have signed
           themselves up already and just needs the role granting. */
        if (code === "auth/email-already-in-use") return { created: false };
        return { created: false, code: code };
    } finally {
        try { await deleteApp(secondary); } catch (e) { /* already gone */ }
    }
}

export async function provisionStaffAccount(details) {
    var email = (details.email || "").trim().toLowerCase();
    var name = (details.name || "").trim();
    var phone = (details.phone || "").trim();
    var role = details.role;
    var password = details.password || "";

    if (!email || !name) return { ok: false, code: "missing_fields" };
    if (password.length < 6) return { ok: false, code: "auth/weak-password" };
    if (role !== ROLE_TEACHER && role !== ROLE_ADMIN && role !== ROLE_DEVELOPER) {
        return { ok: false, code: "bad_role" };
    }

    var account = await createAuthAccount(email, password, name);
    if (account.code) return { ok: false, code: account.code };

    var actor = (auth.currentUser && auth.currentUser.email) || "";
    var now = new Date().toISOString();

    try {
        await setDoc(doc(db, "staffProfiles", email), {
            username: name, phone: phone, email: email, createdAt: now, createdBy: actor,
        }, { merge: true });
    } catch (e) {
        /* Non-fatal: the role grant below is what actually gates access, and
           the person can fill their own profile in later. */
    }

    try {
        if (role === ROLE_TEACHER) {
            await setDoc(doc(db, "teachers", email), {
                email: email, status: "approved", approvedAt: now, approvedBy: actor,
            }, { merge: true });
        } else {
            await setDoc(doc(db, "admins", email), {
                email: email, role: role, addedAt: now, addedBy: actor,
            }, { merge: true });
        }
    } catch (err) {
        return { ok: false, code: (err && err.code) || "upstream_error", accountCreated: account.created };
    }

    return { ok: true, accountCreated: account.created };
}
