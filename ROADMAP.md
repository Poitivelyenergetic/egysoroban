# Egysoroban roadmap

The working plan for the new site (egysoroban.web.app). The real egysoroban.com
runs on a separate server and is never touched from here.

Each daily run picks the top unchecked item it can finish and ship in one go,
ticks it off, and adds a line to the log at the bottom. New ideas go into the
right section, ranked by what helps parents (the buyers) and the academy most.

House rules
- Arabic: Egyptian dialect everywhere, formal Arabic only for legal/official
  text (terms, privacy policy, certificates).
- Motion: 150–400 ms, smooth, always respects reduce-motion.
- Never state a claim (trophies, memberships, founder credentials, prices) the
  academy hasn't confirmed. Never invent testimonials.
- Every change: load every touched page, check console, phone width, Arabic/RTL.
  Rule changes: run the rules tests in the emulator first.
- No AI/assistant credit anywhere.

## Now (next few runs)

- [x] **Online classroom, part 1** (done 2026-11-14). Staff calendar: "Online
      room" per class (Daily link; admin ticks which students are in it), "Go
      live" / "End class". Portal: "Online class" box per child with schedule,
      live/next status and a Join button (opens 10 min early, or when live) that
      opens the Daily room full-screen in the page. New `classRooms/{classId}`
      with 31 rules tests: only the class's families (salted email hash) can
      open it, teachers only touch their own class's link/live, only
      `https://<team>.daily.co/<room>` links are accepted.
- [ ] **Online classroom, part 2 — private rooms.** Today a Daily room link is
      a "anyone with the link" room, protected only by being hidden behind the
      rules. Next: a Cloud Function creates a private room per class and hands
      out short-lived meeting tokens (owner token for the teacher = mute/remove
      controls). Needs the Blaze plan and a Daily API key the owner adds with
      `firebase functions:secrets:set DAILY_API_KEY`.
- [ ] **Online classroom, part 3 — automatic attendance.** When a child joins
      the room, mark them present for that session (Daily webhooks or the
      daily-js `participant-joined` event → teacher confirms). Also: a student
      in more than one class (today one `classId` per student), and refresh a
      room's family list automatically when an admin links a new parent email
      (today the admin re-saves the class's Online room).
- [ ] **Free trial class as the main call to action.** Book a free trial in two
      steps (child's age + slot + phone), no account, WhatsApp confirmation link
      with a pre-filled message. Live site has none; competitors lead with it.
- [ ] **"Find your child's level" quiz** built on the try-it flash challenge,
      ending in the trial booking.
- [x] Privacy policy + consent checkbox (done 2026-09-02).
- [ ] **Terms and conditions page** (formal Arabic + English), linked next to
      the privacy policy.
- [ ] **Split sensitive application fields** (national ID, religion, medical,
      address) into an admin-only subcollection, so teachers can get a slim
      read-only view of new applicants again if the academy wants that.
- [ ] **Trial-slot booking order:** save the application first, then book the
      seat (today a failed save still uses up a seat); stop scripts from filling
      every slot (App Check / reCAPTCHA Enterprise).

## Next

- [x] Staff console code only loads when a staff member opens it (done 2026-09-02).
- [ ] The ~1,000 lines of console HTML still ship inside index.html — move it
      into a template the console injects on open.
- [ ] Inline head script that sets theme, lang and dir before paint (stops the
      dark→light and English→Arabic flash).
- [x] WebP gallery, bundled/minified JS and one CSS bundle via esbuild (done 2026-09-02).
- [ ] Image diet, part 2: srcset sizes, drop the ~4.7 MB of unused PNGs from
      assets/, trim font weights.
- [ ] Accessible dialogs (role=dialog, focus trap) and keyboard-friendly
      application rows; link every label to its input; fix light-theme
      contrast tokens and focus ring.
- [ ] Shared level helper (levels 1–10 = KYU 10→1, 11 = graduate) — portal and
      admin disagree on beginner/intermediate/expert boundaries.
- [ ] Programs page upgrade: age tracks, what each KYU level teaches, exam and
      certificate path, timeline. Fees once the academy confirms them.
- [ ] Parent testimonials + verified results page (needs real quotes/photos
      with permission from the academy).
- [ ] Contact: map, opening hours, WhatsApp with pre-filled message, call-me-back.
- [ ] Trainer-training / franchise page (live site links to it; it doesn't exist).
- [ ] Competitions hub: calendar, countdown, past results (confirm what WAPR is).
- [ ] Arabic content indexable by search engines (server-side or pre-rendered
      Arabic pages with hreflang); one canonical host.

## Later

- [ ] Parent portal: fees and payment history, attendance dates,
      announcements, message the teacher, real confirmation emails.
- [ ] Staff: CSV export (strings exist, code doesn't), audit log, new-application
      alerts, payment reminders, backups.
- [ ] Move Cloud Functions to Node 22; align usage-meter day boundaries (Pacific).
- [ ] Analytics consent prompt.

## Questions for the academy (only the owner can answer)

- **To turn on online classes:** make a free account at daily.co, create one
  room per class (Rooms → Create room), and paste each room's link into the
  staff console: Calendar → the class → "Online room". Then tick the students
  in that class. Try one class with a teacher and a parent before announcing.
  Check Daily's current free allowance on their pricing page.

- Fees / price range, class sizes, branch address and hours.
- Proof for AIAMA membership, 2013 Mansoura University accreditation, and
  championship tallies before the site states them as fact.
- Which teachers should see new applications, if any.

## How this repo works now

- `npm run build` (runs automatically before `firebase deploy`) bundles every
  `js/*-page.js` entry and all CSS into hashed files under `dist/`, which is
  what Firebase Hosting serves. A new page needs a matching `js/<page>-page.js`.
- Rules tests: `cd tests && npm test` (Firestore emulator; needs Java). On
  Windows the emulator can be left running after a run — if the port is
  taken, point a scratch firebase.json at another port. If the emulator dies
  with "Unable to establish loopback connection", set
  `JAVA_TOOL_OPTIONS=-Djdk.net.unixdomain.tmpdir=<short folder>` first.
- Work happens in THIS folder only. The "- Copy" folder was where the
  2026-09-01/02 work happened; it is now merged here and should be retired.

## Log

- 2026-09-01/02 — (from the "- Copy" folder) verified-email writes, admin
  dashboard lazy-loaded, rules tests, esbuild pipeline, WebP gallery, privacy
  policy + consent, SEO metadata, a11y and copy fixes.
- 2026-11-01 — Round 1, merged on top of the above. Locked down Firestore rules (staff phones and child
  application data were readable too widely; public forms now validated; dev
  verification backdoor removed; usage meter can only grow) with 24 emulator
  tests. All pages: doctype, SEO head tags, sitemap, robots, 404, schema.org,
  tel/mailto links. 100+ Arabic strings moved to Egyptian dialect. i18n no
  longer deletes "(optional)" markers. Motion sped up to 0.3–0.6 s, button
  press feedback, dashboard skeletons, count-ups and chart entrances. Years
  counter now computed from 2013.
- 2026-11-14 — Online classroom part 1: Join button in the parent portal,
  Go live / End class and room links in the staff calendar, video room opens
  in the page. New classRooms rules + 31 emulator tests. Owner: needs a
  daily.co account and room links before families can use it.
