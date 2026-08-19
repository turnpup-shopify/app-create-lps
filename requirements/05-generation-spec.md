# 05. Copy Generation

The only part of the system with no deterministic rules. Everything here is about controlling variance rather than eliminating it.

---

## One call per section

Not one call per page. Three reasons.

**Retry granularity.** A bad section three gets regenerated without touching nine good ones.

**Prompt focus.** A single role, a single claim, a tight instruction. Page level prompts produce page level mush.

**Caching.** Hash the inputs. Same claim plus same role plus same voice returns the cached block instead of a new call and a new phrasing.

---

## What each call receives

| Input | From | Why it is there |
|---|---|---|
| `controlling_idea` | User typed it | Every section must support one thesis |
| `role` and `role_intent` | `arc_steps` | The rhetorical job of this position |
| `tone_note` | `arc_steps` | Voice instruction specific to this position |
| `section_type` | Outline | Determines length budget |
| `copy_target` | `arc_steps` | Exact slot names to return |
| Claim rows in full | `claims` | feature, benefit, emotion, proof, proof_source |
| Objection row in full | `objections` | objection, rebuttal, proof |
| `previous_section` | Outline | Headline of the section immediately before, so the opening does not echo it |
| `position` and `total` | Outline | A section at 3 of 11 behaves differently than 10 of 11 |
| Voice rules | `voice` tab | Brand level dos, avoids, and banned constructions |

`role_intent` and `tone_note` are the load bearing inputs. Without them the model has a role slug and nothing else, and `prove_benefit` does not tell it to pick one thing and drive it home rather than list five features.

---

## Prompt template

```
You are writing one section of a landing page. Not the whole page.

PAGE THESIS
{controlling_idea}

THIS SECTION'S JOB
{role_intent}

TONE FOR THIS POSITION
{tone_note}

POSITION
Section {position} of {total}. The section before this one opened with:
"{previous_headline}"
Do not echo its structure or its opening words.

SOURCE MATERIAL
Feature   {claim.feature}
Benefit   {claim.benefit}
Emotion   {claim.emotion}
Proof     {claim.proof} (source: {claim.proof_source})

[if objection]
The doubt   {objection.objection}
The answer  {objection.rebuttal}

VOICE RULES
{voice rules, one per line}

CONSTRAINTS
Every sentence must trace back to the source material above.
Do not introduce facts, numbers, or claims that are not listed.
Do not reference other sections of the page.
{length budget for section_type}

RETURN
JSON only. No preamble, no code fences. Keys exactly:
{copy_target as a key list}
```

---

## Length budgets by section type

| section_type | headline | body |
|---|---|---|
| `lp_hero` | under 10 words | under 25 words |
| `lp_split` | under 9 words | 30 to 55 words |
| `lp_grid` | under 6 words per card | under 20 words per card |
| `lp_stack` | under 9 words | 25 to 45 words |
| `lp_numbered` | under 8 words | 25 to 45 words |
| `lp_compare` | under 8 words | table rows only, under 5 words per cell |

Budgets go in the prompt, not in post processing. A model given a budget writes to it. A model given no budget writes 90 words and truncating it loses the ending.

---

## Output shape

```json
{
  "headline": "Absorbs without the conversion step",
  "body": "Roughly 40 percent of people carry a variant that blunts folate conversion. Methylated forms skip that step entirely. The dose on the label is the dose that reaches you.",
  "_source_refs": ["cl_02"],
  "_hash": "a91f...",
  "_status": "draft"
}
```

`_hash` is a digest of every input above. Store it. Regenerate only when it changes.

`_status` moves draft to approved on human review. Approved blocks are never regenerated automatically.

---

## The page level pass

**This is not optional.**

Nine sections written independently will repeat each other. Three will open with the same sentence shape. The per section generator has no memory across calls and cannot see it.

One additional call receives every generated section in order and does exactly two things.

**Dedupe.** Flag any phrase, statistic, or idea appearing in more than one section. Rewrite the weaker instance. The stronger instance is whichever section has the higher claim strength.

**Thesis check.** Read each section against the controlling idea and flag anything that does not support it.

Return the same section array with a `_rewritten` boolean and a `_flags` array per section. Do not let this pass restructure the page or change which claims are bound. Its only job is repetition and drift.

---

## Review interface

Show each section's generated copy **next to the claim rows it came from**.

This one layout choice does most of the quality work. When a line reads weak you can see immediately whether the copy is bad or the claim underneath it is bad. It is usually the claim, and fixing the claim fixes every future page that uses it.

Three actions per section. Approve. Regenerate. Edit the source claim.

The third action is the one that compounds.

---

## Failure modes and what causes them

| Symptom | Actual cause | Fix |
|---|---|---|
| Every section sounds the same | Missing `tone_note` variation across positions | Write distinct tone notes in `arc_steps` |
| Copy is vague | Claims are vague | Fix the claims, not the prompt |
| Model invents statistics | No `proof` on the bound claim and no constraint enforced | Keep the trace back constraint, populate proof |
| Sections repeat each other | Skipped the page pass | Run it |
| Emotion reads fake | Emotion column was written rather than found | Pull emotion verbatim from reviews |
| Same page regenerates differently each time | Not caching by hash | Cache |

The pattern is that most copy problems are data problems. The prompt is rarely the thing to tune.

---

## Cost control

Cache aggressively. A claim written once for `prove_benefit` at `product` awareness in your house voice is reusable across every page that binds it in that role at that stage.

In practice a mature library regenerates only the hero and the close per page, because those depend on the controlling idea, which is unique to each page. Everything else comes out of cache.
