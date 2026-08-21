/**
 * The three analysis steps that operate on an existing backlog:
 * clustering (step 6), dependencies (step 7), prioritisation (step 8).
 */

const express = require("express");
const { db, MOSCOW } = require("../db");
const { requireAuth, requireWrite } = require("../auth");
const audit = require("../audit");
const ai = require("../services/ai");
const { advanceStep, criteriaFor } = require("./backlog");

const router = express.Router();
router.use(requireAuth);

/* ================================================================== *
 * Clusters
 * ================================================================== */

router.get("/clusters", (req, res) => {
  const projectId = Number(req.query.projectId);
  if (!projectId) return res.status(400).json({ error: "projectId_required" });

  const clusters = db.prepare("SELECT * FROM clusters WHERE project_id = ? ORDER BY id").all(projectId);
  const stories = db.prepare("SELECT * FROM stories WHERE project_id = ? ORDER BY id").all(projectId);

  const byCluster = new Map();
  for (const s of stories) {
    if (!s.cluster_id) continue;
    if (!byCluster.has(s.cluster_id)) byCluster.set(s.cluster_id, []);
    byCluster.get(s.cluster_id).push(s);
  }

  res.json({
    clusters: clusters.map((c) => ({
      id: c.id,
      name: c.name,
      summary: c.summary,
      kind: c.kind,
      similarity: c.similarity,
      stories: (byCluster.get(c.id) || []).map(shortStory),
    })),
    ungrouped: stories.filter((s) => !s.cluster_id).map(shortStory),
  });
});

router.post("/clusters/generate", requireWrite, async (req, res, next) => {
  try {
    const projectId = Number((req.body || {}).projectId);
    const project = db.prepare("SELECT * FROM projects WHERE id = ?").get(projectId);
    if (!project) return res.status(404).json({ error: "project_not_found" });

    const stories = db
      .prepare("SELECT * FROM stories WHERE project_id = ? AND status != 'rejected' ORDER BY id")
      .all(projectId);
    if (stories.length < 2) {
      return res.status(400).json({ error: "not_enough_stories", message: "Clustering needs at least two stories." });
    }

    const result = await ai.clusterStories(stories, { projectName: project.name });
    const byRef = new Map(stories.map((s) => [s.ref, s]));
    const duplicates = [];

    db.transaction(() => {
      db.prepare("UPDATE stories SET cluster_id = NULL WHERE project_id = ?").run(projectId);
      db.prepare("DELETE FROM clusters WHERE project_id = ?").run(projectId);

      for (const c of result.clusters) {
        const dupSet = new Set(c.duplicateRefs || []);
        const id = db
          .prepare("INSERT INTO clusters (project_id, name, summary, kind) VALUES (?, ?, ?, ?)")
          .run(projectId, c.name, c.summary || null, dupSet.size ? "duplicate" : "cluster").lastInsertRowid;

        for (const ref of c.storyRefs || []) {
          const s = byRef.get(ref);
          if (!s) continue;
          db.prepare("UPDATE stories SET cluster_id = ? WHERE id = ?").run(id, s.id);
          if (dupSet.has(ref)) duplicates.push(ref);
        }
      }
      advanceStep(projectId, 6);
    })();

    audit.log(req.user, `grouped ${stories.length} stories into ${result.clusters.length} clusters (${result.engine} engine)`,
              "project", project.name);
    res.json({ clusters: result.clusters.length, duplicates, engine: result.engine, reason: result.reason || null });
  } catch (err) { next(err); }
});

/** Moves one story between clusters (drag-and-drop on the Clusters screen). */
router.post("/clusters/assign", requireWrite, (req, res) => {
  const b = req.body || {};
  const story = db.prepare("SELECT * FROM stories WHERE id = ?").get(Number(b.storyId));
  if (!story) return res.status(404).json({ error: "story_not_found" });
  const clusterId = b.clusterId ? Number(b.clusterId) : null;
  if (clusterId && !db.prepare("SELECT 1 FROM clusters WHERE id = ?").get(clusterId)) {
    return res.status(400).json({ error: "cluster_not_found" });
  }
  db.prepare("UPDATE stories SET cluster_id = ? WHERE id = ?").run(clusterId, story.id);
  audit.log(req.user, clusterId ? "moved to another cluster" : "removed from its cluster", "story", story.ref);
  res.json({ ok: true });
});

/* ================================================================== *
 * Dependencies
 * ================================================================== */

router.get("/dependencies", (req, res) => {
  const projectId = req.query.projectId ? Number(req.query.projectId) : null;
  const trainId = req.query.trainId ? Number(req.query.trainId) : null;

  const rows = db.prepare("SELECT * FROM dependencies ORDER BY id").all();
  const resolved = rows.map(resolveDependency).filter(Boolean);

  const filtered = resolved.filter((d) => {
    if (projectId) return d.from.projectId === projectId || d.to.projectId === projectId;
    if (trainId) return d.from.trainId === trainId || d.to.trainId === trainId;
    return true;
  });

  res.json({
    dependencies: filtered,
    counts: {
      total: filtered.length,
      blocking: filtered.filter((d) => d.severity === "blocking").length,
      crossProject: filtered.filter((d) => d.crossProject).length,
    },
  });
});

router.post("/dependencies", requireWrite, (req, res) => {
  const b = req.body || {};
  const fromType = b.fromType === "feature" ? "feature" : "story";
  const toType = b.toType === "feature" ? "feature" : "story";
  const fromId = Number(b.fromId);
  const toId = Number(b.toId);

  if (!fromId || !toId) return res.status(400).json({ error: "fromId_and_toId_required" });
  if (fromType === toType && fromId === toId) {
    return res.status(400).json({ error: "self_dependency" });
  }
  if (!exists(fromType, fromId) || !exists(toType, toId)) {
    return res.status(400).json({ error: "endpoint_not_found" });
  }

  try {
    const info = db
      .prepare(
        `INSERT INTO dependencies (from_type, from_id, to_type, to_id, kind, severity, note)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(fromType, fromId, toType, toId, b.kind === "depends_on" ? "depends_on" : "blocks",
           b.severity === "blocking" ? "blocking" : "normal", b.note || null);
    const row = db.prepare("SELECT * FROM dependencies WHERE id = ?").get(info.lastInsertRowid);
    audit.log(req.user, "linked a dependency", fromType, refOf(fromType, fromId));
    res.status(201).json({ dependency: resolveDependency(row) });
  } catch (err) {
    if (String(err.message).includes("UNIQUE")) {
      return res.status(409).json({ error: "dependency_exists" });
    }
    throw err;
  }
});

router.delete("/dependencies/:id", requireWrite, (req, res) => {
  const row = db.prepare("SELECT * FROM dependencies WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "not_found" });
  db.prepare("DELETE FROM dependencies WHERE id = ?").run(row.id);
  audit.log(req.user, "removed a dependency", row.from_type, refOf(row.from_type, row.from_id));
  res.json({ ok: true });
});

/** AI dependency detection across a project, or across a whole train. */
router.post("/dependencies/detect", requireWrite, async (req, res, next) => {
  try {
    const b = req.body || {};
    const projectId = b.projectId ? Number(b.projectId) : null;
    const trainId = b.trainId ? Number(b.trainId) : null;
    if (!projectId && !trainId) return res.status(400).json({ error: "projectId_or_trainId_required" });

    // Train-wide detection works on features (what the roadmap schedules);
    // project-level detection works on stories.
    const type = trainId ? "feature" : "story";
    const rows = trainId
      ? db
          .prepare(
            `SELECT f.*, p.name AS project_name, p.id AS pid
               FROM features f JOIN projects p ON p.id = f.project_id
              WHERE p.train_id = ? AND f.status != 'rejected' ORDER BY f.id`,
          )
          .all(trainId)
      : db
          .prepare("SELECT * FROM stories WHERE project_id = ? AND status != 'rejected' ORDER BY id")
          .all(projectId);

    if (rows.length < 2) {
      return res.status(400).json({ error: "not_enough_items", message: "Dependency detection needs at least two items." });
    }

    const items = rows.map((r) => ({
      ref: r.ref,
      title: r.title || r.want,
      description: r.description || r.benefit,
      projectId: r.pid || r.project_id,
      projectName: r.project_name,
    }));

    const project = projectId ? db.prepare("SELECT name FROM projects WHERE id = ?").get(projectId) : null;
    const result = await ai.detectDependencies(items, { projectName: project ? project.name : "" });

    const byRef = new Map(rows.map((r) => [r.ref, r]));
    const insert = db.prepare(
      `INSERT OR IGNORE INTO dependencies (from_type, from_id, to_type, to_id, kind, severity, note)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    );

    let created = 0;
    db.transaction(() => {
      for (const d of result.dependencies) {
        const from = byRef.get(d.fromRef);
        const to = byRef.get(d.toRef);
        if (!from || !to || from.id === to.id) continue;
        const cross = (from.pid || from.project_id) !== (to.pid || to.project_id);
        created += insert.run(
          type, from.id, type, to.id,
          d.kind === "depends_on" ? "depends_on" : "blocks",
          cross || d.severity === "blocking" ? "blocking" : "normal",
          d.note || null,
        ).changes;
      }
      if (projectId) advanceStep(projectId, 7);
    })();

    audit.log(req.user, `detected ${created} dependencies with the ${result.engine} engine`,
              projectId ? "project" : "train", project ? project.name : String(trainId));
    res.json({ created, engine: result.engine, reason: result.reason || null });
  } catch (err) { next(err); }
});

/* ================================================================== *
 * Prioritisation
 * ================================================================== */

router.get("/prioritization", (req, res) => {
  const projectId = Number(req.query.projectId);
  if (!projectId) return res.status(400).json({ error: "projectId_required" });

  // Rejected stories stay on this board: the design shows them greyed out in
  // the Won't column, which is where a deferred item belongs.
  const stories = db.prepare("SELECT * FROM stories WHERE project_id = ? ORDER BY id").all(projectId);
  const scores = db
    .prepare("SELECT * FROM wsjf WHERE entity_type = 'story'")
    .all()
    .reduce((acc, r) => ({ ...acc, [r.entity_id]: r }), {});

  const items = stories.map((s) => {
    const w = scores[s.id];
    const wsjf = w ? (w.business_value + w.time_criticality + w.risk_reduction) / (w.job_size || 1) : null;
    return {
      id: s.id,
      ref: s.ref,
      title: s.want,
      actor: s.actor,
      points: s.points,
      moscow: s.moscow,
      status: s.status,
      businessValue: w ? w.business_value : null,
      timeCriticality: w ? w.time_criticality : null,
      riskReduction: w ? w.risk_reduction : null,
      jobSize: w ? w.job_size : null,
      wsjf: wsjf === null ? null : Number(wsjf.toFixed(1)),
    };
  });

  const buckets = Object.fromEntries(MOSCOW.map((m) => [m, items.filter((i) => i.moscow === m)]));

  res.json({
    items,
    buckets,
    wsjfRanked: items.filter((i) => i.wsjf !== null).sort((a, b) => b.wsjf - a.wsjf),
  });
});

/** Manual MoSCoW change — the drag target on the prioritisation board. */
router.post("/prioritization/moscow", requireWrite, (req, res) => {
  const b = req.body || {};
  if (!MOSCOW.includes(b.moscow)) return res.status(400).json({ error: "invalid_moscow" });
  const story = db.prepare("SELECT * FROM stories WHERE id = ?").get(Number(b.storyId));
  if (!story) return res.status(404).json({ error: "story_not_found" });
  db.prepare("UPDATE stories SET moscow = ? WHERE id = ?").run(b.moscow, story.id);
  audit.log(req.user, `moved to ${b.moscow}`, "story", story.ref);
  res.json({ ok: true });
});

/** Manual WSJF edit. */
router.post("/prioritization/wsjf", requireWrite, (req, res) => {
  const b = req.body || {};
  const story = db.prepare("SELECT * FROM stories WHERE id = ?").get(Number(b.storyId));
  if (!story) return res.status(404).json({ error: "story_not_found" });

  db.prepare(
    `INSERT INTO wsjf (entity_type, entity_id, business_value, time_criticality, risk_reduction, job_size)
     VALUES ('story', ?, ?, ?, ?, ?)
     ON CONFLICT(entity_type, entity_id) DO UPDATE SET
       business_value = excluded.business_value,
       time_criticality = excluded.time_criticality,
       risk_reduction = excluded.risk_reduction,
       job_size = excluded.job_size`,
  ).run(story.id, num(b.businessValue), num(b.timeCriticality), num(b.riskReduction), num(b.jobSize, 1));

  audit.log(req.user, "updated the WSJF score", "story", story.ref);
  res.json({ ok: true });
});

/** AI scoring for the whole backlog. */
router.post("/prioritization/score", requireWrite, async (req, res, next) => {
  try {
    const projectId = Number((req.body || {}).projectId);
    const project = db.prepare("SELECT * FROM projects WHERE id = ?").get(projectId);
    if (!project) return res.status(404).json({ error: "project_not_found" });

    const stories = db
      .prepare("SELECT * FROM stories WHERE project_id = ? AND status != 'rejected' ORDER BY id")
      .all(projectId);
    if (!stories.length) return res.status(400).json({ error: "no_stories" });

    const result = await ai.scoreBacklog(stories, { projectName: project.name });
    const byRef = new Map(stories.map((s) => [s.ref, s]));

    const upsert = db.prepare(
      `INSERT INTO wsjf (entity_type, entity_id, business_value, time_criticality, risk_reduction, job_size)
       VALUES ('story', ?, ?, ?, ?, ?)
       ON CONFLICT(entity_type, entity_id) DO UPDATE SET
         business_value = excluded.business_value,
         time_criticality = excluded.time_criticality,
         risk_reduction = excluded.risk_reduction,
         job_size = excluded.job_size`,
    );
    const setMoscow = db.prepare("UPDATE stories SET moscow = ? WHERE id = ?");

    let scored = 0;
    db.transaction(() => {
      for (const s of result.scores) {
        const story = byRef.get(s.ref);
        if (!story) continue;
        upsert.run(story.id, num(s.businessValue), num(s.timeCriticality), num(s.riskReduction), num(s.jobSize, 1));
        if (MOSCOW.includes(s.moscow)) setMoscow.run(s.moscow, story.id);
        scored++;
      }
      advanceStep(projectId, 8);
    })();

    audit.log(req.user, `scored ${scored} stories with the ${result.engine} engine`, "project", project.name);
    res.json({ scored, engine: result.engine, reason: result.reason || null });
  } catch (err) { next(err); }
});

/* ------------------------------------------------------------------ *
 * Helpers
 * ------------------------------------------------------------------ */

function num(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function shortStory(s) {
  return {
    id: s.id,
    ref: s.ref,
    actor: s.actor,
    want: s.want,
    points: s.points,
    moscow: s.moscow,
    status: s.status,
    criteriaCount: criteriaFor(s.id).length,
  };
}

function exists(type, id) {
  const table = type === "feature" ? "features" : "stories";
  return Boolean(db.prepare(`SELECT 1 FROM ${table} WHERE id = ?`).get(id));
}

function refOf(type, id) {
  const table = type === "feature" ? "features" : "stories";
  const row = db.prepare(`SELECT ref FROM ${table} WHERE id = ?`).get(id);
  return row ? row.ref : String(id);
}

/** Expands a dependency row into both endpoints with their project context. */
function resolveDependency(row) {
  const end = (type, id) => {
    const table = type === "feature" ? "features" : "stories";
    const r = db
      .prepare(
        `SELECT x.id, x.ref, x.project_id, p.name AS project_name, p.train_id,
                ${type === "feature" ? "x.title" : "x.want"} AS label,
                ${type === "feature" ? "x.sprint_id" : "NULL"} AS sprint_id
           FROM ${table} x JOIN projects p ON p.id = x.project_id
          WHERE x.id = ?`,
      )
      .get(id);
    if (!r) return null;
    return {
      type,
      id: r.id,
      ref: r.ref,
      label: r.label,
      projectId: r.project_id,
      projectName: r.project_name,
      trainId: r.train_id,
      sprintId: r.sprint_id,
    };
  };

  const from = end(row.from_type, row.from_id);
  const to = end(row.to_type, row.to_id);
  if (!from || !to) return null; // dangling row after a delete — skip it

  return {
    id: row.id,
    from,
    to,
    kind: row.kind,
    severity: row.severity,
    note: row.note,
    crossProject: from.projectId !== to.projectId,
  };
}

module.exports = router;
