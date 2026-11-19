CREATE TABLE IF NOT EXISTS telegram_cursor(
  id INTEGER PRIMARY KEY CHECK(id=1),
  next_offset INTEGER NOT NULL CHECK(next_offset>=0),
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS telegram_updates(
  update_id INTEGER PRIMARY KEY CHECK(update_id>=0),
  received_at TEXT NOT NULL,
  processed_at TEXT NOT NULL,
  outcome TEXT NOT NULL CHECK(outcome IN ('message','ignored','membership','stale'))
);
CREATE INDEX IF NOT EXISTS telegram_updates_processed ON telegram_updates(processed_at);
