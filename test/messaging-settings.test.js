import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import webapi from '../src/webapi.js';
import messagesRouter from '../src/modules/messages/index.js';
import pool from '../src/db/pool.js';
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/api', webapi);
  // minimal error handler mirroring server style
  app.use((err, req, res, _next) => {
    const status = Number(err?.status || 500);
    res.status(status).json({ ok: false, error: { code: err?.code || (status>=500?'INTERNAL_ERROR':'ERROR'), message: err?.message || 'Error' } });
  });
  return app;
}

function makeMessagesApp(){
  const app = express();
  app.use(express.json());
  app.use('/api/messages', messagesRouter);
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

// In-memory DB stub state
function installPoolStub() {
  const providers = []; // message_providers
  let otp = { enabled: false, channels: [], code_ttl_sec: 300, max_attempts: 5 };
  let smtpSettings = { host: null };
  const genId = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });

  const original = { query: pool.query, connect: pool.connect };

  async function handleQuery(sqlRaw, values=[]) {
    const sql = String(sqlRaw).trim();
    // SMTP settings
    if (/^SELECT\s+host\s+FROM\s+smtp_settings\s+WHERE\s+id=TRUE/i.test(sql)) {
      return { rows: smtpSettings.host ? [ { host: smtpSettings.host } ] : [] };
    }
    // Providers list/filter
    if (/^SELECT\s+\*\s+FROM\s+message_providers/i.test(sql)) {
      if (/WHERE\s+channel=\$1/i.test(sql)) {
        const ch = values[0];
        return { rows: providers.filter(p => p.channel === ch) };
      }
      if (/WHERE\s+id=\$1/i.test(sql)) {
        const id = values[0];
        return { rows: providers.filter(p => p.id === id) };
      }
      return { rows: providers.slice() };
    }
    // Providers: clear defaults by channel
    if (/^UPDATE\s+message_providers\s+SET\s+is_default=FALSE\s+WHERE\s+channel=\$1/i.test(sql)) {
      const ch = values[0];
      providers.forEach(p => { if (p.channel === ch) p.is_default = false; });
      return { rowCount: 1, rows: [] };
    }
    // Providers: delete by id
    if (/^DELETE\s+FROM\s+message_providers\s+WHERE\s+id=\$1/i.test(sql)) {
      const id = values[0];
      const idx = providers.findIndex(p => p.id === id);
      if (idx >= 0) { providers.splice(idx,1); return { rowCount: 1, rows: [] }; }
      return { rowCount: 0, rows: [] };
    }
    // Providers: insert
    if (/^INSERT\s+INTO\s+message_providers\s*\(/i.test(sql)) {
      const [name, channel, config, is_active, is_default, description] = values;
      const row = { id: genId(), name, channel, config: config || {}, is_active: !!is_active, is_default: !!is_default, description: description || null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
      providers.push(row);
      return { rows: [row], rowCount: 1 };
    }
    // Providers: update by id with dynamic fields
    if (/^UPDATE\s+message_providers\s+SET\s+/i.test(sql) && /WHERE\s+id=\$\d+\s+RETURNING\s+\*/i.test(sql)) {
      const id = values[values.length - 1];
      const row = providers.find(p => p.id === id);
      if (!row) return { rows: [], rowCount: 0 };
      // Parse assignment order to map values
      const setPart = sql.split('SET')[1].split('WHERE')[0];
      const fields = [];
      if (/name=\$/i.test(setPart)) fields.push('name');
      if (/channel=\$/i.test(setPart)) fields.push('channel');
      if (/config=\$/i.test(setPart)) fields.push('config');
      if (/is_active=\$/i.test(setPart)) fields.push('is_active');
      if (/description=\$/i.test(setPart)) fields.push('description');
      if (/is_default=\$/i.test(setPart)) fields.push('is_default');
      // values mapped in order up to last (id)
      const updates = values.slice(0, values.length - 1);
      let vi = 0;
      for (const f of fields) {
        row[f] = f === 'is_default' || f === 'is_active' ? !!updates[vi++] : updates[vi++];
      }
      row.updated_at = new Date().toISOString();
      return { rows: [row], rowCount: 1 };
    }
    // OTP settings select
    if (/^SELECT\s+enabled,\s+channels,\s+code_ttl_sec,\s+max_attempts\s+FROM\s+otp_settings\s+WHERE\s+id=TRUE/i.test(sql)) {
      return { rows: [ { ...otp } ] };
    }
    // OTP settings upsert
    if (/^INSERT\s+INTO\s+otp_settings/i.test(sql)) {
      const [enabled, channelsJson, ttl, maxA] = values;
      const channels = Array.isArray(channelsJson) ? channelsJson : (typeof channelsJson === 'string' ? JSON.parse(channelsJson) : []);
      otp = { enabled: !!enabled, channels, code_ttl_sec: Number(ttl), max_attempts: Number(maxA) };
      return { rows: [ { ...otp } ] };
    }
    // OTP settings dependencies: SMS default
    if (/^SELECT\s+1\s+FROM\s+message_providers\s+WHERE\s+channel='SMS'\s+AND\s+is_active=TRUE\s+AND\s+is_default=TRUE/i.test(sql)) {
      const has = providers.some(p => p.channel==='SMS' && p.is_active && p.is_default);
      return { rows: has ? [ { 1: 1 } ] : [] };
    }
    // OTP settings dependencies: EMAIL default
    if (/^SELECT\s+1\s+FROM\s+message_providers\s+WHERE\s+channel='EMAIL'\s+AND\s+is_active=TRUE\s+AND\s+is_default=TRUE/i.test(sql)) {
      const has = providers.some(p => p.channel==='EMAIL' && p.is_active && p.is_default);
      return { rows: has ? [ { 1: 1 } ] : [] };
    }

    // Default: empty
    return { rows: [], rowCount: 0 };
  }

  pool.query = handleQuery;
  pool.connect = async () => ({ query: handleQuery, release: ()=>{} });

  return () => { pool.query = original.query; pool.connect = original.connect; };
}

describe('System settings: messaging providers and OTP', () => {
  let app;
  let restore;
  beforeEach(() => {
    app = makeApp();
    restore = installPoolStub();
  });
  afterEach(() => { restore && restore(); });

  it('creates providers and enforces single default per channel', async () => {
    // Create default SMS provider
    const res1 = await request(app)
      .post('/api/system/settings/messaging/providers')
      .set(authHeader())
      .send({ name: 'Twilio', channel: 'SMS', is_active: true, is_default: true, config: { from: '+15551234567' } });
    assert.equal(res1.status, 201);
    assert.equal(res1.body.channel, 'SMS');
    assert.equal(res1.body.is_default, true);

    // Create another default SMS provider; should clear previous
    const res2 = await request(app)
      .post('/api/system/settings/messaging/providers')
      .set(authHeader())
      .send({ name: 'OtherSMS', channel: 'SMS', is_active: true, is_default: true });
    assert.equal(res2.status, 201);
    assert.equal(res2.body.is_default, true);

    // List by channel
    const resList = await request(app)
      .get('/api/system/settings/messaging/providers?channel=SMS')
      .set(authHeader());
    assert.equal(resList.status, 200);
    assert.ok(Array.isArray(resList.body));
    const defaults = resList.body.filter(p => p.is_default);
    assert.equal(defaults.length, 1);
    assert.equal(defaults[0].name, 'OtherSMS');
  });

  it('validates OTP enablement requirements', async () => {
    // Try enabling SMS without default provider -> 400
    const badSms = await request(app)
      .put('/api/system/settings/messaging/otp')
      .set(authHeader())
      .send({ enabled: true, channels: ['SMS'], code_ttl_sec: 300, max_attempts: 5 });
    assert.equal(badSms.status, 400);

    // Create default SMS provider then enable -> 200
    await request(app)
      .post('/api/system/settings/messaging/providers')
      .set(authHeader())
      .send({ name: 'Twilio', channel: 'SMS', is_active: true, is_default: true });

    const okSms = await request(app)
      .put('/api/system/settings/messaging/otp')
      .set(authHeader())
      .send({ enabled: true, channels: ['SMS'], code_ttl_sec: 120, max_attempts: 3 });
    assert.equal(okSms.status, 200);
    assert.deepEqual(okSms.body.channels, ['SMS']);
    assert.equal(okSms.body.code_ttl_sec, 120);

    // EMAIL without SMTP and default EMAIL provider -> 400
    const badEmail = await request(app)
      .put('/api/system/settings/messaging/otp')
      .set(authHeader())
      .send({ enabled: true, channels: ['EMAIL'] });
    assert.equal(badEmail.status, 400);

    // Simulate SMTP configured by directly stubbing smtpSettings via a special request
    // We can't change stub from here; instead, create a default EMAIL provider (also allowed)
    const okProv = await request(app)
      .post('/api/system/settings/messaging/providers')
      .set(authHeader())
      .send({ name: 'SMTP Default', channel: 'EMAIL', is_active: true, is_default: true });
    assert.equal(okProv.status, 201);

    const okEmail = await request(app)
      .put('/api/system/settings/messaging/otp')
      .set(authHeader())
      .send({ enabled: true, channels: ['EMAIL'] });
    assert.equal(okEmail.status, 200);
    assert.deepEqual(okEmail.body.channels, ['EMAIL']);
  });
});

describe('Messages submodule channels', () => {
  let app;
  let restore;
  beforeEach(() => {
    app = makeMessagesApp();
    // messages submodule may write to messages table; stub minimal insertion
    const original = pool.query;
    pool.query = async (sql, values=[]) => {
      const s = String(sql).trim();
      if (s.startsWith('INSERT INTO messages')) {
        return { rows: [ { id: 'm1', channel: values[0], to_phone: values[1], body: values[2] } ] };
      }
      return { rows: [] };
    };
    restore = () => { pool.query = original; };
  });
  afterEach(() => { restore && restore(); });

  it('exposes /api/messages/sms endpoint and send', async () => {
    // ping
    let res = await request(app).get('/api/messages/sms').set(authHeader());
    assert.equal(res.status, 200);
    assert.equal(res.body.channel, 'SMS');

    // send
    res = await request(app)
      .post('/api/messages/sms/send')
      .set(authHeader('user-chan', ['Admin'], ['system.messages.send']))
      .send({ to_phone: '+15551234567', body: 'hi' });
    assert.equal(res.status, 201);
    assert.equal(res.body.channel, 'SMS');
  });
});
