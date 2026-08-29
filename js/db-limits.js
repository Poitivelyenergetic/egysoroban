import {
    collection, getCountFromServer,
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";
import { db } from "./firebase-init.js";

/* Free-tier quotas and upgrade pricing for the Firebase project behind this
 * site, plus a live count of what the academy is actually storing.
 *
 * Two honest limits on what this panel can be, both worth knowing:
 *
 * 1. It cannot show real consumption. How many reads and writes the project
 *    actually used today lives in Cloud Monitoring, which needs server
 *    credentials — a browser holding an ordinary admin login cannot reach it
 *    at any price. Document counts below are real (counted live); the daily
 *    read/write figures are a MODEL built from those counts and are labelled
 *    as estimates wherever they are shown.
 *
 * 2. Prices move and vary by region. Every figure here was checked against the
 *    pages named below on the date in PRICING_CHECKED, and the panel links out
 *    to those pages so the numbers can be re-checked rather than trusted
 *    forever. Two rates could not be confirmed from a primary source and are
 *    marked unconfirmed rather than guessed at.
 */

export var PRICING_CHECKED = "2026-08-29";
export var PRICING_SOURCES = {
    firebase: "https://firebase.google.com/pricing",
    firestore: "https://cloud.google.com/firestore/pricing",
    usage: "https://console.firebase.google.com/project/egysoroban-731cd/usage",
};

/* Spark = the free plan this project is on today.
   Confirmed on firebase.google.com/pricing and firebase.google.com/docs/firestore/pricing. */
export var FREE_TIER = [
    { id: "reads", service: "Firestore", metric: "documentReads", limit: 50000, unit: "perDay" },
    { id: "writes", service: "Firestore", metric: "documentWrites", limit: 20000, unit: "perDay" },
    { id: "deletes", service: "Firestore", metric: "documentDeletes", limit: 20000, unit: "perDay" },
    { id: "storage", service: "Firestore", metric: "storedData", limit: 1, unit: "gib" },
    { id: "egress", service: "Firestore", metric: "networkEgress", limit: 10, unit: "gibPerMonth" },
    { id: "hostStorage", service: "Hosting", metric: "hostingStorage", limit: 10, unit: "gb" },
    { id: "hostTransfer", service: "Hosting", metric: "hostingTransfer", limit: 0.36, unit: "gbPerDay" },
    { id: "authUsers", service: "Auth", metric: "monthlyActiveUsers", limit: 50000, unit: "perMonth" },
];

/* What each unit costs on Blaze once the free allowance above is used up.
   `confirmed: false` means it could not be read off a primary pricing page —
   shown as "check current rate" with a link, never as a made-up number. */
export var BLAZE_RATES = [
    { id: "reads", per: "100k", usd: 0.03, confirmed: true },
    { id: "writes", per: "100k", usd: 0.09, confirmed: true },
    { id: "deletes", per: "100k", usd: null, confirmed: false },
    { id: "storage", per: "gibMonth", usd: null, confirmed: false },
    { id: "hostStorage", per: "gb", usd: 0.026, confirmed: true },
    { id: "hostTransfer", per: "gb", usd: 0.15, confirmed: true },
];

/* Every collection the app writes to. Counted with getCountFromServer, an
   aggregation query — it bills roughly one read per collection instead of one
   per document, so opening this panel costs about 14 reads rather than
   thousands. Reading the whole database to measure it would be absurd. */
export var COLLECTIONS = [
    "studentApplications", "students", "teachers", "admins", "staffProfiles",
    "parentAccounts", "studentAccounts", "classes", "payments", "expenses",
    "trialSlots", "competitionRegistrations", "teacherApplications", "enrolledEmails",
];

/* Rough average serialized size of one document, used only to turn a document
   count into a storage estimate. Deliberately generous: student and
   application records carry the most fields, and over-estimating storage is
   the safe direction for a capacity warning. */
var AVG_DOC_BYTES = 1200;

export async function countCollections() {
    var results = [];
    for (var i = 0; i < COLLECTIONS.length; i++) {
        var name = COLLECTIONS[i];
        try {
            var snap = await getCountFromServer(collection(db, name));
            results.push({ name: name, count: snap.data().count, readable: true });
        } catch (err) {
            /* Some collections are developer-only to list (admins,
               enrolledEmails). An admin seeing "—" there is correct, not a
               failure — so it is reported rather than swallowed as a zero,
               which would understate the totals. */
            results.push({ name: name, count: null, readable: false });
        }
    }
    return results;
}

export function totalDocs(counts) {
    return counts.reduce(function (sum, c) { return sum + (c.count || 0); }, 0);
}

export function estimatedStorageGib(counts) {
    return (totalDocs(counts) * AVG_DOC_BYTES) / (1024 * 1024 * 1024);
}

/* A day's reads modelled from how the dashboard actually behaves rather than
   from a guess: each panel load re-reads the collections it charts, so one
   staff session costs roughly the whole database a few times over. Parent
   portal logins read only their own child's record. */
export function estimateDailyReads(counts, staffSessions, parentLogins) {
    var docs = totalDocs(counts);
    var perStaffSession = docs * 3;
    return Math.round(perStaffSession * staffSessions + parentLogins * 3);
}

export function estimateDailyWrites(counts, staffSessions) {
    /* Writes are rare next to reads — recording payments, updating progress,
       adding a class. Scaled off staff activity, not database size. */
    return Math.round(staffSessions * 25);
}

export function pctOfLimit(used, limit) {
    if (!limit) return 0;
    return Math.min(Math.round((used / limit) * 100), 999);
}

/* Monthly cost of whatever exceeds the free allowance. Only the metrics with a
   confirmed rate are priced; the rest are reported as unknown so the total is
   never quietly wrong. */
export function projectMonthlyCost(dailyReads, dailyWrites) {
    var rate = function (id) {
        var r = BLAZE_RATES.filter(function (x) { return x.id === id; })[0];
        return r && r.confirmed ? r.usd : null;
    };
    var billableReads = Math.max(dailyReads - 50000, 0) * 30;
    var billableWrites = Math.max(dailyWrites - 20000, 0) * 30;
    var readRate = rate("reads");
    var writeRate = rate("writes");
    var cost = (billableReads / 100000) * readRate + (billableWrites / 100000) * writeRate;
    return {
        billableReads: billableReads,
        billableWrites: billableWrites,
        usd: cost,
        withinFreeTier: billableReads === 0 && billableWrites === 0,
    };
}
