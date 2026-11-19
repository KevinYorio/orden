CREATE TABLE IF NOT EXISTS memory_entities(
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK(kind IN ('person','place','vehicle','organization','item','other')),
  name TEXT NOT NULL CHECK(length(trim(name))>0),
  normalized_name TEXT NOT NULL,
  aliases TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(aliases)),
  attributes TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(attributes)),
  created_at TEXT NOT NULL,
  created_by TEXT NOT NULL CHECK(created_by IN ('kevin','luisina')),
  updated_at TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1 CHECK(version>0)
);
CREATE INDEX IF NOT EXISTS memory_entities_name ON memory_entities(normalized_name);
CREATE TABLE IF NOT EXISTS memory_facts(
  id TEXT PRIMARY KEY,
  subject_id TEXT NOT NULL REFERENCES memory_entities(id),
  predicate TEXT NOT NULL,
  value TEXT NOT NULL CHECK(json_valid(value)),
  normalized_value TEXT NOT NULL,
  source_message_id TEXT REFERENCES inbox(id),
  source_note TEXT,
  created_at TEXT NOT NULL,
  created_by TEXT NOT NULL CHECK(created_by IN ('kevin','luisina')),
  updated_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','superseded','retracted')),
  replaces_id TEXT REFERENCES memory_facts(id)
);
CREATE INDEX IF NOT EXISTS memory_facts_subject ON memory_facts(subject_id,status,predicate);
CREATE TABLE IF NOT EXISTS memory_relations(
  id TEXT PRIMARY KEY,
  subject_id TEXT NOT NULL REFERENCES memory_entities(id),
  object_id TEXT NOT NULL REFERENCES memory_entities(id),
  relation_type TEXT NOT NULL,
  source_message_id TEXT REFERENCES inbox(id),
  source_note TEXT,
  created_at TEXT NOT NULL,
  created_by TEXT NOT NULL CHECK(created_by IN ('kevin','luisina')),
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','retracted')),
  CHECK(subject_id<>object_id)
);
CREATE UNIQUE INDEX IF NOT EXISTS memory_relation_unique_active
  ON memory_relations(subject_id,object_id,relation_type) WHERE status='active';
CREATE INDEX IF NOT EXISTS memory_relations_subject ON memory_relations(subject_id,status,relation_type);
CREATE INDEX IF NOT EXISTS memory_relations_object ON memory_relations(object_id,status,relation_type);
