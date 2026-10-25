import type { RetrievedChunk, Turn } from './types'

/** Recent turns given to the HyDE call so follow-up questions stay anchored. */
export const HYDE_HISTORY_TURNS = 4

export const HYDE_SYSTEM_PROMPT = `You write short, plausible screenplay excerpts.
Given a question about films in a collection, write the kind of scene that would contain the answer:
a scene heading, a few lines of action and some dialogue, 80 to 150 words in total.
Keep the people, places, objects and events named in the question and the conversation; use their exact names.
Do not invent new character names or locations unless the question gives none.
Output only the passage. No explanations, no title, no notes.`

export const ANSWER_SYSTEM_PROMPT = `You answer questions about movie screenplays using only the scene excerpts provided with each question.
Rules:
- Base every statement on the excerpts. Do not use outside knowledge about the films.
- Cite the excerpts you rely on by their number in square brackets, for example [1] or [1][2]. Never put titles or
  headings inside brackets.
- If the excerpts do not contain the answer, say that you could not find it in the provided screenplays.
- Summarise instead of copying; quote at most a short line of dialogue.
- Be concise.`

export const NO_EXCERPTS = '(No matching scenes were found.)'

/** `Title — HEADING`, or the scene number when the chunk has no heading. */
export function chunkLabel(chunk: Pick<RetrievedChunk, 'title' | 'heading' | 'sceneIndex'>): string {
  return `${chunk.title} — ${chunk.heading ?? `scene ${chunk.sceneIndex + 1}`}`
}

const speaker = (turn: Turn) => (turn.role === 'user' ? 'User' : 'Assistant')

/** Messages for the hypothesise call (HyDE). */
export function hydeMessages(question: string, history: readonly Turn[]) {
  const recent = history.slice(-HYDE_HISTORY_TURNS)
  const conversation = recent.length
    ? `Conversation so far:\n${recent.map(turn => `${speaker(turn)}: ${turn.content}`).join('\n')}\n\n`
    : ''
  return [
    { role: 'system' as const, content: HYDE_SYSTEM_PROMPT },
    { role: 'user' as const, content: `${conversation}Question: ${question}` },
  ]
}

/** Each excerpt is numbered for citation and prefixed with its film title and scene heading: `[1] Title — HEADING`. */
export function formatExcerpts(chunks: readonly RetrievedChunk[]): string {
  if (chunks.length === 0) return NO_EXCERPTS
  return chunks.map((chunk, i) => `[${i + 1}] ${chunkLabel(chunk)}\n${chunk.text.trim()}`).join('\n\n---\n\n')
}

/** Messages for the answer call: system rules, full history, then excerpts and the question. */
export function answerMessages(question: string, chunks: readonly RetrievedChunk[], history: readonly Turn[]) {
  return [
    { role: 'system' as const, content: ANSWER_SYSTEM_PROMPT },
    ...history.map(turn => ({ role: turn.role, content: turn.content })),
    { role: 'user' as const, content: `Scene excerpts:\n\n${formatExcerpts(chunks)}\n\nQuestion: ${question}` },
  ]
}
