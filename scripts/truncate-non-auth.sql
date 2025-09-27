-- Truncate all non-auth tables while keeping auth tables (users, roles, permissions, user_roles, role_permissions, api_keys)
-- This script checks that each table exists before truncating to avoid errors on different schemas.
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'ticket_events','ticket_attachments','ticket_watchers','ticket_notes','tickets',
    'files','audit_events','inbox_emails',
    'faqs','faq_origins','kb_article_tags','kb_ratings','kb_articles','kb_tags',
    'videos','video_categories',
    'system_modules','issue_categories','system_category','systems',
    'agent_group_members','agent_tier_members','agent_groups','agent_tiers',
    'statuses','priorities','severities','sources',
    'settings_kv','smtp_settings','general_settings','notification_settings','security_settings','auth_methods_settings','sso_settings','branding_settings','email_templates_settings',
    'workflow_rule_runs','workflow_rules'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    IF EXISTS (SELECT 1 FROM pg_class WHERE relname = t AND pg_table_is_visible(pg_class.oid)) THEN
      EXECUTE format('TRUNCATE TABLE %I RESTART IDENTITY CASCADE', t);
    END IF;
  END LOOP;
END$$;

-- VACUUM removed: VACUUM cannot run inside a transaction block when the file is executed as a single query.
-- If you want to VACUUM, run it separately (e.g. `VACUUM;` from psql) after this script completes.
