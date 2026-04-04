import { GoogleGenAI } from "@google/genai";
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
  return process.env.GOOGLE_IMAGE_MODEL || "gemini-3.1-flash-image-preview";
}

async function requestGeminiImage(model: string, prompt: string) {
  const apiKey = getGoogleApiKey();
  if (!apiKey) {
    throw new Error("Google AI Studio API key is missing.");
  }

  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model,
    contents: prompt
  });

  const parts = response.candidates?.[0]?.content?.parts ?? [];
  const imagePart = parts.find((part) => Boolean(part.inlineData?.data));
  const textPart = parts.find((part) => Boolean(part.text?.trim()));

  if (!imagePart?.inlineData?.data || !imagePart.inlineData.mimeType) {
    throw new GoogleImageError(
      textPart?.text?.trim()
        ? `Google image generation returned text instead of image bytes: ${textPart.text.trim().slice(0, 300)}`
        : "Google image generation returned no image data.",
      502
    );
  }

  return {
    imageDataUrl: `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`,
    mimeType: imagePart.inlineData.mimeType,
    responseText: textPart?.text?.trim() ?? null
  };
}

export async function generateLinkedInCarouselImages(params: {
  draft: LinkedInDraft;
  slideNumber?: number;
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
  const modelCandidates = Array.from(
    new Set([
      getGoogleImageModel()
    ])
  );

  const generatedAt = new Date().toISOString();
  const results: LinkedInGeneratedImage[] = [];
  const retriesPerSlide = params.retriesPerSlide ?? 3;
  const baseDelayMs = params.baseDelayMs ?? 1200;
  const promptBySlide = params.draft.carouselPrompts
    .slice(0, 4)
    .filter((slide) => (params.slideNumber ? slide.slideNumber === params.slideNumber : true))
    .map((slide) => ({
      slideNumber: slide.slideNumber,
      prompt: slide.prompt
    }));

  if (!promptBySlide.length) {
    throw new Error(
      params.slideNumber
        ? `LinkedIn slide ${params.slideNumber} was not found.`
        : "LinkedIn carousel prompts are not available."
    );
  }

  for (const slide of promptBySlide) {
    let lastError: unknown = null;

    for (const model of modelCandidates) {
      for (let attempt = 0; attempt < retriesPerSlide; attempt += 1) {
        try {
          const image = await requestGeminiImage(model, slide.prompt);
          const generatedImage: LinkedInGeneratedImage = {
            slideNumber: slide.slideNumber,
            prompt: slide.prompt,
            imageDataUrl: image.imageDataUrl,
            mimeType: image.mimeType,
            model,
            generatedAt,
            renderMode: "google-image",
            providerResponseText: image.responseText || null
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
