# 06. Interface Spec

Reference implementation is `build/outline-builder.html`.

---

## Three panes

| Pane | Width | Job |
|---|---|---|
| Left | 340px | Pick. Setup, claims, objections |
| Centre | 316px | See. The page drawn as a wireframe |
| Right | Flexible | Inspect. Validation flags and section detail |

Collapses to two columns under 1120px with the inspector spanning full width, and to a single column under 760px.

---

## The centre pane is the point

The page renders as **wireframe blocks whose shape matches the layout**, not as a list of role labels.

| section_type | Wireframe |
|---|---|
| `lp_hero` | Two heavy bars, two light bars, a button pill |
| `lp_split` | Image box at 74px, four text bars beside it |
| `lp_grid` | Centred heading bar, three cards each with a box and two bars |
| `lp_stack` | Centred heading bar and two centred light bars |
| `lp_numbered` | Large number in the left margin, three bars beside it |
| `lp_compare` | Centred heading, a four by three table grid with a darker header row |

A list of `lp_split` cannot answer "is this a good page." A drawn column can, because rhythm and length are visual properties.

Position numbers hang in the left margin against a vertical rule. Numbering is legitimate here because page order is a real sequence, not decoration.

A section needing an image with none resolved shows a small `no image` marker in its top right corner.

---

## Progressive disclosure

Five things collapse, each on a different trigger.

| Element | Default | Trigger to collapse | Collapsed label |
|---|---|---|---|
| Setup | Open | The first time a claim or objection is toggled | `Problem aware · Problem first` |
| Objections | Closed | Manual | `2 selected` |
| Ineligible claims | Hidden | Always hidden | `3 claims not eligible here` |
| Warnings | Closed | Manual, state persists across rebuilds | `2 warnings` |
| Copy slots | Closed | Manual | `Copy slots · 4` |

**Setup collapses itself** because touching a claim means the user has moved past setup. Reopening is manual and it stays open until a claim is touched again.

**Objections start closed** because claims are the primary work and objections are the second pass. They should not compete for attention on load.

**Ineligible claims are hidden, not dimmed.** Dimming a third of a list leaves the noise on screen. The dashed counter line expands to show them along with the reason each one is ineligible.

**Warnings collapse into a count.** Errors always render in full because they block the build. Warning open state persists across rebuilds so the group does not slam shut on every keystroke while the controlling idea is being edited.

Anything the user acts on stays visible. Claims, the page, errors, the bound content, and the layout chips.

---

## Controls

### Setup

Product, awareness, arc, controlling idea.

The arc dropdown is filtered by awareness. When no arc serves the selected stage it says so rather than showing an empty select.

The controlling idea is live. It prints as the page thesis at the top of the centre pane, and it feeds the word overlap check against the hero claim.

### Claim rows

Feature on line one, benefit on line two in muted text. Strength as a five segment bar rather than a number, because bars are faster to scan.

Each row carries a small `hero` button that pins that claim to position one. Only shown on `strength_desc` arcs.

### Objection rows

Objection text on line one, category on line two. Severity as a bar.

### Inspector

Shows for the selected section. Job, tone note, bound content in full including proof and emotion, image status, layout chips, and collapsed copy slots.

Layout chips are clickable and override the rotation. A role with only one eligible layout shows the chip disabled plus a line telling the user to widen `eligible_sections` in `arc_steps`.

---

## State that persists across rebuilds

`build()` runs on every input change, so these must survive it.

| State | Reset by |
|---|---|
| Layout overrides | Arc change |
| Pinned hero claim | Product change |
| Show all ineligible | Product, awareness, or arc change |
| Warnings open | Never |
| Selected section | Any claim or objection toggle |

Selected section resets on claim toggles because the section at that index may now be a different section entirely.

---

## Accessibility floor

Sections are focusable with `tabindex` and respond to Enter and Space. Native `details` elements handle all disclosure, so keyboard and screen reader behavior comes free. Focus rings are visible on every interactive element. Colour is never the only signal, since every flag carries a glyph and a label.

---

## What the interface does not do

**No drag to reorder.** See `04-outline-logic.md`. Order belongs to the arc.

**No inline copy editing.** That is a separate review screen after generation.

**No page saving.** The prototype is stateless by design. Persistence is `07-shopify-integration.md`.
