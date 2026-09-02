// Production build: bundles/minifies the public JS entry points (one per
// page) and all public CSS into hashed files under dist/, then rewrites each
// source HTML file's <link>/<script> tags to point at the bundled output.
//
// The admin dashboard code never becomes its own explicit entry point here —
// admin-gate.js reaches it only through a dynamic import() (see js/admin-gate.js),
// and esbuild's splitting automatically puts anything reached only that way
// into its own chunk, separate from the eagerly-loaded per-page bundles.
import { build, transform } from "esbuild";
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync, cpSync, readdirSync } from "fs";
import { createHash } from "crypto";
import { join, dirname, basename, relative, resolve } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const distDir = join(root, "dist");

rmSync(distDir, { recursive: true, force: true });
mkdirSync(distDir, { recursive: true });

/* ---------- JS: one entry per page, code-split, minified, hashed ---------- */
const jsDir = join(root, "js");
const jsEntries = readdirSync(jsDir).filter((f) => f.endsWith("-page.js")).map((f) => join(jsDir, f));

const jsResult = await build({
    entryPoints: jsEntries,
    bundle: true,
    splitting: true,
    format: "esm",
    outdir: join(distDir, "js"),
    outbase: jsDir,
    minify: true,
    sourcemap: false,
    entryNames: "[name]-[hash]",
    chunkNames: "chunks/[name]-[hash]",
    metafile: true,
    external: ["https://www.gstatic.com/*"],
    target: "es2020",
    platform: "browser",
    logLevel: "warning",
});

/* Map "index-page.js" -> "js/index-page-<hash>.js" so the HTML rewrite below
   can find each page's actual bundled filename. */
/* metafile output keys are relative to process.cwd() (this script always
   runs from the repo root), not to distDir — resolve through an absolute
   path rather than assuming a shared string prefix. */
var entryOutputFor = {};
for (var outPath in jsResult.metafile.outputs) {
    var meta = jsResult.metafile.outputs[outPath];
    if (meta.entryPoint) {
        entryOutputFor[basename(meta.entryPoint)] = relative(distDir, resolve(root, outPath)).replace(/\\/g, "/");
    }
}

/* ---------- CSS: every stylesheet concatenated into one minified, hashed file ----------
   None of these files use url(...) for images/fonts, so a straight
   concatenate-then-minify (no bundler resolution) is safe and avoids having
   to teach esbuild about this repo's asset layout. */
const cssDir = join(root, "css");
const cssOrder = [
    "tokens.css", "brand-egysoroban.css", "base.css", "header.css",
    ...readdirSync(cssDir).filter((f) => f.endsWith(".css"))
        .filter((f) => !["tokens.css", "brand-egysoroban.css", "base.css", "header.css", "footer.css"].includes(f))
        .sort(),
    "footer.css",
];
const cssSource = cssOrder.map((f) => readFileSync(join(cssDir, f), "utf8")).join("\n");
const cssMinified = (await transform(cssSource, { loader: "css", minify: true })).code;
const cssHash = createHash("sha256").update(cssMinified).digest("hex").slice(0, 8);
const cssOutName = `public-${cssHash}.css`;
mkdirSync(join(distDir, "css"), { recursive: true });
writeFileSync(join(distDir, "css", cssOutName), cssMinified);

/* ---------- HTML: rewrite each page's <link>/<script> tags to the bundled output ---------- */
const htmlFiles = readdirSync(root).filter((f) => f.endsWith(".html"));
var htmlCount = 0;
for (var i = 0; i < htmlFiles.length; i++) {
    var file = htmlFiles[i];
    var html = readFileSync(join(root, file), "utf8");

    var cssLinkRe = /[ \t]*<link rel="stylesheet" href="css\/[^"]+\.css(?:\?[^"]*)?">\r?\n/g;
    var firstCssMatch = cssLinkRe.exec(html);
    if (!firstCssMatch) throw new Error("No CSS <link> tags found in " + file);
    html = html.replace(cssLinkRe, "");
    var newCssTag = '    <link rel="stylesheet" href="css/' + cssOutName + '">\n';
    html = html.slice(0, firstCssMatch.index) + newCssTag + html.slice(firstCssMatch.index);

    var pageJsName = file.replace(/\.html$/, "") === "try-it" ? "tryit-page.js" : file.replace(/\.html$/, "-page.js");
    var hashedJs = entryOutputFor[pageJsName];
    if (!hashedJs) throw new Error("No bundled JS output found for " + file + " (expected " + pageJsName + ")");
    var scriptRe = new RegExp('<script type="module" src="js\\/' + pageJsName.replace(/\./g, "\\.") + '(?:\\?[^"]*)?"><\\/script>');
    if (!scriptRe.test(html)) throw new Error("No matching <script> tag found in " + file + " for " + pageJsName);
    html = html.replace(scriptRe, '<script type="module" src="' + hashedJs + '"></script>');

    writeFileSync(join(distDir, file), html);
    htmlCount++;
}

/* ---------- Static passthrough: assets, and any top-level static files ---------- */
cpSync(join(root, "assets"), join(distDir, "assets"), { recursive: true });
["robots.txt", "sitemap.xml", "favicon.ico"].forEach((f) => {
    if (existsSync(join(root, f))) cpSync(join(root, f), join(distDir, f));
});

console.log(
    "Built " + htmlCount + " pages, " + Object.keys(entryOutputFor).length + " JS entries, 1 CSS bundle (" +
    (cssMinified.length / 1024).toFixed(1) + " KB) -> dist/"
);
