/* Small chart helpers for the admin panels.
 *
 * These are built from HTML/CSS rather than SVG on purpose: bars sized with
 * percentage widths mirror automatically in RTL, inherit the theme tokens in
 * both light and dark mode, and need no charting library on a site that ships
 * no bundler. Magnitude is always drawn in a single hue — the brand blue — so
 * bar colour never has to carry identity; every bar is directly labelled with
 * its own value instead. The status tones (ok/warn/danger) are reserved for
 * genuine good/critical states and always ship alongside a text label.
 */

function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
}

export function renderStatTiles(container, tiles) {
    if (!container) return;
    container.innerHTML = "";
    tiles.forEach(function (tile) {
        var card = el("div", "stat-tile" + (tile.tone ? " tone-" + tile.tone : ""));
        card.appendChild(el("div", "stat-tile-value", tile.value));
        card.appendChild(el("div", "stat-tile-label", tile.label));
        if (tile.hint) card.appendChild(el("div", "stat-tile-hint", tile.hint));
        container.appendChild(card);
    });
}

/* Horizontal bars — best when category names are words (branches, levels,
   teachers) and for anything read in RTL. */
export function renderBarList(container, items, options) {
    if (!container) return;
    var opts = options || {};
    container.innerHTML = "";
    if (!items.length) {
        container.appendChild(el("p", "chart-empty", opts.emptyText || ""));
        return;
    }
    var max = items.reduce(function (m, it) { return Math.max(m, Number(it.value) || 0); }, 0);
    items.forEach(function (it) {
        var value = Number(it.value) || 0;
        var row = el("div", "bar-row");
        row.appendChild(el("div", "bar-row-label", it.label));

        var track = el("div", "bar-row-track");
        var fill = el("div", "bar-row-fill" + (it.tone ? " tone-" + it.tone : ""));
        fill.style.width = (max > 0 ? Math.max((value / max) * 100, value > 0 ? 2 : 0) : 0) + "%";
        track.appendChild(fill);
        track.title = it.label + ": " + (it.display != null ? it.display : value);
        row.appendChild(track);

        row.appendChild(el("div", "bar-row-value", it.display != null ? it.display : String(value)));
        container.appendChild(row);
    });
}

/* Vertical columns — used only for time series, where left-to-right order
   carries meaning. */
export function renderColumns(container, items, options) {
    if (!container) return;
    var opts = options || {};
    container.innerHTML = "";
    if (!items.length) {
        container.appendChild(el("p", "chart-empty", opts.emptyText || ""));
        return;
    }
    var max = items.reduce(function (m, it) { return Math.max(m, Number(it.value) || 0); }, 0);
    var plot = el("div", "column-plot");
    items.forEach(function (it) {
        var value = Number(it.value) || 0;
        var col = el("div", "column-item");
        col.title = it.label + ": " + (it.display != null ? it.display : value);

        var barWrap = el("div", "column-bar-wrap");
        var bar = el("div", "column-bar");
        bar.style.height = (max > 0 ? Math.max((value / max) * 100, value > 0 ? 2 : 0) : 0) + "%";
        barWrap.appendChild(bar);

        col.appendChild(el("div", "column-value", it.display != null ? it.display : String(value)));
        col.appendChild(barWrap);
        col.appendChild(el("div", "column-label", it.label));
        plot.appendChild(col);
    });
    container.appendChild(plot);
}

export function renderChartCard(title, subtitle) {
    var card = el("div", "chart-card");
    var head = el("div", "chart-card-head");
    head.appendChild(el("h3", null, title));
    if (subtitle) head.appendChild(el("p", "chart-card-sub", subtitle));
    card.appendChild(head);
    var body = el("div", "chart-card-body");
    card.appendChild(body);
    return { card: card, body: body };
}

export function pct(part, whole) {
    if (!whole) return 0;
    return Math.round((Number(part) / Number(whole)) * 100);
}

export function money(amount) {
    var n = Number(amount) || 0;
    return n.toLocaleString("en-EG") + " EGP";
}
