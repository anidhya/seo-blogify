# DataForSEO Workflow Reference

This skill is meant to support Marketier AI’s topic queue and later blog drafting. Keep outputs short, structured, and compatible with the app’s existing topic schema.

## Default Research Stack

Use the smallest stack that answers the question:

1. `KEYWORDS_DATA` for keyword discovery and metrics.
2. `SERP` for live search results and intent checks.
3. `DATAFORSEO_LABS` for broader keyword and domain expansion.
4. `ONPAGE` only when a specific URL needs audit signals.
5. `CONTENT_ANALYSIS` only when citations, mentions, or sentiment matter.
6. `DOMAIN_ANALYTICS` only when domain authority or site context changes the recommendation.

## Topic Queue Handoff

Convert the research into records that match the app’s topic model:

```json
{
  "title": "Topic title",
  "primaryKeyword": "target keyword",
  "searchIntent": "informational | commercial | navigational",
  "rankingRationale": "Why this can rank",
  "seoAngle": "Distinct angle that avoids overlap",
  "outline": [
    "H2 section 1",
    "H2 section 2",
    "H2 section 3"
  ]
}
```

## Blog Brief Handoff

When a topic is approved, keep the brief compact:

- seed topic
- target keyword
- supporting keywords
- top SERP themes
- differentiation angle
- FAQ candidates
- internal-link targets

Use those signals to enrich the article prompt, but do not paste raw API payloads into the draft prompt unless they are being summarized first.

## Decision Rules

- Prefer ranking evidence from live SERPs over static keyword metrics when the two disagree.
- Prefer intent clarity over volume when selecting a topic for the queue.
- Reject obvious rewrites of existing coverage.
- Keep the final topic set diverse across intent, format, and subtopic.

## Reuse Notes

- The skill is most useful before `suggest-topics` and before `generate-blog`.
- Keep future prompts aligned with the same topic fields so the app can consume them without schema changes.
