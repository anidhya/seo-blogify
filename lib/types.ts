export type WorkflowStep =
  | "analyze"
  | "update-analysis"
  | "suggest-topics"
  | "generate-blog"
  | "update-blog"
  | "regenerate-blog"
  | "approve-blog"
  | "prepare-linkedin"
  | "queue-linkedin-images"
  | "generate-linkedin-images"
  | "approve-linkedin"
  | "schedule-linkedin"
  | "publish-linkedin";

export type WorkflowInput = {
  websiteUrl: string;
  blogUrls: string[];
  companyName?: string;
  vision?: string;
  keywords?: string;
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

export type BrandGuidelineFile = {
  fileId: string;
  fileName: string;
  extension: string;
  mimeType: string;
  checksum: string;
  byteLength: number;
  extractedText: string;
  uploadedAt: string;
};

export type BrandGuidelinesSnapshot = {
  snapshotId: string;
  domain: string;
  createdAt: string;
  updatedAt: string;
  sourceRunId: string | null;
  summary: string;
  guidanceText: string;
  files: BrandGuidelineFile[];
};

export type RunBrandGuidelines = {
  schemaVersion: "1";
  runId: string;
  domain: string;
  snapshotId: string;
  createdAt: string;
  updatedAt: string;
  snapshot: BrandGuidelinesSnapshot;
};

export type BrandGuidelineReview = {
  status: "pass" | "needs_revision" | "not_available";
  summary: string;
  matchedFiles: string[];
  issues: string[];
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
  guidelineReview: BrandGuidelineReview | null;
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

export type ResolvedSitemap = {
  resolvedSitemapUrl: string | null;
  sitemapUrls: string[];
  sitemapBlogUrls: string[];
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

export type LinkedInCarouselPrompt = {
  slideNumber: number;
  title: string;
  prompt: string;
  designNotes: string;
};

export type LinkedInGeneratedImage = {
  slideNumber: number;
  prompt: string;
  imageDataUrl: string;
  mimeType: string;
  model: string;
  generatedAt: string;
  renderMode: "google-image" | "preview";
  providerResponseText: string | null;
};

export type LinkedInSlideFailure = {
  slideNumber: number;
  reason: string;
  failedAt: string;
};

export type LinkedInDraft = {
  articleSlug: string;
  suggestedTitle: string;
  suggestedDescription: string;
  carouselPrompts: LinkedInCarouselPrompt[];
  generatedImages: LinkedInGeneratedImage[];
  failedSlides: LinkedInSlideFailure[];
  imageGenerationStatus: "idle" | "pending" | "queued" | "generating" | "partial" | "ready" | "failed";
  imageModel: string | null;
  hashtags: string[];
  callToAction: string;
  publishStatus: "draft" | "ready" | "scheduled" | "published" | "failed";
  reviewStatus: "draft" | "pending_review" | "approved" | "needs_revision";
};

export type LinkedInConnection = {
  connected: boolean;
  connectedAt: string | null;
  updatedAt: string;
  memberUrn: string | null;
  memberName: string | null;
  accessToken: string | null;
  expiresAt: string | null;
};

export type LinkedInApproval = {
  approvalId: string;
  createdAt: string;
  approved: boolean;
  notes: string;
};

export type LinkedInSchedule = {
  scheduleId: string;
  createdAt: string;
  scheduledFor: string;
  timezone: string;
  status: "scheduled" | "published" | "cancelled";
  publishedAt: string | null;
  notes: string;
};

export type LinkedInPublication = {
  publicationId: string;
  createdAt: string;
  publishedAt: string | null;
  postUrn: string | null;
  externalUrl: string | null;
  status: "draft" | "published" | "failed";
  error: string | null;
};

export type LinkedInRecord = {
  articleSlug: string;
  createdAt: string;
  updatedAt: string;
  draft: LinkedInDraft | null;
  connection: LinkedInConnection | null;
  approvals: LinkedInApproval[];
  schedule: LinkedInSchedule | null;
  publication: LinkedInPublication | null;
};

export type LinkedInArticlesRecord = {
  runId: string;
  schemaVersion: "1";
  createdAt: string;
  updatedAt: string;
  articles: LinkedInRecord[];
};

export type SocialSourceMode = "url" | "manual";
export type SocialPlatform = "instagram" | "linkedin" | "x";
export type SocialVariantFormat = "single" | "carousel" | "thread";

export type SocialSource = {
  mode: SocialSourceMode;
  url: string | null;
  topic: string;
  audience: string;
  notes: string;
  seedRunId: string | null;
  seedArticleSlug: string | null;
  seedArticleTitle: string | null;
  seedArticleSummary: string | null;
};

export type SocialResearchReference = {
  label: string;
  url: string;
  summary: string;
};

export type SocialResearch = {
  sourceSummary: string;
  audience: string;
  keyInsights: string[];
  references: SocialResearchReference[];
  recommendedAngles: string[];
  researchedAt: string;
};

export type SocialVariant = {
  variantId: string;
  label: string;
  format: SocialVariantFormat;
  title: string;
  body: string;
  segments: string[];
  hashtags: string[];
  callToAction: string;
  designNotes: string[];
  createdAt: string;
  updatedAt: string;
};

export type SocialComment = {
  commentId: string;
  createdAt: string;
  text: string;
  resolved: boolean;
};

export type SocialEdit = {
  editId: string;
  createdAt: string;
  variantId: string;
  before: string;
  after: string;
  note: string;
};

export type SocialConnection = {
  connected: boolean;
  connectedAt: string | null;
  updatedAt: string;
  accountName: string | null;
  handle: string | null;
  provider: SocialPlatform;
  accountId: string | null;
  accessToken: string | null;
  refreshToken: string | null;
  tokenExpiresAt: string | null;
  scope: string | null;
  pageId: string | null;
  instagramBusinessAccountId: string | null;
  profileUrl: string | null;
};

export type SocialSchedule = {
  scheduleId: string;
  createdAt: string;
  scheduledFor: string;
  timezone: string;
  status: "scheduled" | "published" | "cancelled";
  publishedAt: string | null;
  notes: string;
};

export type SocialPublication = {
  publicationId: string;
  createdAt: string;
  publishedAt: string | null;
  platformPostId: string | null;
  externalUrl: string | null;
  mediaUrl: string | null;
  status: "draft" | "published" | "failed";
  error: string | null;
};

export type SocialPlatformRecord = {
  platform: SocialPlatform;
  activeVariantId: string | null;
  variants: SocialVariant[];
  comments: SocialComment[];
  editHistory: SocialEdit[];
  connection: SocialConnection | null;
  schedule: SocialSchedule | null;
  publication: SocialPublication | null;
  updatedAt: string;
};

export type SocialProject = {
  projectId: string;
  createdAt: string;
  updatedAt: string;
  title: string;
  source: SocialSource;
  research: SocialResearch | null;
  platforms: SocialPlatformRecord[];
  notes: string;
};

export type SocialProjectSummary = {
  projectId: string;
  title: string;
  updatedAt: string;
  sourceLabel: string;
  sourceMode: SocialSourceMode;
  platformCount: number;
  readyCount: number;
  scheduledCount: number;
};

export type SocialOAuthState = {
  state: string;
  projectId: string;
  platform: SocialPlatform;
  createdAt: string;
  expiresAt: string;
  redirectUri: string;
  codeVerifier?: string | null;
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
  hasBrandGuidelines: boolean;
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
