import { DEFAULT_RULES, type HeadingRule, matchRule } from './headings'
import { isBlank, type Line, toLines } from './lines'

export type SegmentKind = 'preamble' | 'scene' | 'transition' | 'terminator' | 'orphan'

/** A contiguous slice of the screenplay: one scene, the preamble, or text orphaned after a transition. */
export interface Segment {
  start: number
  end: number
  kind: SegmentKind
  /** Scene heading `norm`; null unless opened by a scene-heading rule. */
  heading: string | null
  /** The line that opened the segment, if any. */
  opener: Line | null
  lines: Line[]
}

const hasBody = (segment: Segment) => segment.lines.some(line => line !== segment.opener && !isBlank(line))

/** Bodiless transition/terminator segments and whitespace-only preambles merge into a neighbour. */
const isMergeable = (segment: Segment) =>
  !hasBody(segment) && (segment.kind === 'transition' || segment.kind === 'terminator' || segment.kind === 'preamble')

function mergeBodiless(segments: Segment[]): Segment[] {
  const result = [...segments]
  for (let i = result.findIndex(isMergeable); i !== -1 && result.length > 1; i = result.findIndex(isMergeable)) {
    const [segment] = result.splice(i, 1)
    if (!segment) break
    const next = result[i]
    if (next) {
      next.start = segment.start
      next.lines = [...segment.lines, ...next.lines]
    } else {
      const previous = result[i - 1]
      if (!previous) break
      previous.end = segment.end
      previous.lines = [...previous.lines, ...segment.lines]
    }
  }
  return result
}

/** Splits a screenplay into segments that partition `source` exactly (after a leading BOM). */
export function segmentScenes(source: string, rules: readonly HeadingRule[] = DEFAULT_RULES): Segment[] {
  const from = source.startsWith('﻿') ? 1 : 0
  if (source.length === from) return []

  const segments: Segment[] = []
  let current: Segment = { start: from, end: from, kind: 'preamble', heading: null, opener: null, lines: [] }
  let afterCloser = false

  const startSegment = (line: Line, kind: SegmentKind, heading: string | null, opener: Line | null) => {
    if (current.lines.length > 0) segments.push(current)
    current = { start: line.start, end: line.start, kind, heading, opener, lines: [line] }
  }

  for (const line of toLines(source, from)) {
    if (isBlank(line)) {
      current.lines.push(line)
      continue
    }
    const rule = matchRule(line.norm, rules)
    if (rule?.role === 'opens') {
      const kind: SegmentKind =
        rule.kind === 'scene' ? 'scene' : rule.kind === 'terminator' ? 'terminator' : 'transition'
      startSegment(line, kind, rule.kind === 'scene' ? line.norm : null, line)
      afterCloser = false
    } else if (rule?.role === 'closes') {
      current.lines.push(line)
      afterCloser = true
    } else if (rule?.kind === 'furniture' || !afterCloser) {
      current.lines.push(line)
    } else {
      startSegment(line, 'orphan', null, null)
      afterCloser = false
    }
  }
  segments.push(current)

  for (const [i, segment] of segments.entries()) {
    segment.end = segments[i + 1]?.start ?? source.length
  }
  return mergeBodiless(segments)
}
