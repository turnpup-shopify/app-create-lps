'use client'

import { useState } from 'react'
import type { FrameworkSources } from '@/lib/outline/framework'
import type { TabProblem } from '@/lib/repository/framework-tabs'

export type RepositoryStatus = 'loading' | 'ready' | 'failed'
export type RepositorySource = 'sheet' | 'paste' | null

const SLICE_LABELS: [keyof FrameworkSources, string][] = [
  ['awareness', 'stages'],
  ['spines', 'spines'],
  ['goals', 'goals'],
  ['sections', 'sections'],
  ['settings', 'settings'],
]

export function RepositoryStep({
  status,
  source,
  message,
  sheet,
  counts,
  sources,
  problems,
  onRefresh,
  onReadPaste,
}: {
  status: RepositoryStatus
  source: RepositorySource
  message: string | null
  sheet: string | null
  counts: { products: number; claims: number; worries: number }
  /** Which slice of the framework came from the sheet, once known. */
  sources: FrameworkSources | null
  problems: TabProblem[]
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

  const fromSheet = sources ? SLICE_LABELS.filter(([key]) => sources[key] === 'sheet') : []
  const fromBuiltIn = sources ? SLICE_LABELS.filter(([key]) => sources[key] === 'built in') : []

  return (
    <section className="border-t border-rule pt-5 pb-1 first:border-t-0 first:pt-0">
      <span className="step-number">01</span>
      <h2 className="section-title mt-1">Repository status</h2>
      <p className="hint mt-1 mb-3.5">
        One sheet holds the products, the claims and the worries, and may also hold the stages, the spines and the
        section jobs. The app reads it and never writes to it.
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

      {/* Which framework is in force. Silence here would be the confusing case. */}
      {sources && (
        <p className="hint mt-2">
          {fromSheet.length === 0
            ? problems.length > 0
              ? 'Using the built in framework. What the sheet holds could not be used, so read the list below.'
              : 'Using the built in framework. The sheet supplied no stages, spines or section jobs.'
            : fromBuiltIn.length === 0
              ? 'Framework from the sheet.'
              : `Framework from the sheet for ${fromSheet.map(([, label]) => label).join(', ')}. Built in for ${fromBuiltIn
                  .map(([, label]) => label)
                  .join(', ')}.`}
        </p>
      )}

      {message && (
        <div className="note-panel mt-3">
          <p>{message}</p>
          {sheet && <p className="mt-1.5 font-mono text-[11.5px] break-all text-muted">{sheet}</p>}
        </div>
      )}

      {problems.length > 0 && (
        <div className="note-panel mt-3">
          <p className="label mb-1.5">What the sheet got wrong</p>
          <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
            {problems.map((problem, index) => (
              <li key={`${problem.tab}-${index}`} className="text-[13px]">
                <span className="font-mono text-[11.5px] text-muted">{problem.tab}</span> {problem.message}
              </li>
            ))}
          </ul>
          <p className="hint mt-2">
            Anything the sheet could not supply fell back to the built in framework, so the outline still builds.
          </p>
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
          <p className="hint mt-1.5">
            A paste supplies products, claims and worries only, with a type column on every row. The framework stays as
            it is.
          </p>
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
