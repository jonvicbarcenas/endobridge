# EndoBridge

Personal AI-powered PCOS monitoring companion based on the SRS/SDD in `../DOCS`.

## Stack

- React 18 + Vite + TypeScript
- Tailwind CSS
- Frontend app in `frontend/`
- Runnable TypeScript/Node backend in `backend/`
- MongoDB-backed protected database when `MONGODB_URI` is configured
- JSON-file fallback for local tests/development when MongoDB is not configured
- Account-backed monitoring records through `/api/*`
- Gemini proxy boundary for `POST /api/generate-insight`
- Gemini API key stays server-side only
- Vitest for core logic tests

## Repo Layout

```text
frontend/   React, Vite, Tailwind UI and client services
backend/    TypeScript/Node API handlers and backend service scaffolding
docs/       Project tracker and SRS/SDD refactor notes
```

## Current Completion Scope

Implemented capstone scope:

- Account registration/login
- Backend-saved Terms of Use, privacy consent, age confirmation, and non-diagnostic disclaimer
- Lab result entry UI for the seven mandatory biomarkers
- Client-side plausibility and clinical-range validation
- Contextual questionnaire generation from biomarker flags
- Deterministic biomarker flagging and contributor ranking
- Account-backed lab sessions, symptom logs, medication reminders, daily wellness logs, PDF records, and reports
- PDF lab result upload with document text scanning, OCR fallback, extracted biomarker review, and account storage
- Account data export and backend monitoring-data deletion
- Browser notification service scaffold
- Serverless Gemini proxy with request validation, rate limiting, model call, and unsafe-output rejection
- Figma-aligned dashboard shell/sidebar styling
- Unit tests for validation, scoring, questionnaire generation, backend storage, and safe proxy payload shape

Remaining production hardening:

- Configure the deployed MongoDB Atlas project, database user, network rules, backups, and production secrets
- Expand OCR/document scanning field coverage if additional laboratory formats are introduced
- Add end-to-end tests for the account-backed browser flow

## Commands

Run the backend and frontend in two terminals:

```powershell
npm install
npm run dev:backend
```

```powershell
npm run dev:frontend
```

Then open `http://127.0.0.1:5173`.

Validation:

```powershell
npm test
npm run lint
npm run build
```

## Environment

Frontend environment:

```powershell
Copy-Item frontend/.env.example frontend/.env.local
```

Backend environment:

```powershell
Copy-Item backend/.env.example backend/.env.local
```

Set these backend values before running against MongoDB:

```powershell
$env:MONGODB_URI="mongodb+srv://USER:PASSWORD@CLUSTER.mongodb.net/?retryWrites=true&w=majority"
$env:MONGODB_DB="endobridge"
npm run dev:backend
```

To import existing local protected data from `backend/data/protected-database.json` into MongoDB:

```powershell
$env:MONGODB_URI="mongodb+srv://USER:PASSWORD@CLUSTER.mongodb.net/?retryWrites=true&w=majority"
$env:MONGODB_DB="endobridge"
npm run migrate:mongodb
```

Keep `MONGODB_URI` server-side only. The React frontend must never receive the MongoDB connection string.
