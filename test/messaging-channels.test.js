import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import channelsRouter from '../src/modules/system/settings/messaging/channels/router.js';
import pool from '../src/db/pool.js';
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

function makeApp(){
  const app = express();
  app.use(express.json());
  app.use('/api/system/settings/messaging/channels', channelsRouter);
  app.use((err, req, res, _next) => {
    const status = Number(err?.status || 500);
    res.status(status).json({ ok: false, error: { code: err?.code || (status>=500?'INTERNAL_ERROR':'ERROR'), message: err?.message || 'Error' } });
  });
  return app;
}

function authHeader(sub='user-1', roles=['Admin'], perms=['settings.manage']){
  const token = jwt.sign({ sub, roles, perms }, process.env.JWT_SECRET || 'testsecret');
  return { Authorization: `Bearer ${token}` };
}

function installPoolStub(){
  const providers = [];
  const genId = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
  const original = { query: pool.query, connect: pool.connect };

  async function query(sqlRaw, values=[]) {
    const sql = String(sqlRaw).trim();
    // Counts by channel
    if (/^SELECT\s+COUNT\(\*\)::int\s+as\s+total/i.test(sql)) {
      const ch = values[0];
      const total = providers.filter(p => p.channel === ch).length;
      const active = providers.filter(p => p.channel === ch && p.is_active).length;
      return { rows: [ { total, active } ] };
    }
    // Default provider lookup
    if (/^SELECT\s+id,\s+name,\s+is_active,\s+is_default\s+FROM\s+message_providers\s+WHERE\s+channel=\$1\s+AND\s+is_default=TRUE/i.test(sql)) {
      const ch = values[0];
      const p = providers.find(p => p.channel===ch && p.is_default) || null;
      return { rows: p ? [ { id: p.id, name: p.name, is_active: p.is_active, is_default: p.is_default } ] : [] };
    }
    // Update default false by channel
    if (/^UPDATE\s+message_providers\s+SET\s+is_default=FALSE\s+WHERE\s+channel=\$1/i.test(sql)) {
      const ch = values[0]; providers.forEach(p => { if (p.channel===ch) p.is_default = false; });
      return { rowCount: 1, rows: [] };
    }
    // Update default true by id
    if (/^UPDATE\s+message_providers\s+SET\s+is_default=TRUE/i.test(sql)) {
      const id = values[0]; const p = providers.find(p=>p.id===id); if (p) p.is_default = true; return { rowCount: p?1:0, rows: p?[p]:[] };
    }
    // Update active true by id
    if (/^UPDATE\s+message_providers\s+SET\s+is_active=TRUE\s+WHERE\s+id=\$1/i.test(sql)) {
      const id = values[0]; const p = providers.find(p=>p.id===id); if (p) p.is_active = true; return { rowCount: p?1:0, rows: [] };
    }
    // Update active false by channel
    if (/^UPDATE\s+message_providers\s+SET\s+is_active=FALSE\s+WHERE\s+channel=\$1/i.test(sql)) {
      const ch = values[0]; providers.forEach(p => { if (p.channel===ch) p.is_active = false; }); return { rowCount: 1, rows: [] };
    }
    // Select any by channel order by default desc, name asc limit 1
    if (/^SELECT\s+id\s+FROM\s+message_providers\s+WHERE\s+channel=\$1\s+ORDER\s+BY\s+is_default\s+DESC,\s+name\s+ASC\s+LIMIT\s+1/i.test(sql)) {
      const ch = values[0];
      const list = providers.filter(p => p.channel===ch).sort((a,b) => (b.is_default?1:0)-(a.is_default?1:0) || a.name.localeCompare(b.name));
      return { rows: list[0] ? [ { id: list[0].id } ] : [] };
    }
    // Select id, channel by id
    if (/^SELECT\s+id,\s+channel\s+FROM\s+message_providers\s+WHERE\s+id=\$1/i.test(sql)) {
      const id = values[0]; const p = providers.find(p=>p.id===id); return { rows: p ? [ { id: p.id, channel: p.channel } ] : [] };
    }
    // Insert provider
    if (/^INSERT\s+INTO\s+message_providers\s*\(/i.test(sql)) {
      const [name, channel, config, is_active, is_default, description] = values;
      const row = { id: genId(), name, channel, config, is_active: !!is_active, is_default: !!is_default, description: description || null };
      providers.push(row);
      return { rows: [ row ], rowCount: 1 };
    }
    return { rows: [], rowCount: 0 };
  }

  pool.query = query;
  pool.connect = async () => ({ query, release: ()=>{} });

  return () => { pool.query = original.query; pool.connect = original.connect; };
}

describe('Messaging channels options and activation', () => {
  let app; let restore;
  beforeEach(() => { app = makeApp(); restore = installPoolStub(); });
  afterEach(() => { restore && restore(); });

  it('exposes options catalogs', async () => {
    let res = await request(app).get('/api/system/settings/messaging/channels/options/all').set(authHeader());
    assert.equal(res.status, 200);
    assert.ok(res.body.EMAIL);
    res = await request(app).get('/api/system/settings/messaging/channels/EMAIL/options').set(authHeader());
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.types) && res.body.types.length >= 1);
  });

  it('validates provider creation by type and required config', async () => {
    // missing required sms.twilio fields
    let res = await request(app)
      .post('/api/system/settings/messaging/channels/SMS/providers')
      .set(authHeader())
      .send({ name: 'Twilio', provider_type: 'TWILIO', config: { from: '+1' }, is_active: true, is_default: true });
    assert.equal(res.status, 400);

    // valid
    res = await request(app)
      .post('/api/system/settings/messaging/channels/SMS/providers')
      .set(authHeader())
      .send({ name: 'Twilio', provider_type: 'TWILIO', config: { account_sid: 'sid', auth_token: 'tok', from: '+1555' }, is_active: true, is_default: true });
    assert.equal(res.status, 201);
    assert.equal(res.body.channel, 'SMS');
    assert.equal(res.body.is_default, true);
  });

  it('activates and deactivates a channel and sets default when needed', async () => {
    // create two providers for email
    await request(app)
      .post('/api/system/settings/messaging/channels/EMAIL/providers')
      .set(authHeader())
      .send({ name: 'SMTP-A', provider_type: 'SMTP', config: { host: 'h', port: 25 }, is_active: false, is_default: true });
    await request(app)
      .post('/api/system/settings/messaging/channels/EMAIL/providers')
      .set(authHeader())
      .send({ name: 'SMTP-B', provider_type: 'SMTP', config: { host: 'h2', port: 25 }, is_active: false, is_default: false });

    // Activate default
    let res = await request(app)
      .put('/api/system/settings/messaging/channels/EMAIL/activate')
      .set(authHeader())
      .send({});
    assert.equal(res.status, 200);
    assert.equal(res.body.channel, 'EMAIL');
    assert.equal(res.body.is_active, true);
    assert.ok(res.body.default_provider);

    // Deactivate
    res = await request(app)
      .put('/api/system/settings/messaging/channels/EMAIL/deactivate')
      .set(authHeader())
      .send({});
    assert.equal(res.status, 200);
    assert.equal(res.body.is_active, false);

    // Set default explicitly to second provider
    // we need provider id - simulate by activating with provider_id coming from summary default
    // first activate and get default id
    res = await request(app)
      .put('/api/system/settings/messaging/channels/EMAIL/activate')
      .set(authHeader())
      .send({});
    const def = res.body.default_provider;
    assert.ok(def && def.id);

    // Now set default back to same id (no-op)
    res = await request(app)
      .put(`/api/system/settings/messaging/channels/EMAIL/default/${def.id}`)
      .set(authHeader())
      .send({});
    assert.equal(res.status, 200);
    assert.equal(res.body.default_provider.id, def.id);
  });
});

