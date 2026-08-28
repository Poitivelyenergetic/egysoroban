import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";
import { auth } from "./firebase-init.js";
import { t, onLanguageChangeCallbacks } from "./i18n.js";

/* The map and the exact address are shown only to signed-in accounts. Both
   pages that carry a map gate it the same way and, once unlocked, expand it
   the same way, so one module owns both behaviours.
 *
 * Worth being clear about what this is: a sign-in prompt on the way to the
 * map, not a secret. The academy is a listed business, so anyone who searches
 * the name still finds the address — this makes the map a reason to make an
 * account, and it stops the embed loading for visitors who can't see it. */
var MAP_QUERY = "EGY Soroban Academy, Al-Mansoura, Egypt";

function buildIframe() {
    var frame = document.createElement("iframe");
    frame.src = "https://www.google.com/maps?q=" + encodeURIComponent(MAP_QUERY) + "&output=embed";
    frame.title = t("contact.mapTitle") || "EGY Soroban Academy location on the map";
    frame.loading = "lazy";
    frame.referrerPolicy = "no-referrer-when-downgrade";
    frame.allowFullscreen = true;
    return frame;
}

function buildLock() {
    var panel = document.createElement("div");
    panel.className = "map-lock";

    var icon = document.createElement("div");
    icon.className = "map-lock-icon";
    icon.setAttribute("aria-hidden", "true");
    icon.innerHTML = '<svg width="26" height="26" viewBox="0 0 24 24" fill="none">'
        + '<rect x="4.5" y="10.5" width="15" height="10" rx="2.2" stroke="currentColor" stroke-width="1.7"></rect>'
        + '<path d="M8.2 10.5V7.8a3.8 3.8 0 0 1 7.6 0v2.7" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"></path>'
        + "</svg>";
    panel.appendChild(icon);

    var title = document.createElement("p");
    title.className = "map-lock-title";
    title.textContent = t("location.lockedTitle");
    panel.appendChild(title);

    var body = document.createElement("p");
    body.className = "map-lock-body";
    body.textContent = t("location.lockedBody");
    panel.appendChild(body);

    var link = document.createElement("a");
    link.className = "btn btn-jade btn-sm";
    link.href = "portal.html";
    link.textContent = t("location.lockedBtn");
    panel.appendChild(link);

    return panel;
}

/* The homepage expand control sits BELOW the map, not on it. Two reasons: an
   overlay button covers the pins and Google's own controls, which is what the
   user objected to; and the map itself can't be the control at all, because
   the embed is a cross-origin iframe that swallows every click before the
   parent sees it. A sibling button has neither problem and is keyboard- and
   screen-reader-addressable for free. */
function hintFor(host) {
    return host.parentElement && host.parentElement.querySelector("[data-map-toggle]");
}

function wireSelfExpand(host) {
    var hint = hintFor(host);
    if (!hint || hint.dataset.expandWired === "1") return;
    hint.dataset.expandWired = "1";
    hint.addEventListener("click", function () {
        var expanded = host.classList.toggle("expanded");
        hint.setAttribute("aria-expanded", expanded ? "true" : "false");
        syncHint(host);
    });
}

function syncHint(host) {
    var hint = hintFor(host);
    if (!hint) return;
    hint.textContent = t(host.classList.contains("expanded") ? "home.mapClickCollapse" : "home.mapClickExpand");
}

function apply(signedIn) {
    document.querySelectorAll("[data-location-gate]").forEach(function (host) {
        host.innerHTML = "";
        host.classList.toggle("locked", !signedIn);
        if (!signedIn) {
            host.classList.remove("expanded");
            host.appendChild(buildLock());
        } else {
            host.appendChild(buildIframe());
            if (host.hasAttribute("data-map-expand")) wireSelfExpand(host);
        }
        var hint = hintFor(host);
        if (hint) {
            hint.hidden = !signedIn;
            if (!signedIn) hint.setAttribute("aria-expanded", "false");
            else syncHint(host);
        }
    });

    /* The coordinates card is part of the location, so it goes behind the same
       gate rather than sitting there naming the spot the map is hiding. */
    document.querySelectorAll("[data-location-card]").forEach(function (card) {
        card.hidden = !signedIn;
    });
}

onAuthStateChanged(auth, function (user) { apply(!!user); });
apply(!!auth.currentUser);
onLanguageChangeCallbacks.push(function () { apply(!!auth.currentUser); });
