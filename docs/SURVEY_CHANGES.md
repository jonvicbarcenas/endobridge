# EndoBridge: Survey-Driven Changes (Before and After)

- **Branch:** `survey-improvements` (created from `bf44dbf`, "Skip questionnaire measurements already supplied in lab entry")
- **Status:** not committed yet
- **Scope:** 39 files, about 2,339 lines added and 167 removed
- **Exact code diff:** `docs/SURVEY_CHANGES.patch`. Apply it with `git apply docs/SURVEY_CHANGES.patch` on a clean checkout of `bf44dbf`.

This document records every change made in response to the usability survey
(24 respondents) and explains each one as **Before → After**, with the files involved.
It is written to stand on its own, so you can paste it into another AI tool or review it
against the SRS/SDD and other project documents.

---

## 0. Survey summary that drove the changes

| Theme (from "What one change would improve the app most" + related questions) | Respondents |
|---|---|
| Definitions for medical terms and labels (e.g. "hirsutism", lab test names, units) | #2, #3, #13, #15 |
| Slow upload, and no feedback or error handling when an upload fails | #1, #3, #4, #12, #15, #16 |
| Interactive tutorial or guide to where things are | #8, #9, #16 |
| "Forgot password" / account recovery (optional Google login) | #4, #14 |
| UI too plain, panels and upload area hard to notice, colour scheme (pink suggested) | #6, #12, #13, #14 |
| Keep entered data if the page is refreshed; too much scrolling on phone | #21 |
| Weekly health summary chart on the home screen | #9 |
| Calendar for reminders | #13 |
| Reminder alert not showing even when enabled | #3 |
| Medication dosage units and forms (tablet, syrup, suspension, injection...) | #5 |
| Allow choosing 2 moods in daily log | #16 |
| More information on what the app offers, its limitations and safety measures | #3 |
| App does not work well outside Chrome | #8 (not fixed, see §12) |

Survey ratings context: 17 of 24 respondents used a phone. The lowest-rated item was
"Lab test names and units were understandable" (3 disagree, 3 neutral).

---

## 1. Plain-language definitions (glossary + ⓘ tooltips)

**Before**
- Lab fields showed only a name and unit, e.g. `HbA1c (%)`, `TSH (mIU/L)`, with no explanation.
- Symptom words such as "Hirsutism concern" appeared as Daily Log tags with no definition.
- The app had no glossary page.

**After**
- **New file `frontend/src/config/glossary.ts`:** plain-language definitions for:
  - all 15 biomarker keys (testosterone, triglycerides, glucose, cholesterol, HDL-C, LDL-C, TSH, Free T3, Free T4, HbA1c, fasting insulin, AMH, LH/FSH ratio, DHEAS, OGTT);
  - every unit (`mg/dL`, `ng/dL`, `ng/mL`, `pg/mL`, `mIU/L`, `uIU/mL`, `ug/dL`, `%`, `ratio`);
  - general and symptom terms: PCOS, BMI, Hirsutism, Acne, Hair thinning, Cycle irregularity, Spotting, Menstrual flow, Fatigue, Fasting, Reference range, Assay, Clinician review, Adherence, OCR.

  The definitions describe what a term means and never interpret the user's own values,
  in line with the non-diagnostic scope.
- **New component `InfoTip`** in `frontend/src/components/ui.tsx`:
  - an ⓘ button that opens a small note when tapped or clicked, so it works on phones where hover does not;
  - closes on Escape, an outside tap, scroll or resize;
  - the note is fixed-positioned and kept inside the screen, so it does not run off the right edge on phones (an issue found during testing and fixed);
  - accessibility: `aria-label="What is <term>?"`, `aria-expanded`, `aria-controls`, `role="note"`.
- `Field` (in `ui.tsx`) gained an optional `hint` prop that renders next to the label.
- **Lab Entry page:**
  - every lab field has an ⓘ showing the test definition and unit meaning;
  - assay-dependent tests also show the "clinician review" explanation;
  - BMI has an ⓘ;
  - the intro text tells users to tap ⓘ.
- **Questionnaire:** ⓘ added to Q4 (cycle regularity), Q7 (menstrual flow), Q9 (acne), Q10 and Q12 (hirsutism), Q11 (hair thinning), Q16 (spotting), Q19 (fatigue), Q29 (adherence).
- **Daily Logs:**
  - the tag "Hirsutism concern" was renamed to **"Excess hair growth (hirsutism)"**;
  - ⓘ added for hirsutism, spotting and adherence;
  - the placeholder text no longer uses the bare word "hirsutism".
- **New page `/glossary`** (`frontend/src/pages/GlossaryPage.tsx`): searchable and grouped into Lab tests, Symptoms, General terms and Units. Linked in the sidebar under "Help".

---

## 2. Lab result upload: speed, progress, and error handling

**Before** (`LabEntryPage.tsx`)
- The original file was read as a data URL and sent as-is. Phone photos of 3–6 MB or more were uploaded twice: once to `/api/lab-documents/scan`, then again to save the record.
- Files over 6 MB were rejected before any compression, so large phone photos simply failed.
- The only feedback was one line of green text: "Scanning lab result file for biomarker values...".
- There was **no try/catch**. A network error, timeout, 413, 429 or 400 left the message stuck on "Scanning..." with no error shown. This is what respondent #12 reported.
- A scan that found nothing was still shown in green, as if it had succeeded.
- There was no cancel and no retry.
- The upload control was a small plain button.

**After**
- **New `frontend/src/services/imageCompression.ts`:** JPEG, PNG and WEBP images over 700 KB are resized on the device:
  - longest edge at most 2000 px, re-encoded as JPEG at quality 0.85, on a white background;
  - the smaller version is used only when it is actually smaller;
  - if the browser cannot decode the image, the original file is used;
  - this happens *before* the 6 MB check, so large phone photos are accepted.
- **New API method `scanLabDocumentWithProgress`** (`frontend/src/services/backendApiService.ts`):
  - uses `XMLHttpRequest`, because `fetch` cannot report upload progress;
  - reports upload progress and when the upload completes;
  - supports cancelling through `AbortSignal`;
  - 120-second timeout;
  - maps failures to `BackendApiError`: status `0` for a network error, `408` for a timeout.
- **Upload states**, each with its own status card (`UploadStatus` component):
  - `preparing` → `uploading` (progress bar with %) → `scanning` ("can take up to 30 seconds for photos") → `saving` → `done` / `warning` / `error`;
  - a 4-segment step indicator shows which stage is running;
  - a **Cancel** button appears during upload and scanning;
  - a **Retry** button appears after a failure that happened once the file passed the type and size checks;
  - `aria-live`, `role="status"` / `role="alert"`, and a `role="progressbar"` with values for screen readers.
- **Friendly error messages** (`friendlyUploadError`):

  | Error | Message |
  |---|---|
  | Unsupported type | "This file type is not supported. Upload a PDF, photo (JPG, PNG, WEBP), DOCX, or text file." |
  | Over 6 MB after compression | States the size and the 6 MB limit |
  | Network (0) | Check your internet connection, then tap Retry |
  | Timeout (408) | Try a stronger connection or a smaller photo |
  | 413 | File too large to scan |
  | 429 | Wait about a minute (the server allows 3 scans per minute) |
  | 401 | Session expired, log in again |
  | 400 | File could not be read as a lab report |
  | 403 | Accept the terms first |
  | Cancelled | "Upload cancelled..." |
  | Other | Generic message suggesting Retry or typing the values by hand |

- **Result reporting:**
  - success says "Found N of 10 values. Check them against your report before applying.";
  - a scan with `scan-failed` status or 0 values now shows a **warning** (amber): the file was saved, but no values were found; try a sharper, well-lit photo or type the values.
- The "Apply extracted values" message was reworded to explain that values in other units are skipped and must be typed by hand.
- The upload control is now a large dashed drop zone with an icon. It lists the accepted types and the 6 MB limit, notes that "Large photos are shrunk automatically", and is disabled while busy.
- The "Extracted from ..." card shows the user's original file name.
- Loading the document list now has a `.catch`, and an in-flight upload is cancelled when the user leaves the page.

**Unchanged:** the backend scan endpoint, the OCR/Gemini logic, the 3-scans-per-minute rate limit, and the stored `LabDocumentRecord` shape.

---

## 3. Onboarding tutorial

**Before:** no tutorial or guidance. Respondent #16: "Finding all the appropriate parts to put the information".

**After**
- **New `frontend/src/components/OnboardingTour.tsx`:** a 7-step modal tour.
  - Steps: Welcome → 1. Start a lab session → 2. Questionnaire → 3. Daily logs → 4. Medication reminders → 5. History & reports → Glossary.
  - Each step says what to do and *where* it is ("Menu → Lab Results").
  - Most steps have an **"Open this page"** button.
  - Controls: Back, Next and Finish; arrow keys and Escape work; progress dots.
  - Shown as a bottom sheet on phones and a centred dialog on desktop.
- **New `frontend/src/components/tourStorage.ts`:** remembers per account (`localStorage` key `endobridge.tourSeen.<userId>`) that the tour was closed.
- The tour opens automatically the first time a user reaches the app, and can be reopened from **Help → Take the tour** in the sidebar and mobile menu.

---

## 4. Forgot password (recovery codes)

**Before**
- The login screen had no recovery option, so a forgotten password meant creating a new account (respondents #4, #14).
- There is no email-sending service in the project.

**After:** a one-time recovery code system that does not depend on email.

**Backend**
- `backend/src/records.ts`: `UserRecord` gained the optional field `recoveryCodeHash`.
- `backend/src/protectedDatabase.ts`: the interface and both implementations (JSON file and MongoDB) gained:
  - `issueRecoveryCode(userId)` creates a 16-character code from an unambiguous alphabet (`A–Z` without I/O, digits `2–9`), formatted `XXXX-XXXX-XXXX-XXXX`, and stores only its **scrypt hash** (the same hashing used for passwords);
  - `resetPasswordWithRecoveryCode(email, code, newPassword)`:
    - accepts the code in any case and with or without dashes;
    - compares against a dummy hash when the user does not exist, so timing does not reveal which emails have accounts;
    - on success, sets the new password, **replaces the code with a new one**, signs out all existing sessions, and returns the new code;
  - `normalizeRecoveryCode()` (exported).
- `backend/src/monitoringSchemas.ts`: new `validateRecoveryRequest`, a strict check of `{ email, recoveryCode (16–40 chars), newPassword (8–128 chars) }`.
- `backend/api/app.ts`:
  - `POST /api/auth/register` now responds with `{ user, recoveryCode }` (before: `{ user }`).
  - **New** `POST /api/auth/recover` (no login needed): body `{ email, recoveryCode, newPassword }`. Rate-limited to 5 attempts per 15 minutes per IP + email. Returns `{ reset: true, recoveryCode }`.
  - **New** `POST /api/auth/recovery-code` (login needed): returns `{ recoveryCode }`. Limited to 5 per hour per user. The previous code stops working.
  - New error mapping: `invalid recovery details` → HTTP 401 `"email or recovery code is incorrect"`.

**Frontend**
- `backendApiService.ts`:
  - the `register` response type now includes `recoveryCode`;
  - new `recoverPassword()` and `issueRecoveryCode()`.
- `context/auth.ts` and `AuthContext.tsx`: new context fields `recoveryCode`, `dismissRecoveryCode`, `recoverPassword`, `regenerateRecoveryCode`.
- `Gates.tsx`:
  - after sign-up, a **"Save your recovery code"** screen appears *before* the Terms screen. It has a Copy button, and Continue stays disabled until "I saved my recovery code somewhere safe." is ticked;
  - the login form has a **"Forgot password?"** link that opens a "Reset your password" form (email, recovery code, new password, confirm). On success it shows the new replacement code, then returns to log in;
  - login and recovery error messages were rewritten in plain language (`friendlyAuthError`): wrong password, wrong code, account already exists, too many attempts, invalid input, no connection.
- `AppShell.tsx`: the account area has a **"New recovery code"** button (with a confirm prompt) so existing users, who registered before this change and have no code, can create one.

**Not done:** Google login. It needs an OAuth client set up in Google Cloud Console plus backend token verification.

---

## 5. Visual design: colour, contrast, panels

**Before**
- Indigo accent colour.
- Page background `#f6f8fb`.
- Panels: thin `slate-200` border and a light shadow. Respondents said parts were "plain" and "not noticeable".

**After**
- `frontend/src/index.css`: a Tailwind `@theme` block remaps the whole `indigo-50…950` scale to a **rose-pink** scale, so every accent across the app changes from this one place. Deleting the block restores the original indigo.
- Page background changed to a light warm tint, `#faf6f8` (in `index.css`, `AppShell.tsx` and `Gates.tsx`).
- `Panel` and `StatCard` (`ui.tsx`): stronger border (`slate-300/70`), larger shadow, and a coloured accent bar before every panel title.
- Page header card: coloured top border, more compact on phones.
- Upload area restyled as a prominent dashed drop zone (§2).

---

## 6. Drafts kept on refresh, and phone scrolling

**Before**
- All form state lived only in React memory. Refreshing the page lost the lab values, questionnaire answers and the daily log being typed (respondent #21).
- Refreshing on the questionnaire page lost the lab-to-questionnaire hand-off and sent the user back to an empty lab form.
- A failed session save had no error handling.
- On phones the page header used a lot of space, and pages did not reset to the top on navigation.

**After**
- **New hook `frontend/src/hooks/usePersistentState.ts`:** works like `useState` but keeps the value in **`sessionStorage`**.
  - The data stays only in the current browser tab and disappears when the tab is closed, which is safer for health data than `localStorage`.
  - Storage keys are per user (`endobridge.draft.<name>.<userId>`). Persistence is off until a user is known.
  - It copes with the key changing after the user profile loads.
  - It handles blocked or full storage without breaking the form.
  - `clearAllDrafts()` runs on **logout**, and `removeDraft()` removes a single draft.
- Applied to:
  - the lab form (age, weight, height, all 10 values, attached document IDs);
  - the lab → questionnaire session hand-off (`SessionDraftContext.tsx`);
  - questionnaire answers (measurements from the lab step always take priority over stored answers);
  - the daily log form and the log being edited.
- The lab and questionnaire drafts are cleared after the session is saved, and the daily draft after the log is saved.
- The questionnaire save now has a try/catch with the message "The session could not be saved. Your answers are kept on this page..." and a disabled Save button while saving.
- Phone layout (`AppShell.tsx`):
  - pages open at the top on every navigation;
  - a floating **Back to top** button appears after scrolling down;
  - the "Non-diagnostic" badge and the "Signed in" box are hidden on small screens (the email is already in the mobile header).

---

## 7. Weekly health summary on the Dashboard

**Before:** the Dashboard showed only counts (sessions, symptoms, reminders, logs) and action cards. There was no trend view.

**After**
- **New `frontend/src/components/WeeklySummary.tsx`**, added near the top of the Dashboard:
  - 4 stats: days logged (x / 7), average sleep (h), average stress (/10), most-logged mood;
  - a 7-day bar chart with sleep hours (scale 0–12) and stress (1–10) for each day; days without a log appear as dashed empty columns, and today is highlighted;
  - each day has an accessible text description;
  - a "Log today" link;
  - an empty state when there are no logs;
  - the note "A summary of what you logged, not a health assessment."
- The Dashboard data loading gained a `.catch`.
- The "SRS/SDD modules" panel label was renamed **"Next steps"**.

---

## 8. Medication reminders: dosage form and units, calendar, alerts fixed

**Before**
- Dosage was a single free-text field (e.g. "500 mg"), with no form or unit choice (respondent #5).
- There was no calendar view (respondent #13).
- **Alert bug (respondent #3):** reminders were scheduled with `setTimeout` only while the Medications page was open and only after clicking "Enable browser alerts". Leaving the page lost them. On Android Chrome, `new Notification()` throws an error ("Illegal constructor"), so phone alerts never appeared.

**After**
- `frontend/src/config/medications.ts`:
  - `medicationForms`: Tablet, Capsule, Syrup / oral liquid, Suspension, Injection, Cream / gel, Patch, Drops, Inhaler, Other.
  - `dosageUnitsByForm`, the units offered for each form. For example: Syrup → mL, tsp, tbsp, mg/5 mL; Injection → mL, units, IU, mg, mcg; Tablet → mg, mcg, g, tablet(s).
  - `formatDosage()`, e.g. "5 mL (Syrup / oral liquid)".
  - `reminderDaysThisWeek()` for the calendar.
- Data model:
  - `MedicationRecord.dosageForm?: string` added (`frontend/src/types/session.ts`);
  - backend schema accepts the optional `dosageForm` (max 60 chars).
  - `dosage` is still a string, saved as "<amount> <unit>", so existing records and reports keep working.
  - `dosageForm` was added to the list of fields **removed from AI payloads** (`backend/api/generate-insight.ts`), alongside the medication name and dosage.
- `MedicationsPage.tsx`:
  - The form now has Name, **Form** (select), **Dose** (number + unit select), Time, Frequency. The unit list changes with the form, and editing an old record splits "500 mg" back into its parts.
  - New **"Your next 7 days" calendar** showing each day's active reminders with times. "As needed" reminders are explained as not shown.
  - Save and load errors are shown to the user.
  - "Enable browser alerts" now:
    - asks for permission only if it was never asked;
    - sends a **test notification** when allowed;
    - otherwise explains that alerts are blocked and reminders will appear as banners inside the app.
  - The alert mode shown is read from the browser's real permission state.
- **New `frontend/src/components/ReminderWatcher.tsx`**, mounted in `AppShell` so it runs on **every page**:
  - loads medications and reloads them when records change;
  - checks every 30 seconds and when the tab becomes visible again;
  - for each due reminder:
    - shows a system notification once per due time;
    - **always** shows an in-app banner with **Mark taken** / **Dismiss**, which moves the reminder to its next time.
- `frontend/src/services/notificationService.ts` was rewritten:
  - `currentAlertMode()`;
  - `registerReminderServiceWorker()`;
  - `sendReminder()` uses `ServiceWorkerRegistration.showNotification()` (works on Android), falling back to `new Notification()`.
  - The old `scheduleReminder` (`setTimeout`) was removed.
- **New `frontend/public/sw.js`:** a minimal service worker used only for notifications (no caching, no push server). Clicking a notification focuses or opens the app. It is registered in `frontend/src/main.tsx`.

**Limitation (stated in the app):** alerts fire only while EndoBridge is open in a browser tab. Real background push would need a push server.

---

## 9. Daily Logs: several moods, and how logs connect

**Before**
- Mood allowed one choice; tapping another chip replaced it (respondent #16).
- It was not clear how daily logs related to the rest of the app (respondent #9).

**After** (`DailyLogsPage.tsx`)
- Mood is **multi-select**: Calm, Okay, Good, Low energy, Irritable, Anxious, Sad, Motivated, with the hint "Pick every mood that fits today."
  - It is stored as a comma-separated string in the existing `mood` field, so **no schema change** was needed.
  - The free-text "Mood note" shows the selected moods and still allows typing.
- Multi-select groups show "(choose any)". `ChipGroup` gained `description` and `hint` props.
- New side panel **"How your daily logs are used"**:
  1. each saved day becomes a recent log;
  2. the Dashboard shows the last 7 days as a weekly summary;
  3. logs are included as context when a session report is generated.

---

## 10. About page: features, limitations, safety

**Before:** two short panels (purpose, and safety scope).

**After** (`App.tsx` → `AboutPage`): five panels.
- **Purpose.**
- **Features:** lab sessions with upload, questionnaire, daily logs and weekly summary, reminders with calendar, reports, glossary.
- **Limitations:**
  - no diagnosis, prescribing or treatment, diet or exercise advice;
  - general reference ranges may differ from the user's lab;
  - scans can misread values;
  - reminders work only while the app is open.
- **Safety and privacy:**
  - data is not sold or shared;
  - passwords and recovery codes are stored as hashes only;
  - medication details are removed before AI report generation;
  - drafts stay in the current tab and are cleared on logout;
  - users can ask administrators to correct or remove their data.
- **When to get care:** EndoBridge is not an emergency service.

Page subtitle changed to "What the app offers, its limitations, and how your information is protected."

---

## 11. Navigation and shell (`AppShell.tsx`)

**Before:**
- Sidebar sections: Main, and Reference (About).
- Account block: email + Log out.

**After:**
- Sidebar sections: Main, and **Help** (Take the tour, Glossary, About — "Features, limits, safety").
- Account block: email + **New recovery code** + Log out.
- Added: `ReminderWatcher`, the Back to top button, the onboarding tour, the new-recovery-code dialog, scroll-to-top on route change, and page metadata for `/glossary`.

New route `/glossary` in `App.tsx`.

---

## 12. Not done or not verified

| Item | Status |
|---|---|
| Google login (#14) | Not done. Needs OAuth client setup. |
| Problems outside Chrome (#8) | Not investigated. Safari and Firefox were not tested. The service worker notification path should help on mobile Chrome but was not tested on a real device. |
| Reminder banner and notification at an actual due time | Logic is in place, but not observed firing in a browser test. |
| Background push when the app is closed | Not possible without a push server; documented as a limitation. |
| Existing e2e spec `e2e/endobridge.spec.ts` | Updated for the recovery-code step, the tour, and the new dosage field. It was **already out of date before this work**: it fills AMH, LH/FSH and DHEAS fields that the fixed 10-value panel no longer shows, so it still fails at that point. |
| Existing users | Have no recovery code until they click "New recovery code" while logged in. |

---

## 13. Verification performed

- `npm test` (Vitest): **21 files, 70 tests passed**. The baseline before the changes was 68.
  - New: `protectedDatabase.test.ts` checks the full recovery flow: code format, wrong code rejected, lowercase / no-dash code accepted, new code issued, old sessions revoked, old password rejected, new password accepted, used code no longer works.
  - New: `AppShell.test.tsx` checks that the tour opens for a first-time user and is remembered after closing.
  - Existing test mocks were updated for the 4 new auth context fields.
- `npm run lint`: clean.
- `npm run build` (`tsc -b` + Vite): clean.
- Headless Playwright run at **390×844 (phone)** against the local e2e servers (file database, not MongoDB), using the fictional `test-assets/lab-input/test-1-baseline.png` and `test-4-mixed.png`. Confirmed:
  - recovery code shown after sign-up, Continue disabled until ticked;
  - tour opens for a new user;
  - HbA1c ⓘ note appears inside the screen;
  - lab draft (age, weight) survives a refresh;
  - upload goes Preparing → Uploading → Reading → **Scan complete, found 10 of 10**;
  - an unsupported `.csv` shows the clear error;
  - two moods selected, and they survive a refresh;
  - weekly summary shows 1/7 with bars;
  - syrup offers mL / tsp / tbsp / mg/5 mL, and "5 mL (Syrup / oral liquid)" is saved;
  - 7-day calendar renders;
  - Back to top appears after scrolling;
  - glossary search finds "Hirsutism";
  - a wrong recovery code shows the plain error, the correct lowercase code resets the password, and logging in with the new password works.
  - The only console error was the intended 401 from the wrong-code test.

---

## 14. File index

**New files**
- `frontend/src/config/glossary.ts`: definitions
- `frontend/src/pages/GlossaryPage.tsx`: `/glossary` page
- `frontend/src/components/OnboardingTour.tsx`, `frontend/src/components/tourStorage.ts`: tutorial
- `frontend/src/components/ReminderWatcher.tsx`: app-wide reminders
- `frontend/src/components/WeeklySummary.tsx`: dashboard chart
- `frontend/src/hooks/usePersistentState.ts`: refresh-safe drafts
- `frontend/src/services/imageCompression.ts`: photo shrinking
- `frontend/public/sw.js`: notification service worker

**Modified: backend**
- `backend/api/app.ts`: register returns a code; `/auth/recover` and `/auth/recovery-code`; new error mapping
- `backend/src/protectedDatabase.ts`: recovery methods (file + MongoDB)
- `backend/src/records.ts`: `recoveryCodeHash`
- `backend/src/monitoringSchemas.ts`: `validateRecoveryRequest`; `dosageForm` in the medication schema
- `backend/api/generate-insight.ts`: `dosageForm` removed from AI payloads
- `backend/src/protectedDatabase.test.ts`: recovery test

**Modified: frontend**
- `App.tsx`: `/glossary` route, About page
- `main.tsx`: service worker registration
- `index.css`: pink theme, background
- `components/ui.tsx`: `InfoTip`, `Field.hint`, panel styling
- `components/AppShell.tsx`: Help menu, tour, reminders, back-to-top, recovery-code dialog, phone header
- `components/Gates.tsx`: recovery code screen, forgot password, friendly errors
- `context/auth.ts`, `context/AuthContext.tsx`: recovery context, clear drafts on logout
- `context/SessionDraftContext.tsx`: persisted hand-off
- `services/backendApiService.ts`: progress upload, recovery calls
- `services/notificationService.ts`: rewrite
- `config/medications.ts`: forms, units, calendar helper
- `types/session.ts`: `dosageForm`
- `pages/LabEntryPage.tsx`: upload rework, tooltips, drafts
- `pages/QuestionnairePage.tsx`: tooltips, drafts, save error handling
- `pages/DailyLogsPage.tsx`: multi-mood, drafts, renamed tag, explainer
- `pages/MedicationsPage.tsx`: form / unit, calendar, alert behaviour
- `pages/DashboardPage.tsx`: weekly summary
- Test mocks: `AppShell.test.tsx`, `Gates.test.tsx`, `DailyLogsPage.test.tsx`, `LabEntryPage.test.tsx`, `QuestionnairePage.test.tsx`
- `e2e/endobridge.spec.ts`: recovery step, tour close, dosage input

**API change summary (for SRS/SDD interface sections)**

| Method | Path | Auth | Body | Response | Rate limit |
|---|---|---|---|---|---|
| POST | `/api/auth/register` | none | `{email, password}` | `{user, recoveryCode}` (*changed*) | 5/hour/IP |
| POST | `/api/auth/recover` | none | `{email, recoveryCode, newPassword}` | `{reset: true, recoveryCode}` | 5/15 min per IP + email |
| POST | `/api/auth/recovery-code` | Bearer | `{}` | `{recoveryCode}` | 5/hour/user |

**Data model change summary (for database documentation)**
- `users.recoveryCodeHash` (string, optional, scrypt `salt:hash`)
- `medications.data.dosageForm` (string, optional, max 60)
- No migration is needed; both fields are optional.

**Document sections likely needing updates:** user management / authentication (account recovery), lab document upload (client compression, progress, error states), medication module (form, units, calendar, notification mechanism), dashboard (weekly summary), daily log (multi-mood), UI/UX design (colour scheme, glossary, onboarding), non-functional requirements (usability, accessibility, mobile), limitations section.
