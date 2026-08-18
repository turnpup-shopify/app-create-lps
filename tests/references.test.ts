import { describe, expect, it } from 'vitest'
import { extractReference, looksClientRendered, toPromptShape } from '@/lib/references/extract'

const page = (body: string, title = 'Brass pulls') =>
  `<!doctype html><html><head><title>${title}</title></head><body>${body}</body></html>`

describe('extractReference', () => {
  it('reads the heading tree in document order', () => {
    const html = page(`
      <h1>Stop replacing pulls every two years</h1>
      <p>Plated finishes flake within eighteen months.</p>
      <h2>Why plating fails</h2>
      <p>The plating is a coating, not the metal.</p>
      <h3>What we do instead</h3>
      <p>Solid brass all the way through.</p>
    `)
    const result = extractReference(html, 'https://example.com/pulls')
    expect(result.headings.map((h) => [h.level, h.heading])).toEqual([
      [1, 'Stop replacing pulls every two years'],
      [2, 'Why plating fails'],
      [3, 'What we do instead'],
    ])
  })

  it('gathers the copy under each heading and stops at the next one', () => {
    const html = page(`
      <h2>Why plating fails</h2>
      <p>The plating is a coating.</p>
      <p>It flakes at the edges first.</p>
      <h2>What we do instead</h2>
      <p>Solid brass.</p>
    `)
    const [first, second] = extractReference(html, 'u').headings
    expect(first.body).toBe('The plating is a coating. It flakes at the edges first.')
    expect(second.body).toBe('Solid brass.')
  })

  it('takes the title', () => {
    expect(extractReference(page('<h1>A</h1>', 'Cabinet hardware'), 'u').title).toBe('Cabinet hardware')
  })

  it('falls back to the title then the address for a label', () => {
    expect(extractReference(page('<h1>A</h1>', 'Cabinet hardware'), 'u').label).toBe('Cabinet hardware')
    expect(extractReference(page('<h1>A</h1>', ''), 'https://example.com').label).toBe('https://example.com')
    expect(extractReference(page('<h1>A</h1>'), 'u', 'Competitor A').label).toBe('Competitor A')
  })

  it('throws away scripts, styles and navigation, which teach nothing', () => {
    const html = page(`
      <nav><h2>Shop all</h2></nav>
      <script>const h2 = "not a heading"</script>
      <style>h2 { color: red }</style>
      <h2>Why plating fails</h2>
      <p>Real copy.</p>
      <footer><h2>Newsletter</h2></footer>
    `)
    const result = extractReference(html, 'u')
    expect(result.headings.map((h) => h.heading)).toEqual(['Why plating fails'])
  })

  it('does not let a script body leak into the copy', () => {
    const html = page('<h2>Real</h2><script>window.dataLayer = []</script><p>Copy.</p>')
    expect(extractReference(html, 'u').headings[0].body).toBe('Copy.')
  })

  it('collapses whitespace and non breaking spaces', () => {
    const html = page('<h2>  Why\n  plating\tfails  </h2><p>One.</p>')
    expect(extractReference(html, 'u').headings[0].heading).toBe('Why plating fails')
  })

  it('skips an empty heading rather than emitting a blank one', () => {
    const html = page('<h2></h2><h2>   </h2><h2>Real</h2><p>Copy.</p>')
    expect(extractReference(html, 'u').headings.map((h) => h.heading)).toEqual(['Real'])
  })

  it('truncates a very long paragraph rather than pasting the page', () => {
    const long = 'word '.repeat(400)
    const body = extractReference(page(`<h2>H</h2><p>${long}</p>`), 'u').headings[0].body
    expect(body.length).toBeLessThan(400)
    expect(body.endsWith('…')).toBe(true)
  })

  it('caps how many headings it keeps', () => {
    const many = Array.from({ length: 90 }, (_, at) => `<h2>Heading ${at}</h2><p>Copy.</p>`).join('')
    expect(extractReference(page(many), 'u').headings.length).toBeLessThanOrEqual(40)
  })

  it('ignores h4 and deeper, which are not part of the argument', () => {
    const html = page('<h2>Real</h2><h4>Fine print</h4><p>Copy.</p>')
    expect(extractReference(html, 'u').headings.map((h) => h.heading)).toEqual(['Real'])
  })

  it('survives malformed html', () => {
    expect(() => extractReference('<h1>Unclosed<p>and more', 'u')).not.toThrow()
    expect(extractReference('<h1>Unclosed<p>and more', 'u').headings[0].heading).toContain('Unclosed')
  })

  it('survives an empty document', () => {
    expect(extractReference('', 'u').headings).toEqual([])
  })
})

describe('looksClientRendered', () => {
  it('is true for a shell that renders in the browser', () => {
    const shell = page('<div id="root"></div>')
    expect(looksClientRendered(extractReference(shell, 'u'))).toBe(true)
  })

  it('is false for a page that came back with headings', () => {
    expect(looksClientRendered(extractReference(page('<h1>A</h1>'), 'u'))).toBe(false)
  })
})

describe('toPromptShape', () => {
  it('names the levels so the model sees the tree', () => {
    const html = page('<h1>A</h1><p>one</p><h2>B</h2><p>two</p>')
    const shape = toPromptShape(extractReference(html, 'u', 'Competitor A'))
    expect(shape.page).toBe('Competitor A')
    expect(shape.outline).toEqual([
      { level: 'H1', heading: 'A', copy: 'one' },
      { level: 'H2', heading: 'B', copy: 'two' },
    ])
  })
})
