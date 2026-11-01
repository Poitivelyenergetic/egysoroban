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

- [ ] **Online classroom (owner's idea).** "Attend from home" live classes inside
      the portal: class schedule, a Join button that opens the video room in
      the page, teacher controls, automatic attendance. Plan: Daily.co Prebuilt
      embed (free tier ≈ 10k participant-minutes/month — confirm on daily.co).
      v1 can use room links the teacher pastes; v2 creates rooms per class from
      a Cloud Function (needs the Blaze plan and a Daily API key the owner adds
      with `firebase functions:secrets:set DAILY_API_KEY`).
- [ ] **Free trial class as the main call to action.** Book a free trial in two
      steps (child's age + slot + phone), no account, WhatsApp confirmation link
      with a pre-filled message. Live site has none; competitors lead with it.
- [ ] **"Find your child's level" quiz** built on the try-it flash challenge,
      ending in the trial booking.
- [ ] **Privacy policy + terms (formal Arabic + English)** and a consent
      checkbox on the forms — they collect a child's national ID, religion and
      medical notes (Egypt PDPL 151/2020).
- [ ] **Split sensitive application fields** (national ID, religion, medical,
      address) into an admin-only subcollection, so teachers can get a slim
      read-only view of new applicants again if the academy wants that.
- [ ] **Trial-slot booking order:** save the application first, then book the
      seat (today a failed save still uses up a seat); stop scripts from filling
      every slot (App Check / reCAPTCHA Enterprise).

## Next

- [ ] Move the staff console off the homepage into staff.html (homepage
      currently loads ~3,000 lines of admin code and ~1,000 lines of admin HTML
      for every parent).
- [ ] Inline head script that sets theme, lang and dir before paint (stops the
      dark→light and English→Arabic flash).
- [ ] Image diet: WebP + srcset, fingerprinted filenames, drop ~4.7 MB of
      unused PNGs from deploys, trim fonts and combine the 23 stylesheets.
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

- Fees / price range, class sizes, branch address and hours.
- Proof for AIAMA membership, 2013 Mansoura University accreditation, and
  championship tallies before the site states them as fact.
- Which teachers should see new applications, if any.

## Log

- 2026-11-01 — Round 1. Locked down Firestore rules (staff phones and child
  application data were readable too widely; public forms now validated; dev
  verification backdoor removed; usage meter can only grow) with 24 emulator
  tests. All pages: doctype, SEO head tags, sitemap, robots, 404, schema.org,
  tel/mailto links. 100+ Arabic strings moved to Egyptian dialect. i18n no
  longer deletes "(optional)" markers. Motion sped up to 0.3–0.6 s, button
  press feedback, dashboard skeletons, count-ups and chart entrances. Years
  counter now computed from 2013.
