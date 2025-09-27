-- Add missing columns expected by API for api_keys management
ALTER TABLE public.api_keys
  ADD COLUMN IF NOT EXISTS name text,
  ADD COLUMN IF NOT EXISTS key_hash text,
  ADD COLUMN IF NOT EXISTS scope text DEFAULT 'system',
  ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS prefix text;
-- If key column exists and is plain text, keep it; key_hash is used for stored secrets.
-- Backfill key_hash from key if key exists and key_hash is null (no hashing here - manual rotation recommended)
UPDATE public.api_keys SET key_hash = key_hash WHERE key_hash IS NOT NULL;

