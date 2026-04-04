import { NextResponse } from "next/server";
import { deleteLinkedInOAuthState, loadLinkedInOAuthState, saveLinkedInConnection } from "@/lib/storage";
import { exchangeLinkedInCode, fetchLinkedInProfile } from "@/lib/linkedin";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error) {
    return NextResponse.redirect(new URL(`/?linkedin_error=${encodeURIComponent(error)}`, url.origin));
  }

  if (!code || !state) {
    return NextResponse.json({ error: "LinkedIn callback is missing code or state." }, { status: 400 });
  }

  const oauthState = await loadLinkedInOAuthState(state);
  if (!oauthState) {
    return NextResponse.json({ error: "LinkedIn OAuth state is invalid or expired." }, { status: 400 });
  }

  try {
    const token = await exchangeLinkedInCode(code, oauthState.redirectUri);
    const profile = await fetchLinkedInProfile(token.access_token);

    await saveLinkedInConnection(oauthState.runId, oauthState.articleSlug, {
      connected: true,
      connectedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      memberUrn: profile?.memberUrn ?? null,
      memberName: profile?.memberName ?? null,
      accessToken: token.access_token,
      expiresAt: token.expires_in ? new Date(Date.now() + token.expires_in * 1000).toISOString() : null
    });

    await deleteLinkedInOAuthState(state);
    return NextResponse.redirect(
      new URL(`/runs/${oauthState.runId}/blog/${oauthState.articleSlug}/linkedin?connected=1`, url.origin)
    );
  } catch (caughtError) {
    await deleteLinkedInOAuthState(state);
    const message = caughtError instanceof Error ? caughtError.message : "LinkedIn OAuth failed.";
    return NextResponse.redirect(
      new URL(
        `/runs/${oauthState.runId}/blog/${oauthState.articleSlug}/linkedin?linkedin_error=${encodeURIComponent(message)}`,
        url.origin
      )
    );
  }
}
