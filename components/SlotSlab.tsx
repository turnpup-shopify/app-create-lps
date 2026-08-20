'use client'

import type { ArchetypeSlot } from '@/lib/outline/archetypes'
import type { Claim, Worry } from '@/lib/outline/types'

export interface SlotAssignment {
  slot: ArchetypeSlot
  claimIds: string[]
  objectionIds: string[]
  assetId: string
  active: boolean
  claims: Claim[]
  objections: Worry[]
}

export function SlotSlab({
  assignment,
  index,
  selected,
  onClick,
}: {
  assignment: SlotAssignment
  index: number
  selected: boolean
  onClick: () => void
}) {
  const { slot, active, claims, objections, assetId } = assignment
  if (slot.kind === 'fixed') return null

  const needsImage = slot.needsMedia && !assetId && active && slot.content !== 'none'
  const label = slot.kind === 'numbered' && slot.number
    ? `${String(slot.number).padStart(2, '0')}`
    : ''

  return (
    <button
      type="button"
      className={[
        'slab w-full text-left',
        selected ? 'ring-2 ring-[var(--accent,#3D3A9E)]' : '',
        !active ? 'opacity-35' : '',
      ].join(' ')}
      onClick={onClick}
      data-kind={slot.kind}
    >
      <div className="flex items-start gap-3">
        <span className="step-number shrink-0 w-6 text-right">{String(index + 1).padStart(2, '0')}</span>

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-semibold text-[13.5px]">{slot.role}</span>
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted">{slot.kind}</span>
          </div>

          <p className="font-mono text-[11px] text-muted mt-0.5">{slot.key}</p>

          {active && claims.length === 1 && (
            <p className="text-[13px] mt-1.5">{claims[0].label}</p>
          )}
          {active && claims.length > 1 && (
            <p className="text-[13px] mt-1.5 text-muted">{claims.length} claims bound</p>
          )}
          {active && objections.length > 0 && (
            <p className="text-[13px] mt-1.5 text-muted">{objections.length} objection{objections.length > 1 ? 's' : ''} bound</p>
          )}
          {active && slot.content === 'controlling_idea' && (
            <p className="text-[13px] mt-1.5 text-muted italic">Controlling idea</p>
          )}
          {!active && (
            <p className="text-[13px] mt-1.5 text-muted">No claim to fill this slot</p>
          )}

          {needsImage && (
            <span className="inline-block mt-1.5 font-mono text-[10px] bg-[var(--amber-bg,#FAF1E0)] text-[var(--amber,#8A5A12)] px-1.5 py-0.5 rounded">
              no image
            </span>
          )}
        </div>
      </div>
    </button>
  )
}

export function SlotDetail({ assignment }: { assignment: SlotAssignment }) {
  const { slot, claims, objections, assetId, active } = assignment

  const imgStatus = !slot.needsMedia
    ? 'Not required'
    : assetId || 'Needs one, no asset resolved'

  return (
    <div className="text-[13.5px]">
      <dl className="grid grid-cols-[88px_1fr] gap-x-3 gap-y-2 mb-4">
        <dt className="font-mono text-[10px] uppercase tracking-wider text-muted pt-0.5">Key</dt>
        <dd className="font-mono text-[12px]">{slot.key}</dd>

        <dt className="font-mono text-[10px] uppercase tracking-wider text-muted pt-0.5">Kind</dt>
        <dd>{slot.kind}</dd>

        <dt className="font-mono text-[10px] uppercase tracking-wider text-muted pt-0.5">Section</dt>
        <dd className="font-mono text-[12px]">{slot.sectionType}</dd>

        <dt className="font-mono text-[10px] uppercase tracking-wider text-muted pt-0.5">Job</dt>
        <dd>{slot.roleIntent}</dd>

        <dt className="font-mono text-[10px] uppercase tracking-wider text-muted pt-0.5">Image</dt>
        <dd className={!slot.needsMedia ? 'text-muted' : assetId ? '' : 'text-[var(--amber,#8A5A12)]'}>
          {imgStatus}
        </dd>

        <dt className="font-mono text-[10px] uppercase tracking-wider text-muted pt-0.5">Bound</dt>
        <dd>
          {claims.length === 0 && objections.length === 0 && slot.content !== 'controlling_idea' && (
            <span className="text-muted">Nothing bound</span>
          )}
          {slot.content === 'controlling_idea' && (
            <span className="italic">Controlling idea</span>
          )}
          {claims.map((c) => (
            <div key={c.id} className="mb-1.5 pb-1.5 border-b border-rule last:border-b-0">
              <p className="font-semibold">{c.label}</p>
              {c.detail && <p className="text-muted mt-0.5">{c.detail}</p>}
            </div>
          ))}
          {objections.map((o) => (
            <div key={o.id} className="mb-1.5 pb-1.5 border-b border-rule last:border-b-0">
              <p className="font-semibold">{o.label}</p>
              {o.detail && <p className="text-muted mt-0.5">{o.detail}</p>}
            </div>
          ))}
        </dd>
      </dl>

      <details className="text-[12px]">
        <summary className="font-mono text-[10px] uppercase tracking-wider text-muted cursor-pointer py-1">
          Fields ({slot.fields.length})
        </summary>
        <div className="mt-1.5 flex flex-wrap gap-1">
          {slot.fields.map((f) => (
            <span
              key={f}
              className="font-mono text-[10.5px] bg-[var(--accent-bg,#EDECF8)] text-[var(--accent,#3D3A9E)] px-1.5 py-0.5 rounded"
            >
              {f}
            </span>
          ))}
        </div>
      </details>
    </div>
  )
}
