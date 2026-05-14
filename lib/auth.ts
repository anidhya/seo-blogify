const SESSION_COOKIE_NAME = "marketier_session";
const GOOGLE_STATE_COOKIE_NAME = "marketier_google_state";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;
const GOOGLE_STATE_TTL_MS = 1000 * 60 * 10;
const MAGIC_LINK_TTL_MS = 1000 * 60 * 15;

export type AuthSessionUser = {
  userId: string;
  email: string;
  name: string | null;
  provider: "google" | "magic_link";
  issuedAt: number;
  expiresAt: number;
};

export type GoogleOAuthState = {
  state: string;
  nextPath: string;
  issuedAt: number;
  expiresAt: number;
};

function getAuthSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret && process.env.NODE_ENV === "production") {
    throw new Error("AUTH_SECRET is required for authentication.");
  }

  return secret || "marketier-development-secret";
}

function getAppUrl(requestUrl?: string) {
  const configured = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (configured) {
    return configured.replace(/\/$/, "");
  }

  if (requestUrl) {
    try {
      return new URL(requestUrl).origin;
    } catch {
      return requestUrl.replace(/\/$/, "");
    }
  }

  return "http://localhost:3000";
}

function encodeBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  const base64 =
    typeof btoa === "function"
      ? btoa(binary)
      : Buffer.from(binary, "binary").toString("base64");
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function decodeBase64Url(value: string) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  if (typeof atob === "function") {
    const binary = atob(padded);
    return Uint8Array.from(binary, (char) => char.charCodeAt(0));
  }

  return Uint8Array.from(Buffer.from(padded, "base64"));
}

function toUtf8(value: string) {
  return new TextEncoder().encode(value);
}

function fromUtf8(bytes: ArrayBuffer | Uint8Array) {
  return new TextDecoder().decode(bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes));
}

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", toUtf8(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function hmacSignature(value: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    toUtf8(getAuthSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, toUtf8(value));
  return encodeBase64Url(new Uint8Array(signature));
}

export async function createSignedToken<T extends object>(payload: T) {
  const body = encodeBase64Url(toUtf8(JSON.stringify(payload)));
  const signature = await hmacSignature(body);
  return `${body}.${signature}`;
}

export async function verifySignedToken<T extends object>(token: string) {
  const [body, signature] = token.split(".");
  if (!body || !signature) {
    return null;
  }

  const expected = await hmacSignature(body);
  if (expected !== signature) {
    return null;
  }

  try {
    return JSON.parse(fromUtf8(decodeBase64Url(body))) as T;
  } catch {
    return null;
  }
}

export function createSessionPayload(user: {
  userId: string;
  email: string;
  name: string | null;
  provider: "google" | "magic_link";
}): AuthSessionUser {
  const issuedAt = Date.now();
  return {
    ...user,
    issuedAt,
    expiresAt: issuedAt + SESSION_TTL_MS
  };
}

export async function createSessionToken(user: {
  userId: string;
  email: string;
  name: string | null;
  provider: "google" | "magic_link";
}) {
  return createSignedToken(createSessionPayload(user));
}

export async function verifySessionToken(token: string | undefined | null) {
  if (!token) {
    return null;
  }

  const payload = await verifySignedToken<AuthSessionUser>(token);
  if (!payload || payload.expiresAt < Date.now()) {
    return null;
  }

  return payload;
}

export function randomToken(byteLength = 32) {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return encodeBase64Url(bytes);
}

export async function hashMagicLinkToken(token: string) {
  return sha256Hex(token);
}

export function buildAppUrl(pathname: string, requestUrl?: string) {
  const baseUrl = getAppUrl(requestUrl);
  return new URL(pathname, baseUrl).toString();
}

export function buildGoogleAuthorizationUrl(params: {
  state: string;
  redirectUri: string;
  nextPath: string;
}) {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  if (!clientId) {
    throw new Error("GOOGLE_OAUTH_CLIENT_ID is required for Google login.");
  }

  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", params.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "select_account");
  url.searchParams.set("state", params.state);
  return url.toString();
}

export function getGoogleAuthConfig(requestUrl?: string) {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI || buildAppUrl("/api/auth/google/callback", requestUrl);

  return {
    clientId: clientId || null,
    clientSecret: clientSecret || null,
    redirectUri
  };
}

export function createGoogleOAuthState(nextPath: string) {
  const issuedAt = Date.now();
  const state = randomToken(24);
  const payload: GoogleOAuthState = {
    state,
    nextPath: nextPath.startsWith("/") ? nextPath : "/",
    issuedAt,
    expiresAt: issuedAt + GOOGLE_STATE_TTL_MS
  };

  return payload;
}

export function isMagicLinkEnabled() {
  return Boolean(process.env.RESEND_API_KEY);
}

export function getMagicLinkUrl(token: string, requestUrl?: string) {
  return buildAppUrl(`/api/auth/magic-link/consume?token=${encodeURIComponent(token)}`, requestUrl);
}

export function getSessionCookieName() {
  return SESSION_COOKIE_NAME;
}

export function getGoogleStateCookieName() {
  return GOOGLE_STATE_COOKIE_NAME;
}

export function getSessionMaxAgeSeconds() {
  return Math.floor(SESSION_TTL_MS / 1000);
}

export function getGoogleStateMaxAgeSeconds() {
  return Math.floor(GOOGLE_STATE_TTL_MS / 1000);
}

export function getMagicLinkMaxAgeSeconds() {
  return Math.floor(MAGIC_LINK_TTL_MS / 1000);
}

export async function hashEmail(email: string) {
  return sha256Hex(email.trim().toLowerCase());
}
