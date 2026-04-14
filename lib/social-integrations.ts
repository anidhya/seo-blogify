import { createHash, randomUUID } from "node:crypto";
import { put as putBlob } from "@vercel/blob";
import type { SocialConnection, SocialPlatform, SocialPlatformRecord, SocialVariant } from "@/lib/types";

type XConfig = {
  clientId: string;
  clientSecret: string | null;
  redirectUri: string;
  scope: string;
};

type InstagramConfig = {
  appId: string;
  appSecret: string;
  redirectUri: string;
  scope: string;
  graphVersion: string;
};

export type SocialPublishedResult = {
  platformPostId: string | null;
  externalUrl: string | null;
  mediaUrl: string | null;
};

function readXConfig(requireRedirectUri = true): XConfig {
  const clientId = process.env.X_CLIENT_ID;
  const clientSecret = process.env.X_CLIENT_SECRET ?? null;
  const redirectUri = process.env.X_REDIRECT_URI;

  if (!clientId || (requireRedirectUri && !redirectUri)) {
    throw new Error("Missing X OAuth configuration.");
  }

  return {
    clientId,
    clientSecret,
    redirectUri: redirectUri ?? "",
    scope: process.env.X_SCOPE || "tweet.read tweet.write users.read offline.access"
  };
}

function readInstagramConfig(requireRedirectUri = true): InstagramConfig {
  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  const redirectUri = process.env.META_REDIRECT_URI;

  if (!appId || !appSecret || (requireRedirectUri && !redirectUri)) {
    throw new Error("Missing Instagram OAuth configuration.");
  }

  return {
    appId,
    appSecret,
    redirectUri: redirectUri ?? "",
    scope: process.env.META_SCOPE || "instagram_basic,instagram_content_publish,pages_read_engagement,pages_show_list",
    graphVersion: process.env.META_GRAPH_VERSION || "v24.0"
  };
}

function createPkceVerifier() {
  return randomUUID().replace(/-/g, "") + randomUUID().replace(/-/g, "");
}

function createPkceChallenge(verifier: string) {
  return createHash("sha256").update(verifier).digest("base64url");
}

function buildMetaApiUrl(version: string, path: string) {
  return `https://graph.facebook.com/${version}${path}`;
}

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function wrapText(text: string, maxChars: number) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }

  if (current) {
    lines.push(current);
  }

  return lines;
}

function normalizeSegments(variant: SocialVariant, maxSegments = 8) {
  const segments = variant.segments.map((segment) => segment.trim()).filter(Boolean);

  if (segments.length) {
    return segments.slice(0, maxSegments);
  }

  const paragraphs = variant.body
    .split(/\n+/)
    .map((segment) => segment.trim())
    .filter(Boolean);

  if (paragraphs.length > 1) {
    return paragraphs.slice(0, maxSegments);
  }

  const sentences = variant.body
    .split(/(?<=[.!?])\s+/)
    .map((segment) => segment.trim())
    .filter(Boolean);

  if (sentences.length > 1) {
    return sentences.slice(0, maxSegments);
  }

  const words = variant.body.split(/\s+/).filter(Boolean);
  const fallback: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > 90 && current) {
      fallback.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }

  if (current) {
    fallback.push(current);
  }

  return fallback.slice(0, maxSegments);
}

function buildCaption(variant: SocialVariant, options: { maxLength: number; includeSegments?: boolean }) {
  const parts = [variant.title.trim(), variant.body.trim()];
  if (options.includeSegments && variant.segments.length > 0) {
    parts.push(...variant.segments);
  }
  if (variant.callToAction.trim()) {
    parts.push(variant.callToAction.trim());
  }
  if (variant.hashtags.length > 0) {
    parts.push(variant.hashtags.map((tag) => (tag.startsWith("#") ? tag : `#${tag}`)).join(" "));
  }

  const caption = parts.filter(Boolean).join("\n\n").trim();
  return caption.length > options.maxLength ? `${caption.slice(0, options.maxLength - 3).trim()}...` : caption;
}

function buildXPostText(variant: SocialVariant, includePrefix = true) {
  const hashtags = variant.hashtags.map((tag) => (tag.startsWith("#") ? tag : `#${tag}`)).join(" ");
  const base = [includePrefix ? variant.title.trim() : "", variant.body.trim(), variant.callToAction.trim(), hashtags]
    .filter(Boolean)
    .join("\n\n")
    .trim();
  return base || variant.title || variant.body;
}

function chunkText(text: string, limit = 280) {
  const cleaned = text.trim();
  if (!cleaned) {
    return [""];
  }

  if (cleaned.length <= limit) {
    return [cleaned];
  }

  const segments = cleaned.split(/\n+/).flatMap((segment) => segment.split(/(?<=[.!?])\s+/));
  const chunks: string[] = [];
  let current = "";

  for (const segment of segments) {
    const next = current ? `${current} ${segment}`.trim() : segment.trim();
    if (next.length > limit && current) {
      chunks.push(current.trim());
      current = segment.trim();
    } else if (next.length > limit) {
      chunks.push(segment.trim().slice(0, limit));
      current = "";
    } else {
      current = next;
    }
  }

  if (current) {
    chunks.push(current.trim());
  }

  return chunks.filter(Boolean);
}

function colorForSlide(index: number) {
  const palette = ["#f97316", "#8b5cf6", "#0ea5e9", "#10b981", "#f43f5e", "#6366f1"];
  return palette[index % palette.length];
}

function buildInstagramSlideSvg(params: {
  title: string;
  body: string;
  footer: string;
  badge: string;
  slideLabel: string;
  totalSlides: number;
  accent: string;
  mode: "single" | "carousel";
  subheading?: string;
  callToAction?: string;
}) {
  const width = 1080;
  const height = 1350;
  const titleLines = wrapText(params.title, params.mode === "carousel" ? 24 : 28).slice(0, 4);
  const bodyLines = wrapText(params.body, params.mode === "carousel" ? 26 : 34).slice(0, params.mode === "carousel" ? 7 : 9);
  const footerLines = wrapText(params.footer, 32).slice(0, 2);
  const subheadingLines = params.subheading ? wrapText(params.subheading, 36).slice(0, 2) : [];
  const ctaLines = params.callToAction ? wrapText(params.callToAction, 34).slice(0, 2) : [];

  const line = (lines: string[], x: number, y: number, step: number, size: number, fill: string, weight = 600) =>
    lines
      .map(
        (text, index) =>
          `<text x="${x}" y="${y + index * step}" fill="${fill}" font-family="Inter, Arial, sans-serif" font-size="${size}" font-weight="${weight}">${escapeXml(text)}</text>`
      )
      .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#08111f"/>
      <stop offset="52%" stop-color="#111827"/>
      <stop offset="52.1%" stop-color="#f8fafc"/>
      <stop offset="100%" stop-color="#ffffff"/>
    </linearGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${params.accent}"/>
      <stop offset="100%" stop-color="#8b5cf6"/>
    </linearGradient>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#bg)"/>
  <circle cx="920" cy="136" r="172" fill="url(#accent)" opacity="0.16"/>
  <circle cx="120" cy="1140" r="156" fill="url(#accent)" opacity="0.08"/>
  <circle cx="980" cy="1130" r="92" fill="url(#accent)" opacity="0.12"/>
  <rect x="72" y="72" rx="26" ry="26" width="258" height="58" fill="#ffffff" opacity="0.08"/>
  <text x="102" y="110" fill="#ffffff" font-family="Inter, Arial, sans-serif" font-size="24" font-weight="700">${escapeXml(params.badge)}</text>
  <rect x="824" y="74" rx="18" ry="18" width="176" height="48" fill="#ffffff" opacity="0.09"/>
  <text x="852" y="104" fill="#ffffff" font-family="Inter, Arial, sans-serif" font-size="18" font-weight="700">${escapeXml(params.slideLabel)}</text>
  <text x="946" y="104" fill="#cbd5e1" font-family="Inter, Arial, sans-serif" font-size="18" font-weight="500">${params.totalSlides}</text>
  ${line(subheadingLines, 88, 212, 38, 25, "#cbd5e1", 500)}
  ${line(titleLines, 88, 324, 66, 56, "#ffffff", 800)}
  <rect x="88" y="404" width="176" height="6" rx="3" fill="url(#accent)"/>
  <rect x="88" y="474" rx="28" ry="28" width="904" height="${params.mode === "carousel" ? 540 : 466}" fill="#ffffff" stroke="#e2e8f0"/>
  ${line(bodyLines, 128, 580, 42, params.mode === "carousel" ? 34 : 36, "#0f172a", 650)}
  ${params.callToAction ? `<rect x="128" y="${params.mode === "carousel" ? 910 : 874}" rx="22" ry="22" width="236" height="54" fill="url(#accent)"/>` : ""}
  ${params.callToAction ? line(ctaLines, 156, params.mode === "carousel" ? 945 : 910, 34, 24, "#ffffff", 700) : ""}
  <rect x="88" y="1042" rx="22" ry="22" width="904" height="150" fill="#f8fafc" stroke="#e2e8f0"/>
  <rect x="128" y="1082" rx="16" ry="16" width="96" height="42" fill="${params.accent}" opacity="0.12"/>
  <text x="146" y="1110" fill="${params.accent}" font-family="Inter, Arial, sans-serif" font-size="16" font-weight="800">${escapeXml(params.mode === "carousel" ? "Carousel" : "Feed")}</text>
  ${line(footerLines, 246, 1108, 34, 24, "#475569", 600)}
  <text x="128" y="1186" fill="${params.accent}" font-family="Inter, Arial, sans-serif" font-size="22" font-weight="700">WaveGen social studio</text>
</svg>`;
}

async function uploadPublicSvgAsset(pathname: string, svg: string) {
  const result = await putBlob(pathname, svg, {
    access: "public",
    contentType: "image/svg+xml",
    addRandomSuffix: true
  });

  return result.url;
}

async function requestJson<T>(url: string, init: RequestInit) {
  const response = await fetch(url, init);
  const text = await response.text();
  let parsed: unknown = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = null;
  }

  if (!response.ok) {
    const message =
      parsed && typeof parsed === "object" && "error" in parsed && parsed.error && typeof parsed.error === "object" && "message" in parsed.error
        ? String((parsed as { error?: { message?: string } }).error?.message || response.statusText)
        : response.statusText;
    throw new Error(message || `Request failed with status ${response.status}.`);
  }

  return parsed as T;
}

export function buildXAuthorizationUrl(params: { state: string; codeChallenge: string; redirectUri?: string }) {
  const config = readXConfig(false);
  const redirectUri = params.redirectUri ?? config.redirectUri;
  const url = new URL("https://twitter.com/i/oauth2/authorize");

  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("scope", config.scope);
  url.searchParams.set("state", params.state);
  url.searchParams.set("code_challenge", params.codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");

  return url.toString();
}

export function buildInstagramAuthorizationUrl(params: { state: string; redirectUri?: string }) {
  const config = readInstagramConfig(false);
  const redirectUri = params.redirectUri ?? config.redirectUri;
  const url = new URL(`https://www.facebook.com/${config.graphVersion}/dialog/oauth`);

  url.searchParams.set("client_id", config.appId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", params.state);
  url.searchParams.set("scope", config.scope);

  return url.toString();
}

export async function exchangeXCode(code: string, codeVerifier: string, redirectUri?: string) {
  const config = readXConfig(false);
  const body = new URLSearchParams({
    code,
    grant_type: "authorization_code",
    client_id: config.clientId,
    redirect_uri: redirectUri ?? config.redirectUri,
    code_verifier: codeVerifier
  });

  const response = await fetch("https://api.x.com/2/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body
  });

  if (!response.ok) {
    throw new Error(`X token exchange failed with status ${response.status}.`);
  }

  return (await response.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
    token_type?: string;
  };
}

export async function fetchXProfile(accessToken: string) {
  const data = await requestJson<{
    data?: {
      id?: string;
      name?: string;
      username?: string;
      profile_image_url?: string;
    };
  }>("https://api.x.com/2/users/me?user.fields=name,username,profile_image_url", {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  const profile = data.data;
  if (!profile?.id) {
    return null;
  }

  return {
    accountId: profile.id,
    accountName: profile.name ?? profile.username ?? null,
    handle: profile.username ? `@${profile.username}` : null,
    profileUrl: profile.username ? `https://x.com/${profile.username}` : null
  };
}

export async function publishXContent(params: {
  accessToken: string;
  variant: SocialVariant;
  accountHandle?: string | null;
}) {
  const posts =
    params.variant.format === "thread"
      ? normalizeSegments(params.variant, 10).map((item) => chunkText(item, 280).join(" ").trim()).filter(Boolean)
      : [chunkText(buildXPostText(params.variant), 280)[0]?.trim() ?? buildXPostText(params.variant).slice(0, 280)];
  const createdIds: string[] = [];
  let replyTo: string | undefined;

  for (const postText of posts) {
    const body: Record<string, unknown> = { text: postText.slice(0, 280) };
    if (replyTo) {
      body.reply = { in_reply_to_tweet_id: replyTo };
    }

    const response = await fetch("https://api.x.com/2/tweets", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${params.accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      throw new Error(`X publish failed with status ${response.status}.`);
    }

    const data = (await response.json()) as { data?: { id?: string } };
    const id = data.data?.id;
    if (!id) {
      throw new Error("X publish did not return a post ID.");
    }

    createdIds.push(id);
    replyTo = id;
  }

  const rootId = createdIds[0] ?? null;
  const externalUrl = rootId
    ? params.accountHandle
      ? `https://x.com/${params.accountHandle.replace(/^@/, "")}/status/${rootId}`
      : `https://x.com/i/web/status/${rootId}`
    : null;

  return {
    platformPostId: rootId,
    externalUrl,
    mediaUrl: null
  };
}

export async function exchangeInstagramCode(code: string, redirectUri?: string) {
  const config = readInstagramConfig(false);
  const body = new URLSearchParams({
    client_id: config.appId,
    client_secret: config.appSecret,
    redirect_uri: redirectUri ?? config.redirectUri,
    code,
    grant_type: "authorization_code"
  });

  const response = await fetch(`${buildMetaApiUrl(config.graphVersion, "/oauth/access_token")}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body
  });

  if (!response.ok) {
    throw new Error(`Instagram token exchange failed with status ${response.status}.`);
  }

  return (await response.json()) as {
    access_token: string;
    token_type?: string;
    expires_in?: number;
  };
}

export async function fetchInstagramProfile(accessToken: string) {
  const config = readInstagramConfig(false);
  const response = await requestJson<{
    data?: Array<{
      id?: string;
      name?: string;
      instagram_business_account?: {
        id?: string;
        username?: string;
      };
    }>;
  }>(
    `${buildMetaApiUrl(config.graphVersion, "/me/accounts")}?fields=id,name,instagram_business_account{id,username}&access_token=${encodeURIComponent(accessToken)}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }
  );

  const page = response.data?.find((entry) => entry.instagram_business_account?.id) ?? response.data?.[0] ?? null;
  const instagramAccount = page?.instagram_business_account;

  if (!instagramAccount?.id) {
    return null;
  }

  return {
    accountId: instagramAccount.id,
    accountName: page?.name ?? instagramAccount.username ?? "Instagram account",
    handle: instagramAccount.username ? `@${instagramAccount.username}` : null,
    pageId: page?.id ?? null,
    instagramBusinessAccountId: instagramAccount.id,
    profileUrl: instagramAccount.username ? `https://www.instagram.com/${instagramAccount.username}` : null
  };
}

async function fetchInstagramPermalink(mediaId: string, accessToken: string) {
  const config = readInstagramConfig(false);
  try {
    const data = await requestJson<{ permalink?: string }>(
      `${buildMetaApiUrl(config.graphVersion, `/${mediaId}`)}?fields=permalink&access_token=${encodeURIComponent(accessToken)}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    );
    return data.permalink ?? null;
  } catch {
    return null;
  }
}

async function publishInstagramContainer(params: {
  instagramUserId: string;
  accessToken: string;
  imageUrls: string[];
  caption: string;
}) {
  const config = readInstagramConfig(false);
  const childIds: string[] = [];

  for (const imageUrl of params.imageUrls) {
    const child = await requestJson<{ id?: string }>(
      `${buildMetaApiUrl(config.graphVersion, `/${params.instagramUserId}/media`)}?image_url=${encodeURIComponent(imageUrl)}&is_carousel_item=true&access_token=${encodeURIComponent(params.accessToken)}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${params.accessToken}`
        }
      }
    );

    if (!child.id) {
      throw new Error("Instagram carousel item container did not return an ID.");
    }
    childIds.push(child.id);
  }

  const container = await requestJson<{ id?: string }>(
    `${buildMetaApiUrl(config.graphVersion, `/${params.instagramUserId}/media`)}?media_type=CAROUSEL&caption=${encodeURIComponent(params.caption)}&children=${encodeURIComponent(childIds.join(","))}&access_token=${encodeURIComponent(params.accessToken)}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${params.accessToken}`
      }
    }
  );

  if (!container.id) {
    throw new Error("Instagram carousel container did not return an ID.");
  }

  const published = await requestJson<{ id?: string }>(
    `${buildMetaApiUrl(config.graphVersion, `/${params.instagramUserId}/media_publish`)}?creation_id=${encodeURIComponent(container.id)}&access_token=${encodeURIComponent(params.accessToken)}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${params.accessToken}`
      }
    }
  );

  const postId = published.id ?? null;
  const permalink = postId ? await fetchInstagramPermalink(postId, params.accessToken) : null;

  return {
    platformPostId: postId,
    externalUrl: permalink,
    mediaUrl: imageUrlsToPublicUrl(params.imageUrls)
  };
}

function imageUrlsToPublicUrl(imageUrls: string[]) {
  return imageUrls[0] ?? null;
}

async function publishInstagramSingle(params: {
  instagramUserId: string;
  accessToken: string;
  imageUrl: string;
  caption: string;
}) {
  const config = readInstagramConfig(false);
  const container = await requestJson<{ id?: string }>(
    `${buildMetaApiUrl(config.graphVersion, `/${params.instagramUserId}/media`)}?image_url=${encodeURIComponent(params.imageUrl)}&caption=${encodeURIComponent(params.caption)}&access_token=${encodeURIComponent(params.accessToken)}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${params.accessToken}`
      }
    }
  );

  if (!container.id) {
    throw new Error("Instagram media container did not return an ID.");
  }

  const published = await requestJson<{ id?: string }>(
    `${buildMetaApiUrl(config.graphVersion, `/${params.instagramUserId}/media_publish`)}?creation_id=${encodeURIComponent(container.id)}&access_token=${encodeURIComponent(params.accessToken)}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${params.accessToken}`
      }
    }
  );

  const postId = published.id ?? null;
  const permalink = postId ? await fetchInstagramPermalink(postId, params.accessToken) : null;

  return {
    platformPostId: postId,
    externalUrl: permalink,
    mediaUrl: params.imageUrl
  };
}

export async function publishInstagramContent(params: {
  accessToken: string;
  connection: SocialConnection;
  platform: SocialPlatformRecord;
  variant: SocialVariant;
  projectId: string;
}) {
  const instagramUserId = params.connection.instagramBusinessAccountId || params.connection.accountId;
  if (!instagramUserId) {
    throw new Error("Instagram account ID is missing.");
  }

  const caption = buildCaption(params.variant, {
    maxLength: 2200,
    includeSegments: params.variant.format === "carousel"
  });
  const accent = params.platform.platform === "instagram" ? "#f97316" : "#0f172a";
  const footer = params.connection.accountName || params.connection.handle || "Instagram";

  if (params.variant.format === "carousel") {
    const slides = normalizeSegments(params.variant, 10);
    const carouselSlides = slides.length >= 2 ? slides : [slides[0] ?? params.variant.title, params.variant.callToAction || params.variant.body];
    const totalSlides = carouselSlides.length;
    const imageUrls = await Promise.all(
      carouselSlides.map((segment, index) =>
        uploadPublicSvgAsset(
          `social/${params.projectId}/instagram/${params.variant.variantId}/slide-${index + 1}.svg`,
          buildInstagramSlideSvg({
            title: index === 0 ? params.variant.title : segment,
            body:
              index === 0
                ? segment
                : index === totalSlides - 1
                  ? `${segment}\n\n${params.variant.callToAction}`
                  : segment,
            footer,
            accent: colorForSlide(index),
            badge: "Instagram carousel",
            slideLabel: `${String(index + 1).padStart(2, "0")} / ${String(totalSlides).padStart(2, "0")}`,
            totalSlides,
            mode: "carousel",
            subheading:
              index === 0
                ? params.variant.callToAction || params.connection.accountName || "Swipe for the breakdown"
                : params.connection.accountName || "Platform-native carousel",
            callToAction: index === totalSlides - 1 ? params.variant.callToAction || params.variant.body : "Swipe for more"
          })
        )
      )
    );

    return publishInstagramContainer({
      instagramUserId,
      accessToken: params.accessToken,
      imageUrls,
      caption
    });
  }

  const imageUrl = await uploadPublicSvgAsset(
    `social/${params.projectId}/instagram/${params.variant.variantId}/single.svg`,
    buildInstagramSlideSvg({
      title: params.variant.title,
      body: params.variant.body,
      footer,
      accent,
      badge: "Instagram feed",
      slideLabel: "Single",
      totalSlides: 1,
      mode: "single",
      subheading: params.variant.callToAction || params.connection.accountName || "Feed post",
      callToAction: params.variant.callToAction
    })
  );

  return publishInstagramSingle({
    instagramUserId,
    accessToken: params.accessToken,
    imageUrl,
    caption
  });
}

export function generateXPublishPreview(variant: SocialVariant) {
  const threadItems = variant.format === "thread" ? normalizeSegments(variant, 10) : [buildXPostText(variant)];
  return threadItems.map((item) => chunkText(item, 280).join(" ").trim()).filter(Boolean);
}

export function createXOAuthVerifier() {
  return createPkceVerifier();
}

export function createXOAuthChallenge(verifier: string) {
  return createPkceChallenge(verifier);
}

export async function directPublishSocialPost(params: {
  platform: SocialPlatform;
  connection: SocialConnection;
  platformRecord: SocialPlatformRecord;
  variant: SocialVariant;
  projectId: string;
}) {
  if (params.platform === "x") {
    const accessToken = params.connection.accessToken;
    if (!accessToken) {
      throw new Error("X access token is missing.");
    }

    const profileHandle = params.connection.handle;
    const result = await publishXContent({
      accessToken,
      variant: params.variant,
      accountHandle: profileHandle
    });

    return {
      platformPostId: result.platformPostId,
      externalUrl: result.externalUrl,
      mediaUrl: result.mediaUrl
    } satisfies SocialPublishedResult;
  }

  if (params.platform === "instagram") {
    const accessToken = params.connection.accessToken;
    if (!accessToken) {
      throw new Error("Instagram access token is missing.");
    }

    return publishInstagramContent({
      accessToken,
      connection: params.connection,
      platform: params.platformRecord,
      variant: params.variant,
      projectId: params.projectId
    });
  }

  throw new Error("Direct publishing is only configured for Instagram and X.");
}
