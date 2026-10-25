// Prints how a screenplay is split into scenes and chunks. Does no indexing.
// Usage: bun run chunk:preview <file> [--imdb tt0000001] [--approx] [--verify]
import { parseArgs } from 'node:util'
import { segmentBlocks } from '../src/ingest/blocks'
import { splitScreenplay } from '../src/ingest/chunker'
import { segmentScenes } from '../src/ingest/scenes'
import { approximateCounter, createModelCounter } from '../src/ingest/tokens'
import type { SplitWarning } from '../src/ingest/types'

const { values, positionals } = parseArgs({
  args: Bun.argv.slice(2),
  allowPositionals: true,
  options: {
    imdb: { type: 'string', default: 'tt0000000' },
    approx: { type: 'boolean', default: false },
    verify: { type: 'boolean', default: false },
  },
})

const file = positionals[0]
if (!file) {
  console.error('Usage: bun run chunk:preview <file> [--imdb tt0000001] [--approx] [--verify]')
  process.exit(1)
}

const source = await Bun.file(file).text()
const counter = values.approx
  ? approximateCounter
  : await createModelCounter(Bun.env.EMBEDDING_CACHE_DIR ?? '.cache/fastembed')
const warnings: SplitWarning[] = []
const scenes = await splitScreenplay(values.imdb, source, { counter, onWarning: w => warnings.push(w) })

// Block kinds per scene, for display only.
const blocksByScene = segmentScenes(source).map(segment => segmentBlocks(segment))
let cursor = 0

const sizes = await counter.countMany(scenes.map(s => s.text))
const rule = '─'.repeat(80)
for (const [i, scene] of scenes.entries()) {
  const previous = scenes[i - 1]
  let overlap = ''
  if (previous && previous.sceneIndex === scene.sceneIndex) {
    for (let k = Math.min(previous.text.length, scene.text.length); k > 0; k--) {
      if (previous.text.endsWith(scene.text.slice(0, k))) {
        overlap = scene.text.slice(0, k)
        break
      }
    }
  }
  const [overlapTokens = 0] = overlap ? await counter.countMany([overlap]) : []
  const at = source.indexOf(scene.text, Math.max(0, cursor - scene.text.length))
  cursor = at + scene.text.length
  const blockKinds = (blocksByScene[scene.sceneIndex] ?? [])
    .filter(block => block.start >= at && block.end <= cursor)
    .map(block => block.kind)
    .join(', ')
  console.log(rule)
  console.log(
    `scene ${scene.sceneIndex} chunk ${scene.chunkIndex} | ${scene.heading ?? '(no heading)'} | `
      + `${sizes[i]} tokens | overlap ${overlapTokens} | ${blockKinds}`,
  )
  console.log(rule)
  console.log(scene.text)
}

if (values.verify) {
  const covered = new Set<number>()
  cursor = 0
  for (const scene of scenes) {
    const at = source.indexOf(scene.text, Math.max(0, cursor - scene.text.length))
    if (at < 0) throw new Error(`Chunk ${scene.sceneIndex}:${scene.chunkIndex} is not an exact slice of the source`)
    for (let k = at; k < at + scene.text.length; k++) covered.add(k)
    cursor = at + scene.text.length
  }
  const from = source.startsWith('﻿') ? 1 : 0
  const missing = source.length - from - [...covered].filter(k => k >= from).length
  console.log(rule)
  console.log(missing === 0 ? 'verify: every character is covered, in order' : `verify: ${missing} characters missing`)
  if (missing !== 0) process.exitCode = 1
}

for (const warning of warnings) console.warn('warning:', JSON.stringify(warning))
console.log(`${scenes.length} chunks from ${new Set(scenes.map(s => s.sceneIndex)).size} scenes`)
