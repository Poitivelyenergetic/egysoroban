#!/usr/bin/env node
/* Rewrites the ?v= cache-busting stamp on every asset URL in the HTML files.
 *
 * The stamp existed but was a single frozen constant — the same value on all
 * 167 asset URLs across every page, never bumped — so it busted nothing, and
 * a deploy could leave visitors running the previous CSS and JS. Run this
 * before deploying: `node scripts/stamp-assets.js`.
 *
 * The Cache-Control headers in firebase.json are the real guarantee (js/css/
 * html revalidate via ETag on every request). This is belt-and-braces for
 * intermediate proxies that ignore no-cache. */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const stamp = String(Math.floor(Date.now() / 1000));
let touched = 0;
let urls = 0;

for (const file of fs.readdirSync(root)) {
    if (!file.endsWith(".html")) continue;
    const full = path.join(root, file);
    const before = fs.readFileSync(full, "utf8");
    const after = before.replace(/(\?v=)\d+/g, (_m, p1) => { urls++; return p1 + stamp; });
    if (after !== before) {
        fs.writeFileSync(full, after);
        touched++;
    }
}

console.log(`stamped ${urls} asset URLs across ${touched} html files with v=${stamp}`);
