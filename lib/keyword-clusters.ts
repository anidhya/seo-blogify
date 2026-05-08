import type { TopicSuggestion } from "@/lib/types";

const SUPPORTING_KEYWORD_MIN = 4;
const SUPPORTING_KEYWORD_MAX = 8;
const FALLBACK_MODIFIERS = ["strategy", "framework", "checklist", "best practices", "examples", "tips"];

function normalize(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function compareKey(value: string) {
  return normalize(value).toLowerCase();
}

function unique(values: string[]) {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const normalized = normalize(value);
    if (!normalized) {
      continue;
    }

    const key = compareKey(normalized);
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(normalized);
  }

  return result;
}

function splitKeywordCandidates(value: string) {
  return value
    .split(/[\n,;|/]+/g)
    .flatMap((chunk) => chunk.split(/\s+[–—-]\s+/g))
    .map((chunk) => normalize(chunk))
    .filter(Boolean);
}

function inferFallbackKeywords(primaryKeyword: string, title: string) {
  const source = normalize(primaryKeyword || title);
  if (!source) {
    return [];
  }

  const titleSource = normalize(title);
  const modifiers = FALLBACK_MODIFIERS.map((modifier) => `${source} ${modifier}`);
  const titleVariant = titleSource && compareKey(titleSource) !== compareKey(source) ? [titleSource] : [];

  return unique([...titleVariant, ...modifiers]).filter((keyword) => compareKey(keyword) !== compareKey(source));
}

export function ensureTopicKeywordCluster(topic: Pick<TopicSuggestion, "title" | "primaryKeyword" | "supportingKeywords" | "searchIntent" | "seoAngle" | "outline">) {
  const primaryKeyword = normalize(topic.primaryKeyword || topic.title);
  const title = normalize(topic.title || topic.primaryKeyword);

  const supportingKeywords = unique([
    ...(topic.supportingKeywords ?? []),
    ...splitKeywordCandidates(topic.searchIntent),
    ...splitKeywordCandidates(topic.seoAngle),
    ...topic.outline.flatMap((entry) => splitKeywordCandidates(entry)),
    ...inferFallbackKeywords(primaryKeyword, title)
  ]).filter((keyword) => compareKey(keyword) !== compareKey(primaryKeyword) && compareKey(keyword) !== compareKey(title));

  return {
    primaryKeyword,
    supportingKeywords: supportingKeywords.slice(0, SUPPORTING_KEYWORD_MAX)
  };
}

export function formatTopicKeywordCluster(topic: Pick<TopicSuggestion, "title" | "primaryKeyword" | "supportingKeywords" | "searchIntent" | "seoAngle" | "outline">) {
  const cluster = ensureTopicKeywordCluster(topic);

  if (cluster.supportingKeywords.length >= SUPPORTING_KEYWORD_MIN) {
    return cluster;
  }

  const topUpKeywords = unique([
    ...cluster.supportingKeywords,
    ...inferFallbackKeywords(cluster.primaryKeyword, topic.title)
  ]).filter((keyword) => compareKey(keyword) !== compareKey(cluster.primaryKeyword));

  return {
    ...cluster,
    supportingKeywords: topUpKeywords.slice(0, SUPPORTING_KEYWORD_MAX)
  };
}

