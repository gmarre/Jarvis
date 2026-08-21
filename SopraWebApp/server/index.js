/**
 * PI Planning Assistant — HTTP server.
 *
 *   node server/index.js
 *
 * Serves the API under /api and the SPA from public/. The database is created
 * and seeded on first boot, so a clean checkout needs no setup step.
 */

const path = require("node:path");
const express = require("express");
const cookieParser = require("cookie-parser");

const { db, DATA_DIR } = require("./db");
const { attachUser, purgeExpiredSessions } = require("./auth");
const parser = require("./services/parser");

const app = express();
const PORT = Number(process.env.PORT) || 4173;
const HOST = process.env.HOST || "127.0.0.1";
const PUBLIC_DIR = path.join(__dirname, "..", "public");

/* ------------------------------------------------------------------ *
 * Middleware
 * ------------------------------------------------------------------ */

app.disable("x-powered-by");
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(attachUser);

// A same-origin app: block cross-site form posts outright rather than
// carrying a CSRF token, which the SameSite=Lax cookie already mostly covers.
app.use("/api", (req, res, next) => {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  const origin = req.get("origin");
  if (origin) {
    const host = req.get("host");
    let originHost;
    try {
      originHost = new URL(origin).host;
    } catch {
      return res.status(403).json({ error: "bad_origin" });
    }
    if (originHost !== host) return res.status(403).json({ error: "cross_origin_blocked" });
  }
  next();
});

/* ------------------------------------------------------------------ *
 * API
 * ------------------------------------------------------------------ */

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    uptime: Math.round(process.uptime()),
    version: require("../package.json").version,
    dataDir: DATA_DIR,
    supportedUploads: parser.supportedExtensions(),
  });
});

app.use("/api/auth", require("./routes/auth"));
app.use("/api/trains", require("./routes/trains"));
app.use("/api/projects", require("./routes/projects"));
app.use("/api/documents", require("./routes/documents"));
app.use("/api/backlog", require("./routes/backlog"));
app.use("/api/analysis", require("./routes/analysis"));
app.use("/api/roadmap", require("./routes/roadmap"));
app.use("/api/exports", require("./routes/exports"));
app.use("/api/admin", require("./routes/admin"));

app.use("/api", (_req, res) => res.status(404).json({ error: "unknown_endpoint" }));

/* ------------------------------------------------------------------ *
 * Static app
 * ------------------------------------------------------------------ */

app.use(express.static(PUBLIC_DIR, { index: "index.html", maxAge: "1h" }));

// The design canvas and the generated per-screen pages, kept alongside the app.
app.use("/design", express.static(path.join(__dirname, "..", "app")));
app.use("/design-assets", express.static(path.join(__dirname, "..", "assets")));

// SPA fallback: anything that is not an API call or a file renders the shell.
app.get(/^\/(?!api\/).*/, (_req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "index.html"));
});

/* ------------------------------------------------------------------ *
 * Errors
 * ------------------------------------------------------------------ */

app.use((err, _req, res, _next) => {
  // Multer surfaces upload problems with a code rather than a status.
  if (err && err.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({ error: "file_too_large", limit: parser.MAX_BYTES });
  }
  if (err && err.message === "unsupported_file_type") {
    return res.status(400).json({ error: "unsupported_file_type", supported: parser.supportedExtensions() });
  }
  if (err && err.message === "expected_xlsx") {
    return res.status(400).json({ error: "expected_xlsx" });
  }

  const status = err && err.status ? err.status : 500;
  if (status >= 500) console.error("[error]", err);
  res.status(status).json({
    error: (err && err.code) || "internal_error",
    message: err && err.message ? err.message : "Unexpected error.",
  });
});

/* ------------------------------------------------------------------ *
 * Boot
 * ------------------------------------------------------------------ */

function boot() {
  purgeExpiredSessions();
  setInterval(purgeExpiredSessions, 3600_000).unref();

  // First run: populate the database so the app opens on a working project.
  const userCount = db.prepare("SELECT COUNT(*) AS n FROM users").get().n;
  if (userCount === 0) {
    console.log("[boot] empty database — seeding demo data");
    require("./seed").seed();
  }
}

if (require.main === module) {
  boot();
  app.listen(PORT, HOST, () => {
    const ai = require("./services/ai");
    console.log(`\n  PI Planning Assistant`);
    console.log(`  → http://${HOST}:${PORT}`);
    console.log(`  data: ${DATA_DIR}`);
    console.log(`  AI:   ${ai.isConfigured() ? "Claude (claude-opus-5)" : "local engine (no ANTHROPIC_API_KEY set)"}\n`);
  });
}

module.exports = { app, boot };
