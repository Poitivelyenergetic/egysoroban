// Checks for the hardening pass: who may read child and staff data, the shape
// public forms must have, and the usage meter only ever growing.
import { initializeTestEnvironment, assertSucceeds, assertFails } from "@firebase/rules-unit-testing";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";
import firebase from "firebase/compat/app";

test("hardened rules", async () => {
const env = await initializeTestEnvironment({
  projectId: "egysoroban-731cd",
  firestore: { rules: readFileSync(new URL("../firestore.rules", import.meta.url), "utf8") },
});
await env.withSecurityRulesDisabled(async (ctx) => {
  const db = ctx.firestore();
  await db.doc("admins/boss@x.com").set({ role: "admin" });
  await db.doc("admins/developer1-admin@egysoroban.com").set({ role: "developer" });
  await db.doc("teachers/teach@x.com").set({ status: "approved" });
  await db.doc("staffProfiles/teach@x.com").set({ username: "T", phone: "010" });
  await db.doc("studentApplications/a1").set({ studentName: "Kid", nationalId: "123" });
  await db.doc("studentAccounts/kid@x.com").set({ status: "pending", name: "Kid" });
  await db.doc("studentAccounts/done@x.com").set({ status: "approved", name: "Done" });
  await db.doc("usageDaily/2026-11-01").set({ reads: 10, writes: 5, deletes: 0, day: "2026-11-01", server: { reads: 1 } });
});

const anon = env.unauthenticatedContext().firestore();
const stranger = env.authenticatedContext("s", { email: "stranger@x.com", email_verified: true }).firestore();
const teacher = env.authenticatedContext("t", { email: "teach@x.com", email_verified: true }).firestore();
const admin = env.authenticatedContext("a", { email: "boss@x.com", email_verified: true }).firestore();
const devUnverified = env.authenticatedContext("d", { email: "developer1-admin@egysoroban.com", email_verified: false }).firestore();

const app = {
  branch: "Mansoura", trialSlotId: "", trialDateTime: "", studentNameAr: "", studentNameEn: "Kid",
  studentName: "Kid", dob: "2018-01-01", nationalId: "31801011234567", gender: "m", religion: "",
  nationality: "EG", grade: "2", parentName: "Mom", relationship: "mother", phone: "0100",
  email: "m@x.com", occupation: "", address: "", governorate: "", city: "", schoolName: "",
  schoolType: "", program: "", experience: "", hobbies: "", medical: "", dietary: "", heard: "",
  goals: "", status: "new", notes: "", source: "public", submittedAt: new Date().toISOString(),
};

const results = [];
async function check(name, p, ok) {
  try { await (ok ? assertSucceeds(p) : assertFails(p)); results.push(["PASS", name]); }
  catch (e) { results.push(["FAIL", name, e.message]); }
}

await check("public apply form saves", anon.collection("studentApplications").add(app), true);
await check("apply pre-marked enrolled is blocked", anon.collection("studentApplications").add({ ...app, status: "enrolled" }), false);
await check("apply with studentRecordId is blocked", anon.collection("studentApplications").add({ ...app, studentRecordId: "x" }), false);
await check("apply with huge medical text is blocked", anon.collection("studentApplications").add({ ...app, medical: "x".repeat(3000) }), false);
await check("admin manual application saves", admin.collection("studentApplications").add({ studentName: "K", status: "new", source: "manual" }), true);
await check("stranger manual application blocked", stranger.collection("studentApplications").add({ studentName: "K", status: "new", source: "manual" }), false);
await check("teacher cannot read applications", teacher.collection("studentApplications").get(), false);
await check("admin reads applications", admin.collection("studentApplications").get(), true);
await check("teacher cannot update application", teacher.doc("studentApplications/a1").update({ notes: "x" }), false);

await check("stranger cannot read a staff phone", stranger.doc("staffProfiles/teach@x.com").get(), false);
await check("stranger cannot list staff", stranger.collection("staffProfiles").get(), false);
await check("staff reads own profile", teacher.doc("staffProfiles/teach@x.com").get(), true);
await check("admin lists staff", admin.collection("staffProfiles").get(), true);

await check("unverified dev account is no longer an admin", devUnverified.collection("studentApplications").get(), false);

await check("competition form saves", anon.collection("competitionRegistrations").add({ competition: "WAPR", studentName: "K", nationalId: "1", parentName: "P", phone: "0", email: "e", notes: "", status: "new", submittedAt: "t" }), true);
await check("competition with extra field blocked", anon.collection("competitionRegistrations").add({ competition: "WAPR", status: "approved", submittedAt: "t" }), false);
await check("teacher form saves", anon.collection("teacherApplications").add({ name: "N", email: "e", phone: "0", experience: "", notes: "", status: "new", submittedAt: "t" }), true);

const rec = { name: "Kid", parentEmail: "", studentEmail: "kid@x.com", teacherEmail: "teach@x.com", branch: "", levelIndex: 1, attendedSessions: 0, totalSessions: 0, homeworkCompleted: 0, homeworkAssigned: 0, enrolledAt: "t", source: "portal-signup" };
await check("teacher accepts pending signup", teacher.collection("students").add(rec), true);
await check("teacher cannot set a parentEmail", teacher.collection("students").add({ ...rec, parentEmail: "spy@x.com" }), false);
await check("teacher cannot re-accept approved signup", teacher.collection("students").add({ ...rec, studentEmail: "done@x.com" }), false);

const inc = firebase.firestore.FieldValue.increment;
await check("meter adds to a day", stranger.doc("usageDaily/2026-11-01").set({ reads: inc(3), writes: inc(1), deletes: inc(0), day: "2026-11-01", updatedAt: "t" }, { merge: true }), true);
await check("meter cannot lower a count", stranger.doc("usageDaily/2026-11-01").update({ reads: 0 }), false);
await check("meter cannot touch server summary", stranger.doc("usageDaily/2026-11-01").update({ server: { reads: 999 } }), false);
await check("meter creates a new day", stranger.doc("usageDaily/2026-11-02").set({ reads: inc(1), writes: inc(1), deletes: inc(0), day: "2026-11-02", updatedAt: "t" }, { merge: true }), true);

await env.cleanup();
const failed = results.filter(r => r[0] === "FAIL");
assert.deepEqual(failed, [], failed.map(r => r.slice(1).join(": ")).join("\n"));
});
