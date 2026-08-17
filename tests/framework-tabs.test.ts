import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { DEFAULT_FRAMEWORK, DEFAULT_LATE_TAGS, findMechanic } from '@/lib/outline/framework'
import { buildStructure } from '@/lib/outline/structure'
import { assembleFramework, crossCheck, type FrameworkTabs } from '@/lib/repository/framework-tabs'
import { parseClaimsTab, parseProductsTab, parseWorriesTab } from '@/lib/repository/parse'
import { worry } from './helpers'

const tab = (name: string) => fs.readFileSync(path.join(process.cwd(), 'sample', 'tabs', `${name}.csv`), 'utf8')

const SAMPLE: FrameworkTabs = {
  awareness: tab('Awareness'),
  spines: tab('Spines'),
  slots: tab('Slots'),
  goals: tab('Goals'),
  sections: tab('Sections'),
  settings: tab('Settings'),
}

describe('the sample tabs', () => {
  it('reproduce the built in framework exactly', () => {
    const { framework, problems, sources } = assembleFramework(SAMPLE)
    expect(problems).toEqual([])
    expect(framework.awareness).toEqual(DEFAULT_FRAMEWORK.awareness)
    expect(framework.spines).toEqual(DEFAULT_FRAMEWORK.spines)
    expect(framework.goals).toEqual(DEFAULT_FRAMEWORK.goals)
    expect(framework.sections).toEqual(DEFAULT_FRAMEWORK.sections)
    expect(framework.lateTags).toEqual(DEFAULT_LATE_TAGS)
    expect(Object.values(sources).every((source) => source === 'sheet')).toBe(true)
  })

  it('build the same outline as the built in framework', () => {
    const { framework } = assembleFramework(SAMPLE)
    const input = { spine: 'pas', goal: 'buy', worries: [worry('w1', { tags: 'price' })], assignments: { w1: 'own' } }
    expect(buildStructure({ ...input, framework })).toEqual(buildStructure(input))
  })

  it('read the content tabs', () => {
    const products = parseProductsTab(tab('Products'))
    const claims = parseClaimsTab(tab('Claims'))
    const worries = parseWorriesTab(tab('Worries'))
    expect(products.map((product) => product.id)).toEqual(['brass-pull', 'sleep-mat'])
    expect(claims).toHaveLength(6)
    expect(worries).toHaveLength(6)
  })

  it('use the id column verbatim, so renaming a label is safe', () => {
    const before = parseClaimsTab('id,product,label,detail\nc-ages,brass-pull,Ages instead of chipping,x\n')
    const after = parseClaimsTab('id,product,label,detail\nc-ages,brass-pull,Ages rather than chipping,x\n')
    expect(before[0].id).toBe('c-ages')
    expect(after[0].id).toBe('c-ages')
  })

  it('fall back to a derived id when the id column is blank', () => {
    const claims = parseClaimsTab('id,product,label,detail\n,brass-pull,Ages instead of chipping,x\n')
    expect(claims[0].id).toBe('claim.brass.pull.ages.instead.of.chipping')
  })

  it('read answer on the worries tab, and detail from an older sheet', () => {
    expect(parseWorriesTab('id,label,answer\nw1,Too dear,We refund it\n')[0].detail).toBe('We refund it')
    expect(parseWorriesTab('id,label,detail\nw1,Too dear,We refund it\n')[0].detail).toBe('We refund it')
  })
})

describe('falling back per tab', () => {
  it('uses the built in framework when no tab arrives', () => {
    const { framework, sources, problems } = assembleFramework({})
    expect(framework).toEqual(DEFAULT_FRAMEWORK)
    expect(Object.values(sources).every((source) => source === 'built in')).toBe(true)
    expect(problems).toEqual([])
  })

  it('takes one slice from the sheet and leaves the rest built in', () => {
    const { framework, sources } = assembleFramework({
      goals: 'id,label,close job\nbuy,Buy it now,Ask for the sale and mean it.\n',
    })
    expect(sources.goals).toBe('sheet')
    expect(sources.spines).toBe('built in')
    expect(framework.goals).toEqual([{ id: 'buy', label: 'Buy it now', close: 'Ask for the sale and mean it.' }])
    expect(framework.spines).toEqual(DEFAULT_FRAMEWORK.spines)
  })

  it('lets the sheet add a spine the code has never heard of', () => {
    const { framework, problems } = assembleFramework({
      awareness: 'id,label,lead,why,spine\nskimmer,Skimmer,Lead with the proof,They trust nobody.,pastor\n',
      spines: 'id,name,note\npastor,Problem Amplify Story Transition Offer Response,For a long form pitch.\n',
      slots: 'spine,key,position,role,job\npastor,problem,1,Problem,Name it.\npastor,amplify,2,Amplify,Raise it.\n',
    })
    expect(problems).toEqual([])
    expect(framework.spines.map((spine) => spine.id)).toEqual(['pastor'])
    const sections = buildStructure({ spine: 'pastor', goal: 'buy', worries: [], assignments: {}, framework })
    expect(sections.map((section) => section.role)).toEqual(['Problem', 'Amplify', 'Proof', 'The offer', 'Close'])
  })

  it('lets the sheet retune a section job without touching the code', () => {
    const { framework } = assembleFramework({
      sections:
        'id,role,job\nproof,Receipts,Show the invoice.\noffer,The offer,x\nfaq,Questions,x\nclose,Close,\nown.early,Clears a worry,x\nown.late,Removes risk,x\n',
    })
    expect(findMechanic('proof', framework).role).toBe('Receipts')
    const sections = buildStructure({ spine: 'pas', goal: 'buy', worries: [], assignments: {}, framework })
    expect(sections.find((section) => section.id === 'proof')!.job).toBe('Show the invoice.')
  })

  it('lets the sheet change the late tag list', () => {
    const { framework } = assembleFramework({ settings: 'key,value\nlate tags,"trust, doubt"\n' })
    expect(framework.lateTags).toEqual(['trust', 'doubt'])
    const sections = buildStructure({
      spine: 'pas',
      goal: 'buy',
      worries: [worry('w1', { tags: 'trust' })],
      assignments: { w1: 'own' },
      framework,
    })
    const order = sections.map((section) => section.id)
    // trust is now late, so the own section sits after the offer
    expect(order.indexOf('offer')).toBeLessThan(order.indexOf('own-w1'))
  })

  // A Spines tab replaces the whole list, so it has to come with an Awareness
  // tab that points into it. These two supply one stage for that reason.
  const stageFor = (spine: string) => `id,label,lead,why,spine\nonly,Only,Lead with the pain,x,${spine}\n`

  it('sorts slots by position, not by row order', () => {
    const { framework, problems } = assembleFramework({
      awareness: stageFor('x'),
      spines: 'id,name,note\nx,Backwards,n\n',
      slots: 'spine,key,position,role,job\nx,second,2,Second,b\nx,first,1,First,a\n',
    })
    expect(problems).toEqual([])
    expect(framework.spines[0].slots.map((slot) => slot.key)).toEqual(['first', 'second'])
  })

  it('keeps sheet order for slots with no position', () => {
    const { framework, problems } = assembleFramework({
      awareness: stageFor('x'),
      spines: 'id,name,note\nx,In order,n\n',
      slots: 'spine,key,position,role,job\nx,one,,One,a\nx,two,,Two,b\n',
    })
    expect(problems).toEqual([])
    expect(framework.spines[0].slots.map((slot) => slot.key)).toEqual(['one', 'two'])
  })

  it('falls back when a new spine list leaves the built in stages pointing nowhere', () => {
    // Worth pinning down, because a writer who fills in Spines and not Awareness
    // will hit it. The whole framework falls back and the problem names the stage.
    const { framework, problems } = assembleFramework({
      spines: 'id,name,note\nx,Only mine,n\n',
      slots: 'spine,key,position,role,job\nx,one,1,One,a\n',
    })
    expect(framework).toEqual(DEFAULT_FRAMEWORK)
    expect(problems.some((problem) => problem.tab === 'Awareness' && problem.message.includes('does not have'))).toBe(
      true,
    )
  })
})

describe('when the sheet is wrong', () => {
  it('names the row that is missing a column', () => {
    const { problems } = assembleFramework({ goals: 'id,label,close job\nbuy,,Ask for the sale.\n' })
    expect(problems[0].tab).toBe('Goals')
    expect(problems[0].message).toContain('Row 2')
  })

  it('falls the whole framework back when a stage points at a missing spine', () => {
    const { framework, sources, problems } = assembleFramework({
      awareness: 'id,label,lead,why,spine\nskimmer,Skimmer,Lead with proof,x,nowhere\n',
    })
    expect(framework).toEqual(DEFAULT_FRAMEWORK)
    expect(Object.values(sources).every((source) => source === 'built in')).toBe(true)
    expect(problems.some((problem) => problem.message.includes('nowhere'))).toBe(true)
  })

  it('catches a spine with no slots', () => {
    const problems = crossCheck({
      ...DEFAULT_FRAMEWORK,
      spines: [{ id: 'empty', name: 'Empty', note: '', slots: [] }],
      awareness: [{ id: 'a', label: 'A', lead: 'L', why: '', spine: 'empty' }],
    })
    expect(problems.some((problem) => problem.message.includes('no slots'))).toBe(true)
  })

  it('catches two slots sharing a key, which would collapse two sections into one', () => {
    const problems = crossCheck({
      ...DEFAULT_FRAMEWORK,
      spines: [
        {
          id: 's',
          name: 'S',
          note: '',
          slots: [
            { key: 'same', role: 'One', job: '' },
            { key: 'same', role: 'Two', job: '' },
          ],
        },
      ],
      awareness: [{ id: 'a', label: 'A', lead: 'L', why: '', spine: 's' }],
    })
    expect(problems.some((problem) => problem.message.includes('repeats the key'))).toBe(true)
  })

  it('catches a duplicate id', () => {
    const problems = crossCheck({
      ...DEFAULT_FRAMEWORK,
      goals: [
        { id: 'buy', label: 'One', close: 'x' },
        { id: 'buy', label: 'Two', close: 'y' },
      ],
    })
    expect(problems.some((problem) => problem.tab === 'Goals' && problem.message.includes('buy'))).toBe(true)
  })

  it('catches a Sections tab missing a required id', () => {
    const { framework, problems } = assembleFramework({ sections: 'id,role,job\nproof,Proof,x\n' })
    expect(framework).toEqual(DEFAULT_FRAMEWORK)
    expect(problems.some((problem) => problem.message.includes('own.late'))).toBe(true)
  })

  it('never returns a framework that fails its own cross check', () => {
    const wrecked: FrameworkTabs = {
      awareness: 'id,label,lead,why,spine\nx,X,L,w,ghost\n',
      spines: 'id,name,note\ny,Y,n\n',
      slots: 'spine,key,position,role,job\ny,k,1,K,j\n',
      goals: 'id,label,close job\ng,G,c\n',
      sections: 'id,role,job\nproof,P,j\n',
    }
    const { framework } = assembleFramework(wrecked)
    expect(crossCheck(framework)).toEqual([])
  })
})
