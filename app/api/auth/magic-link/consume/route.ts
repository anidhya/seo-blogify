import { NextRequest, NextResponse } from "next/server";
import { consumeMagicLinkRequest } from "@/lib/auth-db";
import {
  buildAppUrl,
  createSessionToken,
  getSessionCookieName,
  getSessionMaxAgeSeconds,
  hashMagicLinkToken
} from "@/lib/auth";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.redirect(new URL("/login?error=missing-link", buildAppUrl("/", request.url)));
  }

  const consumed = await consumeMagicLinkRequest(await hashMagicLinkToken(token));
  if (!consumed) {
    return NextResponse.redirect(new URL("/login?error=invalid-link", buildAppUrl("/", request.url)));
  }

  const sessionToken = await createSessionToken({
    userId: consumed.user.id,
    email: consumed.user.email,
    name: consumed.user.name,
    provider: "magic_link"
  });

  const response = NextResponse.redirect(new URL(consumed.nextPath || "/", buildAppUrl("/", request.url)));
  response.cookies.set(getSessionCookieName(), sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: request.nextUrl.protocol === "https:",
    path: "/",
    maxAge: getSessionMaxAgeSeconds()
  });
  return response;
}
