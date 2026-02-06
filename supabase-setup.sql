-- =============================================
-- RODE ESTE SQL NO SUPABASE (SQL Editor)
-- =============================================

-- 1. Criar tabela de vendas
CREATE TABLE IF NOT EXISTS vendas (
  id BIGSERIAL PRIMARY KEY,
  venda_id BIGINT,
  numero INT,
  numero_loja TEXT DEFAULT '',
  total DECIMAL(10,2) DEFAULT 0,
  data_venda DATE,
  contato_id BIGINT,
  vendedor_id BIGINT,
  loja_id BIGINT DEFAULT 0,
  situacao_id INT,
  source TEXT DEFAULT 'loja',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Habilitar Realtime na tabela
ALTER PUBLICATION supabase_realtime ADD TABLE vendas;

-- 3. Habilitar RLS (Row Level Security)
ALTER TABLE vendas ENABLE ROW LEVEL SECURITY;

-- 4. Policy para permitir INSERT via anon key (webhook)
CREATE POLICY "Allow insert from webhook" ON vendas
  FOR INSERT TO anon
  WITH CHECK (true);

-- 5. Policy para permitir SELECT via anon key (frontend)
CREATE POLICY "Allow select for frontend" ON vendas
  FOR SELECT TO anon
  USING (true);

-- =============================================
-- TABELA VENDEDORES (para ranking)
-- =============================================

-- 6. Criar tabela de vendedores (se ainda não existir)
CREATE TABLE IF NOT EXISTS vendedores (
  id BIGSERIAL PRIMARY KEY,
  vendedor_id TEXT NOT NULL,
  nome TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Habilitar RLS na tabela vendedores
ALTER TABLE vendedores ENABLE ROW LEVEL SECURITY;

-- 8. Policy para permitir SELECT via anon key (ranking no frontend)
CREATE POLICY "Allow select vendedores" ON vendedores
  FOR SELECT TO anon
  USING (true);
