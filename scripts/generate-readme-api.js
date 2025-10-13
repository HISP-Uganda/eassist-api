#!/usr/bin/env node
/*
  Generate a comprehensive API Reference section in README.md from src/docs/openapi.json
  - Groups endpoints by tag
  - Lists method, path, summary, auth/public
  - Lists parameters with name/in/type/required/description
  - For POST/PUT/PATCH: expand requestBody schema to required fields and properties
  - Shows success response schema and example cURL
  - Writes between markers: <!-- API_REFERENCE_START --> ... <!-- API_REFERENCE_END -->
*/
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const OPENAPI_PATH = path.resolve(ROOT, 'src/docs/openapi.json');
const README_PATH = path.resolve(ROOT, 'README.md');
const START_MARK = '<!-- API_REFERENCE_START -->';
const END_MARK = '<!-- API_REFERENCE_END -->';

function loadJson(p) {
  const s = fs.readFileSync(p, 'utf8');
  return JSON.parse(s);
}

function code(s) { return '`' + s + '`'; }
function bullet(s, level = 0) { return `${'  '.repeat(level)}- ${s}`; }

function deref(doc, schema) {
  if (!schema) return null;
  if (schema.$ref) {
    const ref = schema.$ref.replace(/^#\//, '').split('/');
    let cur = doc;
    for (const k of ref) cur = cur?.[k];
    return cur || schema; // fallback
  }
  return schema;
}

function typeOfSchema(schema) {
  if (!schema) return 'object';
  if (schema.$ref) return schema.$ref.split('/').pop();
  if (schema.type === 'array') {
    const t = typeOfSchema(schema.items);
    return `array<${t}>`;
  }
  return schema.type || 'object';
}

function renderParams(params = []) {
  if (!params.length) return [];
  const lines = [];
  lines.push(bullet('Parameters:'));
  for (const p of params) {
    const t = p.schema?.type || (p.schema?.$ref ? p.schema.$ref.split('/').pop() : 'object');
    const fmt = p.schema?.format ? ` (${p.schema.format})` : '';
    const req = p.required ? ' (required)' : '';
    const desc = p.description ? ` — ${p.description}` : '';
    const enumTxt = Array.isArray(p.schema?.enum) ? ` enum: ${p.schema.enum.join('|')}` : '';
    lines.push(bullet(`${code(p.name)} in ${code(p.in)}: ${t}${fmt}${req}${enumTxt}${desc}`, 1));
  }
  return lines;
}

function listRequired(schema) {
  return Array.isArray(schema?.required) ? schema.required : [];
}

function renderProps(schema, doc, indentLevel = 1) {
  const s = deref(doc, schema) || {};
  if (s.type === 'array' && s.items) {
    const itemSchema = deref(doc, s.items) || {};
    const lines = [];
    lines.push(bullet(`items: ${typeOfSchema(itemSchema)}`, indentLevel));
    // If array items are objects with properties, list them too
    if ((itemSchema.type === 'object' || itemSchema.properties) && itemSchema.properties) {
      const req = new Set(listRequired(itemSchema));
      for (const [name, prop] of Object.entries(itemSchema.properties)) {
        const d = deref(doc, prop) || {};
        const type = typeOfSchema(d);
        const fmt = d.format ? ` (${d.format})` : '';
        const en = Array.isArray(d.enum) ? ` enum: ${d.enum.join('|')}` : '';
        const required = req.has(name) ? ' (required)' : '';
        const desc = d.description ? ` — ${d.description}` : '';
        lines.push(bullet(`${code(name)}: ${type}${fmt}${required}${en}${desc}`, indentLevel + 1));
      }
    }
    return lines;
  }
  const props = s.properties || {};
  const req = new Set(listRequired(s));
  const lines = [];
  for (const [name, prop] of Object.entries(props)) {
    const d = deref(doc, prop) || {};
    const type = typeOfSchema(d);
    const fmt = d.format ? ` (${d.format})` : '';
    const en = Array.isArray(d.enum) ? ` enum: ${d.enum.join('|')}` : '';
    const required = req.has(name) ? ' (required)' : '';
    const desc = d.description ? ` — ${d.description}` : '';
    lines.push(bullet(`${code(name)}: ${type}${fmt}${required}${en}${desc}`, indentLevel));
  }
  return lines;
}

function pickSuccessResponse(op) {
  const res = op.responses || {};
  const keys = Object.keys(res).sort();
  const preferred = ['200','201'];
  let key = preferred.find(k => res[k]);
  if (!key) key = keys.find(k => /^2\d\d$/.test(k));
  if (!key) return null;
  const entry = res[key];
  const json = entry?.content?.['application/json'];
  if (!json) return { code: key, schema: null, examples: null };
  return { code: key, schema: json.schema || null, examples: json.examples || null };
}

function firstCurlExample(examples) {
  if (!examples) return null;
  const order = ['bearerCurl','publicCurl','basicCurl','apiKeyCurl'];
  for (const k of order) { if (examples[k]?.value) return examples[k].value; }
  const firstKey = Object.keys(examples)[0];
  return firstKey ? examples[firstKey].value || null : null;
}

function toMd(doc, op, pathStr, method) {
  const lines = [];
  const authRequired = Array.isArray(op.security) ? op.security.length > 0 : true;
  const params = (op.parameters || []);
  const reqBodySchema = op.requestBody?.content?.['application/json']?.schema || null;
  const success = pickSuccessResponse(op);
  const curl = firstCurlExample(success?.examples);

  lines.push(`- ${code(method.toUpperCase())} ${code(pathStr)} — ${op.summary || ''}`);
  lines.push(bullet(`Auth: ${authRequired ? 'Required' : 'Public'}`));
  if (op.description) {
    lines.push(bullet(`Description: ${op.description}`));
  }

  // Parameters detail
  const paramLines = renderParams(params);
  if (paramLines.length) lines.push(...paramLines);

  // Request body detail for write methods
  if (["post","put","patch"].includes(method)) {
    if (reqBodySchema) {
      const d = deref(doc, reqBodySchema);
      lines.push(bullet(`Request body: ${typeOfSchema(reqBodySchema)}`));
      const req = listRequired(d);
      if (req.length) lines.push(bullet(`Required fields: ${req.map(code).join(', ')}`, 1));
      const propLines = renderProps(d, doc, 1);
      if (propLines.length) {
        lines.push(bullet('Properties:', 1));
        lines.push(...propLines);
      }
    } else if (op.requestBody && op.requestBody.required === false) {
      lines.push(bullet('Request body: none'));
    }
  }

  // Success response
  if (success) {
    lines.push(bullet(`Success: HTTP ${success.code} — ${typeOfSchema(success.schema) || 'object'}`));
  }

  if (curl) {
    lines.push(bullet('Example:'));
    lines.push('');
    lines.push('```bash');
    lines.push(curl);
    lines.push('```');
  }
  return lines.join('\n');
}

function buildReferenceMd(doc) {
  const { paths = {}, info = {} } = doc;
  const byTag = new Map();
  for (const [p, methods] of Object.entries(paths)) {
    for (const [m, op] of Object.entries(methods)) {
      const tag = (op.tags && op.tags[0]) || 'misc';
      if (!byTag.has(tag)) byTag.set(tag, []);
      byTag.get(tag).push({ path: p, method: m, op });
    }
  }
  const sortedTags = Array.from(byTag.keys()).sort();
  for (const tag of sortedTags) {
    byTag.get(tag).sort((a, b) => a.path.localeCompare(b.path) || a.method.localeCompare(b.method));
  }

  const md = [];
  md.push('# API Reference');
  md.push('');
  if (info?.description) {
    md.push(info.description.split('\n')[0]);
    md.push('');
  }
  md.push('This section is generated from the OpenAPI spec (src/docs/openapi.json).');
  md.push('');
  // Usage notes section to explain nested GET and shaping controls
  md.push('## Usage notes');
  md.push('');
  md.push('- All GET endpoints return enriched, nested objects by default (related resources are joined for you).');
  md.push('- Shape the response with optional query params:');
  md.push('  - `fields`: comma-separated list of fields to include. Supports dot paths, e.g., `fields=ticket_key,title,reporter_user.email,status.name`.');
  md.push('  - `expand`: comma-separated nested relations to expand, e.g., `expand=assigned_agent,reporter_user,roles,roles.permissions`.');
  md.push('  - `select`: bracket syntax for advanced shaping, e.g., `select=tickets[id,title,reporter_user[id,email],assigned_agent[id,full_name],attachments[id,file_name]]`.');
  md.push('- Pagination params (where applicable): `page`, `pageSize`. Search filter: `q`.');
  md.push('- Write endpoints (POST/PUT) support nested bodies where documented (e.g., tickets.notes/attachments, users.roles/tier/support_groups, roles.permissions).');
  md.push('');
  md.push('Tags index:');
  for (const tag of sortedTags) {
    const anchor = tag.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    md.push(`- [${tag}](#${anchor})`);
  }
  md.push('');

  for (const tag of sortedTags) {
    const anchor = tag.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    md.push(`## ${tag}`);
    md.push('');
    for (const { path: p, method, op } of byTag.get(tag)) {
      md.push(toMd(doc, op, p, method));
      md.push('');
    }
  }
  return md.join('\n');
}

function updateReadme(readme, section) {
  if (readme.includes(START_MARK) && readme.includes(END_MARK)) {
    return readme.replace(new RegExp(`${START_MARK}[\s\S]*?${END_MARK}`), `${START_MARK}\n\n${section}\n\n${END_MARK}`);
  }
  return readme.trimEnd() + `\n\n${START_MARK}\n\n${section}\n\n${END_MARK}\n`;
}

function main() {
  if (!fs.existsSync(OPENAPI_PATH)) {
    console.error('OpenAPI file not found at', OPENAPI_PATH);
    process.exit(1);
  }
  const doc = loadJson(OPENAPI_PATH);
  const section = buildReferenceMd(doc);
  const readme = fs.readFileSync(README_PATH, 'utf8');
  const next = updateReadme(readme, section);
  fs.writeFileSync(README_PATH, next, 'utf8');
  console.log('README.md API Reference section updated.');
}

main();
