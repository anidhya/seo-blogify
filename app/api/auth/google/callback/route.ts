import { NextRequest, NextResponse } from "next/server";
import {
  createSessionToken,
  getGoogleAuthConfig,
  getGoogleStateCookieName,
  getSessionCookieName,
  getSessionMaxAgeSeconds,
  verifySignedToken
} from "@/lib/auth";
import { upsertGoogleIdentity } from "@/lib/auth-db";

type GoogleOAuthState = {
  state: string;
  nextPath: string;
  issuedAt: number;
  expiresAt: number;
};

async function exchangeCode(params: {
  code: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}) {
  const body = new URLSearchParams({
    client_id: params.clientId,
    client_secret: params.clientSecret,
    code: params.code,
    grant_type: "authorization_code",
    redirect_uri: params.redirectUri
  });

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body
  });

  if (!response.ok) {
    throw new Error("Unable to exchange Google authorization code.");
  }

  return response.json() as Promise<{ access_token?: string }>;
}

async function loadGoogleUserInfo(accessToken: string) {
  const response = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    throw new Error("Unable to load Google user profile.");
  }

  return response.json() as Promise<{
    sub?: string;
    email?: string;
    email_verified?: boolean;
    name?: string;
  }>;
}

function redirectWithError(request: NextRequest, message: string) {
  const url = new URL("/login", request.url);
  url.searchParams.set("error", message);
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const error = request.nextUrl.searchParams.get("error");

  if (error) {
    return redirectWithError(request, error);
  }

  if (!code || !state) {
    return redirectWithError(request, "Missing Google authorization response.");
  }

  const stateCookie = request.cookies.get(getGoogleStateCookieName())?.value;
  const parsedState = await verifySignedToken<GoogleOAuthState>(stateCookie || "");
  if (!parsedState || parsedState.state !== state || parsedState.expiresAt < Date.now()) {
    return redirectWithError(request, "Google login expired. Please try again.");
  }

  const { clientId, clientSecret, redirectUri } = getGoogleAuthConfig(request.url);
  if (!clientId || !clientSecret) {
    return redirectWithError(request, "Google OAuth is not configured.");
  }

  try {
    const tokens = await exchangeCode({
      code,
      clientId,
      clientSecret,
      redirectUri
    });

    if (!tokens.access_token) {
      throw new Error("Google did not return an access token.");
    }

    const profile = await loadGoogleUserInfo(tokens.access_token);
    if (!profile.sub || !profile.email) {
      throw new Error("Google profile did not include an email address.");
    }

    if (profile.email_verified === false) {
      throw new Error("Google email is not verified.");
    }

    const user = await upsertGoogleIdentity({
      providerAccountId: profile.sub,
      email: profile.email,
      name: profile.name ?? null
    });

    const sessionToken = await createSessionToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      provider: "google"
    });

    const response = NextResponse.redirect(new URL(parsedState.nextPath || "/", request.url));
    response.cookies.set(getSessionCookieName(), sessionToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: request.nextUrl.protocol === "https:",
      path: "/",
      maxAge: getSessionMaxAgeSeconds()
    });
    response.cookies.set(getGoogleStateCookieName(), "", {
      httpOnly: true,
      sameSite: "lax",
      secure: request.nextUrl.protocol === "https:",
      path: "/",
      maxAge: 0
    });
    return response;
  } catch (error) {
    return redirectWithError(request, error instanceof Error ? error.message : "Google sign-in failed.");
  }
}
