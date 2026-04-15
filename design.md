# Marketier AI Design System

## Overview

Marketier AI is a compact workflow dashboard for turning a brand website into approved blog, LinkedIn, and publishing artifacts. The visual language is calm, readable, and information-dense. Use a pale green canvas in light mode, near-black surfaces in dark mode, strong navy for primary actions, restrained green for positive states, and purple only for LinkedIn and secondary workflow emphasis.

The app is intentionally not a generic SaaS layout. It uses a separate left rail, compact cards, short headers, and progressive disclosure so each step in the workflow feels focused.

## Product Areas

- Landing: brand sync entry point with quick setup and progress feedback
- Social Studio landing: source selection, recent projects, and platform-aware content creation
- Profiles: saved runs grouped by website domain
- FAQ: short answers in expandable cards
- Run workspace: analysis, topic queue, and article generation
- Articles: approved article list and handoff links
- Article preview: editor-like review, revision, and approval surface
- LinkedIn workflow: carousel prompts, image generation, approval, scheduling, and publish controls

## Layout

- The app uses a full-height shell with a fixed left rail and a separate scrolling content pane.
- The shell should not feel like one large enclosing card.
- Main content should stay compact and vertically readable.
- Use breadcrumb-like context and a top action area when a page has secondary controls.
- Keep the sidebar icon-first and narrow enough to preserve workspace density.

## Color System

### Core Light Theme

- Canvas: `#f6f9f6`
- Surface: `#ffffff`
- Surface soft: `rgba(255, 255, 255, 0.92-0.98)`
- Ink: `#0f172a`
- Muted text: `#475569`
- Hairline border: `rgba(15, 23, 42, 0.08)`
- Primary navy: `#0f172a`
- Primary green: `#0f7b49`
- Success green: `#22c55e`
- LinkedIn purple: `#8b5cf6`
- LinkedIn blue: `#0a66c2`
- Warning amber: `#eab308`
- Error red: `#ef4444`

### Dark Theme

- Canvas: `#0f1011`
- Surface: `#111111` to `#1a1b1f`
- Ink: `#f4f4f5`
- Muted text: `#a1a1aa`
- Hairline border: `rgba(255, 255, 255, 0.08)`
- Primary action color can shift to green in dark mode for better separation from the canvas.

### Color Rules

- Use navy for primary buttons and strong typography.
- Use green for positive states, progress, and publish-ready cues.
- Use purple sparingly for LinkedIn, secondary emphasis, and carousel-related surfaces.
- Use blue only when the UI is explicitly about LinkedIn OAuth or connection.
- Avoid beige-heavy backgrounds, warm orange branding, and noisy gradients.

## Typography

- Headline font: Plus Jakarta Sans
- Body font: DM Sans
- Mono font: Fira Code

### Type Scale

- Display: 40px, bold, 1.15 line height
- H1: 32px, bold, 1.2 line height
- H2: 24px, semibold, 1.25 line height
- H3: 20px, semibold, 1.3 line height
- H4: 16px, medium, 1.35 line height
- Body large: 18px, regular, 1.6 line height
- Body: 16px, regular, 1.6 line height
- Body small: 14px, regular, 1.5 line height
- Caption: 12px, medium, 1.4 line height
- Code: 14px mono, 1.6 line height

### Typography Rules

- Headings should be tight and readable, not overly decorative.
- Use balance-friendly wrapping on large headings when practical.
- Keep microcopy direct and task-oriented.
- Use tabular numerals for progress, scores, and counts.

## Spacing And Shape

- Base spacing unit: 8px
- Common spacing steps: 4, 8, 16, 24, 32, 48, 64
- Standard labeled button radius: 12px
- Compact cards: 12px to 14px radius
- Shell cards and panels: 16px radius
- Pills and status chips: fully rounded
- Icon buttons: circular

Keep cards compact. Avoid oversized padding unless the screen is intentionally an empty state or hero.

## Elevation

Shadows should stay soft and diffused.

- Small: subtle lift for buttons and cards
- Default: 1px border plus low-opacity shadow
- Medium: used for editor panels, modal surfaces, and progress banners
- Large: reserved for dialog overlays and strongly separated surfaces

Avoid stacked card shadows and heavy drop shadows.

## Shared Components

### Buttons

- Primary: navy fill, white text
- Secondary: white or transparent fill, navy text, light border
- Ghost: muted text, subtle hover fill
- Destructive: red fill or red-outline treatment
- Accent: purple fill for LinkedIn-related or secondary workflow controls
- Disabled: reduced opacity, no hover lift

### Inputs

- Default input height is around 42px to 48px depending on context
- Inputs use white or near-white fills with 1px borders
- Focus states should use a clear colored ring and border
- Multiline fields are rounded and compact, not oversized

### Cards

- Default cards use white fill, light borders, and modest radius
- Some cards use tinted gradient washes to mark workflow context
- Use compact padding and preserve readable line length

### Chips And Badges

- Green chips mean ready, healthy, or publishable
- Amber chips mean review, caution, or pending approval
- Purple chips mean LinkedIn or secondary workflow states
- Blue chips mean connection or informational states
- Keep badge text short and legible

### Navigation

- Left rail icons should stay unlabeled in the rail itself only when the surrounding layout makes context obvious
- Use active state color, step numbers, and small status badges to show workflow progress
- Keep breadcrumbs simple and shallow

## Page Patterns

### Landing

- Center the hero vertically and keep it concise.
- Use a small brand badge above the headline.
- The main card should contain the website URL field first.
- Advanced fields should be hidden behind a progressive disclosure toggle.
- Show analysis progress directly under the form.
- Keep the primary CTA large, navy, and text-first.
- Add a secondary social-content path so the root page works as a gateway between blog and social workflows.

### Social Studio

- Treat Social Studio as a separate product entry that still shares the same shell.
- Keep the source picker compact, with a clear distinction between URL-based and manual-topic inputs.
- Surface the research summary above the platform cards so the draft set feels grounded.
- Use platform cards with clear editing, comments, connection, and scheduling controls.
- Instagram and LinkedIn can use purple accents for carousel variants; X should stay neutral and text-forward.
- Use a split preview-and-details content editor modal for deep draft editing, with the preview on the left and the editable fields on the right.

### Profiles

- Group runs by domain.
- Show small summary cards for total runs and ready items.
- Use domain headers with compact separators.
- Keep run cards one-line dense with company name, status, time, quality score, and article title.
- Hover actions may stay hidden until the user targets the row.

### FAQ

- Use a two-column grid on wider screens.
- Each question lives in a details card with a compact icon cue.
- Keep answers short and scannable.
- The FAQ is a low-friction support page, not a marketing page.

### Run Workspace

- Treat this as the operational hub for a single brand.
- Keep the header compact, with the brand name and short status cues.
- Step navigation should show analysis, topics, and articles clearly.
- Use the workspace shell rather than custom page chrome.

### Topics

- The topic queue should feel like an approval board.
- Use a strong title, a short subtitle, and one action for topic generation.
- Topic cards should expose the rationale, keyword, intent, and SEO angle.
- Approval is a single high-confidence action per card.
- Keep the approved articles summary short and informational.

### Articles

- Present approved articles as a grid of compact cards.
- Show article title, summary, approval status, topic, quality, feedback count, and LinkedIn status.
- Provide direct links to preview and LinkedIn workflow.
- Keep the empty state simple and action-oriented.

### Article Preview

- The top summary card should communicate title, summary, quality score, publish status, and word count immediately.
- The main editor card should behave like a review surface with Preview, Edit, Markdown, and HTML modes.
- Use disclosure cards for SEO meta, key takeaways, image prompts, internal links, FAQ content, and history.
- Keep the right rail action area sticky on large screens.
- Use green for article-health cues and purple only where image prompts or LinkedIn handoff are involved.

### LinkedIn Workflow

- This page is the most visually expressive part of the app.
- Use a purple-forward hero and section accents, but keep the layout disciplined.
- The pack summary should surface title, description, hashtags, CTA, image status, approval, and connection state.
- Carousel prompt cards should be compact and repeatable.
- Generated images should appear in a separate section with clear slide numbering.
- Approval, connection, and schedule/publish controls should be split into three distinct panels.
- Use LinkedIn blue only for OAuth connection.
- Use green for schedule and publish success states.
- Use rose or red only for failure and history emphasis.

## Loading States

- Loading screens should use soft skeletons and rounded surfaces.
- Keep them consistent with the shell and card system.
- Avoid visually loud placeholder blocks.

## Content And Tone

- Use title case for page titles and button labels.
- Keep button labels specific: "Analyze Brand & Create Project", "Approve for publish", "Generate pack", "Publish now".
- Prefer action verbs over vague labels.
- Use curly apostrophes and ellipses.
- Keep error text practical and fix-oriented.

## Do's And Don'ts

1. Do keep the app compact and workflow-oriented.
2. Do preserve the separate left rail and main content plane.
3. Do keep labeled buttons at 12px radius.
4. Do keep cards readable, shallow, and easy to scan.
5. Do use progressive disclosure for advanced or secondary content.
6. Do use color sparingly and consistently with state meaning.
7. Do keep LinkedIn visually distinct from the rest of the app.
8. Do update this document whenever a new reusable UI pattern lands.
9. Don't introduce beige-heavy surfaces or warm orange accents.
10. Don't wrap the whole workspace in one giant card.
11. Don't use heavy shadows or stacked depth effects.
12. Don't let metadata dominate the actual article or workflow content.

## Current Patterns To Preserve

- Landing page: centered hero, compact sync form, hidden advanced options, inline progress
- Profiles page: grouped run list with hover actions and summary counters
- FAQ page: Q&A cards with a details summary pattern
- Workspace shell: narrow icon rail, theme controls, settings modal, breadcrumb/top action strip
- Topic queue: strong card-based approval workflow
- Article preview: editor-like surface with deep disclosure panels
- LinkedIn page: purple-tinted workflow cards, image generation, OAuth, schedule, publish
- Loading states: soft skeleton surfaces matched to the current shell
