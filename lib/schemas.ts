import { z } from "zod";

export const workflowInputSchema = z.object({
  websiteUrl: z.string().min(1),
  companyName: z.string().optional().default(""),
  vision: z.string().optional().default(""),
  keywords: z.string().optional().default(""),
  blogUrls: z.array(z.string()).default([])
});

export const pageSnapshotSchema = z.object({
  url: z.string(),
  title: z.string(),
  excerpt: z.string(),
  content: z.string()
});

export const researchSchema = z.object({
  homepage: pageSnapshotSchema,
  blogs: z.array(pageSnapshotSchema),
  sitemapUrls: z.array(z.string()).default([]),
  sitemapBlogUrls: z.array(z.string()).default([]),
  resolvedSitemapUrl: z.string().nullable().default(null)
});

export const existingTopicSchema = z.object({
  sourceUrl: z.string(),
  sourceTitle: z.string(),
  title: z.string(),
  primaryKeyword: z.string(),
  summary: z.string(),
  keywords: z.array(z.string())
});

export const brandAnalysisSchema = z.object({
  companySummary: z.string(),
  audience: z.string(),
  vision: z.string(),
  productsOrServices: z.array(z.string()),
  differentiators: z.array(z.string()),
  brandVoice: z.array(z.string()),
  writingStyle: z.object({
    tone: z.string(),
    structure: z.string(),
    readingLevel: z.string(),
    styleNotes: z.array(z.string())
  }),
  seoObservations: z.array(z.string()),
  sourceHighlights: z.array(z.string())
});

export const topicSuggestionSchema = z.object({
  title: z.string(),
  primaryKeyword: z.string(),
  searchIntent: z.string(),
  rankingRationale: z.string(),
  seoAngle: z.string(),
  outline: z.array(z.string())
});

export const topicListSchema = z.array(topicSuggestionSchema);

export const topicValidationRejectedSchema = z.object({
  topic: topicSuggestionSchema,
  reason: z.string(),
  matchedExistingTitle: z.string(),
  score: z.number(),
  similarTerms: z.array(z.string())
});

export const topicValidationSchema = z.object({
  existingTopics: z.array(existingTopicSchema),
  accepted: z.array(topicSuggestionSchema),
  rejected: z.array(topicValidationRejectedSchema)
});

export const blogQualitySchema = z.object({
  score: z.number(),
  publishStatus: z.enum(["publish_ready", "needs_review"]),
  evaluation: z.object({
    sentenceVariety: z.number(),
    specificity: z.number(),
    naturalTransitions: z.number(),
    reducedRepetition: z.number(),
    concreteExamples: z.number(),
    absenceOfAIFluff: z.number(),
    brandConsistency: z.number()
  }),
  issues: z.array(z.string()),
  rewriteAttempts: z.number(),
  notes: z.array(z.string())
});

export const blogRevisionSchema = z.object({
  revisionId: z.string(),
  articleSlug: z.string(),
  createdAt: z.string(),
  comments: z.string(),
  blog: z.lazy(() => generatedBlogSchema),
  quality: blogQualitySchema
});

export const regenerationNoteSchema = z.object({
  revisionId: z.string(),
  articleSlug: z.string(),
  createdAt: z.string(),
  comments: z.string(),
  priorScore: z.number().nullable(),
  resultingScore: z.number().nullable(),
  publishStatus: z.enum(["publish_ready", "needs_review", "pending"])
});

export const blogApprovalSchema = z.object({
  approvalId: z.string(),
  articleSlug: z.string(),
  createdAt: z.string(),
  approved: z.boolean(),
  notes: z.string(),
  score: z.number().nullable(),
  publishStatus: z.enum(["approved", "needs_review"])
});

export const linkedInCarouselPromptSchema = z.object({
  slideNumber: z.number(),
  title: z.string(),
  prompt: z.string(),
  designNotes: z.string()
});

export const linkedInGeneratedImageSchema = z.object({
  slideNumber: z.number(),
  prompt: z.string(),
  imageDataUrl: z.string(),
  mimeType: z.string(),
  model: z.string(),
  generatedAt: z.string(),
  renderMode: z.enum(["google-image", "preview"]).default("preview"),
  providerResponseText: z.string().nullable().default(null)
});

const linkedInDraftSchemaCurrent = z.object({
  articleSlug: z.string(),
  suggestedTitle: z.string(),
  suggestedDescription: z.string(),
  carouselPrompts: z.array(linkedInCarouselPromptSchema).length(4),
  generatedImages: z.array(linkedInGeneratedImageSchema).default([]),
  imageGenerationStatus: z.enum(["idle", "pending", "queued", "generating", "partial", "ready", "failed"]).default("idle"),
  imageModel: z.string().nullable().default(null),
  hashtags: z.array(z.string()).min(3).max(10),
  callToAction: z.string(),
  publishStatus: z.enum(["draft", "ready", "scheduled", "published", "failed"]),
  reviewStatus: z.enum(["draft", "pending_review", "approved", "needs_revision"])
});

const linkedInDraftSchemaLegacy = z.object({
  articleSlug: z.string(),
  headline: z.string(),
  caption: z.string(),
  carouselPrompts: z.array(linkedInCarouselPromptSchema).length(4),
  generatedImages: z.array(linkedInGeneratedImageSchema).default([]),
  imageGenerationStatus: z.enum(["idle", "pending", "queued", "generating", "partial", "ready", "failed"]).default("idle"),
  imageModel: z.string().nullable().default(null),
  hashtags: z.array(z.string()).min(3).max(10),
  callToAction: z.string(),
  publishStatus: z.enum(["draft", "ready", "scheduled", "published", "failed"]),
  reviewStatus: z.enum(["draft", "pending_review", "approved", "needs_revision"])
}).transform(({ headline, caption, ...rest }) => ({
  ...rest,
  suggestedTitle: headline,
  suggestedDescription: caption
}));

export const linkedInDraftSchema = z.union([linkedInDraftSchemaCurrent, linkedInDraftSchemaLegacy]);

export const linkedInConnectionSchema = z.object({
  connected: z.boolean(),
  connectedAt: z.string().nullable(),
  updatedAt: z.string(),
  memberUrn: z.string().nullable(),
  memberName: z.string().nullable(),
  accessToken: z.string().nullable(),
  expiresAt: z.string().nullable()
});

export const linkedInApprovalSchema = z.object({
  approvalId: z.string(),
  createdAt: z.string(),
  approved: z.boolean(),
  notes: z.string()
});

export const linkedInScheduleSchema = z.object({
  scheduleId: z.string(),
  createdAt: z.string(),
  scheduledFor: z.string(),
  timezone: z.string(),
  status: z.enum(["scheduled", "published", "cancelled"]),
  publishedAt: z.string().nullable(),
  notes: z.string()
});

export const linkedInPublicationSchema = z.object({
  publicationId: z.string(),
  createdAt: z.string(),
  publishedAt: z.string().nullable(),
  postUrn: z.string().nullable(),
  externalUrl: z.string().nullable(),
  status: z.enum(["draft", "published", "failed"]),
  error: z.string().nullable()
});

export const linkedInRecordSchema = z.object({
  articleSlug: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  draft: linkedInDraftSchema.nullable(),
  connection: linkedInConnectionSchema.nullable(),
  approvals: z.array(linkedInApprovalSchema),
  schedule: linkedInScheduleSchema.nullable(),
  publication: linkedInPublicationSchema.nullable()
});

export const linkedInRunRecordSchema = linkedInRecordSchema.extend({
  runId: z.string(),
  schemaVersion: z.literal("1")
});

export const linkedInArticlesRecordSchema = z.object({
  runId: z.string(),
  schemaVersion: z.literal("1"),
  createdAt: z.string(),
  updatedAt: z.string(),
  articles: z.array(linkedInRecordSchema)
});

export const approvedArticleSchema = z.object({
  articleId: z.string(),
  articleSlug: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  topic: topicSuggestionSchema,
  blog: z.lazy(() => generatedBlogSchema),
  quality: blogQualitySchema,
  wordCount: z.number(),
  approvalStatus: z.enum(["pending", "approved", "needs_revision"]),
  feedbackCount: z.number()
});

export const approvedArticlesSchema = z.object({
  runId: z.string(),
  schemaVersion: z.literal("1"),
  createdAt: z.string(),
  updatedAt: z.string(),
  articles: z.array(approvedArticleSchema)
});

export const workflowProgressSchema = z.object({
  action: z
    .enum([
      "analyze",
      "suggest-topics",
      "generate-blog",
      "update-blog",
      "regenerate-blog",
      "approve-blog",
      "prepare-linkedin",
      "queue-linkedin-images",
      "generate-linkedin-images",
      "approve-linkedin",
      "schedule-linkedin",
      "publish-linkedin"
    ])
    .nullable(),
  percent: z.number(),
  stageLabel: z.string(),
  updatedAt: z.string(),
  isComplete: z.boolean()
});

export const generatedBlogSchema = z.object({
  title: z.string(),
  slug: z.string(),
  summary: z.string(),
  keyTakeaways: z.array(z.string()),
  imagePrompts: z.array(z.string()).length(3).default(["", "", ""]),
  internalLinks: z.array(
    z.object({
      anchorText: z.string(),
      targetUrl: z.string(),
      placement: z.string(),
      rationale: z.string()
    })
  ).default([]),
  meta: z.object({
    title: z.string(),
    description: z.string(),
    keywords: z.array(z.string())
  }),
  faqs: z.array(
    z.object({
      question: z.string(),
      answer: z.string()
    })
  ),
  markdown: z.string()
});

export const manifestSchema = z.object({
  runId: z.string(),
  schemaVersion: z.literal("1"),
  model: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  status: z.enum(["created", "analyzed", "topics", "approved", "publish_ready", "needs_review"]),
  progress: workflowProgressSchema.optional(),
  steps: z.object({
    input: z.boolean(),
    research: z.boolean(),
    analysis: z.boolean(),
    topics: z.boolean(),
    approvedTopic: z.boolean(),
    blog: z.boolean(),
    linkedin: z.boolean()
  })
});

export type Manifest = z.infer<typeof manifestSchema>;
