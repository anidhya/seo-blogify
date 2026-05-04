# Marketier AI — Code Review

## What the Software Does

Marketier AI is a Next.js 15 application that automates a brand-to-published-content pipeline. Given a company website URL and optional blog URLs, it:

1. Scrapes and snapshots the site (homepage + blog pages + sitemap)
2. Generates a brand analysis (voice, audience, SEO gaps) via OpenAI
3. Proposes 10 deduplicated, SERP-validated blog topics
4. Drafts and quality-gates a blog post (1200-word cap, 80-point quality threshold)
5. Produces a LinkedIn publishing pack with 4 carousel prompts and Gemini-generated images
6. Supports a separate Social Studio that generates Instagram, LinkedIn, and X content for any URL or manual topic

The workflow is stateless between requests. Every step writes its output as a JSON (or Markdown) file, and a `manifest.json` tracks progress percentage and step completion.

---

## Architecture Summary

| Layer | Technology |
|---|---|
| Framework | Next.js 15 App Router |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 4 |
| AI (content) | OpenAI Responses API with `zodTextFormat` structured outputs |
| AI (images) | Google Generative AI (Gemini) |
| SEO data | DataForSEO (keyword metrics + live SERP) |
| Storage (dev) | Local filesystem under `data/` |
| Storage (prod) | Vercel Blob (`BLOB_READ_WRITE_TOKEN`) |
| Validation | Zod throughout — schemas in `lib/schemas.ts`, duplicate local definitions in `lib/openai.ts` |

### Data Flow

```
POST /api/workflow { step: "analyze" }
  → collectResearch()        scrapes homepage, blogs, sitemap
  → generateStructuredAnalysis()   OpenAI structured output
  → writes: input.json, manifest.json, research.json, existing-topics.json, analysis.json

POST /api/workflow { step: "suggest-topics" }
  → buildDataForSeoTopicEvidence()   keyword metrics + SERP (optional)
  → generateTopicSuggestions() × up to 3 rounds
  → validateTopicCandidates()        Jaccard dedup
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

### Storage Model

Each run is a folder `data/runs/<runId>/` (or a blob prefix `runs/<runId>/`) containing ~16 flat JSON files. `loadRun()` reads all 16 independently and returns a `RunBundle`. On Vercel Blob each file is fetched via a separate HTTP request.

---

## Top 5 Pending Issues

### 1. Vercel Function timeout risk

Every workflow step runs synchronously in a single serverless function invocation. `suggest-topics` alone can run 3 rounds × N OpenAI calls + 1 DataForSEO evidence call + up to 10 SERP overlap lookups. `generate-blog` runs up to 3 sequential LLM completions (draft + 2 rewrites) plus 3 quality evaluations. These chains regularly exceed 60 seconds on Vercel's default function timeout.

**Impact:** Production deployments silently fail mid-workflow. The manifest progress stalls and users have no path to recover.

**Fix:** Move long steps to a streaming or queue-backed pattern (Vercel Queue, a background route with Server-Sent Events, or Trigger.dev). The progress infrastructure (`setProgress`) already exists — it just needs to run outside the 60-second wall.

---

### 2. `loadRun()` issues 16 sequential awaits

```ts
// lib/storage.ts:1181
const manifest = await readJson(...);
const input    = await readJson(...);
const research = await readJson(...);
// ... 13 more sequential awaits
```

Every call to `loadRun()` serializes 16 I/O operations. In development (local FS) this is fast. On Vercel Blob, each `readJson` is a separate HTTPS round-trip (≈50–150 ms). A single `loadRun()` call therefore costs ~800–2400 ms of avoidable latency.

**Fix:** Wrap all reads in a single `Promise.all([...])`.

---

### 3. No authentication or access control

Run IDs (`runs/<runId>`) and Social Project IDs (`social/<projectId>`) are the only access gate. Any party who discovers a run ID — from a shared link, browser history leak, or enumeration — can read or mutate any run. The `/api/workflow` POST endpoint and all run-level API routes have no session check.

**Impact:** Data is effectively public to anyone with the URL. In a multi-tenant or team context this is a critical data-isolation failure.

**Fix:** Add a session layer (NextAuth.js, Clerk, or Supabase Auth) and scope every storage read/write to an authenticated user/workspace ID.

---

### 4. OAuth access tokens stored in plaintext JSON

LinkedIn and Social OAuth tokens (including `accessToken`, `refreshToken`) are embedded in `linkedin.json` and `project.json`. In development these sit on disk. On Vercel Blob they are stored as private blobs, but they are not encrypted at rest beyond Vercel's storage-level protection and are returned verbatim from the API response payloads in `loadRun()`.

**Impact:** A single blob enumeration or a log that captures a full API response exposes live tokens.

**Fix:** Store tokens in a dedicated encrypted store (Vercel KV with encryption, a secrets manager, or a database with encrypted columns). Never include raw tokens in JSON payloads sent to the frontend.

---

### 5. Default model name `gpt-5.4-mini` does not exist

`lib/openai.ts:181` and `lib/storage.ts:1155` both default to `"gpt-5.4-mini"`. This is not a valid OpenAI model identifier. Any deployment without `OPENAI_MODEL` set in the environment will produce 404 / model-not-found errors from OpenAI on every API call.

**Fix:** Change the fallback to a valid model such as `"gpt-4o-mini"` (fast, cheap) or `"gpt-4o"` (higher quality), matching your billing tier and intended output quality.

---

## Feature Suggestions

### 1. CMS Publishing Handoff

The README notes "CMS publishing is not wired yet." The blog output is already clean markdown with a `slug`, SEO meta, and key takeaways — everything a CMS adapter needs. Add publish targets for Webflow, Contentful, WordPress (REST or XML-RPC), Ghost, or Notion. A simple adapter interface (`publishToCms(articleSlug, runId)`) would let each CMS be a plugin.

### 2. Scheduled Publish Execution

The `schedule-linkedin` step saves a `scheduledFor` timestamp but nothing triggers publication at that time. Add a cron job (Vercel Cron, GitHub Actions, or an external service) that polls `linkedin.json` and fires `publish-linkedin` when `status === "scheduled"` and `scheduledFor` is in the past. Same logic applies to Social Studio schedules.

### 3. Multi-Article Runs

Currently a run generates one blog post per topic approval. Power users will want to approve 3–5 topics in a session and queue them as parallel generation jobs. Add a `generate-batch` step and a multi-article articles view. The storage model already supports `approved-articles.json` as an array — it just needs a UI queue and a parallel generation path.

### 4. Performance Analytics Loop

After an article publishes, there is no feedback path. Integrate Google Search Console (via OAuth) to pull click-through and impression data per slug, then surface this data on the article preview page and feed it back into the next topic suggestion round. Topics whose articles ranked well become model examples; poorly-ranked ones become exclusion signals.

### 5. Team Workspace and User Accounts

There is no concept of a user account or team. Adding a minimal workspace model (users → workspaces → runs) would unlock: shared brand profiles, multi-reviewer approval flows, and the audit trail already implied by the approval and revision schemas. This naturally resolves the access control gap from Issue 3.

### 6. Claude Model Integration

The app is hardwired to OpenAI. Adding Anthropic's Claude models (particularly `claude-opus-4-7` or `claude-sonnet-4-6`) as an optional backend would improve long-form coherence, reduce AI-sounding patterns that the quality gate already penalises, and give users a cost/quality toggle. The `generateApprovedBlog` and `evaluateBlogQuality` functions are the highest-value swap targets.

---

## Code Quality Observations

### Strengths

- **Typed end-to-end.** Zod validates every artifact at write time. `RunBundle` provides a well-typed aggregate read model. TypeScript strict mode catches most shape mismatches at build time.
- **Quality gate is built in.** The 80-point threshold, 2-pass rewrite loop, and structured evaluation scores are genuinely useful and not just cosmetic.
- **Storage abstraction is clean.** The `readJson`/`writeJson` helpers, `USE_BLOB_STORAGE` flag, and dual-path `loadRun` make local development frictionless and Vercel deployment nearly zero-config.
- **Fallback patterns are solid.** `buildFallbackLinkedInDraft` and `buildFallbackSocialPack` ensure the workflow never fully stalls on an LLM parse failure.
- **Design system is documented.** `design.md` captures colors, typography, spacing, and component patterns with enough precision to keep a team consistent across routes.

### Areas to Address

- **Duplicated Zod schemas.** `lib/openai.ts` defines local schemas (`analysisSchema`, `generatedBlogSchema`, `blogQualitySchema`, etc.) that partially duplicate `lib/schemas.ts`. A shape mismatch between them could silently produce data that passes the storage write but fails a later read parse.
- **`topicTitle` dead field.** `WorkflowInput` declares a `topicTitle` field that the workflow route, the schema, and all callers ignore. It should be removed or wired.
- **Process-level DataForSEO flag.** `let dataForSeoUnavailable = false` in `lib/dataforseo.ts` is module-level state. In a long-lived process, a single transient 403 permanently disables DataForSEO until the process restarts. In a serverless environment the flag resets every cold start but provides false assurance. Use per-request error handling instead.
- **`loadRun()` on the hot path.** Multiple API routes call `loadRun()` at the start of every request and the workflow route calls it repeatedly within a single step. Caching the bundle within a request context (via `React.cache` or a request-scoped map) would eliminate redundant reads.
- **Word count is approximate.** The `countWords` function in `storage.ts` strips markdown syntax characters and splits on whitespace. It undercounts headings and overcounts code blocks. This is fine as a rough gate but the 1200-word cap is enforced only by the prompt, not by the code.
