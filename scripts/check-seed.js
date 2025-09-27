#!/usr/bin/env node
import pool from '../src/db/pool.js';
(async function(){
  try{
    const q = async (sql) => (await pool.query(sql)).rows[0]?.c ?? null;
    const results = {
      users: await q("SELECT count(*)::int AS c FROM users"),
      tickets: await q("SELECT count(*)::int AS c FROM tickets"),
      kb_articles: await q("SELECT count(*)::int AS c FROM kb_articles"),
      faqs: await q("SELECT count(*)::int AS c FROM faqs"),
      videos: await q("SELECT count(*)::int AS c FROM videos"),
      kb_ratings: await q("SELECT count(*)::int AS c FROM kb_ratings"),
      api_keys_active: await q("SELECT count(*)::int AS c FROM api_keys WHERE is_active = TRUE"),
      ticket_notes: await q("SELECT count(*)::int AS c FROM ticket_notes"),
      ticket_events: await q("SELECT count(*)::int AS c FROM ticket_events"),
    };
    console.log(JSON.stringify(results, null, 2));
  }catch(e){
    console.error('ERROR', e.message);
    process.exit(1);
  }finally{
    await pool.end();
  }
})();

