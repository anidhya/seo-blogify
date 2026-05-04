# AGENTS.md

This repository is a Next.js app for Marketier AI. When you work here, optimize for small, correct changes that fit the existing app, design system, and workflow storage model.

## Project Snapshot

- Framework: Next.js App Router
- Language: TypeScript
- Styling: Tailwind CSS
- UI system: shared workspace shell, compact rail navigation, light/dark theme
- Core domains: brand analysis, topic generation, blog drafting, quality checks, LinkedIn publishing, and Social Studio
- Source of truth for visual decisions: `design.md`

## Common Commands

- Install dependencies: `npm install`
- Create local environment file: `cp .env.example .env.local`
- Start dev server: `npm run dev`
- Start production server after a build: `npm run start`
- Lint: `npm run lint`
- Typecheck: `npm run typecheck`
- Production build: `npm run build`

## Where Things Live

- App routes and screens: `app/`
- Social Studio and APIs: `app/social/`, `app/api/social/`
- LinkedIn and Social Studio OAuth/connect routes: `app/api/linkedin/`, `app/api/social/[projectId]/connect/`, `app/api/social/connect/callback/`
- Profile and FAQ screens: `app/profiles/`, `app/faq/`
- Run workspace and article views: `app/runs/[runId]/`, `app/runs/[runId]/articles/`, `app/runs/[runId]/blog/[slug]/`, `app/runs/[runId]/blog/[slug]/linkedin/`
- Shared UI components: `app/components/`
- Route-specific components: near the route they support
- Business logic and utilities: `lib/`
- Reusable workflow skills: `skills/seo-friendly-topics/`, `skills/seo-friendly-articles/`, `skills/dataforseo-seo-research/`
- Design guidance: `design.md`
- Product summary and setup notes: `README.md`

## Working Rules

- Preserve the current app structure unless the task explicitly asks for a refactor.
- Keep the workspace shell compact and information-dense.
- Follow `design.md` for colors, spacing, typography, and component feel.
- Update `design.md` when you make a new UI decision that should persist.
- Prefer existing utilities and shared components before introducing new abstractions.
- Do not overwrite unrelated user changes.
- Avoid destructive git commands unless the user explicitly asks for them.

## Implementation Preferences

- Use TypeScript-first code.
- Keep React components small and focused.
- Put route-specific logic in the route folder when that keeps the feature easier to follow.
- Keep validation and schema changes aligned between `lib/schemas.ts`, route handlers, and UI consumers.
- Treat storage changes carefully: local filesystem in development, Vercel Blob when configured for deployment.
- Run workflow artifacts live under `data/runs/<runId>/` locally and `runs/<runId>/...` when Blob storage is enabled.
- Social Studio persists project data under `data/social/<projectId>/` locally and `social/<projectId>/...` when Blob storage is enabled.

## UI Preferences

- Keep layouts compact and readable rather than expansive.
- Use navy, white, and restrained green as the default visual rhythm.
- Use purple sparingly for secondary emphasis and LinkedIn-related surfaces.
- Prefer clear labels and icons over decorative UI.
- Avoid heavy shadows, oversized card stacks, and busy backgrounds.

## Before You Finish

- Run the smallest relevant check first, usually `npm run lint` or `npm run typecheck`.
- If you changed a user-facing flow, verify the affected route locally if possible.
- If you need local workflow data, copy `.env.example` to `.env.local` before starting the app.
- Summarize the files changed and any follow-up validation that is still needed.
