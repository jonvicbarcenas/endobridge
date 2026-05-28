import '../src/env'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { MongoClient } from 'mongodb'
import { collections } from '../src/protectedDatabase'
import type {
  AccountScopedRecord,
  DataDeletionRecord,
  MonitoringCollection,
  SessionRecord,
  TermsAcceptanceRecord,
  UserRecord,
} from '../src/records'

interface FileState {
  users?: UserRecord[]
  sessions?: SessionRecord[]
  terms?: TermsAcceptanceRecord[]
  monitoring?: Partial<Record<MonitoringCollection, AccountScopedRecord[]>>
  deletions?: DataDeletionRecord[]
}

const uri = process.env.MONGODB_URI
if (!uri) {
  throw new Error('MONGODB_URI is required to migrate protected data to MongoDB')
}

const dbName = process.env.MONGODB_DB ?? 'endobridge'
const sourcePath = resolve(
  process.env.ENDOBRIDGE_DATABASE_PATH ?? resolve(process.cwd(), 'backend', 'data', 'protected-database.json'),
)

if (!existsSync(sourcePath)) {
  console.log(`No local protected database file found at ${sourcePath}; nothing to migrate.`)
  process.exit(0)
}

const state = JSON.parse(readFileSync(sourcePath, 'utf8')) as FileState
const client = new MongoClient(uri)

try {
  await client.connect()
  const db = client.db(dbName)

  for (const user of state.users ?? []) {
    await db.collection<UserRecord>('users').replaceOne({ userId: user.userId }, user, {
      upsert: true,
    })
  }

  for (const session of state.sessions ?? []) {
    await db.collection<SessionRecord>('sessions').replaceOne({ token: session.token }, session, {
      upsert: true,
    })
  }

  for (const term of state.terms ?? []) {
    await db.collection<TermsAcceptanceRecord>('termsAcceptance').replaceOne(
      { userId: term.userId },
      term,
      { upsert: true },
    )
  }

  for (const collection of collections) {
    const records = state.monitoring?.[collection] ?? []
    for (const record of records) {
      await db.collection<AccountScopedRecord>(collection).replaceOne(
        { userId: record.userId, id: record.id },
        record,
        { upsert: true },
      )
    }
  }

  for (const deletion of state.deletions ?? []) {
    await db.collection<DataDeletionRecord>('dataDeletionLogs').replaceOne(
      { deletionId: deletion.deletionId },
      deletion,
      { upsert: true },
    )
  }

  console.log(`Migrated protected data from ${sourcePath} to MongoDB database "${dbName}".`)
} finally {
  await client.close()
}
