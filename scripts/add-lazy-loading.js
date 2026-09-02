// One-off content transform: adds loading="lazy" to every <img> that's
// missing it, except the header brand mark (always visible immediately on
// every page) and the homepage hero carousel's first slide (the page's LCP
// candidate). Everything else — footer logo, the About/WAPR carousels,
// moments-grid duplicates, achievement photos — sits below the fold.
import { readFileSync, writeFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const htmlFiles = readdirSync(root).filter((f) => f.endsWith(".html"));

var totalAdded = 0;
for (const file of htmlFiles) {
    const path = join(root, file);
    var html = readFileSync(path, "utf8");

    // The homepage hero carousel's first <img> is the LCP candidate — find
    // its exact position once so the replace pass below can skip only that one.
    var heroImgStart = -1;
    if (file === "index.html") {
        var heroMarker = html.indexOf("hero-carousel");
        if (heroMarker !== -1) heroImgStart = html.indexOf("<img", heroMarker);
    }

    html = html.replace(/<img\b[^>]*>/g, function (tag, offset) {
        if (/\bloading=/.test(tag)) return tag;
        if (/class="brand-mark-img"/.test(tag)) return tag;
        if (offset === heroImgStart) return tag;
        totalAdded++;
        return tag.slice(0, -1).replace(/\s*$/, "") + ' loading="lazy">';
    });

    writeFileSync(path, html);
}
console.log("Added loading=\"lazy\" to " + totalAdded + " <img> tags across " + htmlFiles.length + " HTML files.");
