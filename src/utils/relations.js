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

  system_id: { table: 'systems', key: 'system', defaults: ['id','name','code'], allowed: ['id','name','code','description','category_id','is_active','created_at','updated_at'] },
  module_id: { table: 'system_modules', key: 'module', defaults: ['id','name'], allowed: ['id','name','code','description','system_id','is_active','created_at','updated_at'] },
  category_id: { table: 'issue_categories', key: 'category', defaults: ['id','name'], allowed: ['id','name','code','description','system_id','parent_id','is_active','created_at','updated_at'] },
  status_id: { table: 'statuses', key: 'status', defaults: ['id','name','code'], allowed: ['id','name','code','is_closed','sort'] },
  priority_id: { table: 'priorities', key: 'priority', defaults: ['id','name','code'], allowed: ['id','name','code','sort'] },
  severity_id: { table: 'severities', key: 'severity', defaults: ['id','name','code'], allowed: ['id','name','code','sort'] },
  source_id: { table: 'sources', key: 'source', defaults: ['id','name','code'], allowed: ['id','name','code'] },
  group_id: { table: 'agent_groups', key: 'group', defaults: ['id','name'], allowed: ['id','name','description'] },
  tier_id: { table: 'agent_tiers', key: 'tier', defaults: ['id','name'], allowed: ['id','name','level'] }
};

function parseAttrs(req, qKey, allowed){
  const raw = req?.query?.[qKey] ?? null;
  if (raw === null || raw === undefined) return null; // signal to use full to_jsonb by default
  const parts = String(raw).split(',').map(s=>s.trim()).filter(Boolean);
  if (!parts.length) return allowed; // empty provided -> fall back to allowed
  return parts.filter(p=>allowed.includes(p));
}

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
  const m = s.match(/^[a-zA-Z0-9_.-]+\s*\[(.*)\]\s*$/);
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
  const fields = req?.query?.fields || null;
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

export async function listDetailed(table, req, order = '1 DESC', options = {}){
  // find which FK columns exist for this table per FK_MAP
  const cols = Object.keys(FK_MAP);
  const { rows: presentCols } = await pool.query(
    `SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name=$1 AND column_name = ANY($2)`,
    [table, cols]
  );
  const presentSet = new Set((presentCols||[]).map(r=>r.column_name));
  const relations = [];
  for (const c of cols){
    if (presentSet.has(c)){
      relations.push({ col: c, ...FK_MAP[c] });
    }
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
    const qKey = `with_attrs_${rel.key}`;
    const custom = parseAttrs(req, qKey, rel.allowed);
    const alias = rel.table.replace(/[^a-z0-9]/g,'_').slice(0,3);
    // ensure alias unique by appending index
    const idx = joinParts.length + 1;
    const aAlias = `${alias}${idx}`;
    if (custom && custom.length) {
      const pairs = custom.map(a => `'${a}', ${aAlias}.${a}`);
      selectParts.push(`jsonb_build_object(${pairs.join(', ')}) AS ${rel.key}`);
    } else {
      // default: include the full related row as JSON (all available attributes)
      selectParts.push(`to_jsonb(${aAlias}) AS ${rel.key}`);
    }
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
  if (table === 'users' && expandTree && Object.keys(expandTree).length){
    outRows = await expandUsersRows(rows, expandTree);
  }
  return fields ? outRows.map(r => pickFieldsDeep(r, fields)) : outRows;
}

export async function readDetailed(table, idCol, id, req){
  const cols = Object.keys(FK_MAP);
  const { rows: presentCols } = await pool.query(
    `SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name=$1 AND column_name = ANY($2)`,
    [table, cols]
  );
  const presentSet = new Set((presentCols||[]).map(r=>r.column_name));
  const relations = [];
  for (const c of cols){
    if (presentSet.has(c)) relations.push({ col: c, ...FK_MAP[c] });
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
    const qKey = `with_attrs_${rel.key}`;
    const custom = parseAttrs(req, qKey, rel.allowed);
    const alias = rel.table.replace(/[^a-z0-9]/g,'_').slice(0,3);
    const idx = joinParts.length + 1;
    const aAlias = `${alias}${idx}`;
    if (custom && custom.length) {
      const pairs = custom.map(a => `'${a}', ${aAlias}.${a}`);
      selectParts.push(`jsonb_build_object(${pairs.join(', ')}) AS ${rel.key}`);
    } else {
      selectParts.push(`to_jsonb(${aAlias}) AS ${rel.key}`);
    }
    joinParts.push(`LEFT JOIN ${rel.table} ${aAlias} ON t.${rel.col} = ${aAlias}.id`);
  }
  const sql = `SELECT ${selectParts.join(', ')} FROM ${table} t ${joinParts.join(' ')} WHERE t.${idCol} = $1 LIMIT 1`;
  const { rows } = await pool.query(sql, [id]);
  let row = rows[0];
  if (!row) return row;

  const { expand: expandTree, fields } = getExpandAndFields(req);
  if (table === 'users' && expandTree && Object.keys(expandTree).length){
    const r = await expandUsersRows([row], expandTree);
    row = r[0];
  }
  return fields ? pickFieldsDeep(row, fields) : row;
}
