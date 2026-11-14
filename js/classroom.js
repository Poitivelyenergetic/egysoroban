import { t } from "./i18n.js";
import { isDailyUrl } from "./class-rooms.js";

/* Opens a Daily room full-screen inside the page — Daily's own "Prebuilt"
   call screen in an iframe, so camera, mic, chat and screen-share all come
   from Daily and nothing has to be installed. The link is checked against the
   same pattern the Firestore rules enforce before it goes anywhere near the
   frame, so a bad value can never load some other site in its place.

   Returns a close() function. onLeave runs once, however the room is closed. */
export function openClassroom(opts) {
    var url = String((opts && opts.url) || "").trim();
    if (!isDailyUrl(url)) return function () { };

    var lastFocus = document.activeElement;
    var overlay = document.createElement("div");
    overlay.className = "classroom-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", opts.title || t("room.onlineTitle"));

    var bar = document.createElement("div");
    bar.className = "classroom-bar";
    var title = document.createElement("div");
    title.className = "classroom-title";
    var dot = document.createElement("span");
    dot.className = "live-dot";
    dot.setAttribute("aria-hidden", "true");
    title.appendChild(dot);
    var titleText = document.createElement("span");
    titleText.textContent = opts.title || t("room.onlineTitle");
    title.appendChild(titleText);
    bar.appendChild(title);

    var leave = document.createElement("button");
    leave.type = "button";
    leave.className = "btn btn-sm classroom-leave";
    leave.textContent = opts.leaveLabel || t("room.leaveBtn");
    bar.appendChild(leave);
    overlay.appendChild(bar);

    var frameWrap = document.createElement("div");
    frameWrap.className = "classroom-frame-wrap";
    var spinner = document.createElement("div");
    spinner.className = "classroom-loading skeleton";
    spinner.setAttribute("aria-hidden", "true");
    frameWrap.appendChild(spinner);
    var frame = document.createElement("iframe");
    frame.className = "classroom-frame";
    frame.title = t("room.frameTitle");
    frame.allow = "camera; microphone; fullscreen; display-capture; autoplay; clipboard-write";
    frame.referrerPolicy = "strict-origin-when-cross-origin";
    frame.addEventListener("load", function () { frameWrap.classList.add("is-loaded"); });
    frame.src = url;
    frameWrap.appendChild(frame);
    overlay.appendChild(frameWrap);

    document.body.appendChild(overlay);
    document.documentElement.classList.add("classroom-open");
    /* Next frame, so the entrance transition has a starting state to run from. */
    requestAnimationFrame(function () { overlay.classList.add("is-open"); });
    leave.focus();

    var closed = false;
    function close() {
        if (closed) return;
        closed = true;
        document.removeEventListener("keydown", onKey);
        /* Blank the frame first so the camera and mic are released at once,
           not after the fade-out. */
        frame.src = "about:blank";
        overlay.classList.remove("is-open");
        document.documentElement.classList.remove("classroom-open");
        setTimeout(function () { overlay.remove(); }, 220);
        if (lastFocus && lastFocus.focus) { try { lastFocus.focus(); } catch (e) { } }
        if (opts.onLeave) opts.onLeave();
    }
    /* Escape only reaches us while focus is on our own bar, not inside the
       call — which is right: Escape inside Daily belongs to Daily. */
    function onKey(e) { if (e.key === "Escape") close(); }
    document.addEventListener("keydown", onKey);
    leave.addEventListener("click", close);
    return close;
}
