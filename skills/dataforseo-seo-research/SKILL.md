---
name: dataforseo-seo-research
description: Use when researching SEO topics, keyword opportunities, SERP evidence, or blog briefs with the DataForSEO MCP server, especially before topic approval or article drafting in Marketier AI.
---

# DataForSEO SEO Research

Use this skill to turn DataForSEO signals into topic ideas and blog briefs that fit Marketier AI’s existing topic queue and drafting flow.

## When To Use

- Keyword discovery for a seed topic or brand
- SERP validation before topic approval
- Content gap analysis against competing pages
- Domain or page-level SEO context for a blog brief
- Evidence gathering before article drafting

## Workflow

1. Start with the seed topic, target market, and any known brand constraints.
2. Pull only the DataForSEO modules needed for the task.
3. Summarize the findings into decision-ready SEO evidence, not raw API output.
4. Convert the evidence into a topic queue entry or blog brief.

## Module Selection

- `KEYWORDS_DATA` for search volume, CPC, keyword difficulty, and related keyword expansion
- `SERP` for live result patterns, ranking domains, titles, and intent clues
- `DATAFORSEO_LABS` for broader keyword and domain expansion beyond the seed query
- `ONPAGE` for page-level optimization signals on a specific URL
- `CONTENT_ANALYSIS` for citations, brand mentions, and sentiment context
- `DOMAIN_ANALYTICS` for site or competitor context when authority matters

## Output Contract

For Marketier AI topic generation, return one compact record per topic with:

- `title`
- `primaryKeyword`
- `searchIntent`
- `rankingRationale`
- `seoAngle`
- `outline`

Keep the proposed set distinct from existing coverage. Prefer a small, high-confidence set over a large noisy one.

For blog briefing, carry forward the chosen topic plus the most useful evidence:

- live SERP pattern
- keyword variations
- supporting subtopics
- likely objections or FAQ angles
- internal-link opportunities

## Guardrails

- Prefer live SERP evidence over generic keyword guesses.
- Do not output duplicated or near-duplicated topics.
- Do not leak credentials or raw auth details.
- If the MCP server is unavailable, fall back to the existing web-search-based workflow and keep the same output shape.

## Reference

See [references/dataforseo-workflow.md](references/dataforseo-workflow.md) for the module-to-output map and the topic/blog handoff template.
