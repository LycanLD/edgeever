-- Tier A content locks: a PIN gate that hides note and notebook content until the
-- viewer unlocks it. Grants are stored per user so a session can auto-lock again
-- after the idle window without re-prompting on every navigation.
CREATE TABLE IF NOT EXISTS content_locks (
  workspace_id TEXT NOT NULL,
  target_type TEXT NOT NULL CHECK (target_type IN ('memo', 'notebook')),
  target_id TEXT NOT NULL,
  pin_hash TEXT NOT NULL,
  unlock_failed_count INTEGER NOT NULL DEFAULT 0,
  unlock_window_started_at TEXT,
  unlock_blocked_until TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (workspace_id, target_type, target_id)
);

CREATE TABLE IF NOT EXISTS content_lock_grants (
  workspace_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  target_type TEXT NOT NULL CHECK (target_type IN ('memo', 'notebook')),
  target_id TEXT NOT NULL,
  granted_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL,
  PRIMARY KEY (workspace_id, user_id, target_type, target_id)
);

CREATE INDEX IF NOT EXISTS idx_content_lock_grants_expiry
  ON content_lock_grants (expires_at);
