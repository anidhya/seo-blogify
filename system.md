# Marketier AI — System Design

## Current Architecture

```
Browser
  │
  ├─── Next.js App Router (SSR + Client Components)
  │      app/page.tsx                 Landing / brand sync form
  │      app/runs/[runId]/            Run workspace
  │      app/runs/[runId]/blog/[slug] Article preview + approval
  │      app/runs/[runId]/blog/[slug]/linkedin  LinkedIn workflow
  │      app/social/[projectId]/      Social Studio workspace
  │      app/profiles/                Saved runs by domain
  │
  ├─── API Routes (Next.js Route Handlers)
  │      POST /api/workflow           All workflow mutations (step discriminator)
  │      GET  /api/workflow           Load full run bundle
  │      GET/DELETE /api/runs/[runId] Run management
  │      POST /api/runs               List runs
  │      /api/linkedin/*              LinkedIn OAuth callbacks
  │      /api/social/*                Social Studio CRUD + OAuth
  │
  └─── External Services
         OpenAI Responses API         Brand analysis, topic gen, blog gen, social gen
         Google Generative AI (Gemini) LinkedIn carousel image generation
         DataForSEO                   Keyword metrics, SERP evidence (optional)
         LinkedIn API                 OAuth + post publishing
         Meta Graph API               Instagram OAuth + publish
         X (Twitter) API              OAuth + tweet posting
         Vercel Blob                  Production artifact storage
```

### Storage Layout

```
Production (Vercel Blob):              Development (local FS):
  runs/<runId>/manifest.json             data/runs/<runId>/manifest.json
  runs/<runId>/input.json                data/runs/<runId>/input.json
  runs/<runId>/research.json             ...
  runs/<runId>/analysis.json
  runs/<runId>/existing-topics.json
  runs/<runId>/topic-candidates.json
  runs/<runId>/topics.json
  runs/<runId>/topic-validation.json
  runs/<runId>/topic-research.json
  runs/<runId>/approved-topic.json
  runs/<runId>/blog.json
  runs/<runId>/blog.md
  runs/<runId>/quality.json
  runs/<runId>/blog-revisions.json
  runs/<runId>/regeneration-notes.json
  runs/<runId>/approvals.json
  runs/<runId>/approved-articles.json
  runs/<runId>/linkedin.json

  social/<projectId>/project.json
  social/oauth-states.json
  linkedin/oauth-states.json
```

### Key Design Decisions Today

| Decision | Current choice | Trade-off |
|---|---|---|
| Workflow execution | Synchronous HTTP | Simple but hits serverless timeout on long steps |
| Storage | Flat JSON files | Zero infrastructure but no querying, no transactions |
| Auth | None (runId as implicit token) | Frictionless but no user isolation |
| AI provider | OpenAI only | Deep integration but no fallback or model choice |
| Progress reporting | Client polls manifest.json | Works but adds extra API calls |
| Token storage | Plain JSON in blob | Convenient but tokens are unencrypted |

---

## System Design Changes

The changes below are ordered from highest-leverage (fix a real breaking risk) to lowest (quality-of-life improvements). Each is independent and can ship incrementally.

---

### 1. Async Workflow Execution (Critical)

**Problem:** A single `POST /api/workflow` handles steps that chain 5–12 sequential LLM calls plus external API requests. This easily exceeds the 60-second Vercel Function timeout, especially `suggest-topics` (3 rounds of OpenAI + DataForSEO + SERP validation) and `generate-blog` (draft + 2 rewrites + 3 quality passes).

**Proposed design:**

```
Browser
  │
  ├── POST /api/workflow/start  { step, runId, ... }
  │     Creates a job record, returns jobId immediately (< 200 ms)
  │
  ├── GET  /api/workflow/progress?runId=...   (SSE stream)
  │     Streams manifest progress events to the browser
  │     Browser already renders a <WorkflowProgress> component — wire it to SSE
  │
  └── Background worker (Vercel Queue / Trigger.dev / GitHub Actions webhook)
        Consumes the job, runs the full step, writes artifacts + updates manifest
        Retries on failure up to 3× before marking the run as errored
```

**Minimal path to fix (without a queue):** Split each long step into smaller sub-steps that each finish in < 30 seconds, chain them client-side, and use Server-Sent Events for streaming progress. The progress infrastructure (`setProgress`) is already in place.

**Storage addition needed:**
```json
// manifest.json — add error tracking
{
  "error": null | { "step": "suggest-topics", "message": "...", "retriesLeft": 2 }
}
```

---

### 2. Parallel `loadRun()` Reads

**Problem:** `loadRun()` issues 16 sequential `await readJson(...)` calls. On Vercel Blob, each is an HTTPS request (~100 ms). Total cold-read latency: ~1600 ms per call.

**Fix:**

```ts
// lib/storage.ts — replace sequential awaits with Promise.all
export async function loadRun(runId: string): Promise<RunBundle> {
  const [manifest, input, research, analysis, existingTopics, /* ... */] = await Promise.all([
    readJson<RunManifest>(runId, "manifest.json"),
    readJson<RunInputRecord>(runId, "input.json"),
    readJson<RunResearchRecord>(runId, "research.json"),
    // ... all 16 files
  ]);

  return { manifest, input, research, /* ... */ };
}
```

**Estimated improvement:** ~1600 ms → ~150 ms per `loadRun()` call on Vercel Blob.

---

### 3. Authentication and User/Workspace Scoping

**Problem:** Any URL with a valid runId or projectId is fully accessible. No user accounts exist.

**Proposed design (incremental):**

```
Phase 1 — Simple magic link / API key auth
  Add a workspace_id to every run and social project.
  Guard all /api/* routes with a lightweight session middleware.
  Use NextAuth.js with email magic links (zero-dependency OAuth provider).

Phase 2 — Team workspaces
  workspace
    ├── users[]        (email, role: owner|editor|viewer)
    ├── brand_profiles[]  (reusable brand analysis)
    └── runs[]
        └── social_projects[]
```

**Storage change:** Add `workspaceId` to `RunManifest` and `SocialProject`. All `listRuns()` and `listSocialProjectSummaries()` filter by `workspaceId`.

**No breaking change:** Existing runs without a `workspaceId` default to a `"default"` workspace, preserving data continuity.

---

### 4. Encrypted Token Storage

**Problem:** LinkedIn and social OAuth tokens are stored as plain strings inside `linkedin.json` and `project.json`.

**Proposed design:**

```
Option A (simplest): Vercel KV + AES-256 encryption
  - Store tokens as encrypted blobs in Vercel KV keyed by <workspaceId>:<platform>
  - Store only a non-secret reference token ID in the JSON artifact
  - Rotate encryption key via environment variable

Option B (production): A dedicated secrets layer
  - Use a secrets manager (Doppler, Infisical, AWS Secrets Manager)
  - The JSON artifacts store only { connected: true, provider: "linkedin", expiresAt }
  - Token retrieval happens server-side only, never sent to the browser
```

**Minimum viable fix:** AES-256 encrypt token values before writing to blob, decrypt on read. Add `ENCRYPTION_KEY` environment variable. Two helper functions in `lib/crypto.ts`.

---

### 5. Database-Backed Storage

**Problem:** Flat JSON files cannot be queried, do not support transactions, cannot express relationships, and require reading 16 files to reconstruct a single run.

**Proposed design:**

```
Database: PostgreSQL (Neon serverless, Vercel Postgres, or Supabase)

Tables:
  workspaces      (id, name, created_at)
  users           (id, workspace_id, email, role)
  runs            (id, workspace_id, input, status, model, created_at, updated_at)
  run_steps       (id, run_id, step, artifact JSONB, created_at)
  approved_articles (id, run_id, slug, topic JSONB, blog JSONB, quality JSONB, ...)
  linkedin_records  (id, run_id, article_slug, draft JSONB, connection JSONB, ...)
  social_projects   (id, workspace_id, source JSONB, research JSONB, ...)
  social_platforms  (id, project_id, platform, active_variant_id, variants JSONB, ...)
  oauth_states      (state, project_id, platform, expires_at, code_verifier)
```

**Migration path:**
1. Add a database adapter alongside the existing storage layer.
2. Feature-flag new runs to write to both (JSON + DB) for a transition period.
3. Backfill existing runs.
4. Remove the JSON layer.

The Zod schemas in `lib/schemas.ts` map cleanly to JSONB columns so migration validation is minimal.

---

### 6. CMS Publishing Adapter

**Problem:** The workflow ends at markdown generation. There is no handoff to a live content destination.

**Proposed interface:**

```ts
// lib/cms/types.ts
interface CmsAdapter {
  name: string;
  publish(article: ApprovedArticle, runId: string): Promise<{ url: string; externalId: string }>;
  update(externalId: string, article: ApprovedArticle): Promise<{ url: string }>;
}

// lib/cms/adapters/wordpress.ts
// lib/cms/adapters/contentful.ts
// lib/cms/adapters/ghost.ts
// lib/cms/adapters/webflow.ts
```

**Storage addition:** Add `cmsPublications: CmsPublication[]` to `ApprovedArticle`.

**Workflow addition:** Add a `publish-cms` step to `/api/workflow` that calls the configured adapter and records the result.

**UI addition:** A "Publish to CMS" button on the article preview page, next to the existing LinkedIn handoff.

---

### 7. Scheduled Publish Execution

**Problem:** `schedule-linkedin` saves a `scheduledFor` timestamp but nothing executes the publish action at that time.

**Proposed design:**

```
Vercel Cron (vercel.json):
  {
    "crons": [
      { "path": "/api/cron/publish-scheduled", "schedule": "*/5 * * * *" }
    ]
  }

GET /api/cron/publish-scheduled
  1. List all linkedin.json records where:
       draft.publishStatus === "scheduled"
       schedule.scheduledFor <= now
       publication === null
  2. For each, fire the publish-linkedin step
  3. Same logic for Social Studio schedules
```

**Authentication:** Vercel Cron routes automatically include a `x-vercel-cron` header. Validate it to prevent unauthorized triggering.

---

### 8. Streaming Progress via Server-Sent Events

**Problem:** The browser polls `GET /api/workflow?runId=...` to show progress. This adds read-your-writes latency and extra Blob requests.

**Proposed design:**

```ts
// app/api/workflow/progress/route.ts
export async function GET(request: Request) {
  const runId = new URL(request.url).searchParams.get("runId");
  const stream = new ReadableStream({
    async start(controller) {
      // Poll manifest every 1s and push SSE events
      // Client subscribes with EventSource and replaces polling
    }
  });
  return new Response(stream, { headers: { "Content-Type": "text/event-stream" } });
}
```

The existing `WorkflowProgress` component (`app/components/workflow-progress.tsx`) and `useWorkflowProgress` hook (`lib/use-workflow-progress.ts`) are already structured around this — just swap the polling mechanism.

---

## Recommended Implementation Plan

### Phase 1 — Fix Critical Issues (1–2 weeks)

1. **Fix default model name** (`gpt-5.4-mini` → valid model) — 5 minutes
2. **Parallelize `loadRun()`** — 30 minutes, measurable latency win
3. **Add basic auth guard** — NextAuth.js magic link, scope all API routes — 1–2 days
4. **Encrypt OAuth tokens at rest** — AES helper + env var — 1 day

### Phase 2 — Reliability and Scale (2–4 weeks)

5. **Async workflow execution** — SSE progress stream + background runner — 1 week
6. **Scheduled publish cron** — Vercel Cron + publish handler — 2 days
7. **Remove duplicate Zod schemas** — consolidate `lib/openai.ts` schemas into `lib/schemas.ts` — 2 hours

### Phase 3 — Growth Features (1–2 months)

8. **CMS publishing adapters** — start with one (Ghost or WordPress) — 1 week
9. **Database migration** — Neon/Postgres + Drizzle ORM, dual-write transition — 2 weeks
10. **Multi-article batch generation** — topic queue → parallel article jobs — 1 week
11. **Team workspaces** — workspace model, member roles, shared brand profiles — 2 weeks
12. **Analytics loop** — Google Search Console integration, ranking feedback — 1 week

### Phase 4 — Platform Expansion

13. **Claude model option** — model picker in settings, Anthropic SDK in `lib/` alongside OpenAI
14. **WordPress/Webflow/Contentful CMS** — expand adapter library
15. **Mobile-responsive Social Studio** — the Studio is currently desktop-first
