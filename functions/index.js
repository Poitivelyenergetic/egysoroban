/*
 * Reads Cloud Firestore's real usage meters and stores them where the admin
 * dashboard can see them.
 *
 * WHY THIS EXISTS
 * The Database limits panel counts the reads and writes the website itself
 * performs (js/usage-meter.js). That is genuinely measured, but only of this
 * site — it misses anything done in the Firebase console, work by signed-out
 * visitors, and operations the security rules rejected. Google's own meters
 * live in Cloud Monitoring, which needs server credentials a browser can never
 * safely hold. This job runs on the server, reads those meters, and writes a
 * summary into usageDaily/{YYYY-MM-DD} under a `server` key. The panel prefers
 * that key when present and falls back to its own count when it is not.
 *
 * IT IS NOT DEPLOYED YET, ON PURPOSE
 * Cloud Functions require the Blaze plan. Everything here is ready to go the
 * day billing is enabled — see DEPLOYING below. Nothing about the site depends
 * on it; without it the panel simply keeps showing its own measurements.
 *
 * DEPLOYING (once Blaze is on)
 *   1. Set a budget alert FIRST, in the Google Cloud console under
 *      Billing -> Budgets & alerts. A runaway function is the only way this
 *      project can cost real money, and a budget alert is what tells you
 *      before it does.
 *   2. cd functions && npm install
 *   3. firebase deploy --only functions
 *   4. Confirm the function's service account can read the meters. It needs the
 *      monitoring.timeSeries.list permission — the Monitoring Viewer role
 *      grants exactly that and nothing more, which is the right amount. Add it
 *      under IAM if the first run logs a permission error.
 *
 * COST: it runs 4 times a day. That is about 120 invocations a month against a
 * free allowance of two million, plus a handful of Firestore writes.
 * Effectively zero — but "effectively zero" still requires a billing account.
 */

const { onSchedule } = require("firebase-functions/v2/scheduler");
const { logger } = require("firebase-functions");
const admin = require("firebase-admin");
const monitoring = require("@google-cloud/monitoring");

admin.initializeApp();
const db = admin.firestore();
const client = new monitoring.MetricServiceClient();

/* Google publishes these counters under more than one name — the performance
 * docs say document/read_ops_count, the Firebase usage docs say
 * document_reads. Rather than hardcode a guess that would silently report zero
 * if it were the wrong one, the job asks the API which metrics actually exist
 * and takes the first match. That also survives a future rename without a code
 * change, and logs what it settled on so a wrong pick is visible rather than
 * quietly producing plausible nonsense.
 */
const CANDIDATES = {
    reads: [
        "firestore.googleapis.com/document/read_ops_count",
        "firestore.googleapis.com/document_reads",
    ],
    writes: [
        "firestore.googleapis.com/document/write_ops_count",
        "firestore.googleapis.com/document_writes",
    ],
    deletes: [
        "firestore.googleapis.com/document/delete_ops_count",
        "firestore.googleapis.com/document_deletes",
    ],
};

async function availableMetricTypes(projectPath) {
    const [descriptors] = await client.listMetricDescriptors({
        name: projectPath,
        filter: 'metric.type = starts_with("firestore.googleapis.com/")',
    });
    return new Set(descriptors.map((d) => d.type));
}

function pick(candidates, available) {
    for (const type of candidates) {
        if (available.has(type)) return type;
    }
    return null;
}

/* Sums one metric over the window. ALIGN_SUM into a single bucket the width of
 * the whole window, then REDUCE_SUM across series, collapses to one number:
 * total operations for the period, however many databases or regions the
 * project happens to span. */
async function sumMetric(projectPath, metricType, startSeconds, endSeconds) {
    const [series] = await client.listTimeSeries({
        name: projectPath,
        filter: 'metric.type="' + metricType + '"',
        interval: {
            startTime: { seconds: startSeconds },
            endTime: { seconds: endSeconds },
        },
        aggregation: {
            alignmentPeriod: { seconds: endSeconds - startSeconds },
            perSeriesAligner: "ALIGN_SUM",
            crossSeriesReducer: "REDUCE_SUM",
        },
    });

    let total = 0;
    for (const s of series) {
        for (const point of s.points || []) {
            const v = point.value || {};
            /* int64 arrives as a string once the value exceeds what a JS number
               represents exactly, so coerce rather than assume. */
            const raw = v.int64Value !== undefined && v.int64Value !== null
                ? v.int64Value
                : v.doubleValue;
            total += Number(raw || 0);
        }
    }
    return total;
}

function dayKey(date) {
    const m = date.getUTCMonth() + 1;
    const d = date.getUTCDate();
    return date.getUTCFullYear() + "-" + (m < 10 ? "0" + m : m) + "-" + (d < 10 ? "0" + d : d);
}

exports.syncFirestoreUsage = onSchedule(
    { schedule: "every 6 hours", timeZone: "Africa/Cairo", retryCount: 1 },
    async () => {
        const projectId = process.env.GCLOUD_PROJECT;
        const projectPath = client.projectPath(projectId);

        let available;
        try {
            available = await availableMetricTypes(projectPath);
        } catch (err) {
            /* Almost always the missing IAM role on a first run. Name the role
               in the log so the fix is obvious from the line alone. */
            logger.error(
                "Could not list Firestore metrics. The function's service account " +
                "likely needs the Monitoring Viewer role (monitoring.timeSeries.list).",
                err
            );
            return;
        }

        const chosen = {
            reads: pick(CANDIDATES.reads, available),
            writes: pick(CANDIDATES.writes, available),
            deletes: pick(CANDIDATES.deletes, available),
        };
        logger.info("Firestore usage metrics resolved", {
            chosen: chosen,
            availableCount: available.size,
        });

        if (!chosen.reads && !chosen.writes && !chosen.deletes) {
            logger.error(
                "None of the expected Firestore metric names exist in this project. " +
                "Available firestore.googleapis.com metrics: " +
                Array.from(available).join(", ")
            );
            return;
        }

        /* The current UTC day so far — the same window the free daily allowance
           itself resets on, so the comparison in the panel is like for like. */
        const now = new Date();
        const startOfDay = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
        const startSeconds = Math.floor(startOfDay / 1000);
        const endSeconds = Math.floor(now.getTime() / 1000);

        const result = {};
        for (const key of ["reads", "writes", "deletes"]) {
            if (!chosen[key]) {
                result[key] = null;
                continue;
            }
            try {
                result[key] = await sumMetric(projectPath, chosen[key], startSeconds, endSeconds);
            } catch (err) {
                /* One failed metric must not cost us the other two. */
                logger.warn("Failed reading " + chosen[key], err);
                result[key] = null;
            }
        }

        await db.collection("usageDaily").doc(dayKey(now)).set(
            {
                day: dayKey(now),
                server: {
                    reads: result.reads,
                    writes: result.writes,
                    deletes: result.deletes,
                    metrics: chosen,
                    source: "cloud-monitoring",
                    updatedAt: new Date().toISOString(),
                },
            },
            /* merge, so this never clobbers the browser-side counts that share
               this document. */
            { merge: true }
        );

        logger.info("Wrote server usage", {
            day: dayKey(now),
            reads: result.reads,
            writes: result.writes,
            deletes: result.deletes,
        });
    }
);
