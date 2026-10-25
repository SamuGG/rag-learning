export interface Line {
  /** Offset of the first character. */
  start: number
  /** Offset just past the line terminator. */
  end: number
  /** The line without its terminator (`\n` or `\r\n`). */
  content: string
  /** Trimmed content without form feeds; used for classification only, never emitted. */
  norm: string
}

const LINE = /[^\n]*\n|[^\n]+$/g

/** Splits `source` from `from` into lines, keeping every character addressable by offset. */
export function toLines(source: string, from = 0): Line[] {
  const lines: Line[] = []
  LINE.lastIndex = from
  for (let match = LINE.exec(source); match; match = LINE.exec(source)) {
    const raw = match[0]
    const content = raw.replace(/\r?\n$/, '')
    lines.push({
      start: match.index,
      end: match.index + raw.length,
      content,
      norm: content.replace(/\f/g, '').trim(),
    })
  }
  return lines
}

export const isBlank = (line: Line): boolean => line.norm === ''

/** Share of letters that are uppercase (0 when there are no cased letters). */
export function uppercaseRatio(text: string): number {
  const letters = text.match(/\p{L}/gu) ?? []
  const cased = letters.filter(c => c.toUpperCase() !== c.toLowerCase())
  if (cased.length === 0) return 0
  return cased.filter(c => c === c.toUpperCase()).length / cased.length
}
