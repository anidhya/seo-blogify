export const runtime = "nodejs";

import { randomUUID } from "node:crypto";
import { generateSocialContentPack } from "@/lib/openai";
import {
  addPlatformComment,
  buildFallbackSocialPack,
  buildSocialGenerationPrompt,
  getActiveVariant,
  getPlatformRecord,
  mergePackIntoProject,
  updatePlatformConnection,
  updatePlatformSchedule
} from "@/lib/social-workflow";
import { directPublishSocialPost } from "@/lib/social-integrations";
import { deleteSocialProject, loadSocialProject, saveSocialProject } from "@/lib/storage";
import type { SocialPlatform, SocialProject, SocialVariant } from "@/lib/types";
import { NextResponse } from "next/server";

type PatchBody = {
  action:
    | "select-variant"
    | "update-variant"
    | "add-comment"
    | "regenerate"
    | "connect"
    | "schedule"
    | "publish"
    | "resolve-comment";
  platform?: SocialPlatform;
  variantId?: string;
  comment?: string;
  commentId?: string;
  text?: string;
  title?: string;
  body?: string;
  segments?: string[];
  hashtags?: string[];
  callToAction?: string;
  designNotes?: string[];
  label?: string;
  accountName?: string;
  handle?: string;
  scheduledFor?: string;
  timezone?: string;
  notes?: string;
  externalUrl?: string;
};

function trim(value?: string | null) {
  return value?.trim() ?? "";
}

function currentVariantBody(variant: SocialVariant) {
  return [
    `Title: ${variant.title}`,
    `Body:\n${variant.body}`,
    variant.segments.length ? `Segments:\n${variant.segments.map((segment, index) => `${index + 1}. ${segment}`).join("\n")}` : "Segments: none",
    `CTA: ${variant.callToAction}`,
    `Hashtags: ${variant.hashtags.join(" ")}`,
    variant.designNotes.length ? `Design notes:\n${variant.designNotes.join("\n")}` : "Design notes: none"
  ].join("\n");
}

function replacePlatform(project: SocialProject, platformKey: SocialPlatform, nextPlatform: SocialProject["platforms"][number]) {
  return {
    ...project,
    platforms: project.platforms.map((platform) => (platform.platform === platformKey ? nextPlatform : platform)),
    updatedAt: new Date().toISOString()
  };
}

async function regenerateProject(project: SocialProject, focusPlatform?: SocialPlatform) {
  const comments = project.platforms.flatMap((platform) => platform.comments.map((comment) => comment.text));
  const prompt = buildSocialGenerationPrompt({
    source: project.source,
    sourceMaterial: JSON.stringify(
      {
        title: project.title,
        notes: project.notes,
        research: project.research,
        platforms: project.platforms.map((platform) => ({
          platform: platform.platform,
          variants: platform.variants.map((variant) => ({
            variantId: variant.variantId,
            label: variant.label,
            format: variant.format,
            title: variant.title,
            body: variant.body,
            segments: variant.segments,
            hashtags: variant.hashtags,
            callToAction: variant.callToAction,
            designNotes: variant.designNotes
          }))
        }))
      },
      null,
      2
    ),
    comments,
    existingResearch: project.research,
    existingDrafts: project.platforms.map((platform) => ({
      platform: platform.platform,
      platformLabel: platform.platform,
      researchSummary: project.research?.sourceSummary ?? "",
      recommendedAngles: project.research?.recommendedAngles ?? [],
      variants: platform.variants.map((variant) => ({
        variantId: variant.variantId,
        label: variant.label,
        format: variant.format,
        title: variant.title,
        body: variant.body,
        segments: variant.segments,
        hashtags: variant.hashtags,
        callToAction: variant.callToAction,
        designNotes: variant.designNotes
      }))
    })),
    focusPlatform: focusPlatform ?? null
  });

  try {
    return await generateSocialContentPack(prompt);
  } catch {
    return buildFallbackSocialPack({
      source: project.source,
      sourceMaterial: project.research ? JSON.stringify(project.research, null, 2) : project.notes,
      comments,
      focusPlatform: focusPlatform ?? null
    });
  }
}

export async function GET(_: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const project = await loadSocialProject(projectId);

  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  return NextResponse.json({ project });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const body = (await request.json()) as PatchBody;
  const project = await loadSocialProject(projectId);

  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  const now = new Date().toISOString();

  try {
    if (body.action === "regenerate") {
      const pack = await regenerateProject(project, body.platform);
      const nextProject = mergePackIntoProject(project, pack);
      await saveSocialProject(nextProject);
      return NextResponse.json({ project: nextProject });
    }

    if (!body.platform) {
      return NextResponse.json({ error: "A platform is required." }, { status: 400 });
    }

    const located = getPlatformRecord(project, body.platform);
    if (!located) {
      return NextResponse.json({ error: "Platform not found." }, { status: 404 });
    }

    const platform = located.platform;

    if (body.action === "select-variant") {
      const variantId = trim(body.variantId);
      const nextPlatform = {
        ...platform,
        activeVariantId: variantId || platform.activeVariantId,
        updatedAt: now
      };
      const nextProject = replacePlatform(project, body.platform, nextPlatform);
      await saveSocialProject(nextProject);
      return NextResponse.json({ project: nextProject });
    }

    if (body.action === "update-variant") {
      const variantId = trim(body.variantId) || platform.activeVariantId || platform.variants[0]?.variantId || "";
      const variantIndex = platform.variants.findIndex((variant) => variant.variantId === variantId);

      if (variantIndex === -1) {
        return NextResponse.json({ error: "Variant not found." }, { status: 404 });
      }

      const currentVariant = platform.variants[variantIndex];
      const nextVariant: SocialVariant = {
        ...currentVariant,
        title: body.title?.trim() || currentVariant.title,
        body: body.body?.trim() || currentVariant.body,
        segments: body.segments ?? currentVariant.segments,
        hashtags: body.hashtags ?? currentVariant.hashtags,
        callToAction: body.callToAction?.trim() || currentVariant.callToAction,
        designNotes: body.designNotes ?? currentVariant.designNotes,
        label: body.label?.trim() || currentVariant.label,
        updatedAt: now
      };
      const nextPlatform = {
        ...platform,
        variants: platform.variants.map((variant, index) => (index === variantIndex ? nextVariant : variant)),
        updatedAt: now,
        editHistory: [
          ...platform.editHistory,
          {
            editId: `edit-${randomUUID().slice(0, 8)}`,
            createdAt: now,
            variantId: nextVariant.variantId,
            before: currentVariantBody(currentVariant),
            after: currentVariantBody(nextVariant),
            note: body.notes?.trim() || "Manual edit"
          }
        ]
      };
      const nextProject = replacePlatform(project, body.platform, nextPlatform);
      await saveSocialProject(nextProject);
      return NextResponse.json({ project: nextProject });
    }

    if (body.action === "add-comment") {
      const commentText = trim(body.comment || body.text);
      if (!commentText) {
        return NextResponse.json({ error: "Comment text is required." }, { status: 400 });
      }

      const nextPlatform = addPlatformComment(
        platform,
        {
          commentId: `comment-${randomUUID().slice(0, 8)}`,
          createdAt: now,
          text: commentText,
          resolved: false
        },
        now
      );
      const nextProject = replacePlatform(project, body.platform, nextPlatform);
      await saveSocialProject(nextProject);
      return NextResponse.json({ project: nextProject });
    }

    if (body.action === "resolve-comment") {
      const commentId = trim(body.commentId);
      const nextPlatform = {
        ...platform,
        comments: platform.comments.map((comment) =>
          comment.commentId === commentId ? { ...comment, resolved: true } : comment
        ),
        updatedAt: now
      };
      const nextProject = replacePlatform(project, body.platform, nextPlatform);
      await saveSocialProject(nextProject);
      return NextResponse.json({ project: nextProject });
    }

    if (body.action === "connect") {
      if (body.platform === "instagram" || body.platform === "x") {
        return NextResponse.json(
          { error: "Use the OAuth connect flow for Instagram and X." },
          { status: 400 }
        );
      }

      const nextPlatform = updatePlatformConnection(
        platform,
        {
          connected: true,
          connectedAt: now,
          updatedAt: now,
          accountName: trim(body.accountName) || `${body.platform.toUpperCase()} account`,
          handle: trim(body.handle) || null,
          provider: body.platform,
          accountId: null,
          accessToken: null,
          refreshToken: null,
          tokenExpiresAt: null,
          scope: null,
          pageId: null,
          instagramBusinessAccountId: null,
          profileUrl: null
        },
        now
      );
      const nextProject = replacePlatform(project, body.platform, nextPlatform);
      await saveSocialProject(nextProject);
      return NextResponse.json({ project: nextProject });
    }

    if (body.action === "schedule") {
      const scheduledFor = trim(body.scheduledFor);
      if (!scheduledFor) {
        return NextResponse.json({ error: "Scheduled date and time are required." }, { status: 400 });
      }

      const nextPlatform = updatePlatformSchedule(
        platform,
        {
          scheduleId: `schedule-${randomUUID().slice(0, 8)}`,
          createdAt: now,
          scheduledFor,
          timezone: trim(body.timezone) || Intl.DateTimeFormat().resolvedOptions().timeZone,
          status: "scheduled",
          publishedAt: null,
          notes: trim(body.notes)
        },
        now
      );
      const nextProject = replacePlatform(project, body.platform, nextPlatform);
      await saveSocialProject(nextProject);
      return NextResponse.json({ project: nextProject });
    }

    if (body.action === "publish") {
      const activeVariant = getActiveVariant(platform);
      if (!activeVariant) {
        return NextResponse.json({ error: "No active variant is available to publish." }, { status: 400 });
      }

      if ((body.platform === "instagram" || body.platform === "x") && !platform.connection?.accessToken) {
        return NextResponse.json(
          { error: "Connect the account before publishing directly to Instagram or X." },
          { status: 400 }
        );
      }

      if (body.platform === "instagram" || body.platform === "x") {
        const publication = await directPublishSocialPost({
          platform: body.platform,
          connection: platform.connection!,
          platformRecord: platform,
          variant: activeVariant,
          projectId
        });

        const nextPlatform = {
          ...platform,
          publication: {
            publicationId: `publication-${randomUUID().slice(0, 8)}`,
            createdAt: now,
            publishedAt: now,
            platformPostId: publication.platformPostId,
            externalUrl: publication.externalUrl,
            mediaUrl: publication.mediaUrl,
            status: "published" as const,
            error: null
          },
          schedule: platform.schedule
            ? {
                ...platform.schedule,
                status: "published" as const,
                publishedAt: now
              }
            : null,
          updatedAt: now
        };
        const nextProject = replacePlatform(project, body.platform, nextPlatform);
        await saveSocialProject(nextProject);
        return NextResponse.json({ project: nextProject });
      }

      const nextPlatform = {
        ...platform,
        publication: {
          publicationId: `publication-${randomUUID().slice(0, 8)}`,
          createdAt: now,
          publishedAt: now,
          platformPostId: null,
          externalUrl: trim(body.externalUrl) || null,
          mediaUrl: null,
          status: "published" as const,
          error: null
        },
        schedule: platform.schedule
          ? {
              ...platform.schedule,
              status: "published" as const,
              publishedAt: now
            }
          : null,
        updatedAt: now
      };
      const nextProject = replacePlatform(project, body.platform, nextPlatform);
      await saveSocialProject(nextProject);
      return NextResponse.json({ project: nextProject });
    }

    return NextResponse.json({ error: "Unsupported action." }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update social project." },
      { status: 400 }
    );
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  await deleteSocialProject(projectId);
  return NextResponse.json({ ok: true });
}
