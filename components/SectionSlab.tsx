'use client'

import type { Heading, Section, Worry } from '@/lib/outline/types'

export function SectionSlab({
  section,
  index,
  total,
  heading,
  attachable,
  trayOpen,
  onToggleTray,
  onAssign,
  onNudge,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDropOn,
  dragging,
  over,
}: {
  section: Section
  index: number
  total: number
  heading?: Heading
  /** Worries that are not already sitting in this section. */
  attachable: Worry[]
  trayOpen: boolean
  onToggleTray: () => void
  onAssign: (worryId: string, slotId: string) => void
  onNudge: (id: string, direction: -1 | 1) => void
  onDragStart: (id: string) => void
  onDragEnd: () => void
  onDragOver: (id: string) => void
  onDropOn: (id: string) => void
  dragging: boolean
  over: boolean
}) {
  const own = section.kind === 'objection'
  const level = section.level === 1 ? 'H1' : 'H2'

  return (
    <div
      className="slab"
      data-kind={section.kind}
      data-over={over}
      data-dragging={dragging}
      onDragOver={(event) => {
        event.preventDefault()
        onDragOver(section.id)
      }}
      onDrop={(event) => {
        event.preventDefault()
        onDropOn(section.id)
      }}
    >
      <button
        type="button"
        className="handle"
        draggable
        aria-label={`Move ${section.role}. Position ${index + 1} of ${total}. Use the up and down arrow keys to move it.`}
        onDragStart={(event) => {
          event.dataTransfer.effectAllowed = 'move'
          event.dataTransfer.setData('text/plain', section.id)
          onDragStart(section.id)
        }}
        onDragEnd={onDragEnd}
        onKeyDown={(event) => {
          if (event.key === 'ArrowUp') {
            event.preventDefault()
            onNudge(section.id, -1)
          }
          if (event.key === 'ArrowDown') {
            event.preventDefault()
            onNudge(section.id, 1)
          }
        }}
      >
        <span aria-hidden="true">⠿</span>
      </button>

      <div className="slab-role">{section.role}</div>

      <div className="min-w-0 flex-1">
        <span className="step-number">{level}</span>
        <p className="slab-heading" data-level={section.level} data-blank={!heading}>
          {heading ? heading.heading : `${section.role} heading not written yet`}
        </p>
        <p className="slab-note mt-1.5 text-[13px] text-muted">{heading ? heading.note : section.job}</p>

        {own ? (
          <div className="slab-worries mt-2 flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              className="chip"
              aria-label={`Remove ${section.worries[0].label} and delete this section`}
              onClick={() => onAssign(section.worries[0].id, 'own')}
            >
              {section.worries[0].label} <span aria-hidden="true">×</span>
            </button>
          </div>
        ) : (
          <>
            <div className="slab-worries mt-2 flex flex-wrap items-center gap-1.5">
              {section.worries.map((worry) => (
                <button
                  key={worry.id}
                  type="button"
                  className="chip"
                  aria-label={`Remove ${worry.label} from ${section.role}`}
                  onClick={() => onAssign(worry.id, section.id)}
                >
                  {worry.label} <span aria-hidden="true">×</span>
                </button>
              ))}

              {attachable.length > 0 && (
                <button
                  type="button"
                  className="chip"
                  data-add="true"
                  aria-expanded={trayOpen}
                  onClick={onToggleTray}
                >
                  {trayOpen ? 'Close' : 'Handle a worry here'}
                </button>
              )}
            </div>

            {trayOpen && (
              <div className="tray mt-2">
                {attachable.map((worry) => (
                  <button
                    key={worry.id}
                    type="button"
                    className="tray-option"
                    onClick={() => onAssign(worry.id, section.id)}
                  >
                    {worry.label}
                    {worry.detail && <span>{worry.detail}</span>}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
