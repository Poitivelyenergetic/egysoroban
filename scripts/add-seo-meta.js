// One-off content transform: adds a meta description, canonical link,
// Open Graph tags, and a shared JSON-LD EducationalOrganization block to
// every page's <head>. Run manually with `node scripts/add-seo-meta.js`.
import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const SITE = "https://egysoroban.web.app";

const pages = {
    "index.html": {
        path: "",
        ogTitle: "EGY Soroban Academy — Mental Arithmetic Training, Al-Mansoura, Egypt",
        description: "EGY Soroban Academy — Egypt's official AIAMA-member soroban academy in Al-Mansoura. Mental arithmetic training for children ages 4–12 since 2013.",
    },
    "about.html": {
        ogTitle: "About EGY Soroban Academy",
        description: "18 years turning children into abacus champions. Meet EGY Soroban Academy, Egypt's official AIAMA representative, founded 2013 by Dr. Rania Suleiman.",
    },
    "vision.html": {
        ogTitle: "Mission & Vision — EGY Soroban Academy",
        description: "EGY Soroban Academy's mission and vision for mental arithmetic education, and why training this way changes how a child thinks.",
    },
    "programs.html": {
        ogTitle: "Programs — EGY Soroban Academy",
        description: "EGY Soroban Academy's soroban mental arithmetic programs, from Beginner to Expert, for children ages 4 to 12.",
    },
    "try-it.html": {
        ogTitle: "Try Mental Math Yourself — EGY Soroban Academy",
        description: "Try a soroban mental math demo — tap the beads to form numbers or take a flash-addition challenge, no sign-up needed.",
    },
    "journey.html": {
        ogTitle: "The Learning Journey — EGY Soroban Academy",
        description: "The 11-level path from a child's first bead to full mental arithmetic at EGY Soroban Academy, with an AIAMA-certified exam closing each level.",
    },
    "stories.html": {
        ogTitle: "Student Stories & Achievements — EGY Soroban Academy",
        description: "Real results from EGY Soroban Academy — 100+ championship wins, 4 world titles, and stories from our students and families.",
    },
    "news.html": {
        ogTitle: "News — EGY Soroban Academy",
        description: "Latest news and updates from EGY Soroban Academy.",
    },
    "faq.html": {
        ogTitle: "FAQ — EGY Soroban Academy",
        description: "Answers to common questions about EGY Soroban Academy's mental arithmetic program — age range, class format, exams, and results.",
    },
    "contact.html": {
        ogTitle: "Contact EGY Soroban Academy",
        description: "Contact EGY Soroban Academy in Al-Mansoura, Egypt — phone, email, and branch location.",
    },
    "apply.html": {
        ogTitle: "Apply to EGY Soroban Academy",
        description: "Apply to EGY Soroban Academy's soroban mental arithmetic program, or register for an upcoming competition. A branch representative replies within 24 hours.",
    },
    "competition.html": {
        ogTitle: "Competition Registration — EGY Soroban Academy",
        description: "Register your child for an upcoming EGY Soroban Academy competition — a lighter, faster sign-up than full enrollment.",
    },
    "teach.html": {
        ogTitle: "Join Our Team — EGY Soroban Academy",
        description: "Join EGY Soroban Academy's teaching team — apply to become a certified soroban instructor.",
    },
    "portal.html": {
        ogTitle: "Parent & Student Portal — EGY Soroban Academy",
        description: "Sign in or sign up to track your child's soroban progress, level, attendance, and homework at EGY Soroban Academy.",
    },
    "privacy.html": {
        ogTitle: "Privacy Policy — EGY Soroban Academy",
        description: "What personal information EGY Soroban Academy collects, why, how it's stored, and how to request corrections or deletion.",
    },
};

const jsonLd = {
    "@context": "https://schema.org",
    "@type": "EducationalOrganization",
    "name": "EGY Soroban Academy",
    "alternateName": "Egysoroban",
    "url": SITE + "/",
    "logo": SITE + "/assets/logo.png",
    "image": SITE + "/assets/og-image.jpg",
    "telephone": "+20 120 819 8100",
    "email": "info@egysoroban.com",
    "address": {
        "@type": "PostalAddress",
        "addressLocality": "Al-Mansoura",
        "addressCountry": "EG",
    },
    "sameAs": [
        "https://www.instagram.com/sorobanegy",
        "https://www.facebook.com/share/1HhkmkXW1g/",
        "https://youtube.com/@egysorobanacademy",
    ],
};

var editCount = 0;
for (const file in pages) {
    const cfg = pages[file];
    const filePath = join(root, file);
    var html = readFileSync(filePath, "utf8");

    var headEnd = html.indexOf("</head>");
    if (html.slice(0, headEnd).includes('<meta name="description"')) {
        console.log("skip (already has meta) " + file);
        continue;
    }

    var url = SITE + "/" + (cfg.path !== undefined ? cfg.path : file);
    var block =
        '    <meta name="description" content="' + cfg.description + '">\n' +
        '    <link rel="canonical" href="' + url + '">\n' +
        '    <meta property="og:type" content="website">\n' +
        '    <meta property="og:title" content="' + cfg.ogTitle + '">\n' +
        '    <meta property="og:description" content="' + cfg.description + '">\n' +
        '    <meta property="og:image" content="' + SITE + '/assets/og-image.jpg">\n' +
        '    <meta property="og:url" content="' + url + '">\n' +
        '    <script type="application/ld+json">' + JSON.stringify(jsonLd) + '</script>\n';

    var marker = '<meta name="viewport" content="width=device-width, initial-scale=1">\n';
    var idx = html.indexOf(marker);
    if (idx === -1) throw new Error("viewport meta not found in " + file);
    idx += marker.length;
    html = html.slice(0, idx) + block + html.slice(idx);

    writeFileSync(filePath, html);
    editCount++;
}
console.log("Added SEO meta to " + editCount + " pages.");
