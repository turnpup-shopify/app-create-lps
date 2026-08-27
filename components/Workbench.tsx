'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  RepositoryStep,
  type RepositoryLayout,
  type RepositorySource,
  type RepositoryStatus,
} from './RepositoryStep'
import { SectionWire } from './Wireframe'
import { SlotDetail, type SlotAssignment } from './SlotSlab'
import {
  ARCHETYPE_LIST,
  findArchetype,
  numberedClaimSlots,
  visibleSlots,
  type ArchetypeId,
} from '@/lib/outline/archetypes'
import {
  missingIds,
  resolveBrief,
  selectedClaims,
  selectedWorries,
  toHeadingBrief,
  type Brief,
} from '@/lib/outline/brief'
import { DEFAULT_FRAMEWORK, type Framework, type FrameworkSources } from '@/lib/outline/framework'
import { driftCount, missingHeadings, signatures, type Signatures } from '@/lib/outline/drift'
import {
  ownSectionId,
  unassignWorry,
  validSlotIds,
} from '@/lib/outline/placement'
import { buildStructure, sectionIds } from '@/lib/outline/structure'
import { reconcileCopy, type WrittenCopy } from '@/lib/outline/copy'
import type { BriefReference } from '@/lib/outline/brief'
import { emptyRepository, type Claim, type Headings, type Repository, type Worry } from '@/lib/outline/types'
import type { TabProblem } from '@/lib/repository/framework-tabs'
import { claimsInScope, parseRepositoryCsv, worriesInScope } from '@/lib/repository/parse'

const NO_PASTE = 'Nothing usable in that paste. Include the header row and at least one product row.'
const HEADINGS_FAILED = 'The headings could not be written just now. The structure below is still correct.'
const SAVE_FAILED = 'The outline could not be saved. Try again in a moment.'

function toggle(list: string[], id: string): string[] {
  return list.includes(id) ? list.filter((item) => item !== id) : [...list, id]
}

/* ------------------------------------------------------------------ */
/* Strength / severity bar                                             */
/* ------------------------------------------------------------------ */

function StrengthBar({ value, max = 5, variant = 'claim' }: { value: number; max?: number; variant?: 'claim' | 'objection' }) {
  return (
    <span className={`strength-bar ${variant === 'objection' ? 'severity-bar' : ''}`}>
      {Array.from({ length: max }, (_, i) => (
        <span key={i} data-filled={i < value ? 'true' : undefined} />
      ))}
    </span>
  )
}

/* ------------------------------------------------------------------ */
/* Validation helpers                                                  */
/* ------------------------------------------------------------------ */

interface Flag {
  level: 'err' | 'warn'
  title: string
  message: string
}

function buildFlags(
  archetype: ReturnType<typeof findArchetype>,
  pickedClaims: Claim[],
  pickedWorries: Worry[],
  slotAssignments: SlotAssignment[],
  controllingIdea: string,
  productCount: number,
): Flag[] {
  const flags: Flag[] = []

  if (pickedClaims.length === 0 && productCount > 0) {
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

  const numSlots = numberedClaimSlots(archetype)
  if (pickedClaims.length > 0 && pickedClaims.length < numSlots) {
    const empty = numSlots - pickedClaims.length
    flags.push({
      level: 'warn',
      title: 'Unfilled slots',
      message: `${empty} numbered slot${empty > 1 ? 's' : ''} will be empty or disabled.`,
    })
  }

  // Unanswered objection check (the highest value output per 04-outline-logic.md)
  for (const worry of pickedWorries) {
    const answered = pickedClaims.some((c) =>
      c.kills_objection.includes(worry.id),
    )
    if (!answered) {
      flags.push({
        level: 'warn',
        title: `Unanswered: "${worry.label.slice(0, 40)}${worry.label.length > 40 ? '...' : ''}"`,
        message: 'No selected claim lists this objection in kills_objection.',
      })
    }
  }

  if (pickedWorries.length > 0 && pickedClaims.length > 0 && pickedWorries.length > pickedClaims.length) {
    flags.push({
      level: 'warn',
      title: 'Defensive page',
      message: 'More objections selected than claims. The page argues more than it sells.',
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

  // Controlling idea vs hero claim word overlap
  if (controllingIdea.trim() && pickedClaims.length > 0) {
    const ideaWords = new Set(controllingIdea.toLowerCase().split(/\s+/).filter((w) => w.length > 3))
    const heroLabel = pickedClaims[0].label.toLowerCase()
    const heroWords = new Set(heroLabel.split(/\s+/).filter((w) => w.length > 3))
    const overlap = [...ideaWords].filter((w) => heroWords.has(w))
    if (ideaWords.size > 0 && overlap.length === 0) {
      flags.push({
        level: 'warn',
        title: 'Idea and hero disagree',
        message: 'The controlling idea shares no significant words with the hero claim. One of the two may be wrong.',
      })
    }
  }

  return flags
}

/* ------------------------------------------------------------------ */
/* Main component                                                      */
/* ------------------------------------------------------------------ */

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
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null)
  const [setupOpen, setSetupOpen] = useState(true)
  const [objectionsOpen, setObjectionsOpen] = useState(false)
  const [showIneligible, setShowIneligible] = useState(false)
  const [warningsOpen, setWarningsOpen] = useState(false)
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
      if (body.framework) setFramework(body.framework as Framework)
      if (body.sources) setSources(body.sources as FrameworkSources)
      setProblems(Array.isArray(body.problems) ? body.problems : [])
      if (!response.ok) {
        setStatus('failed')
        setRepoMessage(body.error ?? 'The sheet could not be read. Paste the rows below instead.')
        setSheet(body.sheet ?? null)
        return
      }
      setRepository({
        products: body.products,
        claims: body.claims,
        worries: body.worries,
        assets: body.assets ?? [],
      })
      setSource('sheet')
      setSheet(body.sheet ?? null)
      setLayout(body.layout === 'tabs' || body.layout === 'single' ? body.layout : null)
      setStatus('ready')
    } catch {
      setStatus('failed')
      setRepoMessage('The sheet could not be reached. Check the connection, or paste the rows below.')
    }
  }, [])

  useEffect(() => { void load(false) }, [load])

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
      } catch {
        // Reference pages are an aid, not required.
      }
    })()
    return () => { cancelled = true }
  }, [])

  const readPaste = useCallback((text: string): string | null => {
    const parsed = parseRepositoryCsv(text)
    if (parsed.products.length === 0 && parsed.claims.length === 0 && parsed.worries.length === 0) {
      return NO_PASTE
    }
    setRepository({ products: parsed.products, claims: parsed.claims, worries: parsed.worries, assets: [] })
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
  const spineId = resolved.spine.id

  const archetype = useMemo(() => findArchetype(brief.archetype), [brief.archetype])

  // Filter claims by product scope
  const scopedClaims = useMemo(() => claimsInScope(repository, brief.products), [repository, brief.products])
  const scopedWorries = useMemo(() => worriesInScope(repository, brief.products), [repository, brief.products])

  // Filter claims by awareness stage (per 04-outline-logic.md rule 2)
  const eligibleClaims = useMemo(() => {
    return scopedClaims.filter((c) => {
      if (!c.awareness || c.awareness.length === 0) return true
      return c.awareness.includes(brief.awareness)
    }).filter((c) => {
      if (archetype.reasonOnly && c.scope !== 'reason') return false
      return true
    })
  }, [scopedClaims, brief.awareness, archetype.reasonOnly])

  const ineligibleClaims = useMemo(() => {
    return scopedClaims.filter((c) => !eligibleClaims.some((e) => e.id === c.id))
  }, [scopedClaims, eligibleClaims])

  const pickedClaims = useMemo(() => {
    const selected = selectedClaims(brief, repository)
    // Sort by strength descending, ties on id (per 04-outline-logic.md)
    return [...selected].sort((a, b) => {
      if (b.strength !== a.strength) return b.strength - a.strength
      return a.id.localeCompare(b.id)
    })
  }, [brief, repository])

  const pickedWorries = useMemo(() => {
    const selected = selectedWorries(brief, repository)
    return [...selected].sort((a, b) => {
      if (b.severity !== a.severity) return b.severity - a.severity
      return a.id.localeCompare(b.id)
    })
  }, [brief, repository])

  const gone = useMemo(() => missingIds(brief, repository), [brief, repository])

  /* ---------------------------------------------------------------- */
  /* Archetype slot assignment (04-outline-logic.md rules 3-8)         */
  /* ---------------------------------------------------------------- */

  const slotAssignments = useMemo((): SlotAssignment[] => {
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
        // Nothing to assign
      } else if (slot.content === 'top_claim') {
        if (claimPool.length) {
          const c = claimPool.shift()!
          entry.claimIds = [c.id]
          entry.claims = [c]
          entry.assetId = c.asset_id || ''
        }
      } else if (slot.content === 'claim' && (slot.kind === 'numbered' || slot.kind === 'single')) {
        if (claimPool.length) {
          const c = claimPool.shift()!
          entry.claimIds = [c.id]
          entry.claims = [c]
          entry.assetId = c.asset_id || ''
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
        if (pickedClaims.length) {
          entry.claimIds = [pickedClaims[0].id]
          entry.claims = [pickedClaims[0]]
        }
      }

      // Resolve asset from claim when not already set
      if (slot.needsMedia && !entry.assetId && entry.claims.length > 0) {
        const claimAsset = entry.claims.find((c) => c.asset_id)?.asset_id
        if (claimAsset) entry.assetId = claimAsset
      }

      assignments.push(entry)
    }

    return assignments
  }, [archetype, pickedClaims, pickedWorries])

  const archetypeFlags = useMemo(
    () => buildFlags(archetype, pickedClaims, pickedWorries, slotAssignments, brief.idea, brief.products.length),
    [archetype, pickedClaims, pickedWorries, slotAssignments, brief.idea, brief.products.length],
  )

  const errors = archetypeFlags.filter((f) => f.level === 'err')
  const warnings = archetypeFlags.filter((f) => f.level === 'warn')
  const hasErrors = errors.length > 0

  // Spine outline kept for copy generation
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

  const ready = brief.products.length > 0 && pickedClaims.length > 0

  const baselined = useRef(false)
  useEffect(() => {
    if (baselined.current) return
    if (Object.keys(initialHeadings).length === 0) { baselined.current = true; return }
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
    // Auto-collapse setup on first claim toggle (06-ui-spec.md)
    if (setupOpen && brief.claims.length === 0) setSetupOpen(false)
    setSelectedSlot(null)
    patch({ claims: toggle(brief.claims, id) })
  }

  function toggleWorry(id: string) {
    setSelectedSlot(null)
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

  /* ---------------------------------------------------------------- */
  /* Copy generation                                                   */
  /* ---------------------------------------------------------------- */

  async function writeHeadings() {
    setWorking(true)
    setHeadingError(null)
    setCorrections([])

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

  const visSlots = visibleSlots(archetype)

  return (
    <>
      {/* Repository loader above the three panes */}
      {status !== 'ready' && (
        <div className="mx-auto max-w-[600px] px-4 pt-8 pb-4">
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
        </div>
      )}

      <div className="three-pane">
        {/* ============================================================ */}
        {/* LEFT PANE: Pick                                               */}
        {/* ============================================================ */}
        <div className="pane-left">
          <Link className="label no-underline hover:text-ink" href="/">All outlines</Link>

          {/* ---- Setup (collapsible per 06-ui-spec.md) ---- */}
          <details open={setupOpen} onToggle={(e) => setSetupOpen((e.target as HTMLDetailsElement).open)}>
            <summary className="label cursor-pointer py-2 mt-3 border-b border-rule select-none">
              {setupOpen ? 'Setup' : (
                <span>{stage.label} &middot; {archetype.name}</span>
              )}
            </summary>

            <div className="mt-2.5 flex flex-col gap-2.5">
              {/* Product */}
              <div>
                <label className="label mb-1 block">Product</label>
                <div className="flex flex-wrap gap-1.5">
                  {repository.products.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className="pill"
                      data-on={brief.products.includes(p.id) ? 'true' : undefined}
                      onClick={() => toggleProduct(p.id)}
                    >
                      {p.label}
                    </button>
                  ))}
                  {repository.products.length === 0 && (
                    <p className="hint">No products loaded.</p>
                  )}
                </div>
              </div>

              {/* Awareness */}
              <div>
                <label className="label mb-1 block" htmlFor="awareness">Awareness stage</label>
                <select
                  id="awareness"
                  className="field"
                  value={stage.id}
                  onChange={(event) => {
                    patch({ awareness: event.target.value, spineOverride: '' })
                    setShowIneligible(false)
                  }}
                >
                  {framework.awareness.map((option) => (
                    <option key={option.id} value={option.id}>{option.label}</option>
                  ))}
                </select>
              </div>

              {/* Archetype */}
              <div>
                <label className="label mb-1 block" htmlFor="archetype">Archetype</label>
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
                    <option key={option.id} value={option.id}>{option.name}</option>
                  ))}
                </select>
              </div>

              {/* Controlling idea */}
              <div>
                <label className="label mb-1 block" htmlFor="idea">Controlling idea</label>
                <textarea
                  id="idea"
                  className="field"
                  rows={2}
                  placeholder="One sentence. The thesis of the page."
                  value={brief.idea}
                  onChange={(event) => patch({ idea: event.target.value })}
                />
              </div>
            </div>
          </details>

          {/* ---- Claims ---- */}
          <div className="mt-3">
            <p className="label py-1 border-b border-rule">
              Claims ({eligibleClaims.length})
            </p>
            <div className="mt-1">
              {eligibleClaims.length === 0 && brief.products.length > 0 && (
                <p className="hint py-2">No claims eligible for this product and awareness stage.</p>
              )}
              {eligibleClaims.length === 0 && brief.products.length === 0 && (
                <p className="hint py-2">Pick a product to see its claims.</p>
              )}
              {eligibleClaims.map((claim) => {
                const on = brief.claims.includes(claim.id)
                return (
                  <div
                    key={claim.id}
                    className="content-row"
                    data-on={on ? 'true' : undefined}
                    onClick={() => toggleClaim(claim.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleClaim(claim.id) } }}
                  >
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => toggleClaim(claim.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="mt-0.5 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="content-row-label text-[13px]">{claim.label}</span>
                        <StrengthBar value={claim.strength} />
                      </div>
                      {claim.detail && (
                        <p className="text-[11.5px] text-muted mt-0.5">{claim.detail}</p>
                      )}
                    </div>
                  </div>
                )
              })}

              {/* Ineligible claims (hidden, expandable per 06-ui-spec.md) */}
              {ineligibleClaims.length > 0 && (
                <div className="mt-1 border-t border-dashed border-rule pt-1">
                  <button
                    type="button"
                    className="label cursor-pointer text-muted hover:text-ink"
                    onClick={() => setShowIneligible(!showIneligible)}
                  >
                    {showIneligible ? 'Hide' : `${ineligibleClaims.length} claim${ineligibleClaims.length > 1 ? 's' : ''} not eligible here`}
                  </button>
                  {showIneligible && (
                    <div className="mt-1 opacity-60">
                      {ineligibleClaims.map((claim) => (
                        <div key={claim.id} className="py-1 text-[12px] text-muted border-b border-rule last:border-b-0">
                          <span>{claim.label}</span>
                          <span className="ml-2 font-mono text-[10px]">
                            {!claim.awareness?.includes(brief.awareness) && `not ${brief.awareness}`}
                            {archetype.reasonOnly && claim.scope !== 'reason' && ` scope: ${claim.scope}`}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ---- Objections (starts closed per 06-ui-spec.md) ---- */}
          <details open={objectionsOpen} onToggle={(e) => setObjectionsOpen((e.target as HTMLDetailsElement).open)} className="mt-3">
            <summary className="label cursor-pointer py-1 border-b border-rule select-none">
              Objections {pickedWorries.length > 0 && `(${pickedWorries.length} selected)`}
            </summary>
            <div className="mt-1">
              {scopedWorries.length === 0 && brief.products.length > 0 && (
                <p className="hint py-2">No objections for this product.</p>
              )}
              {scopedWorries.map((worry) => {
                const on = brief.worries.includes(worry.id)
                return (
                  <div
                    key={worry.id}
                    className="content-row"
                    data-on={on ? 'true' : undefined}
                    onClick={() => toggleWorry(worry.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleWorry(worry.id) } }}
                  >
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => toggleWorry(worry.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="mt-0.5 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="content-row-label text-[13px]">{worry.label}</span>
                        <StrengthBar value={worry.severity} variant="objection" />
                      </div>
                      {worry.category && (
                        <p className="text-[11.5px] text-muted mt-0.5">{worry.category}</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </details>

          {/* Repo info bar */}
          {status === 'ready' && source && (
            <div className="mt-4 flex items-center gap-2">
              <span className="font-mono text-[10px] text-muted">
                {repository.products.length}p {repository.claims.length}c {repository.worries.length}o
              </span>
              <button className="mini" type="button" onClick={() => void load(true)}>Refresh</button>
            </div>
          )}
        </div>

        {/* ============================================================ */}
        {/* CENTER PANE: See (the wireframe page)                         */}
        {/* ============================================================ */}
        <div className="pane-center bg-[var(--paper)]">
          {/* Page thesis */}
          {brief.idea.trim() && (
            <div className="text-center mb-4 pb-3 border-b border-rule">
              <p className="text-[13px] italic text-muted">{brief.idea}</p>
            </div>
          )}

          {!ready && (
            <div className="text-center py-12">
              <p className="label mb-1.5">No page to show</p>
              <p className="text-[13px] text-muted">Pick a product and select claims.</p>
            </div>
          )}

          {ready && (
            <div className="flex flex-col gap-2">
              {visSlots.map((slot, i) => {
                const assignment = slotAssignments.find((a) => a.slot.key === slot.key)
                const disabled = assignment ? !assignment.active : false
                const isSelected = selectedSlot !== null && slotAssignments[selectedSlot]?.slot.key === slot.key
                const slotIndex = slotAssignments.findIndex((a) => a.slot.key === slot.key)
                const needsImage = slot.needsMedia && assignment && !assignment.assetId && assignment.active && slot.content !== 'none'

                return (
                  <div
                    key={slot.key}
                    className="wire-block"
                    data-selected={isSelected ? 'true' : undefined}
                    data-disabled={disabled ? 'true' : undefined}
                    tabIndex={0}
                    onClick={() => setSelectedSlot(isSelected ? null : slotIndex)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedSlot(isSelected ? null : slotIndex) }
                    }}
                  >
                    <div className="flex items-start gap-2">
                      <span className="step-number shrink-0 w-5 text-right">{String(i + 1).padStart(2, '0')}</span>
                      <div className="min-w-0 flex-1">
                        <SectionWire sectionType={slot.sectionType} number={slot.number} />
                        <div className="flex items-center justify-between mt-1.5">
                          <span className="font-mono text-[9px] uppercase tracking-wider text-muted">{slot.role}</span>
                          {needsImage && (
                            <span className="font-mono text-[9px] bg-[var(--amber-bg)] text-[var(--amber)] px-1 py-0.5 rounded">
                              no image
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* ============================================================ */}
        {/* RIGHT PANE: Inspect                                           */}
        {/* ============================================================ */}
        <div className="pane-right">
          {/* Save bar */}
          <div className="flex flex-wrap items-end gap-2.5 mb-4 pb-3 border-b border-rule">
            <div className="min-w-0 flex-1 basis-[140px]">
              <label className="label mb-1 block" htmlFor="outline-name">Outline name</label>
              <input
                id="outline-name"
                ref={nameRef}
                className="field"
                placeholder="Name this outline"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </div>
            <button className="ghost" type="button" onClick={() => void save()} disabled={saving}>
              {saving ? 'Saving' : 'Save'}
            </button>
          </div>
          {saveMessage && <p className="hint mb-2">{saveMessage}</p>}

          {/* ---- Errors (always visible) ---- */}
          {errors.length > 0 && (
            <div className="mb-3 flex flex-col gap-1.5">
              {errors.map((flag, i) => (
                <div key={i} className="text-[13px] py-1.5 px-2.5 rounded" style={{ background: 'var(--rust-bg)', color: 'var(--rust)' }}>
                  <b className="font-semibold">{flag.title}.</b> {flag.message}
                </div>
              ))}
            </div>
          )}

          {/* ---- Warnings (collapsible, state persists) ---- */}
          {warnings.length > 0 && (
            <details open={warningsOpen} onToggle={(e) => setWarningsOpen((e.target as HTMLDetailsElement).open)} className="mb-3">
              <summary className="label cursor-pointer py-1 select-none" style={{ color: 'var(--amber)' }}>
                {warnings.length} warning{warnings.length > 1 ? 's' : ''}
              </summary>
              <div className="mt-1.5 flex flex-col gap-1.5">
                {warnings.map((flag, i) => (
                  <div key={i} className="text-[13px] py-1.5 px-2.5 rounded" style={{ background: 'var(--amber-bg)', color: 'var(--amber)' }}>
                    <b className="font-semibold">{flag.title}.</b> {flag.message}
                  </div>
                ))}
              </div>
            </details>
          )}

          {/* Clean signal */}
          {errors.length === 0 && warnings.length === 0 && ready && (
            <div className="text-[13px] py-1.5 px-2.5 rounded mb-3" style={{ background: 'var(--green-bg)', color: 'var(--green)' }}>
              <b className="font-semibold">Clean.</b> Nothing to fix. {visSlots.length} slots ready.
            </div>
          )}

          {/* ---- Section inspector ---- */}
          {selectedSlot !== null && slotAssignments[selectedSlot] && (
            <div className="border border-rule bg-white p-3.5 rounded mb-3">
              <h3 className="label mb-3">{slotAssignments[selectedSlot].slot.role}</h3>
              <SlotDetail assignment={slotAssignments[selectedSlot]} />
            </div>
          )}

          {!ready && (
            <div className="note-panel mt-3">
              <p className="label mb-1.5">Select content</p>
              <p className="text-[13.5px]">
                Pick a product and check claims on the left. The wireframe page appears in the centre, and validation flags appear here.
              </p>
            </div>
          )}

          {ready && headingError && <div className="note-panel mb-3">{headingError}</div>}

          {ready && (
            <div className="mt-3">
              <button
                className="button w-full"
                type="button"
                onClick={() => void writeHeadings()}
                disabled={working || hasErrors}
              >
                {working ? 'Writing copy' : 'Generate copy'}
              </button>
              {hasErrors && <p className="hint mt-1.5">Clear the errors above first.</p>}
            </div>
          )}

          {corrections.length > 0 && (
            <div className="note-panel mt-3">
              <p className="label mb-1.5">What was corrected</p>
              <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
                {corrections.map((line, index) => (
                  <li key={index} className="text-[13px]">{line}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Summary line */}
          {ready && (
            <p className="hint mt-3.5">
              {archetype.name}. {pickedClaims.length} claim{pickedClaims.length !== 1 ? 's' : ''}, {pickedWorries.length} objection{pickedWorries.length !== 1 ? 's' : ''}.
            </p>
          )}
        </div>
      </div>
    </>
  )
}
