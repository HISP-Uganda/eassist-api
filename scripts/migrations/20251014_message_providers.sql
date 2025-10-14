-- Messaging providers configurations
CREATE TABLE IF NOT EXISTS message_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  channel text NOT NULL CHECK (channel IN ('EMAIL','SMS','WHATSAPP','TELEGRAM')),
  config jsonb NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT TRUE,
  is_default boolean NOT NULL DEFAULT FALSE,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Ensure only one default per channel
CREATE UNIQUE INDEX IF NOT EXISTS uq_message_providers_default_per_channel
  ON message_providers(channel)
  WHERE is_default = TRUE;

-- Update trigger for updated_at
DROP TRIGGER IF EXISTS trg_message_providers_upd ON message_providers;
CREATE TRIGGER trg_message_providers_upd BEFORE UPDATE ON message_providers FOR EACH ROW EXECUTE FUNCTION set_updated_at();

