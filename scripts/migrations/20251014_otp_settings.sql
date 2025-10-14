-- OTP settings (single row)
CREATE TABLE IF NOT EXISTS otp_settings (
  id boolean PRIMARY KEY DEFAULT TRUE,
  enabled boolean NOT NULL DEFAULT FALSE,
  channels jsonb NOT NULL DEFAULT '[]'::jsonb, -- e.g., ["SMS","EMAIL"]
  code_ttl_sec integer NOT NULL DEFAULT 300,
  max_attempts integer NOT NULL DEFAULT 5,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_otp_settings_upd ON otp_settings;
CREATE TRIGGER trg_otp_settings_upd BEFORE UPDATE ON otp_settings FOR EACH ROW EXECUTE FUNCTION set_updated_at();

