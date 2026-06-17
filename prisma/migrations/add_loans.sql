-- Módulo Préstamos: personas, deudas y abonos
-- Ejecutar en Supabase SQL Editor

CREATE TABLE IF NOT EXISTS people (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  notes TEXT,
  user_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS debts (
  id TEXT PRIMARY KEY,
  description TEXT NOT NULL,
  total_amount DOUBLE PRECISION NOT NULL,
  date TIMESTAMPTZ NOT NULL,
  due_date TIMESTAMPTZ,
  notes TEXT,
  type TEXT NOT NULL CHECK (type IN ('receivable', 'payable')),
  user_id TEXT NOT NULL,
  person_id TEXT NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS debt_payments (
  id TEXT PRIMARY KEY,
  amount DOUBLE PRECISION NOT NULL,
  notes TEXT,
  date TIMESTAMPTZ NOT NULL,
  debt_id TEXT NOT NULL REFERENCES debts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para queries frecuentes
CREATE INDEX IF NOT EXISTS idx_people_user_id ON people(user_id);
CREATE INDEX IF NOT EXISTS idx_debts_person_id ON debts(person_id);
CREATE INDEX IF NOT EXISTS idx_debts_user_id ON debts(user_id);
CREATE INDEX IF NOT EXISTS idx_debt_payments_debt_id ON debt_payments(debt_id);
