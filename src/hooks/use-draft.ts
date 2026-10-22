import { useState } from 'react'

/**
 * Local text state for an input whose committed value lives in the URL, so typing never waits
 * on a navigation. The draft resets whenever the committed value changes from elsewhere
 * (back/forward, "Reset filters").
 */
export function useDraft<T>(value: T, toText: (v: T) => string, sameValue: (text: string, v: T) => boolean) {
  const [text, setText] = useState(() => toText(value))
  const [prev, setPrev] = useState(value)
  if (!Object.is(value, prev)) {
    setPrev(value)
    if (!sameValue(text, value)) setText(toText(value))
  }
  return [text, setText] as const
}
