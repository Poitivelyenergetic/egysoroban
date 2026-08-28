export function showLoadingRow(tbody, colSpan, text) {
    if (!tbody) return;
    tbody.innerHTML = "";
    var tr = document.createElement("tr");
    tr.className = "empty-row";
    var td = document.createElement("td");
    td.colSpan = colSpan;
    td.textContent = text;
    tr.appendChild(td);
    tbody.appendChild(tr);
}
