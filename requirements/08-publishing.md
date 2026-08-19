# 08. Publishing

> **Phase 3, and much smaller than originally scoped.**
>
> The Firstday landing page template is already metafield driven. See `07-section-audit.md`. There is no render layer to build, no `lp.content` metafield to define, and no case switch to write. All of that exists.
>
> Publishing a page means writing values into metafield keys that already render. That is a script, not a project.
>
> It still waits until phase 2 is done, but for a different reason than before. Not because it is expensive, because it is uninformative until the claims and arcs are proven.

---

## What actually needs building

| Task | Effort |
|---|---|
| Create the page with the landing template suffix | `pageCreate`, one mutation |
| Write each section's metafield key | `metafieldsSet`, one call with many entries |
| Handle the five hardcoded sections | Blocked on theme work, see `06` |

Nothing else. The earlier draft of this document described building a render system that Firstday already has.

---

## The one constraint on phase 2

**The phase 2 export should target Firstday's real metafield keys**, not a format of our own design.

That means the export is a map from metafield key to value, matching the shape each key already expects.

```json
{
  "section_temp_replo_hero": {
    "header": "...",
    "body": "...",
    "cta_copy": "...",
    "image": "gid://shopify/MediaImage/...",
    "rotating_badges": ["...", "..."]
  },
  "section_benefits": {
    "header": "...",
    "body": "...",
    "benefits": [
      { "icon": "...", "header": "...", "body": "..." }
    ]
  },
  "section_faq": {
    "list_of_faq_blocks": [
      { "question": "...", "answer": "..." }
    ]
  }
}
```

Get this shape right in phase 2 and phase 3 is a loop over the object calling `metafieldsSet`.

> The exact field types inside each key are not confirmed. Pulling the metaobject or metafield definitions from the store is the next concrete step, and it should happen before the export format is finalised.

---

## The open question that shapes everything

**Are metafield definitions fixed per template, or can new keys be added per page?**

If fixed, the number of times a role can appear is capped by how many keys exist for that section type. Two accordion keys means at most two accordion sections, ever. That becomes a hard constraint in the outline builder, stricter than any cap I invented.

If addable, the builder can create keys as needed and the constraint disappears.

This is entry 28c in `00-assumptions.md` and it blocks filling `arc_steps` properly.

---

## Stale page handling

Unchanged from the earlier draft and still worth building.

Keep an index of which pages used which claim ids. When a claim changes in the sheet, list the affected pages, review, and regenerate as a batch. Editing a claim should never silently rewrite live pages.

A tab in the sheet is enough of an index at this scale.

---

## Measurement

Instrument scroll depth and CTA clicks keyed to section type, metafield key, and the claim ids that fed it.

Because claims are shared, one that underperforms across nine pages is one sheet edit away from being fixed on all nine. That compounding is the actual return on this system.

