---
name: seo-friendly-articles
description: Use when turning an approved topic and brand research into a publication-ready Marketier AI blog draft with SEO metadata, FAQs, image prompts, internal links, and quality-gated rewrites.
---

# SEO Friendly Articles

Use this skill to draft the blog after a topic has been approved.

## When To Use

- After a topic is approved
- Before article editing or regeneration
- When preparing the approved article for LinkedIn handoff

## Workflow

1. Gather the approved topic, brand analysis, homepage/blog research, sitemap coverage, and internal-link hints.
2. Build a prompt around an answer-first intro, short orientation, 3 to 6 strong H2 sections, a takeaway block, FAQs, SEO meta, 3 image prompts, and 3 to 5 internal links.
3. Keep the article body under 1200 words.
4. Score the draft for human feel, specificity, transitions, repetition, examples, fluff, and brand fit.
5. Rewrite only the weak parts if the score is below the publication threshold.
6. Preserve the approved topic, keyword intent, and overall structure unless a section is clearly failing.
7. Hand off to LinkedIn only after the blog passes review or is explicitly approved.

## Guardrails

- No filler, vague AI phrasing, or repetitive transitions.
- Keep paragraphs short and concrete.
- Use the primary keyword naturally and support it with related terms.
- Keep the 3 image prompts visually consistent.
- Ground internal links in the available URLs and existing coverage.

## Output Contract

Return a `GeneratedBlog`-style article package with:

- title, slug, summary
- key takeaways
- 3 image prompts
- internal links
- SEO meta
- FAQs
- markdown body

Also return a compact quality summary and approval status. See [references/workflow.md](references/workflow.md) for the prompt structure and quality gate.
