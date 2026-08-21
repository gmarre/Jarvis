/**
 * Projects: the unit the 11-step pipeline runs on.
 */

const express = require("express");
const { db, STEP_NAMES } = require("../db");
const { requireAuth, requireWrite } = require("../auth");
const audit = require("../audit");

const router = express.Router();
router.use(requireAuth);

router.get("/", (req, res) => {
  const trainId = req.query.trainId ? Number(req.query.trainId) : null;
  const rows = trainId
    ? db.prepare("SELECT * FROM projects WHERE train_id = ? ORDER BY id").all(trainId)
    : db.prepare("SELECT * FROM projects ORDER BY id").all();
  res.json({ projects: rows.map(decorate) });
});

router.post("/", requireWrite, (req, res) => {
  const b = req.body || {};
  const name = String(b.name || "").trim();
  if (!name) return res.status(400).json({ error: "name_required" });

  let trainId = b.trainId ? Number(b.trainId) : null;

  // Step 1 of the wizard can create a train inline.
  if (!trainId && b.newTrainName) {
    const trains = require("./trains");
    const info = db
      .prepare("INSERT INTO trains (name, description) VALUES (?, ?)")
      .run(String(b.newTrainName).trim(), b.newTrainDescription || null);
    trainId = info.lastInsertRowid;
    trains.createDefaultSprints(trainId, "PI 2026.1", 5);
    audit.log(req.user, "created the train", "train", String(b.newTrainName).trim());
  }

  if (trainId && !db.prepare("SELECT 1 FROM trains WHERE id = ?").get(trainId)) {
    return res.status(400).json({ error: "train_not_found" });
  }

  const info = db
    .prepare(
      `INSERT INTO projects (train_id, name, description, status, pipeline_step, safe_team)
       VALUES (?, ?, ?, 'draft', 0, ?)`,
    )
    .run(trainId, name, b.description || null, b.safeTeam || null);

  audit.log(req.user, "created the project", "project", name);
  res.status(201).json({ project: decorate(db.prepare("SELECT * FROM projects WHERE id = ?").get(info.lastInsertRowid)) });
});

router.get("/:id", (req, res) => {
  const project = db.prepare("SELECT * FROM projects WHERE id = ?").get(req.params.id);
  if (!project) return res.status(404).json({ error: "project_not_found" });
  res.json({ project: decorate(project) });
});

router.patch("/:id", requireWrite, (req, res) => {
  const project = db.prepare("SELECT * FROM projects WHERE id = ?").get(req.params.id);
  if (!project) return res.status(404).json({ error: "project_not_found" });
  const b = req.body || {};

  if (b.trainId !== undefined && b.trainId !== null && !db.prepare("SELECT 1 FROM trains WHERE id = ?").get(b.trainId)) {
    return res.status(400).json({ error: "train_not_found" });
  }

  db.prepare(
    `UPDATE projects SET name = ?, description = ?, status = ?, pipeline_step = ?,
            safe_team = ?, train_id = ? WHERE id = ?`,
  ).run(
    b.name !== undefined ? String(b.name).trim() || project.name : project.name,
    b.description !== undefined ? b.description : project.description,
    b.status !== undefined ? b.status : project.status,
    b.pipelineStep !== undefined ? clampStep(b.pipelineStep) : project.pipeline_step,
    b.safeTeam !== undefined ? b.safeTeam : project.safe_team,
    b.trainId !== undefined ? b.trainId : project.train_id,
    project.id,
  );
  audit.log(req.user, "updated the project", "project", project.name);
  res.json({ project: decorate(db.prepare("SELECT * FROM projects WHERE id = ?").get(project.id)) });
});

router.delete("/:id", requireWrite, (req, res) => {
  const project = db.prepare("SELECT * FROM projects WHERE id = ?").get(req.params.id);
  if (!project) return res.status(404).json({ error: "project_not_found" });
  db.prepare("DELETE FROM projects WHERE id = ?").run(project.id);
  audit.log(req.user, "deleted the project", "project", project.name);
  res.json({ ok: true });
});

/** Duplicates a project's structure without its generated backlog. */
router.post("/:id/duplicate", requireWrite, (req, res) => {
  const project = db.prepare("SELECT * FROM projects WHERE id = ?").get(req.params.id);
  if (!project) return res.status(404).json({ error: "project_not_found" });
  const info = db
    .prepare(
      `INSERT INTO projects (train_id, name, description, status, pipeline_step, safe_team)
       VALUES (?, ?, ?, 'draft', 0, ?)`,
    )
    .run(project.train_id, `${project.name} (copy)`, project.description, project.safe_team);
  audit.log(req.user, "duplicated the project", "project", project.name);
  res.status(201).json({ project: decorate(db.prepare("SELECT * FROM projects WHERE id = ?").get(info.lastInsertRowid)) });
});

/** Everything the sidebar needs for one project, in one round trip. */
router.get("/:id/counts", (req, res) => {
  const project = db.prepare("SELECT * FROM projects WHERE id = ?").get(req.params.id);
  if (!project) return res.status(404).json({ error: "project_not_found" });
  res.json({ counts: counts(project.id) });
});

/* ------------------------------------------------------------------ *
 * Helpers
 * ------------------------------------------------------------------ */

function clampStep(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(STEP_NAMES.length - 1, Math.round(v)));
}

function counts(projectId) {
  const one = (sql, ...args) => db.prepare(sql).get(projectId, ...args).n;
  return {
    requirements: one("SELECT COUNT(*) AS n FROM requirements WHERE project_id = ?"),
    epics: one("SELECT COUNT(*) AS n FROM epics WHERE project_id = ?"),
    features: one("SELECT COUNT(*) AS n FROM features WHERE project_id = ?"),
    stories: one("SELECT COUNT(*) AS n FROM stories WHERE project_id = ?"),
    tasks: one("SELECT COUNT(*) AS n FROM tasks WHERE project_id = ?"),
    clusters: one("SELECT COUNT(*) AS n FROM clusters WHERE project_id = ?"),
    documents: one("SELECT COUNT(*) AS n FROM documents WHERE project_id = ?"),
    // The project sidebar counts this project's own backlog dependencies.
    // Cross-project feature links are a train-level concern and are counted
    // separately on the train overview.
    dependencies: db
      .prepare(
        `SELECT COUNT(*) AS n FROM dependencies d
          WHERE d.from_type = 'story'
            AND (d.from_id IN (SELECT id FROM stories WHERE project_id = ?)
              OR d.to_id   IN (SELECT id FROM stories WHERE project_id = ?))`,
      )
      .get(projectId, projectId).n,
  };
}

function decorate(project) {
  if (!project) return null;
  const c = counts(project.id);
  const train = project.train_id
    ? db.prepare("SELECT id, name FROM trains WHERE id = ?").get(project.train_id)
    : null;
  const featureStatus = db
    .prepare("SELECT status, COUNT(*) AS n FROM features WHERE project_id = ? GROUP BY status")
    .all(project.id)
    .reduce((acc, r) => ({ ...acc, [r.status]: r.n }), {});

  return {
    id: project.id,
    name: project.name,
    description: project.description,
    status: project.status,
    safeTeam: project.safe_team,
    train: train ? { id: train.id, name: train.name } : null,
    pipelineStep: project.pipeline_step,
    stepName: STEP_NAMES[project.pipeline_step] || STEP_NAMES[0],
    stepTotal: STEP_NAMES.length,
    progress: Math.round(((project.pipeline_step + 1) / STEP_NAMES.length) * 100),
    counts: c,
    featureStatus,
    createdAt: project.created_at,
  };
}

module.exports = router;
module.exports.decorate = decorate;
module.exports.clampStep = clampStep;
