import 'dotenv/config';
import { Client } from 'pg';
import bcrypt from 'bcryptjs';

function requireEnv(name) {
  const v = process.env[name];
  if (!v || !String(v).trim()) throw new Error(`${name} is required`);
  return String(v).trim();
}

(async function main(){
  try{
    const ADMIN_EMAIL = requireEnv('ADMIN_EMAIL');
    const ADMIN_PASSWORD = requireEnv('ADMIN_PASSWORD');
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();

    const q = await client.query('SELECT id FROM public.users WHERE lower(email)=lower($1) LIMIT 1', [ADMIN_EMAIL]);
    const hash = await bcrypt.hash(ADMIN_PASSWORD, 12);
    if (q.rows.length) {
      const id = q.rows[0].id;
      await client.query('UPDATE public.users SET password_hash=$1, is_superuser = true, updated_at = now() WHERE id = $2', [hash, id]);
      console.log('Updated password for existing admin:', ADMIN_EMAIL);
    } else {
      const ins = await client.query('INSERT INTO public.users (id, email, password_hash, is_active, is_superuser, full_name, created_at, updated_at) VALUES (gen_random_uuid(), $1, $2, true, true, $3, now(), now()) RETURNING id', [ADMIN_EMAIL, hash, process.env.ADMIN_FULL_NAME || 'System Administrator']);
      console.log('Created admin user:', ADMIN_EMAIL, 'id=', ins.rows[0].id);
    }
    await client.end();
    process.exit(0);
  } catch (e) {
    console.error('ERROR:', e && e.message ? e.message : e);
    process.exit(1);
  }
})();

