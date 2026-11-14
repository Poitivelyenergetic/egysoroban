// Checks for the online classroom: only the families listed on a class can open
// its room, only its own teacher can set the link or go live, and nothing but
// a Daily room link can be stored.
import { initializeTestEnvironment, assertSucceeds, assertFails } from "@firebase/rules-unit-testing";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { test } from "node:test";
import assert from "node:assert/strict";

// Must match emailKey() in js/enrolled-emails.js and roomKey() in the rules.
const key = (email) => createHash("sha256").update("egysoroban:" + email.toLowerCase().trim()).digest("hex");

test("classroom rules", async () => {
const env = await initializeTestEnvironment({
  projectId: "egysoroban-731cd",
  firestore: { rules: readFileSync(new URL("../firestore.rules", import.meta.url), "utf8") },
});
await env.withSecurityRulesDisabled(async (ctx) => {
  const db = ctx.firestore();
  await db.doc("admins/boss@x.com").set({ role: "admin" });
  await db.doc("teachers/teach@x.com").set({ status: "approved" });
  await db.doc("teachers/other@x.com").set({ status: "approved" });
  await db.doc("classes/c1").set({ teacherEmail: "teach@x.com", dayOfWeek: 6, startTime: "17:00" });
  await db.doc("classes/c2").set({ teacherEmail: "other@x.com", dayOfWeek: 1, startTime: "18:00" });
  await db.doc("classRooms/c1").set({
    roomUrl: "https://egysoroban.daily.co/level-3", live: false,
    memberKeys: [key("mom@x.com"), key("kid@x.com")], dayOfWeek: 6, startTime: "17:00",
  });
  await db.doc("classRooms/c2").set({ roomUrl: "", live: false, memberKeys: [] });
});

const ctx = (email, verified = true) =>
  env.authenticatedContext(email, { email, email_verified: verified }).firestore();
const anon = env.unauthenticatedContext().firestore();
const mom = ctx("mom@x.com");
const momUpper = ctx("Mom@X.com");
const kid = ctx("kid@x.com");
const momUnverified = ctx("mom@x.com", false);
const stranger = ctx("stranger@x.com");
const teacher = ctx("teach@x.com");
const otherTeacher = ctx("other@x.com");
const admin = ctx("boss@x.com");

const results = [];
async function check(name, p, ok) {
  try { await (ok ? assertSucceeds(p) : assertFails(p)); results.push(["PASS", name]); }
  catch (e) { results.push(["FAIL", name, e.message]); }
}

// Who can open a room
await check("listed parent opens their class room", mom.doc("classRooms/c1").get(), true);
await check("listed parent email in other case still works", momUpper.doc("classRooms/c1").get(), true);
await check("listed student opens their class room", kid.doc("classRooms/c1").get(), true);
await check("unverified parent cannot open room", momUnverified.doc("classRooms/c1").get(), false);
await check("parent cannot open another class room", mom.doc("classRooms/c2").get(), false);
await check("stranger cannot open a room", stranger.doc("classRooms/c1").get(), false);
await check("signed-out visitor cannot open a room", anon.doc("classRooms/c1").get(), false);
await check("parent cannot list rooms", mom.collection("classRooms").get(), false);
await check("teacher lists rooms", teacher.collection("classRooms").get(), true);
await check("admin opens any room", admin.doc("classRooms/c2").get(), true);

// What a family can change: nothing
await check("parent cannot go live", mom.doc("classRooms/c1").update({ live: true }), false);
await check("parent cannot add themselves to a class", stranger.doc("classRooms/c1").update({ memberKeys: [key("stranger@x.com")] }), false);

// Teacher controls, own class only
await check("teacher goes live on own class", teacher.doc("classRooms/c1").update({ live: true, liveChangedAt: "t" }), true);
await check("teacher sets own class link", teacher.doc("classRooms/c1").update({ roomUrl: "https://egysoroban.daily.co/new-room" }), true);
await check("teacher clears own class link", teacher.doc("classRooms/c1").update({ roomUrl: "" }), true);
await check("teacher cannot change who is in the class", teacher.doc("classRooms/c1").update({ memberKeys: [key("spy@x.com")] }), false);
await check("teacher cannot move the schedule", teacher.doc("classRooms/c1").update({ startTime: "03:00" }), false);
await check("teacher cannot go live on someone else's class", teacher.doc("classRooms/c2").update({ live: true }), false);
await check("teacher cannot delete a room", teacher.doc("classRooms/c1").delete(), false);
await check("teacher creates room for own new class (link only)", (async () => {
  await env.withSecurityRulesDisabled(async (c) => c.firestore().doc("classes/c3").set({ teacherEmail: "teach@x.com" }));
  return teacher.doc("classRooms/c3").set({ roomUrl: "https://egysoroban.daily.co/c3", live: false });
})(), true);
await check("teacher cannot create a room with members", (async () => {
  await env.withSecurityRulesDisabled(async (c) => c.firestore().doc("classes/c4").set({ teacherEmail: "teach@x.com" }));
  return teacher.doc("classRooms/c4").set({ roomUrl: "", memberKeys: [key("spy@x.com")] });
})(), false);
await check("teacher cannot create room for another teacher's class", otherTeacher.doc("classRooms/c1").set({ live: true }, { merge: true }), false);

// Only Daily room links can be stored
await check("non-Daily link is rejected", admin.doc("classRooms/c1").update({ roomUrl: "https://evil.example.com/x" }), false);
await check("javascript: link is rejected", teacher.doc("classRooms/c1").update({ roomUrl: "javascript:alert(1)" }), false);
await check("look-alike domain is rejected", admin.doc("classRooms/c1").update({ roomUrl: "https://x.daily.co.evil.com/r" }), false);
await check("link with extra path is rejected", admin.doc("classRooms/c1").update({ roomUrl: "https://x.daily.co/r/../../evil" }), false);
await check("live must be true/false", teacher.doc("classRooms/c1").update({ live: "yes" }), false);

// Admin manages members and schedule
await check("admin sets members and schedule", admin.doc("classRooms/c2").set({
  roomUrl: "https://egysoroban.daily.co/level-1", live: false, memberKeys: [key("mom@x.com")],
  dayOfWeek: 1, startTime: "18:00", durationMins: 60,
}, { merge: true }), true);
await check("newly added parent can now open that room", mom.doc("classRooms/c2").get(), true);
await check("admin deletes a room", admin.doc("classRooms/c3").delete(), true);

// The class timetable itself stays staff-only
await check("parent still cannot read the timetable", mom.doc("classes/c1").get(), false);

await env.cleanup();
const failed = results.filter(r => r[0] === "FAIL");
for (const r of results) console.log(r.join(" | "));
assert.equal(failed.length, 0, failed.map(f => f[1] + ": " + f[2]).join("\n"));
});
