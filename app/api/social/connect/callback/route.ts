export const runtime = "nodejs";

import { NextResponse } from "next/server";
import {
  exchangeInstagramCode,
  exchangeXCode,
  fetchInstagramProfile,
  fetchXProfile
} from "@/lib/social-integrations";
import {
  deleteSocialOAuthState,
  loadSocialOAuthState,
  loadSocialProject,
  saveSocialProject
} from "@/lib/storage";
import type { SocialConnection, SocialProject } from "@/lib/types";

function redirectWithError(origin: string, projectId: string, message: string) {
  return NextResponse.redirect(new URL(`/social/${projectId}?social_error=${encodeURIComponent(message)}`, origin));
}

function buildConnection(project: SocialProject, connection: SocialConnection, platform: "instagram" | "x") {
  const index = project.platforms.findIndex((entry) => entry.platform === platform);
  if (index === -1) {
    return null;
  }

  const nextProject = {
    ...project,
    platforms: project.platforms.map((entry, currentIndex) =>
      currentIndex === index
        ? {
            ...entry,
            connection,
            updatedAt: new Date().toISOString()
          }
        : entry
    ),
    updatedAt: new Date().toISOString()
  };

  return nextProject;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error) {
    return NextResponse.redirect(new URL(`/social?social_error=${encodeURIComponent(error)}`, url.origin));
  }

  if (!code || !state) {
    return NextResponse.json({ error: "Callback is missing code or state." }, { status: 400 });
  }

  const oauthState = await loadSocialOAuthState(state);
  if (!oauthState) {
    return NextResponse.json({ error: "OAuth state is invalid or expired." }, { status: 400 });
  }

  const project = await loadSocialProject(oauthState.projectId);
  if (!project) {
    await deleteSocialOAuthState(state);
    return redirectWithError(url.origin, oauthState.projectId, "Project not found.");
  }

  try {
    const now = new Date().toISOString();

    if (oauthState.platform === "x") {
      if (!oauthState.codeVerifier) {
        throw new Error("X OAuth verifier is missing.");
      }

      const token = await exchangeXCode(code, oauthState.codeVerifier, oauthState.redirectUri);
      const profile = await fetchXProfile(token.access_token);
      const connection: SocialConnection = {
        connected: true,
        connectedAt: now,
        updatedAt: now,
        accountName: profile?.accountName ?? null,
        handle: profile?.handle ?? null,
        provider: "x",
        accountId: profile?.accountId ?? null,
        accessToken: token.access_token,
        refreshToken: token.refresh_token ?? null,
        tokenExpiresAt: token.expires_in ? new Date(Date.now() + token.expires_in * 1000).toISOString() : null,
        scope: token.scope ?? null,
        pageId: null,
        instagramBusinessAccountId: null,
        profileUrl: profile?.profileUrl ?? null
      };

      const nextProject = buildConnection(project, connection, "x");
      if (!nextProject) {
        throw new Error("X platform record was not found.");
      }

      await saveSocialProject(nextProject);
      await deleteSocialOAuthState(state);
      return NextResponse.redirect(new URL(`/social/${oauthState.projectId}?connected=1`, url.origin));
    }

    const token = await exchangeInstagramCode(code, oauthState.redirectUri);
    const profile = await fetchInstagramProfile(token.access_token);
    const connection: SocialConnection = {
      connected: true,
      connectedAt: now,
      updatedAt: now,
      accountName: profile?.accountName ?? null,
      handle: profile?.handle ?? null,
      provider: "instagram",
      accountId: profile?.accountId ?? null,
      accessToken: token.access_token,
      refreshToken: null,
      tokenExpiresAt: token.expires_in ? new Date(Date.now() + token.expires_in * 1000).toISOString() : null,
      scope: null,
      pageId: profile?.pageId ?? null,
      instagramBusinessAccountId: profile?.instagramBusinessAccountId ?? null,
      profileUrl: profile?.profileUrl ?? null
    };

    const nextProject = buildConnection(project, connection, "instagram");
    if (!nextProject) {
      throw new Error("Instagram platform record was not found.");
    }

    await saveSocialProject(nextProject);
    await deleteSocialOAuthState(state);
    return NextResponse.redirect(new URL(`/social/${oauthState.projectId}?connected=1`, url.origin));
  } catch (caughtError) {
    await deleteSocialOAuthState(state);
    const message = caughtError instanceof Error ? caughtError.message : "OAuth failed.";
    return redirectWithError(url.origin, oauthState.projectId, message);
  }
}
