import { uppercaseRatio } from './lines'

export type RuleKind = 'scene' | 'transition' | 'terminator' | 'furniture'
export type RuleRole = 'opens' | 'closes' | 'none'

/** A recogniser for one kind of structural screenplay line. Rules are tried in order; the first match wins. */
export interface HeadingRule {
  name: string
  kind: RuleKind
  role: RuleRole
  test(norm: string): boolean
}

const SCENE_PREFIX =
  /^(?:[A-Z]?\d+[A-Z]?[.)]?\s+)?(?:INT\.?\s*\/\s*EXT\.?|EXT\.?\s*\/\s*INT\.?|I\s*\/\s*E\.?|INT\.?|EXT\.?)(?:\s+|\s*[-–—.:]\s*)\S/

/** INT./EXT. style scene headings, tolerant of numbering, dashes and missing dots. */
export const sceneHeading: HeadingRule = {
  name: 'scene-heading',
  kind: 'scene',
  role: 'opens',
  test: norm => SCENE_PREFIX.test(norm) && uppercaseRatio(norm) >= 0.8,
}

const collapse = (norm: string) => norm.replace(/\s+/g, ' ')

/** A whole-line, uppercase-only phrase with an optional trailing `:` or `.`. */
export function phraseRule(name: string, kind: RuleKind, role: RuleRole, phrase: string): HeadingRule {
  return { name, kind, role, test: norm => collapse(norm).replace(/[:.]$/, '') === phrase }
}

/** Structural lines from paginated exports; never open scenes. */
export const pageFurniture: HeadingRule = {
  name: 'page-furniture',
  kind: 'furniture',
  role: 'none',
  test: norm =>
    /^\d+[A-Z]?\.?$/.test(norm) || /^\(?(?:MORE|CONTINUED|CONT['’]D)\)?:?(?:\s*\(\d+\))?$/.test(collapse(norm)),
}

export const DEFAULT_RULES: readonly HeadingRule[] = [
  sceneHeading,
  phraseRule('fade-in', 'transition', 'opens', 'FADE IN'),
  phraseRule('iris-in', 'transition', 'opens', 'IRIS IN'),
  phraseRule('the-end', 'terminator', 'opens', 'THE END'),
  phraseRule('end-credits', 'terminator', 'opens', 'END CREDITS'),
  phraseRule('cut-to', 'transition', 'closes', 'CUT TO'),
  phraseRule('smash-cut-to', 'transition', 'closes', 'SMASH CUT TO'),
  phraseRule('match-cut-to', 'transition', 'closes', 'MATCH CUT TO'),
  phraseRule('jump-cut-to', 'transition', 'closes', 'JUMP CUT TO'),
  phraseRule('cut-to-black', 'transition', 'closes', 'CUT TO BLACK'),
  phraseRule('cut', 'transition', 'closes', 'CUT'),
  phraseRule('dissolve-to', 'transition', 'closes', 'DISSOLVE TO'),
  phraseRule('fade-out', 'transition', 'closes', 'FADE OUT'),
  phraseRule('fade-to-black', 'transition', 'closes', 'FADE TO BLACK'),
  phraseRule('fade-to-white', 'transition', 'closes', 'FADE TO WHITE'),
  phraseRule('iris-out', 'transition', 'closes', 'IRIS OUT'),
  phraseRule('wipe-to', 'transition', 'closes', 'WIPE TO'),
  phraseRule('pan-to', 'transition', 'closes', 'PAN TO'),
  // A bare "PAN" could be a character called Pan, so only "PAN:" counts.
  { name: 'pan', kind: 'transition', role: 'closes', test: norm => collapse(norm) === 'PAN:' },
  pageFurniture,
]

export function matchRule(norm: string, rules: readonly HeadingRule[]): HeadingRule | undefined {
  if (norm === '') return undefined
  return rules.find(rule => rule.test(norm))
}
