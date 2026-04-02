import type { LinkedInCarouselPrompt, LinkedInGeneratedImage, LinkedInDraft } from "@/lib/types";

type GeminiInlineImagePart = {
  inlineData?: {
    mimeType?: string;
    data?: string;
  };
  text?: string;
};

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: GeminiInlineImagePart[];
    };
  }>;
};

class GoogleImageError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "GoogleImageError";
    this.status = status;
  }
}

function getGoogleApiKey() {
  return process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "";
}

function getGoogleImageModel() {
  return process.env.GOOGLE_IMAGE_MODEL || "gemini-3.1-flash-lite-preview";
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function wrapText(text: string, maxLength: number) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > maxLength && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }

  if (current) {
    lines.push(current);
  }

  return lines.slice(0, 8);
}

function buildPreviewSvg(params: {
  title: string;
  prompt: string;
  model: string;
  responseText: string;
}) {
  const titleLines = wrapText(params.title, 24);
  const promptLines = wrapText(params.prompt, 38);
  const responseLines = wrapText(params.responseText, 44);

  const yBase = 160;
  const lineHeight = 36;
  const promptStart = yBase + titleLines.length * 40 + 40;
  const responseStart = promptStart + promptLines.length * 32 + 56;

  const titleText = titleLines
    .map((line, index) => `<tspan x="80" dy="${index === 0 ? 0 : 40}">${escapeXml(line)}</tspan>`)
    .join("");

  const promptText = promptLines
    .map((line, index) => `<tspan x="80" dy="${index === 0 ? 0 : 32}">${escapeXml(line)}</tspan>`)
    .join("");

  const responseText = responseLines
    .map((line, index) => `<tspan x="80" dy="${index === 0 ? 0 : 30}">${escapeXml(line)}</tspan>`)
    .join("");

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1000" height="1250" viewBox="0 0 1000 1250">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#0f172a"/>
          <stop offset="55%" stop-color="#0b2344"/>
          <stop offset="100%" stop-color="#0f766e"/>
        </linearGradient>
        <linearGradient id="panel" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#ffffff" stop-opacity="0.18"/>
          <stop offset="100%" stop-color="#ffffff" stop-opacity="0.06"/>
        </linearGradient>
      </defs>
      <rect width="1000" height="1250" rx="56" fill="url(#bg)"/>
      <rect x="60" y="60" width="880" height="1130" rx="40" fill="url(#panel)" stroke="#ffffff" stroke-opacity="0.12"/>
      <text x="80" y="120" font-family="Inter, Arial, sans-serif" font-size="24" letter-spacing="4" fill="#93c5fd">LINKEDIN CAROUSEL</text>
      <text x="80" y="180" font-family="Georgia, serif" font-size="54" font-weight="700" fill="#ffffff">${titleText}</text>
      <rect x="80" y="${promptStart - 44}" width="220" height="40" rx="20" fill="#22d3ee" fill-opacity="0.18"/>
      <text x="100" y="${promptStart - 16}" font-family="Inter, Arial, sans-serif" font-size="18" font-weight="700" fill="#a5f3fc">Slide prompt</text>
      <text x="80" y="${promptStart}" font-family="Inter, Arial, sans-serif" font-size="26" fill="#e2e8f0">${promptText}</text>
      <rect x="80" y="${responseStart - 44}" width="250" height="40" rx="20" fill="#f59e0b" fill-opacity="0.18"/>
      <text x="100" y="${responseStart - 16}" font-family="Inter, Arial, sans-serif" font-size="18" font-weight="700" fill="#fde68a">Google response</text>
      <text x="80" y="${responseStart}" font-family="Inter, Arial, sans-serif" font-size="24" fill="#f8fafc">${responseText}</text>
      <text x="80" y="1170" font-family="Inter, Arial, sans-serif" font-size="18" fill="#cbd5e1">Model: ${escapeXml(params.model)}</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function buildImagePrompt({
  draft,
  slide
}: {
  draft: LinkedInDraft;
  slide: LinkedInCarouselPrompt;
}) {
  return [
    "Generate a polished LinkedIn carousel slide image.",
    "Design constraints:",
    "- Aspect ratio 4:5.",
    "- Editorial, premium, modern, and highly readable.",
    "- Keep the composition consistent across all slides in the set.",
    "- Use the same color palette, typography style, lighting, and art direction across the carousel.",
    "- Avoid watermarks, logos, random extra text, and clutter.",
    "- Make the slide feel like a coherent part of a four-slide series.",
    "",
    `LinkedIn post title: ${draft.suggestedTitle}`,
    `LinkedIn description: ${draft.suggestedDescription}`,
    `Slide ${slide.slideNumber}: ${slide.title}`,
    `Slide prompt: ${slide.prompt}`,
    `Design notes: ${slide.designNotes}`,
    "",
    "This image will be used as one slide in a LinkedIn carousel post."
  ].join("\n");
}

async function requestGeminiImage(model: string, prompt: string) {
  const apiKey = getGoogleApiKey();
  if (!apiKey) {
    throw new Error("Google AI Studio API key is missing.");
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }]
          }
        ]
      })
    }
  );

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new GoogleImageError(
      `Google image generation failed with status ${response.status}${errorText ? `: ${errorText.slice(0, 300)}` : ""}.`,
      response.status
    );
  }

  const data = (await response.json()) as GeminiResponse;
  const parts = data.candidates?.[0]?.content?.parts ?? [];
  const imagePart = parts.find((part) => Boolean(part.inlineData?.data));
  const textPart = parts.find((part) => Boolean(part.text?.trim()));

  return {
    imageDataUrl: imagePart?.inlineData?.data && imagePart.inlineData.mimeType
      ? `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`
      : null,
    mimeType: imagePart?.inlineData?.mimeType ?? null,
    responseText: textPart?.text?.trim() ?? null
  };
}

export async function generateLinkedInCarouselImages(params: {
  draft: LinkedInDraft;
  onSlideGenerated?: (params: {
    slideNumber: number;
    generatedCount: number;
    total: number;
    model: string;
    image: LinkedInGeneratedImage;
  }) => void | Promise<void>;
  retriesPerSlide?: number;
  baseDelayMs?: number;
}): Promise<LinkedInGeneratedImage[]> {
  const promptBySlide = params.draft.carouselPrompts.slice(0, 4).map((slide) => ({
    slideNumber: slide.slideNumber,
    prompt: buildImagePrompt({ draft: params.draft, slide })
  }));

  const modelCandidates = Array.from(
    new Set([
      "gemini-2.5-flash-image",
      getGoogleImageModel()
    ])
  );

  const generatedAt = new Date().toISOString();
  const results: LinkedInGeneratedImage[] = [];
  const retriesPerSlide = params.retriesPerSlide ?? 3;
  const baseDelayMs = params.baseDelayMs ?? 1200;

  for (const slide of promptBySlide) {
    let lastError: unknown = null;

    for (const model of modelCandidates) {
      for (let attempt = 0; attempt < retriesPerSlide; attempt += 1) {
        try {
          const image = await requestGeminiImage(model, slide.prompt);
          const responseText = image.responseText ?? "";
          const imageDataUrl =
            image.imageDataUrl ??
            buildPreviewSvg({
              title: params.draft.suggestedTitle,
              prompt: slide.prompt,
              model,
              responseText: responseText || "Google returned text guidance instead of image bytes."
            });

          const generatedImage: LinkedInGeneratedImage = {
            slideNumber: slide.slideNumber,
            prompt: slide.prompt,
            imageDataUrl,
            mimeType: image.mimeType ?? "image/svg+xml",
            model,
            generatedAt,
            renderMode: image.imageDataUrl ? "google-image" : "preview",
            providerResponseText: responseText || null
          };

          results.push(generatedImage);
          if (params.onSlideGenerated) {
            await params.onSlideGenerated({
              slideNumber: slide.slideNumber,
              generatedCount: results.length,
              total: promptBySlide.length,
              model,
              image: generatedImage
            });
          }
          lastError = null;
          break;
        } catch (error) {
          lastError = error;
          const status = error instanceof GoogleImageError ? error.status : 0;
          const retryable = status === 429 || status === 500 || status === 503 || status === 504 || status === 0;
          const shouldRetry = retryable && attempt < retriesPerSlide - 1;

          if (!shouldRetry) {
            break;
          }

          const backoff = baseDelayMs * 2 ** attempt + Math.round(Math.random() * 250);
          await new Promise((resolve) => setTimeout(resolve, backoff));
        }
      }

      if (!lastError) {
        break;
      }
    }

    if (lastError) {
      throw lastError instanceof Error ? lastError : new Error("Google image generation failed.");
    }
  }

  return results.sort((left, right) => left.slideNumber - right.slideNumber);
}
