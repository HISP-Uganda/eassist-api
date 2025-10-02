-- eAssist v10 — Alter tickets table: submitter fields, nullable constraints, attachments reference note
BEGIN;

-- Add submitter fields if missing
ALTER TABLE tickets
  ADD COLUMN IF NOT EXISTS phone_number text,
  ADD COLUMN IF NOT EXISTS full_name   text;

-- Ensure optional fields are nullable (no-op if already nullable)
DO $$ BEGIN
  BEGIN
    ALTER TABLE tickets ALTER COLUMN severity_id DROP NOT NULL;
  EXCEPTION WHEN others THEN NULL; END;
  BEGIN
    ALTER TABLE tickets ALTER COLUMN reporter_user_id DROP NOT NULL;
  EXCEPTION WHEN others THEN NULL; END;
END $$;

-- No schema change needed for attachments: ticket_attachments already references tickets(id)
-- Optionally, add an index on uploaded_at for ordering by newest
CREATE INDEX IF NOT EXISTS idx_ticket_attachments_uploaded_at ON ticket_attachments(uploaded_at DESC);

COMMIT;

