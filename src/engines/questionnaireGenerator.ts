import { questionBank, type QuestionDefinition } from '../config/questionBank'
import type { BiomarkerKey, Direction } from '../types/session'

export interface FlagTrigger {
  key: BiomarkerKey
  direction: Direction
}

export function generateQuestionnaire(flags: FlagTrigger[]): QuestionDefinition[] {
  const selected = new Map<string, QuestionDefinition>()

  for (const question of questionBank) {
    const shouldInclude = question.triggers.some((trigger) =>
      flags.some(
        (flag) =>
          flag.key === trigger.key &&
          (!trigger.direction || trigger.direction === flag.direction),
      ),
    )

    if (shouldInclude) {
      selected.set(question.id, question)
    }
  }

  return [...selected.values()]
}
