# EndoBridge Project Tracker

Last updated: 2026-05-23

## Current Phase

Medication reminder local-first slice complete; next phase should target the Gemini report slice.

## Completed

- [x] Initialized `endobridge` Git repo
- [x] Scaffolded React 18 + Vite + TypeScript app
- [x] Added Tailwind CSS
- [x] Added app shell for EndoBridge lab monitoring workspace
- [x] Added seven required biomarker inputs
- [x] Added `referenceRanges.ts`
- [x] Added `ValidationEngine`
- [x] Added `ScoringEngine`
- [x] Added `QuestionnaireGenerator`
- [x] Added `LocalStorageService`
- [x] Added `ExportService`
- [x] Added `NotificationService` scaffold
- [x] Added serverless `api/generate-insight.ts` proxy boundary
- [x] Added consent and age eligibility persistence in `LocalStorageService`
- [x] Added safe localStorage array recovery for corrupted JSON
- [x] Added questionnaire-aware session creation
- [x] Replaced single-screen prototype with routed app shell
- [x] Added consent gate with local data disclosure
- [x] Added age eligibility gate for users 18 and older
- [x] Added complete lab entry form with submit blocking, inline errors, and warning flags
- [x] Added deterministic questionnaire answer capture
- [x] Added local session persistence after questionnaire submission
- [x] Added session history page
- [x] Added session detail view with biomarker, questionnaire, and contributor sections
- [x] Added local data purge confirmation flow
- [x] Fixed questionnaire save navigation so completed sessions land on session detail
- [x] Verified browser smoke for consent, age gate, lab entry, questionnaire, detail/history, and purge
- [x] Added `.env.example`
- [x] Added README with current scope and commands
- [x] Added unit tests for validation, scoring, questionnaire generation, local storage, and proxy payload safety
- [x] Verified `npm test`
- [x] Verified `npm run lint`
- [x] Verified `npm run build`
- [x] Started local dev server at `http://127.0.0.1:5173`
- [x] Added `/symptoms` route and primary navigation item
- [x] Added local-first symptom tracker UI for cycle irregularity, acne, hirsutism, fatigue, weight change, and per-symptom notes
- [x] Added LocalStorageService symptom upsert/sorting support
- [x] Added deterministic symptom trend summary helper for future Gemini payload context
- [x] Linked symptom counts and entries into history and session detail views
- [x] Added focused tests for symptom storage, trend summary, route interaction, and session-linked display
- [x] Verified browser smoke for consent, lab entry, questionnaire, symptom log, history, and detail flow
- [x] Added `/medications` route and primary navigation item
- [x] Added persistent medication user-managed disclaimer
- [x] Added local medication reminder form for name, dosage, schedule time, and frequency
- [x] Added medication reminder edit, pause/resume, mark-taken, and delete controls
- [x] Added explicit browser-alert opt-in with in-app fallback messaging
- [x] Added LocalStorageService medication update/delete support
- [x] Linked active medication reminder context into history and session detail views
- [x] Added focused tests for medication storage and route interaction

## In Progress

- [ ] No active local-first slice item

## Next

1. Wire the real Gemini API call inside `api/generate-insight.ts`.
2. Add Gemini response parser and safety rejection handling.
3. Add insight report screen with mandatory disclaimer and distress note.
4. Add print/share report workflow.
5. Add biomarker longitudinal summary integration for Gemini payload context.

## Later

- [ ] Print/share report workflow
- [ ] Import/export restore flow
- [ ] Storage corruption handling UI
- [ ] Better mobile navigation
- [ ] Accessibility pass
- [ ] Playwright end-to-end tests after browser install works
- [ ] Deployment configuration for Vercel

## Do Not Add For MVP

- Account system
- Login/session tokens
- Server-side health database
- Cloud sync
- OCR lab report scanning
- Clinician dashboard
- Sending medication details to Gemini

## Verification Log

| Date | Command | Result |
|---|---|---|
| 2026-05-21 | `npm test` | Passed: 5 files, 8 tests |
| 2026-05-21 | `npm run lint` | Passed |
| 2026-05-21 | `npm run build` | Passed |
| 2026-05-21 | HTTP check `http://127.0.0.1:5173` | Status 200 |
| 2026-05-22 | `npm test -- src/services/localStorageService.test.ts src/models/labSession.test.ts` | Passed: 2 files, 5 tests |
| 2026-05-22 | `npm test -- src/App.test.tsx` | Passed: 1 file, 1 test |
| 2026-05-22 | `npm run lint` | Passed |
| 2026-05-22 | `npm run build` | Passed |
| 2026-05-22 | `npm test` | Passed: 7 files, 14 tests |
| 2026-05-22 | `npm run lint` | Passed |
| 2026-05-22 | `npm run build` | Passed |
| 2026-05-22 | `npm test` | Passed: 7 files, 15 tests |
| 2026-05-22 | `npm run lint` | Passed |
| 2026-05-22 | `npm run build` | Passed |
| 2026-05-22 | Browser smoke at `http://127.0.0.1:5173` | Passed: consent, age rejection, adult gate, lab submit, questionnaire save, detail/history, purge |
| 2026-05-23 | `npm test` | Passed: 8 files, 19 tests |
| 2026-05-23 | `npm run lint` | Passed |
| 2026-05-23 | `npm run build` | Passed |
| 2026-05-23 | Browser smoke at `http://127.0.0.1:5173` using system Chrome | Passed: consent, lab submit, questionnaire save, symptom log, history/detail symptom display |
| 2026-05-23 | `npm test` | Passed: 8 files, 22 tests |
| 2026-05-23 | `npm run lint` | Passed |
| 2026-05-23 | `npm run build` | Passed |
| 2026-05-23 | Browser smoke at `http://127.0.0.1:5173` using system Chrome | Passed: consent, medication add/edit/pause local flow |

## Completion Estimate

| Area | Status |
|---|---|
| Project setup | Complete |
| Core data types | Started |
| Validation engine | Foundation complete |
| Scoring engine | Foundation complete |
| Questionnaire generation | Foundation complete |
| Local persistence | Consent, age gate, purge, and recovery support added |
| Lab entry UI | Complete local-first flow |
| Consent/age gate | Complete |
| Questionnaire capture | Complete |
| Symptom tracker | Complete local-first flow with trend summary helper |
| Medication reminders | Complete local-first UI and storage flow |
| Session history | Complete local-first history/detail/purge flow |
| Gemini proxy | Boundary scaffold only |
| Report generation | Not started |
| Deployment | Not started |
