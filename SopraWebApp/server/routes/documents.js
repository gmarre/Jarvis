/**
 * URD import: upload, parse, and AI extraction of requirements.
 *
 * Parsing runs inline on upload (documents are capped at 25 MB, so this stays
 * well inside a request), and the row records progress so the Import screen can
 * show the same parsing state the design mocks up.
 */

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const express = require("express");
const multer = require("multer");

const { db, UPLOAD_DIR, nextRef } = require("../db");
const { requireAuth, requireWrite } = require("../auth");
const audit = require("../audit");
const parser = require("../services/parser");
const ai = require("../services/ai");
const { advanceStep } = require("./backlog");

const router = express.Router();
router.use(requireAuth);

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${ext}`);
    },
  }),
  limits: { fileSize: parser.MAX_BYTES },
  fileFilter: (_req, file, cb) => {
    if (!parser.isSupported(file.originalname)) {
      return cb(Object.assign(new Error("unsupported_file_type"), { status: 400 }));
    }
    cb(null, true);
  },
});

/* ------------------------------------------------------------------ *
 * List / read
 * ------------------------------------------------------------------ */

router.get("/", (req, res) => {
  const where = [];
  const args = [];
  if (req.query.projectId) { where.push("project_id = ?"); args.push(Number(req.query.projectId)); }
  if (req.query.trainId) { where.push("train_id = ?"); args.push(Number(req.query.trainId)); }
  const sql = `SELECT * FROM documents${where.length ? ` WHERE ${where.join(" AND ")}` : ""} ORDER BY id DESC`;
  res.json({ documents: db.prepare(sql).all(...args).map(map) });
});

router.get("/:id", (req, res) => {
  const doc = db.prepare("SELECT * FROM documents WHERE id = ?").get(req.params.id);
  if (!doc) return res.status(404).json({ error: "document_not_found" });
  const item = map(doc);
  item.excerpt = doc.extracted_text ? parser.excerpt(doc.extracted_text) : null;
  res.json({ document: item });
});

/** Full extracted text — used by the source pane on the Requirements screen. */
router.get("/:id/text", (req, res) => {
  const doc = db.prepare("SELECT * FROM documents WHERE id = ?").get(req.params.id);
  if (!doc) return res.status(404).json({ error: "document_not_found" });
  res.json({ text: doc.extracted_text || "", pages: doc.pages });
});

/* ------------------------------------------------------------------ *
 * Upload
 * ------------------------------------------------------------------ */

router.post("/", requireWrite, upload.single("file"), async (req, res, next) => {
  if (!req.file) return res.status(400).json({ error: "file_required" });

  const b = req.body || {};
  const projectId = b.projectId ? Number(b.projectId) : null;
  const trainId = b.trainId ? Number(b.trainId) : null;
  const scope = b.scope === "train" ? "train" : "project";

  if (scope === "project" && !projectId) {
    await safeUnlink(req.file.path);
    return res.status(400).json({ error: "projectId_required" });
  }
  if (scope === "train" && !trainId) {
    await safeUnlink(req.file.path);
    return res.status(400).json({ error: "trainId_required" });
  }

  const info = db
    .prepare(
      `INSERT INTO documents (project_id, train_id, scope, filename, mime, size_bytes, storage_path, status, progress)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'parsing', 0)`,
    )
    .run(projectId, trainId, scope, req.file.originalname, req.file.mimetype,
         req.file.size, req.file.path);
  const id = info.lastInsertRowid;

  try {
    const parsed = await parser.parse(req.file.path, req.file.originalname);
    db.prepare(
      `UPDATE documents SET status = 'parsed', progress = 100, pages = ?,
              sections_detected = ?, extracted_text = ? WHERE id = ?`,
    ).run(parsed.pages, parsed.sections, parsed.text, id);

    if (projectId) advanceStep(projectId, 0);
    audit.log(req.user, "imported the document", "document", req.file.originalname,
              `${parsed.words} words, ${parsed.sections} sections`);

    const doc = db.prepare("SELECT * FROM documents WHERE id = ?").get(id);
    const item = map(doc);
    item.excerpt = parser.excerpt(parsed.text);
    res.status(201).json({ document: item });
  } catch (err) {
    db.prepare("UPDATE documents SET status = 'failed', error = ? WHERE id = ?")
      .run(err.message || "parse_failed", id);
    if (err.message === "file_too_large" || err.message === "unsupported_file_type" || err.message === "no_text_extracted") {
      return res.status(400).json({ error: err.message, documentId: id });
    }
    next(err);
  }
});

/* ------------------------------------------------------------------ *
 * AI extraction
 * ------------------------------------------------------------------ */

/** Document text → requirements. This is pipeline step 1. */
router.post("/:id/extract", requireWrite, async (req, res, next) => {
  try {
    const doc = db.prepare("SELECT * FROM documents WHERE id = ?").get(req.params.id);
    if (!doc) return res.status(404).json({ error: "document_not_found" });
    if (!doc.extracted_text) {
      return res.status(400).json({ error: "document_not_parsed", message: "The document has no extracted text." });
    }

    const project = doc.project_id
      ? db.prepare("SELECT * FROM projects WHERE id = ?").get(doc.project_id)
      : null;

    const result = await ai.extractRequirements(doc.extracted_text, {
      projectName: project ? project.name : "",
      limit: Number((req.body || {}).limit) || 60,
    });

    const isTrainScope = doc.scope === "train";
    const scope = isTrainScope ? { trainId: doc.train_id } : { projectId: doc.project_id };
    const prefix = isTrainScope ? "TR-REQ" : "REQ";

    const created = [];
    db.transaction(() => {
      if ((req.body || {}).replace) {
        db.prepare("DELETE FROM requirements WHERE document_id = ?").run(doc.id);
      }
      const insert = db.prepare(
        `INSERT INTO requirements (project_id, train_id, document_id, scope, ref, title, body,
                                   source_section, source_page, status, ai_generated, confidence)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'in_review', 1, ?)`,
      );
      for (const r of result.requirements) {
        const ref = nextRef("requirements", prefix, scope);
        const id = insert.run(
          doc.project_id, doc.train_id, doc.id, doc.scope, ref,
          r.title, r.body || null, r.section || null, r.page || null, r.confidence ?? null,
        ).lastInsertRowid;
        created.push(id);
      }
      if (doc.project_id) advanceStep(doc.project_id, 1);
    })();

    audit.log(req.user, `extracted ${created.length} requirements with the ${result.engine} engine`,
              "document", doc.filename);

    const rows = created.length
      ? db.prepare(`SELECT * FROM requirements WHERE id IN (${created.map(() => "?").join(",")}) ORDER BY id`).all(...created)
      : [];

    res.json({
      items: rows.map(mapRequirement),
      engine: result.engine,
      reason: result.reason || null,
      aiConfigured: ai.isConfigured(),
    });
  } catch (err) { next(err); }
});

router.delete("/:id", requireWrite, async (req, res) => {
  const doc = db.prepare("SELECT * FROM documents WHERE id = ?").get(req.params.id);
  if (!doc) return res.status(404).json({ error: "document_not_found" });
  db.prepare("DELETE FROM documents WHERE id = ?").run(doc.id);
  if (doc.storage_path) await safeUnlink(doc.storage_path);
  audit.log(req.user, "deleted the document", "document", doc.filename);
  res.json({ ok: true });
});

/* ------------------------------------------------------------------ *
 * Helpers
 * ------------------------------------------------------------------ */

async function safeUnlink(p) {
  try {
    await fs.promises.unlink(p);
  } catch {
    // The file may already be gone; deleting the row is what matters.
  }
}

function map(d) {
  return {
    id: d.id,
    projectId: d.project_id,
    trainId: d.train_id,
    scope: d.scope,
    filename: d.filename,
    mime: d.mime,
    sizeBytes: d.size_bytes,
    sizeLabel: humanSize(d.size_bytes),
    pages: d.pages,
    status: d.status,
    progress: d.progress,
    sectionsDetected: d.sections_detected,
    error: d.error,
    createdAt: d.created_at,
    requirementCount: db
      .prepare("SELECT COUNT(*) AS n FROM requirements WHERE document_id = ?")
      .get(d.id).n,
  };
}

function mapRequirement(r) {
  return {
    id: r.id,
    ref: r.ref,
    title: r.title,
    body: r.body,
    section: r.source_section,
    page: r.source_page,
    scope: r.scope,
    status: r.status,
    aiGenerated: Boolean(r.ai_generated),
    confidence: r.confidence,
  };
}

function humanSize(bytes) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const value = bytes / Math.pow(1024, i);
  return `${value >= 10 || i === 0 ? Math.round(value) : value.toFixed(1)} ${units[i]}`;
}

module.exports = router;
