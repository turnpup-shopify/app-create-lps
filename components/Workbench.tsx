'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { PillRow } from './PillRow'
import { RepositoryStep, type RepositorySource, type RepositoryStatus } from './RepositoryStep'
import { SectionSlab } from './SectionSlab'
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
import { buildStructure, sectionIds } from '@/lib/outline/structure'
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

  const [working, setWorking] = useState(false)
  const [headingError, setHeadingError] = useState<string | null>(null)
  const [skim, setSkim] = useState(false)
  const [copied, setCopied] = useState(false)
  const [trayFor, setTrayFor] = useState<string | null>(null)
  const [dragId, setDragId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)
  const [announcement, setAnnouncement] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
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
      setStatus('ready')
    } catch {
      setStatus('failed')
      setRepoMessage('The sheet could not be reached. Check the connection, or paste the rows below.')
    }
  }, [])

  useEffect(() => {
    void load(false)
  }, [load])

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
    reorder(nudgeSection(sectionIds(sections), id, direction), id)
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
    reorder(moveSection(current, dragId, current.indexOf(targetId)), dragId)
    setDragId(null)
    setOverId(null)
  }

  /* ---------------------------------------------------------------- */
  /* The heading pass                                                  */
  /* ---------------------------------------------------------------- */

  async function writeHeadings() {
    setWorking(true)
    setHeadingError(null)
    setSkim(false)

    const payload = toHeadingBrief({ ...brief, order: sectionIds(sections) }, repository, sections, framework)

    try {
      const response = await fetch('/api/headings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brief: payload }),
      })
      const body = await response.json()
      const written: { id: string; heading: string; note: string }[] = Array.isArray(body.headings)
        ? body.headings
        : []

      if (written.length > 0) {
        const next: Headings = {}
        for (const entry of written) next[entry.id] = { heading: entry.heading, note: entry.note }
        setHeadings(next)
        setPass(signatures(sections))
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
        <h1 className="masthead mt-2">Build the argument before you write a word</h1>
        <p className="mt-2.5 max-w-[48ch] text-muted">
          Pick the traffic, the claims and the worries. Then place every worry in the section that answers it.
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
            <h2 className="section-title mt-1">Traffic and goal</h2>
            <p className="hint mt-1 mb-3.5">
              The awareness stage decides the lead. This is the part people argue about, so it is settled here and shown
              below.
            </p>

            <div className="flex flex-wrap gap-2.5">
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

            <div className="note-panel mt-3">
              <b className="font-semibold">{stage.lead}</b>
              <p className="mt-1.5 text-muted">{stage.why}</p>
              <p className="mt-2 text-muted">
                Spine <b className="font-semibold text-ink">{spine.name}</b>. {spine.note}
              </p>
            </div>

            <div className="mt-3">
              <label className="label mb-1.5 block" htmlFor="spine">
                Override the spine
              </label>
              <select
                id="spine"
                className="field"
                value={resolved.override}
                onChange={(event) => patch({ spineOverride: event.target.value })}
              >
                <option value="">Keep the one the stage picked</option>
                {framework.spines.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </select>
              <p className="hint mt-1.5">
                Overriding changes the section stack and leaves the lead alone, because the lead follows from the traffic.
              </p>
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
            <p className="max-w-[40ch] py-6 text-[13.5px] text-muted">
              Pick a product and at least one claim. The section stack builds itself from the spine, then you place
              worries into the sections that answer them.
            </p>
          )}

          {ready && (
            <>
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
                <button className="button" type="button" onClick={() => void writeHeadings()} disabled={working}>
                  {working
                    ? 'Writing the headings'
                    : unwritten === sections.length
                      ? 'Write the headings'
                      : 'Rewrite the headings'}
                </button>
                {pass && drifted > 0 && (
                  <span className="hint">
                    {drifted === 1 ? '1 section drifted' : `${drifted} sections drifted`} since the last pass.
                  </span>
                )}
              </div>

              <p className="hint mt-3.5">
                {skim
                  ? 'Read only these. If it argues, the outline is done. If it reads like a table of contents, the headings are still labels.'
                  : `${sections.length} sections. ${placed} of ${pickedWorries.length} worries placed. Goal ${goal.label}.`}
              </p>
            </>
          )}
        </div>
      </div>
    </main>
  )
}
