import { Router } from "express";
import { read, create, update, remove as del, pickFields } from "../../../utils/crud.js";
import pool from "../../../db/pool.js";
import { parsePagination } from "../../../utils/pagination.js";
import { requireAnyPermission } from "../../../middleware/auth.js";
import { PERMISSIONS } from "../../../constants/permissions.js";
import { NotFound, BadRequest } from "../../../utils/errors.js";
const r = Router();
const table = "tickets",
  idCol = "id";
const allow = [
  "ticket_key",
  "title",
  "description",
  "reporter_user_id",
  "reporter_email",
  "system_id",
  "module_id",
  "category_id",
  "status_id",
  "priority_id",
  "severity_id",
  "source_id",
  "assigned_agent_id",
  "group_id",
  "tier_id",
  "claimed_by",
  "claimed_at",
];

const sortable = new Set([
  "created_at",
  "updated_at",
  "ticket_key",
  "priority_id",
  "severity_id",
  "status_id",
]);
function safeSort(input) {
  const raw = String(input || "created_at DESC");
  const parts = raw.trim().split(/\s+/);
  const col = parts[0];
  const dir = (parts[1] || "DESC").toUpperCase();
  return `${sortable.has(col) ? col : "created_at"} ${
    dir === "ASC" ? "ASC" : "DESC"
  }`;
}

r.get(
  "/",
  requireAnyPermission(PERMISSIONS.TICKETS_LIST, PERMISSIONS.TICKETS_MANAGE),
  async (req, res, next) => {
    try {
      const { page, pageSize, offset, limit } = parsePagination(req.query);
      const where = [];
      const params = [];
      if (req.query.q) {
        params.push(`%${req.query.q.toLowerCase()}%`);
        where.push(
          "(lower(title) LIKE $" +
            params.length +
            " OR lower(description) LIKE $" +
            params.length +
            ")"
        );
      }
      if (req.query.ticket_key) {
        params.push(req.query.ticket_key);
        where.push(`ticket_key = $${params.length}`);
      }
      if (req.query.status_code) {
        params.push(req.query.status_code);
        where.push(
          `status_id = (SELECT id FROM statuses WHERE code=$${params.length})`
        );
      }
      if (req.query.priority_code) {
        params.push(req.query.priority_code);
        where.push(
          `priority_id = (SELECT id FROM priorities WHERE code=$${params.length})`
        );
      }
      if (req.query.severity_code) {
        params.push(req.query.severity_code);
        where.push(
          `severity_id = (SELECT id FROM severities WHERE code=$${params.length})`
        );
      }
      for (const f of [
        "system_id",
        "module_id",
        "category_id",
        "assigned_agent_id",
        "group_id",
        "tier_id",
      ]) {
        if (req.query[f]) {
          params.push(req.query[f]);
          where.push(`${f} = $${params.length}`);
        }
      }
      if (req.query.unassigned === "true") {
        where.push("assigned_agent_id IS NULL");
      }
      if (req.query.reporter_email) {
        params.push(req.query.reporter_email);
        where.push(`reporter_email = $${params.length}`);
      }
      if (req.query.created_from) {
        params.push(req.query.created_from);
        where.push(`created_at >= $${params.length}`);
      }
      if (req.query.created_to) {
        params.push(req.query.created_to);
        where.push(`created_at <= $${params.length}`);
      }
      const whereSql = where.length ? "WHERE " + where.join(" AND ") : "";
      const order = safeSort(req.query.sort);
      const { rows: totalRows } = await pool.query(
        `SELECT count(*)::int AS c FROM ${table} ${whereSql}`,
        params
      );
      const total = totalRows[0]?.c || 0;

      // --- dynamic nested relations builder ---
      const relations = {
        reporter_user: { alias: 'u', table: 'users', on: 't.reporter_user_id = u.id', defaults: ['id','email','full_name'], allowed: ['id','email','full_name'] },
        assigned_agent: { alias: 'au', table: 'users', on: 't.assigned_agent_id = au.id', defaults: ['id','email','full_name'], allowed: ['id','email','full_name'] },
        system: { alias: 's', table: 'systems', on: 't.system_id = s.id', defaults: ['id','name','code'], allowed: ['id','name','code','description'] },
        module: { alias: 'sm', table: 'system_modules', on: 't.module_id = sm.id', defaults: ['id','name'], allowed: ['id','name','code','description'] },
        category: { alias: 'ic', table: 'issue_categories', on: 't.category_id = ic.id', defaults: ['id','name'], allowed: ['id','name','code','description'] },
        status: { alias: 'st', table: 'statuses', on: 't.status_id = st.id', defaults: ['id','name','code'], allowed: ['id','name','code'] },
        priority: { alias: 'p', table: 'priorities', on: 't.priority_id = p.id', defaults: ['id','name','code'], allowed: ['id','name','code'] },
        severity: { alias: 'sv', table: 'severities', on: 't.severity_id = sv.id', defaults: ['id','name','code'], allowed: ['id','name','code'] },
        source: { alias: 'src', table: 'sources', on: 't.source_id = src.id', defaults: ['id','name','code'], allowed: ['id','name','code'] },
        group: { alias: 'agp', table: 'agent_groups', on: 't.group_id = agp.id', defaults: ['id','name'], allowed: ['id','name','code'] },
        tier: { alias: 'at', table: 'agent_tiers', on: 't.tier_id = at.id', defaults: ['id','name'], allowed: ['id','name','code'] }
      };

      // Check which related tables actually exist in the current DB schema to avoid SQL errors
      const relTables = Array.from(new Set(Object.values(relations).map(r=>r.table)));
      const { rows: present } = await pool.query(
        `SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name = ANY($1)`,
        [relTables]
      );
      const presentSet = new Set((present || []).map(r=>r.table_name));

      // helper: parse attrs from query param 'with_attrs_<relation>' as comma-separated list
      function parseAttrs(rel){
        const keyName = `with_attrs_${rel}`;
        const raw = req.query[keyName] || (req.query.with_attrs && req.query.with_attrs[rel]) || null;
        if (!raw) return null;
        const parts = String(raw).split(',').map(s=>s.trim()).filter(Boolean);
        return parts.length ? parts : null;
      }

      const selectParts = ['t.*'];
      const joinParts = [];
      for (const [name, info] of Object.entries(relations)){
        const requested = parseAttrs(name);
        const attrs = requested ? requested.filter(a=>info.allowed.includes(a)) : info.defaults;
        // build jsonb_build_object('k', alias.k, ...) pairs
        const pairs = [];
        for (const a of attrs){
          // safe mapping: column names are trusted from allowed list
          pairs.push(`'${a}', ${info.alias}.${a}`);
        }
        // if no attrs, still include id
        if (!pairs.length) pairs.push("'id', " + info.alias + ".id");
        if (presentSet.has(info.table)){
          selectParts.push(`jsonb_build_object(${pairs.join(', ')}) AS ${name}`);
          joinParts.push(`LEFT JOIN ${info.table} ${info.alias} ON ${info.on}`);
        } else {
          // table missing in this schema: return null for the relation
          selectParts.push(`NULL::jsonb AS ${name}`);
        }
      }

      const finalSql = `SELECT ${selectParts.join(', ')} FROM ${table} t ${joinParts.join(' ')} ${whereSql} ORDER BY ${order} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      const { rows } = await pool.query(finalSql, [...params, limit, offset]);
      res.json({ items: rows, page, pageSize, total });
    } catch (e) {
      next(e);
    }
  }
);

r.post(
  "/",
  requireAnyPermission(PERMISSIONS.TICKETS_CREATE, PERMISSIONS.TICKETS_MANAGE),
  async (req, res, next) => {
    try {
      res.status(201).json(await create(table, req.body, allow));
    } catch (e) {
      next(e);
    }
  }
);

r.get(
  "/:id",
  requireAnyPermission(PERMISSIONS.TICKETS_READ, PERMISSIONS.TICKETS_MANAGE),
  async (req, res, next) => {
    try {
      const enriched = await import('../../../utils/relations.js').then(m=>m.readDetailed).then(fn=>fn(table, idCol, req.params.id, req)).catch(()=>null);
      if (enriched) return res.json(req.query.fields ? pickFields(enriched, req.query.fields) : enriched);
      // Fall back to previous detailed SELECT if central helper didn't produce a row
      const row = await read(table, idCol, req.params.id);
      if (!row) return next(NotFound("Ticket not found"));
      const { rows: singleRows } = await pool.query(
        `SELECT t.*, 
           jsonb_build_object('id', u.id, 'email', u.email, 'full_name', u.full_name) AS reporter_user,
           jsonb_build_object('id', au.id, 'email', au.email, 'full_name', au.full_name) AS assigned_agent,
           jsonb_build_object('id', s.id, 'name', s.name, 'code', s.code) AS system,
           jsonb_build_object('id', sm.id, 'name', sm.name) AS module,
           jsonb_build_object('id', ic.id, 'name', ic.name) AS category,
           jsonb_build_object('id', st.id, 'name', st.name, 'code', st.code) AS status,
           jsonb_build_object('id', p.id, 'name', p.name, 'code', p.code) AS priority,
           jsonb_build_object('id', sv.id, 'name', sv.name, 'code', sv.code) AS severity,
           jsonb_build_object('id', src.id, 'name', src.name, 'code', src.code) AS source,
           jsonb_build_object('id', agp.id, 'name', agp.name) AS "group",
           jsonb_build_object('id', at.id, 'name', at.name) AS tier
         FROM ${table} t
         LEFT JOIN users u ON t.reporter_user_id = u.id
         LEFT JOIN users au ON t.assigned_agent_id = au.id
         LEFT JOIN systems s ON t.system_id = s.id
         LEFT JOIN system_modules sm ON t.module_id = sm.id
         LEFT JOIN issue_categories ic ON t.category_id = ic.id
         LEFT JOIN statuses st ON t.status_id = st.id
         LEFT JOIN priorities p ON t.priority_id = p.id
         LEFT JOIN severities sv ON t.severity_id = sv.id
         LEFT JOIN sources src ON t.source_id = src.id
         LEFT JOIN agent_groups agp ON t.group_id = agp.id
         LEFT JOIN agent_tiers at ON t.tier_id = at.id
         WHERE t.id = $1 LIMIT 1`,
        [req.params.id]
      );
      const result = singleRows[0] || row;
      res.json(req.query.fields ? pickFields(result, req.query.fields) : result);
    } catch (e) {
      next(e);
    }
  }
);

r.put(
  "/:id",
  requireAnyPermission(PERMISSIONS.TICKETS_UPDATE, PERMISSIONS.TICKETS_MANAGE),
  async (req, res, next) => {
    try {
      res.json(await update(table, idCol, req.params.id, req.body, allow));
    } catch (e) {
      next(e);
    }
  }
);

r.delete(
  "/:id",
  requireAnyPermission(PERMISSIONS.TICKETS_DELETE, PERMISSIONS.TICKETS_MANAGE),
  async (req, res, next) => {
    try {
      res.json(await del(table, idCol, req.params.id));
    } catch (e) {
      next(e);
    }
  }
);

async function touch(id) {
  await pool.query(`UPDATE tickets SET updated_at=now() WHERE id=$1`, [id]);
}

r.post(
  "/:id/assign",
  requireAnyPermission(PERMISSIONS.TICKETS_ASSIGN, PERMISSIONS.TICKETS_MANAGE),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { assigned_agent_id } = req.body;
      const { rows } = await pool.query(
        `UPDATE tickets SET assigned_agent_id=$1 WHERE id=$2 RETURNING *`,
        [assigned_agent_id, id]
      );
      // record event with explicit jsonb parameter to avoid type inference issues
      await pool.query(
        `INSERT INTO ticket_events (ticket_id,event_type,details) VALUES ($1,'assigned',$2::jsonb)`,
        [id, JSON.stringify({ assigned_agent_id: assigned_agent_id })]
      );
      await touch(id);
      res.json(rows[0]);
    } catch (e) {
      next(e);
    }
  }
);

r.post(
  "/:id/release",
  requireAnyPermission(PERMISSIONS.TICKETS_RELEASE, PERMISSIONS.TICKETS_MANAGE),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { rows } = await pool.query(
        `UPDATE tickets SET assigned_agent_id=NULL WHERE id=$1 RETURNING *`,
        [id]
      );
      await pool.query(`INSERT INTO ticket_events (ticket_id,event_type) VALUES ($1,'released')`, [id]);
      await touch(id);
      res.json(rows[0]);
    } catch (e) {
      next(e);
    }
  }
);

r.post(
  "/:id/claim",
  requireAnyPermission(PERMISSIONS.TICKETS_CLAIM, PERMISSIONS.TICKETS_MANAGE),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const userId = req.user?.sub || null;
      const { rows } = await pool.query(
        `UPDATE tickets SET claimed_by=$1, claimed_at=now() WHERE id=$2 RETURNING *`,
        [userId, id]
      );
      await pool.query(
        `INSERT INTO ticket_events (ticket_id,event_type,actor_user_id) VALUES ($1,'claimed',$2)`,
        [id, userId]
      );
      await touch(id);
      res.json(rows[0]);
    } catch (e) {
      next(e);
    }
  }
);

r.post(
  "/:id/unclaim",
  requireAnyPermission(PERMISSIONS.TICKETS_UNCLAIM, PERMISSIONS.TICKETS_MANAGE),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const userId = req.user?.sub || null;
      const { rows } = await pool.query(
        `UPDATE tickets SET claimed_by=NULL, claimed_at=NULL WHERE id=$1 RETURNING *`,
        [id]
      );
      await pool.query(
        `INSERT INTO ticket_events (ticket_id,event_type,actor_user_id) VALUES ($1,'unclaimed',$2)`,
        [id, userId]
      );
      await touch(id);
      res.json(rows[0]);
    } catch (e) {
      next(e);
    }
  }
);

r.post(
  "/:id/status",
  requireAnyPermission(
    PERMISSIONS.TICKETS_STATUS_SET,
    PERMISSIONS.TICKETS_MANAGE
  ),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      let status_id = req.body.status_id || null;
      if (!status_id && req.body.status_code) {
        const q = await pool.query(`SELECT id FROM statuses WHERE code=$1`, [
          req.body.status_code,
        ]);
        status_id = q.rows[0]?.id;
      }
      const { rows } = await pool.query(
        `UPDATE tickets SET status_id=$1 WHERE id=$2 RETURNING *`,
        [status_id, id]
      );
      await pool.query(
        `INSERT INTO ticket_events (ticket_id,event_type,details) VALUES ($1,'status_changed',$2::jsonb)`,
        [id, JSON.stringify({ status_id: status_id })]
      );
      await touch(id);
      res.json(rows[0]);
    } catch (e) {
      next(e);
    }
  }
);

r.post(
  "/:id/priority",
  requireAnyPermission(
    PERMISSIONS.TICKETS_PRIORITY_SET,
    PERMISSIONS.TICKETS_MANAGE
  ),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      let priority_id = req.body.priority_id || null;
      if (!priority_id && req.body.priority_code) {
        const q = await pool.query(`SELECT id FROM priorities WHERE code=$1`, [
          req.body.priority_code,
        ]);
        priority_id = q.rows[0]?.id;
      }
      const { rows } = await pool.query(
        `UPDATE tickets SET priority_id=$1 WHERE id=$2 RETURNING *`,
        [priority_id, id]
      );
      await pool.query(`INSERT INTO ticket_events (ticket_id,event_type,details) VALUES ($1,'priority_changed',$2::jsonb)`, [id, JSON.stringify({ priority_id: priority_id })]);
      await touch(id);
      res.json(rows[0]);
    } catch (e) {
      next(e);
    }
  }
);

r.post(
  "/:id/severity",
  requireAnyPermission(
    PERMISSIONS.TICKETS_SEVERITY_SET,
    PERMISSIONS.TICKETS_MANAGE
  ),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      let severity_id = req.body.severity_id || null;
      if (!severity_id && req.body.severity_code) {
        const q = await pool.query(`SELECT id FROM severities WHERE code=$1`, [
          req.body.severity_code,
        ]);
        severity_id = q.rows[0]?.id;
      }
      const { rows } = await pool.query(
        `UPDATE tickets SET severity_id=$1 WHERE id=$2 RETURNING *`,
        [severity_id, id]
      );
      await pool.query(`INSERT INTO ticket_events (ticket_id,event_type,details) VALUES ($1,'severity_changed',$2::jsonb)`, [id, JSON.stringify({ severity_id: severity_id })]);
      await touch(id);
      res.json(rows[0]);
    } catch (e) {
      next(e);
    }
  }
);

// Ticket-scoped helpers
r.get(
  "/:id/notes",
  requireAnyPermission(
    PERMISSIONS.TICKETS_NOTES_READ,
    PERMISSIONS.TICKETS_MANAGE
  ),
  async (req, res, next) => {
    try {
      const { rows } = await pool.query(
        `SELECT * FROM ticket_notes WHERE ticket_id=$1 ORDER BY created_at DESC`,
        [req.params.id]
      );
      res.json(rows);
    } catch (e) {
      next(e);
    }
  }
);

r.post(
  "/:id/notes",
  requireAnyPermission(
    PERMISSIONS.TICKETS_NOTES_ADD,
    PERMISSIONS.TICKETS_MANAGE
  ),
  async (req, res, next) => {
    try {
      const { body, is_internal = false } = req.body || {};
      if (!body || !String(body).trim()) return next(BadRequest('body is required'));
      const userId = req.user?.sub || null;
      const { rows } = await pool.query(
        `INSERT INTO ticket_notes (ticket_id,user_id,body,is_internal) VALUES ($1,$2,$3,$4) RETURNING *`,
        [req.params.id, userId, body, is_internal]
      );
      await pool.query(
        `INSERT INTO ticket_events (ticket_id,event_type,actor_user_id,details) VALUES ($1,'note_added',$2,$3::jsonb)`,
        [req.params.id, userId, JSON.stringify({ note_id: rows[0].id })]
      );
      res.status(201).json(rows[0]);
    } catch (e) {
      next(e);
    }
  }
);

r.get(
  "/:id/watchers",
  requireAnyPermission(
    PERMISSIONS.TICKETS_WATCHERS_READ,
    PERMISSIONS.TICKETS_MANAGE
  ),
  async (req, res, next) => {
    try {
      const { rows } = await pool.query(
        `SELECT * FROM ticket_watchers WHERE ticket_id=$1 ORDER BY id DESC`,
        [req.params.id]
      );
      res.json(rows);
    } catch (e) {
      next(e);
    }
  }
);

r.post(
  "/:id/watchers",
  requireAnyPermission(
    PERMISSIONS.TICKETS_WATCHERS_ADD,
    PERMISSIONS.TICKETS_MANAGE
  ),
  async (req, res, next) => {
    try {
      const { user_id = null, email = null, notify = true } = req.body;
      const { rows } = await pool.query(
        `INSERT INTO ticket_watchers (ticket_id,user_id,email,notify) VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING RETURNING *`,
        [req.params.id, user_id, email, notify]
      );
      res.status(201).json(rows[0] || { ok: true });
    } catch (e) {
      next(e);
    }
  }
);

r.delete(
  "/:id/watchers/:wid",
  requireAnyPermission(
    PERMISSIONS.TICKETS_WATCHERS_REMOVE,
    PERMISSIONS.TICKETS_MANAGE
  ),
  async (req, res, next) => {
    try {
      const wid = req.params.wid;
      // basic validation: ensure wid looks like a uuid
      if (!/^[-0-9a-fA-F]{36}$/.test(wid)) return next(BadRequest('Invalid watcher id'));
      await pool.query(
        `DELETE FROM ticket_watchers WHERE id=$1 AND ticket_id=$2`,
        [wid, req.params.id]
      );
      res.json({ ok: true });
    } catch (e) {
      next(e);
    }
  }
);

r.get(
  "/:id/attachments",
  requireAnyPermission(
    PERMISSIONS.TICKETS_ATTACHMENTS_READ,
    PERMISSIONS.TICKETS_MANAGE
  ),
  async (req, res, next) => {
    try {
      const { rows } = await pool.query(
        `SELECT * FROM ticket_attachments WHERE ticket_id=$1 ORDER BY uploaded_at DESC`,
        [req.params.id]
      );
      res.json(rows);
    } catch (e) {
      next(e);
    }
  }
);

r.post(
  "/:id/attachments",
  requireAnyPermission(
    PERMISSIONS.TICKETS_ATTACHMENTS_ADD,
    PERMISSIONS.TICKETS_MANAGE
  ),
  async (req, res, next) => {
    try {
      const { file_name, file_type, file_size_bytes, storage_path } = req.body;
      if (!file_name || !file_type || !storage_path || !file_size_bytes) return next(BadRequest('file_name, file_type, file_size_bytes and storage_path are required'));
      const userId = req.user?.sub || null;
      const { rows } = await pool.query(
        `INSERT INTO ticket_attachments (ticket_id,file_name,file_type,file_size_bytes,storage_path,uploaded_by) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
        [
          req.params.id,
          file_name,
          file_type,
          file_size_bytes,
          storage_path,
          userId,
        ]
      );
      await pool.query(
        `INSERT INTO ticket_events (ticket_id,event_type,actor_user_id,details) VALUES ($1,'attachment_added',$2,$3::jsonb)`,
        [req.params.id, userId, JSON.stringify({ attachment_id: rows[0].id })]
      );
      res.status(201).json(rows[0]);
    } catch (e) {
      next(e);
    }
  }
);

r.get(
  "/:id/events",
  requireAnyPermission(
    PERMISSIONS.TICKETS_EVENTS_READ,
    PERMISSIONS.TICKETS_MANAGE
  ),
  async (req, res, next) => {
    try {
      const { rows } = await pool.query(
        `SELECT * FROM ticket_events WHERE ticket_id=$1 ORDER BY occurred_at DESC`,
        [req.params.id]
      );
      res.json(rows);
    } catch (e) {
      next(e);
    }
  }
);

r.post(
  "/:id/close",
  requireAnyPermission(PERMISSIONS.TICKETS_CLOSE, PERMISSIONS.TICKETS_MANAGE),
  async (req, res, next) => {
    try {
      const st = await pool.query(
        `SELECT id FROM statuses WHERE code='closed'`
      );
      const { rows } = await pool.query(
        `UPDATE tickets SET status_id=$1 WHERE id=$2 RETURNING *`,
        [st.rows[0]?.id, req.params.id]
      );
      await pool.query(
        `INSERT INTO ticket_events (ticket_id,event_type) VALUES ($1,'closed')`,
        [req.params.id]
      );
      await touch(req.params.id);
      res.json(rows[0]);
    } catch (e) {
      next(e);
    }
  }
);

r.post(
  "/:id/reopen",
  requireAnyPermission(PERMISSIONS.TICKETS_REOPEN, PERMISSIONS.TICKETS_MANAGE),
  async (req, res, next) => {
    try {
      const st = await pool.query(`SELECT id FROM statuses WHERE code='open'`);
      const { rows } = await pool.query(
        `UPDATE tickets SET status_id=$1 WHERE id=$2 RETURNING *`,
        [st.rows[0]?.id, req.params.id]
      );
      await pool.query(
        `INSERT INTO ticket_events (ticket_id,event_type) VALUES ($1,'reopened')`,
        [req.params.id]
      );
      await touch(req.params.id);
      res.json(rows[0]);
    } catch (e) {
      next(e);
    }
  }
);

export default r;
