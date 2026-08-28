import { t, fmtDate } from "./i18n.js";
import { state } from "./state.js";
import { toast } from "./toast.js";
import { loadStudents, updateStudent } from "./student-records.js";
import { loadPayments, addPayment, deletePayment, periodKey, periodLabel, periodShortLabel, recentPeriods } from "./payments.js";
import { loadExpenses, addExpense, deleteExpense } from "./expenses.js";
import { branchLabel } from "./branches.js";
import { renderStatTiles, renderColumns, renderBarList, pct, money } from "./admin-charts.js";
import { showLoadingRow } from "./loading-row.js";

var tilesEl = document.getElementById("finance-tiles");
var periodSelect = document.getElementById("finance-period");
var tableBody = document.getElementById("finance-table-body");
var trendEl = document.getElementById("finance-trend");
var branchEl = document.getElementById("finance-by-branch");
var unpaidOnlyToggle = document.getElementById("finance-unpaid-only");
var methodSelect = document.getElementById("finance-method");
var historyBody = document.getElementById("finance-history-body");
var expensesBody = document.getElementById("finance-expenses-body");
var addExpenseForm = document.getElementById("add-expense-form");
var addExpenseDetails = document.getElementById("add-expense");

var selectedPeriod = periodKey();
var periodsFilled = false;
var deletePending = null;

function categoryLabel(cat) {
    var key = {
        salary: "finance.catSalary", rent: "finance.catRent", materials: "finance.catMaterials",
        utilities: "finance.catUtilities", marketing: "finance.catMarketing", other: "finance.catOther",
    }[cat];
    return key ? t(key) : (cat || "—");
}

function methodLabel(method) {
    var key = {
        cash: "finance.methodCash", instapay: "finance.methodInstapay",
        transfer: "finance.methodTransfer", card: "finance.methodCard",
    }[method];
    return key ? t(key) : (method || "—");
}

function fillPeriodSelect() {
    if (!periodSelect || periodsFilled) return;
    /* Twelve months back plus the current one — enough to chase a late payment
       without turning the picker into a scroll. */
    recentPeriods(12).slice().reverse().forEach(function (p) {
        var opt = document.createElement("option");
        opt.value = p;
        opt.textContent = periodLabel(p, state.lang);
        periodSelect.appendChild(opt);
    });
    periodSelect.value = selectedPeriod;
    periodsFilled = true;
}

export async function renderFinancePanel() {
    if (!tableBody) return;
    fillPeriodSelect();
    showLoadingRow(tableBody, 6, t("admin.loading"));
    /* Same reasoning as the analytics panel: show the shape of the page before
       the network call, so a stalled read never renders as an empty screen. */
    [trendEl, branchEl].forEach(function (node) {
        if (node) node.innerHTML = '<p class="chart-empty">' + t("admin.loading") + "</p>";
    });

    var students = await loadStudents();
    var payments = await loadPayments();
    var expenses = await loadExpenses();

    var paidThisPeriod = {};
    payments.forEach(function (p) {
        if (p.period === selectedPeriod && p.studentId) {
            paidThisPeriod[p.studentId] = (paidThisPeriod[p.studentId] || 0) + (Number(p.amount) || 0);
        }
    });
    var lastPaymentByStudent = {};
    payments.forEach(function (p) {
        if (!p.studentId) return;
        var prev = lastPaymentByStudent[p.studentId];
        if (!prev || (p.paidAt || "") > (prev.paidAt || "")) lastPaymentByStudent[p.studentId] = p;
    });

    var expected = students.reduce(function (sum, s) { return sum + (Number(s.monthlyFee) || 0); }, 0);
    var collected = Object.keys(paidThisPeriod).reduce(function (sum, id) { return sum + paidThisPeriod[id]; }, 0);
    var outstanding = Math.max(expected - collected, 0);
    var unpaidCount = students.filter(function (s) {
        return (Number(s.monthlyFee) || 0) > 0 && !paidThisPeriod[s.id];
    }).length;
    var noFeeCount = students.filter(function (s) { return !(Number(s.monthlyFee) || 0); }).length;

    var spent = expenses
        .filter(function (x) { return x.period === selectedPeriod; })
        .reduce(function (sum, x) { return sum + (Number(x.amount) || 0); }, 0);
    var net = collected - spent;

    renderStatTiles(tilesEl, [
        { label: t("finance.expected"), value: money(expected), hint: periodLabel(selectedPeriod, state.lang) },
        { label: t("finance.collected"), value: money(collected), tone: "ok" },
        { label: t("finance.spent"), value: money(spent), tone: spent > 0 ? "warn" : "" },
        /* Net is the number that actually says whether the month worked. */
        { label: t("finance.net"), value: money(net), tone: net >= 0 ? "ok" : "danger", hint: t("finance.netHint") },
        { label: t("finance.outstanding"), value: money(outstanding), tone: outstanding > 0 ? "danger" : "" },
        {
            label: t("finance.collectionRate"),
            value: expected > 0 ? pct(collected, expected) + "%" : "—",
        },
        {
            label: t("finance.unpaidStudents"), value: String(unpaidCount),
            tone: unpaidCount > 0 ? "warn" : "",
        },
        {
            label: t("finance.noFeeSet"), value: String(noFeeCount),
            hint: noFeeCount > 0 ? t("finance.noFeeHint") : "",
        },
    ]);

    /* ---- revenue trend ---- */
    var periods = recentPeriods(6);
    var revByPeriod = {};
    periods.forEach(function (p) { revByPeriod[p] = 0; });
    payments.forEach(function (p) {
        if (revByPeriod[p.period] != null) revByPeriod[p.period] += Number(p.amount) || 0;
    });
    renderColumns(trendEl, periods.map(function (p) {
        return {
            label: periodShortLabel(p, state.lang),
            value: revByPeriod[p],
            display: String(Math.round(revByPeriod[p] / 1000) || 0) + "k",
        };
    }), { emptyText: t("common.nothingYet") });

    /* ---- collected per branch, this period ---- */
    var byBranch = {};
    payments.filter(function (p) { return p.period === selectedPeriod; }).forEach(function (p) {
        var key = p.branch || "";
        byBranch[key] = (byBranch[key] || 0) + (Number(p.amount) || 0);
    });
    renderBarList(branchEl, Object.keys(byBranch).map(function (key) {
        return { label: branchLabel(key), value: byBranch[key], display: money(byBranch[key]) };
    }).sort(function (a, b) { return b.value - a.value; }), { emptyText: t("common.nothingYet") });

    /* ---- per-student collection table ---- */
    var rows = students.slice().sort(function (a, b) { return (a.name || "").localeCompare(b.name || ""); });
    if (unpaidOnlyToggle && unpaidOnlyToggle.checked) {
        rows = rows.filter(function (s) { return !paidThisPeriod[s.id]; });
    }

    tableBody.innerHTML = "";
    if (!rows.length) {
        var tr = document.createElement("tr");
        tr.className = "empty-row";
        var td = document.createElement("td");
        td.colSpan = 6;
        td.textContent = t("finance.emptyStudents");
        tr.appendChild(td);
        tableBody.appendChild(tr);
        /* Still render the history — payments can exist for students who were
           since removed, and leaving the old rows on screen would be wrong. */
        renderHistory(payments.filter(function (p) { return p.period === selectedPeriod; }));
    renderExpenses(expenses.filter(function (x) { return x.period === selectedPeriod; }));
        return;
    }

    rows.forEach(function (s) {
        var tr = document.createElement("tr");

        var tdName = document.createElement("td");
        tdName.textContent = s.name || t("detail.none");
        tr.appendChild(tdName);

        var tdBranch = document.createElement("td");
        tdBranch.className = "muted";
        tdBranch.textContent = branchLabel(s.branch);
        tr.appendChild(tdBranch);

        /* The fee lives on the student record, so it's editable right here —
           setting it is the first thing a new academy has to do. */
        var tdFee = document.createElement("td");
        var feeInput = document.createElement("input");
        feeInput.type = "number";
        feeInput.min = "0";
        feeInput.className = "finance-fee-input";
        feeInput.value = Number(s.monthlyFee) || 0;
        feeInput.addEventListener("change", async function () {
            var result = await updateStudent(s.id, { monthlyFee: Number(feeInput.value) || 0 });
            toast(t(result.ok ? "admin.savedToast" : "admin.savingFailedToast"));
            if (result.ok) renderFinancePanel();
        });
        tdFee.appendChild(feeInput);
        tr.appendChild(tdFee);

        var paidAmount = paidThisPeriod[s.id] || 0;
        var fee = Number(s.monthlyFee) || 0;
        var tdStatus = document.createElement("td");
        var pill = document.createElement("span");
        if (paidAmount >= fee && fee > 0) {
            pill.className = "status-pill enrolled";
            pill.textContent = t("finance.statusPaid");
        } else if (paidAmount > 0) {
            pill.className = "status-pill contacted";
            pill.textContent = t("finance.statusPartial");
        } else if (fee > 0) {
            pill.className = "status-pill declined";
            pill.textContent = t("finance.statusUnpaid");
        } else {
            pill.className = "status-pill new";
            pill.textContent = t("finance.statusNoFee");
        }
        tdStatus.appendChild(pill);
        if (paidAmount > 0) {
            var amt = document.createElement("div");
            amt.className = "team-row-email";
            amt.textContent = money(paidAmount);
            tdStatus.appendChild(amt);
        }
        tr.appendChild(tdStatus);

        var tdLast = document.createElement("td");
        tdLast.className = "muted";
        var last = lastPaymentByStudent[s.id];
        tdLast.textContent = last ? fmtDate(last.paidAt) : t("detail.none");
        tr.appendChild(tdLast);

        /* The amount defaults to the monthly fee but stays editable, so a part
           payment or a one-off adjustment can be entered without changing the
           student's standing fee. */
        var tdAction = document.createElement("td");
        var actionWrap = document.createElement("div");
        actionWrap.className = "finance-record-row";
        var amountInput = document.createElement("input");
        amountInput.type = "number";
        amountInput.min = "0";
        amountInput.className = "finance-fee-input";
        amountInput.value = Math.max(fee - paidAmount, 0) || fee;
        amountInput.setAttribute("aria-label", t("finance.colAmount"));

        var recordBtn = document.createElement("button");
        recordBtn.type = "button";
        recordBtn.className = "btn btn-secondary btn-sm";
        recordBtn.textContent = t("finance.recordBtn");
        recordBtn.addEventListener("click", async function () {
            var amount = Number(amountInput.value) || 0;
            if (amount <= 0) { amountInput.focus(); return; }
            recordBtn.disabled = true;
            var result = await addPayment({
                studentId: s.id,
                studentName: s.name || "",
                branch: s.branch || "",
                amount: amount,
                period: selectedPeriod,
                method: methodSelect ? methodSelect.value : "cash",
            });
            if (result.ok) {
                toast(t("finance.recordedToast"));
                renderFinancePanel();
            } else {
                recordBtn.disabled = false;
                toast(t("admin.savingFailedToast"));
            }
        });
        actionWrap.appendChild(amountInput);
        actionWrap.appendChild(recordBtn);
        tdAction.appendChild(actionWrap);
        tr.appendChild(tdAction);

        tableBody.appendChild(tr);
    });

    renderHistory(payments.filter(function (p) { return p.period === selectedPeriod; }));
    renderExpenses(expenses.filter(function (x) { return x.period === selectedPeriod; }));
}

function renderHistory(rows) {
    if (!historyBody) return;
    historyBody.innerHTML = "";
    if (!rows.length) {
        var tr = document.createElement("tr");
        tr.className = "empty-row";
        var td = document.createElement("td");
        td.colSpan = 6;
        td.textContent = t("finance.emptyPayments");
        tr.appendChild(td);
        historyBody.appendChild(tr);
        return;
    }
    rows.forEach(function (p) {
        var tr = document.createElement("tr");

        var tdName = document.createElement("td");
        tdName.textContent = p.studentName || t("detail.none");
        tr.appendChild(tdName);

        var tdAmount = document.createElement("td");
        tdAmount.textContent = money(p.amount);
        tr.appendChild(tdAmount);

        var tdMethod = document.createElement("td");
        tdMethod.textContent = methodLabel(p.method);
        tr.appendChild(tdMethod);

        var tdWhen = document.createElement("td");
        tdWhen.className = "muted";
        tdWhen.textContent = fmtDate(p.paidAt);
        tr.appendChild(tdWhen);

        var tdBy = document.createElement("td");
        tdBy.className = "muted";
        tdBy.textContent = p.recordedBy || "—";
        tr.appendChild(tdBy);

        var tdAction = document.createElement("td");
        var delBtn = document.createElement("button");
        delBtn.type = "button";
        delBtn.className = "btn btn-secondary btn-sm";
        delBtn.textContent = t("detail.delete");
        /* Two-step, like the other destructive actions in this dashboard —
           deleting a payment changes reported revenue. */
        delBtn.addEventListener("click", async function () {
            if (deletePending !== p.id) {
                deletePending = p.id;
                delBtn.textContent = t("admin.confirmDelete");
                return;
            }
            delBtn.disabled = true;
            var result = await deletePayment(p.id);
            if (result.ok) {
                deletePending = null;
                toast(t("admin.deletedToast"));
                renderFinancePanel();
            } else {
                delBtn.disabled = false;
                toast(t("admin.savingFailedToast"));
            }
        });
        tdAction.appendChild(delBtn);
        tr.appendChild(tdAction);

        historyBody.appendChild(tr);
    });
}

if (periodSelect) {
    periodSelect.addEventListener("change", function () {
        selectedPeriod = periodSelect.value;
        renderFinancePanel();
    });
}
if (unpaidOnlyToggle) {
    unpaidOnlyToggle.addEventListener("change", function () { renderFinancePanel(); });
}

var expenseDeletePending = null;

function renderExpenses(rows) {
    if (!expensesBody) return;
    expensesBody.innerHTML = "";
    if (!rows.length) {
        var tr = document.createElement("tr");
        tr.className = "empty-row";
        var td = document.createElement("td");
        td.colSpan = 6;
        td.textContent = t("finance.emptyExpenses");
        tr.appendChild(td);
        expensesBody.appendChild(tr);
        return;
    }
    rows.forEach(function (x) {
        var tr = document.createElement("tr");

        var tdCat = document.createElement("td");
        tdCat.textContent = categoryLabel(x.category);
        tr.appendChild(tdCat);

        var tdDesc = document.createElement("td");
        tdDesc.textContent = x.description || (x.paidTo ? x.paidTo : t("detail.none"));
        tr.appendChild(tdDesc);

        var tdAmount = document.createElement("td");
        tdAmount.textContent = money(x.amount);
        tr.appendChild(tdAmount);

        var tdWhen = document.createElement("td");
        tdWhen.className = "muted";
        tdWhen.textContent = fmtDate(x.paidAt);
        tr.appendChild(tdWhen);

        var tdBy = document.createElement("td");
        tdBy.className = "muted";
        tdBy.textContent = x.recordedBy || "—";
        tr.appendChild(tdBy);

        var tdAction = document.createElement("td");
        var delBtn = document.createElement("button");
        delBtn.type = "button";
        delBtn.className = "btn btn-secondary btn-sm";
        delBtn.textContent = t("detail.delete");
        delBtn.addEventListener("click", async function () {
            if (expenseDeletePending !== x.id) {
                expenseDeletePending = x.id;
                delBtn.textContent = t("admin.confirmDelete");
                return;
            }
            delBtn.disabled = true;
            var result = await deleteExpense(x.id);
            if (result.ok) {
                expenseDeletePending = null;
                toast(t("admin.deletedToast"));
                renderFinancePanel();
            } else {
                delBtn.disabled = false;
                toast(t("admin.savingFailedToast"));
            }
        });
        tdAction.appendChild(delBtn);
        tr.appendChild(tdAction);

        expensesBody.appendChild(tr);
    });
}

if (addExpenseForm) {
    addExpenseForm.addEventListener("submit", async function (e) {
        e.preventDefault();
        var fd = new FormData(addExpenseForm);
        var amount = Number(fd.get("amount")) || 0;
        if (amount <= 0) return;
        var submitBtn = addExpenseForm.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        var result = await addExpense({
            category: (fd.get("category") || "other").toString(),
            description: (fd.get("description") || "").toString().trim(),
            amount: amount,
            /* Booked against the month currently selected above, so recording
               a late salary lands in the month it belongs to. */
            period: selectedPeriod,
        });
        submitBtn.disabled = false;
        if (result.ok) {
            toast(t("finance.expenseAddedToast"));
            addExpenseForm.reset();
            if (addExpenseDetails) addExpenseDetails.open = false;
            renderFinancePanel();
        } else {
            toast(t("admin.savingFailedToast"));
        }
    });
}
