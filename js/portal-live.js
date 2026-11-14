import { t } from "./i18n.js";
import { state } from "./state.js";

/* The parent portal's "Online class" box, one per child who has been put in
   an online class (students/{id}.classId).

   The room is looked up by that class id; the rules only hand it over if the
   signed-in email is one of the class's families. Anything short of a room —
   none set up yet, or the lookup refused — simply leaves the box out rather
   than showing an error a parent can do nothing about. It re-checks every 30
   seconds, so the Join button opens on its own when class time comes. */

/* Only needed once a child actually has a class, so fetched on first use
   rather than on every portal visit. */
var modules = null;
function loadModules() {
    if (!modules) modules = Promise.all([import("./class-rooms.js"), import("./classroom.js")]);
    return modules;
}

var timers = [];
export function clearLiveTimers() {
    timers.forEach(function (id) { clearInterval(id); });
    timers = [];
}

function locale() { return state.lang === "ar" ? "ar-EG" : "en-GB"; }

function weekdayName(day) {
    var d = new Date(Date.UTC(2024, 8, 1 + (Number(day) || 0))); // 2024-09-01 was a Sunday
    return d.toLocaleDateString(locale(), { weekday: "long", timeZone: "UTC" });
}

function clockTime(hhmm) {
    var parts = String(hhmm || "").split(":");
    var d = new Date();
    d.setHours(Number(parts[0]) || 0, Number(parts[1]) || 0, 0, 0);
    return d.toLocaleTimeString(locale(), { hour: "numeric", minute: "2-digit" });
}

export function renderLiveBox(s) {
    var box = document.createElement("div");
    box.className = "portal-live portal-live-skeleton";
    box.setAttribute("aria-busy", "true");
    ["40%", "70%", "30%"].forEach(function (w) {
        var line = document.createElement("span");
        line.className = "skeleton skeleton-line";
        line.style.width = w;
        box.appendChild(line);
    });

    loadModules().then(async function (mods) {
        var res = await mods[0].loadRoom(s.classId);
        if (!res.ok || !res.room) { box.remove(); return; }
        var paint = function () { paintLiveBox(box, res.room, s, mods); };
        paint();
        timers.push(setInterval(paint, 30000));
    }).catch(function () { box.remove(); });

    return box;
}

/* Draws the box for one room. Split from the lookup so it can be redrawn on a
   timer — and checked against sample rooms — without touching Firestore. */
export function paintLiveBox(box, room, s, mods) {
    if (!box.isConnected) return;
    var rooms = mods[0], classroom = mods[1];
    var st = rooms.sessionState(room);
    box.className = "portal-live" + (st.live ? " is-live" : "");
    box.removeAttribute("aria-busy");
    box.innerHTML = "";

    var head = document.createElement("div");
    head.className = "portal-live-head";
    var h4 = document.createElement("h4");
    h4.textContent = t("room.onlineTitle");
    head.appendChild(h4);
    var pill = document.createElement("span");
    pill.className = "live-pill";
    if (st.live) {
        pill.classList.add("is-live");
        var dot = document.createElement("span");
        dot.className = "live-dot";
        dot.setAttribute("aria-hidden", "true");
        pill.appendChild(dot);
        pill.appendChild(document.createTextNode(t("room.liveNow")));
    } else if (st.open) {
        pill.classList.add("is-soon");
        pill.textContent = t("room.startingSoon");
    } else if (st.start) {
        pill.textContent = t("room.nextClass") + " " + st.start.toLocaleString(locale(), {
            weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit",
        });
    }
    if (pill.textContent) head.appendChild(pill);
    box.appendChild(head);

    var when = document.createElement("div");
    when.className = "portal-live-when";
    var bits = [t("room.every") + " " + weekdayName(room.dayOfWeek), clockTime(room.startTime),
        (Number(room.durationMins) || 60).toLocaleString(locale()) + t("calendar.minsShort")];
    if (room.teacherName) bits.push(t("room.teacherPrefix") + " " + room.teacherName);
    when.textContent = bits.join(" · ");
    box.appendChild(when);

    if (!room.roomUrl) {
        var noLink = document.createElement("p");
        noLink.className = "portal-live-hint";
        noLink.textContent = t("room.noLink");
        box.appendChild(noLink);
        return;
    }
    var join = document.createElement("button");
    join.type = "button";
    join.className = "btn btn-jade btn-join";
    join.disabled = !st.open;
    join.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="2.5" y="6" width="13" height="12" rx="2.5" stroke="currentColor" stroke-width="1.8"/><path d="m15.5 10.5 6-3.5v10l-6-3.5" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>';
    join.appendChild(document.createTextNode(t("room.joinBtn")));
    join.addEventListener("click", function () {
        classroom.openClassroom({ url: room.roomUrl, title: (s.name ? s.name + " — " : "") + t("room.onlineTitle") });
    });
    box.appendChild(join);
    if (!st.open) {
        var hint = document.createElement("p");
        hint.className = "portal-live-hint";
        hint.textContent = t("room.joinHint");
        box.appendChild(hint);
    }
}
