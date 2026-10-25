import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DocumentsError, loadDocuments, MAX_FILE_BYTES } from '../../src/server/documents'

let dir: string

beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), 'rag-docs-'))
})

afterAll(async () => {
  await rm(dir, { recursive: true, force: true })
})

const writeCase = async (name: string, files: Record<string, string | Uint8Array>) => {
  const caseDir = join(dir, name)
  const manifest = Object.keys(files).map((file, i) => ({ file, title: `Film ${i}`, imdbId: `tt000000${i}` }))
  await Bun.write(join(caseDir, 'manifest.json'), JSON.stringify(manifest))
  for (const [file, content] of Object.entries(files)) await Bun.write(join(caseDir, file), content)
  return caseDir
}

const problemsOf = async (caseDir: string) => {
  try {
    await loadDocuments(caseDir)
  } catch (error) {
    if (error instanceof DocumentsError) return error.problems.join('\n')
    throw error
  }
  return ''
}

describe('loadDocuments', () => {
  test('loads the committed samples', async () => {
    const documents = await loadDocuments('data/samples')
    expect(documents.map(d => d.entry.imdbId)).toEqual(['tt0000001', 'tt0000002'])
    expect(documents[0]?.source.startsWith('EXT. FROZEN CANYON')).toBe(true)
  })

  test('strips a BOM and keeps CRLF', async () => {
    const caseDir = await writeCase('bom', { 'a.txt': '﻿INT. HUT - DAY\r\n\r\nRain.\r\n' })
    const [document] = await loadDocuments(caseDir)
    expect(document?.source).toBe('INT. HUT - DAY\r\n\r\nRain.\r\n')
  })

  test('reports a missing manifest', async () => {
    expect(await problemsOf(join(dir, 'nowhere'))).toContain('manifest.json: file not found')
  })

  test('reports every bad file at once', async () => {
    const caseDir = await writeCase('bad', {
      'empty.txt': '',
      'big.txt': 'x'.repeat(MAX_FILE_BYTES + 1),
      'binary.txt': new Uint8Array([0xff, 0xfe, 0x00, 0xc3]),
      'old-mac.txt': 'INT. HUT - DAY\rRain.\r',
      'blank.txt': ' \n\n ',
    })
    const problems = await problemsOf(caseDir)
    expect(problems).toContain('empty.txt: file is empty')
    expect(problems).toContain('big.txt:')
    expect(problems).toContain('binary.txt: not valid UTF-8')
    expect(problems).toContain('old-mac.txt: uses old Mac')
    expect(problems).toContain('blank.txt: contains only whitespace')
  })

  test('reports files listed but missing', async () => {
    const caseDir = join(dir, 'missing')
    await Bun.write(
      join(caseDir, 'manifest.json'),
      JSON.stringify([{ file: 'x.txt', title: 'X', imdbId: 'tt0000001' }]),
    )
    expect(await problemsOf(caseDir)).toContain('x.txt: file not found')
  })
})
