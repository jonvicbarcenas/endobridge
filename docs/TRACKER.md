# EndoBridge Project Tracker

Last updated: 2026-05-22

## Current Phase

Local-first MVP flow implementation in progress.

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
- [x] Added `.env.example`
- [x] Added README with current scope and commands
- [x] Added unit tests for validation, scoring, questionnaire generation, local storage, and proxy payload safety
- [x] Verified `npm test`
- [x] Verified `npm run lint`
- [x] Verified `npm run build`
- [x] Started local dev server at `http://127.0.0.1:5173`

## In Progress

- [ ] Add session history page and session detail view
- [ ] Add local data purge confirmation flow

## Next

1. Run manual browser/UI smoke test.
2. Add symptom tracker UI.
3. Add medication reminder management UI.
4. Wire the real Gemini API call inside `api/generate-insight.ts`.
5. Add Gemini response parser and safety rejection handling.
6. Add insight report screen with mandatory disclaimer and distress note.

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
| Symptom tracker | Not started |
| Medication reminders | Service scaffold only |
| Session history | Routed placeholder; detail and purge in progress |
| Gemini proxy | Boundary scaffold only |
| Report generation | Not started |
| Deployment | Not started |
