// Synthetic screenplay text for tests. Original filler with invented names only.

const SPEAKERS = ['MARA', 'ROBOT #2', 'CAPTAIN OREN', 'TEO (V.O.)']
const LINES = [
  'We have less than an hour before the storm reaches the ridge.',
  'Then we move now, while the lights still work.',
  'The relay is fried. Somebody has to climb the mast and patch it by hand.',
  'I can do it, but I need the spare coupling from the hold.',
  'Fine. Nobody goes alone, and nobody plays the hero tonight.',
]

/** A long scene with alternating action and dialogue, optionally containing one very long speech. */
export function longScene(exchanges: number, options: { longSpeechAt?: number; longSpeechWords?: number } = {}) {
  const parts = ['INT. RELAY STATION - NIGHT\n\n', 'Wind hammers the shutters. Consoles flicker in the gloom.\n\n']
  for (let i = 0; i < exchanges; i++) {
    const speaker = SPEAKERS[i % SPEAKERS.length]
    if (i === options.longSpeechAt) {
      const words = Array.from({ length: options.longSpeechWords ?? 600 }, (_, k) => `word${k % 50}`).join(' ')
      parts.push(`${speaker}\n\n${words}.\n\n`)
      continue
    }
    parts.push(`${speaker}\n\n${LINES[i % LINES.length]}\n\n`)
    if (i % 3 === 2) parts.push(`${speaker === 'MARA' ? 'Mara' : 'Oren'} checks the gauges again.\n\n`)
  }
  return parts.join('')
}
