/**
 * House style forbids hyphens, dashes, semicolons and colons in any heading or
 * note. The prompt says so and the model is good about it, but the acceptance
 * criterion is absolute, so enforce it on the way out too.
 */

const FORBIDDEN = [
  '-', // hyphen minus
  '‐', // hyphen
  '‑', // non breaking hyphen
  '‒', // figure dash
  '–', // en dash
  '—', // em dash
  '―', // horizontal bar
  '−', // minus sign
  '﹘', // small em dash
  '﹣', // small hyphen minus
  '－', // fullwidth hyphen minus
  ';', // semicolon
  '；', // fullwidth semicolon
  ':', // colon
  '：', // fullwidth colon
  '∶', // ratio
]

const FORBIDDEN_PATTERN = new RegExp(`[${FORBIDDEN.join('')}]`, 'g')

export function hasForbidden(text: string): boolean {
  return new RegExp(FORBIDDEN_PATTERN.source).test(text)
}

/**
 * Replace every forbidden mark with a space, then tidy the seams so the line
 * still reads as a sentence.
 */
export function scrub(text: string): string {
  return text
    .replace(FORBIDDEN_PATTERN, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\s+([.,!?])/g, '$1')
    .trim()
}
