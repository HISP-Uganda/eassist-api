import { Router } from "express";
import { create, update, remove, read } from "../../../utils/crud.js";
import pool from "../../../db/pool.js";
import bcrypt from "bcryptjs";
import { parsePagination } from "../../../utils/pagination.js";
import { requireAnyPermission } from "../../../middleware/auth.js";
import { PERMISSIONS } from "../../../constants/permissions.js";
import { BadRequest } from "../../../utils/errors.js";
const r = Router();
const t = "users";

function scrub(row) {
  if (!row) return row;
  const { password_hash, ...rest } = row;
  return rest;
}

r.get(
  "/",
  requireAnyPermission(PERMISSIONS.SYS_USERS_LIST, PERMISSIONS.USERS_MANAGE),
  async (req, res, next) => {
    try {
      const { page, pageSize, offset, limit } = parsePagination(req.query);
      const params = [];
      const where = [];
      if (req.query.q) {
        params.push(`%${(req.query.q || "").toLowerCase()}%`);
        where.push(
          `(lower(email) LIKE $${params.length} OR lower(full_name) LIKE $${params.length})`
        );
      }
      const whereSql = where.length ? "WHERE " + where.join(" AND ") : "";
      const { rows: tot } = await pool.query(
        `SELECT count(*)::int c FROM ${t} ${whereSql}`,
        params
      );
      const { rows } = await pool.query(
        `SELECT * FROM ${t} ${whereSql} ORDER BY created_at DESC LIMIT $${
          params.length + 1
        } OFFSET $${params.length + 2}`,
        [...params, limit, offset]
      );
      res.json({
        items: rows.map(scrub),
        page,
        pageSize,
        total: tot[0]?.c || 0,
      });
    } catch (e) {
      next(e);
    }
  }
);

r.post(
  "/",
  requireAnyPermission(PERMISSIONS.SYS_USERS_CREATE, PERMISSIONS.USERS_MANAGE),
  async (req, res, next) => {
    try {
      const body = { ...req.body };
      if (body.password) {
        body.password_hash = await bcrypt.hash(body.password, 10);
        delete body.password;
      }
      const allowed = [
        "email",
        "full_name",
        "password_hash",
        "phone",
        "is_active",
        "created_at",
      ];
      const row = await create(t, body, allowed);
      res.status(201).json(scrub(row));
    } catch (e) {
      next(e);
    }
  }
);

r.get(
  "/:id",
  requireAnyPermission(PERMISSIONS.SYS_USERS_READ, PERMISSIONS.USERS_MANAGE),
  async (req, res, next) => {
    try {
      // Prefer the centralized detailed reader when available
      const enriched = await import('../../../utils/relations.js')
        .then(m => m.readDetailed)
        .then(fn => fn(t, 'id', req.params.id, req))
        .catch(() => null);
      if (enriched) return res.json(scrub(enriched));

      // Fallback to the regular read(...) behavior
      const row = await read(t, "id", req.params.id);
      if (!row) return res.status(404).json({ error: "Not found" });
      res.json(scrub(row));
    } catch (e) {
      next(e);
    }
  }
);

r.put(
  "/:id",
  requireAnyPermission(PERMISSIONS.SYS_USERS_UPDATE, PERMISSIONS.USERS_MANAGE),
  async (req, res, next) => {
    try {
      const body = { ...req.body };
      if (body.password) {
        body.password_hash = await bcrypt.hash(body.password, 10);
        delete body.password;
      }
      const allowed = [
        "email",
        "full_name",
        "password_hash",
        "phone",
        "is_active",
        "created_at",
      ];
      const row = await update(t, "id", req.params.id, body, allowed);
      res.json(scrub(row));
    } catch (e) {
      next(e);
    }
  }
);

r.delete(
  "/:id",
  requireAnyPermission(PERMISSIONS.SYS_USERS_DELETE, PERMISSIONS.USERS_MANAGE),
  async (a, b, c) => {
    try {
      b.json(await remove(t, "id", a.params.id));
    } catch (e) {
      c(e);
    }
  }
);

// User role assignments
r.get(
  "/:id/roles",
  requireAnyPermission(PERMISSIONS.SYS_USERS_READ, PERMISSIONS.USERS_MANAGE),
  async (req, res, next) => {
    try {
      const { rows } = await pool.query(
        `SELECT r.* FROM user_roles ur JOIN roles r ON r.id=ur.role_id WHERE ur.user_id=$1 ORDER BY r.name ASC`,
        [req.params.id]
      );
      res.json(rows);
    } catch (e) {
      next(e);
    }
  }
);
r.post(
  "/:id/roles",
  requireAnyPermission(
    PERMISSIONS.SYS_USERS_ROLES_ASSIGN,
    PERMISSIONS.USERS_MANAGE
  ),
  async (req, res, next) => {
    try {
      let roleId = req.body.role_id || null;
      if (!roleId && req.body.role_name) {
        const q = await pool.query("SELECT id FROM roles WHERE name=$1", [
          req.body.role_name,
        ]);
        roleId = q.rows[0]?.id;
      }
      if (!roleId)
        return res.status(400).json({ error: "role_id or role_name required" });
      await pool.query(
        "INSERT INTO user_roles (user_id, role_id) VALUES ($1,$2) ON CONFLICT DO NOTHING",
        [req.params.id, roleId]
      );
      const { rows } = await pool.query(
        "SELECT r.* FROM user_roles ur JOIN roles r ON r.id=ur.role_id WHERE ur.user_id=$1 ORDER BY r.name",
        [req.params.id]
      );
      res.status(201).json(rows);
    } catch (e) {
      next(e);
    }
  }
);
r.delete(
  "/:id/roles/:roleId",
  requireAnyPermission(
    PERMISSIONS.SYS_USERS_ROLES_REMOVE,
    PERMISSIONS.USERS_MANAGE
  ),
  async (req, res, next) => {
    try {
      // basic validation: ensure roleId looks like a uuid
      const roleId = req.params.roleId;
      if (!/^[-0-9a-fA-F]{36}$/.test(roleId)) return next(BadRequest('Invalid role id'));
      await pool.query(
        "DELETE FROM user_roles WHERE user_id=$1 AND role_id=$2",
        [req.params.id, req.params.roleId]
      );
      res.json({ ok: true });
    } catch (e) {
      next(e);
    }
  }
);

export default r;
