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
  return level === 1 ? '# ' : '## '
}

/** The outline as markdown, with heading levels intact. */
export function toMarkdown({ sections, headings, headingsOnly = false }: MarkdownInput): string {
  if (headingsOnly) {
    return sections.map((section) => hash(section.level) + headingText(section, headings)).join('\n\n') + '\n'
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
        return `${hash(section.level)}${headingText(section, headings)}\n\n${note}${handled}\n`
      })
      .join('\n') + ''
  )
}
