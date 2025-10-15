-- OTP codes storage
CREATE TABLE IF NOT EXISTS otp_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email citext,
  phone text,
  purpose text,
  code_hash text NOT NULL,
  attempts int DEFAULT 0,
  max_attempts int DEFAULT 5,
  expires_at timestamptz NOT NULL,
  used boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_otp_codes_lookup ON otp_codes((lower(email)), phone, purpose) WHERE used = false;
CREATE INDEX IF NOT EXISTS idx_otp_codes_expires ON otp_codes(expires_at);

