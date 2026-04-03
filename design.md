# Design System

Living reference for the visual language of Blogify.

Update this file whenever we make a new design decision so UI work stays consistent across the app.

## Status

- Last updated: 2026-04-02
- Current stack: Next.js App Router, Tailwind CSS, local file-backed workflow state
- Primary surfaces: landing page, run workspace, article preview, LinkedIn workflow

## Design Principles

- Editorial first: content should feel like a polished publishing workspace, not a generic SaaS dashboard.
- Warm but restrained: use a soft neutral base with a small number of strong accents.
- High information density: cards should carry useful context without feeling crowded.
- Progressive disclosure: show the next decision only when the current step is ready.
- Strong state visibility: queued, pending, approved, publish-ready, scheduled, and failed states must be obvious.

## Color Palette

Base palette:

- Background: `#f4efe6`
- Panel: `rgba(255, 252, 247, 0.92)`
- Panel strong: `#fffaf2`
- Ink: `#1f1d19`
- Muted text: `#6f675b`
- Divider / line: `rgba(31, 29, 25, 0.12)`

Accent palette:

- Primary accent: `#c35d2e`
- Accent soft: `#f2d1c3`
- Success: `#0f7b49`
- LinkedIn accent: `#0a66c2`
- LinkedIn action green: `#16a34a`
- Attention / warning: use sparingly, mainly for rate-limit or preview fallback messaging

Current gradient language:

- Warm cream to beige background washes
- Dark brown to burnt-orange loader bars
- Occasional cool blue/purple accents for LinkedIn and approval states

## Typography

Display font:

- `Iowan Old Style`, `Palatino Linotype`, `Book Antiqua`, Georgia, serif
- Used for major page titles, hero text, and article headings where a premium editorial tone is needed

Body font:

- `Avenir Next`, `Segoe UI`, `Helvetica Neue`, sans-serif
- Used for UI labels, field text, cards, metadata, and workflow controls

Type rules:

- Use large, tight headlines with negative tracking for the hero and article pages
- Keep body copy readable, compact, and scannable
- Use small uppercase labels for badges, status chips, and section metadata

## Layout

App shell:

- Main content is centered at roughly `80vw` max width on desktop
- Mobile should collapse to full width with natural stacking
- Page content should feel airy, but never sparse

Primary page patterns:

- Landing page: start with the intake form and synced profiles
- Run workspace: show analysis, topic queue, and approved articles
- Article preview: editorial reading surface with approval and regeneration controls
- LinkedIn workflow: carousel prompts, image assets, approval, scheduling, and publish actions

Common spacing:

- Use 24px to 32px gaps between major sections
- Use 14px to 18px padding for form fields and small controls
- Use 24px padding for standard cards
- Use 28px to 40px radius on major containers depending on prominence

## Surfaces and Cards

Primary card style:

- Rounded corners: 22px to 28px
- Border: 1px solid with the global divider color
- Background: white-tinted panel with light opacity
- Shadow: soft, warm shadow with low blur and no harsh contrast

Editorial cards:

- Use layered gradients or subtle washes for hero and review surfaces
- Important cards can have stronger shadows and slightly richer color
- Hover states should lift the card by 1px to 2px and deepen the border color

State cards:

- Success and approval should use green-tinted panels or badges
- Pending and draft states should stay neutral
- Rate-limit and preview fallback states should use soft amber styling

## Buttons and Inputs

Buttons:

- Primary actions should use filled buttons with strong accent color
- Secondary actions should use outlined or soft-filled buttons
- Destructive or negative actions should never compete visually with primary actions
- Hover states should lift slightly and darken the fill or border

Inputs:

- Rounded corners: 18px
- Background: slightly translucent white
- Border: soft neutral border
- Focus state: visible ring or accent border
- Labels should be above fields with medium weight text

Text areas:

- Use comfortable vertical padding
- Keep them large enough for editorial comments and article edits

## Status and Badges

Badges are used heavily to indicate workflow state.

Current badge vocabulary:

- `draft`
- `needs_review`
- `publish_ready`
- `approved`
- `pending_review`
- `scheduled`
- `published`
- `queued`
- `generating`
- `partial`
- `failed`

Badge style:

- Fully rounded pills
- Small uppercase or compact text
- Soft background tint plus colored text
- Avoid heavy borders unless the state needs extra emphasis

## Progress and Loading

Loader behavior:

- Loader should appear only when an action is actively running
- Prefer the browser-top progress bar for long-running tasks
- Show both percentage and stage label
- When possible, preserve partial results and continue updating the UI

Loading states:

- Use skeleton cards for list and dashboard loading
- Use inline progress for active actions
- Use top-of-window progress for long or multi-step work

## Hover and Motion

Motion language:

- Keep motion subtle and functional
- Use small translate-y lift on hover
- Use gentle progress bar transitions
- Do not use bouncy or playful motion

Hover effects:

- Cards: lift slightly, strengthen border, and add a soft shadow
- Buttons: darker fill or border, minimal vertical motion
- Topic cards and article cards should feel clickable when they are actionable

## Visual Hierarchy

Priority order:

1. The active action or decision
2. The current content artifact
3. The supporting metadata
4. Historical or secondary context

Rules:

- Do not let metadata overpower the article content
- Do not let controls crowd the preview surface
- Keep linked artifacts clearly grouped by article slug or run ID

## Current Product-Specific Patterns

Landing page:

- Form-first layout
- Synced brand/company profiles below the form
- Strong hero statement with a short trust band

Run workspace:

- Analysis card with website URL, blog URLs, and sitemap summary
- Topic approval queue with hover emphasis
- Approved articles list replaces the old single generated-blog block

Article preview:

- Wide preview container
- Editable article body
- Copy-to-clipboard actions for key sections
- Approval flow and regeneration comments

LinkedIn page:

- Suggested title and description
- Carousel prompts
- Generated image assets or preview assets
- Approval, scheduling, and publish controls

## Content Tone

- Direct and practical
- Editorial rather than promotional
- Clean, structured, and readable
- Avoid filler and avoid generic dashboard copy

## Update Rule

When a new design decision is made:

1. Update this file first or alongside the UI change
2. Keep tokens and component rules aligned with the app
3. Add any new badge state, color, spacing rule, or page pattern here

