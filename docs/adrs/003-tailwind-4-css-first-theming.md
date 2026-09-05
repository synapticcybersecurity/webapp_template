---
number: 003
title: Configure Tailwind 4 in CSS and express the palette in oklch
status: accepted
date: 2026-09-05
deciders: hhoffman
related: Epic #25, Story #26, Story #28
---

# ADR-003: Configure Tailwind 4 in CSS and express the palette in oklch

## Context

Upgrading Tailwind 3.4 → 4 forces a configuration decision. Tailwind 4 moves theme configuration into CSS (`@theme`) and replaces the PostCSS pipeline with a Vite plugin. A `tailwind.config.js` can still be loaded via `@config` for compatibility, so staying on the JS config was a real option.

The v3 setup here used the common indirection where CSS variables hold bare HSL channels and the config wraps them: `--background: 0 0% 100%` consumed as `hsl(var(--background))`. That pattern exists to make opacity modifiers work in v3 and is not needed in v4.

Separately, the dark palette was written but never activated (see Story #28), so this was the moment to decide what the palette should actually be rather than mechanically porting one that had never been looked at.

## Decision

We will configure Tailwind entirely in `apps/frontend/src/styles/globals.css`, with no `tailwind.config.js` and no PostCSS step. `@tailwindcss/vite` does the work.

Colors are declared as complete values, not bare channels:

```css
--background: oklch(1 0 0); /* not: 0 0% 100% */
```

with an `@theme inline` block bridging them to the `--color-*` names Tailwind reads.

The palette is expressed in **oklch**. The practical reason is that oklch lightness is perceptually even across hues, so a dark variant can be derived by moving L and C — a blue and a green at `L=0.7` genuinely look equally light. In HSL they do not, which is why hand-tuned dark palettes drift.

We add semantic `success` / `warning` / `info` tokens alongside the shadcn defaults, because status colors are the ones most often hard-coded, and a hard-coded `text-green-800` has no dark-mode value.

## Consequences

**Positive**

- One file describes the entire design system. There is no JS/CSS split to keep in sync.
- Colors are readable at their definition; `oklch(0.546 0.245 262.881)` is a color, `221.2 83.2% 53.3%` is three numbers that only mean something after substitution.
- Dark variants are derived rather than guessed, and stay consistent as the palette changes.
- Recoloring for a new project means editing one `:root` block.
- Builds get faster — no PostCSS/autoprefixer pass.

**Negative**

- oklch has no support in Safari < 15.4, Chrome < 111 or Firefox < 113. We accept this; those are 2022-era browsers and this template already requires modern tooling throughout. A deployment needing older support must supply fallbacks.
- Anyone familiar with the v3 `hsl(var(--x))` convention will find this unfamiliar at first.
- Tooling that expects to parse `tailwind.config.js` (some editor plugins, some codegen) will not find one.

**Neutral**

- `@theme inline` versus plain `@theme` matters: `inline` keeps the indirection resolvable inside variant blocks. Not obvious, and worth leaving alone.

## Considered alternatives

### Alternative 1: Keep `tailwind.config.js` via `@config`

The smallest possible diff. Rejected because it preserves a compatibility path that upstream is moving away from, and keeps the theme split across two files in two languages — the exact thing v4's CSS-first design removes.

### Alternative 2: CSS-first config, but keep the HSL palette

A smaller change that still gets the config benefits. Rejected because the channel-splitting indirection exists only to serve a v3 limitation, and carrying it forward means carrying an unexplained convention. Since the dark palette had never actually been rendered, there was no working appearance to preserve.

### Alternative 3: Keep hard-coded Tailwind palette classes at call sites

No token work at all. Rejected: 20 such classes across 10 files were already broken for dark mode — `bg-gray-50` page backgrounds stayed light, `text-green-800` on `bg-green-100` was unreadable. Semantic tokens are what make those themeable.

## Notes

One migration trap, documented because it produces no error. Tailwind 4 ships its own `container` utility that sets a `max-width` at **every** breakpoint, and defining `@utility container` **appends to** the built-in rather than replacing it. The v3 config here specified a single 1400px cap at `2xl`; the first v4 build silently emitted five additional max-width rules and narrowed the layout at mid widths. The fix was a distinctly-named `app-container`. Anything that shadows a built-in utility name deserves the same suspicion.
