#!/usr/bin/env node
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Load .env from project root (scripts is one level down)
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

console.log('SMOKE-TEST ENV ADMIN_EMAIL=', process.env.ADMIN_EMAIL ? '[hidden]' : 'MISSING');
console.log('SMOKE-TEST ENV ADMIN_PASSWORD=', process.env.ADMIN_PASSWORD ? '[hidden]' : 'MISSING');

const BASE = `http://localhost:${process.env.PORT || 8080}/api`;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

function nowTag() {
  return Date.now().toString(36).slice(-6);
}

const exampleBodies = {
  '/api/system/lookups/statuses': () => ({ code: `smoke-${nowTag()}`, name: 'Smoke Test', is_closed: false, sort: 100 }),
  '/api/system/lookups/priorities': () => ({ code: `smoke-${nowTag()}`, name: 'Smoke Priority', sort: 50 }),
  '/api/system/lookups/severities': () => ({ code: `smoke-${nowTag()}`, name: 'Smoke Severity', sort: 50 }),
  '/api/system/lookups/sources': () => ({ code: `smoke-${nowTag()}`, name: 'Smoke Source' }),
  '/api/public/tickets': () => ({ title: `Smoke ticket ${nowTag()}`, description: 'Created by smoke tests', reporter_user_id: null }),
  '/api/tickets': () => ({ title: `Smoke ticket ${nowTag()}`, description: 'Created by smoke tests', reporter_user_id: null }),
  '/api/knowledge/kb/tags': () => ({ name: `smoke-tag-${nowTag()}` }),
  '/api/knowledge/videos': () => ({ title: `Smoke video ${nowTag()}`, url: 'http://example.com/video.mp4', category_id: null }),
  '/api/knowledge/videos/categories': () => ({ name: `smoke-video-cat-${nowTag()}` }),
  // Lookups for agent groups/tiers (no direct membership endpoints; memberships managed via users)
  '/api/system/lookups/support-groups': () => ({ name: `Smoke Group ${nowTag()}` }),
  '/api/system/lookups/support-tiers': () => ({ code: `smoke-${nowTag()}`, name: `Smoke Tier ${nowTag()}` }),
  '/api/system/users': () => ({ email: `smoke-user-${nowTag()}@example.local`, full_name: 'Smoke User', password: 'Password123!' }),
  '/api/system/roles': () => ({ name: `Smoke Role ${nowTag()}`, permissions: [] }),
  // Additional makers to reduce 400s from the smoke tests
  '/api/knowledge/faqs': () => ({ title: `Smoke FAQ ${nowTag()}`, body: 'FAQ created by smoke tests', system_category_id: null, is_published: false }),
  '/api/knowledge/faqs/origins': () => ({ faq_id: null, ticket_id: null }),
  '/api/knowledge/kb/articles': () => ({ title: `Smoke article ${nowTag()}`, body: 'Article created by smoke tests', is_published: false }),
  '/api/knowledge/kb/ratings': () => ({ article_id: null, user_id: null, rating: 5 }),
  '/api/knowledge/kb/tag-map': () => ({ article_id: null, tag_id: null }),
  '/api/public/tickets/lookup': () => ({ reference: `HD-SMOKE-${nowTag()}` }),
  '/api/system/audit': () => ({ action: 'smoke:test', object_type: 'video', object_id: null, performed_by: null }),
  '/api/system/inbox/emails': () => ({ subject: `Smoke email ${nowTag()}`, body: 'Hello from smoke tests', received_at: new Date().toISOString() }),
  '/api/system/lookups/issue-categories': () => ({ code: `smoke-${nowTag()}`, name: 'Smoke Issue Category' }),
  '/api/system/lookups/system-category': () => ({ code: `smoke-${nowTag()}`, name: 'Smoke System Category' }),
  '/api/system/lookups/system-modules': () => ({ system_id: null, name: `smoke-module-${nowTag()}`, code: `smoke-${nowTag()}` }),
  '/api/system/lookups/systems': () => ({ code: `smoke-${nowTag()}`, name: 'Smoke System' }),
  '/api/system/roles/permissions': () => ({ permission_name: 'view_reports' }),
};

// Provide simple query strings for GET endpoints that require query params (prevents 400s)
const exampleQueries = {
  '/api/public/tickets/lookup': async (token) => `?reference=HD-SMOKE-${nowTag()}`,
  '/api/knowledge/kb/ratings/summary': async (token) => {
    // resolve an actual kb article id (uuid) to use in the query
    try {
      const id = await resolveIdForPath('/api/knowledge/kb/articles/:id', token);
      return id ? `?article_id=${id}` : '';
    } catch (e) { return '' }
  },
  '/api/public/kb/ratings/summary': async (token) => {
    try {
      const id = await resolveIdForPath('/api/knowledge/kb/articles/:id', token);
      return id ? `?article_id=${id}` : '';
    } catch (e) { return '' }
  },
};

async function login() {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(`Login failed: ${res.status} ${json?.error?.message || ''}`);
  return json.access_token;
}

async function getResources(token) {
  const res = await fetch(`${BASE}/resources`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`Failed to list resources: ${res.status}`);
  return json.resources || json.resources || [];
}

function normalizePath(p) {
  if (!p.startsWith('/api')) return `/api${p}`;
  return p;
}

async function fetchJson(method, url, token, body) {
  const opts = { method, headers: {} };
  if (token) opts.headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(url, opts);
  const text = await res.text();
  let parsed = null;
  try { parsed = JSON.parse(text); } catch {}
  return { status: res.status, ok: res.ok, text, json: parsed };
}

const createdStore = new Map();

async function resolveIdForPath(p, token) {
  const idx = p.indexOf('/:');
  if (idx === -1) return p;
  const parent = p.slice(0, idx);
  // return any previously created id for this parent
  if (createdStore.has(parent) && createdStore.get(parent).length) {
    return String(createdStore.get(parent)[0]);
  }
  const paramMatch = p.match(/:([A-Za-z0-9_]+)/);
  const paramName = paramMatch ? paramMatch[1] : null;

  // Build candidate parents: try the full parent, then progressively strip trailing segments
  const parts = parent.split('/').filter(Boolean);
  const candidates = [];
  for (let i = parts.length; i >= 1; i--) {
    candidates.push('/' + parts.slice(0, i).join('/'));
  }

  // helper to attempt to extract id from GET on a candidate
  async function tryCandidate(candidate) {
    // return any previously created id for this candidate
    if (createdStore.has(candidate) && createdStore.get(candidate).length) return String(createdStore.get(candidate)[0]);
    try {
      const url = `${BASE}${candidate}`;
      const r = await fetchJson('GET', url, token);
      if (r.ok) {
        const id = extractIdFromObj(r.json);
        if (id) return String(id);
      }
    } catch (e) {}
    return null;
  }

  // try candidates for existing resources
  for (const c of candidates) {
    const found = await tryCandidate(c);
    if (found) return found;
  }

  // If paramName maps to a different resource, try resolving that first
  const paramMap = {
    articleId: '/api/knowledge/kb/articles',
    tagId: '/api/knowledge/kb/tags',
    userId: '/api/system/users',
    groupId: '/api/system/lookups/support-groups',
    tierId: '/api/system/lookups/support-tiers',
    categoryId: '/api/knowledge/videos/categories',
    systemId: '/api/system/lookups/systems',
    moduleId: '/api/system/lookups/system-modules',
    videoCategoryId: '/api/knowledge/videos/categories',
    system_category_id: '/api/system/lookups/system-category'
    // intentionally do not map generic 'id' to avoid self-recursion
  };
  if (paramName && paramMap[paramName]) {
    try {
      const mapped = paramMap[paramName];
      // avoid resolving the exact same path which would recurse infinitely
      const candidatePath = mapped + '/:id';
      if (candidatePath !== p) {
        const resolved = await resolveIdForPath(candidatePath, token);
        if (resolved) return resolved;
      }
    } catch (e) {
      // ignore
    }
  }

  function uuidv4() {
    // simple RFC4122 v4 generator
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = (Math.random() * 16) | 0,
        v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  // If all else fails, generate a synthetic id to exercise the endpoint (reduces skips)
  if (paramName) {
    // use UUID-looking default for id-like params
    const synth = uuidv4();
    // store it so future calls reuse it
    const arr = createdStore.get(parent) || [];
    arr.push(synth);
    createdStore.set(parent, arr);
    return synth;
  }

  // If GET didn't find anything, try creating using exampleBodies for the first candidate that has a maker
  for (const c of candidates) {
    const maker = exampleBodies[c];
    if (typeof maker === 'function') {
      const createBody = maker();
      try {
        await fillForeignIds(createBody, token);
        const createUrl = `${BASE}${c.replace(/^\/api/, '')}`;
        const created = await fetchJson('POST', createUrl, token, createBody);
        if (created.ok && created.json) {
          const id = extractIdFromObj(created.json);
          if (id) {
            // store created id for candidate key and return
            const arr = createdStore.get(c) || [];
            arr.push(id);
            createdStore.set(c, arr);
            return String(id);
          }
        }
      } catch (e) {
        // ignore and continue to next candidate
      }
    }
  }

  return null;
}

function extractIdFromObj(obj) {
  if (!obj) return null;
  if (Array.isArray(obj) && obj.length) {
    const f = obj[0];
    if (f && (f.id || f.uuid)) return f.id || f.uuid;
  }
  if (obj.id || obj.uuid) return obj.id || obj.uuid;
  if (obj.items && Array.isArray(obj.items) && obj.items.length) {
    const f = obj.items[0];
    if (f && (f.id || f.uuid)) return f.id || f.uuid;
  }
  return null;
}

async function fillForeignIds(body, token) {
  // mapping field -> candidate endpoint to pull an id from
  const map = {
    article_id: '/api/knowledge/kb/articles',
    ticket_id: '/api/tickets',
    user_id: '/api/system/users',
    group_id: '/api/system/lookups/support-groups',
    tier_id: '/api/system/lookups/support-tiers',
    category_id: '/api/knowledge/videos/categories',
    system_id: '/api/system/lookups/systems',
    module_id: '/api/system/lookups/system-modules',
    tag_id: '/api/knowledge/kb/tags',
    video_category_id: '/api/knowledge/videos/categories',
    system_category_id: '/api/system/lookups/system-category',
    created_by: '/api/system/users',
    uploaded_by: '/api/system/users',
    reporter_user_id: '/api/system/users',
    assigned_agent_id: '/api/system/users',
  };
  for (const k of Object.keys(body || {})) {
    if (body[k] == null && /_id$/.test(k)) {
      const endpoint = map[k];
      if (!endpoint) continue;
      try {
        const url = `${BASE}${endpoint.replace(/^\/api/, '')}`;
        const r = await fetchJson('GET', url, token);
        if (r.ok && Array.isArray(r.json) && r.json.length) {
          const first = r.json[0];
          if (first.id) body[k] = first.id;
          else if (first.uuid) body[k] = first.uuid;
          else if (first[Object.keys(first)[0]]) body[k] = first[Object.keys(first)[0]];
        } else {
          // nothing found — attempt to create one using exampleBodies if available
          const maker = exampleBodies[endpoint];
          if (typeof maker === 'function') {
            const createBody = maker();
            // try to populate nested foreign ids for the create body recursively
            await fillForeignIds(createBody, token);
            try {
              const createUrl = `${BASE}${endpoint.replace(/^\/api/, '')}`;
              const created = await fetchJson('POST', createUrl, token, createBody);
              if (created.ok && created.json) {
                const c = created.json;
                // find id/uuid in response object
                if (c.id) body[k] = c.id;
                else if (c.uuid) body[k] = c.uuid;
                else if (Array.isArray(c) && c.length && (c[0].id || c[0].uuid)) {
                  body[k] = c[0].id || c[0].uuid;
                }
              }
            } catch (e) {
              // ignore create failure, leave null
            }
          }
        }
      } catch (e) {
        // ignore, leave null
      }
    }
  }
}

(async function main(){
  console.log('Smoke test starting... base:', BASE);
  try{
    const token = await login();
    console.log('Logged in, token length:', token?.length || 0);
    const res = await fetch(`${BASE}/resources`, { headers: { Authorization: `Bearer ${token}` } });
    const resources = await res.json();
    const list = resources.resources || resources;
    const results = [];
    for (const r of list) {
      const p = normalizePath(r.path);
      // skip auth endpoints that we test separately
      if (p === '/api/auth/login' || p === '/api/auth/refresh' || p === '/api/auth/logout' || p === '/api/auth/request-password-reset' || p === '/api/auth/reset-password') {
        continue;
      }
      const methods = (r.methods || []).map((m) => m.toUpperCase());
      // basic GET
      if (methods.includes('GET')) {
        let url = `${BASE}${p.replace(/^\/api/, '')}`;
        // apply known example query strings if any
        if (exampleQueries[p]) {
          try { url += await exampleQueries[p](token); } catch {}
        }
        const getRes = await fetchJson('GET', url, token);
        results.push({ path: p, method: 'GET', status: getRes.status });
      }
      // basic POST if public or manageable
      if (methods.includes('POST')) {
        const maker = exampleBodies[p];
        if (typeof maker === 'function') {
          const body = maker();
          await fillForeignIds(body, token);
          const postRes = await fetchJson('POST', `${BASE}${p.replace(/^\/api/, '')}`, token, body);
          results.push({ path: p, method: 'POST', status: postRes.status });
          if (postRes.ok && postRes.json) {
            const id = extractIdFromObj(postRes.json);
            if (id) {
              const arr = createdStore.get(p) || [];
              arr.push(id);
              createdStore.set(p, arr);
            }
          }
        }
      }
    }
    console.log('Smoke test completed. Sample results:', results.slice(0, 10));
  } catch (e) {
    console.error('Smoke test error:', e.message);
    process.exitCode = 1;
  }
})();
