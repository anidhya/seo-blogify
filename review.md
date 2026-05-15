# Marketier AI — Code Review (Round 2)

> **Reviewed:** 2026-05-15  
> **Previous review:** Round 1 (initial audit)  
> **Status since Round 1:** Authentication fully shipped; PostgreSQL + Drizzle ORM added as persistence layer; Google OAuth + magic links + session middleware in production.

---

## What the Software Does

Marketier AI is a Next.js 15 application that automates a brand-to-published-content pipeline. Given a company website URL and optional blog URLs, it:

1. Scrapes and snapshots the site (homepage + blog pages + sitemap)
2. Generates a brand analysis (voice, audience, SEO gaps) via OpenAI
3. Proposes 10 deduplicated, SERP-validated blog topics (DataForSEO + live SERP)
4. Drafts and quality-gates a blog post (1200-word cap, 80-point quality threshold)
5. Produces a LinkedIn publishing pack with 4 carousel prompts and Gemini-generated images
6. Supports a Social Studio that generates Instagram, LinkedIn, and X content for any URL or manual topic

Users authenticate via Google OAuth or passwordless magic link email. Runs are created under an organization, and brand guidelines are stored as chunked vector embeddings in PostgreSQL.

---

## Architecture Summary

| Layer | Technology |
|---|---|
| Framework | Next.js 15 App Router |
| Language | TypeScript 5 (strict) |
| Styling | Tailwind CSS 4 |
| AI (content) | OpenAI Responses API with `zodTextFormat` structured outputs |
| AI (images) | Google Generative AI (Gemini) |
| SEO data | DataForSEO (keyword metrics + live SERP) |
| Auth | Google OAuth 2.0 + magic links (Resend) + HMAC-SHA256 session cookies |
| Database | PostgreSQL + Drizzle ORM + pgvector (brands, users, orgs, oauth tokens) |
| Workflow storage (dev) | Local filesystem under `data/` |
| Workflow storage (prod) | Vercel Blob (`BLOB_READ_WRITE_TOKEN`) |
| Validation | Zod throughout — schemas in `lib/schemas.ts`, duplicated locally in `lib/openai.ts` |

### Data Flow

```
POST /api/workflow { step: "analyze" }
  → collectResearch()                   scrapes homepage, blogs, sitemap
  → generateStructuredAnalysis()        OpenAI structured output
  → writes: input.json, manifest.json, research.json, existing-topics.json, analysis.json

POST /api/workflow { step: "suggest-topics" }
  → buildDataForSeoTopicEvidence()      keyword metrics + SERP (optional)
  → generateTopicSuggestions() × up to 3 rounds
  → validateTopicCandidates()           Jaccard dedup
  → reviewTopicCandidatesAgainstSerp()  live SERP overlap check
  → writes: topics.json, topic-candidates.json, topic-validation.json, topic-research.json

POST /api/workflow { step: "generate-blog" }
  → generateApprovedBlog()
  → evaluateBlogQuality()
  → rewriteBlogDraft() × up to 2 passes if score < 80
  → writes: blog.json, blog.md, quality.json, approved-articles.json

(subsequent steps: update-blog, regenerate-blog, approve-blog, prepare-linkedin,
 queue-linkedin-images, approve-linkedin, schedule-linkedin, publish-linkedin)
```

### Storage Model (split)

| Data type | Where it lives |
|---|---|
| Users, orgs, memberships, auth | PostgreSQL (`users`, `organizations`, `memberships`, `auth_accounts`, `auth_magic_links`) |
| Brand profiles + vector embeddings | PostgreSQL (`brands`, `brand_documents`, `brand_chunks`) |
| OAuth connection tokens | PostgreSQL (`oauth_connections`) |
| Workflow artifacts (manifest, research, topics, blog, linkedin) | Flat JSON files — blob prefix `runs/<runId>/` (prod) or `data/runs/<runId>/` (dev) |
| Social project content | Flat JSON files — blob prefix `social/<projectId>/` |

---

## Issues

### ✅ Issue #3 (Round 1) — Authentication — RESOLVED

Google OAuth + magic link email auth is fully in place. The middleware (`middleware.ts`) protects all routes except `/login` and `/api/auth/*`. Sessions are HMAC-SHA256 signed cookies with a 7-day TTL.

**Remaining gap:** Workflow runs in the blob layer are identified only by `runId`. The `runs` DB table has an `organization_id` column but is not populated by the workflow. A user who guesses a `runId` can still read and mutate that run via `/api/workflow` without belonging to the owning org. The DB ownership model needs to be the enforced access gate, not the blob key.

---

### Issue #1 — Serverless Function Timeout Risk (Critical, unchanged)

Every workflow step runs synchronously in a single serverless function invocation. `suggest-topics` alone chains 3 rounds × N OpenAI calls + 1 DataForSEO call + up to 10 SERP lookups. `generate-blog` runs up to 3 sequential completions plus 3 quality evaluations. These chains regularly exceed 60 seconds on Vercel's default function timeout.

**Impact:** Production deployments silently fail mid-workflow. The manifest progress stalls and users have no recovery path.

**Fix:** Move long steps to a queue-backed pattern (Vercel Queue, Trigger.dev) or split steps into sub-steps each finishing in < 30 s and chain them client-side via Server-Sent Events. The `setProgress` infrastructure is already in place — it just needs to run outside the 60-second wall.

---

### Issue #2 — `loadRun()` Issues 16 Sequential Awaits (High, unchanged)

```ts
// lib/storage.ts
const manifest = await readJson(...);
const input    = await readJson(...);
const research = await readJson(...);
// ... 13 more sequential awaits
```

On Vercel Blob each `readJson` is a separate HTTPS round-trip (~50–150 ms). A single `loadRun()` costs ~800–2400 ms of avoidable latency and is called on every API request and multiple times within a single workflow step.

**Fix:** `Promise.all([...])` all 16 reads. Estimated improvement: ~1600 ms → ~150 ms per call.

---

### Issue #4 — OAuth Tokens Stored in Plaintext (Partially resolved)

**Progress:** LinkedIn and social OAuth tokens have been moved from raw blob JSON into the `oauth_connections` PostgreSQL table — a meaningful improvement over the previous state.

**Remaining risk:** The `access_token` and `refresh_token` columns are plaintext `text` fields. Any database credential leak, query log capture, or pg_dump exposure reveals live tokens directly.

**Fix:** Add `encrypted_access_token` / `encrypted_refresh_token` columns using AES-256-GCM (key from `ENCRYPTION_KEY` env var). Two helper functions in `lib/crypto.ts` (`encrypt`, `decrypt`). Migrate existing rows in a single `UPDATE`, then drop the plaintext columns.

---

### Issue #5 — Default Model `gpt-5.4-mini` Does Not Exist (Medium, unchanged)

`lib/openai.ts` and `lib/storage.ts` both default to `"gpt-5.4-mini"`. This is not a valid OpenAI model identifier. Any deployment without `OPENAI_MODEL` set produces 404 / model-not-found errors on every API call.

**Fix:** Change the fallback to `"gpt-4o-mini"` or `"gpt-4o"`.

---

### Issue #6 — Dual Storage Split Creates Silent Inconsistency (New, High)

The `runs` and `run_artifacts` DB tables exist with the right shape (`artifact_type`, `payload` JSONB, `markdown_text`) but the workflow writes exclusively to blob/local JSON. The DB `runs` table row does not reflect the actual artifact state — status, manifest progress, and content live only in the JSON files.

**Impact:** Any DB query for runs (e.g. "find all published articles for this org") returns stale or empty data. The `runs.status` column and `run_artifacts` table are effectively unused. As features that read from the DB are added, this split will cause data integrity bugs that are hard to diagnose.

**Fix:** Wire the workflow write path to populate `run_artifacts` alongside the blob write. The `artifact_type` column maps directly to the existing step names (`analysis`, `topics`, `blog`, `quality`, `linkedin`). Use a dual-write transition period, then remove the blob dependency for artifact reads.

---

### Issue #7 — No Rate Limiting on API Routes (New, Medium)

All API routes (`/api/workflow`, `/api/social`, `/api/brand-guidelines`) accept unlimited requests from any authenticated user. A single user can fire dozens of expensive OpenAI + DataForSEO calls per second, running up API costs with no guard.

**Fix:** Add request rate limiting at the edge using Vercel's `@vercel/kv` or a middleware-level in-memory counter. A simple per-user, per-minute limit on the `/api/workflow` POST endpoint (e.g. 10 requests/min) eliminates the abuse surface. Upstash rate limiting integrates with Next.js middleware in ~20 lines.

---

### Issue #8 — No React Error Boundaries (New, Low)

The workflow workspace, article editor, and social studio are all large client components with no `<ErrorBoundary>` wrapper. A runtime exception (e.g. accessing a field on a null artifact during a partial workflow) crashes the entire page and shows a white screen with no recovery UI.

**Fix:** Wrap each major workspace in an `<ErrorBoundary>` that renders a "Something went wrong — reload the page" fallback. React's built-in class component boundary or a small library (`react-error-boundary`) is sufficient.

---

## Feature Suggestions

### 1. Plagiarism Checker

Add a plagiarism check as a step in the quality gate, running after `evaluateBlogQuality` and before the 80-point approval threshold.

**Two viable implementation paths:**

**A. API-based (Copyscape, Originality.ai, or PlagScan)**
- POST the generated article markdown to the API after stripping markdown syntax
- Receive a similarity percentage and matched source URLs
- Store results in `quality.json` as `{ plagiarismScore: number, flaggedPassages: string[] }`
- Block approval if similarity > 15% (configurable threshold)

**B. Embedding-based self-check (free, uses existing infrastructure)**
- Chunk the generated article into ~200-word passages
- Compute OpenAI embeddings for each passage
- Query `brand_chunks` (pgvector) for cosine similarity > 0.92 against indexed published content
- The pgvector HNSW index is already provisioned — this adds zero new infrastructure
- Limitation: only catches similarity to content already in the brand corpus, not the open web

**Recommended starting point:** Ship the embedding-based check first (zero new API cost), then add Originality.ai for open-web coverage once the workflow is validated.

**Storage addition needed:**
```ts
// quality.json — add plagiarism field
{
  plagiarism: {
    score: number;           // 0–100, lower is better
    provider: "embedding" | "originality.ai";
    flaggedPassages: Array<{ text: string; similarity: number; matchUrl?: string }>;
    checkedAt: string;       // ISO timestamp
  }
}
```

---

### 2. SEO Features Wired into Workflows

Several SEO capabilities are already partially supported by `dataforseo.ts` and the generated blog schema but are not surfaced in the content output or editor UI.

**A. Schema.org JSON-LD (zero new API calls)**

The blog artifact already produces FAQs (`faq[]` with `question`/`answer` pairs) and structured article metadata. Auto-generate `FAQPage` and `Article` JSON-LD from these fields and append to `blog.json` as a `structuredData` field. Inject into the article page via a `<script type="application/ld+json">` tag.

```ts
// Generated at approve-blog step
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": blog.title,
  "author": { "@type": "Organization", "name": brand.name },
  "datePublished": approvedAt,
  "description": blog.meta.description
}
```

**B. Meta description length validation**

`generatedBlogSchema` produces `meta.description` but does not enforce character length. Google truncates at 160 characters; under 120 wastes real estate.

Add a Zod `.refine()` on the description field: `(s) => s.length >= 120 && s.length <= 160`. Surface a warning in the quality score when the description falls outside this range. This is a one-line schema change.

**C. OG / Twitter Card preview in the article editor**

Render a live social card preview in the article editor sidebar showing the title, description, and domain as they would appear on LinkedIn, X, and Facebook. Computed entirely client-side from `blog.meta.title` and `blog.meta.description` — CSS only, no new API calls.

**D. Keyword density analysis**

Count occurrences of the topic's `primaryKeyword` per 100 words in the generated markdown. Flag under-optimized (< 0.5%) or keyword-stuffed (> 2.5%) content in the quality report. Implement as a pure function `analyzeKeywordDensity(markdown: string, keyword: string): number` in `lib/content.ts`.

**E. Readability score (Flesch-Kincaid)**

Implement Flesch-Kincaid reading ease in-process (no API needed). Target score 60–70 (plain English). Surface alongside the AI quality score in the editor panel. A < 50 reading score correlates with high bounce rates and poor dwell time — directly relevant to SEO performance. Pure math: `206.835 - (1.015 × avgSentenceLength) - (84.6 × avgSyllablesPerWord)`.

**F. Dynamic `sitemap.xml` and `robots.txt`**

Add `app/sitemap.ts` and `app/robots.ts` using Next.js App Router's built-in metadata routes. The sitemap should enumerate all published article slugs queried from the DB. Zero dependencies, zero API calls.

**G. Google Search Console integration loop**

After an article is published, OAuth into GSC and pull impressions/clicks/average position per slug. Store in a new `article_performance` table. Feed the top-performing topics as positive examples into the next `suggest-topics` prompt round — topics that ranked well for similar brands become model examples; poorly-ranked topics become exclusion signals. This closes the content → performance → new content feedback loop.

```sql
-- New table
CREATE TABLE article_performance (
  id text PRIMARY KEY,
  run_artifact_id text REFERENCES run_artifacts(id) ON DELETE CASCADE,
  slug text NOT NULL,
  date date NOT NULL,
  impressions integer,
  clicks integer,
  avg_position numeric(5,2),
  created_at timestamptz DEFAULT now()
);
CREATE INDEX ON article_performance(run_artifact_id, date DESC);
```

---

### 3. Better DB Architecture

The current schema has solid foundations — well-normalized, pgvector for embeddings, proper cascade deletes — but several structural gaps should be addressed before the feature set expands.

**A. Fully migrate workflow artifacts to the DB**

The `runs` and `run_artifacts` tables already have the right shape. The migration path:

1. Wire the workflow write path to insert/update `run_artifacts` rows (dual-write alongside blob)
2. Wire `loadRun()` to read from DB when the row exists, fall back to blob for legacy runs
3. Backfill existing blob runs into DB rows via a migration script
4. Remove blob reads from the hot path

This enables proper queries: "find all approved articles across all brands for this org", "list runs by status", "show articles needing review" — none of which are possible against flat JSON files.

**B. Add `content_revisions` table**

Every `update-blog` and `regenerate-blog` call overwrites `blog.md` and `blog.json` with no history. Add a revisions table for undo and audit trail:

```sql
CREATE TABLE content_revisions (
  id text PRIMARY KEY,
  run_artifact_id text REFERENCES run_artifacts(id) ON DELETE CASCADE,
  revision_number integer NOT NULL,
  markdown_text text NOT NULL,
  payload jsonb,
  author_user_id text REFERENCES users(id),
  created_at timestamptz DEFAULT now()
);
CREATE INDEX ON content_revisions(run_artifact_id, revision_number DESC);
```

**C. Add `keyword_rankings` table**

Store periodic keyword position data per brand, enabling ranking trend dashboards:

```sql
CREATE TABLE keyword_rankings (
  id text PRIMARY KEY,
  brand_id text REFERENCES brands(id) ON DELETE CASCADE,
  keyword text NOT NULL,
  date date NOT NULL,
  position numeric(5,2),
  search_volume integer,
  url text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(brand_id, keyword, date)
);
```

**D. Add `scheduled_posts` table**

The current `scheduledFor` timestamp is buried in blob JSON and cannot be queried by a cron job without reading every run's JSON file. Replace it with a queryable table:

```sql
CREATE TABLE scheduled_posts (
  id text PRIMARY KEY,
  entity_type text NOT NULL,  -- 'linkedin' | 'social_platform'
  entity_id text NOT NULL,
  platform text NOT NULL,
  scheduled_for timestamptz NOT NULL,
  fired_at timestamptz,
  error text,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX ON scheduled_posts(scheduled_for, fired_at) WHERE fired_at IS NULL;
```

A Vercel Cron hitting `/api/cron/publish-scheduled` can then do a single indexed query: `WHERE scheduled_for <= now() AND fired_at IS NULL`.

**E. Encrypt OAuth token columns**

See Issue #4. Add `encrypted_access_token` / `encrypted_refresh_token` (bytea) columns alongside the existing plaintext ones. Migrate with a one-time UPDATE. Drop plaintext columns in the following migration.

**F. Fix the `oauth_connections` uniqueness gap**

The `UNIQUE(provider, entity_type, entity_id)` constraint uses `entity_id` which defaults to `''`. Two organization-level connections for the same provider will silently overwrite each other. The constraint should be `UNIQUE(organization_id, provider)` for org-scoped connections and remain as-is for entity-scoped ones. Needs a conditional index or a constraint redesign.

**G. Add stale magic link cleanup**

`auth_magic_links` rows accumulate indefinitely. Add a Vercel Cron job or a trigger that runs `DELETE FROM auth_magic_links WHERE expires_at < NOW()` periodically. Alternatively, add a partial index and let the application clean up on consumption: the `consumed_at IS NULL AND expires_at < NOW()` rows are dead weight.

---

### 4. Better User Experience

**A. Rich text editor**

The current editor in `editable-article-card.tsx` is a textarea with a custom markdown-to-HTML renderer. Replace with [Tiptap](https://tiptap.dev/) (MIT, headless, React-native). Tiptap has a first-party Markdown extension that serializes back to the same markdown format stored in `blog.md` — the artifact format is unchanged. This is the single highest-leverage UX improvement: inline formatting, drag-drop images, slash commands, and collaborative editing all become possible.

**B. Autosave with debounce**

Trigger a debounced `update-blog` call (1.5 s) on every editor change. Show a "saving…" / "saved" indicator in the editor toolbar. The current explicit Save button creates friction and leads to lost edits on navigation. This pairs naturally with the `content_revisions` table — each autosave creates a revision row.

**C. SEO panel in the article editor**

A collapsible right-side drawer (default: collapsed) showing live metrics computed from the markdown text:
- Meta title length (target 50–60 chars) with a character counter
- Meta description length (target 120–160 chars) with a character counter
- Primary keyword density (%)
- Flesch-Kincaid readability score
- OG card preview (title, description, domain)

All computed client-side — no API calls on each keystroke.

**D. Onboarding flow for new users**

New authenticated users land on the home form with no guidance. A 3-step modal on first login:
1. **Create organization** (name + slug)
2. **Connect a brand** (domain URL — the existing form)
3. **Start your first run** (link to the workflow)

The DB already has `organizations` and `memberships` tables — an org is created at step 1 and the user becomes its `owner`.

**E. Transactional email notifications**

Resend is already integrated for magic links. Extend it with workflow event emails:
- "Your brand analysis is ready" (after `analyze` completes)
- "Your article passed quality review" (after `approve-blog`)
- "Your LinkedIn post is scheduled for [date]" (after `schedule-linkedin`)

A single `sendNotification(userId: string, template: NotificationTemplate, data: Record<string, string>)` helper in `lib/notifications.ts`. All three templates can use Resend's React email format.

**F. Keyboard shortcuts**

The workspace has no keyboard handling. Add:
- `Ctrl+S` / `Cmd+S` — save article
- `Ctrl+Shift+P` / `Cmd+Shift+P` — toggle preview mode
- `Escape` — close modals and drawers
- `?` — show shortcut reference overlay

A single `useKeyboardShortcuts` hook in the editor component handles all of these.

**G. Mobile layout for Social Studio**

The social project workspace (`app/social/[projectId]/social-project-client.tsx`) uses a two-column layout that overflows on < 768 px screens. The platform tab bar (Instagram / LinkedIn / X) exceeds the viewport width on mobile. Add `overflow-x-auto` to the tab bar and switch to a single-column stacked layout below the `md` breakpoint.

**H. Empty states**

The profiles page, articles list, and social studio list render nothing when empty. Add illustrated empty states with a clear CTA:
- Profiles: "No projects yet — enter a URL to get started" + arrow to the home form
- Articles: "No articles yet — approve a topic to generate your first article"
- Social Studio: "No social projects — create one from a blog article or URL"

---

### 5. Carry-Forward Feature Suggestions (from Round 1)

These were proposed in the initial review and remain unimplemented:

| Feature | Status | Note |
|---|---|---|
| CMS Publishing Handoff | Not started | Blog artifact is already clean markdown with slug + SEO meta — highest-value next step for distribution |
| Scheduled Publish Execution | Not started | Blocked on `scheduled_posts` DB table (see DB section above) |
| Multi-Article Batch Generation | Not started | `approved-articles.json` array already exists — needs UI queue + parallel generation path |
| Performance Analytics Loop | Not started | Requires GSC OAuth integration (see SEO section above) |
| Claude Model Integration | Not started | `generateApprovedBlog` and `evaluateBlogQuality` are the highest-value swap targets |

---

## Code Quality Observations

### Strengths

- **Auth implementation is correct.** Magic links use HMAC-signed tokens with a 15-minute TTL and single-use enforcement via `consumed_at`. Google OAuth state verification uses a signed cookie with a 10-minute TTL. Both flows follow best practice.
- **DB schema is well-normalized.** Cascade deletes are correctly configured throughout. The `brand_chunks` + pgvector HNSW index with `vector_cosine_ops` is production-ready.
- **Typed end-to-end.** Zod validates every artifact at write time. TypeScript strict mode catches most shape mismatches at build time. `RunBundle` provides a well-typed aggregate read model.
- **Quality gate is real.** The 80-point threshold, 2-pass rewrite loop, and structured evaluation scores are genuinely useful and not cosmetic.
- **Storage abstraction is clean.** The `readJson`/`writeJson` helpers and `USE_BLOB_STORAGE` flag make local development frictionless.
- **Fallback patterns are solid.** `buildFallbackLinkedInDraft` and `buildFallbackSocialPack` ensure the workflow never fully stalls on an LLM parse failure.

### Areas to Address

- **Duplicated Zod schemas.** `lib/openai.ts` defines local schemas (`analysisSchema`, `generatedBlogSchema`, `blogQualitySchema`) that partially duplicate `lib/schemas.ts`. A shape mismatch between them could silently produce data that passes the storage write but fails a later read parse. Consolidate into `lib/schemas.ts` and import from there.

- **`topicTitle` dead field.** `WorkflowInput` declares a `topicTitle` field that the workflow route, the schema, and all callers ignore. Remove it or wire it.

- **Process-level DataForSEO flag.** `let dataForSeoUnavailable = false` in `lib/dataforseo.ts` is module-level state. A single transient 403 permanently disables DataForSEO for the lifetime of the process (or until the next cold start in serverless). Use per-request error handling instead.

- **`oauth_connections` unique constraint gap.** The `UNIQUE(provider, entity_type, entity_id)` constraint with `entity_id` defaulting to `''` means two org-level connections for the same provider silently conflict. See DB section.

- **`brand_chunks.embedding` dimension is hardcoded.** The `vector(1536)` column matches `text-embedding-3-small`. Switching to `text-embedding-3-large` (3072 dims) without a migration will silently truncate embeddings, producing subtly wrong similarity results with no error.

- **No magic link row cleanup.** `auth_magic_links` accumulates stale rows indefinitely. Add periodic cleanup.

- **Word count is approximate.** The `countWords` function strips markdown characters and splits on whitespace. It undercounts headings and overcounts code blocks. The 1200-word cap is enforced only by the prompt, not the code.

---

## Implementation Priorities

### Phase 1 — Fix Active Issues (1–2 weeks)

1. **Fix default model name** — 5 min
2. **Parallelize `loadRun()`** with `Promise.all` — 30 min
3. **Scope blob runs to authenticated org** — verify runId ownership in `/api/workflow` — 1 day
4. **Encrypt OAuth tokens** — AES-256-GCM helper + migration — 1 day
5. **Add React error boundaries** to workspace, editor, social studio — 2 hours
6. **Fix `oauth_connections` unique constraint** — 1 migration file

### Phase 2 — DB Migration and Reliability (2–4 weeks)

7. **Dual-write workflow artifacts to `run_artifacts`** and swap reads to DB — 1 week
8. **Add `content_revisions`, `scheduled_posts`, `keyword_rankings` tables** — 2 days
9. **Async workflow execution** — SSE progress stream + background runner — 1 week
10. **Consolidate duplicate Zod schemas** — 2 hours

### Phase 3 — SEO and UX (1–2 months)

11. **Rich text editor** (Tiptap) — 1 week
12. **Schema.org JSON-LD generation** — 2 days
13. **Meta description validation + keyword density + readability score** — 2 days
14. **SEO panel in article editor** — 3 days
15. **Onboarding flow** (new user modal) — 3 days
16. **Email notifications** via Resend — 2 days
17. **Dynamic sitemap.xml + robots.txt** — 2 hours
18. **Empty states** across all list views — 1 day
19. **Mobile Social Studio layout fix** — 1 day

### Phase 4 — Growth Features

20. **Plagiarism checker** (embedding-based first, then Originality.ai) — 1 week
21. **Google Search Console integration + `article_performance` table** — 1 week
22. **CMS publishing adapters** (Ghost or WordPress first) — 1 week
23. **Scheduled publish cron** using `scheduled_posts` table — 2 days
24. **Multi-article batch generation** — 1 week
25. **Claude model integration** as a backend toggle — 3 days
