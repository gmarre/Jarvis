/**
 * Administration — users, AI configuration, audit log.
 *
 * Everything here is Administrator-only except the AI status probe, which the
 * pipeline screens use to decide whether to show the "AI generated" badge or
 * the offline-engine notice.
 */

const express = require("express");
const { db, ROLES, setSetting, getSetting } = require("../db");
const { requireAuth, requireAdmin, requireWrite, hashPassword, publicUser } = require("../auth");
const audit = require("../audit");
const ai = require("../services/ai");

const router = express.Router();
router.use(requireAuth);

/* ------------------------------------------------------------------ *
 * AI status — readable by any signed-in user
 * ------------------------------------------------------------------ */

router.get("/ai/status", (_req, res) => {
  res.json(ai.status());
});

/* ------------------------------------------------------------------ *
 * Users
 * ------------------------------------------------------------------ */

router.get("/users", requireAdmin, (_req, res) => {
  const users = db.prepare("SELECT * FROM users ORDER BY id").all();
  res.json({ users: users.map(publicUser), roles: ROLES });
});

router.post("/users", requireAdmin, (req, res) => {
  const b = req.body || {};
  const email = String(b.email || "").trim().toLowerCase();
  const name = String(b.name || "").trim();
  const password = String(b.password || "");

  if (!email || !name) return res.status(400).json({ error: "email_and_name_required" });
  if (password.length < 8) {
    return res.status(400).json({ error: "password_too_short", message: "Use at least 8 characters." });
  }
  if (b.role && !ROLES.includes(b.role)) return res.status(400).json({ error: "invalid_role" });
  if (db.prepare("SELECT 1 FROM users WHERE lower(email) = ?").get(email)) {
    return res.status(409).json({ error: "email_taken" });
  }

  const info = db
    .prepare("INSERT INTO users (email, name, initials, role, password_hash) VALUES (?, ?, ?, ?, ?)")
    .run(email, name, b.initials || initialsOf(name), b.role || "Product Owner", hashPassword(password));

  audit.log(req.user, "invited the user", "user", email);
  res.status(201).json({ user: publicUser(db.prepare("SELECT * FROM users WHERE id = ?").get(info.lastInsertRowid)) });
});

router.patch("/users/:id", requireAdmin, (req, res) => {
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.params.id);
  if (!user) return res.status(404).json({ error: "user_not_found" });
  const b = req.body || {};
  if (b.role && !ROLES.includes(b.role)) return res.status(400).json({ error: "invalid_role" });

  // Never let the last active administrator lose access — that locks everyone out.
  const losingAdmin =
    user.role === "Administrator" &&
    ((b.role && b.role !== "Administrator") || b.status === "deactivated");
  if (losingAdmin) {
    const others = db
      .prepare("SELECT COUNT(*) AS n FROM users WHERE role = 'Administrator' AND status = 'active' AND id != ?")
      .get(user.id).n;
    if (others === 0) return res.status(409).json({ error: "last_administrator" });
  }

  db.prepare("UPDATE users SET name = ?, initials = ?, role = ?, status = ? WHERE id = ?").run(
    b.name !== undefined ? String(b.name).trim() || user.name : user.name,
    b.initials !== undefined ? b.initials : user.initials,
    b.role !== undefined ? b.role : user.role,
    b.status !== undefined ? (b.status === "deactivated" ? "deactivated" : "active") : user.status,
    user.id,
  );

  if (b.status === "deactivated") {
    db.prepare("DELETE FROM sessions WHERE user_id = ?").run(user.id);
    audit.log(req.user, "deactivated the account", "user", user.email);
  } else if (b.role && b.role !== user.role) {
    audit.log(req.user, `changed the role to ${b.role}`, "user", user.email);
  } else {
    audit.log(req.user, "updated the user", "user", user.email);
  }

  res.json({ user: publicUser(db.prepare("SELECT * FROM users WHERE id = ?").get(user.id)) });
});

router.post("/users/:id/password", requireAdmin, (req, res) => {
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.params.id);
  if (!user) return res.status(404).json({ error: "user_not_found" });
  const password = String((req.body || {}).password || "");
  if (password.length < 8) return res.status(400).json({ error: "password_too_short" });

  db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(hashPassword(password), user.id);
  db.prepare("DELETE FROM sessions WHERE user_id = ?").run(user.id);
  audit.log(req.user, "reset the password", "user", user.email);
  res.json({ ok: true });
});

/* ------------------------------------------------------------------ *
 * AI configuration
 * ------------------------------------------------------------------ */

router.get("/ai/config", requireAdmin, (_req, res) => {
  res.json({
    provider: getSetting("ai_provider", "Anthropic"),
    model: getSetting("ai_model", ai.MODEL),
    minConfidence: Number(getSetting("ai_min_confidence", "0.7")),
    keyPreview: ai.maskKey(getSetting("anthropic_api_key") || process.env.ANTHROPIC_API_KEY || null),
    keySource: getSetting("anthropic_api_key")
      ? "settings"
      : process.env.ANTHROPIC_API_KEY
        ? "environment"
        : null,
    configured: ai.isConfigured(),
    engine: ai.isConfigured() ? "claude" : "local",
  });
});

router.put("/ai/config", requireAdmin, requireWrite, (req, res) => {
  const b = req.body || {};
  if (b.provider !== undefined) setSetting("ai_provider", b.provider);
  if (b.model !== undefined) setSetting("ai_model", b.model || ai.MODEL);
  if (b.minConfidence !== undefined) {
    const v = Number(b.minConfidence);
    if (!Number.isFinite(v) || v < 0 || v > 1) return res.status(400).json({ error: "invalid_confidence" });
    setSetting("ai_min_confidence", String(v));
  }
  // An empty string clears the stored key and falls back to the environment.
  if (b.apiKey !== undefined) {
    setSetting("anthropic_api_key", String(b.apiKey).trim() || null);
    audit.log(req.user, b.apiKey ? "updated the AI API key" : "cleared the AI API key", "settings", "ai");
  }

  audit.log(req.user, "updated the AI configuration", "settings", "ai");
  res.json({
    provider: getSetting("ai_provider", "Anthropic"),
    model: getSetting("ai_model", ai.MODEL),
    minConfidence: Number(getSetting("ai_min_confidence", "0.7")),
    configured: ai.isConfigured(),
    engine: ai.isConfigured() ? "claude" : "local",
  });
});

/* ------------------------------------------------------------------ *
 * Audit log
 * ------------------------------------------------------------------ */

router.get("/audit", requireAdmin, (req, res) => {
  const limit = Math.min(500, Number(req.query.limit) || 50);
  res.json({ entries: audit.recent(limit) });
});

function initialsOf(name) {
  return String(name)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("") || "??";
}

module.exports = router;
