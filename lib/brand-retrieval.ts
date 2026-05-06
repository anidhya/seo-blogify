import { getDb } from "@/lib/db/client";

export function embeddingToPgVector(embedding: readonly number[]) {
  return `[${embedding.join(",")}]`;
}

export async function searchBrandChunks(params: {
  brandId: string;
  embedding: readonly number[];
  limit?: number;
}) {
  const db = getDb();
  if (!db) {
    throw new Error("DATABASE_URL is required for brand chunk search.");
  }

  const limit = params.limit ?? 5;
  const vector = embeddingToPgVector(params.embedding);

  return db`
    select
      id,
      brand_id,
      document_id,
      source_type,
      source_ref,
      chunk_index,
      content,
      metadata,
      created_at,
      updated_at,
      1 - (embedding <=> ${vector}::vector) as similarity
    from brand_chunks
    where brand_id = ${params.brandId}
      and embedding is not null
    order by embedding <=> ${vector}::vector
    limit ${limit}
  `;
}
