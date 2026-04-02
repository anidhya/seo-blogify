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
  blogs: z.array(pageSnapshotSchema)
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

export const topicListSchema = z.array(topicSuggestionSchema).length(10);

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
  createdAt: z.string(),
  comments: z.string(),
  blog: z.lazy(() => generatedBlogSchema),
  quality: blogQualitySchema
});

export const regenerationNoteSchema = z.object({
  revisionId: z.string(),
  createdAt: z.string(),
  comments: z.string(),
  priorScore: z.number().nullable(),
  resultingScore: z.number().nullable(),
  publishStatus: z.enum(["publish_ready", "needs_review", "pending"])
});

export const blogApprovalSchema = z.object({
  approvalId: z.string(),
  createdAt: z.string(),
  approved: z.boolean(),
  notes: z.string(),
  score: z.number().nullable(),
  publishStatus: z.enum(["approved", "needs_review"])
});

export const workflowProgressSchema = z.object({
  action: z.enum(["analyze", "suggest-topics", "generate-blog", "update-blog", "regenerate-blog", "approve-blog"]).nullable(),
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
    blog: z.boolean()
  })
});

export type Manifest = z.infer<typeof manifestSchema>;
