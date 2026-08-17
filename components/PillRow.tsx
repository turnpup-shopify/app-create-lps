'use client'

export interface PillItem {
  id: string
  label: string
  detail?: string
  tag?: string
}

export function PillRow({
  items,
  selected,
  onToggle,
  empty,
  missing = [],
}: {
  items: PillItem[]
  selected: string[]
  onToggle: (id: string) => void
  empty: string
  /** Ids the brief holds that the sheet no longer has. */
  missing?: string[]
}) {
  if (items.length === 0 && missing.length === 0) {
    return <p className="hint">{empty}</p>
  }

  return (
    <div>
      <div className="flex flex-wrap gap-[7px]">
        {items.map((item) => {
          const on = selected.includes(item.id)
          return (
            <button
              key={item.id}
              type="button"
              className="pill"
              data-on={on}
              aria-pressed={on}
              onClick={() => onToggle(item.id)}
            >
              {item.label}
              {item.detail && <small>{item.detail}</small>}
              {item.tag && <small className="label">{item.tag}</small>}
            </button>
          )
        })}

        {missing.map((id) => (
          <button
            key={id}
            type="button"
            className="pill"
            data-gone="true"
            aria-label={`Remove ${id}, which the sheet no longer has`}
            onClick={() => onToggle(id)}
          >
            {id}
            <small>Gone from the sheet</small>
          </button>
        ))}
      </div>

      {missing.length > 0 && (
        <p className="hint mt-2">
          Struck rows are still in this outline but the sheet no longer has them. Put them back in the sheet, or click to
          drop them.
        </p>
      )}
    </div>
  )
}
