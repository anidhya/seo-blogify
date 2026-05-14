import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/auth";

const PUBLIC_PATHS = [
  "/login",
  "/api/auth/google",
  "/api/auth/google/callback",
  "/api/auth/magic-link",
  "/api/auth/magic-link/consume",
  "/api/auth/logout",
  "/api/auth/me"
];

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

function shouldSkip(pathname: string) {
  return (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/icons") ||
    pathname.startsWith("/images") ||
    pathname.startsWith("/assets") ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    pathname === "/manifest.json"
  );
}

function sanitizeNextPath(value: string | null) {
  if (!value || !value.startsWith("/")) {
    return "/";
  }

  return value;
}

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (shouldSkip(pathname)) {
    return NextResponse.next();
  }

  const session = await verifySessionToken(request.cookies.get("marketier_session")?.value);
  if (session) {
    if (pathname === "/login") {
      const loginNext = sanitizeNextPath(request.nextUrl.searchParams.get("next"));
      return NextResponse.redirect(new URL(loginNext, request.url));
    }

    return NextResponse.next();
  }

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", `${pathname}${search}`);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
