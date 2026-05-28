import { rmSync } from 'node:fs'

process.env.PORT = process.env.PORT || '3100'
process.env.FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://127.0.0.1:5174'
process.env.ENDOBRIDGE_DATABASE_DRIVER = 'file'
process.env.ENDOBRIDGE_DATABASE_PATH =
  process.env.ENDOBRIDGE_DATABASE_PATH || 'backend/data/e2e-protected-database.json'

rmSync(process.env.ENDOBRIDGE_DATABASE_PATH, { force: true })

await import('../server')
