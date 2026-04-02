import { sql, type MigrateDownArgs, type MigrateUpArgs } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  // Enable pgvector extension
  await db.execute(sql`CREATE EXTENSION IF NOT EXISTS vector;`)

  // Add embedding column (1024 dimensions for jina-embeddings-v3)
  await db.execute(
    sql`ALTER TABLE content_chunks ADD COLUMN IF NOT EXISTS embedding vector(1024);`,
  )

  // Create HNSW index for fast approximate nearest neighbor search
  await db.execute(
    sql`CREATE INDEX IF NOT EXISTS content_chunks_embedding_idx ON content_chunks USING hnsw (embedding vector_cosine_ops);`,
  )
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`DROP INDEX IF EXISTS content_chunks_embedding_idx;`)
  await db.execute(
    sql`ALTER TABLE content_chunks DROP COLUMN IF EXISTS embedding;`,
  )
}
