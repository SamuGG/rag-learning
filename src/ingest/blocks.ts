import { DEFAULT_RULES, type HeadingRule, matchRule } from './headings'
import { isBlank, type Line, uppercaseRatio } from './lines'
import type { Segment } from './scenes'

export type BlockKind = 'heading' | 'transition' | 'furniture' | 'dialogue' | 'parenthetical' | 'action'

/** An indivisible unit of a scene. Blocks partition their segment exactly. */
export interface Block {
  start: number
  end: number
  kind: BlockKind
}

type ParagraphKind = Exclude<BlockKind, 'dialogue'> | 'cue'

interface Paragraph {
  start: number
  end: number
  kind: ParagraphKind
  lines: Line[]
}

/** Uppercase lines that look like names but are scene notes or camera directions. Extensible. */
export const NOT_CUES: ReadonlySet<string> = new Set([
  'MONTAGE',
  'END MONTAGE',
  'BACK TO SCENE',
  'LATER',
  'CONTINUOUS',
  'INTERCUT',
  'OMITTED',
  'FLASHBACK',
  'END FLASHBACK',
  'TITLE',
  'SUPER',
  'SILENCE',
])

export const NOT_CUE_PREFIXES: readonly string[] = [
  'ANGLE ON',
  'CLOSE ON',
  'CLOSE UP',
  'EXTREME CLOSE UP',
  'WIDE SHOT',
  'POV',
  'INSERT',
  'ESTABLISHING',
]

const EXTENSION = /\s*\(([^()]*)\)$/u
const NAME = /^[\p{Lu}\p{N}][\p{Lu}\p{Ll}\p{N} .'’\-&#/]*$/u
const INITIALS = /^(?:\p{Lu}{1,3}\.)+$/u

/** True when a trimmed line looks like a character cue such as `MARA (V.O.)` or `ROBOT #2`. */
export function isCue(norm: string): boolean {
  if (/[:!?]$/.test(norm)) return false
  let name = norm
  for (let match = EXTENSION.exec(name); match; match = EXTENSION.exec(name)) {
    if (/\p{Ll}/u.test(match[1] ?? '')) return false
    name = name.slice(0, match.index)
  }
  name = name.trim()
  if (name.length < 1 || name.length > 40 || !/\p{L}/u.test(name) || !NAME.test(name)) return false
  const words = name.split(/\s+/)
  if (words.length > 5 || uppercaseRatio(name) < 0.8) return false
  if (name.endsWith('.') && !INITIALS.test(words.at(-1) ?? '')) return false
  if (NOT_CUES.has(name)) return false
  return !NOT_CUE_PREFIXES.some(prefix => name === prefix || name.startsWith(`${prefix} `))
}

const indentOf = (line: Line) => {
  const leading = line.content.match(/^[ \t\f]*/)?.[0] ?? ''
  let width = 0
  for (const c of leading) width += c === '\t' ? 4 : c === '\f' ? 0 : 1
  return width
}

/** True when a cue paragraph already holds speech (any line outside parentheses after the cue). */
function hasSpeech(lines: Line[]): boolean {
  let inParenthesis = false
  for (const line of lines.slice(1)) {
    if (line.norm.startsWith('(')) inParenthesis = true
    if (!inParenthesis) return true
    if (line.norm.endsWith(')')) inParenthesis = false
  }
  return false
}

const isParenthetical = (lines: Line[]) =>
  (lines[0]?.norm.startsWith('(') ?? false) && (lines.at(-1)?.norm.endsWith(')') ?? false)

/** Groups non-blank lines into paragraphs; structural lines stand alone and cue lines start new paragraphs. */
function toParagraphs(segment: Segment, rules: readonly HeadingRule[]): Paragraph[] {
  const groups: Line[][] = []
  let group: Line[] = []
  const flush = () => {
    if (group.length > 0) groups.push(group)
    group = []
  }
  for (const line of segment.lines) {
    if (isBlank(line)) {
      flush()
      continue
    }
    const structural = matchRule(line.norm, rules) !== undefined
    const previous = group.at(-1)
    const cueAfterText = previous !== undefined && isCue(line.norm) && !isCue(previous.norm)
    if (structural || cueAfterText) flush()
    group.push(line)
    if (structural) flush()
  }
  flush()

  return groups.map((lines, i) => {
    const first = lines[0] as Line
    const rule = matchRule(first.norm, rules)
    const kind: ParagraphKind =
      rule?.kind === 'scene'
        ? 'heading'
        : rule?.kind === 'furniture'
          ? 'furniture'
          : rule
            ? 'transition'
            : isCue(first.norm)
              ? 'cue'
              : isParenthetical(lines)
                ? 'parenthetical'
                : 'action'
    const start = i === 0 ? segment.start : first.start
    const end = groups[i + 1]?.[0]?.start ?? segment.end
    return { start, end, kind, lines }
  })
}

/** Splits a segment into blocks, gluing each character cue to its parentheticals and speech. */
export function segmentBlocks(segment: Segment, rules: readonly HeadingRule[] = DEFAULT_RULES): Block[] {
  const paragraphs = toParagraphs(segment, rules)
  if (paragraphs.length === 0) return [{ start: segment.start, end: segment.end, kind: 'action' }]

  const actionIndents = paragraphs.filter(p => p.kind === 'action').map(p => indentOf(p.lines[0] as Line))
  const minActionIndent = actionIndents.length > 0 ? Math.min(...actionIndents) : 0

  const blocks: Block[] = []
  for (let i = 0; i < paragraphs.length; ) {
    const paragraph = paragraphs[i] as Paragraph
    if (paragraph.kind !== 'cue') {
      blocks.push({ start: paragraph.start, end: paragraph.end, kind: paragraph.kind })
      i++
      continue
    }
    let j = i + 1
    if (!hasSpeech(paragraph.lines)) {
      while (paragraphs[j]?.kind === 'parenthetical') j++
      const speech = paragraphs[j]
      if (speech?.kind === 'action') {
        j++
        const speechIndent = indentOf(speech.lines[0] as Line)
        if (speechIndent > minActionIndent) {
          while (
            paragraphs[j]?.kind === 'action'
            && indentOf((paragraphs[j] as Paragraph).lines[0] as Line) === speechIndent
          ) {
            j++
          }
        }
      }
    }
    const last = paragraphs[j - 1] as Paragraph
    blocks.push({ start: paragraph.start, end: last.end, kind: 'dialogue' })
    i = j
  }
  return blocks
}
