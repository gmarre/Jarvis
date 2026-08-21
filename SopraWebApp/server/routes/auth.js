/**
 * Auth routes: sign in, sign out, current session.
 */

const express = require("express");
const { db } = require("../db");
const {
  verifyPassword, createSession, destroySession, publicUser,
  setSessionCookie, clearSessionCookie, requireAuth,
} = require("../auth");
const audit = require("../audit");

const router = express.Router();

/** Who am I? Used by the SPA on boot to decide login vs app. */
router.get("/me", (req, res) => {
  res.json({ user: req.user || null });
});

router.post("/login", (req, res) => {
  const email = String((req.body && req.body.email) || "").trim().toLowerCase();
  const password = String((req.body && req.body.password) || "");

  if (!email || !password) {
    return res.status(400).json({ error: "missing_credentials" });
  }

  const row = db.prepare("SELECT * FROM users WHERE lower(email) = ?").get(email);

  // Same response whether the account is missing or the password is wrong, so
  // the endpoint cannot be used to enumerate accounts.
  if (!row || !verifyPassword(password, row.password_hash)) {
    return res.status(401).json({ error: "invalid_credentials" });
  }
  if (row.status !== "active") {
    return res.status(403).json({ error: "account_deactivated" });
  }

  const { token, expires } = createSession(row.id);
  db.prepare("UPDATE users SET last_access_at = datetime('now') WHERE id = ?").run(row.id);
  setSessionCookie(res, token, expires);
  audit.log(publicUser(row), "signed in", "user", row.email);

  res.json({ user: publicUser(row) });
});

router.post("/logout", (req, res) => {
  if (req.sessionToken) destroySession(req.sessionToken);
  clearSessionCookie(res);
  res.json({ ok: true });
});

/** Change your own password. */
router.post("/password", requireAuth, (req, res) => {
  const current = String((req.body && req.body.currentPassword) || "");
  const next = String((req.body && req.body.newPassword) || "");
  if (next.length < 8) {
    return res.status(400).json({ error: "password_too_short", message: "Use at least 8 characters." });
  }
  const row = db.prepare("SELECT * FROM users WHERE id = ?").get(req.user.id);
  if (!verifyPassword(current, row.password_hash)) {
    return res.status(401).json({ error: "invalid_credentials" });
  }
  const { hashPassword } = require("../auth");
  db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(hashPassword(next), req.user.id);
  audit.log(req.user, "changed their password", "user", row.email);
  res.json({ ok: true });
});

module.exports = router;
