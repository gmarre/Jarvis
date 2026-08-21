/**
 * Export — the approval gate at the end of the pipeline.
 */

const express = require("express");
const { db, STEP_NAMES } = require("../db");
const { requireAuth, requireWrite } = require("../auth");
const audit = require("../audit");
const exporter = require("../services/exporter");
const { advanceStep } = require("./backlog");

const router = express.Router();
router.use(requireAuth);

/** What is still unapproved, and therefore what the gate would drop. */
router.get("/:projectId/readiness", (req, res) => {
  const projectId = Number(req.params.projectId);
  const project = db.prepare("SELECT * FROM projects WHERE id = ?").get(projectId);
  if (!project) return res.status(404).json({ error: "project_not_found" });

  const readiness = exporter.readiness(projectId);
  const history = db
    .prepare(
      `SELECT e.*, u.name AS user_name FROM export_runs e
         LEFT JOIN users u ON u.id = e.created_by
        WHERE e.project_id = ? ORDER BY e.id DESC LIMIT 10`,
    )
    .all(projectId);

  res.json({
    project: { id: project.id, name: project.name, status: project.status },
    ...readiness,
    history: history.map((h) => ({
      id: h.id, format: h.format, itemCount: h.item_count,
      user: h.user_name, createdAt: h.created_at,
    })),
  });
});

/** Preview the payload without recording an export run. */
router.get("/:projectId/preview", (req, res) => {
  const projectId = Number(req.params.projectId);
  try {
    const payload = exporter.collect(projectId, {
      includeInReview: req.query.includeInReview === "1",
      includeRejected: req.query.includeRejected === "1",
    });
    res.json({ payload });
  } catch (err) {
    if (err.status === 404) return res.status(404).json({ error: "project_not_found" });
    throw err;
  }
});

/**
 * Download the backlog.
 *
 * `format` is json | csv | jira. Recording the run is what marks the project
 * exported and advances it to the final pipeline step.
 */
router.get("/:projectId/download", requireWrite, (req, res) => {
  const projectId = Number(req.params.projectId);
  const format = String(req.query.format || "json").toLowerCase();
  if (!["json", "csv", "jira"].includes(format)) {
    return res.status(400).json({ error: "invalid_format" });
  }

  let payload;
  try {
    payload = exporter.collect(projectId, {
      includeInReview: req.query.includeInReview === "1",
      includeRejected: req.query.includeRejected === "1",
    });
  } catch (err) {
    if (err.status === 404) return res.status(404).json({ error: "project_not_found" });
    throw err;
  }

  const itemCount =
    payload.counts.epics + payload.counts.features + payload.counts.stories + payload.counts.tasks;

  db.prepare(
    "INSERT INTO export_runs (project_id, train_id, format, item_count, created_by) VALUES (?, ?, ?, ?, ?)",
  ).run(
    projectId,
    db.prepare("SELECT train_id FROM projects WHERE id = ?").get(projectId).train_id,
    format,
    itemCount,
    req.user.id,
  );
  advanceStep(projectId, STEP_NAMES.length - 1);
  audit.log(req.user, `exported ${itemCount} items as ${format.toUpperCase()}`, "project", payload.project.name);

  const base = slug(payload.project.name) || "backlog";

  if (format === "csv") {
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${base}-backlog.csv"`);
    // BOM so Excel opens the UTF-8 file with the right encoding.
    return res.send("﻿" + exporter.toCsv(payload));
  }

  const body = format === "jira"
    ? exporter.toJira(payload, { projectKey: String(req.query.projectKey || "PI").toUpperCase() })
    : payload;

  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${base}-${format}.json"`);
  res.send(JSON.stringify(body, null, 2));
});

function slug(s) {
  return String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

module.exports = router;
