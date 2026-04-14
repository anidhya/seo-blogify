import type {
  SocialComment,
  SocialConnection,
  SocialPlatform,
  SocialPlatformRecord,
  SocialProject,
  SocialResearch,
  SocialSchedule,
  SocialSource,
  SocialVariant
} from "@/lib/types";

export const SOCIAL_PLATFORMS: SocialPlatform[] = ["instagram", "linkedin", "x"];

export type SocialPackVariant = {
  variantId: string;
  label: string;
  format: "single" | "carousel" | "thread";
  title: string;
  body: string;
  segments: string[];
  hashtags: string[];
  callToAction: string;
  designNotes: string[];
};

export type SocialPackPlatform = {
  platform: SocialPlatform;
  platformLabel: string;
  researchSummary: string;
  recommendedAngles: string[];
  variants: SocialPackVariant[];
};

export type SocialContentPack = {
  projectTitle: string;
  research: SocialResearch;
  platformDrafts: SocialPackPlatform[];
};

function stringify(value: unknown) {
  return JSON.stringify(value, null, 2);
}

export function createSocialSourceLabel(source: SocialSource) {
  if (source.mode === "url") {
    return source.url || source.topic || "Social project";
  }

  if (source.seedArticleTitle) {
    return source.seedArticleTitle;
  }

  return source.topic || "Social project";
}

export function buildSocialGenerationPrompt(params: {
  source: SocialSource;
  sourceMaterial: string;
  comments: string[];
  existingResearch?: SocialResearch | null;
  existingDrafts?: SocialContentPack["platformDrafts"];
  focusPlatform?: SocialPlatform | null;
}) {
  const targetLine = params.focusPlatform
    ? `Regenerate with special focus on ${params.focusPlatform}. Keep the other platform outputs consistent.`
    : "Generate all three platform outputs together.";

  return [
    "Create a researched social content pack for Instagram, LinkedIn, and X.",
    "Use the source material and research notes to write platform-native copy.",
    "Return exactly 2 variants for each platform: one single-post version and one native long-form version.",
    "For Instagram and LinkedIn, the long-form version should be a carousel. For X, the long-form version should be a thread.",
    "Keep the research concise and evidence-backed.",
    "Write content that is useful, specific, and editable.",
    "Include concise design notes for the carousel/thread variant so a visual editor can refine it later.",
    targetLine,
    params.comments.length > 0 ? `Reviewer comments:\n${params.comments.map((comment, index) => `${index + 1}. ${comment}`).join("\n")}` : "Reviewer comments: none.",
    params.existingResearch ? `Existing research:\n${stringify(params.existingResearch)}` : "Existing research: none.",
    params.existingDrafts ? `Existing drafts:\n${stringify(params.existingDrafts)}` : "Existing drafts: none.",
    "",
    `Source:\n${stringify(params.source)}`,
    "",
    `Source material:\n${params.sourceMaterial}`
  ].join("\n");
}

function socialPlatformLabel(platform: SocialPlatform) {
  return platform === "x" ? "X" : platform === "linkedin" ? "LinkedIn" : "Instagram";
}

function createVariantSet(platform: SocialPlatform, topic: string, notes: string, keyword: string): SocialPackVariant[] {
  const commonHashtags = [keyword, topic, "socialstrategy", "contentmarketing"]
    .map((item) => item.toLowerCase().replace(/\s+/g, ""))
    .filter(Boolean);

  const carouselLabel = platform === "x" ? "thread" : "carousel";
  const singleLabel = "single";

  return [
    {
      variantId: `${platform}-single`,
      label: `${socialPlatformLabel(platform)} single post`,
      format: singleLabel,
      title: `${topic} - direct post`,
      body: `A concise ${socialPlatformLabel(platform)} post about ${topic}. ${notes}`,
      segments: [],
      hashtags: commonHashtags,
      callToAction: `Read more about ${topic}.`,
      designNotes: [`Use a tight, readable ${socialPlatformLabel(platform)} voice.`]
    },
    {
      variantId: `${platform}-${carouselLabel}`,
      label: `${socialPlatformLabel(platform)} ${carouselLabel}`,
      format: platform === "x" ? "thread" : "carousel",
      title: `${topic} - ${carouselLabel}`,
      body: `A long-form ${socialPlatformLabel(platform)} ${carouselLabel} about ${topic}. ${notes}`,
      segments: [
        `Hook: ${topic}`,
        `Insight: why it matters`,
        `Point 1: key takeaway`,
        `Point 2: practical step`,
        `Close: what to do next`
      ],
      hashtags: commonHashtags,
      callToAction: `See the full breakdown of ${topic}.`,
      designNotes: [`Keep the ${carouselLabel} visually consistent across all slides.`]
    }
  ];
}

export function buildFallbackSocialPack(params: {
  source: SocialSource;
  sourceMaterial: string;
  comments: string[];
  focusPlatform?: SocialPlatform | null;
}): SocialContentPack {
  const topic = params.source.seedArticleTitle || params.source.topic || "Social content";
  const keyword = (params.source.topic || params.source.seedArticleTitle || "content").split(" ")[0];
  const notes = params.comments.length > 0 ? params.comments.join(" ") : params.source.notes || "Keep it practical and audience-led.";

  return {
    projectTitle: topic,
    research: {
      sourceSummary: params.source.seedArticleSummary || params.source.notes || params.sourceMaterial.slice(0, 220) || topic,
      audience: params.source.audience || "Primary social audience",
      keyInsights: [
        `${topic} needs a clear point of view.`,
        "Short-form social copy should surface one useful idea at a time.",
        "Strong hooks and practical proof points increase completion and saves."
      ],
      references: [
        {
          label: "Source brief",
          url: params.source.url || params.source.seedArticleSlug || "internal",
          summary: params.source.notes || topic
        }
      ],
      recommendedAngles: [
        "Problem / solution",
        "Framework or checklist",
        "Mistakes to avoid"
      ],
      researchedAt: new Date().toISOString()
    },
    platformDrafts: SOCIAL_PLATFORMS.map((platform) => ({
      platform,
      platformLabel: socialPlatformLabel(platform),
      researchSummary: `Post angle for ${socialPlatformLabel(platform)} based on ${topic}.`,
      recommendedAngles: ["Hook the reader fast", "Give one practical takeaway", "End with a clear action"],
      variants: createVariantSet(
        platform,
        topic,
        params.focusPlatform && params.focusPlatform === platform ? `${notes} Keep this version especially responsive to the recent comments.` : notes,
        keyword
      )
    }))
  };
}

export function emptySocialPlatform(platform: SocialPlatform, now: string): SocialPlatformRecord {
  return {
    platform,
    activeVariantId: null,
    variants: [],
    comments: [],
    editHistory: [],
    connection: null,
    schedule: null,
    publication: null,
    updatedAt: now
  };
}

export function materializeVariant(variant: SocialPackVariant, now: string): SocialVariant {
  return {
    variantId: variant.variantId,
    label: variant.label,
    format: variant.format,
    title: variant.title,
    body: variant.body,
    segments: variant.segments ?? [],
    hashtags: variant.hashtags,
    callToAction: variant.callToAction,
    designNotes: variant.designNotes ?? [],
    createdAt: now,
    updatedAt: now
  };
}

export function createPlatformRecord(platformDraft: SocialPackPlatform, now: string): SocialPlatformRecord {
  const variants = platformDraft.variants.map((variant) => materializeVariant(variant, now));
  return {
    platform: platformDraft.platform,
    activeVariantId: variants[0]?.variantId ?? null,
    variants,
    comments: [],
    editHistory: [],
    connection: null,
    schedule: null,
    publication: null,
    updatedAt: now
  };
}

export function createSocialProjectFromPack(params: {
  projectId: string;
  title?: string;
  source: SocialSource;
  research: SocialResearch;
  pack: SocialContentPack;
  notes: string;
  createdAt?: string;
}) {
  const now = params.createdAt ?? new Date().toISOString();
  return {
    projectId: params.projectId,
    createdAt: now,
    updatedAt: now,
    title: params.title || params.pack.projectTitle || createSocialSourceLabel(params.source),
    source: params.source,
    research: params.research,
    platforms: SOCIAL_PLATFORMS.map((platform) => {
      const draft = params.pack.platformDrafts.find((entry) => entry.platform === platform);
      return draft ? createPlatformRecord(draft, now) : emptySocialPlatform(platform, now);
    }),
    notes: params.notes
  } satisfies SocialProject;
}

export function mergePackIntoProject(project: SocialProject, pack: SocialContentPack) {
  const now = new Date().toISOString();
  return {
    ...project,
    updatedAt: now,
    title: pack.projectTitle || project.title,
    research: pack.research || project.research,
    platforms: project.platforms.map((platform) => {
      const draft = pack.platformDrafts.find((entry) => entry.platform === platform.platform);

      if (!draft) {
        return {
          ...platform,
          updatedAt: now
        };
      }

      const variants = draft.variants.map((variant) => materializeVariant(variant, now));
      const activeVariantId = variants.some((variant) => variant.variantId === platform.activeVariantId)
        ? platform.activeVariantId
        : variants[0]?.variantId ?? null;

      return {
        ...platform,
        activeVariantId,
        variants,
        updatedAt: now
      };
    })
  } satisfies SocialProject;
}

export function getPlatformRecord(project: SocialProject, platform: SocialPlatform) {
  const index = project.platforms.findIndex((entry) => entry.platform === platform);
  if (index === -1) {
    return null;
  }

  return {
    index,
    platform: project.platforms[index]
  };
}

export function getActiveVariant(platform: SocialPlatformRecord) {
  if (!platform.variants.length) {
    return null;
  }

  return platform.variants.find((variant) => variant.variantId === platform.activeVariantId) ?? platform.variants[0] ?? null;
}

export function updatePlatformConnection(
  platform: SocialPlatformRecord,
  connection: SocialConnection | null,
  now: string
): SocialPlatformRecord {
  return {
    ...platform,
    connection,
    updatedAt: now
  };
}

export function updatePlatformSchedule(
  platform: SocialPlatformRecord,
  schedule: SocialSchedule | null,
  now: string
): SocialPlatformRecord {
  return {
    ...platform,
    schedule,
    updatedAt: now
  };
}

export function addPlatformComment(platform: SocialPlatformRecord, comment: SocialComment, now: string) {
  return {
    ...platform,
    comments: [...platform.comments, comment],
    updatedAt: now
  };
}
