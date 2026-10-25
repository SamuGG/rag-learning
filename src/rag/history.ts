import type { Turn } from './types'

/** Starting estimate of characters per token, refined from the model's reported prompt size. */
export const DEFAULT_CHARS_PER_TOKEN = 3

export const estimateTokens = (chars: number, charsPerToken: number) => Math.ceil(chars / charsPerToken)

/** Updates the estimate from a prompt's length and the token count the model reported for it. */
export function calibrateCharsPerToken(promptChars: number, promptTokens: number | undefined, previous: number) {
  if (!promptTokens || promptTokens <= 0 || promptChars <= 0) return previous
  return promptChars / promptTokens
}

/**
 * Keeps the full history unless the prompt would not fit the context window; then drops the oldest turns
 * (in user/assistant pairs) until it fits.
 */
export function fitHistory(
  history: readonly Turn[],
  fixedChars: number,
  budgetTokens: number,
  charsPerToken: number,
): { history: Turn[]; dropped: number } {
  const kept = [...history]
  let chars = fixedChars + kept.reduce((total, turn) => total + turn.content.length, 0)
  let dropped = 0
  while (kept.length > 0 && estimateTokens(chars, charsPerToken) > budgetTokens) {
    const removed = kept.splice(0, kept[0]?.role === 'user' && kept[1]?.role === 'assistant' ? 2 : 1)
    chars -= removed.reduce((total, turn) => total + turn.content.length, 0)
    dropped += removed.length
  }
  return { history: kept, dropped }
}
