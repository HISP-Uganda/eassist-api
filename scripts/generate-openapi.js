#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import express from 'express';
import dotenv from 'dotenv';
import webapi from '../src/webapi.js';
import buildOpenApi from '../src/docs/openapi.js';

dotenv.config();

const app = express();
// Mount the same API routes used by the server so the generator sees the endpoints
app.use('/api', webapi);

async function main() {
  try {
    const doc = buildOpenApi(app);
    const outDir = path.resolve('src/docs');
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    const outPath = path.join(outDir, 'openapi.json');
    fs.writeFileSync(outPath, JSON.stringify(doc, null, 2), 'utf8');
    console.log('OpenAPI document generated at', outPath);
    process.exit(0);
  } catch (e) {
    console.error('Failed to generate OpenAPI document:', e);
    process.exit(1);
  }
}

main();

