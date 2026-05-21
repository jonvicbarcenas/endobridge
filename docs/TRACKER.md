# EndoBridge Project Tracker

Last updated: 2026-05-21

## Current Phase

Foundation build, capped at roughly 30% MVP completion.

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
- [x] Added `.env.example`
- [x] Added README with current scope and commands
- [x] Added unit tests for validation, scoring, questionnaire generation, local storage, and proxy payload safety
- [x] Verified `npm test`
- [x] Verified `npm run lint`
- [x] Verified `npm run build`
- [x] Started local dev server at `http://127.0.0.1:5173`

## In Progress

- [ ] Manual browser/UI smoke test

Blocked because Playwright is installed but the Chromium browser binary is missing. `npx playwright install chromium` timed out in this environment.

## Next

1. Build full consent and age-gate flow.
2. Replace the single-screen prototype with routed pages.
3. Build complete lab entry flow with submit blocking, inline errors, and warning flags.
4. Add questionnaire answer capture and local persistence.
5. Add session history page and session detail view.
6. Add symptom tracker UI.
7. Add medication reminder management UI.
8. Wire the real Gemini API call inside `api/generate-insight.ts`.
9. Add Gemini response parser and safety rejection handling.
10. Add insight report screen with mandatory disclaimer and distress note.

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

## Completion Estimate

| Area | Status |
|---|---|
| Project setup | Complete |
| Core data types | Started |
| Validation engine | Foundation complete |
| Scoring engine | Foundation complete |
| Questionnaire generation | Foundation complete |
| Local persistence | Foundation complete |
| Lab entry UI | Prototype |
| Consent/age gate | Not started |
| Symptom tracker | Not started |
| Medication reminders | Service scaffold only |
| Session history | Not started |
| Gemini proxy | Boundary scaffold only |
| Report generation | Not started |
| Deployment | Not started |
