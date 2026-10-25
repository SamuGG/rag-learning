// Minimal, safe Markdown for model answers: everything is HTML-escaped first, then a small subset is formatted.
// Supported: paragraphs, line breaks, bullet and numbered lists, **bold**, *italic*, `code`, and [n] citations.

const escapeHtml = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')

export interface MarkdownOptions {
  /** Number of sources; citations outside 1..count are marked as unverified. */
  sourceCount: number
  /** Prefix for source element ids, so citations can link to them. */
  sourceIdPrefix: string
}

function inline(text: string, options: MarkdownOptions): string {
  return escapeHtml(text)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*\w])\*([^*\s][^*]*)\*(?!\w)/g, '$1<em>$2</em>')
    .replace(/\[(\d+(?:\s*,\s*\d+)*)\]/g, (_, group: string) =>
      group
        .split(',')
        .map(part => {
          const n = Number(part.trim())
          return n >= 1 && n <= options.sourceCount
            ? `<a class="citation" href="#${options.sourceIdPrefix}${n}" data-citation="${n}">[${n}]</a>`
            : `<span class="citation unverified" title="No source has this number">[${n}]</span>`
        })
        .join(''),
    )
}

export function renderMarkdown(text: string, options: MarkdownOptions): string {
  const blocks = text
    .replace(/\r\n/g, '\n')
    .trim()
    .split(/\n{2,}/)
  return blocks
    .filter(block => block.trim() !== '')
    .map(block => {
      const lines = block.split('\n')
      if (lines.every(line => /^\s*[-*]\s+/.test(line))) {
        return `<ul>${lines.map(line => `<li>${inline(line.replace(/^\s*[-*]\s+/, ''), options)}</li>`).join('')}</ul>`
      }
      if (lines.every(line => /^\s*\d+[.)]\s+/.test(line))) {
        return `<ol>${lines.map(line => `<li>${inline(line.replace(/^\s*\d+[.)]\s+/, ''), options)}</li>`).join('')}</ol>`
      }
      return `<p>${lines.map(line => inline(line, options)).join('<br>')}</p>`
    })
    .join('')
}
