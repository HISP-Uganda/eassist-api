-- eAssist Messaging schema
-- Channels: EMAIL, SMS, IN_APP, WHATSAPP, TELEGRAM
-- Statuses: queued, sent, failed, read

CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel text NOT NULL CHECK (channel IN ('EMAIL','SMS','IN_APP','WHATSAPP','TELEGRAM')),
  to_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  to_email citext,
  to_phone text,
  to_handle text,
  subject text,
  body text,
  body_html text,
  template_code text,
  provider text,
  provider_message_id text,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','sent','failed','read')),
  error_message text,
  read_at timestamptz,
  sent_at timestamptz,
  delivered_at timestamptz,
  scheduled_at timestamptz,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Update trigger
DROP TRIGGER IF EXISTS trg_messages_upd ON messages;
CREATE TRIGGER trg_messages_upd BEFORE UPDATE ON messages FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Useful indexes
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_channel ON messages(channel);
CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status);
CREATE INDEX IF NOT EXISTS idx_messages_to_user ON messages(to_user_id);
CREATE INDEX IF NOT EXISTS idx_messages_to_email ON messages(to_email);
CREATE INDEX IF NOT EXISTS idx_messages_to_phone ON messages(to_phone);

