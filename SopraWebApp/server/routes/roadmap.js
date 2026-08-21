/**
 * The program board: sprint capacity, feature scheduling, and auto-planning.
 */

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const express = require("express");
const multer = require("multer");

const { db, UPLOAD_DIR } = require("../db");
const { requireAuth, requireWrite } = require("../auth");
const audit = require("../audit");
const scheduler = require("../services/scheduler");
const excel = require("../services/excel");

const router = express.Router();
router.use(requireAuth);

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
    filename: (_req, file, cb) =>
      cb(null, `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${path.extname(file.originalname).toLowerCase()}`),
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = /\.xlsx?$/i.test(file.originalname);
    cb(ok ? null : Object.assign(new Error("expected_xlsx"), { status: 400 }), ok);
  },
});

/* ------------------------------------------------------------------ *
 * Board
 * ------------------------------------------------------------------ */

router.get("/:trainId/board", (req, res) => {
  const trainId = Number(req.params.trainId);
  const train = db.prepare("SELECT * FROM trains WHERE id = ?").get(trainId);
  if (!train) return res.status(404).json({ error: "train_not_found" });

  const { sprints, projects, features } = scheduler.loadTrain(trainId);
  const load = scheduler.computeLoad(trainId);
  const edges = scheduler.crossProjectEdges(trainId);

  const loadBySprintProject = new Map(load.map((l) => [`${l.sprintId}:${l.projectId}`, l]));

  const swimlanes = projects.map((p) => {
    const projectFeatures = features.filter((f) => f.project_id === p.id);
    return {
      projectId: p.id,
      projectName: p.name,
      featureCount: projectFeatures.length,
      totalPoints: projectFeatures.reduce((a, f) => a + f.points, 0),
      cells: sprints.map((s) => {
        const cell = loadBySprintProject.get(`${s.id}:${p.id}`) || { available: 0, used: 0, ratio: 0 };
        return {
          sprintId: s.id,
          available: cell.available,
          used: cell.used,
          ratio: cell.ratio,
          state: capacityState(cell.used, cell.available),
          features: projectFeatures
            .filter((f) => f.sprint_id === s.id)
            .map((f) => ({
              id: f.id,
              ref: f.ref,
              title: f.title,
              points: f.points,
              moscow: f.moscow,
              status: f.status,
              aiScheduled: Boolean(f.ai_scheduled),
            })),
        };
      }),
      unscheduled: projectFeatures
        .filter((f) => !f.sprint_id)
        .map((f) => ({ id: f.id, ref: f.ref, title: f.title, points: f.points, moscow: f.moscow, status: f.status })),
    };
  });

  // Train-level capacity totals per sprint.
  const trainCapacity = sprints.map((s) => {
    const rows = load.filter((l) => l.sprintId === s.id);
    const available = rows.reduce((a, r) => a + r.available, 0);
    const used = rows.reduce((a, r) => a + r.used, 0);
    return { sprintId: s.id, name: s.name, available, used, state: capacityState(used, available) };
  });

  res.json({
    train: { id: train.id, name: train.name, piName: train.pi_name, sprintCurrent: train.sprint_current },
    sprints: sprints.map((s) => ({
      id: s.id, name: s.name, piName: s.pi_name, startsOn: s.starts_on, endsOn: s.ends_on, position: s.position,
    })),
    swimlanes,
    trainCapacity,
    edges,
    warnings: edges.filter((e) => e.backwardInTime).map((e) => ({
      type: "backward_in_time",
      message: `${e.from.ref} is scheduled after ${e.to.ref}, which it blocks.`,
      edgeId: e.id,
    })),
  });
});

/** Drag a feature into a sprint (or out of the board). */
router.post("/features/:id/schedule", requireWrite, (req, res) => {
  const feature = db.prepare("SELECT * FROM features WHERE id = ?").get(req.params.id);
  if (!feature) return res.status(404).json({ error: "feature_not_found" });

  const sprintId = (req.body || {}).sprintId ? Number(req.body.sprintId) : null;
  if (sprintId) {
    const sprint = db.prepare("SELECT * FROM sprints WHERE id = ?").get(sprintId);
    if (!sprint) return res.status(400).json({ error: "sprint_not_found" });
    const project = db.prepare("SELECT train_id FROM projects WHERE id = ?").get(feature.project_id);
    if (!project || project.train_id !== sprint.train_id) {
      return res.status(400).json({ error: "sprint_belongs_to_another_train" });
    }
  }

  // A manual placement clears the AI flag, so auto-plan will leave it alone.
  db.prepare("UPDATE features SET sprint_id = ?, ai_scheduled = 0 WHERE id = ?").run(sprintId, feature.id);
  audit.log(req.user, sprintId ? "scheduled the feature" : "unscheduled the feature", "feature", feature.ref);
  res.json({ ok: true });
});

/** Auto-plan the train. Pass `dryRun` to preview without writing. */
router.post("/:trainId/auto-plan", requireWrite, (req, res) => {
  const trainId = Number(req.params.trainId);
  if (!db.prepare("SELECT 1 FROM trains WHERE id = ?").get(trainId)) {
    return res.status(404).json({ error: "train_not_found" });
  }
  const b = req.body || {};
  const result = scheduler.autoPlan(trainId, {
    dryRun: Boolean(b.dryRun),
    respectPinned: b.respectPinned !== false,
  });
  if (!b.dryRun) {
    audit.log(req.user, `auto-planned ${result.placed.length} features`, "train", String(trainId));
  }
  res.json(result);
});

/* ------------------------------------------------------------------ *
 * Capacity
 * ------------------------------------------------------------------ */

router.get("/:trainId/capacity", (req, res) => {
  const trainId = Number(req.params.trainId);
  res.json({ rows: scheduler.computeLoad(trainId) });
});

router.post("/:trainId/capacity", requireWrite, (req, res) => {
  const trainId = Number(req.params.trainId);
  const b = req.body || {};
  const sprintId = Number(b.sprintId);
  const projectId = Number(b.projectId);
  if (!sprintId || !projectId) return res.status(400).json({ error: "sprintId_and_projectId_required" });

  const sprint = db.prepare("SELECT * FROM sprints WHERE id = ? AND train_id = ?").get(sprintId, trainId);
  if (!sprint) return res.status(400).json({ error: "sprint_not_found" });

  db.prepare(
    `INSERT INTO capacity (sprint_id, project_id, available_points) VALUES (?, ?, ?)
     ON CONFLICT(sprint_id, project_id) DO UPDATE SET available_points = excluded.available_points`,
  ).run(sprintId, projectId, Number(b.availablePoints) || 0);

  res.json({ ok: true, rows: scheduler.computeLoad(trainId) });
});

/** Excel capacity import — screen 18. */
router.post("/:trainId/capacity/import", requireWrite, upload.single("file"), async (req, res, next) => {
  if (!req.file) return res.status(400).json({ error: "file_required" });
  const trainId = Number(req.params.trainId);

  try {
    const train = db.prepare("SELECT * FROM trains WHERE id = ?").get(trainId);
    if (!train) return res.status(404).json({ error: "train_not_found" });

    const parsed = await excel.parseCapacity(req.file.path);

    const sprints = db.prepare("SELECT * FROM sprints WHERE train_id = ? ORDER BY position, id").all(trainId);
    const projects = db.prepare("SELECT * FROM projects WHERE train_id = ? ORDER BY id").all(trainId);

    const sprintByName = new Map(sprints.map((s) => [normalise(s.name), s]));
    const projectByName = new Map(projects.map((p) => [normalise(p.name), p]));

    const applied = [];
    const unmatched = { projects: [], sprints: [] };

    for (const label of parsed.sprints) {
      if (!sprintByName.has(normalise(label))) unmatched.sprints.push(label);
    }

    const upsert = db.prepare(
      `INSERT INTO capacity (sprint_id, project_id, available_points) VALUES (?, ?, ?)
       ON CONFLICT(sprint_id, project_id) DO UPDATE SET available_points = excluded.available_points`,
    );

    db.transaction(() => {
      for (const row of parsed.rows) {
        const project = projectByName.get(normalise(row.project));
        if (!project) {
          unmatched.projects.push(row.project);
          continue;
        }
        for (const [sprintLabel, points] of Object.entries(row.values)) {
          const sprint = sprintByName.get(normalise(sprintLabel));
          if (!sprint) continue;
          upsert.run(sprint.id, project.id, points);
          applied.push({ project: project.name, sprint: sprint.name, points });
        }
      }
    })();

    audit.log(req.user, `imported capacity for ${applied.length} sprint/project pairs`, "train", train.name,
              req.file.originalname);

    res.json({
      applied: applied.length,
      pairs: applied,
      sprints: parsed.sprints,
      unmatched,
      warnings: parsed.warnings,
      sheetName: parsed.sheetName,
      rows: scheduler.computeLoad(trainId),
    });
  } catch (err) {
    if (["no_sprint_columns", "no_capacity_rows", "empty_workbook", "expected_xlsx"].includes(err.message)) {
      return res.status(400).json({ error: err.message, hint: err.hint || null });
    }
    next(err);
  } finally {
    fs.promises.unlink(req.file.path).catch(() => {});
  }
});

/** Downloads a capacity workbook pre-filled with this train's projects. */
router.get("/:trainId/capacity/template", async (req, res, next) => {
  try {
    const trainId = Number(req.params.trainId);
    const train = db.prepare("SELECT * FROM trains WHERE id = ?").get(trainId);
    if (!train) return res.status(404).json({ error: "train_not_found" });

    const projects = db.prepare("SELECT * FROM projects WHERE train_id = ? ORDER BY id").all(trainId);
    const sprints = db.prepare("SELECT * FROM sprints WHERE train_id = ? ORDER BY position, id").all(trainId);
    const buffer = await excel.buildTemplate(projects, sprints);

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="capacity-${slug(train.name)}.xlsx"`);
    res.send(Buffer.from(buffer));
  } catch (err) { next(err); }
});

/* ------------------------------------------------------------------ *
 * Helpers
 * ------------------------------------------------------------------ */

function capacityState(used, available) {
  if (available <= 0) return used > 0 ? "over" : "empty";
  const ratio = used / available;
  if (ratio > 1) return "over";
  if (ratio >= 0.9) return "near";
  return "under";
}

function normalise(s) {
  return String(s).trim().toLowerCase().replace(/\s+/g, " ");
}

function slug(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

module.exports = router;
