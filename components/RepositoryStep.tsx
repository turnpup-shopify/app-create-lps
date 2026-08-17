'use client'

import { useState } from 'react'

export type RepositoryStatus = 'loading' | 'ready' | 'failed'
export type RepositorySource = 'sheet' | 'paste' | null

export function RepositoryStep({
  status,
  source,
  message,
  sheet,
  counts,
  onRefresh,
  onReadPaste,
}: {
  status: RepositoryStatus
  source: RepositorySource
  message: string | null
  sheet: string | null
  counts: { products: number; claims: number; worries: number }
  onRefresh: () => void
  /** Returns an error message when the paste held nothing usable. */
  onReadPaste: (text: string) => string | null
}) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [pasteError, setPasteError] = useState<string | null>(null)

  const showPaste = open || status === 'failed'

  const loaded =
    source === 'sheet'
      ? 'Reading the sheet.'
      : source === 'paste'
        ? 'Reading the rows you pasted.'
        : 'Nothing loaded yet.'

  return (
    <section className="border-t border-rule pt-5 pb-1 first:border-t-0 first:pt-0">
      <span className="step-number">01</span>
      <h2 className="section-title mt-1">Repository status</h2>
      <p className="hint mt-1 mb-3.5">
        One sheet holds the products, the claims and the worries, with the columns type, product, label, detail and tags.
        The app reads it and never writes to it.
      </p>

      <div className="flex flex-wrap items-center gap-2.5">
        <span className="hint">
          {status === 'loading' ? 'Loading the sheet.' : loaded}
          {status === 'ready' &&
            ` ${counts.products} products, ${counts.claims} claims, ${counts.worries} worries.`}
        </span>
        <button className="ghost" type="button" onClick={onRefresh} disabled={status === 'loading'}>
          {status === 'loading' ? 'Loading' : 'Refresh the sheet'}
        </button>
        <button className="ghost" type="button" onClick={() => setOpen(!open)} aria-expanded={showPaste}>
          {showPaste ? 'Hide the paste box' : 'Paste rows instead'}
        </button>
      </div>

      {message && (
        <div className="note-panel mt-3">
          <p>{message}</p>
          {sheet && (
            <p className="mt-1.5 font-mono text-[11.5px] break-all text-muted">{sheet}</p>
          )}
        </div>
      )}

      {showPaste && (
        <div className="mt-3">
          <label className="label mb-1.5 block" htmlFor="paste-rows">
            Paste the CSV including the header row
          </label>
          <textarea
            id="paste-rows"
            className="field font-mono text-[12.5px]"
            rows={5}
            value={text}
            onChange={(event) => setText(event.target.value)}
          />
          {pasteError && <p className="hint mt-1.5">{pasteError}</p>}
          <div className="mt-2">
            <button
              className="ghost"
              type="button"
              onClick={() => {
                const failed = onReadPaste(text)
                setPasteError(failed)
                if (!failed) setOpen(false)
              }}
            >
              Read pasted rows
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
