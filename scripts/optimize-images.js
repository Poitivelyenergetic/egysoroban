// One-off content transform (not part of the build): converts the family/
// WAPR gallery photos to resized, compressed WebP.
//
// These images are shared between three CSS contexts (a ~340-560px carousel,
// ~110-200px moments-grid tiles, and a lightbox capped at min(88vw, 900px) —
// see css/lightbox.css) AND every one of those containers is wired to the
// same click-to-enlarge lightbox (js/lightbox.js), which reuses whichever
// resolution the clicked thumbnail already loaded (img.currentSrc) rather
// than pointing at a separate full-size source. A srcset that serves a small
// image to the thumbnail contexts would make the lightbox reuse that same
// small image, enlarged and soft. So instead of a multiple-width srcset, every
// image gets ONE resize target sized for its largest real context (the
// 900px-cap lightbox), which is already enough resolution for every smaller
// context too.
//
// Run manually with `node scripts/optimize-images.js` when photos change —
// this is a content-authoring step, not something the production build
// re-derives on every deploy.
import sharp from "sharp";
import { readFileSync, writeFileSync, statSync, unlinkSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const MAX_WIDTH = 1000;
const QUALITY = 78;

const familyDir = join(root, "assets", "family");
const targets = readdirSync(familyDir)
    .filter((f) => f.endsWith(".jpg"))
    .map((f) => join(familyDir, f))
    .concat([join(root, "assets", "honor-ceremony.jpg")]);

var totalBefore = 0, totalAfter = 0;
const renamed = [];

for (const jpgPath of targets) {
    const before = statSync(jpgPath).size;
    const webpPath = jpgPath.replace(/\.jpg$/, ".webp");
    await sharp(jpgPath)
        .resize({ width: MAX_WIDTH, withoutEnlargement: true })
        .webp({ quality: QUALITY })
        .toFile(webpPath);
    const after = statSync(webpPath).size;
    totalBefore += before;
    totalAfter += after;
    unlinkSync(jpgPath);
    renamed.push([jpgPath.slice(root.length + 1).replace(/\\/g, "/"), webpPath.slice(root.length + 1).replace(/\\/g, "/")]);
    console.log(
        renamed[renamed.length - 1][0] + " -> " + renamed[renamed.length - 1][1] +
        "  " + (before / 1024).toFixed(0) + "KB -> " + (after / 1024).toFixed(0) + "KB"
    );
}

console.log(
    "\nTotal: " + (totalBefore / 1024 / 1024).toFixed(2) + "MB -> " + (totalAfter / 1024 / 1024).toFixed(2) +
    "MB (" + (100 - (totalAfter / totalBefore) * 100).toFixed(0) + "% smaller)"
);

/* Rewrite every HTML reference from .jpg to .webp. */
const htmlFiles = readdirSync(root).filter((f) => f.endsWith(".html"));
var editCount = 0;
for (const file of htmlFiles) {
    const path = join(root, file);
    var html = readFileSync(path, "utf8");
    var changed = false;
    for (const [jpgRel] of renamed) {
        var webpRel = jpgRel.replace(/\.jpg$/, ".webp");
        var before = html;
        html = html.split('"' + jpgRel + '"').join('"' + webpRel + '"');
        if (html !== before) { changed = true; editCount++; }
    }
    if (changed) writeFileSync(path, html);
}
console.log("Rewrote " + editCount + " <img> references across " + htmlFiles.length + " HTML files.");
