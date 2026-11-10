import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react'

const DRAFT_PREFIX = 'endobridge.draft.'

function readDraft<T>(key: string, fallback: T): T {
  try {
    const raw = sessionStorage.getItem(DRAFT_PREFIX + key)
    return raw === null ? fallback : (JSON.parse(raw) as T)
  } catch {
    return fallback
  }
}

/**
 * useState that survives an accidental page refresh.
 *
 * Drafts live in sessionStorage, so they last for the current browser tab
 * only and are wiped on logout (see clearAllDrafts). Pass `null` as the key to
 * turn persistence off, for example before a user is known.
 */
export function usePersistentState<T>(
  key: string | null,
  initialValue: T,
): [T, Dispatch<SetStateAction<T>>, () => void] {
  const [state, setState] = useState<{ key: string | null; value: T }>(() => ({
    key,
    value: key ? readDraft(key, initialValue) : initialValue,
  }))
  const initialRef = useRef(initialValue)

  // The key can change after mount (for example once the signed-in user loads).
  // Re-read the stored draft for the new key during render so nothing is overwritten.
  let current = state
  if (state.key !== key) {
    current = { key, value: key ? readDraft(key, initialValue) : initialValue }
    setState(current)
  }
  const value = current.value

  const setValue = useCallback<Dispatch<SetStateAction<T>>>((next) => {
    setState((previous) => ({
      key: previous.key,
      value: typeof next === 'function' ? (next as (prev: T) => T)(previous.value) : next,
    }))
  }, [])

  useEffect(() => {
    if (!state.key) return
    try {
      sessionStorage.setItem(DRAFT_PREFIX + state.key, JSON.stringify(state.value))
    } catch {
      // Storage can be full or blocked (private mode). The form still works.
    }
  }, [state])

  const clear = useCallback(() => {
    if (key) {
      try {
        sessionStorage.removeItem(DRAFT_PREFIX + key)
      } catch {
        // ignore
      }
    }
    setValue(initialRef.current)
  }, [key, setValue])

  return [value, setValue, clear]
}

export function removeDraft(key: string) {
  try {
    sessionStorage.removeItem(DRAFT_PREFIX + key)
  } catch {
    // ignore
  }
}

export function clearAllDrafts() {
  try {
    Object.keys(sessionStorage)
      .filter((storageKey) => storageKey.startsWith(DRAFT_PREFIX))
      .forEach((storageKey) => sessionStorage.removeItem(storageKey))
  } catch {
    // ignore
  }
}
