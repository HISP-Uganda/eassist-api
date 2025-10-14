import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import messagesRouter from '../src/modules/messages/index.js';
import pool from '../src/db/pool.js';
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/messages', messagesRouter);
  // minimal error handler mirroring server style
  app.use((err, req, res, _next) => {
    const status = Number(err?.status || 500);
    res.status(status).json({ ok: false, error: { code: err?.code || (status>=500?'INTERNAL_ERROR':'ERROR'), message: err?.message || 'Error' } });
  });
  return app;
}

function authHeader(sub='user-1', roles=['Agent'], perms=[]) {
  const token = jwt.sign({ sub, roles, perms }, process.env.JWT_SECRET || 'testsecret');
  return { Authorization: `Bearer ${token}` };
}

// Simple in-memory DB stubs
function installPoolStub() {
  const messages = [];
  const attachments = [];
  const genId = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
  const original = pool.query;
  pool.query = async (text, values=[]) => {
    const sql = String(text).trim();
    if (sql.startsWith('INSERT INTO messages')) {
      const row = {
        id: genId(),
        channel: values[0],
        to_user_id: values[1],
        subject: values[2],
        body: values[3],
        body_html: values[4],
        template_code: values[5],
        status: values[6],
        scheduled_at: values[7],
        created_by: values[8],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      messages.push(row);
      return { rows: [row], rowCount: 1 };
    }
    if (sql.startsWith('INSERT INTO message_attachments')) {
      const a = {
        id: genId(),
        message_id: values[0],
        file_url: values[1],
        file_name: values[2],
        content_type: values[3],
        size_bytes: values[4],
        uploaded_by: values[5],
        uploaded_at: new Date().toISOString(),
      };
      attachments.push(a);
      return { rows: [], rowCount: 1 };
    }
    // Default: empty result
    return { rows: [], rowCount: 0 };
  };
  return () => { pool.query = original; };
}

describe('Messages module', () => {
  let app;
  let restore;
  beforeEach(() => {
    app = makeApp();
    restore = installPoolStub();
  });
  afterEach(() => {
    restore && restore();
  });

  it('rejects send without proper permission', async () => {
    const res = await request(app)
      .post('/api/messages/send')
      .set(authHeader('user-2', ['EndUser'], []))
      .send({ to_user_id: '30000000-0000-0000-0000-000000000001', body: 'hi' });
    assert.equal(res.status, 403);
  });

  it('allows sending in-app message with system.messages.send permission', async () => {
    const res = await request(app)
      .post('/api/messages/send')
      .set(authHeader('user-3', ['Agent'], ['system.messages.send']))
      .send({ to_user_id: '30000000-0000-0000-0000-000000000002', subject: 'Hello', body: 'Welcome', attachments: [ { file_url: 'https://x/y.pdf', file_name: 'y.pdf' } ] });
    assert.equal(res.status, 201);
    assert.ok(res.body && res.body.id);
    assert.equal(res.body.channel, 'IN_APP');
    assert.equal(res.body.to_user_id, '30000000-0000-0000-0000-000000000002');
  });

  it('enforces per-minute rate limiting', async () => {
    const hdrs = authHeader('user-4', ['Agent'], ['system.messages.send']);
    const first = await request(app)
      .post('/api/messages/send')
      .set(hdrs)
      .send({ to_user_id: '30000000-0000-0000-0000-000000000003', body: 'first' });
    assert.equal(first.status, 201);
    const second = await request(app)
      .post('/api/messages/send')
      .set(hdrs)
      .send({ to_user_id: '30000000-0000-0000-0000-000000000003', body: 'second' });
    assert.ok([429,400].includes(second.status));
  });

  it('exposes SSE stream endpoint with correct headers', async () => {
    const res = await request(app)
      .get('/api/messages/stream')
      .set(authHeader('user-5', ['Agent']))
      .buffer(true)
      .parse((res, cb)=>{
        res.setEncoding('utf8');
        let settled = false;
        const finalize = () => { if (!settled) { settled = true; try { res.destroy(); } catch {} cb(null, ''); } };
        res.once('data', () => finalize());
        // fallback in case no data promptly
        setTimeout(finalize, 100);
      });
    assert.equal(res.status, 200);
    assert.ok(String(res.headers['content-type']||'').includes('text/event-stream'));
  });
});
