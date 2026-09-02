import './env.js'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { createHash, randomBytes, randomUUID, scrypt, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'
import { MongoClient, type Collection, type Db } from 'mongodb'
import type {
  AccountScopedRecord,
  AuthenticatedUser,
  DataDeletionRecord,
  MonitoringCollection,
  RateLimitRecord,
  SessionRecord,
  TermsAcceptanceRecord,
  UserRecord,
} from './records.js'

export const collections: MonitoringCollection[] = [
  'labSessions',
  'questionnaireResponses',
  'symptoms',
  'medications',
  'medicationReminders',
  'medicationAdherence',
  'dailyLogs',
  'cycleLogs',
  'reports',
  'labDocuments',
]

interface ProtectedDatabaseState {
  users: UserRecord[]
  sessions: SessionRecord[]
  terms: TermsAcceptanceRecord[]
  monitoring: Record<MonitoringCollection, AccountScopedRecord[]>
  deletions: DataDeletionRecord[]
  rateLimits: RateLimitRecord[]
}

interface ProtectedDatabase {
  createUser(email: string, password: string): Promise<AuthenticatedUser>
  createSession(email: string, password: string): Promise<{
    token: string
    user: AuthenticatedUser
    termsAccepted: boolean
  }>
  authenticate(token: string): Promise<AuthenticatedUser>
  revokeSession(token: string): Promise<void>
  consumeRateLimit(key: string, action: string, maxRequests: number, windowMs: number): Promise<boolean>
  sessionProfile(token: string): Promise<{ user: AuthenticatedUser; termsAccepted: boolean }>
  acceptTerms(
    userId: string,
    input: Partial<TermsAcceptanceRecord>,
  ): Promise<TermsAcceptanceRecord>
  hasAcceptedTerms(userId: string): Promise<boolean>
  list(collection: MonitoringCollection, userId: string): Promise<AccountScopedRecord[]>
  create(
    collection: MonitoringCollection,
    userId: string,
    data: unknown,
  ): Promise<AccountScopedRecord>
  update(
    collection: MonitoringCollection,
    userId: string,
    id: string,
    data: unknown,
  ): Promise<AccountScopedRecord>
  deleteRecord(
    collection: MonitoringCollection,
    userId: string,
    id: string,
  ): Promise<{ id: string; deleted: true }>
  deleteCollection(
    userId: string,
    deletedDataType: MonitoringCollection | 'all',
  ): Promise<DataDeletionRecord>
}

const defaultDatabaseFile =
  process.env.NODE_ENV === 'test' ? 'protected-database.test.json' : 'protected-database.json'
const defaultDatabasePath = resolve(process.cwd(), 'backend', 'data', defaultDatabaseFile)
const databasePath = process.env.ENDOBRIDGE_DATABASE_PATH
  ? resolve(process.env.ENDOBRIDGE_DATABASE_PATH)
  : defaultDatabasePath
const SESSION_TTL_MS = 12 * 60 * 60 * 1000
const scryptAsync = promisify(scrypt)
const DUMMY_PASSWORD_HASH = `missing-user:${'00'.repeat(64)}`

function now() {
  return new Date().toISOString()
}

function validRegistration(email: string, password: string) {
  return (
    email.length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) &&
    password.length >= 8 &&
    password.length <= 128
  )
}

function emptyMonitoring(): Record<MonitoringCollection, AccountScopedRecord[]> {
  const monitoring = {} as Record<MonitoringCollection, AccountScopedRecord[]>
  collections.forEach((collection) => {
    monitoring[collection] = []
  })
  return monitoring
}

function emptyState(): ProtectedDatabaseState {
  return {
    users: [],
    sessions: [],
    terms: [],
    monitoring: emptyMonitoring(),
    deletions: [],
    rateLimits: [],
  }
}

function normalizeState(raw: Partial<ProtectedDatabaseState>): ProtectedDatabaseState {
  return {
    users: raw.users ?? [],
    sessions: raw.sessions ?? [],
    terms: raw.terms ?? [],
    monitoring: {
      ...emptyMonitoring(),
      ...(raw.monitoring ?? {}),
    },
    deletions: raw.deletions ?? [],
    rateLimits: raw.rateLimits ?? [],
  }
}

async function hashPassword(password: string) {
  const salt = randomUUID()
  const hash = ((await scryptAsync(password, salt, 64)) as Buffer).toString('hex')
  return `${salt}:${hash}`
}

async function verifyPassword(password: string, storedHash: string) {
  const [salt, hash] = storedHash.split(':')
  if (!salt || !hash) return false

  const expected = Buffer.from(hash, 'hex')
  const actual = (await scryptAsync(password, salt, 64)) as Buffer
  return expected.length === actual.length && timingSafeEqual(expected, actual)
}

function tokenHash(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

function sessionExpiry(entry: SessionRecord) {
  return entry.expiresAt instanceof Date ? entry.expiresAt.getTime() : Date.parse(entry.expiresAt)
}

function newSession(userId: string) {
  const token = randomBytes(32).toString('base64url')
  const createdAt = now()
  const session: SessionRecord = {
    tokenHash: tokenHash(token),
    userId,
    createdAt,
    expiresAt: new Date(Date.parse(createdAt) + SESSION_TTL_MS),
  }
  return { token, session }
}

export function dataRecordId(data: unknown) {
  if (!data || typeof data !== 'object') return randomUUID()

  const value = data as Record<string, unknown>
  const id =
    value.entryId ??
    value.medId ??
    value.logId ??
    value.documentId ??
    value.reportId ??
    value.sessionId ??
    value.id

  return typeof id === 'string' && id.trim() ? id : randomUUID()
}

class FileProtectedDatabase implements ProtectedDatabase {
  private state: ProtectedDatabaseState
  private readonly path: string

  constructor(path = databasePath) {
    this.path = path
    this.state = this.load()
  }

  private load() {
    if (!existsSync(this.path)) return emptyState()

    const parsed = JSON.parse(readFileSync(this.path, 'utf8')) as Partial<ProtectedDatabaseState>
    return normalizeState(parsed)
  }

  private save() {
    mkdirSync(dirname(this.path), { recursive: true })
    writeFileSync(this.path, JSON.stringify(this.state, null, 2))
  }

  async createUser(email: string, password: string): Promise<AuthenticatedUser> {
    const normalizedEmail = email.trim().toLowerCase()
    if (!validRegistration(normalizedEmail, password)) {
      throw new Error('a valid email and an 8-128 character password are required')
    }

    if (this.state.users.some((user) => user.email === normalizedEmail)) {
      throw new Error('account already exists')
    }

    const user: UserRecord = {
      userId: randomUUID(),
      email: normalizedEmail,
      passwordHash: await hashPassword(password),
      createdAt: now(),
    }

    this.state.users.push(user)
    this.save()
    return { userId: user.userId, email: user.email }
  }

  async createSession(email: string, password: string) {
    const normalizedEmail = email.trim().toLowerCase()
    if (normalizedEmail.length > 254 || password.length > 128) {
      throw new Error('invalid email or password')
    }
    const user = this.state.users.find((entry) => entry.email === normalizedEmail)
    const passwordMatches = await verifyPassword(password, user?.passwordHash ?? DUMMY_PASSWORD_HASH)
    if (!user || !passwordMatches) {
      throw new Error('invalid email or password')
    }

    const { token, session } = newSession(user.userId)

    this.state.sessions = this.state.sessions.filter((entry) => sessionExpiry(entry) > Date.now())
    this.state.sessions.push(session)
    this.save()
    return {
      token,
      user: { userId: user.userId, email: user.email },
      termsAccepted: await this.hasAcceptedTerms(user.userId),
    }
  }

  async authenticate(token: string): Promise<AuthenticatedUser> {
    const session = this.state.sessions.find((entry) => entry.tokenHash === tokenHash(token))
    const user = session ? this.state.users.find((entry) => entry.userId === session.userId) : null
    if (!session || !user || sessionExpiry(session) <= Date.now()) {
      if (session) {
        this.state.sessions = this.state.sessions.filter((entry) => entry !== session)
        this.save()
      }
      throw new Error('unauthorized')
    }
    return { userId: user.userId, email: user.email }
  }

  async revokeSession(token: string) {
    this.state.sessions = this.state.sessions.filter((entry) => entry.tokenHash !== tokenHash(token))
    this.save()
  }

  async consumeRateLimit(key: string, action: string, maxRequests: number, windowMs: number) {
    const currentTime = Date.now()
    const bucketKey = `${action}:${key}:${Math.floor(currentTime / windowMs)}`
    this.state.rateLimits = this.state.rateLimits.filter(
      (entry) => Date.parse(entry.expiresAt) > currentTime,
    )
    const existing = this.state.rateLimits.find((entry) => entry.key === bucketKey)
    if (existing && existing.count >= maxRequests) return false
    if (existing) existing.count += 1
    else {
      this.state.rateLimits.push({
        key: bucketKey,
        count: 1,
        expiresAt: new Date(currentTime + windowMs * 2).toISOString(),
      })
    }
    this.save()
    return true
  }

  async sessionProfile(token: string) {
    const user = await this.authenticate(token)
    return {
      user,
      termsAccepted: await this.hasAcceptedTerms(user.userId),
    }
  }

  async acceptTerms(userId: string, input: Partial<TermsAcceptanceRecord>) {
    const record = buildTermsAcceptance(userId, input)
    this.state.terms = this.state.terms.filter((entry) => entry.userId !== userId)
    this.state.terms.push(record)
    this.save()
    return record
  }

  async hasAcceptedTerms(userId: string) {
    return this.state.terms.some((entry) => entry.userId === userId)
  }

  async list(collection: MonitoringCollection, userId: string) {
    return this.state.monitoring[collection].filter((record) => record.userId === userId)
  }

  async create(collection: MonitoringCollection, userId: string, data: unknown) {
    const id = dataRecordId(data)
    const record: AccountScopedRecord = {
      id,
      userId,
      createdAt: now(),
      data,
    }

    const records = this.state.monitoring[collection].filter(
      (entry) => !(entry.userId === userId && entry.id === id),
    )
    this.state.monitoring[collection] = [record, ...records]
    this.save()
    return record
  }

  async update(collection: MonitoringCollection, userId: string, id: string, data: unknown) {
    const records = this.state.monitoring[collection]
    const index = records.findIndex((entry) => entry.userId === userId && entry.id === id)
    if (index === -1) throw new Error('record not found')

    records[index] = {
      ...records[index],
      data,
    }
    this.save()
    return records[index]
  }

  async deleteRecord(collection: MonitoringCollection, userId: string, id: string) {
    const before = this.state.monitoring[collection].length
    this.state.monitoring[collection] = this.state.monitoring[collection].filter(
      (entry) => !(entry.userId === userId && entry.id === id),
    )
    if (this.state.monitoring[collection].length === before) {
      throw new Error('record not found')
    }
    this.save()
    return { id, deleted: true as const }
  }

  async deleteCollection(userId: string, deletedDataType: MonitoringCollection | 'all') {
    const targets = deletedDataType === 'all' ? collections : [deletedDataType]
    targets.forEach((collection) => {
      this.state.monitoring[collection] = this.state.monitoring[collection].filter(
        (record) => record.userId !== userId,
      )
    })

    const deletion: DataDeletionRecord = {
      deletionId: randomUUID(),
      userId,
      deletedDataType,
      requestedAt: now(),
      completedAt: now(),
    }
    this.state.deletions.push(deletion)
    this.save()
    return deletion
  }
}

function buildTermsAcceptance(userId: string, input: Partial<TermsAcceptanceRecord>) {
  const record: TermsAcceptanceRecord = {
    acceptanceId: randomUUID(),
    userId,
    acceptedTerms: input.acceptedTerms === true,
    acceptedPrivacy: input.acceptedPrivacy === true,
    confirmedAge: input.confirmedAge === true,
    acceptedDisclaimer: input.acceptedDisclaimer === true,
    acceptedAt: now(),
  }

  if (
    !record.acceptedTerms ||
    !record.acceptedPrivacy ||
    !record.confirmedAge ||
    !record.acceptedDisclaimer
  ) {
    throw new Error('terms acceptance incomplete')
  }

  return record
}

class MongoProtectedDatabase implements ProtectedDatabase {
  private clientPromise: Promise<MongoClient> | null = null
  private indexPromise: Promise<void> | null = null
  private readonly uri: string
  private readonly dbName: string

  constructor(uri: string, dbName = process.env.MONGODB_DB ?? 'endobridge') {
    this.uri = uri
    this.dbName = dbName
  }

  private async db(): Promise<Db> {
    if (!this.clientPromise) {
      this.clientPromise = new MongoClient(this.uri).connect()
    }
    const client = await this.clientPromise
    const db = client.db(this.dbName)
    await this.ensureIndexes(db)
    return db
  }

  private async ensureIndexes(db: Db) {
    if (!this.indexPromise) {
      this.indexPromise = (async () => {
        await db.collection<SessionRecord>('sessions').deleteMany({ tokenHash: { $exists: false } })
        await db.collection<SessionRecord>('sessions').dropIndex('token_1').catch((error: unknown) => {
          if (!isIndexNotFound(error)) throw error
        })
        await Promise.all([
          db.collection<UserRecord>('users').createIndex({ email: 1 }, { unique: true }),
          db.collection<SessionRecord>('sessions').createIndex(
            { tokenHash: 1 },
            { unique: true, sparse: true },
          ),
          db.collection<SessionRecord>('sessions').createIndex({ userId: 1 }),
          db.collection<SessionRecord>('sessions').createIndex(
            { expiresAt: 1 },
            { expireAfterSeconds: 0 },
          ),
          db.collection('apiRateLimits').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
        db.collection<TermsAcceptanceRecord>('termsAcceptance').createIndex(
          { userId: 1 },
          { unique: true },
        ),
        db.collection<DataDeletionRecord>('dataDeletionLogs').createIndex({ userId: 1 }),
        ...collections.map((collection) =>
          db.collection<AccountScopedRecord>(collection).createIndex(
            { userId: 1, id: 1 },
            { unique: true },
          ),
        ),
        ...collections.map((collection) =>
          db.collection<AccountScopedRecord>(collection).createIndex({ userId: 1, createdAt: -1 }),
        ),
        ])
      })()
    }
    return this.indexPromise
  }

  private monitoring(collection: MonitoringCollection, db: Db) {
    return db.collection<AccountScopedRecord>(collection)
  }

  private users(db: Db): Collection<UserRecord> {
    return db.collection<UserRecord>('users')
  }

  async createUser(email: string, password: string): Promise<AuthenticatedUser> {
    const normalizedEmail = email.trim().toLowerCase()
    if (!validRegistration(normalizedEmail, password)) {
      throw new Error('a valid email and an 8-128 character password are required')
    }

    const user: UserRecord = {
      userId: randomUUID(),
      email: normalizedEmail,
      passwordHash: await hashPassword(password),
      createdAt: now(),
    }

    try {
      await this.users(await this.db()).insertOne(user)
    } catch (error) {
      if (isDuplicateKey(error)) throw new Error('account already exists', { cause: error })
      throw error
    }

    return { userId: user.userId, email: user.email }
  }

  async createSession(email: string, password: string) {
    const db = await this.db()
    const normalizedEmail = email.trim().toLowerCase()
    if (normalizedEmail.length > 254 || password.length > 128) {
      throw new Error('invalid email or password')
    }
    const user = await this.users(db).findOne({ email: normalizedEmail })
    const passwordMatches = await verifyPassword(password, user?.passwordHash ?? DUMMY_PASSWORD_HASH)
    if (!user || !passwordMatches) {
      throw new Error('invalid email or password')
    }

    const { token, session } = newSession(user.userId)

    await db.collection<SessionRecord>('sessions').insertOne(session)
    return {
      token,
      user: { userId: user.userId, email: user.email },
      termsAccepted: await this.hasAcceptedTerms(user.userId),
    }
  }

  async authenticate(token: string): Promise<AuthenticatedUser> {
    const db = await this.db()
    const session = await db.collection<SessionRecord>('sessions').findOne({ tokenHash: tokenHash(token) })
    const user = session ? await this.users(db).findOne({ userId: session.userId }) : null
    if (!session || !user || sessionExpiry(session) <= Date.now()) {
      if (session) await db.collection<SessionRecord>('sessions').deleteOne({ tokenHash: session.tokenHash })
      throw new Error('unauthorized')
    }
    return { userId: user.userId, email: user.email }
  }

  async revokeSession(token: string) {
    await (await this.db()).collection<SessionRecord>('sessions').deleteOne({ tokenHash: tokenHash(token) })
  }

  async consumeRateLimit(key: string, action: string, maxRequests: number, windowMs: number) {
    const currentTime = Date.now()
    const bucketKey = `${action}:${key}:${Math.floor(currentTime / windowMs)}`
    const collection = (await this.db()).collection<{
      _id: string
      count: number
      expiresAt: Date
    }>('apiRateLimits')
    try {
      const result = await collection.findOneAndUpdate(
        { _id: bucketKey, count: { $lt: maxRequests } },
        {
          $inc: { count: 1 },
          $setOnInsert: { expiresAt: new Date(currentTime + windowMs * 2) },
        },
        { upsert: true, returnDocument: 'after' },
      )
      return Boolean(result)
    } catch (error) {
      if (isDuplicateKey(error)) return false
      throw error
    }
  }

  async sessionProfile(token: string) {
    const user = await this.authenticate(token)
    return {
      user,
      termsAccepted: await this.hasAcceptedTerms(user.userId),
    }
  }

  async acceptTerms(userId: string, input: Partial<TermsAcceptanceRecord>) {
    const record = buildTermsAcceptance(userId, input)
    await (await this.db())
      .collection<TermsAcceptanceRecord>('termsAcceptance')
      .replaceOne({ userId }, record, { upsert: true })
    return record
  }

  async hasAcceptedTerms(userId: string) {
    return Boolean(
      await (await this.db()).collection<TermsAcceptanceRecord>('termsAcceptance').findOne({
        userId,
      }),
    )
  }

  async list(collection: MonitoringCollection, userId: string) {
    return this.monitoring(collection, await this.db())
      .find({ userId })
      .sort({ createdAt: -1 })
      .toArray()
  }

  async create(collection: MonitoringCollection, userId: string, data: unknown) {
    const record: AccountScopedRecord = {
      id: dataRecordId(data),
      userId,
      createdAt: now(),
      data,
    }

    await this.monitoring(collection, await this.db()).replaceOne(
      { userId, id: record.id },
      record,
      { upsert: true },
    )
    return record
  }

  async update(collection: MonitoringCollection, userId: string, id: string, data: unknown) {
    const db = await this.db()
    const result = await this.monitoring(collection, db).findOneAndUpdate(
      { userId, id },
      { $set: { data } },
      { returnDocument: 'after' },
    )
    if (!result) throw new Error('record not found')
    return result
  }

  async deleteRecord(collection: MonitoringCollection, userId: string, id: string) {
    const result = await this.monitoring(collection, await this.db()).deleteOne({ userId, id })
    if (!result.deletedCount) throw new Error('record not found')
    return { id, deleted: true as const }
  }

  async deleteCollection(userId: string, deletedDataType: MonitoringCollection | 'all') {
    const db = await this.db()
    const targets = deletedDataType === 'all' ? collections : [deletedDataType]
    await Promise.all(targets.map((collection) => this.monitoring(collection, db).deleteMany({ userId })))

    const deletion: DataDeletionRecord = {
      deletionId: randomUUID(),
      userId,
      deletedDataType,
      requestedAt: now(),
      completedAt: now(),
    }
    await db.collection<DataDeletionRecord>('dataDeletionLogs').insertOne(deletion)
    return deletion
  }
}

function isDuplicateKey(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: number }).code === 11000
  )
}

function isIndexNotFound(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    (('code' in error && (error as { code?: number }).code === 27) ||
      ('codeName' in error && (error as { codeName?: string }).codeName === 'IndexNotFound'))
  )
}

function createProtectedDatabase(): ProtectedDatabase {
  const mongoUri = process.env.MONGODB_URI
  const requestedDriver = process.env.ENDOBRIDGE_DATABASE_DRIVER
  const isProduction = process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL)
  const shouldUseMongo =
    Boolean(mongoUri) &&
    requestedDriver !== 'file' &&
    (process.env.NODE_ENV !== 'test' || requestedDriver === 'mongodb')

  if (shouldUseMongo && mongoUri) {
    return new MongoProtectedDatabase(mongoUri)
  }

  if (requestedDriver === 'mongodb' || isProduction) {
    throw new Error('MONGODB_URI is required for protected database storage')
  }

  return new FileProtectedDatabase()
}

export const protectedDatabase = createProtectedDatabase()

export function isMonitoringCollection(value: string): value is MonitoringCollection {
  return collections.includes(value as MonitoringCollection)
}
