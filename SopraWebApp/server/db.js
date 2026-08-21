/**
 * SQLite connection + schema.
 *
 * One file-backed database at data/app.db. The schema is applied on every boot
 * with CREATE TABLE IF NOT EXISTS, and versioned migrations run after it, so
 * starting the server is always enough to get a usable database.
 */

const fs = require("node:fs");
const path = require("node:path");
const Database = require("better-sqlite3");

const DATA_DIR = process.env.SPA_DATA_DIR || path.join(__dirname, "..", "data");
const DB_PATH = path.join(DATA_DIR, "app.db");
const UPLOAD_DIR = path.join(DATA_DIR, "uploads");

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

/* ------------------------------------------------------------------ *
 * Schema
 * ------------------------------------------------------------------ */

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  initials      TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'Product Owner',
  password_hash TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'active',      -- active | deactivated
  last_access_at TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  token      TEXT PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS trains (
  id           INTEGER PRIMARY KEY,
  name         TEXT NOT NULL,
  description  TEXT,
  rte          TEXT,
  pi_name      TEXT NOT NULL DEFAULT 'PI 2026.1',
  sprint_current INTEGER NOT NULL DEFAULT 1,
  sprint_count INTEGER NOT NULL DEFAULT 5,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS projects (
  id            INTEGER PRIMARY KEY,
  train_id      INTEGER REFERENCES trains(id) ON DELETE SET NULL,
  name          TEXT NOT NULL,
  description   TEXT,
  status        TEXT NOT NULL DEFAULT 'draft',       -- draft | in_review | ready
  pipeline_step INTEGER NOT NULL DEFAULT 0,          -- 0..10, indexes STEP_NAMES
  safe_team     TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS documents (
  id                INTEGER PRIMARY KEY,
  project_id        INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  train_id          INTEGER REFERENCES trains(id) ON DELETE CASCADE,
  scope             TEXT NOT NULL DEFAULT 'project', -- project | train
  filename          TEXT NOT NULL,
  mime              TEXT,
  size_bytes        INTEGER NOT NULL DEFAULT 0,
  pages             INTEGER NOT NULL DEFAULT 0,
  storage_path      TEXT,
  status            TEXT NOT NULL DEFAULT 'uploaded',-- uploaded | parsing | parsed | failed
  progress          INTEGER NOT NULL DEFAULT 0,
  sections_detected INTEGER NOT NULL DEFAULT 0,
  extracted_text    TEXT,
  error             TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS requirements (
  id           INTEGER PRIMARY KEY,
  project_id   INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  train_id     INTEGER REFERENCES trains(id) ON DELETE CASCADE,
  document_id  INTEGER REFERENCES documents(id) ON DELETE SET NULL,
  scope        TEXT NOT NULL DEFAULT 'project',      -- project | train
  ref          TEXT NOT NULL,
  title        TEXT NOT NULL,
  body         TEXT,
  epic_id      INTEGER REFERENCES epics(id) ON DELETE SET NULL,
  feature_id   INTEGER REFERENCES features(id) ON DELETE SET NULL,
  source_page  INTEGER,
  source_section TEXT,
  status       TEXT NOT NULL DEFAULT 'in_review',    -- approved | in_review | rejected
  ai_generated INTEGER NOT NULL DEFAULT 0,
  confidence   REAL,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS epics (
  id           INTEGER PRIMARY KEY,
  project_id   INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  ref          TEXT NOT NULL,
  title        TEXT NOT NULL,
  description  TEXT,
  status       TEXT NOT NULL DEFAULT 'in_review',
  ai_generated INTEGER NOT NULL DEFAULT 0,
  confidence   REAL,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS features (
  id           INTEGER PRIMARY KEY,
  project_id   INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  epic_id      INTEGER REFERENCES epics(id) ON DELETE SET NULL,
  sprint_id    INTEGER REFERENCES sprints(id) ON DELETE SET NULL,
  ref          TEXT NOT NULL,
  title        TEXT NOT NULL,
  description  TEXT,
  points       INTEGER NOT NULL DEFAULT 0,
  moscow       TEXT NOT NULL DEFAULT 'Should',       -- Must | Should | Could | Wont
  status       TEXT NOT NULL DEFAULT 'in_review',
  ai_generated INTEGER NOT NULL DEFAULT 0,
  ai_scheduled INTEGER NOT NULL DEFAULT 0,
  confidence   REAL,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS stories (
  id           INTEGER PRIMARY KEY,
  project_id   INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  feature_id   INTEGER REFERENCES features(id) ON DELETE SET NULL,
  epic_id      INTEGER REFERENCES epics(id) ON DELETE SET NULL,
  cluster_id   INTEGER REFERENCES clusters(id) ON DELETE SET NULL,
  ref          TEXT NOT NULL,
  actor        TEXT NOT NULL DEFAULT 'customer',
  want         TEXT NOT NULL,
  benefit      TEXT,
  points       INTEGER NOT NULL DEFAULT 0,
  moscow       TEXT NOT NULL DEFAULT 'Should',
  status       TEXT NOT NULL DEFAULT 'in_review',
  ai_generated INTEGER NOT NULL DEFAULT 0,
  confidence   REAL,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS acceptance_criteria (
  id         INTEGER PRIMARY KEY,
  story_id   INTEGER NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  given_txt  TEXT NOT NULL,
  when_txt   TEXT NOT NULL,
  then_txt   TEXT NOT NULL,
  position   INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS tasks (
  id         INTEGER PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  story_id   INTEGER REFERENCES stories(id) ON DELETE CASCADE,
  ref        TEXT NOT NULL,
  title      TEXT NOT NULL,
  hours      REAL NOT NULL DEFAULT 0,
  done       INTEGER NOT NULL DEFAULT 0,
  ai_generated INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS clusters (
  id          INTEGER PRIMARY KEY,
  project_id  INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  summary     TEXT,
  kind        TEXT NOT NULL DEFAULT 'cluster',       -- cluster | duplicate
  similarity  REAL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

/* Dependencies are polymorphic so the same table serves story-level,
   feature-level, and cross-project links. */
CREATE TABLE IF NOT EXISTS dependencies (
  id         INTEGER PRIMARY KEY,
  from_type  TEXT NOT NULL,                          -- story | feature
  from_id    INTEGER NOT NULL,
  to_type    TEXT NOT NULL,
  to_id      INTEGER NOT NULL,
  kind       TEXT NOT NULL DEFAULT 'blocks',         -- blocks | depends_on
  severity   TEXT NOT NULL DEFAULT 'normal',         -- normal | blocking
  note       TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (from_type, from_id, to_type, to_id, kind)
);

CREATE TABLE IF NOT EXISTS wsjf (
  id             INTEGER PRIMARY KEY,
  entity_type    TEXT NOT NULL,                      -- story | feature
  entity_id      INTEGER NOT NULL,
  business_value REAL NOT NULL DEFAULT 0,
  time_criticality REAL NOT NULL DEFAULT 0,
  risk_reduction REAL NOT NULL DEFAULT 0,
  job_size       REAL NOT NULL DEFAULT 1,
  UNIQUE (entity_type, entity_id)
);

CREATE TABLE IF NOT EXISTS sprints (
  id        INTEGER PRIMARY KEY,
  train_id  INTEGER NOT NULL REFERENCES trains(id) ON DELETE CASCADE,
  name      TEXT NOT NULL,
  pi_name   TEXT NOT NULL DEFAULT 'PI 2026.1',
  starts_on TEXT,
  ends_on   TEXT,
  position  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS capacity (
  id               INTEGER PRIMARY KEY,
  sprint_id        INTEGER NOT NULL REFERENCES sprints(id) ON DELETE CASCADE,
  project_id       INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  available_points REAL NOT NULL DEFAULT 0,
  UNIQUE (sprint_id, project_id)
);

CREATE TABLE IF NOT EXISTS export_runs (
  id         INTEGER PRIMARY KEY,
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  train_id   INTEGER REFERENCES trains(id) ON DELETE CASCADE,
  format     TEXT NOT NULL,                          -- json | csv | jira
  item_count INTEGER NOT NULL DEFAULT 0,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS audit_log (
  id          INTEGER PRIMARY KEY,
  user_id     INTEGER REFERENCES users(id) ON DELETE SET NULL,
  actor_name  TEXT,
  action      TEXT NOT NULL,
  entity_type TEXT,
  entity_ref  TEXT,
  detail      TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT
);

CREATE INDEX IF NOT EXISTS idx_projects_train      ON projects(train_id);
CREATE INDEX IF NOT EXISTS idx_requirements_epic   ON requirements(epic_id);
CREATE INDEX IF NOT EXISTS idx_requirements_feat   ON requirements(feature_id);
CREATE INDEX IF NOT EXISTS idx_requirements_project ON requirements(project_id);
CREATE INDEX IF NOT EXISTS idx_requirements_train  ON requirements(train_id, scope);
CREATE INDEX IF NOT EXISTS idx_epics_project       ON epics(project_id);
CREATE INDEX IF NOT EXISTS idx_features_project    ON features(project_id);
CREATE INDEX IF NOT EXISTS idx_features_sprint     ON features(sprint_id);
CREATE INDEX IF NOT EXISTS idx_stories_project     ON stories(project_id);
CREATE INDEX IF NOT EXISTS idx_stories_feature     ON stories(feature_id);
CREATE INDEX IF NOT EXISTS idx_tasks_story         ON tasks(story_id);
CREATE INDEX IF NOT EXISTS idx_ac_story            ON acceptance_criteria(story_id);
CREATE INDEX IF NOT EXISTS idx_deps_from           ON dependencies(from_type, from_id);
CREATE INDEX IF NOT EXISTS idx_deps_to             ON dependencies(to_type, to_id);
CREATE INDEX IF NOT EXISTS idx_audit_created       ON audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_expires    ON sessions(expires_at);
`);

/* ------------------------------------------------------------------ *
 * Migrations
 *
 * CREATE TABLE IF NOT EXISTS covers fresh databases; these cover databases
 * created by an earlier version. Each one is idempotent.
 * ------------------------------------------------------------------ */

function columnExists(table, column) {
  return db.prepare(`PRAGMA table_info(${table})`).all().some((c) => c.name === column);
}

function addColumn(table, column, definition) {
  if (!columnExists(table, column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

// Requirement → epic traceability, so an export can show where each epic came from.
addColumn("requirements", "epic_id", "INTEGER REFERENCES epics(id) ON DELETE SET NULL");
addColumn("requirements", "feature_id", "INTEGER REFERENCES features(id) ON DELETE SET NULL");

/* ------------------------------------------------------------------ *
 * Domain constants shared by the API and the UI
 * ------------------------------------------------------------------ */

/** The 11 pipeline steps, in order. `projects.pipeline_step` indexes this. */
const STEP_NAMES = [
  "Import", "Extraction", "Epics", "Features", "Stories",
  "Tasks", "Clusters", "Dependencies", "Prioritization", "Roadmap", "Review",
];

/** Sidebar labels for the project-level pipeline, in order. */
const SIDEBAR_STEPS = [
  "URD Import", "Requirements", "Epics", "Features", "User Stories",
  "Tasks", "Clusters", "Dependencies", "Prioritization", "Export",
];

const ROLES = ["Product Owner", "Business Analyst", "Scrum Master", "RTE", "Administrator"];
const MOSCOW = ["Must", "Should", "Could", "Wont"];
const STATUSES = ["approved", "in_review", "rejected"];

/** Roles that may only read. */
function isReadOnly(role) {
  return role === "Scrum Master";
}

/* ------------------------------------------------------------------ *
 * Helpers
 * ------------------------------------------------------------------ */

/**
 * Next sequential human reference (REQ-01, US-07, …) within a scope.
 *
 * `scope` is either a project id (the common case) or an explicit
 * `{ projectId }` / `{ trainId }`. Train-level requirements live in the same
 * table as project ones but must number independently, so the scope has to be
 * stated rather than inferred — a shared counter produced colliding refs.
 */
function nextRef(table, prefix, scope, pad = 2) {
  const spec = typeof scope === "object" && scope !== null ? scope : { projectId: scope };

  const clauses = [];
  const args = [];
  if ("projectId" in spec) { clauses.push("project_id IS ?"); args.push(spec.projectId ?? null); }
  if ("trainId" in spec) { clauses.push("train_id IS ?"); args.push(spec.trainId ?? null); }
  if (!clauses.length) throw new Error("nextRef: scope must name a projectId or a trainId");
  const where = `WHERE ${clauses.join(" AND ")}`;

  // Highest number already used in this scope, whatever order rows were made in.
  const existing = db.prepare(`SELECT ref FROM ${table} ${where}`).all(...args).map((r) => r.ref);
  const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`^${escaped}-(\\d+)$`);

  let n = 0;
  for (const ref of existing) {
    const m = ref && ref.match(pattern);
    if (m) n = Math.max(n, parseInt(m[1], 10));
  }

  const taken = new Set(existing);
  let candidate = `${prefix}-${String(n + 1).padStart(pad, "0")}`;
  let guard = n + 1;
  while (taken.has(candidate)) candidate = `${prefix}-${String(++guard).padStart(pad, "0")}`;
  return candidate;
}

function getSetting(key, fallback = null) {
  const row = db.prepare("SELECT value FROM settings WHERE key = ?").get(key);
  return row ? row.value : fallback;
}

function setSetting(key, value) {
  db.prepare(
    "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
  ).run(key, value == null ? null : String(value));
}

module.exports = {
  db,
  DATA_DIR,
  DB_PATH,
  UPLOAD_DIR,
  STEP_NAMES,
  SIDEBAR_STEPS,
  ROLES,
  MOSCOW,
  STATUSES,
  isReadOnly,
  nextRef,
  getSetting,
  setSetting,
};
