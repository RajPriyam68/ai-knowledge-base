-- Enable required PostgreSQL extensions before the init migration.
-- pgvector provides the `vector` type used by the Embedding model.
CREATE EXTENSION IF NOT EXISTS vector;

-- uuid generation helper (kept for parity with existing databases).
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
