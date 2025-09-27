import 'dotenv/config';
import { Client } from 'pg';
import bcrypt from 'bcryptjs';

(async function(){
  try{
    const c = new Client({ connectionString: process.env.DATABASE_URL });
    await c.connect();
    const res = await c.query('SELECT id,email,is_superuser,is_active,password_hash FROM users WHERE email=$1 LIMIT 1', [process.env.ADMIN_EMAIL]);
    if (!res.rows.length) {
      console.log('NO_USER');
      await c.end();
      return;
    }
    const u = res.rows[0];
    console.log('USER:', { id: u.id, email: u.email, is_superuser: u.is_superuser, is_active: u.is_active, has_password: !!u.password_hash });
    if (u.password_hash) {
      const ok = await bcrypt.compare(process.env.ADMIN_PASSWORD || '', u.password_hash);
      console.log('PASSWORD_MATCH:', ok);
    }
    await c.end();
  } catch (e) {
    console.error('ERR', e.message);
    process.exit(1);
  }
})();

