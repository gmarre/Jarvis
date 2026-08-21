/**
 * Authentication: scrypt password hashing, opaque session cookies, role guards.
 *
 * No external auth dependency — node:crypto covers hashing and token
 * generation, and sessions live in the same SQLite database as everything else.
 */

const crypto = require("node:crypto");
const { db, isReadOnly } = require("./db");

const COOKIE = "spa_session";
const SESSION_DAYS = 7;
const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1, keylen: 64 };

/* ------------------------------------------------------------------ *
 * Passwords
 * ------------------------------------------------------------------ */

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const key = crypto.scryptSync(password, salt, SCRYPT_PARAMS.keylen, SCRYPT_PARAMS);
  return `scrypt$${salt}$${key.toString("hex")}`;
}

function verifyPassword(password, stored) {
  if (typeof stored !== "string") return false;
  const [scheme, salt, hex] = stored.split("$");
  if (scheme !== "scrypt" || !salt || !hex) return false;
  let key;
  try {
    key = crypto.scryptSync(password, salt, SCRYPT_PARAMS.keylen, SCRYPT_PARAMS);
  } catch {
    return false;
  }
  const expected = Buffer.from(hex, "hex");
  // timingSafeEqual throws on length mismatch — guard first.
  if (expected.length !== key.length) return false;
  return crypto.timingSafeEqual(expected, key);
}

/* ------------------------------------------------------------------ *
 * Sessions
 * ------------------------------------------------------------------ */

function createSession(userId) {
  const token = crypto.randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + SESSION_DAYS * 86400_000);
  db.prepare("INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)").run(
    token,
    userId,
    expires.toISOString(),
  );
  return { token, expires };
}

function destroySession(token) {
  if (token) db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
}

function userForToken(token) {
  if (!token) return null;
  const row = db
    .prepare(
      `SELECT u.*, s.expires_at
         FROM sessions s JOIN users u ON u.id = s.user_id
        WHERE s.token = ?`,
    )
    .get(token);
  if (!row) return null;
  if (new Date(row.expires_at) < new Date()) {
    destroySession(token);
    return null;
  }
  if (row.status !== "active") return null;
  return row;
}

/** Drops expired rows. Called on boot and hourly. */
function purgeExpiredSessions() {
  db.prepare("DELETE FROM sessions WHERE expires_at < datetime('now')").run();
}

/* ------------------------------------------------------------------ *
 * Express middleware
 * ------------------------------------------------------------------ */

/** Populates req.user when a valid session cookie is present. Never rejects. */
function attachUser(req, _res, next) {
  const token = req.cookies ? req.cookies[COOKIE] : null;
  const user = userForToken(token);
  if (user) {
    req.user = publicUser(user);
    req.sessionToken = token;
  }
  next();
}

/** Rejects unauthenticated requests with 401. */
function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: "authentication_required" });
  next();
}

/**
 * Rejects writes from read-only roles. Mount after requireAuth on any route
 * that mutates state.
 */
function requireWrite(req, res, next) {
  if (!req.user) return res.status(401).json({ error: "authentication_required" });
  if (req.user.readOnly) {
    return res.status(403).json({
      error: "read_only_role",
      message: `${req.user.role} has read-only access.`,
    });
  }
  next();
}

/** Rejects anyone who is not an Administrator. */
function requireAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ error: "authentication_required" });
  if (req.user.role !== "Administrator") {
    return res.status(403).json({ error: "admin_required" });
  }
  next();
}

/** The user shape the frontend receives — never includes the password hash. */
function publicUser(row) {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    initials: row.initials,
    role: row.role,
    status: row.status,
    readOnly: isReadOnly(row.role),
    lastAccessAt: row.last_access_at,
  };
}

function setSessionCookie(res, token, expires) {
  res.cookie(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    expires,
    // Secure requires HTTPS; enable it when the app is served over TLS.
    secure: process.env.SPA_SECURE_COOKIES === "1",
  });
}

function clearSessionCookie(res) {
  res.clearCookie(COOKIE, { httpOnly: true, sameSite: "lax" });
}

module.exports = {
  COOKIE,
  hashPassword,
  verifyPassword,
  createSession,
  destroySession,
  userForToken,
  purgeExpiredSessions,
  attachUser,
  requireAuth,
  requireWrite,
  requireAdmin,
  publicUser,
  setSessionCookie,
  clearSessionCookie,
};
