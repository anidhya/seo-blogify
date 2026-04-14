export const runtime = "nodejs";

import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import {
  buildInstagramAuthorizationUrl,
  buildXAuthorizationUrl,
  createXOAuthChallenge,
  createXOAuthVerifier
} from "@/lib/social-integrations";
import { saveSocialOAuthState } from "@/lib/storage";
import type { SocialPlatform } from "@/lib/types";

export async function GET(request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    const { projectId } = await params;
    const url = new URL(request.url);
    const platform = url.searchParams.get("platform") as SocialPlatform | null;

    if (!platform || !["instagram", "x"].includes(platform)) {
      return NextResponse.json({ error: "A supported platform is required." }, { status: 400 });
    }

    const state = randomUUID();
    const redirectUri =
      platform === "x"
        ? process.env.X_REDIRECT_URI ?? `${url.origin}/api/social/connect/callback`
        : process.env.META_REDIRECT_URI ?? `${url.origin}/api/social/connect/callback`;
    const expiresAt = new Date(Date.now() + 1000 * 60 * 10).toISOString();

    if (platform === "x") {
      const codeVerifier = createXOAuthVerifier();
      const codeChallenge = createXOAuthChallenge(codeVerifier);
      await saveSocialOAuthState({
        state,
        projectId,
        platform,
        createdAt: new Date().toISOString(),
        expiresAt,
        redirectUri,
        codeVerifier
      });

      const authUrl = buildXAuthorizationUrl({
        state,
        codeChallenge,
        redirectUri
      });

      return NextResponse.redirect(authUrl);
    }

    await saveSocialOAuthState({
      state,
      projectId,
      platform,
      createdAt: new Date().toISOString(),
      expiresAt,
      redirectUri,
      codeVerifier: null
    });

    const authUrl = buildInstagramAuthorizationUrl({
      state,
      redirectUri
    });

    return NextResponse.redirect(authUrl);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to start the connect flow." },
      { status: 400 }
    );
  }
}
