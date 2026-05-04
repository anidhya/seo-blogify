# SEO Friendly Articles Reference

This skill mirrors Marketier AI's `generate-blog`, `update-blog`, `regenerate-blog`, and `approve-blog` flow.

## Input Set

Use the smallest useful bundle:

- approved topic
- brand analysis
- homepage research
- supporting blog research
- sitemap URLs
- internal-link hints
- optional topic research evidence

## Article Structure

Keep the draft in this order:

1. hook
2. answer-first intro
3. short orientation section like "In this article"
4. 3 to 6 H2 sections
5. concise takeaway block
6. FAQs
7. SEO meta
8. 3 image prompts
9. internal link suggestions
10. markdown body

## Quality Gate

Score the draft for:

- sentence variety
- specificity
- natural transitions
- reduced repetition
- concrete examples
- absence of AI fluff
- brand consistency

Treat `80` as the pass threshold. If the score is below threshold, rewrite only the weak sections and preserve the approved topic and SEO intent.

## Article Rules

- Stay under 1200 words for the main body.
- Return exactly 3 image prompts.
- Return 3 to 5 internal link suggestions.
- Keep metadata useful but secondary to the article itself.

## Output Shape

Return a package aligned to the app schema:

- `title`
- `slug`
- `summary`
- `keyTakeaways`
- `imagePrompts`
- `internalLinks`
- `meta`
- `faqs`
- `markdown`

If the article is not ready, say why and what needs another rewrite pass.
