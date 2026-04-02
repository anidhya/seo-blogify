import type { PageSnapshot } from "@/lib/types";

const USER_AGENT = "Mozilla/5.0 (compatible; BlogifyBot/1.0; +https://example.com)";

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function stripHtml(value: string) {
  return normalizeWhitespace(
    value
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&#39;/g, "'")
      .replace(/&quot;/g, '"')
  );
}

function extractTitle(html: string, fallbackUrl: string) {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return normalizeWhitespace(titleMatch?.[1] ?? fallbackUrl);
}

function sliceContent(text: string, maxChars = 9000) {
  if (text.length <= maxChars) {
    return text;
  }

  return `${text.slice(0, maxChars)}...`;
}

export async function fetchPageSnapshot(url: string): Promise<PageSnapshot> {
  const response = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT
    },
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }

  const html = await response.text();
  const text = stripHtml(html);
  const excerpt = text.slice(0, 300);

  return {
    url,
    title: extractTitle(html, url),
    excerpt,
    content: sliceContent(text)
  };
}

export async function collectResearch(inputUrl: string, blogUrls: string[]) {
  const uniqueUrls = Array.from(new Set([inputUrl, ...blogUrls].filter(Boolean)));

  const snapshots = await Promise.all(uniqueUrls.map((url) => fetchPageSnapshot(url)));
  const [homepage, ...blogs] = snapshots;

  return {
    homepage,
    blogs
  };
}
