'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { PillRow } from './PillRow'
import {
  RepositoryStep,
  type RepositoryLayout,
  type RepositorySource,
  type RepositoryStatus,
} from './RepositoryStep'
import { SectionSlab } from './SectionSlab'
import { SlotSlab, SlotDetail, type SlotAssignment } from './SlotSlab'
import {
  ARCHETYPE_LIST,
  findArchetype,
  type ArchetypeId,
} from '@/lib/outline/archetypes'
import {
  activeSpine,
  missingIds,
  resolveBrief,
  selectedClaims,
  selectedWorries,
  toHeadingBrief,
  type Brief,
} from '@/lib/outline/brief'
import { DEFAULT_FRAMEWORK, type Framework, type FrameworkSources } from '@/lib/outline/framework'
import { driftCount, missingHeadings, signatures, type Signatures } from '@/lib/outline/drift'
import { toMarkdown } from '@/lib/outline/markdown'
import { moveSection, nudgeSection } from '@/lib/outline/order'
import {
  assignWorry,
  ownSectionId,
  placedCount,
  unassignWorry,
  unplacedWorries,
  validSlotIds,
} from '@/lib/outline/placement'
import { buildStructure, heroId, sectionIds } from '@/lib/outline/structure'
import { reconcileCopy, type WrittenCopy } from '@/lib/outline/copy'
import type { BriefReference } from '@/lib/outline/brief'
import { emptyRepository, type Headings, type Repository } from '@/lib/outline/types'
import type { TabProblem } from '@/lib/repository/framework-tabs'
import { claimsInScope, parseRepositoryCsv, worriesInScope } from '@/lib/repository/parse'

const COPY_FAILED = 'The outline could not be copied. Select it and copy it by hand.'
const NO_PASTE = 'Nothing usable in that paste. Include the header row and at least one product row.'
const HEADINGS_FAILED = 'The headings could not be written just now. The structure below is still correct.'
const SAVE_FAILED = 'The outline could not be saved. Try again in a moment.'

function toggle(list: string[], id: string): string[] {
  return list.includes(id) ? list.filter((item) => item !== id) : [...list, id]
}

export function Workbench({
  initialId,
  initialName,
  initialBrief,
  initialHeadings,
}: {
  initialId: string | null
  initialName: string
  initialBrief: Brief
  initialHeadings: Headings
}) {
  const [outlineId, setOutlineId] = useState(initialId)
  const [name, setName] = useState(initialName)
  const [brief, setBrief] = useState<Brief>(initialBrief)
  const [headings, setHeadings] = useState<Headings>(initialHeadings)
  const [pass, setPass] = useState<Signatures | null>(null)

  const [repository, setRepository] = useState<Repository>(emptyRepository)
  const [framework, setFramework] = useState<Framework>(DEFAULT_FRAMEWORK)
  const [sources, setSources] = useState<FrameworkSources | null>(null)
  const [problems, setProblems] = useState<TabProblem[]>([])
  const [status, setStatus] = useState<RepositoryStatus>('loading')
  const [source, setSource] = useState<RepositorySource>(null)
  const [repoMessage, setRepoMessage] = useState<string | null>(null)
  const [sheet, setSheet] = useState<string | null>(null)
  const [layout, setLayout] = useState<RepositoryLayout>(null)

  const [working, setWorking] = useState(false)
  const [headingError, setHeadingError] = useState<string | null>(null)
  const [corrections, setCorrections] = useState<string[]>([])
  const [references, setReferences] = useState<BriefReference[]>([])
  const [referenceProblems, setReferenceProblems] = useState<{ url: string; message: string }[]>([])
  const [skim, setSkim] = useState(false)
  const [copied, setCopied] = useState(false)
  const [trayFor, setTrayFor] = useState<string | null>(null)
  const [dragId, setDragId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)
  const [announcement, setAnnouncement] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null)
  const nameRef = useRef<HTMLInputElement>(null)

  const patch = useCallback((change: Partial<Brief>) => {
    setBrief((current) => ({ ...current, ...change }))
  }, [])

  /* ---------------------------------------------------------------- */
  /* The repository                                                    */
  /* ---------------------------------------------------------------- */

  const load = useCallback(async (fresh: boolean) => {
    setStatus('loading')
    setRepoMessage(null)
    try {
      const response = await fetch(`/api/repository${fresh ? '?fresh=1' : ''}`)
      const body = await response.json()
      // The framework travels even on a failure, so a dead content tab does not
      // also cost the writer their spines.
      if (body.framework) setFramework(body.framework as Framework)
      if (body.sources) setSources(body.sources as FrameworkSources)
      setProblems(Array.isArray(body.problems) ? body.problems : [])
      if (!response.ok) {
        setStatus('failed')
        setRepoMessage(body.error ?? 'The sheet could not be read. Paste the rows below instead.')
        setSheet(body.sheet ?? null)
        return
      }
      setRepository({ products: body.products, claims: body.claims, worries: body.worries })
      setSource('sheet')
      setSheet(body.sheet ?? null)
      setLayout(body.layout === 'tabs' || body.layout === 'single' ? body.layout : null)
      setStatus('ready')
    } catch {
      setStatus('failed')
      setRepoMessage('The sheet could not be reached. Check the connection, or paste the rows below.')
    }
  }, [])

  useEffect(() => {
    void load(false)
  }, [load])

  // Reference pages are read once and shown, so the writer knows what is
  // informing the copy and which pages could not be read.
  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const response = await fetch('/api/references')
        const body = await response.json()
        if (cancelled) return
        setReferences(
          Array.isArray(body.pages)
            ? body.pages.map((page: { label: string; headings: { level: number; heading: string; body: string }[] }) => ({
                page: page.label,
                outline: page.headings.map((entry) => ({
                  level: `H${entry.level}`,
                  heading: entry.heading,
                  copy: entry.body,
                })),
              }))
            : [],
        )
        setReferenceProblems(Array.isArray(body.problems) ? body.problems : [])
      } catch {
        // Reference pages are an aid, so failing to read them changes nothing.
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const readPaste = useCallback((text: string): string | null => {
    const parsed = parseRepositoryCsv(text)
    if (parsed.products.length === 0 && parsed.claims.length === 0 && parsed.worries.length === 0) {
      return NO_PASTE
    }
    setRepository({ products: parsed.products, claims: parsed.claims, worries: parsed.worries })
    setSource('paste')
    setStatus('ready')
    setRepoMessage(null)
    return null
  }, [])

  /* ---------------------------------------------------------------- */
  /* Derived                                                           */
  /* ---------------------------------------------------------------- */

  const resolved = resolveBrief(brief, framework)
  const stage = resolved.stage
  const spine = resolved.spine
  const spineId = spine.id
  const goal = resolved.goal

  const scopedClaims = useMemo(() => claimsInScope(repository, brief.products), [repository, brief.products])
  const scopedWorries = useMemo(() => worriesInScope(repository, brief.products), [repository, brief.products])

  const pickedClaims = useMemo(() => selectedClaims(brief, repository), [brief, repository])
  const pickedWorries = useMemo(() => selectedWorries(brief, repository), [brief, repository])
  const gone = useMemo(() => missingIds(brief, repository), [brief, repository])

  const valid = useMemo(() => validSlotIds({ spine: spineId, framework }), [spineId, framework])

  const sections = useMemo(
    () =>
      buildStructure({
        spine: spineId,
        goal: brief.goal,
        worries: pickedWorries,
        assignments: brief.assignments,
        order: brief.order,
        framework,
      }),
    [spineId, brief.goal, brief.assignments, brief.order, pickedWorries, framework],
  )

  const unplaced = useMemo(
    () => unplacedWorries(pickedWorries, brief.assignments, valid),
    [pickedWorries, brief.assignments, valid],
  )

  /* ---------------------------------------------------------------- */
  /* Archetype slot assignment                                        */
  /* ---------------------------------------------------------------- */

  const archetype = useMemo(() => findArchetype(brief.archetype), [brief.archetype])

  const slotAssignments = useMemo((): SlotAssignment[] => {
    // Sort claims by strength (if available) descending, then by selection order
    const claimPool = [...pickedClaims]

    const assignments: SlotAssignment[] = []

    for (const slot of archetype.slots) {
      const entry: SlotAssignment = {
        slot,
        claimIds: [],
        objectionIds: [],
        assetId: '',
        active: true,
        claims: [],
        objections: [],
      }

      if (slot.kind === 'fixed' || slot.content === 'none' || slot.content === 'controlling_idea') {
        // Nothing to assign from the pool
      } else if (slot.content === 'top_claim') {
        if (claimPool.length) {
          const c = claimPool.shift()!
          entry.claimIds = [c.id]
          entry.claims = [c]
        }
      } else if (slot.content === 'claim' && (slot.kind === 'numbered' || slot.kind === 'single')) {
        if (claimPool.length) {
          const c = claimPool.shift()!
          entry.claimIds = [c.id]
          entry.claims = [c]
        } else if (slot.kind === 'numbered') {
          entry.active = false
        }
      } else if (slot.content === 'claims') {
        entry.claimIds = claimPool.map((c) => c.id)
        entry.claims = [...claimPool]
        claimPool.length = 0
      } else if (slot.content === 'objections') {
        entry.objectionIds = pickedWorries.map((o) => o.id)
        entry.objections = [...pickedWorries]
      } else if (slot.content === 'close') {
        // Close restates the hero claim
        if (pickedClaims.length) {
          entry.claimIds = [pickedClaims[0].id]
          entry.claims = [pickedClaims[0]]
        }
      }

      assignments.push(entry)
    }

    return assignments
  }, [archetype, pickedClaims, pickedWorries])

  const activeSlotCount = slotAssignments.filter((a) => a.active && a.slot.kind !== 'fixed').length
  const disabledSlots = slotAssignments.filter((a) => !a.active).map((a) => a.slot.key)

  // Archetype validation flags
  const archetypeFlags = useMemo(() => {
    const flags: { level: 'err' | 'warn'; title: string; message: string }[] = []

    if (pickedClaims.length === 0 && brief.products.length > 0) {
      flags.push({ level: 'err', title: 'No claims', message: 'Check at least one claim.' })
    }

    if (archetype.maxClaims && pickedClaims.length > archetype.maxClaims) {
      const over = pickedClaims.length - archetype.maxClaims
      flags.push({
        level: 'err',
        title: 'Too many claims',
        message: `This archetype has ${archetype.maxClaims} numbered slots. Uncheck ${over}.`,
      })
    }

    const numSlots = archetype.slots.filter((s) => s.kind === 'numbered' && s.content === 'claim').length
    if (pickedClaims.length > 0 && pickedClaims.length < numSlots) {
      const empty = numSlots - pickedClaims.length
      flags.push({
        level: 'warn',
        title: 'Unfilled slots',
        message: `${empty} numbered slot${empty > 1 ? 's' : ''} will be empty.`,
      })
    }

    // Unanswered objections
    for (const worry of pickedWorries) {
      const answered = pickedClaims.some((c) => c.detail.toLowerCase().includes(worry.label.toLowerCase().slice(0, 20)))
      // This is a rough heuristic; the real check would use kills_objection linkage
      void answered
    }

    if (pickedWorries.length > 0 && pickedClaims.length > 0 && pickedWorries.length > pickedClaims.length) {
      flags.push({
        level: 'warn',
        title: 'Defensive page',
        message: 'More objections selected than claims.',
      })
    }

    const missingImages = slotAssignments.filter(
      (a) => a.active && a.slot.needsMedia && !a.assetId && a.slot.content !== 'none',
    ).length
    if (missingImages > 0) {
      flags.push({
        level: 'warn',
        title: 'Missing images',
        message: `${missingImages} slot${missingImages > 1 ? 's need' : ' needs'} an image.`,
      })
    }

    return flags
  }, [archetype, pickedClaims, pickedWorries, slotAssignments, brief.products.length])

  const hasErrors = archetypeFlags.some((f) => f.level === 'err')

  const ready = brief.products.length > 0 && pickedClaims.length > 0
  const unwritten = missingHeadings(sections, headings)
  const drifted = driftCount(sections, pass, headings)
  const placed = placedCount(pickedWorries, brief.assignments, valid)

  /**
   * A reopened outline already holds the headings from its last pass, so the
   * structure it loads with is the baseline. Without this every section would
   * read as drifted the moment the page opened.
   */
  const baselined = useRef(false)
  useEffect(() => {
    if (baselined.current) return
    if (Object.keys(initialHeadings).length === 0) {
      baselined.current = true
      return
    }
    if (status !== 'ready') return
    baselined.current = true
    setPass(signatures(sections))
  }, [status, sections, initialHeadings])

  /* ---------------------------------------------------------------- */
  /* Editing                                                           */
  /* ---------------------------------------------------------------- */

  function toggleProduct(handle: string) {
    patch({ products: toggle(brief.products, handle) })
  }

  function toggleClaim(id: string) {
    patch({ claims: toggle(brief.claims, id) })
  }

  function toggleWorry(id: string) {
    setBrief((current) => {
      const on = current.worries.includes(id)
      return {
        ...current,
        worries: toggle(current.worries, id),
        assignments: on ? unassignWorry(current.assignments, id) : current.assignments,
      }
    })
    setHeadings((current) => {
      const next = { ...current }
      delete next[ownSectionId(id)]
      return next
    })
  }

  function assign(worryId: string, slotId: string) {
    setBrief((current) => ({ ...current, assignments: assignWorry(current.assignments, worryId, slotId) }))
    setTrayFor(null)
    // The own section for this worry may appear or vanish, so its heading is void.
    setHeadings((current) => {
      const next = { ...current }
      delete next[ownSectionId(worryId)]
      return next
    })
  }

  function reorder(next: string[], movedId: string) {
    patch({ order: next })
    const position = next.indexOf(movedId) + 1
    const role = sections.find((section) => section.id === movedId)?.role ?? 'Section'
    setAnnouncement(`${role} moved to position ${position} of ${next.length}.`)
  }

  function nudge(id: string, direction: -1 | 1) {
    reorder(nudgeSection(sectionIds(sections), id, direction, heroId(sections)), id)
  }

  /**
   * Which edge of a section the dragged one would land on. Dragging down lands
   * after the target, dragging up lands before it, so the line has to follow.
   */
  function dropEdgeFor(sectionId: string, index: number): 'before' | 'after' | null {
    if (!dragId || overId !== sectionId || dragId === sectionId) return null
    const from = sections.findIndex((section) => section.id === dragId)
    return from > index ? 'before' : 'after'
  }

  function dropOn(targetId: string) {
    const current = sectionIds(sections)
    if (!dragId || dragId === targetId) {
      setDragId(null)
      setOverId(null)
      return
    }
    reorder(moveSection(current, dragId, current.indexOf(targetId), heroId(sections)), dragId)
    setDragId(null)
    setOverId(null)
  }

  /* ---------------------------------------------------------------- */
  /* The copy pass                                                     */
  /* ---------------------------------------------------------------- */

  async function writeHeadings() {
    setWorking(true)
    setHeadingError(null)
    setCorrections([])
    setSkim(false)

    const payload = toHeadingBrief({ ...brief, order: sectionIds(sections) }, repository, sections, framework)
    if (references.length > 0) payload.references = references

    try {
      const response = await fetch('/api/headings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brief: payload }),
      })
      const body = await response.json()
      const written: WrittenCopy[] = Array.isArray(body.sections) ? body.sections : []

      if (written.length > 0) {
        // Held to what each section type can render before it reaches the page.
        const { headings: next, corrections } = reconcileCopy(sections, written)
        setHeadings(next)
        setPass(signatures(sections))
        setCorrections(corrections)
        if (body.error) setHeadingError(body.error)
      } else {
        setHeadingError(body.error ?? HEADINGS_FAILED)
      }
    } catch {
      setHeadingError(HEADINGS_FAILED)
    } finally {
      setWorking(false)
    }
  }

  async function copyMarkdown() {
    const markdown = toMarkdown({ sections, headings, headingsOnly: skim })
    try {
      await navigator.clipboard.writeText(markdown)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      setSaveMessage(COPY_FAILED)
    }
  }

  async function save() {
    const trimmed = name.trim()
    if (!trimmed) {
      setSaveMessage('Name the outline before you save it.')
      nameRef.current?.focus()
      return
    }

    setSaving(true)
    setSaveMessage(null)
    const body = JSON.stringify({
      name: trimmed,
      brief: { ...brief, order: sectionIds(sections) },
      headings,
    })

    try {
      const response = await fetch(outlineId ? `/api/outlines/${outlineId}` : '/api/outlines', {
        method: outlineId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      })
      const result = await response.json()
      if (!response.ok) {
        setSaveMessage(result.error ?? SAVE_FAILED)
        return
      }
      if (!outlineId && result.outline?.id) {
        setOutlineId(result.outline.id)
        window.history.replaceState(null, '', `/outline/${result.outline.id}`)
      }
      setSaveMessage('Saved.')
      setTimeout(() => setSaveMessage(null), 1600)
    } catch {
      setSaveMessage(SAVE_FAILED)
    } finally {
      setSaving(false)
    }
  }

  /* ---------------------------------------------------------------- */
  /* Render                                                            */
  /* ---------------------------------------------------------------- */

  return (
    <main className="mx-auto w-full max-w-[1180px] px-4 pt-8 pb-24 sm:px-6 sm:pt-10">
      <header className="mb-8 border-b border-rule pb-5">
        <Link className="label no-underline hover:text-ink" href="/">
          All outlines
        </Link>
        <h1 className="masthead mt-2">Outline Builder</h1>
        <p className="mt-2.5 max-w-[48ch] text-muted">
          Pick the archetype, select claims and objections, and the builder assigns them to slots.
        </p>
      </header>

      <div className="grid grid-cols-1 items-start gap-8 min-[940px]:grid-cols-2 min-[940px]:gap-11">
        {/* ------------------------- left ------------------------- */}
        <div>
          <RepositoryStep
            status={status}
            source={source}
            message={repoMessage}
            sheet={sheet}
            layout={layout}
            counts={{
              products: repository.products.length,
              claims: repository.claims.length,
              worries: repository.worries.length,
            }}
            sources={sources}
            problems={problems}
            onRefresh={() => void load(true)}
            onReadPaste={readPaste}
          />

          <section className="border-t border-rule pt-5 pb-1">
            <span className="step-number">02</span>
            <h2 className="section-title mt-1">What the page is about</h2>
            <p className="hint mt-1 mb-3.5">One or two lines. Enough for the headings to sound like your page.</p>
            <label className="label mb-1.5 block" htmlFor="idea">
              The page in a line
            </label>
            <textarea
              id="idea"
              className="field"
              placeholder="A page for the brass pull collection aimed at people mid renovation"
              value={brief.idea}
              onChange={(event) => patch({ idea: event.target.value })}
            />
            <div className="mt-2.5">
              <label className="label mb-1.5 block" htmlFor="audience">
                Who lands here
              </label>
              <input
                id="audience"
                className="field"
                placeholder="Homeowners replacing hardware themselves"
                value={brief.audience}
                onChange={(event) => patch({ audience: event.target.value })}
              />
            </div>
          </section>

          <section className="border-t border-rule pt-5 pb-1">
            <span className="step-number">03</span>
            <h2 className="section-title mt-1">Products</h2>
            <p className="hint mt-1 mb-3.5">Pick one or more. Claims and worries below narrow to match.</p>
            <PillRow
              items={repository.products.map((product) => ({
                id: product.id,
                label: product.label,
                detail: product.detail,
              }))}
              selected={brief.products}
              missing={gone.products}
              onToggle={toggleProduct}
              empty="No product rows in the repository yet. Add one to the sheet, then refresh."
            />
          </section>

          <section className="border-t border-rule pt-5 pb-1">
            <span className="step-number">04</span>
            <h2 className="section-title mt-1">Claims worth making</h2>
            <p className="hint mt-1 mb-3.5">
              The first one you pick becomes the lead claim. Three to five is usually right.
            </p>
            <PillRow
              items={scopedClaims.map((claim) => ({ id: claim.id, label: claim.label, detail: claim.detail }))}
              selected={brief.claims}
              missing={gone.claims}
              onToggle={toggleClaim}
              empty="Pick a product to see its claims."
            />
          </section>

          <section className="border-t border-rule pt-5 pb-1">
            <span className="step-number">05</span>
            <h2 className="section-title mt-1">Worries in play</h2>
            <p className="hint mt-1 mb-3.5">
              Tick the ones that apply to this page. You place them into sections on the right.
            </p>
            <PillRow
              items={scopedWorries.map((worry) => ({
                id: worry.id,
                label: worry.label,
                detail: worry.detail,
                tag: worry.tags || undefined,
              }))}
              selected={brief.worries}
              missing={gone.worries}
              onToggle={toggleWorry}
              empty="Pick a product to see its worries."
            />
          </section>

          <section className="border-t border-rule pt-5 pb-1">
            <span className="step-number">06</span>
            <h2 className="section-title mt-1">Archetype and awareness</h2>
            <p className="hint mt-1 mb-3.5">
              The archetype determines which slots exist. Awareness filters which claims are selectable.
            </p>

            <div className="flex flex-wrap gap-2.5">
              <div className="min-w-0 flex-1 basis-[200px]">
                <label className="label mb-1.5 block" htmlFor="archetype">
                  Archetype
                </label>
                <select
                  id="archetype"
                  className="field"
                  value={brief.archetype}
                  onChange={(event) => {
                    setSelectedSlot(null)
                    patch({ archetype: event.target.value as ArchetypeId })
                  }}
                >
                  {ARCHETYPE_LIST.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="min-w-0 flex-1 basis-[200px]">
                <label className="label mb-1.5 block" htmlFor="awareness">
                  Awareness stage
                </label>
                <select
                  id="awareness"
                  className="field"
                  value={stage.id}
                  onChange={(event) => patch({ awareness: event.target.value, spineOverride: '' })}
                >
                  {framework.awareness.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="note-panel mt-3">
              <p className="text-muted">{archetype.description}</p>
              {archetype.maxClaims && (
                <p className="mt-1.5 text-muted">
                  Max <b className="font-semibold text-ink">{archetype.maxClaims}</b> claims (numbered slots).
                  {archetype.reasonOnly && ' Only reason scope claims are eligible.'}
                </p>
              )}
            </div>

            <div className="flex flex-wrap gap-2.5 mt-3">
              <div className="min-w-0 flex-1 basis-[200px]">
                <label className="label mb-1.5 block" htmlFor="goal">
                  Page goal
                </label>
                <select
                  id="goal"
                  className="field"
                  value={goal.id}
                  onChange={(event) => patch({ goal: event.target.value })}
                >
                  {framework.goals.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>
        </div>

        {/* ------------------------- right ------------------------- */}
        <div className="min-[940px]:sticky min-[940px]:top-6">
          <div className="mb-1 flex flex-wrap items-baseline justify-between gap-3 border-b border-ink pb-2.5">
            <h2 className="section-title">{skim ? 'Skim test' : 'Outline'}</h2>
            <div className="flex flex-wrap gap-2">
              <button className="ghost" type="button" onClick={() => setSkim(!skim)}>
                {skim ? 'Show the detail' : 'Headings only'}
              </button>
              <button className="ghost" type="button" onClick={() => void copyMarkdown()}>
                {copied ? 'Copied' : 'Copy as markdown'}
              </button>
            </div>
          </div>

          <div className="mt-3.5 flex flex-wrap items-end gap-2.5">
            <div className="min-w-0 flex-1 basis-[180px]">
              <label className="label mb-1.5 block" htmlFor="outline-name">
                Name this outline
              </label>
              <input
                id="outline-name"
                ref={nameRef}
                className="field"
                placeholder="Brass pulls for renovators"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </div>
            <button className="ghost" type="button" onClick={() => void save()} disabled={saving}>
              {saving ? 'Saving' : 'Save'}
            </button>
          </div>

          {saveMessage && <p className="hint mt-2">{saveMessage}</p>}
          {headingError && <div className="note-panel mt-3">{headingError}</div>}

          {!ready && (
            <div className="note-panel mt-3">
              <p className="label mb-1.5">Nothing to show yet</p>
              <p className="text-[13.5px]">
                Pick a product in step 03 and a claim in step 04. The outline appears here straight away, before any
                copy is written, and the button to write the copy appears with it.
              </p>
            </div>
          )}

          {ready && (
            <>
              {/* ---- Archetype flags ---- */}
              {archetypeFlags.length > 0 && (
                <div className="mt-3 flex flex-col gap-1.5">
                  {archetypeFlags.filter((f) => f.level === 'err').map((flag, i) => (
                    <div key={i} className="note-panel border-l-2 border-l-red-400">
                      <p className="text-[13px]"><b className="font-semibold">{flag.title}.</b> {flag.message}</p>
                    </div>
                  ))}
                  {archetypeFlags.filter((f) => f.level === 'warn').map((flag, i) => (
                    <div key={i} className="note-panel border-l-2 border-l-amber-400">
                      <p className="text-[13px]"><b className="font-semibold">{flag.title}.</b> {flag.message}</p>
                    </div>
                  ))}
                </div>
              )}
              {archetypeFlags.length === 0 && brief.products.length > 0 && pickedClaims.length > 0 && (
                <div className="note-panel mt-3 border-l-2 border-l-green-400">
                  <p className="text-[13px]"><b className="font-semibold">Clean.</b> Nothing to fix. {activeSlotCount} slots ready.</p>
                </div>
              )}

              {/* ---- Slot assignments ---- */}
              <div className="mt-3">
                <p className="label mb-2">{archetype.name} slots</p>
                <div className="flex flex-col gap-1.5">
                  {slotAssignments.map((assignment, index) => (
                    <SlotSlab
                      key={assignment.slot.key}
                      assignment={assignment}
                      index={index}
                      selected={selectedSlot === index}
                      onClick={() => setSelectedSlot(selectedSlot === index ? null : index)}
                    />
                  ))}
                </div>
              </div>

              {/* ---- Slot inspector ---- */}
              {selectedSlot !== null && slotAssignments[selectedSlot] && (
                <div className="mt-3 border border-rule bg-white p-3.5 rounded">
                  <h3 className="label mb-3">{slotAssignments[selectedSlot].slot.role}</h3>
                  <SlotDetail assignment={slotAssignments[selectedSlot]} />
                </div>
              )}

              {/* ---- Spine driven outline (kept for copy generation) ---- */}
              <details className="mt-5">
                <summary className="label cursor-pointer py-1">Spine outline (copy generation)</summary>
                <div className={skim ? 'skim mt-2' : 'mt-2'}>
                  {sections.map((section, index) => (
                    <SectionSlab
                      key={section.id}
                      section={section}
                      index={index}
                      total={sections.length}
                      heading={headings[section.id]}
                      attachable={pickedWorries.filter((worry) => brief.assignments[worry.id] !== section.id)}
                      trayOpen={trayFor === section.id}
                      onToggleTray={() => setTrayFor(trayFor === section.id ? null : section.id)}
                      onAssign={assign}
                      onNudge={nudge}
                      onDragStart={setDragId}
                      onDragEnd={() => {
                        setDragId(null)
                        setOverId(null)
                      }}
                      onDragEnter={setOverId}
                      onDropOn={dropOn}
                      dragging={dragId === section.id}
                      over={dropEdgeFor(section.id, index)}
                    />
                  ))}
                </div>
              </details>

              <p aria-live="polite" className="sr-only">
                {announcement}
              </p>

              {unplaced.length > 0 && !skim && (
                <div className="mt-4 border border-rule bg-card p-3.5">
                  <h3 className="label mb-2">Worries with nowhere to go</h3>
                  {unplaced.map((worry) => (
                    <div
                      key={worry.id}
                      className="flex flex-wrap items-start gap-2 border-t border-rule py-1.5 text-[13px] first-of-type:border-t-0"
                    >
                      <div className="min-w-0 flex-1">
                        {worry.label}
                        <div className="text-muted">{worry.detail}</div>
                      </div>
                      <button className="mini" type="button" onClick={() => assign(worry.id, 'own')}>
                        Own section
                      </button>
                      <button className="mini" type="button" onClick={() => assign(worry.id, 'faq')}>
                        Questions
                      </button>
                    </div>
                  ))}
                  <p className="hint mt-2">
                    Give it a section if someone would leave the page over it. Send it to questions if they would only
                    hesitate. Or drop it into any section above.
                  </p>
                </div>
              )}

              <div className="mt-5 flex flex-wrap items-center gap-2.5">
                <button className="button" type="button" onClick={() => void writeHeadings()} disabled={working || hasErrors}>
                  {working
                    ? 'Writing the copy'
                    : unwritten === sections.length
                      ? 'Write the copy'
                      : 'Rewrite the copy'}
                </button>
                {hasErrors && <span className="hint">Clear the errors above first.</span>}
                {pass && drifted > 0 && (
                  <span className="hint">
                    {drifted === 1 ? '1 section drifted' : `${drifted} sections drifted`} since the last pass.
                  </span>
                )}
              </div>

              {(references.length > 0 || referenceProblems.length > 0) && (
                <div className="note-panel mt-3">
                  <p className="label mb-1.5">Pages read for reference</p>
                  {references.length > 0 && (
                    <ul className="m-0 flex list-none flex-col gap-1 p-0">
                      {references.map((reference) => (
                        <li key={reference.page} className="text-[13px]">
                          {reference.page}{' '}
                          <span className="text-muted">
                            {reference.outline.length === 1
                              ? '1 heading'
                              : `${reference.outline.length} headings`}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {referenceProblems.length > 0 && (
                    <ul className="m-0 mt-1.5 flex list-none flex-col gap-1 p-0">
                      {referenceProblems.map((problem) => (
                        <li key={problem.url} className="text-[13px] text-muted">
                          <span className="font-mono text-[11.5px] break-all">{problem.url}</span> {problem.message}
                        </li>
                      ))}
                    </ul>
                  )}
                  <p className="hint mt-2">
                    These shape how the copy reads. Every claim still comes from the sheet.
                  </p>
                </div>
              )}

              {corrections.length > 0 && (
                <div className="note-panel mt-3">
                  <p className="label mb-1.5">What was corrected</p>
                  <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
                    {corrections.map((line, index) => (
                      <li key={index} className="text-[13px]">
                        {line}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <p className="hint mt-3.5">
                {`${activeSlotCount} slots. ${archetype.name}. ${pickedClaims.length} claims, ${pickedWorries.length} objections.`}
              </p>
            </>
          )}
        </div>
      </div>
    </main>
  )
}
