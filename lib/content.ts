import type { PageSnapshot } from "@/lib/types";

const USER_AGENT = "Mozilla/5.0 (compatible; BlogifyBot/1.0; +https://example.com)";
const BLOG_PATH_HINTS = /\/(blog|blogs|posts?|articles?|resources?|insights?|guides?|news|updates?)\//i;
const EXCLUDED_PATH_HINTS = /\/(tag|tags|category|categories|author|authors|page|pages|feed|rss|search)\//i;
const MAX_SITEMAP_FILES = 10;
const MAX_SITEMAP_URLS = 500;

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

function normalizeUrl(url: string) {
  try {
    const parsed = new URL(url);
    parsed.hash = "";
    parsed.search = "";
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return url.trim();
  }
}

function isLikelyBlogUrl(url: string) {
  try {
    const parsed = new URL(url);
    if (EXCLUDED_PATH_HINTS.test(parsed.pathname)) {
      return false;
    }
    if (parsed.pathname === "/" || parsed.pathname === "") {
      return false;
    }
    return BLOG_PATH_HINTS.test(parsed.pathname) || parsed.pathname.split("/").filter(Boolean).length >= 2;
  } catch {
    return false;
  }
}

function extractLocs(xml: string) {
  return Array.from(xml.matchAll(/<loc>\s*([^<]+)\s*<\/loc>/gi))
    .map((match) => match[1].trim())
    .filter(Boolean);
}

async function fetchText(url: string) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT
    },
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }

  return {
    text: await response.text(),
    finalUrl: normalizeUrl(response.url || url)
  };
}

type SitemapDiscovery = {
  urls: string[];
  resolvedSitemapUrl: string | null;
};

async function collectSitemapUrls(
  startUrl: string,
  visited = new Set<string>(),
  depth = 0,
  resolvedSitemapUrl: string | null = null
): Promise<SitemapDiscovery> {
  if (depth > 2 || visited.size >= MAX_SITEMAP_FILES) {
    return { urls: [], resolvedSitemapUrl };
  }

  const sitemapUrl = new URL("/sitemap.xml", new URL(startUrl).origin).toString();
  const candidates = [
    sitemapUrl,
    new URL("/sitemap_index.xml", new URL(startUrl).origin).toString()
  ];

  const urls: string[] = [];

  for (const candidate of candidates) {
    if (visited.has(candidate)) {
      continue;
    }

    try {
      visited.add(candidate);
      const { text: xml, finalUrl } = await fetchText(candidate);
      const nextResolved = resolvedSitemapUrl ?? finalUrl;
      const locs = extractLocs(xml).map(normalizeUrl);
      const isIndex = /<sitemapindex[\s>]/i.test(xml);

      if (isIndex) {
        for (const loc of locs) {
          if (visited.size >= MAX_SITEMAP_FILES || urls.length >= MAX_SITEMAP_URLS) {
            break;
          }
          const nested = await collectSitemapUrls(loc, visited, depth + 1, nextResolved);
          urls.push(...nested.urls);
          resolvedSitemapUrl = resolvedSitemapUrl ?? nested.resolvedSitemapUrl ?? nextResolved;
        }
      } else {
        urls.push(
          ...locs.filter((loc) => {
            try {
              const parsed = new URL(loc);
              return parsed.origin === new URL(startUrl).origin;
            } catch {
              return false;
            }
          })
        );
        resolvedSitemapUrl = resolvedSitemapUrl ?? nextResolved;
      }
    } catch {
      continue;
    }
  }

  return {
    urls: Array.from(new Set(urls.map(normalizeUrl))).slice(0, MAX_SITEMAP_URLS),
    resolvedSitemapUrl
  };
}

export async function fetchPageSnapshot(url: string): Promise<PageSnapshot> {
  const { text: html, finalUrl } = await fetchText(url);
  const text = stripHtml(html);
  const excerpt = text.slice(0, 300);

  return {
    url: finalUrl,
    title: extractTitle(html, url),
    excerpt,
    content: sliceContent(text)
  };
}

export async function collectResearch(inputUrl: string, blogUrls: string[]) {
  const websiteUrl = normalizeUrl(inputUrl);
  const baseBlogUrls = Array.from(new Set(blogUrls.filter(Boolean).map(normalizeUrl)));
  const sitemapDiscovery = await collectSitemapUrls(websiteUrl);
  const sitemapUrls = sitemapDiscovery.urls;
  const sitemapBlogUrls = sitemapUrls.filter(isLikelyBlogUrl);
  const allBlogUrls = Array.from(new Set([...baseBlogUrls, ...sitemapBlogUrls]));
  const snapshotUrls = [websiteUrl, ...allBlogUrls.slice(0, 20)];

  const snapshots = await Promise.all(snapshotUrls.map((url) => fetchPageSnapshot(url)));
  const [homepage, ...blogs] = snapshots;

  return {
    homepage,
    blogs,
    sitemapUrls,
    sitemapBlogUrls,
    resolvedSitemapUrl: sitemapDiscovery.resolvedSitemapUrl
  };
}
