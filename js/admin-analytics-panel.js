import { t } from "./i18n.js";
import { state } from "./state.js";
import { loadStudents } from "./student-records.js";
import { loadApplications } from "./applications.js";
import { loadPayments, periodKey, periodLabel, periodShortLabel, recentPeriods } from "./payments.js";
import { BRANCHES, branchLabel } from "./branches.js";
import { renderStatTiles, renderBarList, renderColumns, pct, money } from "./admin-charts.js";

var tilesEl = document.getElementById("analytics-tiles");
var appsTrendEl = document.getElementById("analytics-apps-trend");
var pipelineEl = document.getElementById("analytics-pipeline");
var branchEl = document.getElementById("analytics-branches");
var levelEl = document.getElementById("analytics-levels");
var revenueEl = document.getElementById("analytics-revenue");

function ratio(part, whole) {
    return whole > 0 ? pct(part, whole) + "%" : "—";
}

/* One place for the tile labels so the placeholder pass and the real pass
   can't drift apart. */
function tileDefs(v) {
    return [
        { label: t("analytics.activeStudents"), value: v.students },
        { label: t("analytics.appsThisMonth"), value: v.appsThisMonth },
        { label: t("analytics.conversion"), value: v.conversion, hint: t("analytics.conversionHint") },
        { label: t("analytics.attendanceRate"), value: v.attendance },
        { label: t("analytics.homeworkRate"), value: v.homework },
        { label: t("analytics.examPassRate"), value: v.exams },
        { label: t("analytics.revenueThisMonth"), value: v.revenue },
    ];
}

var PLACEHOLDER = {
    students: "…", appsThisMonth: "…", conversion: "…",
    attendance: "…", homework: "…", exams: "…", revenue: "…",
};

export async function renderAnalyticsPanel() {
    if (!tilesEl) return;

    /* Paint the skeleton before touching the network — otherwise a slow or
       failed Firestore read leaves the whole panel blank with no explanation. */
    renderStatTiles(tilesEl, tileDefs(PLACEHOLDER));
    [appsTrendEl, revenueEl, pipelineEl, branchEl, levelEl].forEach(function (node) {
        if (node) node.innerHTML = '<p class="chart-empty">' + t("admin.loading") + "</p>";
    });

    var students = await loadStudents();
    await loadApplications();
    var apps = state.applications || [];
    var payments = await loadPayments();

    /* ---- headline numbers ---- */
    var attended = 0, totalSessions = 0, hwDone = 0, hwAssigned = 0, passed = 0, examsTaken = 0;
    students.forEach(function (s) {
        attended += Number(s.attendedSessions) || 0;
        totalSessions += Number(s.totalSessions) || 0;
        hwDone += Number(s.homeworkCompleted) || 0;
        hwAssigned += Number(s.homeworkAssigned) || 0;
        (s.examHistory || []).forEach(function (ex) {
            examsTaken++;
            if (ex.result === "passed") passed++;
        });
    });

    var thisPeriod = periodKey();
    var appsThisMonth = apps.filter(function (a) {
        return periodKey(a.submittedAt) === thisPeriod;
    }).length;
    var enrolledCount = apps.filter(function (a) { return a.status === "enrolled"; }).length;
    var revenueThisMonth = payments
        .filter(function (p) { return p.period === thisPeriod; })
        .reduce(function (sum, p) { return sum + (Number(p.amount) || 0); }, 0);

    renderStatTiles(tilesEl, tileDefs({
        students: String(students.length),
        appsThisMonth: String(appsThisMonth),
        conversion: ratio(enrolledCount, apps.length),
        attendance: ratio(attended, totalSessions),
        homework: ratio(hwDone, hwAssigned),
        exams: ratio(passed, examsTaken),
        revenue: money(revenueThisMonth),
    }));

    /* ---- applications over the last six months ---- */
    var periods = recentPeriods(6);
    var appsByPeriod = {};
    periods.forEach(function (p) { appsByPeriod[p] = 0; });
    apps.forEach(function (a) {
        var p = periodKey(a.submittedAt);
        if (appsByPeriod[p] != null) appsByPeriod[p]++;
    });
    renderColumns(appsTrendEl, periods.map(function (p) {
        return { label: periodShortLabel(p, state.lang), value: appsByPeriod[p] };
    }), { emptyText: t("common.nothingYet") });

    /* ---- revenue over the last six months ---- */
    var revByPeriod = {};
    periods.forEach(function (p) { revByPeriod[p] = 0; });
    payments.forEach(function (p) {
        if (revByPeriod[p.period] != null) revByPeriod[p.period] += Number(p.amount) || 0;
    });
    renderColumns(revenueEl, periods.map(function (p) {
        return {
            label: periodShortLabel(p, state.lang),
            value: revByPeriod[p],
            display: String(Math.round(revByPeriod[p] / 1000) || 0) + "k",
        };
    }), { emptyText: t("common.nothingYet") });

    /* ---- application pipeline ---- */
    var statuses = ["new", "contacted", "enrolled", "declined"];
    renderBarList(pipelineEl, statuses.map(function (s) {
        return {
            label: t("admin.status" + s.charAt(0).toUpperCase() + s.slice(1)),
            value: apps.filter(function (a) { return (a.status || "new") === s; }).length,
        };
    }), { emptyText: t("common.nothingYet") });

    /* ---- students per branch ---- */
    var byBranch = BRANCHES.map(function (b) {
        return {
            label: b.label,
            value: students.filter(function (s) { return s.branch === b.id; }).length,
        };
    }).filter(function (row) { return row.value > 0; });
    var unknownBranch = students.filter(function (s) {
        return !s.branch || !BRANCHES.some(function (b) { return b.id === s.branch; });
    }).length;
    if (unknownBranch) byBranch.push({ label: t("analytics.branchUnknown"), value: unknownBranch });
    renderBarList(branchEl, byBranch, { emptyText: t("common.nothingYet") });

    /* ---- students per level ---- */
    var byLevel = [];
    for (var lv = 1; lv <= 11; lv++) {
        var count = students.filter(function (s) { return (Number(s.levelIndex) || 1) === lv; }).length;
        if (count > 0) {
            byLevel.push({
                label: lv === 11 ? t("portal.levelGraduate") : t("portal.levelPrefix") + " " + lv,
                value: count,
            });
        }
    }
    renderBarList(levelEl, byLevel, { emptyText: t("common.nothingYet") });
}
