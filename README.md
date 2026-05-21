# EndoBridge

Personal AI-powered PCOS monitoring companion based on the SRS/SDD in `../DOCS`.

## Stack

- React 18 + Vite + TypeScript
- Tailwind CSS
- Browser localStorage for MVP health records
- Vercel serverless function boundary for `POST /api/generate-insight`
- Gemini API key stays server-side only
- Vitest for core logic tests

## Current Completion Scope

This repo is intentionally capped at a foundation build, roughly the first 30% of the MVP:

- Lab result entry UI for the seven mandatory biomarkers
- Client-side plausibility and clinical-range validation
- Deterministic contributor scoring scaffold
- Contextual questionnaire generation scaffold
- Local storage service for `sessions`, `symptoms`, and `medications`
- JSON export service
- Browser notification service scaffold
- Serverless Gemini proxy endpoint placeholder with request validation boundary
- Unit tests for validation, scoring, questionnaire generation, local storage, and safe proxy payload shape

Not implemented yet:

- Real Gemini API call and response parser
- Full consent and age gate flow
- Medication reminder management UI
- Symptom tracker UI
- Full session history detail pages
- Report rendering and print/share workflow

## Commands

```powershell
npm install
npm run dev
npm test
npm run lint
npm run build
```

## Environment

Copy `.env.example` to `.env.local` when wiring the real proxy:

```powershell
Copy-Item .env.example .env.local
```
