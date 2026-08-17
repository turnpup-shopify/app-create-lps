import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { claimsInScope, inScope, parseRepositoryCsv, worriesInScope } from '@/lib/repository/parse'

const SAMPLE = fs.readFileSync(path.join(process.cwd(), 'sample', 'repository.csv'), 'utf8')

describe('parseRepositoryCsv', () => {
  it('reads products, claims and worries out of the sample sheet', () => {
    const parsed = parseRepositoryCsv(SAMPLE)
    expect(parsed.products.map((product) => product.id)).toEqual(['brass-pull', 'sleep-mat'])
    expect(parsed.claims.length).toBe(6)
    expect(parsed.worries.length).toBe(6)
  })

  it('uses the handle as the product id', () => {
    const parsed = parseRepositoryCsv('type,product,label\nproduct,widget,A widget\n')
    expect(parsed.products[0].id).toBe('widget')
  })

  it('accepts objection as an alias for worry', () => {
    const parsed = parseRepositoryCsv('type,product,label,detail,tags\nobjection,*,Too dear,We refund it,price\n')
    expect(parsed.worries).toHaveLength(1)
    expect(parsed.worries[0].tags).toBe('price')
  })

  it('ignores rows whose type is empty or unrecognised', () => {
    const parsed = parseRepositoryCsv('type,product,label\n,x,Nothing\nnonsense,x,Nothing\nclaim,x,Something\n')
    expect(parsed.claims).toHaveLength(1)
    expect(parsed.ignored).toBe(2)
  })

  it('ignores extra columns', () => {
    const parsed = parseRepositoryCsv('type,product,label,owner,notes\nclaim,x,Something,alex,later\n')
    expect(parsed.claims).toHaveLength(1)
    expect(parsed.claims[0].label).toBe('Something')
  })

  it('treats a blank product as every product', () => {
    const parsed = parseRepositoryCsv('type,product,label\nclaim,,Ships fast\n')
    expect(parsed.claims[0].product).toBe('*')
  })

  it('gives ids that survive a row being inserted above', () => {
    const before = parseRepositoryCsv('type,product,label\nclaim,x,First\nclaim,x,Second\n')
    const after = parseRepositoryCsv('type,product,label\nclaim,x,Inserted\nclaim,x,First\nclaim,x,Second\n')
    const find = (label: string, rows: typeof before.claims) => rows.find((row) => row.label === label)!.id
    expect(find('Second', before.claims)).toBe(find('Second', after.claims))
  })

  it('keeps duplicate labels distinct', () => {
    const parsed = parseRepositoryCsv('type,product,label\nclaim,x,Same\nclaim,x,Same\n')
    expect(parsed.claims[0].id).not.toBe(parsed.claims[1].id)
  })

  it('returns an empty repository for junk input rather than throwing', () => {
    expect(() => parseRepositoryCsv('')).not.toThrow()
    const parsed = parseRepositoryCsv('not a csv at all')
    expect(parsed.products).toHaveLength(0)
  })
})

describe('scope', () => {
  const parsed = parseRepositoryCsv(SAMPLE)

  it('shows only rows marked for every product when nothing is selected', () => {
    expect(claimsInScope(parsed, []).every((claim) => claim.product === '*')).toBe(true)
  })

  it('narrows to the selected product plus anything marked with a star', () => {
    const claims = claimsInScope(parsed, ['brass-pull'])
    expect(claims.every((claim) => claim.product === 'brass-pull' || claim.product === '*')).toBe(true)
    expect(claims.some((claim) => claim.product === 'brass-pull')).toBe(true)
    expect(claims.some((claim) => claim.product === '*')).toBe(true)
    expect(claims.some((claim) => claim.product === 'sleep-mat')).toBe(false)
  })

  it('widens as more products are selected', () => {
    const one = worriesInScope(parsed, ['brass-pull']).length
    const two = worriesInScope(parsed, ['brass-pull', 'sleep-mat']).length
    expect(two).toBeGreaterThan(one)
  })

  it('treats a blank product as in scope always', () => {
    expect(inScope({ product: '' }, [])).toBe(true)
    expect(inScope({ product: '*' }, ['anything'])).toBe(true)
    expect(inScope({ product: 'other' }, ['anything'])).toBe(false)
  })
})
