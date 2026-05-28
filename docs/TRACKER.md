# EndoBridge Project Tracker

Last updated: 2026-05-28

## Current Phase

SRS/SDD v1.1 refactor is now account-backed for the main MVP flows. The repo has separate `frontend/` and `backend/` folders, a runnable TypeScript/Node backend, MongoDB-backed protected storage when configured, and a Figma-aligned application shell.

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
- [x] Added deterministic biomarker longitudinal summary context for Gemini payloads
- [x] Updated contributor weights to deterministic rank-based values
- [x] Wired `api/generate-insight.ts` to call Gemini through the serverless proxy boundary
- [x] Added strict synthesis payload validation and medication-detail rejection in the proxy
- [x] Added best-effort in-memory rate limiting in the serverless proxy boundary
- [x] Added Gemini JSON response parser with unsafe-output rejection
- [x] Added client-side safety and service-unavailable error handling
- [x] Added session detail insight report generation and local report persistence
- [x] Added report display with hard-coded non-diagnosis disclaimer and DOH-NCMH distress note
- [x] Added print/share report controls
- [x] Added focused tests for Gemini proxy helpers, proxy client errors, longitudinal context, and report UI
- [x] Stabilized `vercel dev` Gemini reports by switching the local model default to `gemini-3.1-flash-lite`
- [x] Replaced serverless outbound Gemini `fetch` with a bounded `node:https` request to avoid Windows Vercel worker crashes
- [x] Extracted and reviewed updated SRS/SDD PDF text, tables, diagrams, and wireframes
- [x] Added `docs/DOCS_REFACTOR_BRIEF.md` to capture the new protected-database implementation baseline
- [x] Moved React/Vite app files into `frontend/`
- [x] Moved backend implementation files into `backend/`
- [x] Removed root `api/` compatibility shims for a clean frontend/backend split
- [x] Split environment examples into `frontend/.env.example` and `backend/.env.example`
- [x] Added backend auth, terms acceptance, account-scoped monitoring record, and data deletion API scaffold
- [x] Added frontend `BackendAPIService` client boundary for the upcoming persistence migration
- [x] Updated app shell/sidebar and dashboard metrics toward the Figma `EndoBridge` dashboard/session-history design
- [x] Added runnable backend dev server with CORS and Vite proxy support
- [x] Replaced in-memory backend storage with file-backed protected database state under `backend/data/`
- [x] Added backend CRUD for account-scoped monitoring records
- [x] Replaced frontend localStorage-owned app data with authenticated backend API calls
- [x] Added account login/register UI and backend-saved Terms/privacy/age/disclaimer acceptance
- [x] Added account-backed daily wellness log UI
- [x] Added PDF lab result upload with document scanning, OCR fallback, extracted biomarker review, and account storage
- [x] Wired account export and backend monitoring-data deletion UI
- [x] Added SRS/SDD-aligned dashboard route with module-based next actions
- [x] Refactored shell/navigation for responsive desktop sidebar and mobile drawer
- [x] Fixed desktop sidebar to remain viewport-pinned and removed duplicate history navigation entry
- [x] Added subtle rounded scrollbar styling for the app and sidebar scroll area
- [x] Added MongoDB protected database adapter with account-scoped collections, indexes, and JSON import script
- [x] Fixed backend env loading so non-empty MongoDB settings in `backend/.env` or `backend/.env.local` are honored
- [x] Removed user-facing MVP/test-style wording from account, PDF, dashboard, and history UI copy
- [x] Replaced runtime contextual questionnaire generation with the fixed 30-question EndoBridge questionnaire bank
- [x] Added Playwright E2E coverage for register, terms, lab session, questionnaire, symptoms, reminders, daily logs, PDF upload, and history
- [x] Added MongoDB Atlas production checklist and graceful protected-data import handling
- [x] Moved report persistence behind authenticated backend validation so only validated reports are stored
- [x] Standardized panels, stat cards, empty states, buttons, and form controls
- [x] Reworked UI copy to keep non-diagnostic, account-backed, scan-and-review PDF boundaries visible
- [x] Attempted fresh Figma MCP design pull; blocked by revoked Figma OAuth token

## In Progress

- [ ] Configure final deployment secrets and hosting environment

## Next

1. Configure deployment hosting with backend environment secrets.
2. Add report-generation E2E coverage with a mocked Gemini response.
3. Expand OCR/document scanning support for additional lab report formats if needed.
4. Run an accessibility pass on the finalized account-backed workflows.

## Later

- [ ] Import/export restore flow
- [ ] Storage corruption handling UI
- [ ] Better mobile navigation
- [ ] Accessibility pass
- [ ] Playwright end-to-end tests after browser install works
- [ ] Deployment configuration for Vercel

## Do Not Add For MVP

- Clinician dashboard
- Sending medication details to Gemini
- Diagnosis, prescription, medication validation, treatment advice, diet plans, exercise prescriptions, or clinical recommendations

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
| 2026-05-23 | `npm test` | Passed: 9 files, 30 tests |
| 2026-05-23 | `npm run lint` | Passed |
| 2026-05-23 | `npm run build` | Passed |
| 2026-05-23 | Browser smoke at `http://127.0.0.1:5173` using system Chromium | Passed: session detail Gemini report generation, disclaimer, distress note, local storage, and medication exclusion |
| 2026-05-23 | `npm test -- api/generate-insight.test.ts` | Passed: 1 file, 6 tests |
| 2026-05-23 | API smoke at `http://127.0.0.1:3002/api/generate-insight` using `vercel dev` | Passed: real Gemini report response |
| 2026-05-23 | Browser smoke at `http://127.0.0.1:3002` using `vercel dev` and real Gemini | Passed: insight report generation and local storage |
| 2026-05-23 | `npm test` | Passed: 9 files, 31 tests |
| 2026-05-23 | `npm run lint` | Passed |
| 2026-05-23 | `npm run build` | Passed |
| 2026-05-28 | PDF extraction and visual inventory for `../DOCS` SRS/SDD | Passed: 82 pages, 77 tables, 35 embedded images extracted/reviewed |
| 2026-05-28 | `npm test` after frontend/backend folder split | Passed: 10 files, 32 tests |
| 2026-05-28 | `npm run lint` after backend scaffold and Figma shell update | Passed |
| 2026-05-28 | `npm run build` after config move | Passed |
| 2026-05-28 | Browser smoke at `http://127.0.0.1:5173` | Passed: consent gate, age gate, Figma-style sidebar, dashboard metrics, lab form render |
| 2026-05-28 | `npm test` after account-backed migration | Passed: 8 files, 18 tests |
| 2026-05-28 | `npm run lint` after account-backed migration | Passed |
| 2026-05-28 | `npm run build` after account-backed migration | Passed |
| 2026-05-28 | Backend API smoke at `http://127.0.0.1:3000` | Passed: register, login, terms acceptance, lab session create/list, auth profile |
| 2026-05-28 | Figma MCP `get_design_context` / `get_screenshot` | Blocked: Figma OAuth token revoked |
| 2026-05-28 | `npm run lint` after UI refactor | Passed |
| 2026-05-28 | `npm run build` after UI refactor | Passed |
| 2026-05-28 | `npm test` after UI refactor | Passed: 8 files, 18 tests |
| 2026-05-28 | Browser route smoke after UI refactor | Passed: dashboard, lab, daily logs, symptoms, medications, history, and about rendered with 0 console errors; questionnaire shell title issue found and patched |
| 2026-05-28 | `npm run lint` after questionnaire shell title patch | Passed |
| 2026-05-28 | `npm run build` after questionnaire shell title patch | Passed |
| 2026-05-28 | `npm run lint` after fixed sidebar/duplicate history nav patch | Passed |
| 2026-05-28 | `npm run build` after fixed sidebar/duplicate history nav patch | Passed |
| 2026-05-28 | `npm run lint` after scrollbar styling patch | Passed |
| 2026-05-28 | `npm run build` after scrollbar styling patch | Passed |
| 2026-05-28 | Playwright dashboard check after scrollbar styling patch | Passed: sidebar scrollbar class and CSS variables applied, 0 console errors |
| 2026-05-28 | `npm test` after MongoDB adapter migration | Passed: 8 files, 18 tests |
| 2026-05-28 | `npm run lint` after MongoDB adapter migration | Passed |
| 2026-05-28 | `npm run build` after MongoDB adapter migration | Passed |
| 2026-05-28 | Frontend copy scan after removing MVP/test-style UI wording | Passed: only internal `stored-only` data fields remain |
| 2026-05-28 | Playwright rendered copy check for `/dashboard`, `/lab`, and `/history` | Passed: 0 forbidden MVP/test/backend-account wording hits |
| 2026-05-28 | MongoDB env load and ping check | Passed: `MONGODB_URI` resolved, MongoDB ping succeeded, backend restarted in MongoDB storage mode |
| 2026-05-28 | `npm test` after fixed questionnaire bank implementation | Passed: 8 files, 20 tests |
| 2026-05-28 | `npm run lint` after fixed questionnaire bank implementation | Passed |
| 2026-05-28 | `npm run build` after fixed questionnaire bank implementation | Passed |
| 2026-05-28 | Playwright questionnaire flow after fixed bank implementation | Passed: base questions, priority follow-ups, optional daily context, and 0 console errors |
| 2026-05-28 | `npm run migrate:mongodb` after Atlas import handling | Passed: no local protected database file found, nothing to migrate |
| 2026-05-28 | `npm test` after E2E/OCR/report-storage slice | Passed: 8 files, 20 tests |
| 2026-05-28 | `npm run test:e2e` after E2E/OCR/report-storage slice | Passed: register, terms, lab session, questionnaire, symptoms, reminders, daily logs, PDF upload, history |
| 2026-05-28 | `npm run lint` after E2E/OCR/report-storage slice | Passed |
| 2026-05-28 | `npm run build` after E2E/OCR/report-storage slice | Passed |

## Completion Estimate

| Area | Status |
|---|---|
| Project setup | Complete |
| Core data types | Started |
| Validation engine | Foundation complete |
| Scoring engine | Foundation complete |
| Questionnaire generation | Foundation complete |
| Backend persistence | MongoDB adapter, Atlas checklist, and import handling complete; deployment secrets remain |
| Lab entry UI | Complete account-backed flow with PDF scanning and extracted-value review |
| Dashboard UI | SRS/SDD module overview complete |
| Consent/age gate | Backend-saved terms, privacy, age, and disclaimer acceptance complete |
| Questionnaire capture | Complete |
| Symptom tracker | Complete account-backed flow with trend summary helper |
| Medication reminders | Complete account-backed UI and storage flow |
| Daily wellness logs | Complete account-backed MVP |
| Session history | Complete account-backed history/detail/delete/export flow |
| Gemini proxy | Complete bounded implementation |
| Report generation | Backend-validated generation and storage flow complete |
| Updated SRS/SDD protected database alignment | Main MVP flows migrated to backend API |
| Deployment | Not started |
