# CloudGreet Landing — Design Rules

The point of this doc: keep new sections from looking like quickly-made AI.
Every addition has to pass these rules before it ships.

## The "AI slop" tells we are NOT allowed to do
1. **No icon-in-a-pastel-rounded-square grids.** The 3-up / 4-up feature card
   with a little `sky-50` square and a Phosphor icon is the #1 generated-site
   tell. Banned.
2. **No blurred colored blobs behind sections.** The `absolute -inset-8
   bg-sky-100 blur-3xl` glow behind every grid. Banned (one subtle gradient in
   the hero only, nowhere else).
3. **Not everything centered.** Centered headline + centered subtitle on every
   single section is the rhythm of a template. Default to left-aligned,
   editorial blocks. Center sparingly, for deliberate moments only.
4. **No filler copy.** No "Powerful features for modern businesses." Every line
   says a real, specific thing or it gets cut.
5. **One accent color, used rarely.** Sky blue is for links and at most one mark
   per section. It is not a decoration to sprinkle.

## What we keep (the current page already does this well)
- **Palette:** warm off-white `#f6f5f1`, near-black `gray-900` text,
  `gray-500/400` for muted. Sky (`sky-500/600`) as the single accent.
- **Type:** Space Grotesk (`font-display`) for headlines —
  `font-medium tracking-tight leading-[1.05]`, big and confident. JetBrains
  Mono (`font-mono`) only for small uppercase eyebrow labels.
- **Surfaces:** white cards, hairline `border-gray-200`, generous rounding
  (`rounded-2xl`/`rounded-3xl`). Borders define edges, not shadows/glows.
- **Spacing:** lots of it. Sections breathe. `max-w-6xl` container,
  consistent vertical rhythm.

## How each of Uncle Jim's asks lands inside these rules
- **Ribbon nav** → keep the existing slim sticky bar; add 3 quiet text anchors
  (About · Who it's for · Demo). No colored ribbon, no heavy bar. Understated.
- **Story / intro** → ONE editorial text section. Left-aligned, large readable
  body type, maybe a single pull-quote line. No cards, no icons. It earns its
  place with words and whitespace, then points down to the ROI calculator.
- **Types of customers** → NOT an 8-icon card grid. A single typographic line or
  a clean inline list: "HVAC. Plumbing. Electrical. Roofing. Painting. And
  anyone whose business lives on the phone." Type does the work.
- **Photos** → at most one or two, and they must be treated intentionally
  (full-bleed or a consistent duotone), not little rounded thumbnails. If a
  photo doesn't clearly raise the quality, we cut it.

## Process
Build ONE section at a time. Anthony looks at it on the preview before the next
one starts. Quality bar over coverage. If a section can't clear these rules,
it doesn't ship.
