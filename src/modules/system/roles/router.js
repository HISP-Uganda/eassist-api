import { Router } from "express";
import { create, update, remove, read } from "../../../utils/crud.js";
import { listDetailed, readDetailed } from "../../../utils/relations.js";
import pool from "../../../db/pool.js";
import { parsePagination } from "../../../utils/pagination.js";
import {
  ALL_PERMISSIONS,
  PERMISSIONS,
} from "../../../constants/permissions.js";
import { requireAnyPermission } from "../../../middleware/auth.js";
import { BadRequest, NotFound } from "../../../utils/errors.js";

const r = Router();
const t = "roles";

// helper: slugify a role code (stable key) from name if none provided
function makeRoleCode(name) {
  return `role.${String(name || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "")}`;
}

function normalizePermissionCodes(arr) {
  if (!Array.isArray(arr)) return [];
  const out = [];
  for (const item of arr) {
    if (!item) continue;
    if (typeof item === "string") out.push(item.trim());
    else if (typeof item === "object") {
      const code = String(item.code || item.permission_code || "").trim();
      if (code) out.push(code);
    }
  }
  // unique, preserve order of first appearance
  const seen = new Set();
  return out.filter((c) => {
    if (seen.has(c)) return false;
    seen.add(c);
    return true;
  });
}

// List roles (paginated, searchable)
r.get(
  "/",
  requireAnyPermission(PERMISSIONS.SYS_ROLES_LIST, PERMISSIONS.ROLES_MANAGE),
  async (req, res, next) => {
    try {
      const { page, pageSize, offset, limit } = parsePagination(req.query);
      const params = [];
      const where = [];

      if (req.query.q) {
        params.push(`%${String(req.query.q).toLowerCase()}%`);
        // reuse same bind for name & description
        where.push(
          `(lower(name) LIKE $${params.length} OR lower(description) LIKE $${params.length})`
        );
      }

      const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

      const { rows: tot } = await pool.query(
        `SELECT count(*)::int AS c FROM ${t} ${whereSql}`,
        params
      );

      const items = await listDetailed(t, req, 'created_at DESC', {
        whereSql,
        params,
        limit,
        offset,
      });

      res.json({ items, page, pageSize, total: tot[0]?.c || 0 });
    } catch (e) {
      next(e);
    }
  }
);

// Create role (generate code if missing) + optional nested permissions
r.post(
  "/",
  requireAnyPermission(PERMISSIONS.SYS_ROLES_CREATE, PERMISSIONS.ROLES_MANAGE),
  async (req, res, next) => {
    const client = await pool.connect();
    try {
      const { name, description } = req.body || {};
      if (!name || !String(name).trim()) {
        client.release();
        return next(BadRequest("name is required"));
      }
      const code = req.body.code?.trim() || makeRoleCode(name);

      await client.query('BEGIN');
      // Insert role
      const insertSql = `INSERT INTO ${t} (code, name, description, created_at) VALUES ($1,$2,$3,$4) RETURNING *`;
      const { rows: insRows } = await client.query(insertSql, [code, name, description || null, new Date()]);
      const role = insRows[0];

      // Nested: permissions (array of codes or objects with code)
      const permCodes = normalizePermissionCodes(req.body?.permissions);
      if (permCodes.length) {
        // Validate codes
        const invalid = permCodes.filter((c) => !ALL_PERMISSIONS.includes(c));
        if (invalid.length) {
          throw BadRequest("Invalid permission codes", { invalid, allowed: ALL_PERMISSIONS });
        }
        // Bulk insert via JOIN on permissions
        await client.query(
          `INSERT INTO public.role_permissions (role_id, permission_id)
           SELECT $1, p.id FROM public.permissions p WHERE p.code = ANY($2::text[])
           ON CONFLICT DO NOTHING`,
          [role.id, permCodes]
        );
      }

      await client.query('COMMIT');
      res.status(201).json(role);
    } catch (e) {
      try { await client.query('ROLLBACK'); } catch {}
      next(e);
    } finally {
      client.release();
    }
  }
);

// Read role
r.get(
  "/:id",
  requireAnyPermission(PERMISSIONS.SYS_ROLES_READ, PERMISSIONS.ROLES_MANAGE),
  async (req, res, next) => {
    try {
      const row = await readDetailed(t, "id", req.params.id, req) || await read(t, "id", req.params.id);
      if (!row) return next(NotFound("Role not found"));
      res.json(row);
    } catch (e) {
      next(e);
    }
  }
);

// Update role (name/description; allow optional code change if provided) + optional nested permissions reconcile
r.put(
  "/:id",
  requireAnyPermission(PERMISSIONS.SYS_ROLES_UPDATE, PERMISSIONS.ROLES_MANAGE),
  async (req, res, next) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const body = { ...req.body };
      // restrict fields to those we support (updated_at handled by util)
      const fields = ["code", "name", "description"];
      // Use CRUD util (non-transactional), but we want atomicity. Do the update with client directly for atomic update.
      const setCols = fields.filter((k) => Object.prototype.hasOwnProperty.call(body, k));
      if (!setCols.length && !Array.isArray(req.body?.permissions)) {
        // No base fields or permissions to change; return current
        const { rows } = await client.query(`SELECT * FROM ${t} WHERE id=$1`, [req.params.id]);
        const cur = rows[0];
        if (!cur) return next(NotFound('Role not found'));
        await client.query('COMMIT');
        return res.json(cur);
      }
      let updated = null;
      if (setCols.length) {
        const sets = setCols.map((c, i) => `"${c}"=$${i + 1}`).join(', ');
        const args = setCols.map((c) => body[c]);
        // also update updated_at if column exists
        const { rows: colRows } = await client.query(`SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=$1 AND column_name='updated_at' LIMIT 1`, [t]);
        const sql = `UPDATE ${t} SET ${sets}${colRows.length ? ", updated_at=now()" : ""} WHERE id=$${args.length + 1} RETURNING *`;
        const { rows } = await client.query(sql, [...args, req.params.id]);
        updated = rows[0];
        if (!updated) return next(NotFound('Role not found'));
      } else {
        const { rows } = await client.query(`SELECT * FROM ${t} WHERE id=$1`, [req.params.id]);
        updated = rows[0];
        if (!updated) return next(NotFound('Role not found'));
      }

      // Reconcile permissions if provided
      if (Array.isArray(req.body?.permissions)) {
        const want = normalizePermissionCodes(req.body.permissions);
        // validate
        const invalid = want.filter((c) => !ALL_PERMISSIONS.includes(c));
        if (invalid.length) {
          throw BadRequest("Invalid permission codes", { invalid, allowed: ALL_PERMISSIONS });
        }
        // current codes for this role
        const { rows: curRows } = await client.query(
          `SELECT p.code FROM public.role_permissions rp JOIN public.permissions p ON p.id = rp.permission_id WHERE rp.role_id = $1`,
          [req.params.id]
        );
        const cur = new Set(curRows.map((r) => r.code));
        const wantSet = new Set(want);
        const toAdd = [...wantSet].filter((c) => !cur.has(c));
        const toDel = [...cur].filter((c) => !wantSet.has(c));
        if (toAdd.length) {
          await client.query(
            `INSERT INTO public.role_permissions (role_id, permission_id)
             SELECT $1, p.id FROM public.permissions p WHERE p.code = ANY($2::text[])
             ON CONFLICT DO NOTHING`,
            [req.params.id, toAdd]
          );
        }
        if (toDel.length) {
          await client.query(
            `DELETE FROM public.role_permissions
             WHERE role_id = $1 AND permission_id IN (
               SELECT id FROM public.permissions WHERE code = ANY($2::text[])
             )`,
            [req.params.id, toDel]
          );
        }
      }

      await client.query('COMMIT');
      res.json(updated);
    } catch (e) {
      try { await client.query('ROLLBACK'); } catch {}
      next(e);
    } finally {
      client.release();
    }
  }
);

// Delete role
r.delete(
  "/:id",
  requireAnyPermission(PERMISSIONS.SYS_ROLES_DELETE, PERMISSIONS.ROLES_MANAGE),
  async (req, res, next) => {
    try {
      res.json(await remove(t, "id", req.params.id));
    } catch (e) {
      next(e);
    }
  }
);

// Permissions catalog (now returns code + name + description)
r.get(
  "/permissions/catalog",
  requireAnyPermission(
    PERMISSIONS.SYS_ROLES_PERMS_LIST,
    PERMISSIONS.ROLES_MANAGE
  ),
  async (req, res, next) => {
    try {
      const { rows } = await pool.query(
        "SELECT code, name, description FROM public.permissions ORDER BY code"
      );
      res.json(rows);
    } catch (e) {
      next(e);
    }
  }
);

// List a role's permissions (FIX: join permissions; no rp.permission_name)
r.get(
  "/:id/permissions",
  requireAnyPermission(
    PERMISSIONS.SYS_ROLES_PERMS_LIST,
    PERMISSIONS.ROLES_MANAGE
  ),
  async (req, res, next) => {
    try {
      const { rows } = await pool.query(
        `SELECT p.code AS code, p.name AS name, p.description
         FROM public.role_permissions rp
         JOIN public.permissions p ON p.id = rp.permission_id
         WHERE rp.role_id = $1
         ORDER BY p.code`,
        [req.params.id]
      );
      res.json(rows);
    } catch (e) {
      next(e);
    }
  }
);

// Add a permission to a role (accept legacy 'permission_name' as "code")
r.post(
  "/:id/permissions",
  requireAnyPermission(
    PERMISSIONS.SYS_ROLES_PERMS_ADD,
    PERMISSIONS.ROLES_MANAGE
  ),
  async (req, res, next) => {
    try {
      const { permission_name, permission_code } = req.body || {};
      const code = String(permission_code || permission_name || "").trim();
      if (!code)
        return next(
          BadRequest("permission_code (or permission_name) required")
        );

      // Validate against source of truth
      if (!ALL_PERMISSIONS.includes(code)) {
        return next(
          BadRequest("Invalid permission code", { allowed: ALL_PERMISSIONS })
        );
      }

      // Insert link using permission_id looked up by code
      await pool.query(
        `INSERT INTO public.role_permissions (role_id, permission_id)
         SELECT $1, p.id
         FROM public.permissions p
         WHERE p.code = $2
         ON CONFLICT DO NOTHING`,
        [req.params.id, code]
      );

      // Return updated list
      const { rows } = await pool.query(
        `SELECT p.code AS code, p.name AS name, p.description
         FROM public.role_permissions rp
         JOIN public.permissions p ON p.id = rp.permission_id
         WHERE rp.role_id = $1
         ORDER BY p.code`,
        [req.params.id]
      );
      res.status(201).json(rows);
    } catch (e) {
      next(e);
    }
  }
);

// Remove a permission from a role (path param kept as :permission_name for b/w compat; treat as code)
r.delete(
  "/:id/permissions/:permission_name",
  requireAnyPermission(
    PERMISSIONS.SYS_ROLES_PERMS_REMOVE,
    PERMISSIONS.ROLES_MANAGE
  ),
  async (req, res, next) => {
    try {
      const code = String(req.params.permission_name || "").trim();
      if (!code || !ALL_PERMISSIONS.includes(code)) {
        return next(
          BadRequest("Invalid permission code", { allowed: ALL_PERMISSIONS })
        );
      }

      // Delete by permission_id resolved from code
      await pool.query(
        `DELETE FROM public.role_permissions
         WHERE role_id = $1
           AND permission_id = (SELECT id FROM public.permissions WHERE code = $2)`,
        [req.params.id, code]
      );

      res.json({ ok: true });
    } catch (e) {
      next(e);
    }
  }
);

export default r;
