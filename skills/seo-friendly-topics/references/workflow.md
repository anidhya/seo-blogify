# SEO Friendly Topics Reference

This skill mirrors Marketier AI's `suggest-topics` flow.

## Input Set

Use the smallest useful bundle:

- brand analysis
- homepage and blog research
- sitemap coverage
- existing topics
- optional DataForSEO or live SERP evidence

## Topic Rules

- Suggest 10 topics for a fresh queue.
- Make each topic distinct in intent, keyword cluster, or angle.
- Treat sitemap URLs as existing coverage.
- Reject topics that are too close to existing titles, primary keywords, or search intent.
- Rewrite rejected topics into a materially different angle.

## Validation Hints

- Prefer rankability and intent clarity over raw volume.
- Keep titles declarative and non-question-form.
- Use the `title`, `primaryKeyword`, and `searchIntent` trio as the main dedupe surface.

## Prompt Shape

When drafting topics, keep the prompt focused on:

1. existing coverage
2. already accepted topics
3. brand analysis
4. research block
5. optional live SEO evidence

## Output Shape

Return concise topic records that match the app schema:

```json
{
  "title": "Topic title",
  "primaryKeyword": "target keyword",
  "searchIntent": "informational | commercial | navigational",
  "rankingRationale": "Why this can rank",
  "seoAngle": "Distinct angle that avoids overlap",
  "outline": ["H2 section 1", "H2 section 2", "H2 section 3"]
}
```
