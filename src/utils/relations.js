/* eslint-disable no-unused-vars */
import pool from '../db/pool.js';
import { pickFieldsDeep } from './crud.js';

// Mapping from FK column to target table and default allowed attrs
const FK_MAP = {
  reporter_user_id: { table: 'users', key: 'reporter_user', defaults: ['id','email','full_name'], allowed: ['id','email','full_name'] },
  user_id: { table: 'users', key: 'user', defaults: ['id','email','full_name'], allowed: ['id','email','full_name'] },
  created_by: { table: 'users', key: 'created_by_user', defaults: ['id','email','full_name'], allowed: ['id','email','full_name'] },
  uploaded_by: { table: 'users', key: 'uploaded_by_user', defaults: ['id','email','full_name'], allowed: ['id','email','full_name'] },
  actor_user_id: { table: 'users', key: 'actor_user', defaults: ['id','email','full_name'], allowed: ['id','email','full_name'] },
  assigned_agent_id: { table: 'users', key: 'assigned_agent', defaults: ['id','email','full_name'], allowed: ['id','email','full_name'] },
  claimed_by: { table: 'users', key: 'claimed_by_user', defaults: ['id','email','full_name'], allowed: ['id','email','full_name'] },

  // Messaging
  to_user_id: { table: 'users', key: 'to_user', defaults: ['id','email','full_name'], allowed: ['id','email','full_name'] },

  system_id: { table: 'systems', key: 'system', defaults: ['id','name','code'], allowed: ['id','name','code','description','category_id','is_active','created_at','updated_at'] },
  module_id: { table: 'system_modules', key: 'module', defaults: ['id','name'], allowed: ['id','name','code','description','system_id','is_active','created_at','updated_at'] },
  category_id: { table: 'issue_categories', key: 'category', defaults: ['id','name'], allowed: ['id','name','code','description','system_id','parent_id','is_active','created_at','updated_at'] },
  status_id: { table: 'statuses', key: 'status', defaults: ['id','name','code'], allowed: ['id','name','code','is_closed','sort'] },
  priority_id: { table: 'priorities', key: 'priority', defaults: ['id','name','code'], allowed: ['id','name','code','sort'] },
  severity_id: { table: 'severities', key: 'severity', defaults: ['id','name','code'], allowed: ['id','name','code','sort'] },
  source_id: { table: 'sources', key: 'source', defaults: ['id','name','code'], allowed: ['id','name','code'] },
  group_id: { table: 'agent_groups', key: 'group', defaults: ['id','name'], allowed: ['id','name','description'] },
  tier_id: { table: 'agent_tiers', key: 'tier', defaults: ['id','name'], allowed: ['id','name','level'] },

  // Knowledge base and FAQs relations
  faq_id: { table: 'faqs', key: 'faq', defaults: ['id','title'], allowed: ['id','title','is_published','created_at'] },
  ticket_id: { table: 'tickets', key: 'ticket', defaults: ['id','title'], allowed: ['id','title','status_id','priority_id','created_at'] },
  article_id: { table: 'kb_articles', key: 'article', defaults: ['id','title'], allowed: ['id','title','is_published','created_at'] },
  tag_id: { table: 'kb_tags', key: 'tag', defaults: ['id','name'], allowed: ['id','name'] },

  // Inbox
  created_ticket_id: { table: 'tickets', key: 'created_ticket', defaults: ['id','title'], allowed: ['id','title'] },

  // Videos
  system_category_id: { table: 'system_category', key: 'system_category', defaults: ['id','name'], allowed: ['id','name'] },
};

// Table-specific FK overrides. These take precedence over generic FK_MAP.
// Use the format `${table}.${column}` as the key.
const SPECIFIC_FK_MAP = {
  'videos.category_id': { table: 'video_categories', key: 'category', defaults: ['id','name'], allowed: ['id','name'] },
};

async function tablesExist(tables){
  const { rows } = await pool.query(`SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name = ANY($1)`, [tables]);
  return new Set((rows||[]).map(r=>r.table_name));
}

// --- Nested expansion support ---
// Expand spec is an object tree like: { roles: { permissions: {} } }
function parseExpandParam(raw) {
  if (!raw) return {};
  const out = {};
  const parts = String(raw).split(',').map(s=>s.trim()).filter(Boolean);
  for (const p of parts){
    const segs = p.split('.').filter(Boolean);
    let cur = out;
    for (const s of segs){
      if (!cur[s]) cur[s] = {};
      cur = cur[s];
    }
  }
  return out;
}

// Parse bracket-based select like: users[id,name,roles[id,name,permissions[id,name]]]
// Returns { fields: 'id,name,roles.id,roles.name,roles.permissions.id,roles.permissions.name', expand: {roles:{permissions:{}}} }
function parseBracketSelect(raw) {
  if (!raw) return null;
  let s = String(raw).trim();
  // Accept optional top-level entity prefix like users[...]
  // Strip leading identifier and optional '=' e.g., users[...]
  const m = s.match(/^[a-zA-Z0-9_.-]+\s*\[(.*)]\s*$/);
  if (m) s = m[1];
  // Also allow wrapping braces: { ... }
  s = s.replace(/^{\s*/, '').replace(/\s*}$/, '');
  let pos = 0;
  const len = s.length;
  const peek = () => s[pos];
  const consumeWhitespace = () => { while (pos < len && /\s/.test(s[pos])) pos++; };
  const parseIdent = () => {
    consumeWhitespace();
    let start = pos;
    while (pos < len && /[a-zA-Z0-9_.]/.test(s[pos])) pos++;
    if (pos === start) return null;
    return s.slice(start, pos);
  };
  const expectChar = (ch) => {
    consumeWhitespace();
    if (s[pos] === ch) { pos++; return true; }
    return false;
  };
  const parseList = () => {
    const spec = {};
    while (pos < len) {
      consumeWhitespace();
      const id = parseIdent();
      if (!id) break;
      // Lookahead for nested list
      consumeWhitespace();
      if (peek() === '[' || peek() === '{') {
        const open = peek(); pos++;
        const child = parseList();
        // expect matching close
        const close = open === '[' ? ']' : '}';
        expectChar(close);
        spec[id] = child;
      } else {
        spec[id] = {};
      }
      consumeWhitespace();
      if (peek() === ',') { pos++; continue; }
      // allow accidental trailing
      if (peek() === ']' || peek() === '}') break;
    }
    return spec;
  };
  const tree = parseList();
  // Convert tree into fields and expand paths
  const fields = [];
  const expand = {};
  const walk = (node, prefix = []) => {
    for (const key of Object.keys(node)){
      const child = node[key];
      const path = prefix.concat(key);
      if (Object.keys(child).length){
        // has nested
        // Build expand object tree
        let cur = expand;
        for (const seg of path){ if (!cur[seg]) cur[seg] = {}; cur = cur[seg]; }
        // add fields for children recursively
        walk(child, path);
      } else {
        fields.push(path.join('.'));
      }
    }
  };
  walk(tree, []);
  // Also include container keys in fields so that top-level arrays are preserved
  const addContainerFields = (node, prefix=[]) => {
    for (const key of Object.keys(node)){
      const child = node[key];
      if (Object.keys(child).length){
        const containerPath = prefix.concat(key).join('.');
        // Ensure at least the container key is in fields so pickFieldsDeep includes it
        if (!fields.some(f=>f===containerPath || f.startsWith(containerPath+'.'))){
          fields.push(containerPath);
        }
        addContainerFields(child, prefix.concat(key));
      }
    }
  };
  addContainerFields(tree, []);
  return { fields: fields.join(','), expand };
}

function getExpandAndFields(req){
  // Priority: select (bracket) overrides fields/expand; otherwise use expand param
  const rawSelect = req?.query?.select || null;
  if (rawSelect){
    try {
      const parsed = parseBracketSelect(rawSelect);
      if (parsed) return { expand: parsed.expand || {}, fields: parsed.fields || (req?.query?.fields || null) };
    } catch (_) { /* ignore parse errors; fall back */ }
  }
  const expand = parseExpandParam(req?.query?.expand || '');
  // Support special fields='*' to indicate "all fields" (bypass projection)
  const rawFields = req?.query?.fields || null;
  const fields = rawFields && String(rawFields).trim() === '*' ? null : rawFields;
  return { expand, fields };
}

async function expandUsersRows(rows, expandTree){
  if (!rows || !rows.length) return rows;
  const hasRoles = !!expandTree?.roles;
  if (!hasRoles) return rows;
  const userIds = rows.map(r => r.id).filter(Boolean);
  if (!userIds.length) return rows;
  // Fetch roles for all users
  const rolesQ = await pool.query(
    `SELECT ur.user_id, r.*
     FROM user_roles ur
     JOIN roles r ON r.id = ur.role_id
     WHERE ur.user_id = ANY($1::uuid[])`,
    [userIds]
  );
  const rolesByUser = new Map();
  for (const row of rolesQ.rows){
    const uid = row.user_id;
    const role = { ...row };
    delete role.user_id;
    if (!rolesByUser.has(uid)) rolesByUser.set(uid, []);
    rolesByUser.get(uid).push(role);
  }
  for (const r of rows){
    r.roles = rolesByUser.get(r.id) || [];
  }
  // Nested: permissions under roles
  const wantPerms = !!expandTree.roles?.permissions;
  if (wantPerms){
    const allRoles = rows.flatMap(u => Array.isArray(u.roles) ? u.roles : []);
    const roleIds = allRoles.map(rr => rr.id).filter(Boolean);
    if (roleIds.length){
      const permQ = await pool.query(
        `SELECT rp.role_id, p.*
         FROM role_permissions rp
         JOIN permissions p ON p.id = rp.permission_id
         WHERE rp.role_id = ANY($1::uuid[])`,
        [roleIds]
      );
      const permsByRole = new Map();
      for (const pr of permQ.rows){
        const rid = pr.role_id;
        const perm = { ...pr };
        delete perm.role_id;
        if (!permsByRole.has(rid)) permsByRole.set(rid, []);
        permsByRole.get(rid).push(perm);
      }
      for (const role of allRoles){
        role.permissions = permsByRole.get(role.id) || [];
      }
    } else {
      // Ensure permissions key exists as empty arrays if requested
      for (const role of allRoles){ role.permissions = []; }
    }
  }
  return rows;
}

// New function to expand roles and their permissions
async function expandRolesRows(rows, expandTree){
  if (!rows || !rows.length) return rows;
  const wantPerms = !!expandTree?.permissions;
  if (!wantPerms) return rows;
  const roleIds = rows.map(r => r.id).filter(Boolean);
  if (!roleIds.length) return rows;
  const permQ = await pool.query(
    `SELECT rp.role_id, p.*
     FROM role_permissions rp
     JOIN permissions p ON p.id = rp.permission_id
     WHERE rp.role_id = ANY($1::uuid[])`,
    [roleIds]
  );
  const permsByRole = new Map();
  for (const pr of permQ.rows){
    const rid = pr.role_id;
    const perm = { ...pr };
    delete perm.role_id;
    if (!permsByRole.has(rid)) permsByRole.set(rid, []);
    permsByRole.get(rid).push(perm);
  }
  for (const r of rows){
    r.permissions = permsByRole.get(r.id) || [];
  }
  return rows;
}

// Expand nested user relations within arbitrary rows, for keys derived from FK_MAP that point to users
async function expandNestedUserRelations(rows, expandTree){
  if (!rows || !rows.length) return rows;
  if (!expandTree || !Object.keys(expandTree).length) return rows;
  // Discover relation keys that are user objects at this level
  const userKeys = Object.values(FK_MAP).filter(v => v.table === 'users').map(v => v.key);
  for (const key of userKeys){
    const subtree = expandTree[key];
    if (!subtree) continue;
    // collect user objects present under this key
    const users = [];
    for (const row of rows){
      const u = row?.[key];
      if (u && typeof u === 'object' && u.id) users.push(u);
    }
    if (users.length){
      // Expand roles/permissions on these nested users as requested
      // eslint-disable-next-line no-await-in-loop
      await expandUsersRows(users, subtree);
    }
  }
  return rows;
}

function resolveFkFor(table, column){
  const specific = SPECIFIC_FK_MAP[`${table}.${column}`];
  if (specific) return specific;
  return FK_MAP[column] || null;
}

async function getPresentColumns(table){
  const { rows } = await pool.query(
    `SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name=$1`,
    [table]
  );
  return new Set((rows||[]).map(r=>r.column_name));
}

// Collections (one-to-many) expansion map per parent table
// Each entry: key -> { sql(idsParamIndex:number): { text, values }, parentKey: column name in result identifying parent id, order?: string }
const COLLECTIONS_MAP = Object.freeze({
  tickets: {
    notes: {
      build: (ids) => ({ text: `SELECT ticket_id AS parent_id, tn.* FROM ticket_notes tn WHERE tn.ticket_id = ANY($1::uuid[]) ORDER BY tn.created_at DESC`, values: [ids] })
    },
    attachments: {
      build: (ids) => ({ text: `SELECT ticket_id AS parent_id, ta.* FROM ticket_attachments ta WHERE ta.ticket_id = ANY($1::uuid[]) ORDER BY ta.uploaded_at DESC`, values: [ids] })
    },
    events: {
      build: (ids) => ({ text: `SELECT ticket_id AS parent_id, te.* FROM ticket_events te WHERE te.ticket_id = ANY($1::uuid[]) ORDER BY te.occurred_at DESC`, values: [ids] })
    },
    watchers: {
      build: (ids) => ({ text: `SELECT ticket_id AS parent_id, tw.* FROM ticket_watchers tw WHERE tw.ticket_id = ANY($1::uuid[]) ORDER BY COALESCE(tw.email,'') ASC`, values: [ids] })
    },
  },
  kb_articles: {
    tags: {
      build: (ids) => ({ text: `SELECT kat.article_id AS parent_id, t.* FROM kb_article_tags kat JOIN kb_tags t ON t.id = kat.tag_id WHERE kat.article_id = ANY($1::uuid[]) ORDER BY t.name ASC`, values: [ids] })
    },
    ratings: {
      build: (ids) => ({ text: `SELECT kr.article_id AS parent_id, kr.* FROM kb_ratings kr WHERE kr.article_id = ANY($1::uuid[]) ORDER BY kr.created_at DESC`, values: [ids] })
    }
  },
  faqs: {
    origins: {
      build: (ids) => ({ text: `SELECT fo.faq_id AS parent_id, fo.* FROM faq_origins fo WHERE fo.faq_id = ANY($1::uuid[]) ORDER BY fo.created_at DESC`, values: [ids] })
    },
    ratings: {
      build: (ids) => ({ text: `SELECT fr.faq_id AS parent_id, fr.* FROM faq_ratings fr WHERE fr.faq_id = ANY($1::uuid[]) ORDER BY fr.created_at DESC`, values: [ids] })
    }
  },
  videos: {
    ratings: {
      build: (ids) => ({ text: `SELECT vr.video_id AS parent_id, vr.* FROM video_ratings vr WHERE vr.video_id = ANY($1::uuid[]) ORDER BY vr.created_at DESC`, values: [ids] })
    }
  },
  users: {
    tiers: {
      build: (ids) => ({ text: `SELECT tm.user_id AS parent_id, at.* FROM agent_tier_members tm JOIN agent_tiers at ON at.id = tm.tier_id WHERE tm.user_id = ANY($1::uuid[]) ORDER BY at.name ASC`, values: [ids] })
    },
    support_groups: {
      build: (ids) => ({ text: `SELECT gm.user_id AS parent_id, ag.* FROM agent_group_members gm JOIN agent_groups ag ON ag.id = gm.group_id WHERE gm.user_id = ANY($1::uuid[]) ORDER BY ag.name ASC`, values: [ids] })
    },
    roles: {
      build: (ids) => ({ text: `SELECT ur.user_id AS parent_id, r.* FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = ANY($1::uuid[]) ORDER BY r.name ASC`, values: [ids] })
    }
  },
  roles: {
    permissions: {
      build: (ids) => ({ text: `SELECT rp.role_id AS parent_id, p.* FROM role_permissions rp JOIN permissions p ON p.id = rp.permission_id WHERE rp.role_id = ANY($1::uuid[]) ORDER BY p.code ASC`, values: [ids] })
    }
  },
  // New: messages attachments expansion
  messages: {
    attachments: {
      build: (ids) => ({ text: `SELECT message_id AS parent_id, ma.* FROM message_attachments ma WHERE ma.message_id = ANY($1::uuid[]) ORDER BY ma.uploaded_at DESC`, values: [ids] })
    }
  }
});

async function expandCollections(table, rows, expandTree){
  if (!rows || !rows.length) return rows;
  const map = COLLECTIONS_MAP[table];
  if (!map) return rows;
  const ids = rows.map(r => r.id).filter(Boolean);
  if (!ids.length) return rows;
  const wantKeys = Object.keys(map);
  // Decide which collections to include:
  // If expandTree is provided and requests any of these keys, include those; otherwise include all by default as requested.
  const requestedKeys = Object.keys(expandTree || {});
  const includeKeys = requestedKeys.length ? wantKeys.filter(k => requestedKeys.includes(k)) : wantKeys;
  if (!includeKeys.length) return rows;
  // For each included collection, batch load and assign
  for (const key of includeKeys){
    const spec = map[key];
    if (!spec || typeof spec.build !== 'function') continue;
    // eslint-disable-next-line no-await-in-loop
    const q = await pool.query(spec.build(ids).text, spec.build(ids).values);
    const grouped = new Map();
    for (const row of q.rows){
      const pid = row.parent_id;
      const child = { ...row };
      delete child.parent_id;
      if (!grouped.has(pid)) grouped.set(pid, []);
      grouped.get(pid).push(child);
    }
    for (const r of rows){
      r[key] = grouped.get(r.id) || [];
    }
  }
  return rows;
}

export async function listDetailed(table, req, order = '1 DESC', options = {}){
  // discover FK relations for this table, including specific overrides
  const presentSet = await getPresentColumns(table);
  const candidateCols = new Set([
    ...Object.keys(FK_MAP),
    ...Object.keys(SPECIFIC_FK_MAP)
      .filter(k => k.startsWith(`${table}.`))
      .map(k => k.split('.').slice(-1)[0])
  ]);
  const relations = [];
  for (const c of presentSet){
    if (!candidateCols.has(c)) continue;
    const cfg = resolveFkFor(table, c);
    if (cfg) relations.push({ col: c, ...cfg });
  }

  // check which target tables exist
  const targetTables = Array.from(new Set(relations.map(r=>r.table)));
  const presentTargets = await tablesExist(targetTables);

  const selectParts = [`t.*`];
  const joinParts = [];
  for (const rel of relations){
    if (!presentTargets.has(rel.table)){
      selectParts.push(`NULL::jsonb AS ${rel.key}`);
      continue;
    }
    const alias = rel.table.replace(/[^a-z0-9]/g,'_').slice(0,3);
    const idx = joinParts.length + 1;
    const aAlias = `${alias}${idx}`;
    // Always include full related row; bracket-select/fields will sculpt the response
    selectParts.push(`to_jsonb(${aAlias}) AS ${rel.key}`);
    joinParts.push(`LEFT JOIN ${rel.table} ${aAlias} ON t.${rel.col} = ${aAlias}.id`);
  }

  // Allow callers to add extra select expressions, e.g., aggregates
  const extraSelects = Array.isArray(options.extraSelects) ? options.extraSelects : [];
  if (extraSelects.length){
    selectParts.push(...extraSelects);
  }

  const whereSql = options.whereSql ? String(options.whereSql) : '';
  const baseParams = Array.isArray(options.params) ? options.params.slice() : [];

  let sql = `SELECT ${selectParts.join(', ')} FROM ${table} t ${joinParts.join(' ')}`;
  if (whereSql && whereSql.trim()) sql += ` ${whereSql}`;
  sql += ` ORDER BY ${order}`;

  const params = baseParams.slice();
  const limits = [];
  if (Number.isFinite(options.limit)) {
    params.push(options.limit);
    limits.push(`LIMIT $${params.length}`);
  }
  if (Number.isFinite(options.offset)) {
    params.push(options.offset);
    limits.push(`OFFSET $${params.length}`);
  }
  if (limits.length) sql += ` ${limits.join(' ')}`;

  const { rows } = await pool.query(sql, params);

  // Nested expansion layer (e.g., users -> roles -> permissions)
  const { expand: expandTree, fields } = getExpandAndFields(req);
  let outRows = rows;
  if (expandTree && Object.keys(expandTree).length){
    if (table === 'users') {
      outRows = await expandUsersRows(rows, expandTree);
    } else if (table === 'roles') {
      outRows = await expandRolesRows(rows, expandTree);
    }
    // Also support nested user expansions on any table
    outRows = await expandNestedUserRelations(outRows, expandTree);
  }
  // Collections (arrays)
  outRows = await expandCollections(table, outRows, expandTree);

  return fields ? outRows.map(r => pickFieldsDeep(r, fields)) : outRows;
}

export async function readDetailed(table, idCol, id, req){
  // discover FK relations for this table, including specific overrides
  const presentSet = await getPresentColumns(table);
  const candidateCols = new Set([
    ...Object.keys(FK_MAP),
    ...Object.keys(SPECIFIC_FK_MAP)
      .filter(k => k.startsWith(`${table}.`))
      .map(k => k.split('.').slice(-1)[0])
  ]);
  const relations = [];
  for (const c of presentSet){
    if (!candidateCols.has(c)) continue;
    const cfg = resolveFkFor(table, c);
    if (cfg) relations.push({ col: c, ...cfg });
  }
  const targetTables = Array.from(new Set(relations.map(r=>r.table)));
  const presentTargets = await tablesExist(targetTables);

  const selectParts = [`t.*`];
  const joinParts = [];
  for (const rel of relations){
    if (!presentTargets.has(rel.table)){
      selectParts.push(`NULL::jsonb AS ${rel.key}`);
      continue;
    }
    const alias = rel.table.replace(/[^a-z0-9]/g,'_').slice(0,3);
    const idx = joinParts.length + 1;
    const aAlias = `${alias}${idx}`;
    // Always include full related row; bracket-select/fields will sculpt the response
    selectParts.push(`to_jsonb(${aAlias}) AS ${rel.key}`);
    joinParts.push(`LEFT JOIN ${rel.table} ${aAlias} ON t.${rel.col} = ${aAlias}.id`);
  }
  let sql = `SELECT ${selectParts.join(', ')} FROM ${table} t ${joinParts.join(' ')} WHERE t.${idCol}=$1 LIMIT 1`;
  const { rows } = await pool.query(sql, [id]);
  const row = rows[0] || null;
  if (!row) return null;
  const { expand: expandTree, fields } = getExpandAndFields(req);
  let out = row;
  if (expandTree && Object.keys(expandTree).length){
    if (table === 'users') {
      out = (await expandUsersRows([row], expandTree))[0];
    } else if (table === 'roles') {
      out = (await expandRolesRows([row], expandTree))[0];
    }
    out = (await expandNestedUserRelations([out], expandTree))[0];
  }
  // Collections (arrays)
  const withColl = (await expandCollections(table, [out], expandTree))[0];
  return fields ? pickFieldsDeep(withColl, fields) : withColl;
}
