type BrandChunk = {
  chunkIndex: number;
  content: string;
};

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function splitParagraphs(value: string) {
  return value
    .split(/\n\s*\n/g)
    .map((part) => normalizeWhitespace(part))
    .filter(Boolean);
}

export function chunkBrandText(
  text: string,
  options?: {
    maxChunkLength?: number;
    maxChunks?: number;
  }
): BrandChunk[] {
  const maxChunkLength = options?.maxChunkLength ?? 1200;
  const maxChunks = options?.maxChunks ?? 20;
  const paragraphs = splitParagraphs(text);
  const chunks: BrandChunk[] = [];
  let current = "";

  function pushCurrent() {
    const content = current.trim();
    if (!content) {
      return;
    }

    chunks.push({
      chunkIndex: chunks.length,
      content
    });
    current = "";
  }

  for (const paragraph of paragraphs) {
    if (paragraph.length > maxChunkLength) {
      pushCurrent();
      const sentences = paragraph.split(/(?<=[.!?])\s+/g);
      let sentenceChunk = "";

      for (const sentence of sentences) {
        if (!sentenceChunk) {
          sentenceChunk = sentence;
          continue;
        }

        if (`${sentenceChunk} ${sentence}`.length > maxChunkLength) {
          chunks.push({
            chunkIndex: chunks.length,
            content: sentenceChunk.trim()
          });
          sentenceChunk = sentence;
        } else {
          sentenceChunk = `${sentenceChunk} ${sentence}`;
        }

        if (chunks.length >= maxChunks) {
          return chunks;
        }
      }

      if (sentenceChunk.trim()) {
        chunks.push({
          chunkIndex: chunks.length,
          content: sentenceChunk.trim()
        });
      }
      continue;
    }

    const next = current ? `${current}\n\n${paragraph}` : paragraph;
    if (next.length > maxChunkLength) {
      pushCurrent();
      current = paragraph;
    } else {
      current = next;
    }

    if (chunks.length >= maxChunks) {
      return chunks;
    }
  }

  pushCurrent();
  return chunks.slice(0, maxChunks);
}
