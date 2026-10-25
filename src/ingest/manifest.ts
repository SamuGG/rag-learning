/** One screenplay listed in `manifest.json`. */
export interface ManifestEntry {
  /** Path of the text file, relative to the manifest. */
  file: string
  title: string
  imdbId: string
  /** True for the repository's synthetic samples. */
  synthetic?: boolean
}

export const MAX_DOCUMENTS = 10
export const MAX_TITLE_LENGTH = 200
const IMDB_ID = /^tt\d{7,8}$/
const KEYS = new Set(['file', 'title', 'imdbId', 'synthetic'])

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isSafeRelativePath = (path: string) =>
  path.trim() === path
  && path !== ''
  && !path.startsWith('/')
  && !/^[A-Za-z]:/.test(path)
  && !path.split(/[\\/]/).some(part => part === '..' || part === '')

/** Validates parsed manifest JSON, collecting every problem instead of stopping at the first. */
export function validateManifest(json: unknown): { entries: ManifestEntry[]; errors: string[] } {
  const errors: string[] = []
  if (!Array.isArray(json)) return { entries: [], errors: ['manifest must be a JSON array of entries'] }
  if (json.length === 0) errors.push('manifest lists no documents')
  if (json.length > MAX_DOCUMENTS) errors.push(`manifest lists ${json.length} documents; the limit is ${MAX_DOCUMENTS}`)

  const entries: ManifestEntry[] = []
  const files = new Set<string>()
  const ids = new Set<string>()

  for (const [i, raw] of json.entries()) {
    const at = `entry ${i}`
    if (!isRecord(raw)) {
      errors.push(`${at}: must be an object`)
      continue
    }
    const before = errors.length
    for (const key of Object.keys(raw)) if (!KEYS.has(key)) errors.push(`${at}: unknown key "${key}"`)

    const { file, title, imdbId, synthetic } = raw
    if (typeof file !== 'string' || !isSafeRelativePath(file)) {
      errors.push(`${at}: "file" must be a relative path inside the documents folder`)
    } else if (files.has(file)) {
      errors.push(`${at}: file "${file}" is listed twice`)
    }
    if (typeof title !== 'string' || title.trim() === '') {
      errors.push(`${at}: "title" must be a non-empty string`)
    } else if (title.length > MAX_TITLE_LENGTH) {
      errors.push(`${at}: "title" is longer than ${MAX_TITLE_LENGTH} characters`)
    }
    if (typeof imdbId !== 'string' || !IMDB_ID.test(imdbId)) {
      errors.push(`${at}: "imdbId" must look like tt1234567`)
    } else if (ids.has(imdbId)) {
      errors.push(`${at}: imdbId "${imdbId}" is listed twice`)
    }
    if (synthetic !== undefined && typeof synthetic !== 'boolean')
      errors.push(`${at}: "synthetic" must be true or false`)

    if (typeof file === 'string') files.add(file)
    if (typeof imdbId === 'string') ids.add(imdbId)
    if (errors.length === before) {
      entries.push({
        file: file as string,
        title: title as string,
        imdbId: imdbId as string,
        ...(synthetic === undefined ? {} : { synthetic: synthetic as boolean }),
      })
    }
  }
  return { entries: errors.length === 0 ? entries : [], errors }
}
