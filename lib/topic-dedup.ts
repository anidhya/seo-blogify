import type { ExistingTopic, PageSnapshot, TopicSuggestion, TopicValidationRejected } from "@/lib/types";

const STOPWORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "blog",
  "by",
  "for",
  "from",
  "guide",
  "how",
  "in",
  "into",
  "is",
  "it",
  "of",
  "on",
  "or",
  "our",
  "the",
  "their",
  "this",
  "to",
  "with",
  "what",
  "why",
  "your"
]);

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function tokenize(value: string) {
  return normalize(value)
    .split(/\s+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 2 && !STOPWORDS.has(part));
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function stem(value: string) {
  return value.replace(/(ing|ed|es|s)$/u, "");
}

function meaningfulTokens(value: string) {
  return unique(tokenize(value).map(stem));
}

function jaccard(left: string[], right: string[]) {
  const leftSet = new Set(left);
  const rightSet = new Set(right);
  const intersection = [...leftSet].filter((item) => rightSet.has(item)).length;
  const union = new Set([...leftSet, ...rightSet]).size;
  return union === 0 ? 0 : intersection / union;
}

function extractPrimaryKeyword(title: string, excerpt: string) {
  const segments = [title, excerpt]
    .flatMap((value) => value.split(/[:|–—-]/g))
    .map((segment) => segment.trim())
    .filter(Boolean);

  const candidate = segments[0] || title;
  const tokens = meaningfulTokens(candidate);
  if (tokens.length >= 2) {
    return tokens.slice(0, Math.min(tokens.length, 5)).join(" ");
  }

  return meaningfulTokens(`${title} ${excerpt}`).slice(0, 5).join(" ");
}

function extractSummary(excerpt: string) {
  const parts = excerpt.split(/[.!?]/g).map((part) => part.trim()).filter(Boolean);
  return parts.slice(0, 2).join(". ") || excerpt.slice(0, 240);
}

function extractKeywords(title: string, excerpt: string) {
  const tokens = meaningfulTokens(`${title} ${excerpt}`);
  return unique(tokens).slice(0, 8);
}

export function deriveExistingTopics(homepage: PageSnapshot, blogs: PageSnapshot[]): ExistingTopic[] {
  const sources = [homepage, ...blogs];

  return sources.map((page) => {
    const primaryKeyword = extractPrimaryKeyword(page.title, page.excerpt);
    return {
      sourceUrl: page.url,
      sourceTitle: page.title,
      title: page.title,
      primaryKeyword,
      summary: extractSummary(page.excerpt),
      keywords: extractKeywords(page.title, page.excerpt)
    };
  });
}

function scoreComparison(candidate: TopicSuggestion, existing: ExistingTopic) {
  const candidateTitleTokens = meaningfulTokens(candidate.title);
  const existingTitleTokens = meaningfulTokens(existing.title);
  const candidateIntentTokens = meaningfulTokens(
    `${candidate.searchIntent} ${candidate.seoAngle} ${candidate.rankingRationale} ${candidate.outline.join(" ")}`
  );
  const existingTokens = meaningfulTokens(
    `${existing.title} ${existing.primaryKeyword} ${existing.summary} ${existing.keywords.join(" ")}`
  );
  const titleScore = jaccard(candidateTitleTokens, existingTitleTokens);
  const intentScore = jaccard(candidateIntentTokens, existingTokens);
  const keywordScore = normalize(candidate.primaryKeyword) === normalize(existing.primaryKeyword)
    ? 1
    : jaccard(meaningfulTokens(candidate.primaryKeyword), meaningfulTokens(existing.primaryKeyword));

  const score = titleScore * 0.45 + intentScore * 0.35 + keywordScore * 0.2;
  const similarTerms = unique([
    ...candidateTitleTokens.filter((token) => existingTokens.includes(token)),
    ...meaningfulTokens(candidate.primaryKeyword).filter((token) => existingTokens.includes(token))
  ]);

  return { score, titleScore, intentScore, keywordScore, similarTerms };
}

export function validateTopicCandidates(
  existingTopics: ExistingTopic[],
  candidates: TopicSuggestion[]
) {
  const accepted: TopicSuggestion[] = [];
  const rejected: TopicValidationRejected[] = [];
  const comparisonPool: ExistingTopic[] = [...existingTopics];

  for (const topic of candidates) {
    let bestMatch: { topic: ExistingTopic; score: number; titleScore: number; intentScore: number; keywordScore: number; similarTerms: string[] } | null = null;

    for (const existing of comparisonPool) {
      const comparison = scoreComparison(topic, existing);

      if (!bestMatch || comparison.score > bestMatch.score) {
        bestMatch = { topic: existing, ...comparison };
      }
    }

    const overlap = bestMatch ?? {
      topic: comparisonPool[0] ?? {
        sourceUrl: "",
        sourceTitle: "",
        title: "",
        primaryKeyword: "",
        summary: "",
        keywords: []
      },
      score: 0,
      titleScore: 0,
      intentScore: 0,
      keywordScore: 0,
      similarTerms: []
    };

    const reject =
      overlap.score >= 0.45 ||
      overlap.titleScore >= 0.5 ||
      (overlap.keywordScore >= 0.75 && overlap.intentScore >= 0.35);

    if (reject) {
      rejected.push({
        topic,
        reason:
          overlap.keywordScore >= 0.75
            ? "Primary keyword overlaps an existing article."
            : overlap.titleScore >= 0.5
              ? "Topic title is too close to an existing article."
              : "Intent and angle are too similar to existing coverage.",
        matchedExistingTitle: overlap.topic.title || overlap.topic.sourceTitle,
        score: Number(overlap.score.toFixed(3)),
        similarTerms: overlap.similarTerms
      });
      continue;
    }

    accepted.push(topic);
    comparisonPool.push({
      sourceUrl: `generated:${topic.primaryKeyword}`,
      sourceTitle: topic.title,
      title: topic.title,
      primaryKeyword: topic.primaryKeyword,
      summary: topic.searchIntent,
      keywords: meaningfulTokens(`${topic.title} ${topic.primaryKeyword} ${topic.searchIntent} ${topic.seoAngle}`)
    });
  }

  return { accepted, rejected };
}

export function formatExistingTopicsForPrompt(existingTopics: ExistingTopic[]) {
  return existingTopics
    .map(
      (topic, index) =>
        `${index + 1}. ${topic.title}\n   Keyword: ${topic.primaryKeyword}\n   Summary: ${topic.summary}\n   Keywords: ${topic.keywords.join(", ")}`
    )
    .join("\n");
}

export function formatRejectedTopicsForPrompt(rejected: TopicValidationRejected[]) {
  return rejected
    .map(
      (entry, index) =>
        `${index + 1}. ${entry.topic.title}\n   Reason: ${entry.reason}\n   Similar to: ${entry.matchedExistingTitle}\n   Terms: ${entry.similarTerms.join(", ")}`
    )
    .join("\n");
}
