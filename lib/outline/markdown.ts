import type { Headings, Section } from './types'

export interface MarkdownInput {
  sections: Section[]
  headings: Headings
  /** Nothing but the H1 and the H2s. */
  headingsOnly?: boolean
}

function headingText(section: Section, headings: Headings): string {
  const written = headings[section.id]
  return written ? written.heading : `[${section.role}]`
}

function hash(level: number): string {
  if (level === 1) return '# '
  return level === 2 ? '## ' : '### '
}

/** The outline as markdown, with heading levels intact. */
export function toMarkdown({ sections, headings, headingsOnly = false }: MarkdownInput): string {
  if (headingsOnly) {
    // The skim test reads the heading tree, so the items belong in it.
    return (
      sections
        .flatMap((section) => [
          hash(section.level) + headingText(section, headings),
          ...(headings[section.id]?.items ?? []).map((item) => hash(3) + item.heading),
        ])
        .join('\n\n') + '\n'
    )
  }

  return (
    sections
      .map((section) => {
        const written = headings[section.id]
        const note = written ? written.note : section.job
        const handled =
          section.worries.length > 0
            ? `\nHandles ${section.worries.map((worry) => worry.label).join('. ')}.`
            : ''
        const body = written?.body ? `\n${written.body}\n` : ''
        const support = written?.support ? `\nSupported by ${written.support}\n` : ''
        const items = (written?.items ?? [])
          .map((item) => `\n${hash(3)}${item.heading}\n${item.body ? `\n${item.body}\n` : ''}`)
          .join('')
        const cta = written?.cta ? `\n${written.cta}\n` : ''
        return `${hash(section.level)}${headingText(section, headings)}\n\n${note}${handled}\n${body}${support}${items}${cta}`
      })
      .join('\n') + ''
  )
}
