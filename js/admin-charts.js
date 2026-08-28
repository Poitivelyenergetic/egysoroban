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

/* A trend over time, drawn as a smooth area line — the one job where the shape
   between points is the message rather than each point's exact height. SVG
   here rather than the CSS approach used by the bars, because a curve can't be
   built from boxes; RTL is handled by reversing the series so it reads in the
   same direction as the flex-based column chart next to it. */
var lineGradientSeq = 0;

function smoothPath(points) {
    /* Catmull-Rom through the points, converted to cubic béziers. Tension is
       kept low so the curve never overshoots into implying a value the data
       doesn't have — a spike above a real maximum would be a lie. */
    if (points.length < 2) return "";
    var d = "M " + points[0].x + " " + points[0].y;
    for (var i = 0; i < points.length - 1; i++) {
        var p0 = points[i - 1] || points[i];
        var p1 = points[i];
        var p2 = points[i + 1];
        var p3 = points[i + 2] || p2;
        var c1x = p1.x + (p2.x - p0.x) / 6;
        var c1y = p1.y + (p2.y - p0.y) / 6;
        var c2x = p2.x - (p3.x - p1.x) / 6;
        var c2y = p2.y - (p3.y - p1.y) / 6;
        d += " C " + c1x + " " + c1y + ", " + c2x + " " + c2y + ", " + p2.x + " " + p2.y;
    }
    return d;
}

export function renderAreaLine(container, items, options) {
    if (!container) return;
    var opts = options || {};
    container.innerHTML = "";
    if (!items.length) {
        container.appendChild(el("p", "chart-empty", opts.emptyText || ""));
        return;
    }

    /* No RTL reversal here. An SVG's coordinates are absolute and ignore
       `dir`, while an HTML flex axis under it does not — reversing the series
       put the newest month on the left of the curve and on the right of its
       own labels. Ordered charts are pinned to left-to-right in CSS instead
       (see .line-axis / .column-plot), so a time series reads oldest-to-newest
       in both languages and the labels can't drift out of step with the marks. */
    var series = items.slice();

    var W = 320, H = 150, padX = 10, padTop = 18, padBottom = 8;
    var max = series.reduce(function (m, it) { return Math.max(m, Number(it.value) || 0); }, 0);
    var scaleMax = max > 0 ? max : 1;
    var stepX = series.length > 1 ? (W - padX * 2) / (series.length - 1) : 0;
    var points = series.map(function (it, i) {
        var value = Number(it.value) || 0;
        return {
            x: padX + i * stepX,
            y: padTop + (1 - value / scaleMax) * (H - padTop - padBottom),
            item: it, value: value,
        };
    });

    var gradId = "chart-line-fill-" + (++lineGradientSeq);
    var NS = "http://www.w3.org/2000/svg";
    var svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", "0 0 " + W + " " + H);
    svg.setAttribute("preserveAspectRatio", "none");
    svg.setAttribute("class", "line-svg");
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", items.map(function (it) {
        return it.label + ": " + (it.display != null ? it.display : (Number(it.value) || 0));
    }).join(", "));

    var defs = document.createElementNS(NS, "defs");
    var grad = document.createElementNS(NS, "linearGradient");
    grad.setAttribute("id", gradId);
    grad.setAttribute("x1", "0"); grad.setAttribute("y1", "0");
    grad.setAttribute("x2", "0"); grad.setAttribute("y2", "1");
    [["0%", "0.28"], ["100%", "0"]].forEach(function (stop) {
        var s = document.createElementNS(NS, "stop");
        s.setAttribute("offset", stop[0]);
        s.setAttribute("stop-color", "var(--jade)");
        s.setAttribute("stop-opacity", stop[1]);
        grad.appendChild(s);
    });
    defs.appendChild(grad);
    svg.appendChild(defs);

    /* Recessive baseline only — a full grid would fight a curve this small. */
    var base = document.createElementNS(NS, "line");
    base.setAttribute("x1", 0); base.setAttribute("x2", W);
    base.setAttribute("y1", H - padBottom); base.setAttribute("y2", H - padBottom);
    base.setAttribute("class", "line-baseline");
    svg.appendChild(base);

    var area = document.createElementNS(NS, "path");
    area.setAttribute("d", smoothPath(points)
        + " L " + points[points.length - 1].x + " " + (H - padBottom)
        + " L " + points[0].x + " " + (H - padBottom) + " Z");
    area.setAttribute("fill", "url(#" + gradId + ")");
    svg.appendChild(area);

    var line = document.createElementNS(NS, "path");
    line.setAttribute("d", smoothPath(points));
    line.setAttribute("class", "line-stroke");
    svg.appendChild(line);

    points.forEach(function (p, i) {
        var dot = document.createElementNS(NS, "circle");
        dot.setAttribute("cx", p.x);
        dot.setAttribute("cy", p.y);
        /* The final point is the one being read most often, so it is the
           emphasised marker; the rest stay quiet. */
        dot.setAttribute("r", i === points.length - 1 ? 4.5 : 3);
        dot.setAttribute("class", i === points.length - 1 ? "line-dot line-dot-last" : "line-dot");
        var title = document.createElementNS(NS, "title");
        title.textContent = p.item.label + ": " + (p.item.display != null ? p.item.display : p.value);
        dot.appendChild(title);
        svg.appendChild(dot);
    });

    var plot = el("div", "line-plot");
    plot.appendChild(svg);
    container.appendChild(plot);

    var axis = el("div", "line-axis");
    series.forEach(function (it, i) {
        var cell = el("span", "line-axis-label", it.label);
        /* Only the last value is printed on the chart — a number on every
           point turns a trend into a table. */
        if (i === series.length - 1) {
            cell.appendChild(el("strong", "line-axis-value",
                it.display != null ? it.display : String(Number(it.value) || 0)));
        }
        axis.appendChild(cell);
    });
    container.appendChild(axis);
}

/* An ordered pipeline: each stage is a subset of the one before it, so the
   bars taper and are centred to make that narrowing legible at a glance —
   which a plain bar list, sorted or not, doesn't communicate. */
export function renderFunnel(container, items, options) {
    if (!container) return;
    var opts = options || {};
    container.innerHTML = "";
    var total = items.reduce(function (sum, it) { return sum + (Number(it.value) || 0); }, 0);
    if (!total) {
        container.appendChild(el("p", "chart-empty", opts.emptyText || ""));
        return;
    }
    var max = items.reduce(function (m, it) { return Math.max(m, Number(it.value) || 0); }, 0);
    items.forEach(function (it) {
        var value = Number(it.value) || 0;
        var row = el("div", "funnel-row");
        row.appendChild(el("div", "funnel-label", it.label));
        var track = el("div", "funnel-track");
        var band = el("div", "funnel-band" + (it.tone ? " tone-" + it.tone : ""));
        band.style.width = (max > 0 ? Math.max((value / max) * 100, value > 0 ? 4 : 0) : 0) + "%";
        band.title = it.label + ": " + value;
        track.appendChild(band);
        row.appendChild(track);
        row.appendChild(el("div", "funnel-value", value + " · " + pct(value, total) + "%"));
        container.appendChild(row);
    });
}

/* Part-to-whole. Unlike the bar/column helpers above, the slices here DO carry
   identity, so this is the one chart in the file with a categorical palette —
   three hues validated for colourblind separation against both the light and
   dark surfaces (see --pie-1..3 in admin.css). Colour is never the only cue:
   every slice is named and counted in the legend beside it.
   Drawn with conic-gradient rather than SVG to stay consistent with the rest
   of the module — no library, and the theme tokens apply directly. */
export function renderPie(container, items, options) {
    if (!container) return;
    var opts = options || {};
    container.innerHTML = "";

    var total = items.reduce(function (sum, it) { return sum + (Number(it.value) || 0); }, 0);
    if (!total) {
        container.appendChild(el("p", "chart-empty", opts.emptyText || ""));
        return;
    }

    var GAP = 0.7; // degrees of surface colour between slices, in percent-of-circle
    var stops = [];
    var cursor = 0;
    items.forEach(function (it, i) {
        var share = ((Number(it.value) || 0) / total) * 100;
        if (share <= 0) return;
        var colour = "var(--pie-" + ((i % 3) + 1) + ")";
        var end = cursor + share;
        stops.push(colour + " " + cursor + "% " + Math.max(cursor, end - GAP) + "%");
        stops.push("var(--paper-raised) " + Math.max(cursor, end - GAP) + "% " + end + "%");
        cursor = end;
    });

    var wrap = el("div", "pie-wrap");
    var disc = el("div", "pie-disc");
    disc.style.background = "conic-gradient(" + stops.join(",") + ")";
    disc.setAttribute("role", "img");
    disc.setAttribute("aria-label", items.map(function (it) {
        return it.label + ": " + (Number(it.value) || 0);
    }).join(", "));
    wrap.appendChild(disc);

    var legend = el("div", "pie-legend");
    items.forEach(function (it, i) {
        var value = Number(it.value) || 0;
        var row = el("div", "pie-legend-row");
        var swatch = el("span", "pie-swatch");
        swatch.style.background = "var(--pie-" + ((i % 3) + 1) + ")";
        row.appendChild(swatch);
        row.appendChild(el("span", "pie-legend-label", it.label));
        /* Direct label: the count and its share, so the chart is readable
           without comparing slice angles by eye. */
        row.appendChild(el("span", "pie-legend-value", value + " · " + pct(value, total) + "%"));
        legend.appendChild(row);
    });
    wrap.appendChild(legend);
    container.appendChild(wrap);
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
