import { join } from 'node:path'
import { type ManifestEntry, validateManifest } from '../ingest/manifest'

/** Largest accepted screenplay file: 512 KB. */
export const MAX_FILE_BYTES = 512 * 1024

export interface Document {
  entry: ManifestEntry
  /** Decoded text (strict UTF-8, BOM removed). */
  source: string
}

export class DocumentsError extends Error {
  override name = 'DocumentsError'
  constructor(readonly problems: string[]) {
    super(`Invalid documents:\n- ${problems.join('\n- ')}`)
  }
}

const decoder = new TextDecoder('utf-8', { fatal: true })

async function readDocument(dir: string, entry: ManifestEntry, problems: string[]): Promise<Document | undefined> {
  const file = Bun.file(join(dir, entry.file))
  if (!(await file.exists())) {
    problems.push(`${entry.file}: file not found`)
    return undefined
  }
  if (file.size === 0) {
    problems.push(`${entry.file}: file is empty`)
    return undefined
  }
  if (file.size > MAX_FILE_BYTES) {
    problems.push(`${entry.file}: ${file.size} bytes; the limit is ${MAX_FILE_BYTES}`)
    return undefined
  }
  let source: string
  try {
    source = decoder.decode(await file.arrayBuffer())
  } catch {
    problems.push(`${entry.file}: not valid UTF-8 text`)
    return undefined
  }
  if (/\r(?!\n)/.test(source)) {
    problems.push(`${entry.file}: uses old Mac (CR-only) line endings; convert to LF or CRLF`)
    return undefined
  }
  if (source.trim() === '') {
    problems.push(`${entry.file}: contains only whitespace`)
    return undefined
  }
  return { entry, source }
}

/** Loads `<dir>/manifest.json` and every listed file, reporting all problems at once. */
export async function loadDocuments(dir: string): Promise<Document[]> {
  const manifestFile = Bun.file(join(dir, 'manifest.json'))
  if (!(await manifestFile.exists())) throw new DocumentsError([`${join(dir, 'manifest.json')}: file not found`])

  let json: unknown
  try {
    json = JSON.parse(await manifestFile.text())
  } catch (error) {
    throw new DocumentsError([`manifest.json: invalid JSON (${error instanceof Error ? error.message : error})`])
  }

  const { entries, errors } = validateManifest(json)
  if (errors.length > 0) throw new DocumentsError(errors.map(e => `manifest.json: ${e}`))

  const problems: string[] = []
  const documents: Document[] = []
  for (const entry of entries) {
    const document = await readDocument(dir, entry, problems)
    if (document) documents.push(document)
  }
  if (problems.length > 0) throw new DocumentsError(problems)
  return documents
}
