import { NextRequest, NextResponse } from "next/server";
import {
  buildGoogleAuthorizationUrl,
  createGoogleOAuthState,
  createSignedToken,
  getGoogleAuthConfig,
  getGoogleStateCookieName,
  getGoogleStateMaxAgeSeconds
} from "@/lib/auth";

function sanitizeNextPath(nextPath: string | null) {
  if (!nextPath || !nextPath.startsWith("/")) {
    return "/";
  }

  return nextPath;
}

export async function GET(request: NextRequest) {
  const config = getGoogleAuthConfig(request.url);
  if (!config.clientId || !config.clientSecret) {
    return NextResponse.json({ error: "Google OAuth is not configured." }, { status: 500 });
  }

  const nextPath = sanitizeNextPath(request.nextUrl.searchParams.get("next"));
  const oauthState = createGoogleOAuthState(nextPath);
  const stateCookie = await createSignedToken(oauthState);
  const response = NextResponse.redirect(
    buildGoogleAuthorizationUrl({
      state: oauthState.state,
      redirectUri: config.redirectUri,
      nextPath
    })
  );

  response.cookies.set(getGoogleStateCookieName(), stateCookie, {
    httpOnly: true,
    sameSite: "lax",
    secure: request.nextUrl.protocol === "https:",
    path: "/",
    maxAge: getGoogleStateMaxAgeSeconds()
  });

  return response;
}
