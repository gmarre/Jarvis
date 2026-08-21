/**
 * Audit log — every state change a human would want to trace.
 *
 * Deliberately append-only: there is no update or delete path, and the
 * Administration screen renders it read-only.
 */

const { db } = require("./db");

const insert = db.prepare(
  `INSERT INTO audit_log (user_id, actor_name, action, entity_type, entity_ref, detail)
   VALUES (?, ?, ?, ?, ?, ?)`,
);

/**
 * @param {object|null} user   req.user, or null for system actions
 * @param {string} action      verb phrase, e.g. "approved", "rejected", "imported"
 * @param {string} entityType  "story", "epic", "document", …
 * @param {string} entityRef   human reference, e.g. "US-02"
 * @param {string} [detail]    one short sentence of extra context
 */
function log(user, action, entityType, entityRef, detail = null) {
  insert.run(
    user ? user.id : null,
    user ? user.name : "System",
    action,
    entityType || null,
    entityRef || null,
    detail,
  );
}

/** Most recent entries, newest first. */
function recent(limit = 50) {
  return db
    .prepare(
      `SELECT id, actor_name, action, entity_type, entity_ref, detail, created_at
         FROM audit_log ORDER BY id DESC LIMIT ?`,
    )
    .all(limit);
}

module.exports = { log, recent };
