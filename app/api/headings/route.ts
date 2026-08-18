import fs from 'node:fs/promises'
import path from 'node:path'
import Anthropic from '@anthropic-ai/sdk'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import { NextResponse } from 'next/server'
import { z } from 'zod'

/**
 * Writes the page. Headings and the body copy under them, in one call.
 *
 * One call rather than one per section, because the headings have to argue in
 * sequence and not repeat each other, and a per section call cannot see its
 * siblings.
 */

const MODEL = 'claude-opus-5'

/**
 * Sized for a page of prose. The old ceiling was 1500, which was right for one
 * short heading per section and truncates copy mid sentence.
 */
const MAX_TOKENS = 16000

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

/**
 * What the model must return. Structured outputs constrain this rather than
 * leaving it to a parse and a retry, so every field is present and typed.
 * Emptiness is expressed as an empty string, not as an absent key.
 */
const ItemSchema = z.object({
  heading: z.string(),
  body: z.string(),
})

const CopySchema = z.object({
  sections: z
    .array(
      z.object({
        id: z.string(),
        heading: z.string(),
        note: z.string(),
        body: z.string(),
        support: z.string(),
        cta: z.string(),
        eyebrow: z.string(),
        items: z.array(ItemSchema),
      }),
    )
    .min(1),
})

const NO_KEY = 'No Anthropic key is set, so the copy could not be written. The structure below is still correct.'

const UNWRITTEN =
  'The copy could not be written just now. The structure below is still correct, so try again in a moment.'

const UNREADABLE = 'That request could not be read, so nothing could be written.'

const NO_SLOTS = 'That request was missing the assembled sections, so nothing could be written.'

/** The prompt is read at request time so it can be edited without a deploy. */
async function readPrompt(): Promise<string> {
  return fs.readFile(path.join(process.cwd(), 'lib', 'prompts', 'copy.md'), 'utf8')
}

export async function POST(request: Request) {
  let brief: Record<string, unknown>
  try {
    const body = (await request.json()) as { brief?: unknown }
    const candidate = body?.brief
    if (!candidate || typeof candidate !== 'object' || !ShapeSchema.safeParse(candidate).success) {
      return NextResponse.json({ sections: [], error: NO_SLOTS }, { status: 400 })
    }
    brief = candidate as Record<string, unknown>
  } catch {
    return NextResponse.json({ sections: [], error: UNREADABLE }, { status: 400 })
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ sections: [], error: NO_KEY })
  }

  const rules = await readPrompt()
  const client = new Anthropic()

  // The rules are the same on every request and the brief is not, so the rules
  // go in a cached system block and the brief goes in the message. Rewriting a
  // page then reuses the prefix instead of paying for it again.
  try {
    const message = await client.messages.parse({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: [{ type: 'text', text: rules, cache_control: { type: 'ephemeral' } }],
      messages: [
        {
          role: 'user',
          content: `Write the page for this brief.\n\n\`\`\`json\n${JSON.stringify(brief, null, 2)}\n\`\`\`\n`,
        },
      ],
      output_config: { format: zodOutputFormat(CopySchema) },
    })

    // A refusal or an unparseable reply both leave the outline standing.
    if (message.stop_reason === 'refusal' || !message.parsed_output) {
      return NextResponse.json({ sections: [], error: UNWRITTEN })
    }

    return NextResponse.json({ sections: message.parsed_output.sections })
  } catch (error) {
    console.error('[copy] the pass failed', error)
    return NextResponse.json({ sections: [], error: UNWRITTEN })
  }
}
