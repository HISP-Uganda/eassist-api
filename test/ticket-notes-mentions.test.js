// filepath: /Users/stephocay/projects/eassist/eassist-api/test/ticket-notes-mentions.test.js
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import ticketsRouter from '../src/modules/tickets/index.js';
import pool from '../src/db/pool.js';
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { requireAuth } from '../src/middleware/auth.js';

function makeApp(){
  const app = express();
  app.use(express.json());
  // Ensure authentication is applied so req.user is available to permission guards
  app.use('/api/tickets', requireAuth, ticketsRouter);
  app.use((err, req, res, _next) => {
    const status = Number(err?.status || 500);
    res.status(status).json({ ok:false, error:{ code: err?.code || (status>=500?'INTERNAL_ERROR':'ERROR'), message: err?.message || 'Error' }});
  });
  return app;
}

function authHeader(sub='uAuthor', roles=['Agent'], perms=['tickets.notes.add']){
  const token = jwt.sign({ sub, roles, perms, email: 'author@example.com', full_name: 'Author User' }, process.env.JWT_SECRET || 'testsecret');
  return { Authorization: `Bearer ${token}` };
}

function installPoolStub(){
  const original = { query: pool.query, connect: pool.connect };

  // In-memory tables
  const users = [
    { id: 'uAuthor', email: 'author@example.com', phone: null, username: 'author' },
    { id: 'u1', email: 'user@example.com', phone: null, username: 'user1' },
    { id: 'u2', email: 'agent1@example.com', phone: null, username: 'agent1' },
  ];
  const tickets = [ { id: 't1', ticket_key: 'HD-2025-0001', title: 'Sample Ticket' } ];
  const notes = [];
  const messages = [];

  const genId = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random()*16)|0; const v = c==='x'? r : (r&0x3)|0x8; return v.toString(16);
  });

  async function handleQuery(sqlRaw, values=[]) {
    const sql = String(sqlRaw).trim();

    // Schema check for username column
    if (/FROM\s+information_schema\.columns/i.test(sql) && /table_name='users'/.test(sql) && /column_name='username'/.test(sql)) {
      return { rows: [ { '1': 1 } ] };
    }

    // INSERT ticket_notes
    if (/^INSERT\s+INTO\s+ticket_notes/i.test(sql)) {
      // Expect order: ticket_id, user_id, body, is_internal
      const [ticket_id, user_id, body, is_internal] = values;
      const row = { id: genId(), ticket_id, user_id, body, is_internal: !!is_internal, created_at: new Date().toISOString() };
      notes.push(row);
      return { rows: [row], rowCount: 1 };
    }

    // Resolve mentioned users by email IN (...)
    if (/FROM\s+users\s+WHERE\s+lower\(email\)\s+IN\s*\(/i.test(sql)) {
      const emails = values.map(v => String(v).toLowerCase());
      const rows = users.filter(u => emails.includes(String(u.email).toLowerCase())).map(u => ({ id: u.id, email: u.email }));
      return { rows };
    }

    // Resolve mentioned users by username IN (...)
    if (/FROM\s+users\s+WHERE\s+lower\(username\)\s+IN\s*\(/i.test(sql)) {
      const handles = values.map(v => String(v).toLowerCase());
      const rows = users.filter(u => handles.includes(String(u.username||'').toLowerCase())).map(u => ({ id: u.id, username: u.username }));
      return { rows };
    }

    // resolveUserContact by id
    if (/SELECT\s+email,\s+phone\s+FROM\s+users\s+WHERE\s+id=\$1/i.test(sql)) {
      const u = users.find(x => x.id === values[0]);
      return { rows: u ? [ { email: u.email, phone: u.phone } ] : [] };
    }

    // Ticket context select
    if (/FROM\s+tickets\s+WHERE\s+id=\$1/i.test(sql)) {
      const t = tickets.find(x => x.id === values[0]);
      return { rows: t ? [t] : [] };
    }

    // INSERT INTO messages (queueMessage)
    if (/^INSERT\s+INTO\s+messages\b/i.test(sql)) {
      // For this test, map minimal fields by position per queueMessage's vals order
      // channel, to_user_id, to_email, to_phone, to_handle, subject, body, body_html, template_code, status, scheduled_at, created_by, provider
      const row = {
        id: genId(),
        channel: values[0],
        to_user_id: values[1],
        to_email: values[2],
        to_phone: values[3],
        to_handle: values[4],
        subject: values[5],
        body: values[6],
        body_html: values[7],
        template_code: values[8],
        status: values[9],
        scheduled_at: values[10],
        created_by: values[11],
        provider: values[12],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      messages.push(row);
      return { rows: [row], rowCount: 1 };
    }

    // SELECT default provider for channels (not used for IN_APP)
    if (/FROM\s+message_providers\s+WHERE\s+channel=\$1/i.test(sql)) {
      return { rows: [] };
    }

    // Default fallback
    return { rows: [], rowCount: 0 };
  }

  pool.query = handleQuery;
  pool.connect = async () => ({ query: handleQuery, release: ()=>{} });

  return { restore: () => { pool.query = original.query; pool.connect = original.connect; }, state: { users, tickets, notes, messages } };
}

describe('Ticket notes: @mentions', () => {
  let app; let stub;
  beforeEach(() => { app = makeApp(); stub = installPoolStub(); });
  afterEach(() => { stub?.restore && stub.restore(); });

  it('queues IN_APP messages for @email and @username mentions', async () => {
    const res = await request(app)
      .post('/api/tickets/notes')
      .set(authHeader('uAuthor', ['Agent'], ['tickets.notes.add']))
      .send({ ticket_id: 't1', user_id: 'uAuthor', body: 'Hello @user@example.com and @agent1', is_internal: false });
    assert.equal(res.status, 201);
    // Validate two messages queued
    const msgs = stub.state.messages;
    assert.equal(msgs.length, 2);
    const toIds = new Set(msgs.map(m => m.to_user_id));
    assert.ok(toIds.has('u1'));
    assert.ok(toIds.has('u2'));
    // Ensure channel and template
    msgs.forEach(m => {
      assert.equal(m.channel, 'IN_APP');
      assert.equal(m.template_code, 'TICKET_MENTION');
    });
  });

  it('filters out self-mentions when note.user_id is null using req.user.sub', async () => {
    const res = await request(app)
      .post('/api/tickets/notes')
      .set(authHeader('uAuthor', ['Agent'], ['tickets.notes.add']))
      .send({ ticket_id: 't1', user_id: null, body: 'Ping @author@example.com and @agent1', is_internal: false });
    assert.equal(res.status, 201);
    const msgs = stub.state.messages;
    // Only one message for agent1 (u2)
    assert.equal(msgs.length, 1);
    assert.equal(msgs[0].to_user_id, 'u2');
  });
});
