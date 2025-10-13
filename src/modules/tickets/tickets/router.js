import { Router } from "express";
import { read, create, update, remove as del, pickFields, pickFieldsDeep } from "../../../utils/crud.js";
import pool from "../../../db/pool.js";
import { parsePagination } from "../../../utils/pagination.js";
import { requireAnyPermission } from "../../../middleware/auth.js";
import { PERMISSIONS } from "../../../constants/permissions.js";
import { NotFound, BadRequest } from "../../../utils/errors.js";
import { listDetailed, readDetailed } from "../../../utils/relations.js";
const r = Router();
const table = "tickets",
  idCol = "id";
const allow = [
  "ticket_key",
  "title",
  "description",
  "reporter_user_id",
  "reporter_email",
  "full_name",
  "phone_number",
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

      const extraSelects = [
        `(
        SELECT count(*)::int FROM ticket_attachments ta WHERE ta.ticket_id = t.id
      ) AS attachments_count`,
      ];

      const rows = await listDetailed(table, req, order, {
        whereSql,
        params,
        limit,
        offset,
        extraSelects,
      });

      const items = rows; // listDetailed already applies fields if provided
      res.json({ items, page, pageSize, total });
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
      const body = req.body || {};
      // Basic required fields
      if (!body.title || !String(body.title).trim()) {
        return next(BadRequest('title is required'));
      }
      // Normalize aliases from common client payloads
      if (body.email && !body.reporter_email) body.reporter_email = body.email;
      if (body.name && !body.full_name) body.full_name = body.name;
      if (body.phone && !body.phone_number) body.phone_number = body.phone;
      if (body.phoneNumber && !body.phone_number) body.phone_number = body.phoneNumber;

      // Coerce integer FKs commonly sent as strings
      const intFields = [
        'system_id','module_id','category_id','status_id','priority_id','severity_id','source_id','group_id','tier_id'
      ];
      for (const f of intFields) {
        if (Object.prototype.hasOwnProperty.call(body, f)) {
          const v = body[f];
          if (v === '' || v === null) { body[f] = null; continue; }
          const n = Number(v);
          if (Number.isFinite(n)) body[f] = Math.trunc(n);
        }
      }
      // Remove unsupported field system_category_id (belongs to other tables)
      if (Object.prototype.hasOwnProperty.call(body, 'system_category_id')) delete body.system_category_id;

      // Resolve source_id if not provided: prefer explicit source_code, otherwise default to Agent Reporting (or other predefined agent sources)
      if (body.source_id === undefined || body.source_id === null) {
        try {
          let srcRow = null;
          const explicit = body.source_code || body.source || null;
          if (explicit && String(explicit).trim()) {
            const code = String(explicit).trim().toLowerCase();
            const q = await pool.query(`SELECT id FROM sources WHERE lower(code)=$1 OR lower(name)=$1 LIMIT 1`, [code]);
            srcRow = q.rows[0] || null;
          }
          if (!srcRow) {
            // Prioritized fallback list for authenticated/internal creation
            // Defaults to Agent Reporting when available
            const fallbacks = [
              'agent_reporting','agent reporting',
              'phone_call','phone call',
              'email',
              'verbal',
              'social_media','social media',
              'community_of_practice','community of practice','cop'
            ];
            for (const token of fallbacks) {
              const q = await pool.query(`SELECT id FROM sources WHERE lower(code)=$1 OR lower(name)=$1 LIMIT 1`, [token]);
              if (q.rows[0]?.id != null) { srcRow = q.rows[0]; break; }
            }
          }
          if (srcRow && srcRow.id != null) body.source_id = srcRow.id;
        } catch (_) { /* ignore */ }
      }

      // Proceed with generic creator using the allow list
      const created = await create(table, body, allow);
      res.status(201).json(created);
    } catch (e) {
      // Translate FK violations into 400 for a clearer client message
      if (e && e.code === '23503') {
        return next(BadRequest('Invalid foreign key value', { detail: e.detail }));
      }
      next(e);
    }
  }
);

r.get(
  "/:id",
  requireAnyPermission(PERMISSIONS.TICKETS_READ, PERMISSIONS.TICKETS_MANAGE),
  async (req, res, next) => {
    try {
      const baseRow = await readDetailed(table, idCol, req.params.id, req);
      if (!baseRow) return next(NotFound("Ticket not found"));
      // Fetch attachments and attach to response
      const { rows: atts } = await pool.query(
        `SELECT id, ticket_id, file_name, file_type, file_size_bytes, storage_path, uploaded_by, uploaded_at
         FROM ticket_attachments WHERE ticket_id = $1 ORDER BY uploaded_at DESC`,
        [req.params.id]
      );
      const result = { ...baseRow, attachments_count: atts.length, attachments: atts };
      const fields = req.query.fields || null;
      const payload = fields ? pickFieldsDeep(result, fields) : result;
      res.json(payload);
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
      const { limit, offset } = parsePagination(req.query);
      const where = [`t.ticket_id = $1`];
      const params = [req.params.id];
      if (req.query.is_internal != null) {
        params.push(req.query.is_internal === 'true');
        where.push(`t.is_internal = $${params.length}`);
      }
      if (req.query.q) {
        params.push(`%${String(req.query.q).toLowerCase()}%`);
        where.push(`lower(t.body) LIKE $${params.length}`);
      }
      const whereSql = `WHERE ${where.join(' AND ')}`;
      const order = 'created_at DESC';
      const { rows: ct } = await pool.query(`SELECT count(*)::int AS c FROM ticket_notes t ${whereSql}`,[...params]);
      res.set('X-Total-Count', String(ct[0]?.c || 0));
      const rows = await import('../../../utils/relations.js').then(m=>m.listDetailed).then(fn=>fn('ticket_notes', req, order, { whereSql, params, limit, offset }));
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
      const { limit, offset } = parsePagination(req.query);
      const where = [`t.ticket_id = $1`];
      const params = [req.params.id];
      if (req.query.notify != null) { params.push(req.query.notify === 'true'); where.push(`t.notify = $${params.length}`); }
      const whereSql = `WHERE ${where.join(' AND ')}`;
      const order = 'id DESC';
      const { rows: ct } = await pool.query(`SELECT count(*)::int AS c FROM ticket_watchers t ${whereSql}`,[...params]);
      res.set('X-Total-Count', String(ct[0]?.c || 0));
      const rows = await import('../../../utils/relations.js').then(m=>m.listDetailed).then(fn=>fn('ticket_watchers', req, order, { whereSql, params, limit, offset }));
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
      const { limit, offset } = parsePagination(req.query);
      const where = [`t.ticket_id = $1`];
      const params = [req.params.id];
      if (req.query.file_type) { params.push(req.query.file_type); where.push(`t.file_type = $${params.length}`); }
      if (req.query.q) { params.push(`%${String(req.query.q).toLowerCase()}%`); where.push(`lower(t.file_name) LIKE $${params.length}`); }
      const whereSql = `WHERE ${where.join(' AND ')}`;
      const order = 'uploaded_at DESC';
      const { rows: ct } = await pool.query(`SELECT count(*)::int AS c FROM ticket_attachments t ${whereSql}`,[...params]);
      res.set('X-Total-Count', String(ct[0]?.c || 0));
      const rows = await import('../../../utils/relations.js').then(m=>m.listDetailed).then(fn=>fn('ticket_attachments', req, order, { whereSql, params, limit, offset }));
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
      const { limit, offset } = parsePagination(req.query);
      const where = [`t.ticket_id = $1`];
      const params = [req.params.id];
      if (req.query.event_type) { params.push(req.query.event_type); where.push(`t.event_type = $${params.length}`); }
      const whereSql = `WHERE ${where.join(' AND ')}`;
      const order = 'occurred_at DESC';
      const { rows: ct } = await pool.query(`SELECT count(*)::int AS c FROM ticket_events t ${whereSql}`,[...params]);
      res.set('X-Total-Count', String(ct[0]?.c || 0));
      const rows = await import('../../../utils/relations.js').then(m=>m.listDetailed).then(fn=>fn('ticket_events', req, order, { whereSql, params, limit, offset }));
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

r.put(
  "/:id/notes/:nid",
  requireAnyPermission(
    PERMISSIONS.TICKETS_NOTES_ADD,
    PERMISSIONS.TICKETS_MANAGE
  ),
  async (req, res, next) => {
    try {
      const { id, nid } = req.params;
      const fields = {};
      if (Object.prototype.hasOwnProperty.call(req.body, 'body')) fields.body = req.body.body;
      if (Object.prototype.hasOwnProperty.call(req.body, 'is_internal')) fields.is_internal = !!req.body.is_internal;
      const keys = Object.keys(fields);
      if (!keys.length) return next(BadRequest('No updatable fields provided'));
      const sets = [];
      const params = [];
      let i = 0;
      for (const k of keys) { i++; params.push(fields[k]); sets.push(`${k}=$${i}`); }
      params.push(nid); i++; // $i is nid
      params.push(id); i++;  // $i is ticket id
      const sql = `UPDATE ticket_notes SET ${sets.join(', ')} WHERE id=$${i-1} AND ticket_id=$${i} RETURNING *`;
      const { rows } = await pool.query(sql, params);
      if (!rows[0]) return next(NotFound('Note not found'));
      await pool.query(
        `INSERT INTO ticket_events (ticket_id,event_type,details) VALUES ($1,'note_updated',$2::jsonb)`,
        [id, JSON.stringify({ note_id: nid })]
      );
      res.json(rows[0]);
    } catch (e) { next(e); }
  }
);

r.delete(
  "/:id/notes/:nid",
  requireAnyPermission(
    PERMISSIONS.TICKETS_NOTES_ADD,
    PERMISSIONS.TICKETS_MANAGE
  ),
  async (req, res, next) => {
    try {
      const { id, nid } = req.params;
      const { rows } = await pool.query(
        `DELETE FROM ticket_notes WHERE id=$1 AND ticket_id=$2 RETURNING id`,
        [nid, id]
      );
      if (!rows[0]) return next(NotFound('Note not found'));
      await pool.query(
        `INSERT INTO ticket_events (ticket_id,event_type,details) VALUES ($1,'note_deleted',$2::jsonb)`,
        [id, JSON.stringify({ note_id: nid })]
      );
      res.json({ ok: true });
    } catch (e) { next(e); }
  }
);

r.put(
  "/:id/attachments/:aid",
  requireAnyPermission(
    PERMISSIONS.TICKETS_ATTACHMENTS_ADD,
    PERMISSIONS.TICKETS_MANAGE
  ),
  async (req, res, next) => {
    try {
      const { id, aid } = req.params;
      const fields = {};
      if (Object.prototype.hasOwnProperty.call(req.body, 'file_name')) fields.file_name = req.body.file_name;
      if (Object.prototype.hasOwnProperty.call(req.body, 'file_type')) fields.file_type = req.body.file_type;
      const keys = Object.keys(fields);
      if (!keys.length) return next(BadRequest('No updatable fields provided'));
      const sets = [];
      const params = [];
      let i = 0;
      for (const k of keys) { i++; params.push(fields[k]); sets.push(`${k}=$${i}`); }
      params.push(aid); i++;
      params.push(id); i++;
      const sql = `UPDATE ticket_attachments SET ${sets.join(', ')} WHERE id=$${i-1} AND ticket_id=$${i} RETURNING *`;
      const { rows } = await pool.query(sql, params);
      if (!rows[0]) return next(NotFound('Attachment not found'));
      await pool.query(
        `INSERT INTO ticket_events (ticket_id,event_type,details) VALUES ($1,'attachment_updated',$2::jsonb)`,
        [id, JSON.stringify({ attachment_id: aid })]
      );
      res.json(rows[0]);
    } catch (e) { next(e); }
  }
);

r.delete(
  "/:id/attachments/:aid",
  requireAnyPermission(
    PERMISSIONS.TICKETS_ATTACHMENTS_ADD,
    PERMISSIONS.TICKETS_MANAGE
  ),
  async (req, res, next) => {
    try {
      const { id, aid } = req.params;
      const { rows } = await pool.query(
        `DELETE FROM ticket_attachments WHERE id=$1 AND ticket_id=$2 RETURNING id`,
        [aid, id]
      );
      if (!rows[0]) return next(NotFound('Attachment not found'));
      await pool.query(
        `INSERT INTO ticket_events (ticket_id,event_type,details) VALUES ($1,'attachment_deleted',$2::jsonb)`,
        [id, JSON.stringify({ attachment_id: aid })]
      );
      res.json({ ok: true });
    } catch (e) { next(e); }
  }
);

r.put(
  "/:id/watchers/:wid",
  requireAnyPermission(
    PERMISSIONS.TICKETS_WATCHERS_ADD,
    PERMISSIONS.TICKETS_MANAGE
  ),
  async (req, res, next) => {
    try {
      const { id, wid } = req.params;
      const fields = {};
      if (Object.prototype.hasOwnProperty.call(req.body, 'notify')) fields.notify = !!req.body.notify;
      if (Object.prototype.hasOwnProperty.call(req.body, 'email')) fields.email = req.body.email;
      const keys = Object.keys(fields);
      if (!keys.length) return next(BadRequest('No updatable fields provided'));
      const sets = [];
      const params = [];
      let i = 0;
      for (const k of keys) { i++; params.push(fields[k]); sets.push(`${k}=$${i}`); }
      params.push(wid); i++;
      params.push(id); i++;
      const sql = `UPDATE ticket_watchers SET ${sets.join(', ')} WHERE id=$${i-1} AND ticket_id=$${i} RETURNING *`;
      const { rows } = await pool.query(sql, params);
      if (!rows[0]) return next(NotFound('Watcher not found'));
      res.json(rows[0]);
    } catch (e) { next(e); }
  }
);

export default r;
