# Blogify

Blogify is a Next.js app that turns a company website and supporting blog URLs into a brand-aware blog workflow.

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
- prepares LinkedIn carousel prompts after article approval
- supports LinkedIn OAuth connection, approval, scheduling, and publish-now actions
- stores every workflow artifact locally for later reuse

## Main screens

- `/` landing page with the sync form and saved profiles
- `/runs/[runId]` workspace for analysis and topic approval
- `/runs/[runId]/blog/[slug]` article preview, regeneration, and approval flow
- `/runs/[runId]/blog/[slug]/linkedin` LinkedIn publishing workflow for the approved article

## UI stack

- Next.js App Router
- Tailwind CSS
- Route-level loading states
- Local file-backed workflow storage under `data/runs/<runId>/`

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create an environment file:

```bash
cp .env.example .env.local
```

3. Add your OpenAI API key to `.env.local`.

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
- `LINKEDIN_CLIENT_ID`
- `LINKEDIN_CLIENT_SECRET`
- `LINKEDIN_REDIRECT_URI`
- `LINKEDIN_SCOPE` defaults to `w_member_social`

## Workflow artifacts

Each run is written to `data/runs/<runId>/` as JSON and Markdown.

Key files:

- `input.json`
- `research.json`
- `existing-topics.json`
- `analysis.json`
- `topics.json`
- `topic-candidates.json`
- `topic-validation.json`
- `approved-topic.json`
- `blog.json`
- `blog.md`
- `quality.json`
- `blog-revisions.json`
- `regeneration-notes.json`
- `approvals.json`
- `linkedin.json`

## Notes

- The app fetches the provided website and blog URLs directly and extracts text heuristically.
- Topic suggestions are deduplicated against existing blog coverage before they are shown for approval.
- The generated blog body is capped at 1200 words.
- The blog preview page supports regeneration comments and explicit approval or revision decisions.
- Approving a blog can generate a LinkedIn publishing pack with 4 carousel-ready prompts, then hand off to the LinkedIn workflow page.
- LinkedIn publish state is stored per article slug inside `linkedin.json`.
- The current storage layer is local filesystem-based, which is fine for development but not durable on Vercel serverless. For production on Vercel, swap `lib/storage.ts` to persistent storage such as Vercel Blob, Postgres, or KV.
- CMS publishing is not wired yet. The output is generated as publication-ready markdown for the next handoff step.
