#!/usr/bin/env node
import 'dotenv/config';
import { create } from '../src/utils/crud.js';

async function main(){
  try{
    const row = await create('statuses', { code: 'test-post', name: 'Test Post', is_closed: false, sort: 50 }, ['code','name','is_closed','sort']);
    console.log('Inserted:', row);
  }catch(e){
    console.error('Error:', e.message || e);
    process.exit(1);
  }
  process.exit(0);
}

main();

