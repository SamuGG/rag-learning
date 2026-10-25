import { describe, expect, test } from 'bun:test'
import { isCue } from '../../src/ingest/blocks'
import { DEFAULT_RULES, matchRule } from '../../src/ingest/headings'

const ruleOf = (line: string) => matchRule(line.trim(), DEFAULT_RULES)?.name

describe('scene headings', () => {
  test.each([
    'INT. HOUSE - DAY',
    '12A EXT./INT. CAR - NIGHT 12A',
    'INT - LAB',
    'I/E TRUCK – MOVING',
    'EXT.ROOF',
    "INT. McDONALD'S",
    'INT HOUSE',
    'INT./EXT. CAR',
    'EXT- STREET',
  ])('accepts %p', line => expect(ruleOf(line)).toBe('scene-heading'))

  test.each([
    'Ext. walls crumble',
    'INTERNAL MEMO',
    'INTO THE NIGHT',
    'EXTRA LARGE',
    'INT.',
    'EXTREME CLOSE UP ON EYES',
    'INTERCUT WITH',
    'INTENSE MUSIC',
  ])('rejects %p', line => expect(ruleOf(line)).not.toBe('scene-heading'))
})

describe('transitions and page furniture', () => {
  test.each([
    ['FADE IN:', 'fade-in'],
    ['CUT TO:', 'cut-to'],
    ['  SMASH CUT TO:', 'smash-cut-to'],
    ['DISSOLVE TO:', 'dissolve-to'],
    ['FADE OUT.', 'fade-out'],
    ['IRIS OUT', 'iris-out'],
    ['THE END', 'the-end'],
    ['END CREDITS', 'end-credits'],
    ['CUT', 'cut'],
    ['PAN:', 'pan'],
    ['45.', 'page-furniture'],
    ['(MORE)', 'page-furniture'],
    ['CONTINUED:', 'page-furniture'],
  ])('%p is %p', (line, name) => expect(ruleOf(line)).toBe(name))

  test.each(['Cut!', 'CUT TO THE CHASE', 'THE ENDING', 'PAN', 'cut to:'])('%p is not structural', line =>
    expect(ruleOf(line)).toBeUndefined(),
  )
})

describe('character cues', () => {
  test.each(['YOUNG PILOT', 'ROBOT #2', 'MARA (V.O.)', 'JOSÉ', 'McCLANE', "O'BRIEN", "NIKO (CONT'D)", 'C.J.'])(
    'accepts %p',
    line => expect(isCue(line)).toBe(true),
  )

  test.each([
    'EXTREME CLOSE UP',
    'ANGLE ON THE DOOR',
    'MONTAGE',
    'Hello there.',
    'WAIT!',
    'SUPER: TEN YEARS LATER',
    'MARA (quietly)',
    'THIS LINE IS FAR TOO LONG TO BE A CHARACTER NAME AT ALL',
  ])('rejects %p', line => expect(isCue(line)).toBe(false))
})
