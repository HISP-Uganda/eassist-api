-- =====================
-- eAssist v10 — Full DB (Merged Core Migration)
-- FULLY IDEMPOTENT & CLEANUP VERSION
-- Merged from db/init.sql and .disabled migrations; uses UUID primary keys to match existing DB
-- =====================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "citext";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";
CREATE EXTENSION IF NOT EXISTS "unaccent";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Functions
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END $$;

-- Ticket Key Counter & Generator
CREATE TABLE IF NOT EXISTS ticket_key_counters(year int primary key, last_value int not null default 0, updated_at timestamptz default now());
CREATE OR REPLACE FUNCTION ticket_key_nextval(out key text) LANGUAGE plpgsql AS $$
DECLARE yr int := extract(year from now())::int; seq int;
BEGIN
  LOOP
    BEGIN
      INSERT INTO ticket_key_counters(year,last_value) VALUES(yr,1)
      ON CONFLICT(year) DO UPDATE SET last_value=ticket_key_counters.last_value+1, updated_at=now()
      RETURNING last_value INTO seq; EXIT;
    EXCEPTION WHEN unique_violation THEN CONTINUE;
    END;
  END LOOP;
  key := format('HD-%s-%s', yr, lpad(seq::text, 4, '0'));
END $$;

-- Permissions, Roles, RBAC
CREATE TABLE IF NOT EXISTS public.permissions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code        text UNIQUE NOT NULL,
  name        text NOT NULL,
  description text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.roles (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code        text UNIQUE,
  name        text NOT NULL,
  description text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.role_permissions (
  role_id       uuid NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  permission_id uuid NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

-- Users & User Roles
CREATE TABLE IF NOT EXISTS users(
  id uuid primary key default gen_random_uuid(),
  email citext unique not null,
  full_name text,
  password_hash text,
  phone text,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  is_superuser boolean NOT NULL DEFAULT false
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
-- Drop and recreate trigger for idempotency
DROP TRIGGER IF EXISTS trg_users_upd ON users;
CREATE TRIGGER trg_users_upd BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TABLE IF NOT EXISTS user_roles(
  user_id uuid references users(id) on delete cascade,
  role_id uuid references roles(id) on delete cascade,
  primary key(user_id, role_id)
);

-- API Keys
CREATE TABLE IF NOT EXISTS api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  expires_at timestamptz,
  last_used_at timestamptz,
  prefix text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_api_keys_created_by ON api_keys(created_by);
CREATE INDEX IF NOT EXISTS idx_api_keys_expires ON api_keys(expires_at);
CREATE INDEX IF NOT EXISTS idx_api_keys_last_used ON api_keys(last_used_at DESC);

-- Lookups (Catalogs)
CREATE TABLE IF NOT EXISTS statuses(id serial primary key, code text unique not null, name text not null, is_closed boolean default false, sort smallint default 100);
CREATE TABLE IF NOT EXISTS priorities(id serial primary key, code text unique not null, name text not null, sort smallint default 100);
CREATE TABLE IF NOT EXISTS severities(id serial primary key, code text unique not null, name text not null, sort smallint default 100);
CREATE TABLE IF NOT EXISTS sources(id serial primary key, code text unique not null, name text not null);
CREATE TABLE IF NOT EXISTS system_category(id serial primary key, name text unique not null);
CREATE TABLE IF NOT EXISTS systems(
  id serial primary key,
  category_id int references system_category(id),
  name text unique not null,
  code text unique,
  description text,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
CREATE INDEX IF NOT EXISTS idx_systems_category ON systems(category_id);
DROP TRIGGER IF EXISTS trg_systems_upd ON systems;
CREATE TRIGGER trg_systems_upd BEFORE UPDATE ON systems FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TABLE IF NOT EXISTS system_modules(
  id serial primary key,
  system_id int not null references systems(id) on delete cascade,
  name text not null,
  code text,
  description text,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(system_id, name)
);
CREATE INDEX IF NOT EXISTS idx_system_modules_system ON system_modules(system_id);
DROP TRIGGER IF EXISTS trg_system_modules_upd ON system_modules;
CREATE TRIGGER trg_system_modules_upd BEFORE UPDATE ON system_modules FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TABLE IF NOT EXISTS issue_categories(
  id serial primary key,
  system_id int references systems(id) on delete cascade,
  parent_id int references issue_categories(id) on delete set null,
  name text not null,
  code text,
  description text,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
CREATE INDEX IF NOT EXISTS idx_issue_categories_system ON issue_categories(system_id);
CREATE INDEX IF NOT EXISTS idx_issue_categories_parent ON issue_categories(parent_id);
DROP TRIGGER IF EXISTS trg_issue_categories_upd ON issue_categories;
CREATE TRIGGER trg_issue_categories_upd BEFORE UPDATE ON issue_categories FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Agents
CREATE TABLE IF NOT EXISTS agent_groups(id serial primary key, name text unique not null, description text);
CREATE TABLE IF NOT EXISTS agent_tiers(id serial primary key, name text unique not null, level int);
CREATE TABLE IF NOT EXISTS agent_group_members(id serial primary key, group_id int references agent_groups(id) on delete cascade, user_id uuid references users(id) on delete cascade, unique(group_id, user_id));
CREATE INDEX IF NOT EXISTS idx_agent_group_members_gid ON agent_group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_agent_group_members_uid ON agent_group_members(user_id);
CREATE TABLE IF NOT EXISTS agent_tier_members(id serial primary key, tier_id int references agent_tiers(id) on delete cascade, user_id uuid references users(id) on delete cascade, unique(tier_id, user_id));
CREATE INDEX IF NOT EXISTS idx_agent_tier_members_tid ON agent_tier_members(tier_id);
CREATE INDEX IF NOT EXISTS idx_agent_tier_members_uid ON agent_tier_members(user_id);

-- Tickets (and related)
CREATE TABLE IF NOT EXISTS tickets(
  id uuid primary key default gen_random_uuid(),
  ticket_key text unique not null default ticket_key_nextval(),
  title text not null,
  description text,
  reporter_user_id uuid references users(id),
  reporter_email citext,
  system_id int references systems(id),
  module_id int references system_modules(id),
  category_id int references issue_categories(id),
  status_id int references statuses(id),
  priority_id int references priorities(id),
  severity_id int references severities(id),
  source_id int references sources(id),
  assigned_agent_id uuid references users(id),
  group_id int references agent_groups(id),
  tier_id int references agent_tiers(id),
  claimed_by uuid references users(id),
  claimed_at timestamptz,
  reopen_count int default 0,
  last_public_update_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
CREATE INDEX IF NOT EXISTS idx_tickets_created ON tickets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status_id);
CREATE INDEX IF NOT EXISTS idx_tickets_priority ON tickets(priority_id);
CREATE INDEX IF NOT EXISTS idx_tickets_assigned ON tickets(assigned_agent_id, status_id);
CREATE INDEX IF NOT EXISTS idx_tickets_group_tier ON tickets(group_id, tier_id);
CREATE INDEX IF NOT EXISTS idx_tickets_system_module_category ON tickets(system_id, module_id, category_id);
CREATE INDEX IF NOT EXISTS idx_tickets_ticket_key ON tickets(ticket_key);
CREATE INDEX IF NOT EXISTS idx_tickets_title_trgm ON tickets USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_tickets_desc_trgm ON tickets USING gin (description gin_trgm_ops);
DROP TRIGGER IF EXISTS trg_tickets_upd ON tickets;
CREATE TRIGGER trg_tickets_upd BEFORE UPDATE ON tickets FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE OR REPLACE FUNCTION tickets_before_insert() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status_id IS NULL THEN SELECT id INTO NEW.status_id FROM statuses WHERE code='open' LIMIT 1; END IF;
  IF NEW.priority_id IS NULL THEN SELECT id INTO NEW.priority_id FROM priorities WHERE code='medium' LIMIT 1; END IF;
  IF NEW.severity_id IS NULL THEN SELECT id INTO NEW.severity_id FROM severities WHERE code='minor' LIMIT 1; END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_tickets_bi ON tickets;
CREATE TRIGGER trg_tickets_bi BEFORE INSERT ON tickets FOR EACH ROW EXECUTE FUNCTION tickets_before_insert();

CREATE TABLE IF NOT EXISTS ticket_notes(
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references tickets(id) on delete cascade,
  user_id uuid references users(id),
  body text not null,
  is_internal boolean default false,
  created_at timestamptz default now()
);
CREATE INDEX IF NOT EXISTS idx_ticket_notes_ticket ON ticket_notes(ticket_id, created_at DESC);

CREATE TABLE IF NOT EXISTS ticket_watchers(
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references tickets(id) on delete cascade,
  user_id uuid references users(id),
  email citext,
  notify boolean default true
);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_ticket_watchers_ticket_user_email
  ON ticket_watchers(
    ticket_id,
    COALESCE(user_id,'00000000-0000-0000-0000-000000000000'::uuid),
    COALESCE(email,''::citext)
  );
CREATE INDEX IF NOT EXISTS idx_ticket_watchers_ticket ON ticket_watchers(ticket_id);

CREATE TABLE IF NOT EXISTS ticket_attachments(
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references tickets(id) on delete cascade,
  file_name text not null,
  file_type text not null,
  file_size_bytes int not null check (file_size_bytes <= 5*1024*1024),
  storage_path text not null,
  uploaded_by uuid references users(id),
  uploaded_at timestamptz default now()
);
CREATE INDEX IF NOT EXISTS idx_ticket_attachments_ticket ON ticket_attachments(ticket_id);

CREATE TABLE IF NOT EXISTS ticket_events(
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references tickets(id) on delete cascade,
  event_type text not null,
  actor_user_id uuid references users(id),
  details jsonb,
  occurred_at timestamptz default now()
);
CREATE INDEX IF NOT EXISTS idx_ticket_events_ticket ON ticket_events(ticket_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_ticket_events_details_gin ON ticket_events USING gin(details);

-- INBOX / EMAIL INGESTION
CREATE TABLE IF NOT EXISTS inbox_emails(
  id uuid primary key default gen_random_uuid(),
  subject text,
  from_email citext,
  from_name text,
  body text,
  processing_status text default 'pending',
  created_ticket_id uuid references tickets(id),
  error_message text,
  created_at timestamptz default now()
);
CREATE INDEX IF NOT EXISTS idx_inbox_emails_status ON inbox_emails(processing_status);
CREATE INDEX IF NOT EXISTS idx_inbox_emails_created ON inbox_emails(created_at DESC);

-- FILES & AUDIT
CREATE TABLE IF NOT EXISTS files(
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid references tickets(id) on delete set null,
  file_name text,
  file_type text,
  file_size_bytes int,
  storage_path text,
  created_at timestamptz default now()
);
CREATE INDEX IF NOT EXISTS idx_files_ticket ON files(ticket_id);

CREATE TABLE IF NOT EXISTS audit_events(
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references users(id),
  action text not null,
  entity text,
  entity_id text,
  details jsonb,
  occurred_at timestamptz default now()
);
CREATE INDEX IF NOT EXISTS idx_audit_events_actor ON audit_events(actor_user_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_events_entity ON audit_events(entity, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_details_gin ON audit_events USING gin(details);

-- KNOWLEDGE
CREATE TABLE IF NOT EXISTS faqs(
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text,
  system_category_id int references system_category(id),
  is_published boolean default false,
  created_by uuid references users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
CREATE INDEX IF NOT EXISTS idx_faqs_title_trgm ON faqs USING gin(title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_faqs_body_trgm ON faqs USING gin(body gin_trgm_ops);
DROP TRIGGER IF EXISTS trg_faqs_upd ON faqs;
CREATE TRIGGER trg_faqs_upd BEFORE UPDATE ON faqs FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS faq_origins(
  id uuid primary key default gen_random_uuid(),
  faq_id uuid references faqs(id) on delete cascade,
  ticket_id uuid references tickets(id) on delete set null,
  created_at timestamptz default now(),
  unique(faq_id, ticket_id)
);

CREATE TABLE IF NOT EXISTS kb_articles(
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text,
  is_published boolean default false,
  created_by uuid references users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
CREATE INDEX IF NOT EXISTS idx_kb_title_trgm ON kb_articles USING gin(title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_kb_body_trgm ON kb_articles USING gin(body gin_trgm_ops);
DROP TRIGGER IF EXISTS trg_kb_upd ON kb_articles;
CREATE TRIGGER trg_kb_upd BEFORE UPDATE ON kb_articles FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS kb_tags(id uuid primary key default gen_random_uuid(), name text unique not null);
CREATE TABLE IF NOT EXISTS kb_article_tags(article_id uuid references kb_articles(id) on delete cascade, tag_id uuid references kb_tags(id) on delete cascade, primary key(article_id, tag_id));
CREATE TABLE IF NOT EXISTS kb_ratings(
  id uuid primary key default gen_random_uuid(),
  article_id uuid references kb_articles(id) on delete cascade,
  user_id uuid references users(id),
  rating int check (rating between 1 and 5),
  created_at timestamptz default now(),
  unique(article_id, user_id)
);

CREATE TABLE IF NOT EXISTS video_categories(id uuid primary key default gen_random_uuid(), name text unique not null);
CREATE TABLE IF NOT EXISTS videos(
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  category_id uuid references video_categories(id),
  system_category_id int references system_category(id),
  url text,
  duration_seconds int,
  language text,
  is_published boolean default false,
  created_at timestamptz default now()
);
CREATE INDEX IF NOT EXISTS idx_videos_category ON videos(category_id);
CREATE INDEX IF NOT EXISTS idx_videos_system_category ON videos(system_category_id);
CREATE INDEX IF NOT EXISTS idx_videos_title_trgm ON videos USING gin(title gin_trgm_ops);

-- SETTINGS
CREATE TABLE IF NOT EXISTS settings_kv(id uuid primary key default gen_random_uuid(), scope text not null, key text not null, value text, unique(scope, key));
CREATE TABLE IF NOT EXISTS smtp_settings(id boolean primary key default true, host text, port int, username text, password text, secure boolean, from_email text, from_name text, updated_at timestamptz default now()); INSERT INTO smtp_settings(id) VALUES(true) ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS general_settings(id boolean primary key default true, org_name text, timezone text, locale text, updated_at timestamptz default now()); INSERT INTO general_settings(id) VALUES(true) ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS notification_settings(id boolean primary key default true, email_on_ticket_created boolean, email_on_ticket_updated boolean, updated_at timestamptz default now()); INSERT INTO notification_settings(id) VALUES(true) ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS security_settings(id boolean primary key default true, session_timeout_minutes int, password_policy text, updated_at timestamptz default now()); INSERT INTO security_settings(id) VALUES(true) ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS auth_methods_settings(id boolean primary key default true, local_enabled boolean, google_oauth_enabled boolean, microsoft_oauth_enabled boolean, saml_enabled boolean, updated_at timestamptz default now()); INSERT INTO auth_methods_settings(id) VALUES(true) ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS sso_settings(id boolean primary key default true, issuer text, entity_id text, sso_url text, certificate text, updated_at timestamptz default now()); INSERT INTO sso_settings(id) VALUES(true) ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS branding_settings(id boolean primary key default true, logo_url text, primary_color text, accent_color text, updated_at timestamptz default now()); INSERT INTO branding_settings(id) VALUES(true) ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS email_templates_settings(id boolean primary key default true, ticket_created_subject text, ticket_created_body text, ticket_updated_subject text, ticket_updated_body text, updated_at timestamptz default now()); INSERT INTO email_templates_settings(id) VALUES(true) ON CONFLICT DO NOTHING;

-- WORKFLOWS
CREATE TABLE IF NOT EXISTS workflow_rules(
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  is_enabled boolean default false,
  definition jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
CREATE INDEX IF NOT EXISTS idx_workflow_rules_enabled ON workflow_rules(is_enabled);
DROP TRIGGER IF EXISTS trg_workflows_upd ON workflow_rules;
CREATE TRIGGER trg_workflows_upd BEFORE UPDATE ON workflow_rules FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TABLE IF NOT EXISTS workflow_rule_runs(id uuid primary key default gen_random_uuid(), rule_id uuid references workflow_rules(id) on delete cascade, ticket_id uuid references tickets(id) on delete cascade, matched boolean, actions jsonb, ran_at timestamptz default now());
CREATE INDEX IF NOT EXISTS idx_workflow_rule_runs_rule ON workflow_rule_runs(rule_id, ran_at DESC);
CREATE INDEX IF NOT EXISTS idx_workflow_rule_runs_ticket ON workflow_rule_runs(ticket_id);

-- ANALYTICS VIEWS
CREATE OR REPLACE VIEW v_ticket_kpis AS
SELECT
 (SELECT count(*) FROM tickets WHERE created_at > now()-interval '24 hours') created_24h,
 (SELECT count(*) FROM tickets WHERE created_at > now()-interval '7 days') created_7d,
 (SELECT count(*) FROM tickets t JOIN statuses s ON t.status_id=s.id WHERE s.code NOT IN ('resolved','closed')) unsolved;

CREATE OR REPLACE VIEW v_tickets_by_category AS
SELECT COALESCE(ic.name,'Uncategorized') category, count(*)::int count
FROM tickets t LEFT JOIN issue_categories ic ON t.category_id=ic.id
GROUP BY category ORDER BY count DESC;

-- Role Enhancements
ALTER TABLE public.roles ADD COLUMN IF NOT EXISTS code text;
UPDATE public.roles SET code = regexp_replace(lower(name), '[^a-z0-9]+', '.', 'g') WHERE (code IS NULL OR btrim(code) = '') AND name IS NOT NULL;
ALTER TABLE public.roles ALTER COLUMN code SET NOT NULL;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'roles_code_key' AND conrelid = 'public.roles'::regclass) THEN ALTER TABLE public.roles ADD CONSTRAINT roles_code_key UNIQUE (code); END IF; END$$;

-- Idempotent Roles Seed (add more as needed)
INSERT INTO public.roles (code, name, description)
VALUES
  ('admin', 'Admin', 'System administrator'),
  ('agent', 'Agent', 'Support agent'),
  ('enduser', 'EndUser', 'End user'),
  ('helpdeskmanager', 'HelpDeskManager', 'Help desk manager')
ON CONFLICT (code) DO NOTHING;

-- Drop restrictive roles_name_allowed_chk (allow dynamic role creation)
ALTER TABLE public.roles DROP CONSTRAINT IF EXISTS roles_name_allowed_chk;

-- UUID Defaults
ALTER TABLE public.permissions ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.roles ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- Permissions Seed (full list)
INSERT INTO public.permissions (code, name, description)
VALUES
  ('system.manage', 'System Manage', NULL),
  ('users.manage', 'Users Manage', NULL),
  ('roles.manage', 'Roles Manage', NULL),
  ('settings.manage', 'Settings Manage', NULL),
  ('workflows.manage', 'Workflows Manage', NULL),
  ('inbox.manage', 'Inbox Manage', NULL),
  ('files.read', 'Files Read', NULL),
  ('audit.read', 'Audit Read', NULL),
  ('tickets.manage', 'Tickets Manage', NULL),
  ('knowledge.manage', 'Knowledge Manage', NULL),
  ('analytics.view', 'Analytics View', NULL),
  ('apiKeys.manage', 'ApiKeys Manage', NULL),
  ('tickets.list', 'Tickets List', NULL),
  ('tickets.read', 'Tickets Read', NULL),
  ('tickets.create', 'Tickets Create', NULL),
  ('tickets.update', 'Tickets Update', NULL),
  ('tickets.delete', 'Tickets Delete', NULL),
  ('tickets.assign', 'Tickets Assign', NULL),
  ('tickets.release', 'Tickets Release', NULL),
  ('tickets.claim', 'Tickets Claim', NULL),
  ('tickets.unclaim', 'Tickets Unclaim', NULL),
  ('tickets.status.set', 'Tickets Status Set', NULL),
  ('tickets.priority.set', 'Tickets Priority Set', NULL),
  ('tickets.severity.set', 'Tickets Severity Set', NULL),
  ('tickets.notes.read', 'Tickets Notes Read', NULL),
  ('tickets.notes.add', 'Tickets Notes Add', NULL),
  ('tickets.watchers.read', 'Tickets Watchers Read', NULL),
  ('tickets.watchers.add', 'Tickets Watchers Add', NULL),
  ('tickets.watchers.remove', 'Tickets Watchers Remove', NULL),
  ('tickets.attachments.read', 'Tickets Attachments Read', NULL),
  ('tickets.attachments.add', 'Tickets Attachments Add', NULL),
  ('tickets.events.read', 'Tickets Events Read', NULL),
  ('tickets.close', 'Tickets Close', NULL),
  ('tickets.reopen', 'Tickets Reopen', NULL),
  ('knowledge.faqs.list', 'Knowledge Faqs List', NULL),
  ('knowledge.faqs.read', 'Knowledge Faqs Read', NULL),
  ('knowledge.faqs.create', 'Knowledge Faqs Create', NULL),
  ('knowledge.faqs.update', 'Knowledge Faqs Update', NULL),
  ('knowledge.faqs.delete', 'Knowledge Faqs Delete', NULL),
  ('knowledge.faqs.origins.list', 'Knowledge Faqs Origins List', NULL),
  ('knowledge.faqs.origins.create', 'Knowledge Faqs Origins Create', NULL),
  ('knowledge.faqs.origins.delete', 'Knowledge Faqs Origins Delete', NULL),
  ('knowledge.kb.articles.list', 'Knowledge Kb Articles List', NULL),
  ('knowledge.kb.articles.read', 'Knowledge Kb Articles Read', NULL),
  ('knowledge.kb.articles.create', 'Knowledge Kb Articles Create', NULL),
  ('knowledge.kb.articles.update', 'Knowledge Kb Articles Update', NULL),
  ('knowledge.kb.articles.delete', 'Knowledge Kb Articles Delete', NULL),
  ('knowledge.kb.tags.list', 'Knowledge Kb Tags List', NULL),
  ('knowledge.kb.tags.create', 'Knowledge Kb Tags Create', NULL),
  ('knowledge.kb.tags.delete', 'Knowledge Kb Tags Delete', NULL),
  ('knowledge.kb.tagMap.list', 'Knowledge Kb TagMap List', NULL),
  ('knowledge.kb.tagMap.create', 'Knowledge Kb TagMap Create', NULL),
  ('knowledge.kb.tagMap.delete', 'Knowledge Kb TagMap Delete', NULL),
  ('knowledge.kb.ratings.list', 'Knowledge Kb Ratings List', NULL),
  ('knowledge.kb.ratings.delete', 'Knowledge Kb Ratings Delete', NULL),
  ('knowledge.videos.list', 'Knowledge Videos List', NULL),
  ('knowledge.videos.read', 'Knowledge Videos Read', NULL),
  ('knowledge.videos.create', 'Knowledge Videos Create', NULL),
  ('knowledge.videos.update', 'Knowledge Videos Update', NULL),
  ('knowledge.videos.delete', 'Knowledge Videos Delete', NULL),
  ('knowledge.videoCategories.list', 'Knowledge VideoCategories List', NULL),
  ('knowledge.videoCategories.create', 'Knowledge VideoCategories Create', NULL),
  ('knowledge.videoCategories.update', 'Knowledge VideoCategories Update', NULL),
  ('knowledge.videoCategories.delete', 'Knowledge VideoCategories Delete', NULL),
  ('knowledge.search.run', 'Knowledge Search Run', NULL),
  ('analytics.dashboards.view', 'Analytics Dashboards View', NULL),
  ('analytics.reports.run', 'Analytics Reports Run', NULL),
  ('analytics.reports.export', 'Analytics Reports Export', NULL),
  ('analytics.exports.download', 'Analytics Exports Download', NULL),
  ('system.users.list', 'System Users List', NULL),
  ('system.users.read', 'System Users Read', NULL),
  ('system.users.create', 'System Users Create', NULL),
  ('system.users.update', 'System Users Update', NULL),
  ('system.users.delete', 'System Users Delete', NULL),
  ('system.users.roles.assign', 'System Users Roles Assign', NULL),
  ('system.users.roles.remove', 'System Users Roles Remove', NULL),
  ('system.roles.list', 'System Roles List', NULL),
  ('system.roles.read', 'System Roles Read', NULL),
  ('system.roles.create', 'System Roles Create', NULL),
  ('system.roles.update', 'System Roles Update', NULL),
  ('system.roles.delete', 'System Roles Delete', NULL),
  ('system.roles.permissions.list', 'System Roles Permissions List', NULL),
  ('system.roles.permissions.add', 'System Roles Permissions Add', NULL),
  ('system.roles.permissions.remove', 'System Roles Permissions Remove', NULL),
  ('system.lookups.statuses.list', 'System Lookups Statuses List', NULL),
  ('system.lookups.statuses.update', 'System Lookups Statuses Update', NULL),
  ('system.lookups.statuses.create', 'System Lookups Statuses Create', NULL),
  ('system.lookups.statuses.delete', 'System Lookups Statuses Delete', NULL),
  ('system.lookups.priorities.list', 'System Lookups Priorities List', NULL),
  ('system.lookups.priorities.update', 'System Lookups Priorities Update', NULL),
  ('system.lookups.priorities.create', 'System Lookups Priorities Create', NULL),
  ('system.lookups.priorities.delete', 'System Lookups Priorities Delete', NULL),
  ('system.lookups.severities.list', 'System Lookups Severities List', NULL),
  ('system.lookups.severities.update', 'System Lookups Severities Update', NULL),
  ('system.lookups.severities.create', 'System Lookups Severities Create', NULL),
  ('system.lookups.severities.delete', 'System Lookups Severities Delete', NULL),
  ('system.lookups.sources.list', 'System Lookups Sources List', NULL),
  ('system.lookups.sources.update', 'System Lookups Sources Update', NULL),
  ('system.lookups.sources.create', 'System Lookups Sources Create', NULL),
  ('system.lookups.sources.delete', 'System Lookups Sources Delete', NULL),
  ('system.lookups.issueCategories.list', 'System Lookups IssueCategories List', NULL),
  ('system.lookups.issueCategories.update', 'System Lookups IssueCategories Update', NULL),
  ('system.lookups.issueCategories.create', 'System Lookups IssueCategories Create', NULL),
  ('system.lookups.issueCategories.delete', 'System Lookups IssueCategories Delete', NULL),
  ('system.lookups.systemCategory.list', 'System Lookups SystemCategory List', NULL),
  ('system.lookups.systemCategory.update', 'System Lookups SystemCategory Update', NULL),
  ('system.lookups.systemCategory.create', 'System Lookups SystemCategory Create', NULL),
  ('system.lookups.systemCategory.delete', 'System Lookups SystemCategory Delete', NULL),
  ('system.lookups.systems.list', 'System Lookups Systems List', NULL),
  ('system.lookups.systems.read', 'System Lookups Systems Read', NULL),
  ('system.lookups.systems.update', 'System Lookups Systems Update', NULL),
  ('system.lookups.systems.create', 'System Lookups Systems Create', NULL),
  ('system.lookups.systems.delete', 'System Lookups Systems Delete', NULL),
  ('system.lookups.systemModules.list', 'System Lookups SystemModules List', NULL),
  ('system.lookups.systemModules.read', 'System Lookups SystemModules Read', NULL),
  ('system.lookups.systemModules.update', 'System Lookups SystemModules Update', NULL),
  ('system.lookups.systemModules.create', 'System Lookups SystemModules Create', NULL),
  ('system.lookups.systemModules.delete', 'System Lookups SystemModules Delete', NULL),
  ('system.audit.read', 'System Audit Read', NULL),
  ('system.files.list', 'System Files List', NULL),
  ('system.files.read', 'System Files Read', NULL),
  ('system.files.delete', 'System Files Delete', NULL),
  ('system.inbox.emails.list', 'System Inbox Emails List', NULL),
  ('system.inbox.emails.read', 'System Inbox Emails Read', NULL),
  ('system.inbox.emails.update', 'System Inbox Emails Update', NULL),
  ('system.inbox.emails.delete', 'System Inbox Emails Delete', NULL),
  ('system.agents.groups.list', 'System Agents Groups List', NULL),
  ('system.agents.groups.read', 'System Agents Groups Read', NULL),
  ('system.agents.groups.update', 'System Agents Groups Update', NULL),
  ('system.agents.groups.create', 'System Agents Groups Create', NULL),
  ('system.agents.groups.delete', 'System Agents Groups Delete', NULL),
  ('system.agents.groupMembers.list', 'System Agents GroupMembers List', NULL),
  ('system.agents.groupMembers.add', 'System Agents GroupMembers Add', NULL),
  ('system.agents.groupMembers.remove', 'System Agents GroupMembers Remove', NULL),
  ('system.agents.tiers.list', 'System Agents Tiers List', NULL),
  ('system.agents.tiers.read', 'System Agents Tiers Read', NULL),
  ('system.agents.tiers.update', 'System Agents Tiers Update', NULL),
  ('system.agents.tiers.create', 'System Agents Tiers Create', NULL),
  ('system.agents.tiers.delete', 'System Agents Tiers Delete', NULL),
  ('system.agents.tierMembers.list', 'System Agents TierMembers List', NULL),
  ('system.agents.tierMembers.add', 'System Agents TierMembers Add', NULL),
  ('system.agents.tierMembers.remove', 'System Agents TierMembers Remove', NULL),
  ('workflows.manage', 'Workflows Manage', NULL)
ON CONFLICT (code) DO NOTHING;

-- Add any other seed data as needed

-- End of merged core migration
