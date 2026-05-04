# Marketier AI — Multi-Agent Architecture

## Vision

When the user submits a brand URL, the system immediately spawns a graph of specialized sub-agents that run in parallel. The user sees a live intelligence dashboard building in real time — brand voice, competitor gaps, keyword opportunities, and a topic queue — without waiting for each step to finish before the next begins. Human decisions (topic approval, blog edits, LinkedIn sign-off) remain the only gates. Everything between those gates runs agent-to-agent.

---

## Current vs. Target Execution Model

**Current:** Sequential, user-gated, single HTTP call per step.

```
URL input → analyze (sync) → [user navigates] → suggest-topics (sync) → [user picks] → generate-blog (sync) → ...
```

**Target:** Parallel agent graph, orchestrated automatically. Human is notified when decisions are needed.

```
URL input
  └─ Orchestrator spawns immediately:
       ├─ Brand Intelligence Agent  ─┐
       ├─ Content Coverage Agent    ─┤─→  Topic Strategy Agent → [user approves topic]
       ├─ SEO Research Agent        ─┤                              └─ Article Writer Agent → [user approves]
       ├─ Competitor Intel Agent   ─┘                                    └─ Distribution Agent
       └─ Social Strategy Agent  (runs in parallel, independent)
```

---

## Agent Inventory

### Level 0 — Orchestrator

**`orchestrator`**

The entry point. Created the moment the user submits a URL. Reads the run manifest to determine which agents are ready, blocked, or failed. Manages retries and fan-out. Never does content work itself.

- Input: `{ websiteUrl, companyName?, vision?, keywords?, blogUrls? }`
- Output: spawns all Level 1 agents, watches for gate conditions, spawns Level 2+ agents when dependencies clear
- Maps to: logic currently spread across `POST /api/workflow` and the client-side `page.tsx` form handler

---

### Level 1 — Parallel Agents (no dependencies, start immediately)

These four agents start the moment the orchestrator creates the run.

---

**`brand-intelligence`**

Scrapes the homepage and provided blog URLs. Generates a structured brand analysis: company summary, audience, vision, brand voice, writing style, SEO observations, differentiators, products/services.

- Input: `websiteUrl`, `blogUrls`, `companyName?`, `vision?`, `keywords?`
- Output: `analysis.json` (BrandAnalysis)
- Current code: `collectResearch()` [lib/content.ts:171] + `generateStructuredAnalysis()` [lib/openai.ts:183]
- Model: OpenAI structured output, temperature 0.2

---

**`content-coverage`**

Discovers and indexes all existing content on the site. Fetches sitemap, crawls up to 20 blog pages, extracts existing topic keywords and summaries for the deduplication pool.

- Input: `websiteUrl`, `blogUrls`
- Output: `research.json` (ResearchRecord), `existing-topics.json` (ExistingTopics)
- Current code: `collectSitemapUrls()` [lib/content.ts:95], `deriveExistingTopics()` [lib/topic-dedup.ts:138], `deriveExistingTopicsFromUrls()` [lib/topic-dedup.ts:162]
- No LLM call — pure scraping and heuristic extraction

---

**`seo-research`**

Fetches live keyword metrics, keyword expansion suggestions, and SERP evidence from DataForSEO for up to 12 seed terms derived from the brand analysis. Skipped gracefully when credentials are absent.

- Input: `websiteUrl`, `companyName?`, `keywords?`
  *Note: does not need BrandAnalysis to start; it uses `collectSeedTerms()` which can be seeded from the raw input keywords alone. Once BrandAnalysis is ready, it can run a second enrichment pass.*
- Output: `topic-research.json` (DataForSEO evidence block)
- Current code: `buildDataForSeoTopicEvidence()` [lib/dataforseo.ts:383]
- Optional — if DataForSEO credentials are absent, agent marks itself `skipped`

---

**`social-strategy`** *(new agent)*

Runs fully in parallel, independent of blog workflow. Analyses the brand homepage and derives a social content framework: recommended platforms, post cadence, audience-platform fit, and content angle priorities for Instagram, LinkedIn, and X.

- Input: `websiteUrl`, `companyName?`, `vision?`
- Output: `social-strategy.json` — platform priorities, angle recommendations, voice guidelines for social
- Implemented using `generateSocialContentPack()` [lib/openai.ts:372] with a strategy-focused prompt (no article required)
- Feeds into Social Studio as the default framework for all future projects from this brand

---

**`competitor-intel`** *(new agent)*

Uses DataForSEO SERP lookups on the brand's top 3–5 seed keywords to build a competitor content map. Identifies which domains rank for the brand's topics, what angles they use, and which question clusters are under-served.

- Input: seed keywords from `input.json`, or falls back to brand domain + companyName
- Output: `competitor-intel.json` — top competing domains per keyword, content gap summary, under-served intent clusters
- Current code building block: `lookupTopicSerp()` [lib/dataforseo.ts:235] — currently used only inside SERP dedup, here promoted to a first-class analysis output
- Skipped gracefully when DataForSEO credentials are absent

---

### Level 2 — Dependent Agents (wait for Level 1 completion)

---

**`topic-strategy`**

Waits for: `brand-intelligence` (done) + `content-coverage` (done) + `seo-research` (done or skipped) + `competitor-intel` (done or skipped).

Generates 10 validated, deduplicated, SERP-checked topic candidates. Runs up to 3 rounds if the rejection rate is high.

- Input: `analysis.json`, `research.json`, `existing-topics.json`, `topic-research.json`, `competitor-intel.json`
- Output: `topics.json`, `topic-validation.json`, `topic-candidates.json`
- Current code: `generateValidatedTopicSet()` [app/api/workflow/route.ts:551], `validateTopicCandidates()` [lib/topic-dedup.ts:233], `reviewTopicCandidatesAgainstSerp()` [lib/dataforseo.ts:347]
- Notifies user when ready: "10 topics ready for your review"

---

**`content-calendar`** *(new agent)*

Waits for: `topic-strategy` (done).

Orders the 10 topics into a suggested 4-week publishing calendar. Estimates keyword difficulty tier (low/medium/high) per topic. Suggests which topics to prioritize for quick wins vs long-term authority building. No LLM call required — a structured scoring pass on `topics.json` data.

- Input: `topics.json`, `topic-research.json`, `competitor-intel.json`
- Output: `content-calendar.json` — ordered list with suggested publish weeks, difficulty tier, and rationale
- Displayed on the topics page as a planning view alongside the topic approval queue

---

### Level 3 — Human-Gated Agents (triggered by user decisions)

---

**`article-writer`**

Triggered by: user approves a topic from the topic queue.

Drafts the blog post, evaluates quality, rewrites up to 2 times if score < 80. Persists all artifacts.

- Input: approved `TopicSuggestion`, `analysis.json`, `research.json`, `topic-research.json`
- Output: `blog.json`, `blog.md`, `quality.json`, `approved-articles.json`, `approved-topic.json`
- Current code: `generate-blog` step [app/api/workflow/route.ts:746]
- Notifies user when ready: "Article ready for review — score: 87/100"

---

**`blog-reviser`**

Triggered by: user submits regeneration comments on the article preview page.

Applies editor feedback, re-drafts, re-scores.

- Input: `blog.json`, reviewer `comments`, `analysis.json`, `approved-topic.json`
- Output: updated `blog.json`, `blog-revisions.json`, `regeneration-notes.json`
- Current code: `regenerate-blog` step [app/api/workflow/route.ts:1062]

---

### Level 4 — Post-Approval Distribution Agents

---

**`linkedin-pack`**

Triggered by: user approves the blog post.

Generates LinkedIn carousel prompts (4 slides) and calls Gemini to produce the images.

- Input: `blog.json`, `analysis.json`, `approved-topic.json`
- Output: `linkedin.json` (LinkedInDraft + LinkedInGeneratedImage[])
- Current code: `prepare-linkedin` + `queue-linkedin-images` steps [app/api/workflow/route.ts:894, 920]
- Runs image generation in parallel across all 4 slides (currently sequential — fix here)

---

**`social-distributor`** *(promotes existing Social Studio to first-class agent)*

Triggered by: user approves the blog post (runs alongside `linkedin-pack`).

Seeds a Social Studio project from the approved article. Pre-generates Instagram, LinkedIn, and X drafts using the article content and brand social strategy.

- Input: approved `blog.json`, `social-strategy.json`, `analysis.json`
- Output: new `social/<projectId>/project.json` seeded with platform variants
- Current code: `POST /api/social` [app/api/social/route.ts:182] + `resolveSeedSource()` — already supports seeding from an approved article slug

---

## Agent Dependency Graph

```
[URL submitted]
      │
      └──── Orchestrator creates run, writes input.json + manifest.json
                │
    ┌───────────┼────────────────┬──────────────────┐
    │           │                │                  │
brand-     content-          seo-            competitor-
intelligence  coverage       research           intel
    │           │                │                  │
    └───────────┴────────────────┴──────────────────┘
                              │
                       [all Level 1 done or skipped]
                              │
                    ┌─────────┴──────────┐
               topic-strategy      social-strategy
                    │                    │
             [topic-strategy done]       │
                    │                   Social Studio
             content-calendar           framework ready
                    │
             [user approves topic]
                    │
              article-writer
                    │
             [user approves blog]
                    │
           ┌────────┴──────────┐
      linkedin-pack     social-distributor
           │                   │
      [images ready]    [social project seeded]
```

---

## Communication Model

Agents communicate exclusively through shared storage. No agent calls another agent directly. The orchestrator is the only process aware of the full graph.

### Agent Status in Manifest

Add an `agents` map to `manifest.json`:

```json
{
  "runId": "2026-05-03_acme_a1b2c3d4",
  "agents": {
    "brand-intelligence":  { "status": "done",    "startedAt": "...", "completedAt": "...", "retries": 0 },
    "content-coverage":    { "status": "done",    "startedAt": "...", "completedAt": "...", "retries": 0 },
    "seo-research":        { "status": "skipped", "reason": "no credentials" },
    "competitor-intel":    { "status": "running", "startedAt": "...", "completedAt": null,  "retries": 0 },
    "social-strategy":     { "status": "running", "startedAt": "...", "completedAt": null,  "retries": 0 },
    "topic-strategy":      { "status": "waiting", "waitingFor": ["brand-intelligence", "content-coverage", "seo-research", "competitor-intel"] },
    "content-calendar":    { "status": "idle" },
    "article-writer":      { "status": "idle" },
    "linkedin-pack":       { "status": "idle" },
    "social-distributor":  { "status": "idle" }
  }
}
```

### Agent Status Values

| Status | Meaning |
|---|---|
| `idle` | Not yet triggered |
| `running` | Currently executing |
| `waiting` | Blocked on one or more dependencies |
| `done` | Completed, artifact written |
| `skipped` | Dependency not met (e.g., missing credentials) |
| `failed` | Errored, retry count recorded |
| `retrying` | Re-running after a failure |

### New Artifact Files

| File | Written by | Contains |
|---|---|---|
| `competitor-intel.json` | `competitor-intel` | Top SERP competitors per seed keyword, content gap summary |
| `social-strategy.json` | `social-strategy` | Platform priorities, angle recommendations, voice guidelines |
| `content-calendar.json` | `content-calendar` | Ordered topic schedule with difficulty tiers and rationale |

All existing artifact files (`analysis.json`, `research.json`, `topics.json`, etc.) remain unchanged.

---

## API Design

### New Endpoints

```
POST /api/agents/start
  Body: { websiteUrl, companyName?, vision?, keywords?, blogUrls? }
  → Creates run, writes input.json + manifest.json
  → Enqueues all Level 1 agents
  → Returns: { runId }
  (replaces POST /api/workflow { step: "analyze" })

GET  /api/agents/status?runId=...
  → Returns manifest.agents map — all agent statuses in one call
  → Used by the live dashboard to stream progress without polling individual files

POST /api/agents/[agentId]/run
  Body: { runId, ...agentSpecificPayload }
  → Executes a single named agent
  → Called by the orchestrator or by background workers
  → Returns: { agentId, status, artifact? }
```

### Existing Endpoints (unchanged)

`POST /api/workflow` handles all human-gated steps that require explicit user input:
- `update-analysis` — user edits the brand analysis
- `update-blog` — user edits the blog markdown
- `approve-blog` — user approves / sends back for revision
- `approve-linkedin` — user approves the LinkedIn pack
- `schedule-linkedin` — user schedules a post
- `publish-linkedin` — user publishes immediately

These remain synchronous — they are short operations triggered by human decisions, not AI chains.

---

## Progress Dashboard

Replace the current 3-step progress bar (`Analyzed → Topics → Articles`) with a live agent panel visible immediately after URL submission.

```
┌─────────────────────────────────────────────────────┐
│  acme.com — Intelligence in progress                │
│                                                     │
│  ● Brand Intelligence      ████████████  Done       │
│  ● Content Coverage        ████████████  Done       │
│  ○ SEO Research            ██████░░░░░░  Running    │
│  ○ Competitor Intel        ████░░░░░░░░  Running    │
│  ◌ Topic Strategy          ░░░░░░░░░░░░  Waiting    │
│  ◌ Social Strategy         ░░░░░░░░░░░░  Waiting    │
│                                                     │
│  Estimated ready in ~40 seconds                     │
└─────────────────────────────────────────────────────┘
```

**Implementation:** The existing `useWorkflowProgress` hook [lib/use-workflow-progress.ts:12] polls `manifest.progress`. Extend it to also return `manifest.agents` so the panel renders per-agent status without any additional API calls.

Each agent writes a short `stageLabel` to `manifest.agents[agentId].currentLabel` as it progresses (e.g., "Fetching sitemap", "Running SERP checks", "Validating topics").

---

## Execution Backend

Each agent runs as an isolated async function. The execution backend has two modes:

### Mode A — In-Process (development, small deploys)

All agents run inside the Next.js process using `Promise.all` for parallel Level 1 agents. Works today without new infrastructure. Acceptable for < 30-second total run times.

```ts
// app/api/agents/start/route.ts
export async function POST(request: Request) {
  const body = await request.json();
  const { runId } = await createRun(body, model);

  // Start Level 1 agents in true parallel — no sequential awaits
  Promise.allSettled([
    runAgent("brand-intelligence", runId, body),
    runAgent("content-coverage", runId, body),
    runAgent("seo-research", runId, body),
    runAgent("competitor-intel", runId, body),
    runAgent("social-strategy", runId, body)
  ]).then(() => maybeStartLevel2(runId)); // fire Level 2 after Level 1 settles

  // Return immediately — client polls /api/agents/status
  return NextResponse.json({ runId });
}
```

### Mode B — Queue-Backed (production)

Each `runAgent()` call enqueues a job (Vercel Queue, Trigger.dev, or a simple cron + DB job table). Workers pick up jobs, run the agent function, write artifacts, update manifest. The orchestrator is itself a job that polls for settled dependencies and enqueues Level 2 jobs when they clear.

This is the correct path for production — it eliminates the 60-second timeout risk entirely and enables retries without user action.

```
User submits URL
    │
    POST /api/agents/start
        → writes input.json
        → enqueues: brand-intelligence, content-coverage, seo-research, competitor-intel, social-strategy
        → returns { runId } in < 200ms

Workers (Vercel Queue / Trigger.dev):
    → pick up brand-intelligence → runs → writes analysis.json → updates manifest
    → pick up content-coverage  → runs → writes research.json  → updates manifest
    → ...

Orchestrator job (triggered whenever a job completes):
    → checks manifest.agents
    → if all Level 1 done: enqueues topic-strategy + content-calendar
    → if topic approved: enqueues article-writer
    → if blog approved: enqueues linkedin-pack + social-distributor
```

---

## Agent Implementation Pattern

Each agent is a pure async function that follows the same contract:

```ts
// lib/agents/types.ts
export type AgentStatus = "idle" | "running" | "waiting" | "done" | "skipped" | "failed" | "retrying";

export type AgentContext = {
  runId: string;
  input: RunInputRecord;
  setLabel: (label: string) => Promise<void>;  // writes currentLabel to manifest
};

export type AgentResult = {
  agentId: string;
  status: "done" | "skipped" | "failed";
  error?: string;
};

export type AgentFn = (context: AgentContext) => Promise<AgentResult>;
```

```ts
// lib/agents/brand-intelligence.ts
export const brandIntelligenceAgent: AgentFn = async ({ runId, input, setLabel }) => {
  await setLabel("Scraping homepage and blog pages");
  const research = await collectResearch(input.websiteUrl, input.blogUrls);
  await saveResearch(runId, research);

  await setLabel("Analyzing brand voice and audience");
  const analysis = await generateStructuredAnalysis(buildAnalysisPrompt(input, research));
  await saveAnalysis(runId, analysis);

  return { agentId: "brand-intelligence", status: "done" };
};
```

```ts
// lib/agents/index.ts
export const AGENT_REGISTRY: Record<string, AgentFn> = {
  "brand-intelligence": brandIntelligenceAgent,
  "content-coverage": contentCoverageAgent,
  "seo-research": seoResearchAgent,
  "competitor-intel": competitorIntelAgent,
  "social-strategy": socialStrategyAgent,
  "topic-strategy": topicStrategyAgent,
  "content-calendar": contentCalendarAgent,
  "article-writer": articleWriterAgent,
  "linkedin-pack": linkedinPackAgent,
  "social-distributor": socialDistributorAgent
};
```

### Dependency Declaration

```ts
// lib/agents/deps.ts
export const AGENT_DEPS: Record<string, string[]> = {
  "brand-intelligence":  [],
  "content-coverage":    [],
  "seo-research":        [],
  "competitor-intel":    [],
  "social-strategy":     [],
  "topic-strategy":      ["brand-intelligence", "content-coverage", "seo-research", "competitor-intel"],
  "content-calendar":    ["topic-strategy"],
  "article-writer":      ["topic-strategy"],       // also gates on user approval event
  "linkedin-pack":       ["article-writer"],        // also gates on user approval event
  "social-distributor":  ["article-writer", "social-strategy"]
};

// Terminal statuses that satisfy a dependency
export const SATISFIED_STATUSES: AgentStatus[] = ["done", "skipped"];
```

The orchestrator resolves `waitingFor` by checking whether all declared dependencies have a `SATISFIED_STATUSES` status in the manifest.

---

## Migration from Current Code

The current `POST /api/workflow` handler is a large switch-case (`analyze`, `suggest-topics`, `generate-blog`, ...). Migration is additive — no existing behavior is removed.

### Phase 1 — Extract and register agent functions (no user-visible change)

1. Move the code blocks from each `if (step === "...")` branch into a named `AgentFn` in `lib/agents/`.
2. Wire them to `AGENT_REGISTRY`.
3. Keep the existing `POST /api/workflow` handler working — it now calls `AGENT_REGISTRY[step](context)` instead of inlining the logic.

### Phase 2 — Add orchestration endpoint

1. Create `POST /api/agents/start` that fires Level 1 agents in parallel via `Promise.allSettled`.
2. Create `GET /api/agents/status` that returns `manifest.agents`.
3. Update `useWorkflowProgress` to consume `manifest.agents`.
4. Update the landing page form to call `/api/agents/start` instead of `/api/workflow` for the `analyze` step.
5. Wire the orchestrator callback to enqueue `topic-strategy` when Level 1 settles.

### Phase 3 — New agents

1. Implement `competitor-intel` agent (promote `lookupTopicSerp` into a first-class analysis step).
2. Implement `social-strategy` agent (new prompt — derives social framework from brand analysis).
3. Implement `content-calendar` agent (scoring + ordering, no LLM required).
4. Wire `social-distributor` to auto-seed a Social Studio project on blog approval.

### Phase 4 — Queue backend (production)

Replace `Promise.allSettled` fan-out in Phase 2 with Vercel Queue or Trigger.dev jobs. Each agent function is identical — only the dispatch mechanism changes.

---

## Notification Model

When a human decision is required, the system surfaces a clear prompt in the UI.

| Agent completes | User sees |
|---|---|
| `topic-strategy` done | "10 topics ready — pick one to generate your first article" |
| `article-writer` done | "Article ready — score 87/100. Review and approve or request changes." |
| `linkedin-pack` done | "LinkedIn carousel ready — 4 slides generated. Approve to schedule or publish." |
| `social-distributor` done | "Social drafts seeded — Instagram, LinkedIn, and X posts ready for your review." |
| `competitor-intel` done | "Competitor analysis ready — 3 content gap opportunities identified." |

Notifications can be surfaced as:
- In-app banners on the run workspace page (existing pattern)
- Browser push notifications (requires `PushSubscription` API)
- Email (if user email is available — tied to auth Phase 1 from `system.md`)

---

## Summary of New Files

```
lib/agents/
  types.ts                   AgentFn, AgentContext, AgentResult, AgentStatus
  deps.ts                    AGENT_DEPS, SATISFIED_STATUSES, dependency resolver
  orchestrator.ts            runAgentGraph(), maybeAdvanceGraph()
  brand-intelligence.ts      → extracts from api/workflow/route.ts analyze branch
  content-coverage.ts        → extracts from api/workflow/route.ts analyze branch
  seo-research.ts            → extracts from lib/dataforseo.ts buildDataForSeoTopicEvidence
  competitor-intel.ts        NEW — promotes lookupTopicSerp to analysis agent
  social-strategy.ts         NEW — social framework from brand data
  topic-strategy.ts          → extracts from api/workflow/route.ts suggest-topics branch
  content-calendar.ts        NEW — scoring + ordering on topics.json
  article-writer.ts          → extracts from api/workflow/route.ts generate-blog branch
  blog-reviser.ts            → extracts from api/workflow/route.ts regenerate-blog branch
  linkedin-pack.ts           → extracts from api/workflow/route.ts prepare-linkedin + queue-linkedin-images
  social-distributor.ts      → promotes existing Social Studio seeding to agent

app/api/agents/
  start/route.ts             POST — creates run, fans out Level 1 agents
  status/route.ts            GET  — returns manifest.agents map
  [agentId]/run/route.ts     POST — runs a single named agent (for queue workers)
```

---

## What Stays the Same

- All existing storage functions in `lib/storage.ts` — unchanged
- All existing Zod schemas in `lib/schemas.ts` — unchanged (one new: `agentStatusSchema`)
- All existing UI pages — unchanged; only the progress component and landing form handler update
- The `POST /api/workflow` endpoint — kept for backward compatibility and for human-gated steps
- `design.md` — unchanged; the agent dashboard uses the existing card, chip, and progress patterns
