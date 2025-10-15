-- Add correlation_key for idempotent message enqueue
ALTER TABLE IF EXISTS messages
  ADD COLUMN IF NOT EXISTS correlation_key text;
CREATE UNIQUE INDEX IF NOT EXISTS ux_messages_correlation_key ON messages(correlation_key) WHERE correlation_key IS NOT NULL;

