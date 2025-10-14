import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import publicRouter from '../src/modules/public/index.js';
import pool from '../src/db/pool.js';
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

function makeApp(){
  const app = express();
  app.use(express.json());
  app.use('/api/public', publicRouter);
  app.use((err, req, res, _next) => {
    const status = Number(err?.status || 500);
    res.status(status).json({ ok: false, error: { code: err?.code || (status>=500?'INTERNAL_ERROR':'ERROR'), message: err?.message || 'Error' } });
  });
  return app;
}

function authHeader(sub='user-rate-1'){
  const token = jwt.sign({ sub }, process.env.JWT_SECRET || 'testsecret');
  return { Authorization: `Bearer ${token}` };
}

function installPoolStub(){
  const faqRatings = new Map(); // key: faq_id|user_id
  const kbRatings = new Map();
  const videoRatings = new Map();
  const genId = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c=>{
    const r=(Math.random()*16)|0; const v=c==='x'?r:(r&0x3)|0x8; return v.toString(16);
  });
  const original = pool.query;
  pool.query = async (sql, values=[]) => {
    const s = String(sql).trim();
    if (s.startsWith('INSERT INTO faq_ratings')) {
      const [faq,user,rating] = values; const key = `${faq}|${user}`;
      const row = { id: faqRatings.get(key)?.id || genId(), faq_id: faq, user_id: user, rating, created_at: new Date().toISOString() };
      faqRatings.set(key,row); return { rows:[row] };
    }
    if (s.startsWith('SELECT avg(rating)') && s.includes('FROM faq_ratings')) {
      const faq = values[0];
      const rows = Array.from(faqRatings.values()).filter(r=>r.faq_id===faq);
      if (!rows.length) return { rows:[{ avg:null, count:0 }] };
      const avg = (rows.reduce((a,b)=>a+b.rating,0)/rows.length).toFixed(2);
      return { rows:[{ avg, count: rows.length }] };
    }
    if (s.startsWith('INSERT INTO kb_ratings')) {
      const [art,user,rating] = values; const key = `${art}|${user}`;
      const row = { id: kbRatings.get(key)?.id || genId(), article_id: art, user_id: user, rating, created_at: new Date().toISOString() };
      kbRatings.set(key,row); return { rows:[row] };
    }
    if (s.startsWith('SELECT avg(rating)') && s.includes('FROM kb_ratings')) {
      const art = values[0];
      const rows = Array.from(kbRatings.values()).filter(r=>r.article_id===art);
      if (!rows.length) return { rows:[{ avg:null, count:0 }] };
      const avg = (rows.reduce((a,b)=>a+b.rating,0)/rows.length).toFixed(2);
      return { rows:[{ avg, count: rows.length }] };
    }
    if (s.startsWith('INSERT INTO video_ratings')) {
      const [vid,user,rating] = values; const key = `${vid}|${user}`;
      const row = { id: videoRatings.get(key)?.id || genId(), video_id: vid, user_id: user, rating, created_at: new Date().toISOString() };
      videoRatings.set(key,row); return { rows:[row] };
    }
    if (s.startsWith('SELECT avg(rating)') && s.includes('FROM video_ratings')) {
      const vid = values[0];
      const rows = Array.from(videoRatings.values()).filter(r=>r.video_id===vid);
      if (!rows.length) return { rows:[{ avg:null, count:0 }] };
      const avg = (rows.reduce((a,b)=>a+b.rating,0)/rows.length).toFixed(2);
      return { rows:[{ avg, count: rows.length }] };
    }
    // Public listing queries not needed here; return defaults
    if (s.startsWith('SELECT count(*)::int c FROM faqs')) return { rows:[{ c:0 }] };
    if (s.startsWith('SELECT id,title,body')) return { rows:[] };
    return { rows:[] };
  };
  return ()=>{ pool.query = original; };
}

describe('Public ratings endpoints', () => {
  let app; let restore;
  beforeEach(()=>{ app = makeApp(); restore = installPoolStub(); });
  afterEach(()=>{ restore && restore(); });

  it('upserts FAQ rating and returns summary', async () => {
    const faqId = '00000000-0000-0000-0000-000000000001';
    const h = authHeader('user-1');
    let res = await request(app).post(`/api/public/faqs/${faqId}/rate`).set(h).send({ rating: 4 });
    assert.equal(res.status, 201);
    assert.equal(res.body.summary.count, 1);
    assert.equal(String(res.body.summary.avg), '4.00');
    // update same user rating
    res = await request(app).post(`/api/public/faqs/${faqId}/rate`).set(h).send({ rating: 2 });
    assert.equal(res.status, 201);
    assert.equal(res.body.summary.count, 1);
    assert.equal(String(res.body.summary.avg), '2.00');
  });

  it('rejects invalid rating value', async () => {
    const faqId = '00000000-0000-0000-0000-000000000002';
    const res = await request(app).post(`/api/public/faqs/${faqId}/rate`).send({ rating: 8 });
    assert.equal(res.status, 400);
  });

  it('handles video rating path', async () => {
    const videoId = '20000000-0000-0000-0000-000000000001';
    const res = await request(app).post(`/api/public/videos/${videoId}/rate`).set(authHeader('user-v1')).send({ rating: 5 });
    assert.equal(res.status, 201);
    assert.equal(res.body.summary.count, 1);
  });
});

