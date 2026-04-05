import { NextResponse } from "next/server";
import { buildLinkedInAuthorizationUrl } from "@/lib/linkedin";
import { saveLinkedInOAuthState } from "@/lib/storage";
import { randomUUID } from "node:crypto";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const runId = url.searchParams.get("runId");
  const articleSlug = url.searchParams.get("articleSlug");

  if (!runId || !articleSlug) {
    return NextResponse.json({ error: "runId and articleSlug are required." }, { status: 400 });
  }

  const state = randomUUID();
  const redirectUri = process.env.LINKEDIN_REDIRECT_URI ?? `${url.origin}/api/linkedin/callback`;

  await saveLinkedInOAuthState({
    state,
    runId,
    articleSlug,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 1000 * 60 * 10).toISOString(),
    redirectUri
  });

  const authUrl = buildLinkedInAuthorizationUrl({
    state,
    redirectUri
  });

  return NextResponse.redirect(authUrl);
}
