ALTER TABLE memory_facts ADD COLUMN confidence REAL NOT NULL DEFAULT 1.0 CHECK(confidence>=0 AND confidence<=1);
ALTER TABLE memory_facts ADD COLUMN confirmation TEXT NOT NULL DEFAULT 'confirmed' CHECK(confirmation IN ('confirmed','inferred','pending'));
ALTER TABLE memory_relations ADD COLUMN confidence REAL NOT NULL DEFAULT 1.0 CHECK(confidence>=0 AND confidence<=1);
ALTER TABLE memory_relations ADD COLUMN confirmation TEXT NOT NULL DEFAULT 'confirmed' CHECK(confirmation IN ('confirmed','inferred','pending'));

CREATE TABLE IF NOT EXISTS document_extractions(
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL REFERENCES documents(id),
  source_hash TEXT NOT NULL,
  model TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('queued','waiting_local','processing','review_required','confirmed','rejected','failed','unsupported')),
  payload TEXT NOT NULL CHECK(json_valid(payload)),
  warnings TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(warnings)),
  error_code TEXT,
  result_id TEXT,
  created_by TEXT NOT NULL CHECK(created_by IN ('kevin','luisina','system')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  confirmed_at TEXT,
  UNIQUE(document_id,source_hash,model)
);
CREATE INDEX IF NOT EXISTS document_extractions_status ON document_extractions(status,updated_at);

CREATE TABLE IF NOT EXISTS merchants(
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  normalized_name TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  created_by TEXT NOT NULL CHECK(created_by IN ('kevin','luisina')),
  active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1))
);
CREATE TABLE IF NOT EXISTS products(
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  normalized_name TEXT NOT NULL,
  brand TEXT,
  variant TEXT,
  package_size_base INTEGER CHECK(package_size_base IS NULL OR package_size_base>0),
  base_unit TEXT CHECK(base_unit IS NULL OR base_unit IN ('g','ml','unit')),
  category TEXT,
  gtin TEXT,
  created_at TEXT NOT NULL,
  created_by TEXT NOT NULL CHECK(created_by IN ('kevin','luisina')),
  CHECK((package_size_base IS NULL)=(base_unit IS NULL))
);
CREATE INDEX IF NOT EXISTS products_normalized ON products(normalized_name);
CREATE UNIQUE INDEX IF NOT EXISTS products_gtin ON products(gtin) WHERE gtin IS NOT NULL;
CREATE TABLE IF NOT EXISTS product_aliases(
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id),
  alias TEXT NOT NULL,
  normalized_alias TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  created_by TEXT NOT NULL CHECK(created_by IN ('kevin','luisina'))
);

CREATE TABLE IF NOT EXISTS purchases(
  id TEXT PRIMARY KEY,
  merchant_id TEXT NOT NULL REFERENCES merchants(id),
  branch TEXT,
  occurred_at TEXT NOT NULL,
  currency TEXT NOT NULL CHECK(currency IN ('ARS','USD')),
  subtotal_cents INTEGER CHECK(subtotal_cents IS NULL OR subtotal_cents>=0),
  discounts_cents INTEGER NOT NULL DEFAULT 0 CHECK(discounts_cents>=0),
  tax_cents INTEGER CHECK(tax_cents IS NULL OR tax_cents>=0),
  total_cents INTEGER NOT NULL CHECK(total_cents>0),
  payment_method TEXT,
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK(status IN ('confirmed','reversed')),
  source TEXT NOT NULL CHECK(source IN ('manual','document_extraction')),
  extraction_id TEXT UNIQUE REFERENCES document_extractions(id),
  idempotency_key TEXT NOT NULL UNIQUE,
  note TEXT,
  created_at TEXT NOT NULL,
  created_by TEXT NOT NULL CHECK(created_by IN ('kevin','luisina'))
);
CREATE INDEX IF NOT EXISTS purchases_occurred ON purchases(occurred_at,merchant_id,status);
CREATE TABLE IF NOT EXISTS purchase_lines(
  id TEXT PRIMARY KEY,
  purchase_id TEXT NOT NULL REFERENCES purchases(id),
  product_id TEXT REFERENCES products(id),
  raw_label TEXT NOT NULL,
  quantity_milli INTEGER CHECK(quantity_milli IS NULL OR quantity_milli>0),
  line_total_cents INTEGER CHECK(line_total_cents IS NULL OR line_total_cents>=0),
  discount_cents INTEGER NOT NULL DEFAULT 0 CHECK(discount_cents>=0),
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS purchase_lines_product ON purchase_lines(product_id,purchase_id);
CREATE TABLE IF NOT EXISTS purchase_documents(
  purchase_id TEXT NOT NULL REFERENCES purchases(id),
  document_id TEXT NOT NULL REFERENCES documents(id),
  PRIMARY KEY(purchase_id,document_id)
);
CREATE TABLE IF NOT EXISTS promotions(
  id TEXT PRIMARY KEY,
  merchant_id TEXT REFERENCES merchants(id),
  payment_method TEXT NOT NULL,
  title TEXT NOT NULL,
  percent_off REAL CHECK(percent_off IS NULL OR (percent_off>=0 AND percent_off<=100)),
  cap_cents INTEGER CHECK(cap_cents IS NULL OR cap_cents>=0),
  minimum_cents INTEGER CHECK(minimum_cents IS NULL OR minimum_cents>=0),
  valid_from TEXT NOT NULL,
  valid_to TEXT,
  source_url TEXT NOT NULL,
  checked_at TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('verified','expired','unverified')),
  created_by TEXT NOT NULL CHECK(created_by IN ('kevin','luisina')),
  CHECK(valid_to IS NULL OR valid_to>=valid_from),
  CHECK(source_url LIKE 'https://%')
);
CREATE INDEX IF NOT EXISTS promotions_valid ON promotions(status,valid_from,valid_to);
CREATE TABLE IF NOT EXISTS agent_executions(
  id TEXT PRIMARY KEY,
  request_kind TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('completed','partial','failed')),
  agents TEXT NOT NULL CHECK(json_valid(agents)),
  result TEXT NOT NULL CHECK(json_valid(result)),
  error_code TEXT,
  started_at TEXT NOT NULL,
  ended_at TEXT NOT NULL,
  actor TEXT NOT NULL CHECK(actor IN ('kevin','luisina','system'))
);
CREATE INDEX IF NOT EXISTS agent_executions_recent ON agent_executions(ended_at DESC);
