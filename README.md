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
- supports regeneration with reviewer comments
- prepares LinkedIn post packs after article approval, including a suggested title, suggested description, and 4 carousel prompts
- generates LinkedIn carousel images with Google AI Studio from the approved carousel prompts and shows them on the LinkedIn page
- supports LinkedIn OAuth connection, approval, scheduling, and publish-now actions
- provides a separate Social Studio for URL- or topic-based Instagram, LinkedIn, and X drafts with editing, comments, scheduling, and platform connections
- stores every workflow artifact locally during development and in Vercel Blob in production when configured

## Main screens

- `/` landing page with the sync form and quick workflow actions
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
- Light theme uses green and black as the primary color system
- Route-level loading states
- Local file-backed workflow storage in development and Vercel Blob-backed storage on deploy when `BLOB_READ_WRITE_TOKEN` is set

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create an environment file:

```bash
cp .env.example .env.local
```

3. Add your OpenAI API key and Google AI Studio key to `.env.local`.

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
- `OPENAI_ENABLE_WEB_SEARCH` can be set to `false` to disable web search for topic generation
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
- `BLOB_READ_WRITE_TOKEN` enables persistent storage with Vercel Blob on deploy

## Workflow artifacts

Each run is written as JSON and Markdown records. In development, those files live under `data/runs/<runId>/`; on Vercel with `BLOB_READ_WRITE_TOKEN` configured, they are stored in Vercel Blob under `runs/<runId>/...`.

Key files:

- `input.json`
- `research.json`
- `existing-topics.json`
- `analysis.json`
- `topics.json`
- `topic-candidates.json`
- `topic-validation.json`
- `topic-research.json`
- `approved-topic.json`
- `blog.json`
- `blog.md`
- `quality.json`
- `blog-revisions.json`
- `regeneration-notes.json`
- `approvals.json`
- `linkedin.json`

## Notes

- The design system lives in [`design.md`](/Users/anidhyaahuja/Documents/blogify/design.md). Update it whenever a new UI decision is made.
- The app fetches the provided website and blog URLs directly and extracts text heuristically.
- Topic suggestions are deduplicated against existing blog coverage before they are shown for approval.
- The generated blog body is capped at 1200 words.
- The blog preview page supports regeneration comments and explicit approval or revision decisions.
- Approving a blog can generate a LinkedIn publishing pack with 4 carousel-ready prompts, then hand off to the LinkedIn workflow page.
- Approved blogs can now hand off into Social Studio to seed platform-specific social drafts.
- The LinkedIn workflow page can generate 4 carousel images with Google AI Studio and render them on the same page.
- LinkedIn publish state is stored per article slug inside `linkedin.json`.
- Social Studio supports direct OAuth connections and direct publish for Instagram and X when the provider credentials are configured.
- The landing page, workspace, preview, and LinkedIn pages all share the same compact shell so the UI stays short and navigable.
- Social Studio uses a separate `social/` project store so it can behave like its own product while still sharing the shell and design system.
- A reusable DataForSEO research skill lives at `skills/dataforseo-seo-research/` for future topic and blog briefing workflows.
- The storage layer writes to the local filesystem in development and to Vercel Blob on deploy when `BLOB_READ_WRITE_TOKEN` is set. If the Blob token is missing on Vercel, the app falls back to the instance filesystem and the data is still ephemeral.
- CMS publishing is not wired yet. The output is generated as publication-ready markdown for the next handoff step.
