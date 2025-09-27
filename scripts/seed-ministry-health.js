#!/usr/bin/env node
/**
 * MOH HelpDesk — Ministry of Health Seeder (schema-aware, high-volume)
 *
 * Usage:
 *   node scripts/seed-ministry-health.js --tickets 1000
 *   # or
 *   npm run seed:moh -- --tickets 1000
 *
 * What it does:
 * - Truncates non-auth tables; keeps auth tables intact
 * - Seeds cascades: System Category -> Systems -> Modules (EMR, eCHIS, DHIS2)
 * - Seeds lookups (statuses, priorities, severities, sources) schema-aware
 * - Seeds agents (tiers/groups/members) schema-aware
 * - Seeds FAQs/KB/Videos for demo completeness
 * - Inserts N tickets with realistic details + notes/events/watchers/attachments
 */

import pool from '../src/db/pool.js';
import https from 'https';

// -------- CLI (supports "--tickets 1000" and "--tickets=1000") --------
function getNumFlag(flag, defVal) {
    const argv = process.argv.slice(2);
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        if (a === `--${flag}`) {
            const n = parseInt(argv[i + 1], 10);
            return Number.isFinite(n) ? n : defVal;
        }
        if (a.startsWith(`--${flag}=`)) {
            const n = parseInt(a.split('=')[1], 10);
            return Number.isFinite(n) ? n : defVal;
        }
    }
    return defVal;
}
const TICKET_TARGET = Math.max(1, getNumFlag('tickets', 700));

// ---------------- Utils ----------------
const nowISO = () => new Date().toISOString();
const randInt = (a,b) => Math.floor(Math.random()*(b-a+1))+a;
const pick = (arr) => arr[Math.floor(Math.random()*arr.length)];
const chance = (p) => Math.random() < p;
const ugPhone = () => `07${randInt(0,9)}${randInt(1000000,9999999)}`;
const nameLike = () =>
    `${pick(['Amina','Okello','Nabirye','Kato','Namara','Mwesigwa','Asiimwe','Birungi','Kisembo','Namakula'])} ${pick(['James','Sarah','Peter','Grace','Joseph','Joan','Brian','Ruth','Samuel','Agnes'])}`;
function chunk(arr, size){ const out=[]; for(let i=0;i<arr.length;i+=size) out.push(arr.slice(i,i+size)); return out; }

// ------------- DB helpers (schema-aware) -------------
async function tableExists(client, table){
    const r = await client.query(
        `SELECT 1 FROM information_schema.tables
     WHERE table_schema='public' AND table_name=$1 LIMIT 1`, [table]);
    return r.rowCount > 0;
}
async function getTableColumns(client, table){
    const r = await client.query(
        `SELECT column_name FROM information_schema.columns
     WHERE table_schema='public' AND table_name=$1`, [table]);
    return new Set(r.rows.map(x=>x.column_name));
}
/** Insert using only columns that exist. required=[] are columns that must exist. */
async function insertSchemaAware(client, table, base, required = []){
    const cols = await getTableColumns(client, table);
    for (const c of required){
        if (!cols.has(c)) throw new Error(`Table ${table} missing required column: ${c}`);
    }
    const use = []; const vals = [];
    for (const [k,v] of Object.entries(base)){
        if (cols.has(k) && v !== undefined){
            use.push(k); vals.push(v);
        }
    }
    if (!use.length) throw new Error(`No usable columns for insert into ${table}`);
    const placeholders = use.map((_,i)=>`$${i+1}`).join(',');
    const { rows } = await client.query(
        `INSERT INTO ${table}(${use.join(',')}) VALUES(${placeholders}) RETURNING *`, vals);
    return rows[0];
}

// ------------- Cascades (aligned with your UI) -------------
const CATEGORIES = ['EMR','eCHIS','DHIS2'];

const SYSTEMS_BY_CATEGORY = {
    EMR: [
        { name: 'UgandaEMR',    code: 'UGANDAEMR',    desc: 'National facility EMR (OpenMRS-based)' },
        { name: 'ClinicMaster', code: 'CLINICMASTER', desc: 'ClinicMaster EMR' },
        { name: 'eAFYA',        code: 'EAFYA',        desc: 'eAFYA EMR' },
    ],
    eCHIS: [
        { name: 'National eCHIS',    code: 'ECHIS-NATIONAL', desc: 'Community Health Information System' },
        { name: 'VHT Community App', code: 'ECHIS-VHT',      desc: 'Village Health Team app' },
        { name: 'Community iCCM',    code: 'ECHIS-ICCM',     desc: 'Integrated Community Case Management' },
        { name: 'MCH eCHIS',         code: 'ECHIS-MCH',      desc: 'Maternal & Child Health eCHIS' },
    ],
    DHIS2: [
        { name: 'ehmis',        code: 'DHIS2-EHMIS',  desc: 'National HMIS DHIS2' },
        { name: 'ecbss',        code: 'DHIS2-ECBSS',  desc: 'Electronic Community Based Surveillance' },
        { name: 'cqi database', code: 'DHIS2-CQI',    desc: 'Continuous Quality Improvement' },
        { name: 'HFQAP',        code: 'DHIS2-HFQAP',  desc: 'Health Facility Quality Assessment Program' },
        { name: 'EPVAC',        code: 'DHIS2-EPVAC',  desc: 'EPI Vaccination / Cold Chain' },
        { name: 'eIDSR',        code: 'DHIS2-EIDSR',  desc: 'Electronic Integrated Disease Surveillance' },
        { name: 'UNEPI',        code: 'DHIS2-UNEPI',  desc: 'Immunization DHIS2' },
    ],
};

const MODULES_BY_CATEGORY = {
    EMR: [
        'Inpatient Module','Doctor Consultation','Nursing Module','Imaging & Radiology',
        'Laboratory Module','Pharmacy Management','Reporting Module'
    ],
    eCHIS: [
        'Household Registration','Community Case Management (iCCM)','Maternal & Newborn',
        'Child Health & Immunization','Family Planning','Referrals & Feedback',
        'Stock & Commodities','Reporting'
    ],
    DHIS2: [
        'Data Entry (Aggregate)','Tracker Capture','Event Capture',
        'Analytics & Dashboards','Data Quality','Metadata & Configuration','Import/Export'
    ],
};

const ISSUE_CATEGORIES = [
    'Software Glitches','Hardware','Change Request','Network',
    'Account Access','Application Support','Data Loss and Backup','Performance Issues'
];

// ------------- Rich demo context -------------
const FACILITIES = [
    'Mulago National Referral Hospital','Entebbe General Hospital','Kawempe Hospital',
    'Kisenyi HC IV','Naguru Hospital','Kibuli Muslim Hospital','Mbarara Regional Referral',
    'Gulu Regional Referral','Arua Regional Referral','Masaka Regional Referral'
];
const DISTRICTS = ['Kampala','Wakiso','Mukono','Mbarara','Gulu','Arua','Masaka','Mbale','Jinja','Fort Portal'];
const BROWSERS  = ['Chrome 124','Firefox 126','Edge 123','Safari 17'];
const OS_LIST   = ['Windows 11','Windows 10','Ubuntu 22.04','macOS 14','Android 13','iOS 17'];

function makeTitle(category, systemName, moduleName){
    const topic = pick(['Login issue','Slow performance','Data sync failure','Report mismatch','Form validation error','Import error','Analytics blank','Metadata conflict']);
    return `[${category}/${systemName}] ${moduleName} — ${topic}`;
}
function makeRichDescription(ctx){
    const { category, systemName, moduleName, facility, district, browser, os } = ctx;
    const expected = 'Action completes successfully within acceptable time and correct data is saved.';
    const actual = pick([
        'System returns 500 Internal Server Error.',
        'Submission spins for > 60s and times out.',
        'Validation passes but data not saved.',
        'Dashboard shows blank with console JS errors.'
    ]);
    const impact = pick([
        'Affects daily reporting at facility level.',
        'Blocks case notifications (surveillance).',
        'Delays OPD service and patient flow.',
        'Prevents vaccine stock updates at district store.'
    ]);
    const workaround = chance(0.5) ? pick([
        'Retry after clearing cache resolves temporarily.',
        'Using a different browser works.',
        'Switching network (mobile data) helps.',
        'Manual CSV import via Import/Export works.'
    ]) : null;

    const env = `Environment:
- System Category: ${category}
- System: ${systemName}
- Module: ${moduleName}
- Facility: ${facility}, ${district} District
- Client: ${browser} on ${os}`;

    const steps = `Steps to Reproduce:
1. Login to the system
2. Open ${moduleName}
3. Perform the action described
4. Observe the error/slow response`;

    return [
        `Context:\n- Reported on ${nowISO()} by facility staff. Demo auto-generated ticket.\n`,
        env, steps,
        `Expected Result:\n- ${expected}\n\nActual Result:\n- ${actual}\n\nImpact:\n- ${impact}`,
        workaround ? `Workaround (temporary):\n- ${workaround}` : ''
    ].filter(Boolean).join('\n\n');
}

// ------------- Public tickets (best-effort; may return null) -------------
const PUBLIC_TICKET_ENDPOINTS = [
    'https://helpdesk.health.go.ug/api/public/tickets',
    'https://helpdesk.health.go.ug/public/api/tickets',
    'https://helpdesk.health.go.ug/api/tickets?visibility=public'
];
function fetchJSON(url){
    return new Promise((resolve)=>{
        https.get(url, res=>{
            let data=''; if (!res || (res.statusCode && res.statusCode>=400)) return resolve(null);
            res.on('data', c=> data+=c);
            res.on('end', ()=> { try { resolve(JSON.parse(data)); } catch { resolve(null); } });
        }).on('error', ()=> resolve(null));
    });
}
async function tryFetchPublicTickets(){
    for (const url of PUBLIC_TICKET_ENDPOINTS){
        const j = await fetchJSON(url);
        if (j && Array.isArray(j) && j.length) return j;
    }
    return null;
}

// ========================== MAIN ==========================
async function main(){
    console.log(`Seeding Ministry of Health data — target tickets: ${TICKET_TARGET}`);
    const client = await pool.connect();

    try{
        await client.query('BEGIN');

        // 0) Clean non-auth tables (keep users/roles/permissions/api_keys)
        const nonAuthTables = [
            'ticket_events','ticket_attachments','ticket_watchers','ticket_notes','tickets',
            'files',
            'faqs','faq_origins','kb_article_tags','kb_ratings','kb_articles','kb_tags',
            'videos','video_categories',
            'system_modules','issue_categories','system_category','systems',
            'agent_group_members','agent_tier_members','agent_groups','agent_tiers',
            'statuses','priorities','severities','sources',
            'settings_kv','smtp_settings','general_settings','notification_settings',
            'security_settings','auth_methods_settings','sso_settings','branding_settings',
            'email_templates_settings',
            'workflow_rule_runs','workflow_rules'
        ];
        await client.query(`TRUNCATE TABLE ${nonAuthTables.join(',')} RESTART IDENTITY CASCADE`);

        // 1) Lookups (schema-aware)
        // statuses
        const statuses = [
            { name:'Open',         code:'open',         is_default:true,  is_closed:false, sort_order:1 },
            { name:'In Progress',  code:'in_progress',  is_default:false, is_closed:false, sort_order:2 },
            { name:'On Hold',      code:'on_hold',      is_default:false, is_closed:false, sort_order:3 },
            { name:'Resolved',     code:'resolved',     is_default:false, is_closed:true,  sort_order:4 },
            { name:'Closed',       code:'closed',       is_default:false, is_closed:true,  sort_order:5 },
        ];
        const statusIds = [];
        for (const s of statuses){
            const row = await insertSchemaAware(client, 'statuses', s, ['name']);
            statusIds.push(row.id);
        }
        // Create a weighted pool (Open 35%, In Progress 30%, On Hold 15%, Resolved 10%, Closed 10%)
        function weighted(arr, counts){ const out=[]; arr.forEach((id,i)=>{ for(let k=0;k<counts[i];k++) out.push(id); }); return out; }
        const statusWeightedIds = weighted(statusIds, [35,30,15,10,10]);

        // priorities
        const priorities = [
            { name:'High',   code:'high',   sort_order:1 },
            { name:'Low',    code:'low',    sort_order:2 },
            { name:'Medium', code:'medium', sort_order:3 },
        ];
        const priorityIds = [];
        for (const p of priorities){
            const row = await insertSchemaAware(client, 'priorities', p, ['name']);
            priorityIds.push(row.id);
        }

        // severities
        const severities = [
            { name:'S1 - Critical', code:'s1', sort_order:1 },
            { name:'S2 - Major',    code:'s2', sort_order:2 },
            { name:'S3 - Minor',    code:'s3', sort_order:3 },
        ];
        const severityIds = [];
        for (const s of severities){
            const row = await insertSchemaAware(client, 'severities', s, ['name']);
            severityIds.push(row.id);
        }

        // sources (only if table exists in your schema)
        if (await tableExists(client,'sources')){
            for (const s of [
                { name:'Portal', code:'portal' },
                { name:'Email',  code:'email'  },
                { name:'Phone',  code:'phone'  },
                { name:'API',    code:'api'    },
            ]){
                await insertSchemaAware(client, 'sources', s, ['name']);
            }
        }

        // 2) System Category -> Systems -> Modules
        const catIdByName = {};
        for (const cat of CATEGORIES){
            const row = await insertSchemaAware(client, 'system_category', { name: cat }, ['name']);
            catIdByName[cat] = row.id;
        }

        const systemIdByCode = {};
        for (const cat of CATEGORIES){
            const catId = catIdByName[cat];
            for (const sys of SYSTEMS_BY_CATEGORY[cat]){
                const inserted = await insertSchemaAware(
                    client, 'systems',
                    { category_id: catId, name: sys.name, code: sys.code, description: sys.desc },
                    ['category_id','name']
                );
                systemIdByCode[sys.code] = inserted.id;

                // Modules (system_id + name required; code/description optional)
                for (const m of MODULES_BY_CATEGORY[cat]){
                    await insertSchemaAware(
                        client, 'system_modules',
                        { system_id: inserted.id, name: m, code: m.toLowerCase().replace(/[^a-z0-9]+/g,'-'), description: `${m} module` },
                        ['system_id','name']
                    );
                }
            }
        }

        // Issue categories per system (system_id + name required)
        for (const sysCode in systemIdByCode){
            const sysId = systemIdByCode[sysCode];
            for (const name of ISSUE_CATEGORIES){
                await insertSchemaAware(
                    client, 'issue_categories',
                    { system_id: sysId, name, code: name.toLowerCase().replace(/[^a-z0-9]+/g,'-'), description: name },
                    ['system_id','name']
                );
            }
        }

        // 3) Agents (schema-aware)
        const tierIds = [];
        for (const t of [
            { name:'Tier 1', code:'tier1', description:'First-line support' },
            { name:'Tier 2', code:'tier2', description:'Advanced troubleshooting' },
            { name:'Tier 3', code:'tier3', description:'Subject matter experts' },
        ]){
            const row = await insertSchemaAware(client, 'agent_tiers', t, ['name']);
            tierIds.push(row.id);
        }
        const groupIds = [];
        for (const g of [
            { name:'EMR Operations', code:'emr-ops', description:'EMR operational support' },
            { name:'Clinical Support', code:'clinical', description:'Clinical workflow support' },
            { name:'Integration', code:'interop', description:'Interoperability & integrations' },
        ]){
            const row = await insertSchemaAware(client, 'agent_groups', g, ['name']);
            groupIds.push(row.id);
        }

        // 4) Users (demo; keep existing via upsert semantics not assumed, just insert demo users)
        const userIds = [];
        // Use schema-aware upsert to avoid duplicate-key errors and respect available columns
        const userCols = await getTableColumns(client, 'users');
        for (let i = 1; i <= 80; i++) {
            const email = `user${i}@health.go.ug`;
            const base = { email, full_name: `User ${i}`, password_hash: '-', is_active: true };
            // Build column list that actually exists in the users table
            const keys = Object.keys(base).filter(k => userCols.has(k));
            if (!keys.includes('email')) {
                throw new Error('users table does not have required column: email');
            }
            const vals = keys.map(k => base[k]);
            const placeholders = keys.map((_, idx) => `$${idx + 1}`).join(',');

            // Columns we can update on conflict (exclude the unique key 'email')
            const updateCols = keys.filter(k => k !== 'email');

            let row;
            if (updateCols.length > 0) {
                const setClause = updateCols.map(c => `${c}=EXCLUDED.${c}`).join(',');
                const sql = `INSERT INTO users(${keys.join(',')}) VALUES(${placeholders}) ON CONFLICT (email) DO UPDATE SET ${setClause} RETURNING *`;
                const res = await client.query(sql, vals);
                row = res.rows[0];
            } else {
                // No updatable columns other than email; try insert DO NOTHING then select existing
                const sql = `INSERT INTO users(${keys.join(',')}) VALUES(${placeholders}) ON CONFLICT (email) DO NOTHING RETURNING *`;
                const res = await client.query(sql, vals);
                if (res.rows && res.rows[0]) {
                    row = res.rows[0];
                } else {
                    const sel = await client.query(`SELECT id FROM users WHERE email=$1 LIMIT 1`, [email]);
                    row = sel.rows[0];
                }
            }
            if (!row || !row.id) throw new Error(`Failed to insert/lookup user ${email}`);
            userIds.push(row.id);
        }

        // map some users into tiers/groups
        for (let i=0;i<30;i++){
            await client.query(
                `INSERT INTO agent_tier_members(tier_id,user_id) VALUES($1,$2) ON CONFLICT DO NOTHING`,
                [pick(tierIds), pick(userIds)]
            );
            await client.query(
                `INSERT INTO agent_group_members(group_id,user_id) VALUES($1,$2) ON CONFLICT DO NOTHING`,
                [pick(groupIds), pick(userIds)]
            );
        }

        // 5) Content shelves (FAQs/KB/Videos)
        for (const cat of CATEGORIES){
            for (let i=1;i<=6;i++){
                // Use schema-aware insert: created_at may not exist
                await insertSchemaAware(client, 'faqs', { title: `${cat} FAQ ${i}`, body: `Answer for ${cat} FAQ ${i}`, system_category_id: catIdByName[cat], is_published: true, created_by: pick(userIds) }, ['title','body']);
            }
        }
        const kbIds = [];
        for (let i=1;i<=36;i++){
            const base = { title: `KB Article ${i} — ${pick(['How-to','FAQ','Troubleshooting','Policy'])}`, body: 'Demo content.', is_published: i%2===0, created_by: pick(userIds) };
            const row = await insertSchemaAware(client, 'kb_articles', base, ['title']);
            kbIds.push(row.id);
        }
        for (let i=0;i<120;i++){
            // kb_ratings: prefer INSERT ... ON CONFLICT (article_id,user_id) DO NOTHING when the unique constraint exists
            const aId = pick(kbIds);
            const uId = pick(userIds);
            const rating = randInt(1,5);
            const kbCols = await getTableColumns(client, 'kb_ratings');
            if (kbCols.has('article_id') && kbCols.has('user_id')){
                const cols = ['article_id','user_id','rating'].filter(c=>kbCols.has(c));
                const vals = cols.map(c => (c==='article_id'? aId : (c==='user_id'? uId : rating)));
                const placeholders = cols.map((_,idx)=>`$${idx+1}`).join(',');
                try{
                    await client.query(`INSERT INTO kb_ratings(${cols.join(',')}) VALUES(${placeholders}) ON CONFLICT (article_id,user_id) DO NOTHING`, vals);
                }catch(err){
                    // If the table has a different unique constraint or other issue, fall back to schema-aware insert
                    await insertSchemaAware(client, 'kb_ratings', { article_id: aId, user_id: uId, rating }, ['article_id','user_id']);
                }
            } else {
                // Fallback for schemas without those columns
                await insertSchemaAware(client, 'kb_ratings', { article_id: aId, user_id: uId, rating }, ['article_id','user_id']);
            }
        }
        if (await tableExists(client,'video_categories')){
            await client.query(
                `INSERT INTO video_categories(name) VALUES ('Guidelines'),('Training'),('Announcements'),('Health Campaigns')`
            );
            for (let i=1;i<=30;i++){
                const base = { title: `Help Video ${i} — ${pick(['DHIS2','eCHIS','EMR'])}`, description: 'Demo training video', category_id: (await client.query(`SELECT id FROM video_categories ORDER BY id LIMIT 1`)).rows[0].id, system_category_id: catIdByName[pick(CATEGORIES)], url: `https://videos.health.go.ug/${i}`, duration_seconds: randInt(60,600), language: pick(['en','lg']), is_published: true };
                await insertSchemaAware(client, 'videos', base, ['title']);
            }
        }

        // 6) Optional ticket columns
        async function hasColumn(table, column){ return (await getTableColumns(client, table)).has(column); }
        const hasReportedBy    = await hasColumn('tickets','reported_by_name');
        const hasReporterPhone = await hasColumn('tickets','reporter_phone');
        const hasFacilityLevel = await hasColumn('tickets','facility_level');
        const hasSourceCode    = await hasColumn('tickets','source_code');
        const hasSeverityId    = await hasColumn('tickets','severity_id');

        // 7) Import public tickets if possible; top-up to target with generated rich tickets
        let imported = await tryFetchPublicTickets();
        if (!imported || !imported.length) imported = [];
        const toGenerate = Math.max(0, TICKET_TARGET - imported.length);
        const allTicketsRaw = [
            ...imported,
            ...Array.from({length: toGenerate}).map(()=>({ _rich: true }))
        ];

        // Cache modules per system by NAME (not code)
        const modulesBySystemId = {};
        const modRows = (await client.query(
            `SELECT sm.id, sm.name, sm.system_id FROM system_modules sm`
        )).rows;
        for (const r of modRows){
            if (!modulesBySystemId[r.system_id]) modulesBySystemId[r.system_id] = {};
            modulesBySystemId[r.system_id][r.name] = r.id;
        }

        // Insert tickets in batches
        let insertedTickets = 0;
        for (const batch of chunk(allTicketsRaw, 200)) {
            for (const raw of batch) {
                // Pick cascade
                const category = pick(CATEGORIES);
                const sysMeta  = pick(SYSTEMS_BY_CATEGORY[category]);
                const moduleName = pick(MODULES_BY_CATEGORY[category]);
                const sysId    = systemIdByCode[sysMeta.code];

                // Resolve module by name + system_id
                const moduleId = modulesBySystemId[sysId]?.[moduleName] ?? null;

                // Any issue category under that system
                const issueCategoryId = (await client.query(
                    `SELECT id FROM issue_categories WHERE system_id=$1 ORDER BY random() LIMIT 1`,
                    [sysId]
                )).rows[0]?.id;

                const facility = pick(FACILITIES);
                const district = pick(DISTRICTS);
                const browser  = pick(BROWSERS);
                const os       = pick(OS_LIST);

                const title = raw?._rich
                    ? makeTitle(category, sysMeta.name, moduleName)
                    : (raw.title || raw.subject || `Ticket — ${pick(['Login','Sync','Crash','Slow','Data'])}`);

                const description = raw?._rich
                    ? makeRichDescription({category, systemName: sysMeta.name, moduleName, facility, district, browser, os})
                    : (raw.description || raw.details || 'No description provided. (auto-generated)');

                // Weighted random status; random priority/severity
                const statusId   = pick(statusWeightedIds);
                const priorityId = pick(priorityIds);
                const severityId = pick(severityIds);
                const reporterId = pick(userIds);
                const reportedBy = raw.reported_by_name || nameLike();
                const phone      = raw.reporter_phone || ugPhone();
                const facilityLevel = category;
                const sourceCode = raw.source || pick(['portal','email','phone','api']);

                // Build INSERT for tickets including only existing columns
                const cols = ['title','description','reporter_user_id','system_id','module_id','category_id','status_id','priority_id','created_at','updated_at'];
                const vals = [title, description, reporterId, sysId, moduleId, issueCategoryId, statusId, priorityId, new Date(), new Date()];
                if (hasSeverityId){ cols.splice(8,0,'severity_id'); vals.splice(8,0,severityId); }
                if (hasSourceCode){ cols.splice(8+(hasSeverityId?1:0),0,'source_code'); vals.splice(8+(hasSeverityId?1:0),0,sourceCode); }
                if (hasReportedBy){ cols.push('reported_by_name'); vals.push(reportedBy); }
                if (hasReporterPhone){ cols.push('reporter_phone'); vals.push(phone); }
                if (hasFacilityLevel){ cols.push('facility_level'); vals.push(facilityLevel); }

                const placeholders = cols.map((_,i)=>`$${i+1}`).join(',');
                const { rows } = await client.query(
                    `INSERT INTO tickets(${cols.join(',')}) VALUES(${placeholders}) RETURNING id`,
                    vals
                );
                const ticketId = rows[0].id;
                insertedTickets++;

                // Watchers (~25%)
                if (chance(0.25)){
                    await client.query(
                        `INSERT INTO ticket_watchers(ticket_id,user_id,email,notify) VALUES($1,$2,$3,true)`,
                        [ticketId, pick(userIds), null]
                    );
                }

                // Notes (1–4)
                const noteCount = randInt(1,4);
                for (let n=0;n<noteCount;n++){
                    const internal = n>0 ? chance(0.6) : false; // first often external
                    // Use schema-aware insert for ticket_notes (created_at may be absent)
                    await insertSchemaAware(client, 'ticket_notes', {
                        ticket_id: ticketId,
                        user_id: pick(userIds),
                        body: internal
                            ? pick([
                                'Triage: Verified and collecting logs.',
                                'Investigation: Suspected metadata mismatch.',
                                'Applied workaround: cleared cache & reloaded metadata.',
                                'Escalated to Tier 2 for follow-up.'
                            ])
                            : `Reporter note: Issue observed at ${facility} (${district}).`,
                        is_internal: internal
                    }, ['ticket_id','user_id']);
                }

                // Events: created → assigned → updated (0–2) → maybe resolved/closed
                await insertSchemaAware(client, 'ticket_events', { ticket_id: ticketId, event_type: 'created', actor_user_id: reporterId, details: JSON.stringify({via:sourceCode}) }, ['ticket_id','event_type']);
                await insertSchemaAware(client, 'ticket_events', { ticket_id: ticketId, event_type: 'assigned', actor_user_id: pick(userIds), details: JSON.stringify({tier: pick(['Tier 1','Tier 2','Tier 3']), group: pick(['emr-ops','clinical','interop'])}) }, ['ticket_id','event_type']);
                const updates = randInt(0,2);
                for (let u=0;u<updates;u++){
                    await insertSchemaAware(client, 'ticket_events', { ticket_id: ticketId, event_type: 'updated', actor_user_id: pick(userIds), details: JSON.stringify({action: pick(['requested_logs','cleared_cache','synced_metadata','restarted_service'])}) }, ['ticket_id','event_type']);
                }
                // If final status is likely closed/resolved, add closing event
                if (statusId === statusIds[3] || statusId === statusIds[4]) {
                    await insertSchemaAware(client, 'ticket_events', { ticket_id: ticketId, event_type: (statusId === statusIds[4] ? 'closed' : 'resolved'), actor_user_id: pick(userIds), details: JSON.stringify({ resolution: pick(['metadata_fix','network_restored','bugfix_deployed','training_provided']) }) }, ['ticket_id','event_type']);
                }

                // Attachments (~35%): 1–2 each
                if (chance(0.35)){
                    const att = randInt(1,2);
                    for (let a=1;a<=att;a++){
                        await insertSchemaAware(client, 'files', {
                            ticket_id: ticketId,
                            file_name: `attachment-${ticketId}-${a}${chance(0.5)?'.png':'.log'}`,
                            file_type: chance(0.5)?'image/png':'text/plain',
                            file_size_bytes: randInt(5000,250000),
                            storage_path: `/tmp/demo/attachments/${ticketId}/${a}`
                        }, ['ticket_id','file_name']);
                    }
                }
            }
        }

        console.log(`Inserted ${insertedTickets} tickets with related notes/events/watchers/attachments.`);

        await client.query('COMMIT');
        console.log('Seeding complete.');
    }catch(e){
        console.error('Seeding failed:', e);
        await client.query('ROLLBACK');
        process.exit(1);
    }finally{
        client.release();
        process.exit(0);
    }
}

main();