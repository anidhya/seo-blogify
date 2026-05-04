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

const manualTopicDetailsSchema = z.object({
  primaryKeyword: z.string(),
  searchIntent: z.string(),
  rankingRationale: z.string(),
  seoAngle: z.string(),
  outline: z.array(z.string()).min(4).max(8)
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
  failedSlides: z
    .array(
      z.object({
        slideNumber: z.number(),
        reason: z.string(),
        failedAt: z.string()
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

const socialResearchSchema = z.object({
  sourceSummary: z.string(),
  audience: z.string(),
  keyInsights: z.array(z.string()).min(3).max(8),
  references: z.array(
    z.object({
      label: z.string(),
      url: z.string(),
      summary: z.string()
    })
  ),
  recommendedAngles: z.array(z.string()).min(3).max(8),
  researchedAt: z.string()
});

const socialVariantSchema = z.object({
  variantId: z.string(),
  label: z.string(),
  format: z.enum(["single", "carousel", "thread"]),
  title: z.string(),
  body: z.string(),
  segments: z.array(z.string()).default([]),
  hashtags: z.array(z.string()).min(3).max(12),
  callToAction: z.string(),
  designNotes: z.array(z.string()).default([])
});

const socialPlatformDraftSchema = z.object({
  platform: z.enum(["instagram", "linkedin", "x"]),
  platformLabel: z.string(),
  researchSummary: z.string(),
  recommendedAngles: z.array(z.string()).min(2).max(5),
  variants: z.array(socialVariantSchema).min(2).max(3)
});

const socialPackSchema = z.object({
  projectTitle: z.string(),
  research: socialResearchSchema,
  platformDrafts: z.array(socialPlatformDraftSchema).length(3)
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
    temperature: 0.2, // low — factual extraction, consistent structured output
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

export async function generateTopicSuggestions(
  prompt: string,
  count = 10,
  options?: { webSearch?: boolean }
) {
  const client = getClient();
  const shouldUseWebSearch =
    options?.webSearch ?? process.env.OPENAI_ENABLE_WEB_SEARCH !== "false";
  const tools = shouldUseWebSearch ? [{ type: "web_search_preview" as const }] : [];

  const response = await client.responses.parse({
    model: defaultModel,
    temperature: 0.7, // higher — diverse, creative topic ideas
    tools,
    input: [
      {
        role: "developer",
        content:
          "You are an SEO strategist. Suggest topics that can realistically rank, align to search intent, and fit the brand voice. Use declarative headline-style titles, not questions. Avoid question marks and avoid titles that begin with question words like what, why, how, when, where, who, which, can, should, do, does, is, are, will, would, or could."
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

export async function generateManualTopicDetails(prompt: string, options?: { webSearch?: boolean }) {
  const client = getClient();
  const shouldUseWebSearch =
    options?.webSearch ?? process.env.OPENAI_ENABLE_WEB_SEARCH !== "false";
  const tools = shouldUseWebSearch ? [{ type: "web_search_preview" as const }] : [];

  const response = await client.responses.parse({
    model: defaultModel,
    temperature: 0.3,
    tools,
    input: [
      {
        role: "developer",
        content:
          "You are an SEO strategist. Analyze the user's exact topic without renaming or rewriting it. Return only the keyword, search intent, ranking rationale, SEO angle, and outline that support the exact topic title."
      },
      {
        role: "user",
        content: prompt
      }
    ],
    text: {
      format: zodTextFormat(manualTopicDetailsSchema, "manual_topic_details")
    }
  });

  const parsed = response.output_parsed;

  if (!parsed) {
    throw new Error("Failed to parse manual topic details.");
  }

  return parsed;
}

export async function generateApprovedBlog(prompt: string) {
  const client = getClient();
  const response = await client.responses.parse({
    model: defaultModel,
    temperature: 0.7, // higher — natural, varied blog writing
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
    temperature: 0.1, // very low — deterministic scoring, consistent quality gates
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
    temperature: 0.5, // balanced — targeted edits, not too random, not too rigid
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
    temperature: 0.6, // moderate — engaging copy with some creativity
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

export async function generateSocialContentPack(prompt: string) {
  const client = getClient();
  const tools = process.env.OPENAI_ENABLE_WEB_SEARCH === "false" ? [] : [{ type: "web_search_preview" as const }];

  const response = await client.responses.parse({
    model: defaultModel,
    temperature: 0.55,
    tools,
    input: [
      {
        role: "developer",
        content:
          "You are a senior social content strategist. Research the source carefully and produce platform-specific drafts for Instagram, LinkedIn, and X. Keep the output concise, evidence-backed, and ready for editing."
      },
      {
        role: "user",
        content: prompt
      }
    ],
    text: {
      format: zodTextFormat(socialPackSchema, "social_content_pack")
    }
  });

  const parsed = response.output_parsed;

  if (!parsed) {
    throw new Error("Failed to parse social content pack.");
  }

  return parsed;
}
