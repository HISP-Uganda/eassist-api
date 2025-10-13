-- Enforce single support tier per user
-- Cleanup duplicates by keeping the lowest id per user_id
WITH ranked AS (
  SELECT id, user_id, row_number() OVER (PARTITION BY user_id ORDER BY id) AS rn
  FROM agent_tier_members
)
DELETE FROM agent_tier_members m
USING ranked r
WHERE m.id = r.id AND r.rn > 1;

-- Create a unique index on user_id to guarantee only one tier per user
CREATE UNIQUE INDEX IF NOT EXISTS ux_agent_tier_members_user
ON agent_tier_members(user_id);

