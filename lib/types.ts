export type WorkflowStep =
  | "analyze"
  | "suggest-topics"
  | "generate-blog"
  | "update-blog"
  | "regenerate-blog"
  | "approve-blog";

export type WorkflowInput = {
  websiteUrl: string;
  blogUrls: string[];
  companyName?: string;
  vision?: string;
  keywords?: string;
  topicTitle?: string;
};

export type PageSnapshot = {
  url: string;
  title: string;
  excerpt: string;
  content: string;
};

export type ExistingTopic = {
  sourceUrl: string;
  sourceTitle: string;
  title: string;
  primaryKeyword: string;
  summary: string;
  keywords: string[];
};

export type BrandAnalysis = {
  companySummary: string;
  audience: string;
  vision: string;
  productsOrServices: string[];
  differentiators: string[];
  brandVoice: string[];
  writingStyle: {
    tone: string;
    structure: string;
    readingLevel: string;
    styleNotes: string[];
  };
  seoObservations: string[];
  sourceHighlights: string[];
};

export type TopicSuggestion = {
  title: string;
  primaryKeyword: string;
  searchIntent: string;
  rankingRationale: string;
  seoAngle: string;
  outline: string[];
};

export type TopicValidationRejected = {
  topic: TopicSuggestion;
  reason: string;
  matchedExistingTitle: string;
  score: number;
  similarTerms: string[];
};

export type TopicValidation = {
  existingTopics: ExistingTopic[];
  accepted: TopicSuggestion[];
  rejected: TopicValidationRejected[];
};

export type BlogQuality = {
  score: number;
  publishStatus: "publish_ready" | "needs_review";
  evaluation: {
    sentenceVariety: number;
    specificity: number;
    naturalTransitions: number;
    reducedRepetition: number;
    concreteExamples: number;
    absenceOfAIFluff: number;
    brandConsistency: number;
  };
  issues: string[];
  rewriteAttempts: number;
  notes: string[];
};

export type BlogRevision = {
  revisionId: string;
  articleSlug: string;
  createdAt: string;
  comments: string;
  blog: GeneratedBlog;
  quality: BlogQuality;
};

export type RegenerationNote = {
  revisionId: string;
  articleSlug: string;
  createdAt: string;
  comments: string;
  priorScore: number | null;
  resultingScore: number | null;
  publishStatus: "publish_ready" | "needs_review" | "pending";
};

export type BlogApproval = {
  approvalId: string;
  articleSlug: string;
  createdAt: string;
  approved: boolean;
  notes: string;
  score: number | null;
  publishStatus: "approved" | "needs_review";
};

export type ApprovedArticle = {
  articleId: string;
  articleSlug: string;
  createdAt: string;
  updatedAt: string;
  topic: TopicSuggestion;
  blog: GeneratedBlog;
  quality: BlogQuality;
  wordCount: number;
  approvalStatus: "pending" | "approved" | "needs_revision";
  feedbackCount: number;
};

export type WorkflowProgress = {
  action: WorkflowStep | null;
  percent: number;
  stageLabel: string;
  updatedAt: string;
  isComplete: boolean;
};

export type RunSummary = {
  runId: string;
  companyName: string;
  websiteUrl: string;
  updatedAt: string;
  status: string;
  hasBlog: boolean;
  blogTitle: string | null;
  blogSlug: string | null;
  qualityScore: number | null;
  publishStatus: string | null;
  progressPercent: number | null;
  progressLabel: string | null;
};

export type GeneratedBlog = {
  title: string;
  slug: string;
  summary: string;
  keyTakeaways: string[];
  imagePrompts: string[];
  internalLinks: Array<{
    anchorText: string;
    targetUrl: string;
    placement: string;
    rationale: string;
  }>;
  meta: {
    title: string;
    description: string;
    keywords: string[];
  };
  faqs: Array<{
    question: string;
    answer: string;
  }>;
  markdown: string;
};
