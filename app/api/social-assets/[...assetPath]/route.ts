import { NextRequest } from "next/server";
import { loadSocialAsset } from "@/lib/social-assets";

function normalizeAssetPath(segments: string[]) {
  return segments.join("/");
}

export async function GET(_request: NextRequest, context: { params: Promise<{ assetPath?: string[] }> }) {
  const { assetPath } = await context.params;
  const assetKey = normalizeAssetPath(assetPath ?? []);
  if (!assetKey) {
    return new Response("Not found", { status: 404 });
  }

  const asset = await loadSocialAsset(assetKey);
  if (!asset) {
    return new Response("Not found", { status: 404 });
  }

  return new Response(asset.body, {
    headers: {
      "content-type": asset.mimeType,
      "cache-control": "public, max-age=31536000, immutable"
    }
  });
}
