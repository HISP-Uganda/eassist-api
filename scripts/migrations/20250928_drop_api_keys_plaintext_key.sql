-- Drop legacy plaintext 'key' column from api_keys if present. The API stores hashed key in key_hash.
ALTER TABLE public.api_keys DROP COLUMN IF EXISTS "key";
-- Ensure key_hash exists
ALTER TABLE public.api_keys ADD COLUMN IF NOT EXISTS key_hash text;

