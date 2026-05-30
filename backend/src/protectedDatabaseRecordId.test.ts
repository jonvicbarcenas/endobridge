import { describe, expect, it } from 'vitest'
import { dataRecordId } from './protectedDatabase'

describe('dataRecordId', () => {
  it('prefers a specific entry id over session id for session-linked records', () => {
    expect(
      dataRecordId({
        entryId: 'symptom-acne',
        sessionId: 'session-with-five-symptoms',
        symptomKey: 'acne',
      }),
    ).toBe('symptom-acne')
  })
})
