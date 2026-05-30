import { beforeAll, describe, expect, it, vi } from 'vitest'
import { randomUUID } from 'node:crypto'

let protectedDatabase: typeof import('./protectedDatabase').protectedDatabase

beforeAll(async () => {
  vi.stubEnv('ENDOBRIDGE_DATABASE_DRIVER', 'file')
  protectedDatabase = (await import('./protectedDatabase')).protectedDatabase
})

describe('protectedDatabase scaffold', () => {
  it('keeps monitoring records account-scoped and supports deletion logs', async () => {
    const leftEmail = `left-${randomUUID()}@example.com`
    const rightEmail = `right-${randomUUID()}@example.com`

    await protectedDatabase.createUser(leftEmail, 'password-1')
    await protectedDatabase.createUser(rightEmail, 'password-2')

    const left = (await protectedDatabase.createSession(leftEmail, 'password-1')).user
    const right = (await protectedDatabase.createSession(rightEmail, 'password-2')).user

    await protectedDatabase.acceptTerms(left.userId, {
      acceptedTerms: true,
      acceptedPrivacy: true,
      confirmedAge: true,
      acceptedDisclaimer: true,
    })
    await protectedDatabase.acceptTerms(right.userId, {
      acceptedTerms: true,
      acceptedPrivacy: true,
      confirmedAge: true,
      acceptedDisclaimer: true,
    })

    await protectedDatabase.create('labSessions', left.userId, { sessionId: 'left-session' })
    await protectedDatabase.create('labSessions', right.userId, { sessionId: 'right-session' })

    await expect(protectedDatabase.list('labSessions', left.userId)).resolves.toHaveLength(1)
    await expect(protectedDatabase.list('labSessions', right.userId)).resolves.toHaveLength(1)

    const deletion = await protectedDatabase.deleteCollection(left.userId, 'labSessions')

    expect(deletion.deletedDataType).toBe('labSessions')
    await expect(protectedDatabase.list('labSessions', left.userId)).resolves.toHaveLength(0)
    await expect(protectedDatabase.list('labSessions', right.userId)).resolves.toHaveLength(1)
  })
})
