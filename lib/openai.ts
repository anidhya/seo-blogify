import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";

const analysisSchema = z.object({
  companySummary: z.string(),
  audience: z.string(),
  vision: z.string(),
  productsOrServices: z.array(z.string()).min(1).max(8),
  differentiators: z.array(z.string()).min(2).max(8),
  brandVoice: z.array(z.string()).min(3).max(8),
  writingStyle: z.object({
    tone: z.string(),
    structure: z.string(),
    readingLevel: z.string(),
    styleNotes: z.array(z.string()).min(3).max(8)
  }),
  seoObservations: z.array(z.string()).min(3).max(8),
  sourceHighlights: z.array(z.string()).min(2).max(8)
});

const topicSuggestionSchema = z.object({
  topics: z
    .array(
      z.object({
        title: z.string(),
        primaryKeyword: z.string(),
        searchIntent: z.string(),
        rankingRationale: z.string(),
        seoAngle: z.string(),
        outline: z.array(z.string()).min(4).max(8)
      })
    )
    .min(1)
});

const generatedBlogSchema = z.object({
  title: z.string(),
  slug: z.string(),
  summary: z.string(),
  keyTakeaways: z.array(z.string()).min(3).max(6),
  imagePrompts: z.array(z.string()).length(3),
  internalLinks: z.array(
    z.object({
      anchorText: z.string(),
      targetUrl: z.string(),
      placement: z.string(),
      rationale: z.string()
    })
  ),
  meta: z.object({
    title: z.string(),
    description: z.string(),
    keywords: z.array(z.string()).min(4).max(10)
  }),
  faqs: z
    .array(
      z.object({
        question: z.string(),
        answer: z.string()
      })
    )
    .min(3)
    .max(5),
  markdown: z.string()
});

const linkedInDraftSchema = z.object({
  articleSlug: z.string(),
  suggestedTitle: z.string(),
  suggestedDescription: z.string(),
  carouselPrompts: z
    .array(
      z.object({
        slideNumber: z.number(),
        title: z.string(),
        prompt: z.string(),
        designNotes: z.string()
      })
    )
    .length(4),
  generatedImages: z
    .array(
      z.object({
        slideNumber: z.number(),
        prompt: z.string(),
        imageDataUrl: z.string(),
        mimeType: z.string(),
        model: z.string(),
        generatedAt: z.string(),
        renderMode: z.enum(["google-image", "preview"]).default("preview"),
        providerResponseText: z.string().nullable().default(null)
      })
    )
    .default([]),
  imageGenerationStatus: z.enum(["idle", "pending", "queued", "generating", "partial", "ready", "failed"]).default("idle"),
  imageModel: z.string().nullable().default(null),
  hashtags: z.array(z.string()).min(3).max(10),
  callToAction: z.string(),
  publishStatus: z.enum(["draft", "ready", "scheduled", "published", "failed"]),
  reviewStatus: z.enum(["draft", "pending_review", "approved", "needs_revision"])
});

const blogQualitySchema = z.object({
  score: z.number().min(0).max(100),
  publishStatus: z.enum(["publish_ready", "needs_review"]),
  evaluation: z.object({
    sentenceVariety: z.number().min(0).max(100),
    specificity: z.number().min(0).max(100),
    naturalTransitions: z.number().min(0).max(100),
    reducedRepetition: z.number().min(0).max(100),
    concreteExamples: z.number().min(0).max(100),
    absenceOfAIFluff: z.number().min(0).max(100),
    brandConsistency: z.number().min(0).max(100)
  }),
  issues: z.array(z.string()),
  rewriteAttempts: z.number().int().min(0).max(3),
  notes: z.array(z.string())
});

function getClient() {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY in environment.");
  }

  return new OpenAI({ apiKey });
}

const defaultModel = process.env.OPENAI_MODEL || "gpt-5.4-mini";

export async function generateStructuredAnalysis(prompt: string) {
  const client = getClient();
  const response = await client.responses.parse({
    model: defaultModel,
    reasoning: { effort: "medium" },
    input: [
      {
        role: "developer",
        content:
          "You analyze brands and blog ecosystems. Return concise, evidence-backed findings only."
      },
      {
        role: "user",
        content: prompt
      }
    ],
    text: {
      format: zodTextFormat(analysisSchema, "brand_analysis")
    }
  });

  const parsed = response.output_parsed;

  if (!parsed) {
    throw new Error("Failed to parse brand analysis response.");
  }

  return parsed;
}

export async function generateTopicSuggestions(prompt: string, count = 10) {
  const client = getClient();
  const tools =
    process.env.OPENAI_ENABLE_WEB_SEARCH === "false" ? [] : [{ type: "web_search_preview" as const }];

  const response = await client.responses.parse({
    model: defaultModel,
    reasoning: { effort: "medium" },
    tools,
    input: [
      {
        role: "developer",
        content:
          "You are an SEO strategist. Suggest topics that can realistically rank, align to search intent, and fit the brand voice."
      },
      {
        role: "user",
        content: prompt
      }
    ],
    text: {
      format: zodTextFormat(topicSuggestionSchema.refine((value) => value.topics.length === count), `topic_suggestions_${count}`)
    }
  });

  const parsed = response.output_parsed;

  if (!parsed) {
    throw new Error("Failed to parse topic suggestions.");
  }

  return parsed.topics;
}

export async function generateApprovedBlog(prompt: string) {
  const client = getClient();
  const response = await client.responses.parse({
    model: defaultModel,
    reasoning: { effort: "medium" },
    input: [
      {
        role: "developer",
        content:
          "You are a senior content marketer. Write original, search-optimized blogs that match the provided brand style exactly."
      },
      {
        role: "user",
        content: prompt
      }
    ],
    text: {
      format: zodTextFormat(generatedBlogSchema, "generated_blog")
    }
  });

  const parsed = response.output_parsed;

  if (!parsed) {
    throw new Error("Failed to parse generated blog.");
  }

  return parsed;
}

export async function evaluateBlogQuality(prompt: string) {
  const client = getClient();
  const response = await client.responses.parse({
    model: defaultModel,
    reasoning: { effort: "low" },
    input: [
      {
        role: "developer",
        content:
          "You are a strict editorial quality reviewer. Score how human, specific, and publication-ready the blog draft feels."
      },
      {
        role: "user",
        content: prompt
      }
    ],
    text: {
      format: zodTextFormat(blogQualitySchema, "blog_quality")
    }
  });

  const parsed = response.output_parsed;

  if (!parsed) {
    throw new Error("Failed to parse blog quality evaluation.");
  }

  return parsed;
}

export async function rewriteBlogDraft(prompt: string) {
  const client = getClient();
  const response = await client.responses.parse({
    model: defaultModel,
    reasoning: { effort: "medium" },
    input: [
      {
        role: "developer",
        content:
          "You are a senior blog editor. Rewrite only the needed parts to make the draft feel more human, less repetitive, and more publication-ready."
      },
      {
        role: "user",
        content: prompt
      }
    ],
    text: {
      format: zodTextFormat(generatedBlogSchema, "rewritten_blog")
    }
  });

  const parsed = response.output_parsed;

  if (!parsed) {
    throw new Error("Failed to parse rewritten blog.");
  }

  return parsed;
}

export async function generateLinkedInDraft(prompt: string) {
  const client = getClient();
  const response = await client.responses.parse({
    model: defaultModel,
    reasoning: { effort: "medium" },
    input: [
      {
        role: "developer",
        content:
          "You create LinkedIn publishing packs from approved articles. Produce carousel prompts that are concise, practical, and visually consistent. Also write a LinkedIn-native suggested title and suggested description."
      },
      {
        role: "user",
        content: prompt
      }
    ],
    text: {
      format: zodTextFormat(linkedInDraftSchema, "linkedin_draft")
    }
  });

  const parsed = response.output_parsed;

  if (!parsed) {
    throw new Error("Failed to parse LinkedIn draft.");
  }

  return parsed;
}
