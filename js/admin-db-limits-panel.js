import { t } from "./i18n.js";
import { state } from "./state.js";
import { renderStatTiles, renderBarList } from "./admin-charts.js";
import { showLoadingRow } from "./loading-row.js";
import {
    FREE_TIER, BLAZE_RATES, PRICING_CHECKED, PRICING_SOURCES,
    countCollections, totalDocs, estimatedStorageGib,
    estimateDailyReads, estimateDailyWrites, pctOfLimit, projectMonthlyCost,
} from "./db-limits.js";

var tilesEl = document.getElementById("dblimits-tiles");
var quotaChartEl = document.getElementById("dblimits-quota-chart");
var collectionsBody = document.getElementById("dblimits-collections-body");
var limitsBody = document.getElementById("dblimits-limits-body");
var pricingBody = document.getElementById("dblimits-pricing-body");
var costEl = document.getElementById("dblimits-cost");
var checkedEl = document.getElementById("dblimits-checked");
var sessionsInput = document.getElementById("dblimits-sessions");

/* How many staff sessions a day to model. Kept as a control rather than a
   constant because the whole read estimate scales off it, and the honest
   answer depends on how the academy actually works. */
var staffSessions = 8;

function cell(text, cls) {
    var td = document.createElement("td");
    if (cls) td.className = cls;
    td.textContent = text;
    return td;
}

function fmt(n) {
    return Number(n).toLocaleString(state.lang === "ar" ? "ar-EG" : "en-GB");
}

function unitLabel(unit) {
    return t("dblimits.unit." + unit) || unit;
}

export async function renderDbLimitsPanel() {
    if (!tilesEl) return;

    if (checkedEl) checkedEl.textContent = t("dblimits.checkedOn") + " " + PRICING_CHECKED;
    if (sessionsInput && sessionsInput.value) staffSessions = Number(sessionsInput.value) || 8;

    showLoadingRow(collectionsBody, 2, t("admin.loading"));
    renderStatTiles(tilesEl, [
        { label: t("dblimits.totalDocs"), value: "…" },
        { label: t("dblimits.storageUsed"), value: "…" },
        { label: t("dblimits.estReads"), value: "…" },
        { label: t("dblimits.projectedCost"), value: "…" },
    ]);

    var counts = await countCollections();
    var docs = totalDocs(counts);
    var storageGib = estimatedStorageGib(counts);
    var dailyReads = estimateDailyReads(counts, staffSessions, 20);
    var dailyWrites = estimateDailyWrites(counts, staffSessions);
    var cost = projectMonthlyCost(dailyReads, dailyWrites);

    /* Collections this role can't list return null, not 0. Summing them as
       zero would silently understate the total, so the tile says how many are
       missing rather than presenting a short count as complete. */
    var unreadable = counts.filter(function (c) { return !c.readable; }).length;

    renderStatTiles(tilesEl, [
        {
            label: t("dblimits.totalDocs"), value: fmt(docs),
            hint: unreadable ? t("dblimits.partialCount").replace("{n}", String(unreadable)) : "",
            tone: unreadable ? "warn" : "",
        },
        {
            label: t("dblimits.storageUsed"),
            value: storageGib < 0.01 ? "< 0.01 GiB" : storageGib.toFixed(2) + " GiB",
            hint: t("dblimits.of1gib"),
        },
        {
            label: t("dblimits.estReads"), value: fmt(dailyReads),
            hint: t("dblimits.estimateHint"),
            tone: dailyReads > 50000 ? "danger" : dailyReads > 35000 ? "warn" : "ok",
        },
        {
            label: t("dblimits.projectedCost"),
            value: cost.withinFreeTier ? t("dblimits.free") : "$" + cost.usd.toFixed(2),
            tone: cost.withinFreeTier ? "ok" : "warn",
            hint: cost.withinFreeTier ? t("dblimits.withinFree") : t("dblimits.perMonth"),
        },
    ]);

    /* Headroom, not consumption: how much of each daily allowance the modelled
       usage would take. Direct-labelled with the percentage so a short bar is
       still readable. */
    renderBarList(quotaChartEl, [
        {
            label: t("dblimits.metric.documentReads"), value: pctOfLimit(dailyReads, 50000),
            display: pctOfLimit(dailyReads, 50000) + "%",
            tone: dailyReads > 50000 ? "danger" : "",
        },
        {
            label: t("dblimits.metric.documentWrites"), value: pctOfLimit(dailyWrites, 20000),
            display: pctOfLimit(dailyWrites, 20000) + "%",
            tone: dailyWrites > 20000 ? "danger" : "",
        },
        {
            label: t("dblimits.metric.storedData"), value: pctOfLimit(storageGib, 1),
            display: pctOfLimit(storageGib, 1) + "%",
        },
    ], { emptyText: t("common.nothingYet") });

    /* ---- what is actually stored ---- */
    collectionsBody.innerHTML = "";
    counts.slice().sort(function (a, b) { return (b.count || 0) - (a.count || 0); }).forEach(function (c) {
        var tr = document.createElement("tr");
        tr.appendChild(cell(c.name));
        if (c.readable) {
            tr.appendChild(cell(fmt(c.count), "muted"));
        } else {
            /* Not zero — not visible to this role. Saying "0" would be a lie
               that also drags the totals down. */
            tr.appendChild(cell(t("dblimits.notVisible"), "muted"));
        }
        collectionsBody.appendChild(tr);
    });

    /* ---- the free plan's ceilings ---- */
    limitsBody.innerHTML = "";
    FREE_TIER.forEach(function (row) {
        var tr = document.createElement("tr");
        tr.appendChild(cell(t("dblimits.service." + row.service.toLowerCase()) || row.service));
        tr.appendChild(cell(t("dblimits.metric." + row.metric)));
        tr.appendChild(cell(fmt(row.limit) + " " + unitLabel(row.unit), "muted"));
        limitsBody.appendChild(tr);
    });

    /* ---- what it costs past those ceilings ---- */
    pricingBody.innerHTML = "";
    BLAZE_RATES.forEach(function (row) {
        var tr = document.createElement("tr");
        tr.appendChild(cell(t("dblimits.metric." + metricKeyFor(row.id))));
        tr.appendChild(cell(t("dblimits.per." + row.per), "muted"));
        var priceCell = document.createElement("td");
        if (row.confirmed) {
            priceCell.textContent = "$" + row.usd.toFixed(3).replace(/0$/, "");
        } else {
            /* Never invent a price someone might budget against. */
            var link = document.createElement("a");
            link.href = PRICING_SOURCES.firestore;
            link.target = "_blank";
            link.rel = "noopener";
            link.textContent = t("dblimits.checkRate");
            priceCell.appendChild(link);
        }
        tr.appendChild(priceCell);
        pricingBody.appendChild(tr);
    });

    if (costEl) {
        costEl.textContent = cost.withinFreeTier
            ? t("dblimits.verdictFree")
            : t("dblimits.verdictPaid")
                .replace("{reads}", fmt(cost.billableReads))
                .replace("{cost}", "$" + cost.usd.toFixed(2));
    }
}

function metricKeyFor(id) {
    return {
        reads: "documentReads", writes: "documentWrites", deletes: "documentDeletes",
        storage: "storedData", hostStorage: "hostingStorage", hostTransfer: "hostingTransfer",
    }[id] || id;
}

if (sessionsInput) {
    sessionsInput.addEventListener("change", function () {
        staffSessions = Number(sessionsInput.value) || 8;
        renderDbLimitsPanel();
    });
}
