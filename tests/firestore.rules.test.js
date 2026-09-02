import { readFileSync } from "node:fs";
import { before, after, describe, it } from "node:test";
import { initializeTestEnvironment, assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, updateDoc, deleteDoc } from "firebase/firestore";

var testEnv;

before(async function () {
    testEnv = await initializeTestEnvironment({
        projectId: "egysoroban-731cd",
        firestore: {
            rules: readFileSync(new URL("../firestore.rules", import.meta.url), "utf8"),
            host: "127.0.0.1",
            port: 8080,
        },
    });
});

after(async function () {
    await testEnv.cleanup();
});

async function seed(fn) {
    await testEnv.withSecurityRulesDisabled(async function (ctx) {
        await fn(ctx.firestore());
    });
}

describe("students/{id}", function () {
    var STUDENT_ID = "stu1";
    var TEACHER_EMAIL = "teacher@egysoroban.com";
    var OTHER_TEACHER_EMAIL = "other-teacher@egysoroban.com";
    var PARENT_EMAIL = "parent@egysoroban.com";
    var ADMIN_EMAIL = "admin@egysoroban.com";

    before(async function () {
        await testEnv.clearFirestore();
        await seed(async function (db) {
            await setDoc(doc(db, "admins", ADMIN_EMAIL), { role: "admin" });
            await setDoc(doc(db, "teachers", TEACHER_EMAIL), { status: "approved" });
            await setDoc(doc(db, "teachers", OTHER_TEACHER_EMAIL), { status: "approved" });
            await setDoc(doc(db, "students", STUDENT_ID), {
                name: "Test Student",
                teacherEmail: TEACHER_EMAIL,
                parentEmail: PARENT_EMAIL,
                studentEmail: "",
                levelIndex: 1,
            });
        });
    });

    it("denies an anonymous read", async function () {
        var anon = testEnv.unauthenticatedContext();
        await assertFails(getDoc(doc(anon.firestore(), "students", STUDENT_ID)));
    });

    it("denies an anonymous write", async function () {
        var anon = testEnv.unauthenticatedContext();
        await assertFails(updateDoc(doc(anon.firestore(), "students", STUDENT_ID), { levelIndex: 2 }));
    });

    it("denies a teacher who is not assigned to this student", async function () {
        var other = testEnv.authenticatedContext(OTHER_TEACHER_EMAIL, {
            email: OTHER_TEACHER_EMAIL, email_verified: true,
        });
        await assertFails(getDoc(doc(other.firestore(), "students", STUDENT_ID)));
        await assertFails(updateDoc(doc(other.firestore(), "students", STUDENT_ID), { levelIndex: 2 }));
    });

    it("denies an assigned teacher writing outside their allowed fields", async function () {
        var teacher = testEnv.authenticatedContext(TEACHER_EMAIL, {
            email: TEACHER_EMAIL, email_verified: true,
        });
        await assertFails(updateDoc(doc(teacher.firestore(), "students", STUDENT_ID), { teacherEmail: OTHER_TEACHER_EMAIL }));
    });

    it("allows the assigned teacher to read and update allowed progress fields", async function () {
        var teacher = testEnv.authenticatedContext(TEACHER_EMAIL, {
            email: TEACHER_EMAIL, email_verified: true,
        });
        await assertSucceeds(getDoc(doc(teacher.firestore(), "students", STUDENT_ID)));
        await assertSucceeds(updateDoc(doc(teacher.firestore(), "students", STUDENT_ID), { levelIndex: 2 }));
    });

    it("allows the linked parent to read but not write", async function () {
        var parent = testEnv.authenticatedContext(PARENT_EMAIL, {
            email: PARENT_EMAIL, email_verified: true,
        });
        await assertSucceeds(getDoc(doc(parent.firestore(), "students", STUDENT_ID)));
        await assertFails(updateDoc(doc(parent.firestore(), "students", STUDENT_ID), { levelIndex: 2 }));
    });

    it("allows an admin full access", async function () {
        var admin = testEnv.authenticatedContext(ADMIN_EMAIL, {
            email: ADMIN_EMAIL, email_verified: true,
        });
        await assertSucceeds(getDoc(doc(admin.firestore(), "students", STUDENT_ID)));
        await assertSucceeds(updateDoc(doc(admin.firestore(), "students", STUDENT_ID), { name: "Renamed" }));
    });
});

describe("parentAccounts/{email}", function () {
    var OWNER_EMAIL = "owner-parent@egysoroban.com";
    var STRANGER_EMAIL = "stranger@egysoroban.com";
    var ADMIN_EMAIL = "admin2@egysoroban.com";

    before(async function () {
        await testEnv.clearFirestore();
        await seed(async function (db) {
            await setDoc(doc(db, "admins", ADMIN_EMAIL), { role: "admin" });
            await setDoc(doc(db, "parentAccounts", OWNER_EMAIL), { name: "Owner", group: "parent" });
        });
    });

    it("denies an anonymous read", async function () {
        var anon = testEnv.unauthenticatedContext();
        await assertFails(getDoc(doc(anon.firestore(), "parentAccounts", OWNER_EMAIL)));
    });

    it("denies an anonymous write", async function () {
        var anon = testEnv.unauthenticatedContext();
        await assertFails(setDoc(doc(anon.firestore(), "parentAccounts", OWNER_EMAIL), { name: "Hacked" }));
    });

    it("denies a signed-in stranger reading or writing someone else's account", async function () {
        var stranger = testEnv.authenticatedContext(STRANGER_EMAIL, {
            email: STRANGER_EMAIL, email_verified: true,
        });
        await assertFails(getDoc(doc(stranger.firestore(), "parentAccounts", OWNER_EMAIL)));
        await assertFails(setDoc(doc(stranger.firestore(), "parentAccounts", OWNER_EMAIL), { name: "Hacked" }));
    });

    it("allows the verified owner to read and write their own account", async function () {
        var owner = testEnv.authenticatedContext(OWNER_EMAIL, {
            email: OWNER_EMAIL, email_verified: true,
        });
        await assertSucceeds(getDoc(doc(owner.firestore(), "parentAccounts", OWNER_EMAIL)));
        await assertSucceeds(setDoc(doc(owner.firestore(), "parentAccounts", OWNER_EMAIL), { name: "Owner", group: "parent" }));
    });

    it("allows staff to read but the write rule stays owner-only", async function () {
        var admin = testEnv.authenticatedContext(ADMIN_EMAIL, {
            email: ADMIN_EMAIL, email_verified: true,
        });
        await assertSucceeds(getDoc(doc(admin.firestore(), "parentAccounts", OWNER_EMAIL)));
        await assertFails(setDoc(doc(admin.firestore(), "parentAccounts", OWNER_EMAIL), { name: "Edited by admin" }));
    });
});

describe("expenses/{id} (admin-only, not just any staff)", function () {
    var EXPENSE_ID = "exp1";
    var ADMIN_EMAIL = "admin3@egysoroban.com";
    var TEACHER_EMAIL = "finance-curious-teacher@egysoroban.com";

    before(async function () {
        await testEnv.clearFirestore();
        await seed(async function (db) {
            await setDoc(doc(db, "admins", ADMIN_EMAIL), { role: "admin" });
            await setDoc(doc(db, "teachers", TEACHER_EMAIL), { status: "approved" });
            await setDoc(doc(db, "expenses", EXPENSE_ID), { label: "Rent", amount: 1000 });
        });
    });

    it("denies an anonymous read", async function () {
        var anon = testEnv.unauthenticatedContext();
        await assertFails(getDoc(doc(anon.firestore(), "expenses", EXPENSE_ID)));
    });

    it("denies an anonymous write", async function () {
        var anon = testEnv.unauthenticatedContext();
        await assertFails(setDoc(doc(anon.firestore(), "expenses", "exp-anon"), { label: "x", amount: 1 }));
    });

    it("denies an approved teacher (staff, but not admin/developer)", async function () {
        var teacher = testEnv.authenticatedContext(TEACHER_EMAIL, {
            email: TEACHER_EMAIL, email_verified: true,
        });
        await assertFails(getDoc(doc(teacher.firestore(), "expenses", EXPENSE_ID)));
        await assertFails(setDoc(doc(teacher.firestore(), "expenses", "exp-teacher"), { label: "x", amount: 1 }));
    });

    it("allows an admin full access", async function () {
        var admin = testEnv.authenticatedContext(ADMIN_EMAIL, {
            email: ADMIN_EMAIL, email_verified: true,
        });
        await assertSucceeds(getDoc(doc(admin.firestore(), "expenses", EXPENSE_ID)));
        await assertSucceeds(updateDoc(doc(admin.firestore(), "expenses", EXPENSE_ID), { amount: 1200 }));
        await assertSucceeds(deleteDoc(doc(admin.firestore(), "expenses", EXPENSE_ID)));
    });
});
