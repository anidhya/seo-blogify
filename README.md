# Marketier AI 0.1

Marketier AI is a Next.js app that turns a company website and supporting blog URLs into a brand-aware blog workflow, with a separate Social Studio for platform-specific social content.

## What it does

- analyzes the brand, company, audience, vision, and writing style
- derives existing blog coverage and filters duplicate topic ideas
- suggests 10 fresh SEO-minded topics for approval
- generates a blog draft with key takeaways, SEO meta tags, FAQs, and markdown
- generates 3 consistent image prompts for downstream image generation
- generates internal-link suggestions to strengthen site structure
- supports inline article editing in the preview screen
- provides copy-to-clipboard actions for article sections, prompts, and link suggestions
- runs a quality gate that rewrites drafts until they clear the editorial threshold
- supports reusable brand-guidelines uploads by domain so article drafts, quality review, and rewrites stay aligned with uploaded files
- supports regeneration with reviewer comments
- prepares LinkedIn post packs after article approval, including a suggested title, suggested description, and 4 carousel prompts
- generates LinkedIn carousel images with Google AI Studio from the approved carousel prompts and shows them on the LinkedIn page
- supports LinkedIn OAuth connection, approval, scheduling, and publish-now actions
- provides a separate Social Studio for URL- or topic-based Instagram, LinkedIn, and X drafts with editing, comments, scheduling, and platform connections
- supports Google OAuth login and passwordless magic-link signup/sign-in
- stores workflow data, social projects, and generated social assets in Postgres through the configured `DATABASE_URL`
- keeps unreachable homepage and blog URLs as explicit unavailable snapshots so research never stops at a dead end

## Main screens

- `/` landing page with the sync form and quick workflow actions
- `/login` authentication entry point for Google OAuth and magic-link sign-in
- `/social` social-content studio landing page and project library
- `/social/[projectId]` social content workspace with per-platform editing, comments, and scheduling
- `/profiles` synced brand and workspace profile list
- `/faq` product and workflow FAQ
- `/runs/[runId]` workspace for analysis and topic approval
- `/runs/[runId]/blog/[slug]` article preview, regeneration, and approval flow
- `/runs/[runId]/blog/[slug]/linkedin` LinkedIn publishing workflow for the approved article
- The app uses a compact left navigation rail with icons and a shared workspace shell across the main screens

## UI stack

- Next.js App Router
- Tailwind CSS
- Dual light/dark theme with a shell-level toggle and settings drawer
- Shared workspace shell with a slim icon-first navigation rail
- Sync Brand lives in the landing page form; Settings remains in the left rail
- Pale green canvas in light mode, near-black surfaces in dark mode, navy primary actions, restrained green for positive states, and purple for LinkedIn and secondary emphasis
- Route-level loading states
- Postgres-backed workflow storage through the configured `DATABASE_URL`

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create an environment file:

```bash
cp .env.example .env.local
```

3. Add your OpenAI API key to `.env.local`. Add a Google AI Studio key only if you want LinkedIn carousel image generation.

4. Start the app:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment variables

See `.env.example`.

Important variables:

- `OPENAI_API_KEY`
- `OPENAI_MODEL` defaults to `gpt-5.4-mini`
- `OPENAI_EMBEDDING_MODEL` defaults to `text-embedding-3-small`
- `OPENAI_ENABLE_WEB_SEARCH` can be set to `false` to disable web search for topic generation
- `AUTH_SECRET` signs session cookies and OAuth state
- `APP_URL` sets the canonical public base URL for auth links and redirects
- `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, and `GOOGLE_OAUTH_REDIRECT_URI` enable Google OAuth sign-in
- `RESEND_API_KEY` and `RESEND_FROM_EMAIL` enable magic-link email delivery
- `DATAFORSEO_LOGIN` and `DATAFORSEO_PASSWORD` enable DataForSEO-backed keyword and SERP evidence for topic generation
- `DATAFORSEO_LOCATION_CODE` defaults to `2840` for United States
- `DATAFORSEO_LANGUAGE_CODE` defaults to `en`
- `LINKEDIN_CLIENT_ID`
- `LINKEDIN_CLIENT_SECRET`
- `LINKEDIN_REDIRECT_URI`
- `LINKEDIN_SCOPE` defaults to `w_member_social`
- `X_CLIENT_ID`
- `X_CLIENT_SECRET`
- `X_REDIRECT_URI`
- `X_SCOPE` defaults to `tweet.read tweet.write users.read offline.access`
- `META_APP_ID`
- `META_APP_SECRET`
- `META_REDIRECT_URI`
- `META_GRAPH_VERSION` defaults to `v24.0`
- `META_SCOPE` defaults to `instagram_basic,instagram_content_publish,pages_read_engagement,pages_show_list`
- `GEMINI_API_KEY` or `GOOGLE_API_KEY` for Google AI Studio image generation
- `GOOGLE_IMAGE_MODEL` defaults to `gemini-3.1-flash-lite-preview`
- `DATABASE_URL` connects the app to your Postgres instance, including Railway Postgres in local development or deployment
- `DATABASE_SSL` defaults to `true` for hosted databases
- `DATABASE_POOL_SIZE` controls the Postgres client pool size

## Workflow records

Each run is stored as structured records in Postgres and rendered back into the app from the database.

Core records:

- `input`
- `research`
- `existing-topics`
- `analysis`
- `topics`
- `topic-candidates`
- `topic-validation`
- `topic-research`
- `approved-topic`
- `blog` and its generated markdown
- `quality`
- `blog-revisions`
- `regeneration-notes`
- `approvals`
- `linkedin`
- `brand-guidelines`

## Database and migration helpers

- PostgreSQL is used for workflow runs, social projects, generated social assets, brand-guideline retrieval, and all runtime storage helpers.
- Migration, backfill, repair, and verification scripts live under `scripts/`.
- Use `DATABASE_URL` for Railway Postgres in both local development and deployment.

## Notes

- The design system lives in [`design.md`](./design.md). Update it whenever a new UI decision is made.
- The app fetches the provided website and blog URLs directly and extracts text heuristically.
- If a homepage or blog page cannot be reached, the research step keeps an explicit unavailable snapshot instead of dropping the URL, and topic dedup ignores those placeholders.
- Topic suggestions are deduplicated against existing blog coverage before they are shown for approval.
- The generated blog body is capped at 1200 words.
- The blog preview page supports regeneration comments and explicit approval or revision decisions.
- Approving a blog can generate a LinkedIn publishing pack with 4 carousel-ready prompts, then hand off to the LinkedIn workflow page.
- Approved blogs can now hand off into Social Studio to seed platform-specific social drafts.
- The LinkedIn workflow page can generate 4 carousel images with Google AI Studio and render them on the same page.
- The landing page, workspace, preview, and LinkedIn pages all share the same compact shell so the UI stays short and navigable.
- Social Studio supports direct OAuth connections and direct publish for Instagram and X when the provider credentials are configured.
