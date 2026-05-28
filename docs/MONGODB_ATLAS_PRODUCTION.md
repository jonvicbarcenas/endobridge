# MongoDB Atlas Production Checklist

Use this checklist before deploying EndoBridge with MongoDB Atlas.

## Required Atlas Settings

- Create a dedicated Atlas project and cluster for EndoBridge.
- Create a least-privilege database user scoped to the `endobridge` database.
- Store the connection string only in backend deployment secrets as `MONGODB_URI`.
- Set `MONGODB_DB=endobridge`.
- Set `ENDOBRIDGE_DATABASE_DRIVER=mongodb`.
- Enable TLS. Atlas connection strings use TLS by default.
- Restrict network access to the deployment provider egress IPs where possible.
- Enable automated backups before production use.
- Rotate the database password if it has ever been pasted into chat, logs, screenshots, or shared documents.

## Local Data Import

Run this only when `backend/data/protected-database.json` exists and local records must be preserved:

```powershell
npm run migrate:mongodb
```

If no local JSON file exists, the script exits without importing anything.

## Safety Requirements

- React must never receive `MONGODB_URI`.
- All app writes go through the backend API.
- Every query must remain account-scoped by `userId`.
- PDF upload and OCR output must remain stored under the authenticated account.
- AI reports must be stored only after backend payload validation and output safety validation.
