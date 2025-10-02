/* eslint-disable no-unused-vars */
import pool from '../db/pool.js';
import { buildSelectColumns } from './crud.js';
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

  system_id: { table: 'systems', key: 'system', defaults: ['id','name','code'], allowed: ['id','name','code','description'] },
  module_id: { table: 'system_modules', key: 'module', defaults: ['id','name'], allowed: ['id','name','code','description'] },
  category_id: { table: 'issue_categories', key: 'category', defaults: ['id','name'], allowed: ['id','name','code','description'] },
  status_id: { table: 'statuses', key: 'status', defaults: ['id','name','code'], allowed: ['id','name','code'] },
  priority_id: { table: 'priorities', key: 'priority', defaults: ['id','name','code'], allowed: ['id','name','code'] },
  severity_id: { table: 'severities', key: 'severity', defaults: ['id','name','code'], allowed: ['id','name','code'] },
  source_id: { table: 'sources', key: 'source', defaults: ['id','name','code'], allowed: ['id','name','code'] },
  group_id: { table: 'agent_groups', key: 'group', defaults: ['id','name'], allowed: ['id','name','code'] },
  tier_id: { table: 'agent_tiers', key: 'tier', defaults: ['id','name'], allowed: ['id','name','code'] }
};

function parseAttrs(req, qKey, allowed, defaults){
  const raw = req.query[qKey] || null;
  if (!raw) return defaults;
  const parts = String(raw).split(',').map(s=>s.trim()).filter(Boolean);
  return parts.length ? parts.filter(p=>allowed.includes(p)) : defaults;
}

async function tablesExist(tables){
  const { rows } = await pool.query(`SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name = ANY($1)`, [tables]);
  return new Set((rows||[]).map(r=>r.table_name));
}

export async function listDetailed(table, req, order = '1 DESC'){
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
    const attrs = parseAttrs(req, qKey, rel.allowed, rel.defaults);
    const alias = rel.table.replace(/[^a-z0-9]/g,'_').slice(0,3);
    // ensure alias unique by appending index
    const idx = joinParts.length + 1;
    const aAlias = `${alias}${idx}`;
    const pairs = attrs.map(a => `'${a}', ${aAlias}.${a}`);
    selectParts.push(`jsonb_build_object(${pairs.join(', ')}) AS ${rel.key}`);
    joinParts.push(`LEFT JOIN ${rel.table} ${aAlias} ON t.${rel.col} = ${aAlias}.id`);
  }
  const whereSql = ''; // callers often include filters; for general list we return all ordered
  const sql = `SELECT ${selectParts.join(', ')} FROM ${table} t ${joinParts.join(' ')} ORDER BY ${order}`;
  const { rows } = await pool.query(sql);
  const fields = req?.query?.fields || null;
  return fields ? rows.map(r => pickFieldsDeep(r, fields)) : rows;
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
    const attrs = parseAttrs(req, qKey, rel.allowed, rel.defaults);
    const alias = rel.table.replace(/[^a-z0-9]/g,'_').slice(0,3);
    const idx = joinParts.length + 1;
    const aAlias = `${alias}${idx}`;
    const pairs = attrs.map(a => `'${a}', ${aAlias}.${a}`);
    selectParts.push(`jsonb_build_object(${pairs.join(', ')}) AS ${rel.key}`);
    joinParts.push(`LEFT JOIN ${rel.table} ${aAlias} ON t.${rel.col} = ${aAlias}.id`);
  }
  const sql = `SELECT ${selectParts.join(', ')} FROM ${table} t ${joinParts.join(' ')} WHERE t.${idCol} = $1 LIMIT 1`;
  const { rows } = await pool.query(sql, [id]);
  const row = rows[0];
  const fields = req?.query?.fields || null;
  return fields ? pickFieldsDeep(row, fields) : row;
}
