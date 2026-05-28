# EndoBridge SRS/SDD Refactor Brief

Last updated: 2026-05-28

## Source Documents Read

- `../DOCS/2526-sem2-it332-09_Week-9-Software-Requirements-Specification-SRS.pdf`
- `../DOCS/2526-sem2-it332-09_Week 10 - Software Design_Description_(SDD).pdf`

Extraction artifacts were generated under `../tmp/pdfs/docs_extraction/`:

- `extraction.md`: full extracted text and detected tables
- `summary.json`: page, table, image, and render inventory
- `rendered_pages/`: rendered PNGs for visual/layout review
- `embedded_images/`: extracted activity diagrams, wireframes, sequence diagrams, architecture diagram, class diagram, and ERD
- contact sheets for SRS and SDD embedded images

## Executive Summary

The May 27, 2026 SRS v1.1 and SDD v1.1 significantly changed the implementation target. The app has now moved off the former `LocalStorageService` persistence boundary for product data and uses authenticated backend API calls for the main MVP flows. The updated SDD makes authenticated accounts, protected database storage, account-scoped history, server-side report storage, daily monitoring, and account data deletion the target architecture.

The refactor should treat the protected database design as the new baseline. The SDD explicitly says old local-storage diagrams and local data purge sections must be replaced by protected-database equivalents.

## Important Document Conflict

The SRS non-functional section still contains older text saying the MVP uses local storage only, has zero server-side retention, and has no account system. Nearby updated text and the SDD both require authenticated accounts, access control, protected database storage, Terms acceptance records, account-scoped monitoring data, and database-backed deletion.

Implementation recommendation: follow the SDD v1.1 protected-database architecture as authoritative, and treat the old local-only/no-account SRS rows as stale unless the adviser says otherwise.

## New Product Scope

The system is now organized into five modules:

1. Module 0: Account Access, Terms of Use, and Consent
2. Module 1: Lab Result Recording, Contextual Input, Medication Logging, and Account-Based Storage
3. Module 2: AI-Driven Personal Insight Engine
4. Module 3: Personal Insight Report, Longitudinal Monitoring, and Reminder Module
5. Module 4: Everyday PCOS Companion and Daily Monitoring

The app must remain strictly non-diagnostic. It must not diagnose PCOS, provide medical advice, validate medication safety, recommend medications, adjust treatment, generate diet plans, generate exercise prescriptions, or make clinical recommendations.

## Required Architecture Changes

- Add account registration/login and authenticated route protection.
- Persist Terms of Use, privacy consent, age confirmation, and non-diagnostic disclaimer acceptance in the backend.
- Keep authenticated backend API calls as the primary persistence boundary.
- Add protected database tables or collections for users, terms acceptance, lab sessions, biomarker results, questionnaire responses, symptom logs, medication records, medication reminders, medication adherence, daily wellness logs, cycle logs, AI reports, and data deletion logs.
- Keep the Gemini API key server-side only.
- Keep Gemini payloads minimized and structured.
- Reject unsafe AI output before display and before report storage.
- Store generated reports only after passing safety validation.
- Add account monitoring data deletion from protected database categories.
- Keep browser notifications best-effort with in-app fallback.

## Required Backend API Surface

- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me`
- `POST /terms/accept`
- `POST / GET /lab-sessions`
- `POST / GET /lab-documents`
- `POST / GET /lab-sessions/{sessionId}/biomarkers`
- `POST / GET /questionnaire-responses`
- `POST / GET /symptoms`
- `POST / GET / PATCH / DELETE /medications`
- `POST / GET / PATCH / DELETE /medication-reminders`
- `POST / GET /medication-adherence`
- `POST / GET /daily-logs`
- `POST / GET /cycle-logs`
- `POST /reports/generate`
- `GET /reports`
- `GET /trends`
- `POST /account/data-delete`

## Data Model Target

Core storage entities from the SDD:

- `Users`: account identity and authentication reference
- `TermsAcceptance`: terms, privacy consent, age confirmation, disclaimer acceptance
- `LabSessions`: each laboratory monitoring session
- `BiomarkerResults`: fixed biomarker values, units, flags, directions, deviation scores
- `QuestionnaireResponses`: contextual questionnaire answers linked to a session
- `SymptomLogs`: lab-session and daily symptom records
- `MedicationRecords`: user-entered physician-prescribed medications
- `MedicationReminders`: reminder schedules
- `MedicationAdherence`: taken, skipped, or missed status
- `DailyWellnessLogs`: optional food, exercise, sleep, mood, stress, symptom context
- `CycleLogs`: optional cycle events
- `AIReports`: generated observational reports after safety validation
- `DataDeletionLogs`: deletion request records

## Existing Codebase Impact

High-impact current files:

- `frontend/src/services/backendApiService.ts`: client boundary for protected backend API reads/writes.
- `frontend/src/components/Gates.tsx`: auth + backend-saved terms/privacy/age/disclaimer route protection.
- `frontend/src/pages/LabEntryPage.tsx` and `frontend/src/pages/QuestionnairePage.tsx`: save PDF records and lab sessions through backend APIs.
- `frontend/src/pages/HistoryPage.tsx`, `frontend/src/pages/SessionDetailPage.tsx`, `frontend/src/pages/SymptomsPage.tsx`, and `frontend/src/pages/MedicationsPage.tsx`: read/write account-scoped backend records.
- `frontend/src/pages/DailyLogsPage.tsx`: account-backed everyday wellness logging.
- `frontend/src/services/proxyClient.ts` and `backend/api/generate-insight.ts`: align with the minimized Gemini proxy direction, with validated reports persisted back to account records.
- `frontend/src/types/session.ts` and `frontend/src/types/insight.ts`: need UUID/user/account-aware shapes for database-backed records, daily logs, cycle logs, adherence, report IDs, and deletion logs.
- `frontend/src/engines/scoringEngine.ts` and `frontend/src/engines/longitudinalSummaryEngine.ts`: must compute trends from account-backed records, including relevant daily monitoring context.
- `backend/src/protectedDatabase.ts`: MongoDB protected storage when `MONGODB_URI` is configured, with JSON-file fallback for local development and tests.

## Visual Content Read

The SDD embedded images include:

- Updated system architecture diagram
- Overall system sequence diagram
- Module sequence diagrams for login/terms, lab/questionnaire, AI report generation, monitoring/reminders, daily logs/trends, and account data deletion
- Updated class diagram
- Protected database ERD

The SRS embedded images include:

- Activity diagrams for lab entry, questionnaire, medication logging, data deletion, biomarker scoring, AI report generation, symptom tracking, medication reminders, session history, daily logging, cycle tracking, adherence, trend summaries, and skip handling
- Wireframes for dashboard, questionnaire, report, symptom tracker, medication reminders, session history, daily wellness/trends, and overview

## Refactor Slices

Recommended implementation order:

1. Establish backend architecture and database schema.
   - Add backend service/repository boundary.
   - Add protected database configuration.
   - Add schema/migrations for the SDD entities.

2. Add account and terms gate.
   - Implement register/login.
   - Store Terms acceptance, privacy consent, age confirmation, and disclaimer acknowledgement.
   - Replace local-only gates with authenticated protected routes.

3. Replace lab/questionnaire persistence.
   - Create account-linked lab sessions.
   - Store biomarker results separately.
   - Store deterministic questionnaire responses by stable `questionId`.

4. Move history, symptoms, medications, and reminders to backend APIs.
   - Account-scoped session history.
   - Symptom logs by session and daily context.
   - Medication records, reminders, enabled/disabled state, and adherence.
   - Browser notification opt-in remains client-side.

5. Add daily companion module.
   - Daily wellness logs.
   - Cycle logs.
   - Skip/missing daily log handling.
   - Weekly/monthly trend summary service.

6. Refactor report generation and storage.
   - Build minimized synthesis payload from database records.
   - Keep medication details out of Gemini payload.
   - Validate unsafe output.
   - Store only validated reports.

7. Add account monitoring deletion.
   - Delete selected data categories.
   - Log deletion request/completion.
   - Replace current local purge semantics.

## Guardrails To Preserve

- Gemini payload must not include full raw history, PII, medication name, dosage, intake schedule, reminder status, or free-text instructions.
- The report disclaimer must appear on every AI-generated report.
- Unsafe AI output must return safe failure and must not be stored.
- Required biomarkers remain fixed: LDL-C, fasting glucose, fasting insulin, total testosterone, AMH, LH/FSH ratio, and DHEAS.
- FSH/LH from the Kottarathil dataset must not be copied as LH/FSH. LH/FSH must be derived as LH divided by FSH.
- RBS/random blood sugar must not be treated as fasting glucose.
- Daily monitoring is optional and must not block lab logging, reports, reminders, or dashboard access.

## Next Decision

Protected database decision: use MongoDB Atlas behind the existing backend API boundary. The MongoDB connection string stays server-side in backend environment variables, while the React frontend continues to use `BackendAPIService` and never connects to MongoDB directly.
