create index if not exists brand_chunks_embedding_hnsw_idx
  on brand_chunks
  using hnsw (embedding vector_cosine_ops);
