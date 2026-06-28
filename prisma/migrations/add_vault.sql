-- Módulo Bóveda: categorías, documentos y links de compartir

CREATE TABLE IF NOT EXISTS vault_categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT NOT NULL,
  color TEXT NOT NULL,
  user_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vault_documents (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  storage_url TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  tags TEXT[] NOT NULL DEFAULT '{}',
  user_id TEXT NOT NULL,
  category_id TEXT NOT NULL REFERENCES vault_categories(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vault_shares (
  id TEXT PRIMARY KEY,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  document_id TEXT NOT NULL REFERENCES vault_documents(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vault_categories_user_id ON vault_categories(user_id);
CREATE INDEX IF NOT EXISTS idx_vault_documents_user_id ON vault_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_vault_documents_category_id ON vault_documents(category_id);
CREATE INDEX IF NOT EXISTS idx_vault_shares_token ON vault_shares(token);
CREATE INDEX IF NOT EXISTS idx_vault_shares_document_id ON vault_shares(document_id);
