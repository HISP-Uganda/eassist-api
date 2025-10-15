import { Router } from "express";
import { update, remove, read } from "../../../utils/crud.js";
import pool from "../../../db/pool.js";
import bcrypt from "bcryptjs";
import { parsePagination } from "../../../utils/pagination.js";
import { requireAnyPermission } from "../../../middleware/auth.js";
import { getUserPermissions } from "../../../middleware/auth.js";
import { PERMISSIONS } from "../../../constants/permissions.js";
import { BadRequest } from "../../../utils/errors.js";
import { listDetailed, readDetailed } from "../../../utils/relations.js";
import { queueMessage } from "../../../utils/messaging.js";
const r = Router();
const t = "users";

function scrub(row) {
  if (!row) return row;
  const { password_hash, ...rest } = row;
  return rest;
}

async function userHasAgentRole(userId) {
  const q = await pool.query(
    `SELECT 1
     FROM user_roles ur
     JOIN roles r ON r.id = ur.role_id
     WHERE ur.user_id = $1 AND (lower(r.code) = 'agent' OR lower(r.name) = 'agent')
     LIMIT 1`,
    [userId]
  );
  return q.rowCount > 0;
}

async function resolveRoleId(input) {
  if (!input) return null;
  // UUID format
  if (typeof input === 'string' && /^[0-9a-fA-F-]{36}$/.test(input)) return input;
  const val = typeof input === 'string' ? input : (input.id || input.code || input.name);
  if (!val) return null;
  const byId = await pool.query(`SELECT id FROM roles WHERE id::text = $1`, [val]);
  if (byId.rowCount) return byId.rows[0].id;
  const byCode = await pool.query(`SELECT id FROM roles WHERE lower(code) = lower($1)`, [val]);
  if (byCode.rowCount) return byCode.rows[0].id;
  const byName = await pool.query(`SELECT id FROM roles WHERE lower(name) = lower($1)`, [val]);
  if (byName.rowCount) return byName.rows[0].id;
  return null;
}

async function resolveTierId(input) {
  if (!input) return null;
  if (typeof input === 'string' && /^[0-9]+$/.test(input)) return Number(input);
  if (typeof input === 'object' && (input.id != null)) return Number(input.id);
  const val = typeof input === 'string' ? input : (input.name);
  if (!val) return null;
  const byId = await pool.query(`SELECT id FROM agent_tiers WHERE id::text = $1`, [val]);
  if (byId.rowCount) return byId.rows[0].id;
  const byName = await pool.query(`SELECT id FROM agent_tiers WHERE lower(name) = lower($1)`, [val]);
  if (byName.rowCount) return byName.rows[0].id;
  return null;
}

async function resolveGroupId(input) {
  if (!input) return null;
  if (typeof input === 'string' && /^[0-9]+$/.test(input)) return Number(input);
  if (typeof input === 'object' && (input.id != null)) return Number(input.id);
  const val = typeof input === 'string' ? input : (input.name);
  if (!val) return null;
  const byId = await pool.query(`SELECT id FROM agent_groups WHERE id::text = $1`, [val]);
  if (byId.rowCount) return byId.rows[0].id;
  const byName = await pool.query(`SELECT id FROM agent_groups WHERE lower(name) = lower($1)`, [val]);
  if (byName.rowCount) return byName.rows[0].id;
  return null;
}

// Permissions catalog (alias under users module) — define BEFORE '/:id'
r.get(
  "/permissions",
  requireAnyPermission(
    PERMISSIONS.SYS_ROLES_PERMS_LIST,
    PERMISSIONS.ROLES_MANAGE,
    PERMISSIONS.USERS_MANAGE
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

// Effective permissions for a specific user — define BEFORE '/:id'
r.get(
  "/:id/permissions",
  requireAnyPermission(
    PERMISSIONS.SYS_ROLES_PERMS_LIST,
    PERMISSIONS.ROLES_MANAGE,
    PERMISSIONS.USERS_MANAGE
  ),
  async (req, res, next) => {
    try {
      const perms = await getUserPermissions(req.params.id);
      res.json(perms);
    } catch (e) {
      next(e);
    }
  }
);

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

      const items = await listDetailed(t, req, 'created_at DESC', {
        whereSql,
        params,
        limit,
        offset,
      });

      res.json({
        items: items.map(scrub),
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
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
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
      const cols = Object.keys(body).filter((k) => allowed.includes(k));
      if (!cols.length) return next(BadRequest('No valid columns provided for insert'));
      const colNames = cols.map((c) => `"${c}"`).join(',');
      const vals = cols.map((_, i) => `$${i + 1}`).join(',');
      const ins = await client.query(
        `INSERT INTO ${t} (${colNames}) VALUES (${vals}) RETURNING *`,
        cols.map((c) => body[c])
      );
      const user = ins.rows[0];

      // Nested: roles
      const rolesIn = Array.isArray(req.body.roles) ? req.body.roles : [];
      const roleIds = [];
      for (const rInput of rolesIn) {
        // eslint-disable-next-line no-await-in-loop
        const rid = await resolveRoleId(rInput);
        if (rid) roleIds.push(rid);
      }
      // Ensure Agent role if tiers/support_groups provided
      const wantsTiers = Array.isArray(req.body.tiers) && req.body.tiers.length;
      const wantsGroups = Array.isArray(req.body.support_groups) && req.body.support_groups.length;
      if ((wantsTiers || wantsGroups) && !roleIds.length) {
        // try to resolve 'agent'
        const agentQ = await client.query(`SELECT id FROM roles WHERE lower(code)='agent' OR lower(name)='agent' LIMIT 1`);
        if (agentQ.rowCount) roleIds.push(agentQ.rows[0].id);
      }
      if (roleIds.length) {
        await client.query(
          `INSERT INTO user_roles (user_id, role_id) SELECT $1, x FROM unnest($2::uuid[]) x ON CONFLICT DO NOTHING`,
          [user.id, roleIds]
        );
      }

      // Nested: tiers (only if Agent)
      if (wantsTiers) {
        // Enforce single-tier policy
        const arr = Array.isArray(req.body.tiers) ? req.body.tiers : [];
        if (arr.length > 1) return next(BadRequest('A user can belong to only one support tier. Provide a single tier.'));
        const isAgent = roleIds.length ? true : await userHasAgentRole(user.id);
        if (!isAgent) return next(BadRequest('User must have Agent role to assign tiers'));
        const tid = await resolveTierId(arr[0]);
        if (tid == null) return next(BadRequest('Invalid tier reference'));
        // Replace any existing tier membership with the new one
        await client.query(`DELETE FROM agent_tier_members WHERE user_id=$1`, [user.id]);
        await client.query(
          `INSERT INTO agent_tier_members (tier_id, user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
          [Number(tid), user.id]
        );
      }

      // Nested: support groups (agent groups)
      if (wantsGroups) {
        const isAgent = roleIds.length ? true : await userHasAgentRole(user.id);
        if (!isAgent) return next(BadRequest('User must have Agent role to assign support groups'));
        const groupIds = [];
        for (const gInput of req.body.support_groups) {
          // eslint-disable-next-line no-await-in-loop
          const gid = await resolveGroupId(gInput);
          if (gid != null) groupIds.push(Number(gid));
        }
        if (groupIds.length) {
          for (const gid of groupIds) {
            // eslint-disable-next-line no-await-in-loop
            await client.query(
              `INSERT INTO agent_group_members (group_id, user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
              [gid, user.id]
            );
          }
        }
      }

      await client.query('COMMIT');
      // Re-fetch enriched user with nested relations/collections and projection support
      let enriched = null;
      try {
        enriched = await readDetailed(t, 'id', user.id, req);
      } catch (_) {}
      return res.status(201).json(scrub(enriched || user));
    } catch (e) {
      try { await client.query('ROLLBACK'); } catch {}
      next(e);
    } finally {
      client.release();
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
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
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
      const baseCols = Object.keys(body).filter((k) => allowed.includes(k));
      let updated = null;
      if (baseCols.length) {
        updated = await update(t, "id", req.params.id, body, allowed);
      } else {
        // read current when only nested changes are requested
        const { rows } = await client.query(`SELECT * FROM ${t} WHERE id=$1`, [req.params.id]);
        updated = rows[0];
        if (!updated) return next(BadRequest('User not found'));
      }

      // Reconcile nested roles if provided
      let rolesChanged = false;
      if (Array.isArray(req.body.roles)) {
        const wantRoleIds = [];
        for (const rInput of req.body.roles) {
          // eslint-disable-next-line no-await-in-loop
          const rid = await resolveRoleId(rInput);
          if (rid) wantRoleIds.push(rid);
        }
        // current
        const curQ = await client.query(`SELECT role_id FROM user_roles WHERE user_id=$1`, [req.params.id]);
        const cur = new Set(curQ.rows.map(r=>String(r.role_id)));
        const want = new Set(wantRoleIds.map(String));
        const toAdd = [...want].filter(id => !cur.has(id));
        const toDel = [...cur].filter(id => !want.has(id));
        rolesChanged = toAdd.length > 0 || toDel.length > 0;
        if (toAdd.length) {
          await client.query(
            `INSERT INTO user_roles (user_id, role_id) SELECT $1, x FROM unnest($2::uuid[]) x ON CONFLICT DO NOTHING`,
            [req.params.id, toAdd]
          );
        }
        if (toDel.length) {
          await client.query(
            `DELETE FROM user_roles WHERE user_id=$1 AND role_id = ANY($2::uuid[])`,
            [req.params.id, toDel]
          );
        }
      }

      // Ensure Agent role if tiers/support_groups provided and user lacks it
      const hasTiersUpdate = Array.isArray(req.body.tiers);
      const hasGroupsUpdate = Array.isArray(req.body.support_groups);
      if (hasTiersUpdate || hasGroupsUpdate) {
        let isAgent = await userHasAgentRole(req.params.id);
        if (!isAgent) {
          const agentQ = await client.query(`SELECT id FROM roles WHERE lower(code)='agent' OR lower(name)='agent' LIMIT 1`);
          if (agentQ.rowCount) {
            await client.query(
              `INSERT INTO user_roles (user_id, role_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
              [req.params.id, agentQ.rows[0].id]
            );
            isAgent = true;
          } else if (hasTiersUpdate || hasGroupsUpdate) {
            return next(BadRequest('Agent role is required to manage tiers/support groups'));
          }
        }
      }

      // Reconcile tiers if provided
      if (Array.isArray(req.body.tiers)) {
        const arr = req.body.tiers;
        if (arr.length > 1) return next(BadRequest('A user can belong to only one support tier. Provide at most one.'));
        if (arr.length === 0) {
          await client.query(`DELETE FROM agent_tier_members WHERE user_id=$1`, [req.params.id]);
        } else {
          const tid = await resolveTierId(arr[0]);
          if (tid == null) return next(BadRequest('Invalid tier reference'));
          // Replace set with exactly this one
          await client.query(`DELETE FROM agent_tier_members WHERE user_id=$1 AND tier_id <> $2`, [req.params.id, Number(tid)]);
          await client.query(
            `INSERT INTO agent_tier_members (tier_id,user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
            [Number(tid), req.params.id]
          );
        }
      }

      // Reconcile support groups if provided
      if (Array.isArray(req.body.support_groups)) {
        const wantGroupIds = [];
        for (const gInput of req.body.support_groups) {
          // eslint-disable-next-line no-await-in-loop
          const gid = await resolveGroupId(gInput);
          if (gid != null) wantGroupIds.push(Number(gid));
        }
        const curQ = await client.query(`SELECT group_id FROM agent_group_members WHERE user_id=$1`, [req.params.id]);
        const cur = new Set(curQ.rows.map(r=>Number(r.group_id)));
        const want = new Set(wantGroupIds.map(Number));
        const toAdd = [...want].filter(id => !cur.has(id));
        const toDel = [...cur].filter(id => !want.has(id));
        for (const gid of toAdd) {
          // eslint-disable-next-line no-await-in-loop
          await client.query(`INSERT INTO agent_group_members (group_id,user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [gid, req.params.id]);
        }
        if (toDel.length) {
          await client.query(`DELETE FROM agent_group_members WHERE user_id=$1 AND group_id = ANY($2::int[])`, [req.params.id, toDel]);
        }
      }

      await client.query('COMMIT');

      // Best-effort: notify user on role changes
      try {
        if (rolesChanged) {
          const uq = await pool.query(`SELECT email FROM users WHERE id=$1`, [req.params.id]);
          const email = uq.rows[0]?.email || null;
          if (email) {
            await queueMessage({ channel: 'EMAIL', to_email: email, template_code: 'PERMISSIONS_UPDATED', subject: 'Your permissions have changed', body: 'Your roles/permissions were updated.' });
          }
          await queueMessage({ channel: 'IN_APP', to_user_id: req.params.id, template_code: 'PERMISSIONS_UPDATED', subject: 'Permissions updated', body: 'Your roles/permissions were updated.' });
        }
      } catch {}

      // Re-fetch enriched user with nested relations/collections and projection support
      let enriched = null;
      try {
        enriched = await readDetailed(t, 'id', req.params.id, req);
      } catch (_) {}
      res.json(scrub(enriched || updated));
    } catch (e) {
      try { await client.query('ROLLBACK'); } catch {}
      next(e);
    } finally {
      client.release();
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

// User tier memberships (requires Agent role)
r.get(
  "/:id/tiers",
  requireAnyPermission(PERMISSIONS.SYS_USERS_TIERS_READ, PERMISSIONS.USERS_MANAGE),
  async (req, res, next) => {
    try {
      const { rows } = await pool.query(
        `SELECT at.* FROM agent_tier_members tm JOIN agent_tiers at ON at.id = tm.tier_id WHERE tm.user_id = $1 ORDER BY at.name ASC`,
        [req.params.id]
      );
      res.json(rows);
    } catch (e) { next(e); }
  }
);
r.post(
  "/:id/tiers",
  requireAnyPermission(PERMISSIONS.SYS_USERS_TIERS_ADD, PERMISSIONS.USERS_MANAGE),
  async (req, res, next) => {
    try {
      const isAgent = await userHasAgentRole(req.params.id);
      if (!isAgent) return next(BadRequest('User must have Agent role to set a tier'));
      const tid = await resolveTierId(req.body.tier_id || req.body.tier || req.body.tier_name);
      if (tid == null) return next(BadRequest('tier_id (or tier name) required'));
      // Replace any existing tier with the new one
      await pool.query(`DELETE FROM agent_tier_members WHERE user_id=$1`, [req.params.id]);
      await pool.query(
        `INSERT INTO agent_tier_members (tier_id, user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
        [Number(tid), req.params.id]
      );
      const { rows } = await pool.query(
        `SELECT at.* FROM agent_tier_members tm JOIN agent_tiers at ON at.id = tm.tier_id WHERE tm.user_id = $1 ORDER BY at.name ASC`,
        [req.params.id]
      );
      res.status(201).json(rows);
    } catch (e) { next(e); }
  }
);
r.delete(
  "/:id/tiers/:tierId",
  requireAnyPermission(PERMISSIONS.SYS_USERS_TIERS_REMOVE, PERMISSIONS.USERS_MANAGE),
  async (req, res, next) => {
    try {
      await pool.query(
        `DELETE FROM agent_tier_members WHERE user_id = $1 AND tier_id = $2`,
        [req.params.id, Number(req.params.tierId)]
      );
      res.json({ ok: true });
    } catch (e) { next(e); }
  }
);

// User support-group memberships (agent groups)
r.get(
  "/:id/support-groups",
  requireAnyPermission(PERMISSIONS.SYS_USERS_SUPPORT_GROUPS_READ, PERMISSIONS.USERS_MANAGE),
  async (req, res, next) => {
    try {
      const { rows } = await pool.query(
        `SELECT ag.* FROM agent_group_members gm JOIN agent_groups ag ON ag.id = gm.group_id WHERE gm.user_id = $1 ORDER BY ag.name ASC`,
        [req.params.id]
      );
      res.json(rows);
    } catch (e) { next(e); }
  }
);
r.post(
  "/:id/support-groups",
  requireAnyPermission(PERMISSIONS.SYS_USERS_SUPPORT_GROUPS_ADD, PERMISSIONS.USERS_MANAGE),
  async (req, res, next) => {
    try {
      const isAgent = await userHasAgentRole(req.params.id);
      if (!isAgent) return next(BadRequest('User must have Agent role to add support groups'));
      const gid = await resolveGroupId(req.body.group_id || req.body.group || req.body.group_name);
      if (gid == null) return next(BadRequest('group_id (or group name) required'));
      await pool.query(
       `INSERT INTO agent_group_members (group_id, user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
        [Number(gid), req.params.id]
      );
      const { rows } = await pool.query(
        `SELECT ag.* FROM agent_group_members gm JOIN agent_groups ag ON ag.id = gm.group_id WHERE gm.user_id = $1 ORDER BY ag.name ASC`,
        [req.params.id]
      );
      res.status(201).json(rows);
    } catch (e) { next(e); }
  }
);
r.delete(
  "/:id/support-groups/:groupId",
  requireAnyPermission(PERMISSIONS.SYS_USERS_SUPPORT_GROUPS_REMOVE, PERMISSIONS.USERS_MANAGE),
  async (req, res, next) => {
    try {
      await pool.query(
        `DELETE FROM agent_group_members WHERE user_id = $1 AND group_id = $2`,
        [req.params.id, Number(req.params.groupId)]
      );
      res.json({ ok: true });
    } catch (e) { next(e); }
  }
);


export default r;
