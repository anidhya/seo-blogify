import type { BrandAnalysis, ExistingTopic, TopicSuggestion, TopicValidationRejected, WorkflowInput } from "@/lib/types";

const DATAFORSEO_API_BASE = "https://api.dataforseo.com/v3";
const DEFAULT_LOCATION_CODE = Number(process.env.DATAFORSEO_LOCATION_CODE || "2840");
const DEFAULT_LANGUAGE_CODE = process.env.DATAFORSEO_LANGUAGE_CODE || "en";
let dataForSeoUnavailable = false;

type DataForSeoTaskResponse<T> = {
  tasks?: Array<{
    status_code?: number;
    status_message?: string;
    result?: T[];
  }>;
};

type KeywordMetricsRow = {
  keyword?: string;
  search_volume?: number | null;
  competition?: string | null;
  competition_index?: number | null;
  cpc?: number | null;
  low_top_of_page_bid?: number | null;
  high_top_of_page_bid?: number | null;
};

type KeywordSuggestionRow = {
  keyword?: string;
  search_volume?: number | null;
  competition?: string | null;
  competition_index?: number | null;
  cpc?: number | null;
};

type SerpItem = {
  type?: string;
  title?: string;
  domain?: string;
  url?: string;
  description?: string;
  question_text?: string;
  answer_text?: string;
  items?: SerpItem[];
  expanded_element?: SerpItem[];
  seed_question?: string;
  rank_absolute?: number;
};

function hasCredentials() {
  return Boolean(process.env.DATAFORSEO_LOGIN && process.env.DATAFORSEO_PASSWORD);
}

function unique(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function splitTerms(value: string | undefined | null) {
  return (value || "")
    .split(/[,;\n]/g)
    .map((part) => part.trim())
    .filter(Boolean);
}

function sanitizeSeedTerm(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .slice(0, 10)
    .join(" ");
}

function formatCount(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) {
    return "n/a";
  }

  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(1)}B`;
  }

  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }

  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }

  return `${value}`;
}

function formatCurrency(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) {
    return "n/a";
  }

  return `$${value.toFixed(2)}`;
}

async function postDataForSeo<T>(endpoint: string, payload: unknown[]) {
  if (dataForSeoUnavailable) {
    throw new Error("DataForSEO is unavailable for this process.");
  }

  const login = process.env.DATAFORSEO_LOGIN;
  const password = process.env.DATAFORSEO_PASSWORD;

  if (!login || !password) {
    throw new Error("Missing DATAFORSEO_LOGIN or DATAFORSEO_PASSWORD.");
  }

  const response = await fetch(`${DATAFORSEO_API_BASE}/${endpoint}`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${login}:${password}`).toString("base64")}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    if (response.status === 403) {
      dataForSeoUnavailable = true;
    }
    throw new Error(`DataForSEO request failed with HTTP ${response.status}.`);
  }

  return (await response.json()) as DataForSeoTaskResponse<T>;
}

function readTaskResult<T>(response: DataForSeoTaskResponse<T>) {
  const task = response.tasks?.[0];

  if (!task) {
    return [];
  }

  if (task.status_code && task.status_code !== 20000) {
    throw new Error(task.status_message || "DataForSEO task failed.");
  }

  return task.result || [];
}

function collectSeedTerms(input: WorkflowInput, analysis: BrandAnalysis) {
  return unique([
    ...splitTerms(input.keywords),
    ...splitTerms(input.companyName),
    ...analysis.productsOrServices.slice(0, 4),
    ...analysis.differentiators.slice(0, 4),
    ...analysis.brandVoice.slice(0, 3),
    analysis.audience
  ].map(sanitizeSeedTerm)).slice(0, 12);
}

function formatKeywordMetrics(rows: KeywordMetricsRow[]) {
  return rows
    .slice(0, 8)
    .map(
      (row, index) =>
        `${index + 1}. ${row.keyword || "n/a"} | volume: ${formatCount(row.search_volume)} | cpc: ${formatCurrency(row.cpc)} | competition: ${row.competition || "n/a"} (${row.competition_index ?? "n/a"})`
    )
    .join("\n");
}

function formatKeywordSuggestions(rows: KeywordSuggestionRow[]) {
  return rows
    .slice(0, 8)
    .map(
      (row, index) =>
        `${index + 1}. ${row.keyword || "n/a"} | volume: ${formatCount(row.search_volume)} | cpc: ${formatCurrency(row.cpc)}`
    )
    .join("\n");
}

function collectOrganicResults(items: SerpItem[]) {
  return items
    .filter((item) => item.type === "organic")
    .slice(0, 5)
    .map(
      (item, index) =>
        `${index + 1}. ${item.title || "n/a"} | ${item.domain || "n/a"} | ${item.url || "n/a"}`
    )
    .join("\n");
}

function collectQuestionResults(items: SerpItem[]) {
  const questions = items
    .flatMap((item) => {
      if (item.type === "people_also_ask" || item.type === "people_also_search") {
        return Array.isArray(item.items) ? item.items : [];
      }

      return [];
    })
    .slice(0, 5)
    .map((item, index) => {
      const question = item.seed_question || item.question_text || item.title || "n/a";
      const answerSource = Array.isArray(item.expanded_element) ? item.expanded_element[0] : null;
      const answer = answerSource?.title || answerSource?.description || item.answer_text || item.description || "n/a";
      return `${index + 1}. ${question} — ${answer}`;
    });

  return questions.join("\n");
}

function normalizeText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function tokenizeText(value: string) {
  return normalizeText(value)
    .split(/\s+/)
    .filter((part) => part.length > 2);
}

function jaccard(left: string[], right: string[]) {
  const leftSet = new Set(left);
  const rightSet = new Set(right);
  const intersection = [...leftSet].filter((item) => rightSet.has(item)).length;
  const union = new Set([...leftSet, ...rightSet]).size;
  return union === 0 ? 0 : intersection / union;
}

function normalizeDomain(value: string) {
  return value.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0].toLowerCase();
}

function isDataForSeo403Error(error: unknown) {
  return error instanceof Error && error.message.includes("DataForSEO request failed with HTTP 403");
}

async function lookupTopicSerp(keyword: string) {
  const response = await postDataForSeo<{
    items?: SerpItem[];
  }>("serp/google/organic/live/advanced", [
    {
      keyword,
      location_code: DEFAULT_LOCATION_CODE,
      language_code: DEFAULT_LANGUAGE_CODE,
      item_types: ["organic", "people_also_ask", "people_also_search", "related_searches"]
    }
  ]);

  return readTaskResult(response).flatMap((result) => result.items || []).filter((item) => item.type === "organic");
}

function scoreTopicOverlap(
  topic: TopicSuggestion,
  organic: SerpItem[],
  existingTopics: ExistingTopic[],
  siteDomain: string
) {
  const candidateTitle = normalizeText(topic.title);
  const candidateKeyword = normalizeText(topic.primaryKeyword);
  const candidateTokens = tokenizeText(`${topic.title} ${topic.primaryKeyword}`);
  const normalizedSiteDomain = normalizeDomain(siteDomain);

  let bestMatch: { title: string; score: number; domainMatch: boolean; similarTerms: string[] } | null = null;

  const consider = (title: string, domain: string, score: number, similarTerms: string[]) => {
    const domainMatch = normalizeDomain(domain) === normalizedSiteDomain;
    const finalScore = score + (domainMatch ? 0.05 : 0);

    if (!bestMatch || finalScore > bestMatch.score) {
      bestMatch = {
        title,
        score: finalScore,
        domainMatch,
        similarTerms
      };
    }
  };

  for (const result of organic.slice(0, 5)) {
    const resultTitle = normalizeText(result.title || "");
    const resultTokens = tokenizeText(`${result.title || ""} ${result.description || ""}`);
    const titleScore = jaccard(candidateTokens, resultTokens);
    const keywordScore =
      candidateKeyword === resultTitle
        ? 1
        : jaccard(tokenizeText(topic.primaryKeyword), tokenizeText(result.title || ""));
    consider(
      result.title || result.domain || "n/a",
      result.domain || "",
      titleScore * 0.55 + keywordScore * 0.45,
      Array.from(
        new Set([
          ...candidateTokens.filter((token) => resultTokens.includes(token)),
          ...tokenizeText(topic.primaryKeyword).filter((token) => resultTokens.includes(token))
        ])
      )
    );
  }

  for (const existing of existingTopics) {
    const existingTitle = normalizeText(existing.title || existing.sourceTitle || "");
    const existingTokens = tokenizeText(`${existing.title} ${existing.primaryKeyword} ${existing.summary}`);
    const titleScore = jaccard(candidateTokens, existingTokens);
    const keywordScore =
      candidateKeyword === existingTitle
        ? 1
        : jaccard(tokenizeText(topic.primaryKeyword), tokenizeText(existing.primaryKeyword));
    consider(
      existing.title || existing.sourceTitle || "n/a",
      existing.sourceUrl || "",
      titleScore * 0.55 + keywordScore * 0.45,
      Array.from(
        new Set([
          ...candidateTokens.filter((token) => existingTokens.includes(token)),
          ...tokenizeText(topic.primaryKeyword).filter((token) => existingTokens.includes(token))
        ])
      )
    );
  }

  const overlap = bestMatch ?? {
    title: "n/a",
    score: 0,
    domainMatch: false,
    similarTerms: []
  };

  const sameTopicTitle = candidateTitle === normalizeText(overlap.title);
  const strongTextOverlap = overlap.score >= 0.52 || sameTopicTitle;
  const sameDomainDuplicate = overlap.domainMatch && overlap.score >= 0.4 && overlap.similarTerms.length > 0;
  const duplicate = strongTextOverlap || sameDomainDuplicate;
  const reason = sameDomainDuplicate
    ? "Live SERP shows this topic is already covered on the target site."
    : overlap.score >= 0.52
      ? "Live SERP shows a near-duplicate topic or keyword cluster."
      : sameTopicTitle
        ? "Topic title matches an existing result too closely."
        : "No strong SERP overlap detected.";

  return {
    duplicate,
    matchedExistingTitle: overlap.title,
    score: Number(overlap.score.toFixed(3)),
    similarTerms: overlap.similarTerms,
    reason
  };
}

export async function reviewTopicCandidatesAgainstSerp(params: {
  siteDomain: string;
  existingTopics: ExistingTopic[];
  candidates: TopicSuggestion[];
}) {
  const accepted: TopicSuggestion[] = [];
  const rejected: TopicValidationRejected[] = [];

  for (const topic of params.candidates) {
    try {
      const organic = await lookupTopicSerp(topic.primaryKeyword || topic.title);
      const overlap = scoreTopicOverlap(topic, organic, params.existingTopics, params.siteDomain);

      if (overlap.duplicate) {
        rejected.push({
          topic,
          reason: overlap.reason,
          matchedExistingTitle: overlap.matchedExistingTitle,
          score: overlap.score,
          similarTerms: overlap.similarTerms
        });
        continue;
      }

      accepted.push(topic);
    } catch (error) {
      if (!isDataForSeo403Error(error)) {
        console.warn("SERP overlap lookup failed:", error);
      }
      accepted.push(topic);
    }
  }

  return { accepted, rejected };
}

export async function buildDataForSeoTopicEvidence(input: WorkflowInput, analysis: BrandAnalysis) {
  if (!hasCredentials()) {
    return null;
  }

  const seeds = collectSeedTerms(input, analysis);
  if (seeds.length === 0) {
    return null;
  }

  try {
    const keywordMetricsResponse = await postDataForSeo<KeywordMetricsRow>(
      "keywords_data/google_ads/search_volume/live",
      [
          {
            location_code: DEFAULT_LOCATION_CODE,
            language_code: DEFAULT_LANGUAGE_CODE,
            search_partners: false,
            sort_by: "search_volume",
            keywords: seeds
        }
      ]
    );
    const keywordMetrics = readTaskResult(keywordMetricsResponse);

    const keywordSuggestionsResponse = await postDataForSeo<KeywordSuggestionRow>(
      "keywords_data/google_ads/keywords_for_keywords/live",
      [
        {
          location_code: DEFAULT_LOCATION_CODE,
          language_code: DEFAULT_LANGUAGE_CODE,
          sort_by: "search_volume",
          keywords: seeds.slice(0, 5)
        }
      ]
    );
    const keywordSuggestions = readTaskResult(keywordSuggestionsResponse);

    const serpResponses = await Promise.all(
      seeds.slice(0, 2).map((keyword) =>
        postDataForSeo<{
          items?: SerpItem[];
        }>("serp/google/organic/live/advanced", [
          {
            keyword,
            location_code: DEFAULT_LOCATION_CODE,
            language_code: DEFAULT_LANGUAGE_CODE,
            item_types: ["organic", "people_also_ask", "people_also_search", "related_searches"]
          }
        ])
      )
    );

    const serpItems = serpResponses
      .flatMap((response) => readTaskResult(response))
      .flatMap((result) => result.items || []);

    return [
      "DataForSEO evidence:",
      `Seed terms: ${seeds.join(", ")}`,
      "",
      "Keyword metrics:",
      keywordMetrics.length > 0 ? formatKeywordMetrics(keywordMetrics) : "No keyword metrics returned.",
      "",
      "Keyword expansion:",
      keywordSuggestions.length > 0 ? formatKeywordSuggestions(keywordSuggestions) : "No keyword expansion returned.",
      "",
      "SERP snapshot:",
      collectOrganicResults(serpItems) || "No organic results returned.",
      "",
      "Questions and related intent:",
      collectQuestionResults(serpItems) || "No question results returned."
    ].join("\n");
  } catch (error) {
    if (!isDataForSeo403Error(error)) {
      console.warn("DataForSEO evidence lookup failed:", error);
    }
    return null;
  }
}
