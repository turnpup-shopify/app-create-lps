import fs from 'node:fs/promises'
import path from 'node:path'
import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { parseHeadingsReply } from '@/lib/outline/headings-reply'

const MODEL = 'claude-sonnet-4-6'
const MAX_TOKENS = 1500

const SlotSchema = z.object({
  id: z.string().min(1),
  level: z.string(),
  role: z.string(),
  job: z.string(),
  ownSection: z.boolean(),
  worries: z.array(z.object({ worry: z.string(), answer: z.string() })).default([]),
})

/** Validates the shape the prompt depends on. The brief is forwarded verbatim. */
const ShapeSchema = z.object({ slots: z.array(SlotSchema).min(1) })

const NO_KEY = 'No Anthropic key is set, so the headings could not be written. The structure below is still correct.'

const UNWRITTEN =
  'The headings could not be written just now. The structure below is still correct, so try again in a moment.'

const UNREADABLE = 'That request could not be read, so nothing could be written.'

const NO_SLOTS = 'That request was missing the assembled sections, so nothing could be written.'

/** The prompt is read at request time so it can be edited without a deploy. */
async function readPrompt(): Promise<string> {
  return fs.readFile(path.join(process.cwd(), 'lib', 'prompts', 'headings.md'), 'utf8')
}

function textOf(message: Anthropic.Message): string {
  return message.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('\n')
}

export async function POST(request: Request) {
  let brief: Record<string, unknown>
  try {
    const body = (await request.json()) as { brief?: unknown }
    const candidate = body?.brief
    if (!candidate || typeof candidate !== 'object' || !ShapeSchema.safeParse(candidate).success) {
      return NextResponse.json({ headings: [], error: NO_SLOTS }, { status: 400 })
    }
    brief = candidate as Record<string, unknown>
  } catch {
    return NextResponse.json({ headings: [], error: UNREADABLE }, { status: 400 })
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ headings: [], error: NO_KEY })
  }

  const template = await readPrompt()
  const json = JSON.stringify(brief, null, 2)
  // A replacer function keeps dollar signs in the brief from being read as
  // replacement patterns.
  const prompt = template.includes('{{BRIEF}}')
    ? template.replace('{{BRIEF}}', () => json)
    : `${template}\n\nBrief:\n\`\`\`json\n${json}\n\`\`\`\n`

  const slots = (brief as z.infer<typeof ShapeSchema>).slots
  const known = new Set(slots.map((slot) => slot.id))
  const client = new Anthropic()

  // One retry on a parse failure. A failed pass never wipes the outline.
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const message = await client.messages.create({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        messages: [{ role: 'user', content: prompt }],
      })

      if (message.stop_reason === 'refusal') continue

      const headings = parseHeadingsReply(textOf(message), known)
      if (!headings) continue

      return NextResponse.json({ headings })
    } catch (error) {
      // Fall through to the retry, then to the graceful failure below.
      console.error('[headings] attempt failed', error)
    }
  }

  return NextResponse.json({ headings: [], error: UNWRITTEN })
}
