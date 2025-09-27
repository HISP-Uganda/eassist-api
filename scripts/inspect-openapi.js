#!/usr/bin/env node
import fs from 'fs';
const p = 'src/docs/openapi.json';
if (!fs.existsSync(p)) {
  console.error('openapi.json not found at', p);
  process.exit(2);
}
const doc = JSON.parse(fs.readFileSync(p, 'utf8'));
const paths = Object.keys(doc.paths || {});
const tags = doc.tags || [];
const schemas = Object.keys((doc.components && doc.components.schemas) || {});
console.log(JSON.stringify({
  path_count: paths.length,
  tag_count: tags.length,
  schema_count: schemas.length,
  sample_paths: paths.slice(0, 30),
  sample_tags: tags.slice(0, 30).map(t => t.name)
}, null, 2));
