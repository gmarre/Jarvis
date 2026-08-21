/**
 * Trains: the top-level grouping. A train owns projects, sprints, shared
 * (train-level) requirements, and the roadmap.
 */

const express = require("express");
const { db, STEP_NAMES } = require("../db");
const { requireAuth, requireWrite } = require("../auth");
const audit = require("../audit");
const scheduler = require("../services/scheduler");

const router = express.Router();
router.use(requireAuth);

/* ------------------------------------------------------------------ *
 * Collection
 * ------------------------------------------------------------------ */

router.get("/", (_req, res) => {
  const trains = db.prepare("SELECT * FROM trains ORDER BY id").all();
  res.json({ trains: trains.map(decorate) });
});

router.post("/", requireWrite, (req, res) => {
  const body = req.body || {};
  const name = String(body.name || "").trim();
  if (!name) return res.status(400).json({ error: "name_required" });

  const info = db
    .prepare(
      `INSERT INTO trains (name, description, rte, pi_name, sprint_current, sprint_count)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(
      name,
      body.description || null,
      body.rte || null,
      body.piName || "PI 2026.1",
      Number(body.sprintCurrent) || 1,
      Number(body.sprintCount) || 5,
    );

  const trainId = info.lastInsertRowid;
  createDefaultSprints(trainId, body.piName || "PI 2026.1", Number(body.sprintCount) || 5);
  audit.log(req.user, "created the train", "train", name);
  res.status(201).json({ train: decorate(db.prepare("SELECT * FROM trains WHERE id = ?").get(trainId)) });
});

/* ------------------------------------------------------------------ *
 * One train
 * ------------------------------------------------------------------ */

router.get("/:id", (req, res) => {
  const train = db.prepare("SELECT * FROM trains WHERE id = ?").get(req.params.id);
  if (!train) return res.status(404).json({ error: "train_not_found" });
  res.json({ train: decorate(train) });
});

router.patch("/:id", requireWrite, (req, res) => {
  const train = db.prepare("SELECT * FROM trains WHERE id = ?").get(req.params.id);
  if (!train) return res.status(404).json({ error: "train_not_found" });

  const b = req.body || {};
  db.prepare(
    `UPDATE trains SET name = ?, description = ?, rte = ?, pi_name = ?,
            sprint_current = ?, sprint_count = ? WHERE id = ?`,
  ).run(
    b.name !== undefined ? String(b.name).trim() || train.name : train.name,
    b.description !== undefined ? b.description : train.description,
    b.rte !== undefined ? b.rte : train.rte,
    b.piName !== undefined ? b.piName : train.pi_name,
    b.sprintCurrent !== undefined ? Number(b.sprintCurrent) : train.sprint_current,
    b.sprintCount !== undefined ? Number(b.sprintCount) : train.sprint_count,
    train.id,
  );
  audit.log(req.user, "updated the train", "train", train.name);
  res.json({ train: decorate(db.prepare("SELECT * FROM trains WHERE id = ?").get(train.id)) });
});

router.delete("/:id", requireWrite, (req, res) => {
  const train = db.prepare("SELECT * FROM trains WHERE id = ?").get(req.params.id);
  if (!train) return res.status(404).json({ error: "train_not_found" });
  const projects = db.prepare("SELECT COUNT(*) AS n FROM projects WHERE train_id = ?").get(train.id).n;
  if (projects > 0) {
    return res.status(409).json({
      error: "train_not_empty",
      message: `${projects} project${projects > 1 ? "s are" : " is"} still assigned to this train.`,
    });
  }
  db.prepare("DELETE FROM trains WHERE id = ?").run(train.id);
  scheduler.invalidateSprintCache(train.id);
  audit.log(req.user, "deleted the train", "train", train.name);
  res.json({ ok: true });
});

/* ------------------------------------------------------------------ *
 * Overview — the dashboard payload for screen 02
 * ------------------------------------------------------------------ */

router.get("/:id/overview", (req, res) => {
  const train = db.prepare("SELECT * FROM trains WHERE id = ?").get(req.params.id);
  if (!train) return res.status(404).json({ error: "train_not_found" });

  const projects = db.prepare("SELECT * FROM projects WHERE train_id = ? ORDER BY id").all(train.id);
  const projectCards = projects.map((p) => {
    const features = db
      .prepare("SELECT status, COUNT(*) AS n FROM features WHERE project_id = ? GROUP BY status")
      .all(p.id);
    const total = features.reduce((a, r) => a + r.n, 0);
    const by = Object.fromEntries(features.map((r) => [r.status, r.n]));
    return {
      id: p.id,
      name: p.name,
      featureCount: total,
      approved: by.approved || 0,
      inReview: by.in_review || 0,
      rejected: by.rejected || 0,
      step: p.pipeline_step,
      stepName: STEP_NAMES[p.pipeline_step] || STEP_NAMES[0],
      progress: Math.round(((p.pipeline_step + 1) / STEP_NAMES.length) * 100),
      exported: p.pipeline_step >= STEP_NAMES.length - 1,
    };
  });

  const sharedRequirements = db
    .prepare(
      `SELECT r.*,
              (SELECT COUNT(DISTINCT p.id) FROM projects p WHERE p.train_id = r.train_id) AS project_count
         FROM requirements r
        WHERE r.train_id = ? AND r.scope = 'train'
        ORDER BY r.id`,
    )
    .all(train.id);

  const matrix = crossProjectMatrix(train.id, projects);
  const featureTotals = db
    .prepare(
      `SELECT COUNT(*) AS n, COALESCE(SUM(points), 0) AS pts
         FROM features WHERE project_id IN (SELECT id FROM projects WHERE train_id = ?)`,
    )
    .get(train.id);

  const approvalPct = approvalPercentage(train.id);

  // Capacity load is reported for the PI in flight, not for every sprint the
  // train has ever had — a future PI's empty sprints would dilute it to noise.
  const currentPiSprints = new Set(
    db.prepare("SELECT id FROM sprints WHERE train_id = ? AND pi_name = ?")
      .all(train.id, train.pi_name)
      .map((s) => s.id),
  );
  const load = scheduler.computeLoad(train.id);
  const piLoad = load.filter((r) => currentPiSprints.has(r.sprintId));
  const totalAvailable = piLoad.reduce((a, r) => a + r.available, 0);
  const totalUsed = piLoad.reduce((a, r) => a + r.used, 0);

  res.json({
    train: decorate(train),
    stats: {
      projects: projects.length,
      features: featureTotals.n,
      featurePoints: featureTotals.pts,
      sharedRequirements: sharedRequirements.length,
      crossProjectDeps: matrix.total,
      blockingDeps: matrix.blocking,
      approvalPct,
      capacityPct: totalAvailable > 0 ? Math.round((totalUsed / totalAvailable) * 100) : 0,
    },
    projects: projectCards,
    sharedRequirements: sharedRequirements.map((r) => ({
      id: r.id,
      ref: r.ref,
      title: r.title,
      status: r.status,
      projectCount: r.project_count,
    })),
    matrix,
  });
});

/* ------------------------------------------------------------------ *
 * Sprints
 * ------------------------------------------------------------------ */

router.get("/:id/sprints", (req, res) => {
  const sprints = db
    .prepare("SELECT * FROM sprints WHERE train_id = ? ORDER BY position, id")
    .all(req.params.id);
  res.json({ sprints });
});

router.post("/:id/sprints", requireWrite, (req, res) => {
  const train = db.prepare("SELECT * FROM trains WHERE id = ?").get(req.params.id);
  if (!train) return res.status(404).json({ error: "train_not_found" });
  const b = req.body || {};
  const position =
    db.prepare("SELECT COALESCE(MAX(position), -1) + 1 AS p FROM sprints WHERE train_id = ?").get(train.id).p;
  const info = db
    .prepare("INSERT INTO sprints (train_id, name, pi_name, starts_on, ends_on, position) VALUES (?, ?, ?, ?, ?, ?)")
    .run(
      train.id,
      String(b.name || `Sprint ${position + 1}`),
      b.piName || train.pi_name,
      b.startsOn || null,
      b.endsOn || null,
      position,
    );
  scheduler.invalidateSprintCache(train.id);
  res.status(201).json({ sprint: db.prepare("SELECT * FROM sprints WHERE id = ?").get(info.lastInsertRowid) });
});

/* ------------------------------------------------------------------ *
 * Helpers
 * ------------------------------------------------------------------ */

function decorate(train) {
  if (!train) return null;
  const projectCount = db.prepare("SELECT COUNT(*) AS n FROM projects WHERE train_id = ?").get(train.id).n;
  // Sprints in the PI currently in flight — a sprint belonging to the next PI
  // is not part of "Sprint 2 of 5".
  const sprintCount = db
    .prepare("SELECT COUNT(*) AS n FROM sprints WHERE train_id = ? AND pi_name = ?")
    .get(train.id, train.pi_name).n;
  const sharedRequirements = db
    .prepare("SELECT COUNT(*) AS n FROM requirements WHERE train_id = ? AND scope = 'train'")
    .get(train.id).n;
  return {
    id: train.id,
    name: train.name,
    description: train.description,
    rte: train.rte,
    piName: train.pi_name,
    sprintCurrent: train.sprint_current,
    sprintCount: sprintCount || train.sprint_count,
    projectCount,
    sharedRequirements,
    createdAt: train.created_at,
  };
}

function createDefaultSprints(trainId, piName, count) {
  const insert = db.prepare(
    "INSERT INTO sprints (train_id, name, pi_name, position) VALUES (?, ?, ?, ?)",
  );
  db.transaction(() => {
    for (let i = 0; i < count; i++) insert.run(trainId, `Sprint ${i + 1}`, piName, i);
  })();
  scheduler.invalidateSprintCache(trainId);
}

/** Rows block columns — the dependency matrix on the overview screen. */
function crossProjectMatrix(trainId, projects) {
  const ids = projects.map((p) => p.id);
  if (!ids.length) return { projects: [], cells: [], total: 0, blocking: 0 };

  const rows = db
    .prepare(
      `SELECT d.severity, ff.project_id AS from_project, tf.project_id AS to_project
         FROM dependencies d
         JOIN features ff ON ff.id = d.from_id AND d.from_type = 'feature'
         JOIN features tf ON tf.id = d.to_id   AND d.to_type   = 'feature'
        WHERE ff.project_id IN (${ids.map(() => "?").join(",")})
          AND tf.project_id IN (${ids.map(() => "?").join(",")})`,
    )
    .all(...ids, ...ids);

  const cells = [];
  let total = 0;
  let blocking = 0;
  for (const from of projects) {
    for (const to of projects) {
      if (from.id === to.id) {
        cells.push({ from: from.id, to: to.id, count: null, blocking: false });
        continue;
      }
      const matching = rows.filter((r) => r.from_project === from.id && r.to_project === to.id);
      const isBlocking = matching.some((r) => r.severity === "blocking");
      if (matching.length) {
        total += matching.length;
        if (isBlocking) blocking += matching.filter((r) => r.severity === "blocking").length;
      }
      cells.push({
        from: from.id,
        to: to.id,
        count: matching.length || 0,
        blocking: isBlocking,
      });
    }
  }
  return { projects: projects.map((p) => ({ id: p.id, name: p.name })), cells, total, blocking };
}

/** Share of backlog items that have been approved, across the train. */
function approvalPercentage(trainId) {
  const row = db
    .prepare(
      `SELECT
         (SELECT COUNT(*) FROM stories  WHERE project_id IN (SELECT id FROM projects WHERE train_id = ?)) +
         (SELECT COUNT(*) FROM features WHERE project_id IN (SELECT id FROM projects WHERE train_id = ?)) AS total,
         (SELECT COUNT(*) FROM stories  WHERE status = 'approved' AND project_id IN (SELECT id FROM projects WHERE train_id = ?)) +
         (SELECT COUNT(*) FROM features WHERE status = 'approved' AND project_id IN (SELECT id FROM projects WHERE train_id = ?)) AS approved`,
    )
    .get(trainId, trainId, trainId, trainId);
  return row.total > 0 ? Math.round((row.approved / row.total) * 100) : 0;
}

module.exports = router;
module.exports.createDefaultSprints = createDefaultSprints;
