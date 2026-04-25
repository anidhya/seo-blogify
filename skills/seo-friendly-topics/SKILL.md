---
name: seo-friendly-topics
description: Use when creating, validating, or refreshing Marketier AI topic queues from brand analysis, research, and existing coverage before article drafting.
---

# SEO Friendly Topics

Use this skill to turn brand analysis into a deduped topic queue that matches Marketier AI's `topicSuggestionSchema`.

## When To Use

- After brand analysis, before article drafting
- When refreshing or expanding a topic queue
- When existing coverage needs to be deduped against new topic ideas

## Workflow

1. Read the brand analysis, homepage/blog research, sitemap coverage, and any existing topics.
2. Prefer live SERP or DataForSEO evidence when it is available.
3. Draft 10 declarative, headline-style topics with distinct intent and angle.
4. Validate each topic against existing coverage and reject near-duplicates.
5. Rewrite rejected ideas into meaningfully different angles, not paraphrases.
6. Return only the final topic set plus a short rationale for each item.

## Guardrails

- Titles should be declarative, not questions.
- Avoid overlap with existing articles, accepted topics, or obvious SERP clones.
- Keep the set diverse across intent, subtopic, and angle.
- Favor concise, rankable topics over noisy keyword variations.

## Output Contract

Return records with:

- `title`
- `primaryKeyword`
- `searchIntent`
- `rankingRationale`
- `seoAngle`
- `outline`

Keep the output compact and decision-ready. If you cannot produce a unique set, say which coverage blocked it.

See [references/workflow.md](references/workflow.md) for the prompt structure and validation rules.
