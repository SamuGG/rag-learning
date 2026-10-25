import { describe, expect, test } from 'bun:test'
import { renderMarkdown } from '../../src/lib/markdown'

const render = (text: string, sourceCount = 2) => renderMarkdown(text, { sourceCount, sourceIdPrefix: 'm1-src-' })

describe('renderMarkdown', () => {
  test('escapes HTML before formatting', () => {
    expect(render('<script>alert("x")</script> & **bold**')).toBe(
      '<p>&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; <strong>bold</strong></p>',
    )
  })

  test('formats emphasis, code, paragraphs and line breaks', () => {
    expect(render('An *old* droid uses `torque`.\nSecond line.\n\nNew paragraph.')).toBe(
      '<p>An <em>old</em> droid uses <code>torque</code>.<br>Second line.</p><p>New paragraph.</p>',
    )
  })

  test('formats lists', () => {
    expect(render('- one\n- two')).toBe('<ul><li>one</li><li>two</li></ul>')
    expect(render('1. one\n2. two')).toBe('<ol><li>one</li><li>two</li></ol>')
  })

  test('links valid citations and flags unknown ones', () => {
    const html = render('Repaired [1][3], see [1, 2].')
    expect(html).toContain('<a class="citation" href="#m1-src-1" data-citation="1">[1]</a>')
    expect(html).toContain('<span class="citation unverified" title="No source has this number">[3]</span>')
    expect(html).toContain('href="#m1-src-2"')
  })

  test('cannot be tricked into raw HTML through a citation-like attribute', () => {
    expect(render('[1]" onmouseover="x')).not.toContain('" onmouseover')
  })
})
