/**
 * The pipeline entities: requirements → epics → features → stories → tasks.
 *
 * They share a review lifecycle (in_review → approved | rejected), so status
 * transitions, edits, and deletes are generated from one table of definitions
 * rather than written five times.
 */

const express = require("express");
const { db, nextRef, STATUSES, STEP_NAMES } = require("../db");
const { requireAuth, requireWrite } = require("../auth");
const audit = require("../audit");
const ai = require("../services/ai");
const projects = require("./projects");

const router = express.Router();
router.use(requireAuth);

/* ------------------------------------------------------------------ *
 * Entity definitions
 * ------------------------------------------------------------------ */

const ENTITIES = {
  requirements: {
    table: "requirements",
    prefix: "REQ",
    label: "requirement",
    step: 1,
    editable: ["title", "body", "source_section", "source_page", "status"],
    map: (r) => ({
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
    }),
  },
  epics: {
    table: "epics",
    prefix: "EPIC",
    label: "epic",
    step: 2,
    editable: ["title", "description", "status"],
    map: (r) => ({
      id: r.id,
      ref: r.ref,
      title: r.title,
      description: r.description,
      status: r.status,
      aiGenerated: Boolean(r.ai_generated),
      confidence: r.confidence,
    }),
  },
  features: {
    table: "features",
    prefix: "FEAT",
    label: "feature",
    step: 3,
    editable: ["title", "description", "points", "moscow", "status", "epic_id", "sprint_id"],
    map: (r) => ({
      id: r.id,
      ref: r.ref,
      title: r.title,
      description: r.description,
      points: r.points,
      moscow: r.moscow,
      status: r.status,
      epicId: r.epic_id,
      sprintId: r.sprint_id,
      aiGenerated: Boolean(r.ai_generated),
      aiScheduled: Boolean(r.ai_scheduled),
      confidence: r.confidence,
    }),
  },
  stories: {
    table: "stories",
    prefix: "US",
    label: "story",
    step: 4,
    editable: ["actor", "want", "benefit", "points", "moscow", "status", "feature_id", "epic_id"],
    map: (r) => ({
      id: r.id,
      ref: r.ref,
      actor: r.actor,
      want: r.want,
      benefit: r.benefit,
      points: r.points,
      moscow: r.moscow,
      status: r.status,
      featureId: r.feature_id,
      epicId: r.epic_id,
      clusterId: r.cluster_id,
      aiGenerated: Boolean(r.ai_generated),
      confidence: r.confidence,
    }),
  },
  tasks: {
    table: "tasks",
    prefix: "TASK",
    label: "task",
    step: 5,
    editable: ["title", "hours", "done", "story_id"],
    map: (r) => ({
      id: r.id,
      ref: r.ref,
      title: r.title,
      hours: r.hours,
      done: Boolean(r.done),
      storyId: r.story_id,
      aiGenerated: Boolean(r.ai_generated),
    }),
  },
};

function entityOr404(req, res) {
  const def = ENTITIES[req.params.entity];
  if (!def) {
    res.status(404).json({ error: "unknown_entity", entity: req.params.entity });
    return null;
  }
  return def;
}

/* ------------------------------------------------------------------ *
 * Generic list / create / update / delete
 * ------------------------------------------------------------------ */

router.get("/:entity", (req, res) => {
  const def = entityOr404(req, res);
  if (!def) return;

  const projectId = req.query.projectId ? Number(req.query.projectId) : null;
  const trainId = req.query.trainId ? Number(req.query.trainId) : null;
  const scope = req.query.scope;

  const where = [];
  const args = [];
  if (projectId) { where.push("project_id = ?"); args.push(projectId); }
  if (trainId && def.table === "requirements") { where.push("train_id = ?"); args.push(trainId); }
  if (scope && def.table === "requirements") { where.push("scope = ?"); args.push(scope); }
  if (req.query.status) { where.push("status = ?"); args.push(req.query.status); }
  if (req.query.featureId && def.table === "stories") { where.push("feature_id = ?"); args.push(Number(req.query.featureId)); }
  if (req.query.epicId && (def.table === "features" || def.table === "stories")) {
    where.push("epic_id = ?"); args.push(Number(req.query.epicId));
  }
  if (req.query.storyId && def.table === "tasks") { where.push("story_id = ?"); args.push(Number(req.query.storyId)); }

  const sql = `SELECT * FROM ${def.table}${where.length ? ` WHERE ${where.join(" AND ")}` : ""} ORDER BY id`;
  const rows = db.prepare(sql).all(...args);

  const items = rows.map(def.map);
  if (def.table === "stories") attachCriteria(items);

  res.json({ items, total: items.length });
});

router.post("/:entity", requireWrite, (req, res) => {
  const def = entityOr404(req, res);
  if (!def) return;
  const b = req.body || {};
  const projectId = b.projectId ? Number(b.projectId) : null;
  const trainId = b.trainId ? Number(b.trainId) : null;

  if (def.table !== "requirements" && !projectId) {
    return res.status(400).json({ error: "projectId_required" });
  }
  if (def.table === "requirements" && !projectId && !trainId) {
    return res.status(400).json({ error: "projectId_or_trainId_required" });
  }

  // Train-level requirements number independently from project-level ones.
  const scope = def.table === "requirements" && !projectId ? { trainId } : { projectId };
  const prefix = def.table === "requirements" && !projectId ? "TR-REQ" : def.prefix;
  const ref = b.ref || nextRef(def.table, prefix, scope);
  let id;

  if (def.table === "requirements") {
    id = db
      .prepare(
        `INSERT INTO requirements (project_id, train_id, scope, ref, title, body, source_section, source_page, status, ai_generated, confidence)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
      )
      .run(projectId, trainId, b.scope || (projectId ? "project" : "train"), ref, req8(b.title), b.body || null,
           b.section || null, b.page || null, b.status || "in_review", b.confidence ?? null).lastInsertRowid;
  } else if (def.table === "epics") {
    id = db
      .prepare("INSERT INTO epics (project_id, ref, title, description, status, ai_generated, confidence) VALUES (?, ?, ?, ?, ?, 0, ?)")
      .run(projectId, ref, req8(b.title), b.description || null, b.status || "in_review", b.confidence ?? null).lastInsertRowid;
  } else if (def.table === "features") {
    id = db
      .prepare(
        `INSERT INTO features (project_id, epic_id, sprint_id, ref, title, description, points, moscow, status, ai_generated, confidence)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
      )
      .run(projectId, b.epicId || null, b.sprintId || null, ref, req8(b.title), b.description || null,
           Number(b.points) || 0, b.moscow || "Should", b.status || "in_review", b.confidence ?? null).lastInsertRowid;
  } else if (def.table === "stories") {
    id = db
      .prepare(
        `INSERT INTO stories (project_id, feature_id, epic_id, ref, actor, want, benefit, points, moscow, status, ai_generated, confidence)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
      )
      .run(projectId, b.featureId || null, b.epicId || null, ref, b.actor || "user", req8(b.want),
           b.benefit || null, Number(b.points) || 0, b.moscow || "Should", b.status || "in_review", b.confidence ?? null).lastInsertRowid;
    saveCriteria(id, b.acceptanceCriteria || []);
  } else if (def.table === "tasks") {
    id = db
      .prepare("INSERT INTO tasks (project_id, story_id, ref, title, hours, done, ai_generated) VALUES (?, ?, ?, ?, ?, ?, 0)")
      .run(projectId, b.storyId || null, ref, req8(b.title), Number(b.hours) || 0, b.done ? 1 : 0).lastInsertRowid;
  }

  const row = db.prepare(`SELECT * FROM ${def.table} WHERE id = ?`).get(id);
  audit.log(req.user, `created the ${def.label}`, def.label, ref);
  res.status(201).json({ item: def.map(row) });
});

router.patch("/:entity/:id", requireWrite, (req, res) => {
  const def = entityOr404(req, res);
  if (!def) return;
  const row = db.prepare(`SELECT * FROM ${def.table} WHERE id = ?`).get(req.params.id);
  if (!row) return res.status(404).json({ error: "not_found" });

  const b = req.body || {};
  const camelToSnake = {
    section: "source_section", page: "source_page", epicId: "epic_id",
    sprintId: "sprint_id", featureId: "feature_id", storyId: "story_id",
  };

  const sets = [];
  const args = [];
  for (const [key, value] of Object.entries(b)) {
    const col = camelToSnake[key] || key;
    if (!def.editable.includes(col)) continue;
    if (col === "status" && !STATUSES.includes(value)) continue;
    sets.push(`${col} = ?`);
    args.push(col === "done" ? (value ? 1 : 0) : value);
  }

  if (sets.length) {
    db.prepare(`UPDATE ${def.table} SET ${sets.join(", ")} WHERE id = ?`).run(...args, row.id);
  }
  if (def.table === "stories" && Array.isArray(b.acceptanceCriteria)) {
    saveCriteria(row.id, b.acceptanceCriteria);
  }

  const updated = db.prepare(`SELECT * FROM ${def.table} WHERE id = ?`).get(row.id);
  if (b.status && b.status !== row.status) {
    audit.log(req.user, statusVerb(b.status), def.label, row.ref);
  } else if (sets.length) {
    audit.log(req.user, `edited the ${def.label}`, def.label, row.ref);
  }

  const item = def.map(updated);
  if (def.table === "stories") attachCriteria([item]);
  res.json({ item });
});

router.delete("/:entity/:id", requireWrite, (req, res) => {
  const def = entityOr404(req, res);
  if (!def) return;
  const row = db.prepare(`SELECT * FROM ${def.table} WHERE id = ?`).get(req.params.id);
  if (!row) return res.status(404).json({ error: "not_found" });
  db.prepare(`DELETE FROM ${def.table} WHERE id = ?`).run(row.id);
  audit.log(req.user, `deleted the ${def.label}`, def.label, row.ref);
  res.json({ ok: true });
});

/** Bulk status change — powers "Approve all" on the review screens. */
router.post("/:entity/bulk-status", requireWrite, (req, res) => {
  const def = entityOr404(req, res);
  if (!def) return;
  const b = req.body || {};
  const status = b.status;
  if (!STATUSES.includes(status)) return res.status(400).json({ error: "invalid_status" });

  const ids = Array.isArray(b.ids) ? b.ids.map(Number).filter(Boolean) : [];
  let changed = 0;

  if (ids.length) {
    const stmt = db.prepare(`UPDATE ${def.table} SET status = ? WHERE id = ?`);
    db.transaction(() => { for (const id of ids) changed += stmt.run(status, id).changes; })();
  } else if (b.projectId) {
    const info = db
      .prepare(`UPDATE ${def.table} SET status = ? WHERE project_id = ? AND status = 'in_review'`)
      .run(status, Number(b.projectId));
    changed = info.changes;
  } else {
    return res.status(400).json({ error: "ids_or_projectId_required" });
  }

  audit.log(req.user, `${statusVerb(status)} ${changed} ${def.label}${changed === 1 ? "" : "s"}`, def.label, null);
  res.json({ changed });
});

/* ------------------------------------------------------------------ *
 * Story-specific: merge and split
 * ------------------------------------------------------------------ */

router.post("/stories/:id/merge", requireWrite, (req, res) => {
  const target = db.prepare("SELECT * FROM stories WHERE id = ?").get(req.params.id);
  if (!target) return res.status(404).json({ error: "not_found" });
  const sourceId = Number((req.body || {}).sourceId);
  const source = db.prepare("SELECT * FROM stories WHERE id = ?").get(sourceId);
  if (!source) return res.status(400).json({ error: "source_not_found" });
  if (source.id === target.id) return res.status(400).json({ error: "cannot_merge_into_itself" });

  db.transaction(() => {
    // Move the source's criteria and tasks onto the target, then reject it.
    const maxPos = db
      .prepare("SELECT COALESCE(MAX(position), -1) AS p FROM acceptance_criteria WHERE story_id = ?")
      .get(target.id).p;
    db.prepare("UPDATE acceptance_criteria SET story_id = ?, position = position + ? WHERE story_id = ?")
      .run(target.id, maxPos + 1, source.id);
    db.prepare("UPDATE tasks SET story_id = ? WHERE story_id = ?").run(target.id, source.id);
    db.prepare("UPDATE stories SET points = ?, status = 'rejected' WHERE id = ?")
      .run(source.points, source.id);
    db.prepare("UPDATE stories SET points = ? WHERE id = ?")
      .run(Math.max(target.points, source.points), target.id);
  })();

  audit.log(req.user, `merged ${source.ref} into`, "story", target.ref);
  res.json({ ok: true, target: withCriteria(target.id) });
});

router.post("/stories/:id/split", requireWrite, (req, res) => {
  const story = db.prepare("SELECT * FROM stories WHERE id = ?").get(req.params.id);
  if (!story) return res.status(404).json({ error: "not_found" });
  const parts = Array.isArray((req.body || {}).parts) ? req.body.parts : [];
  if (parts.length < 2) return res.status(400).json({ error: "need_at_least_two_parts" });

  const created = [];
  db.transaction(() => {
    for (const part of parts) {
      const ref = nextRef("stories", "US", story.project_id);
      const id = db
        .prepare(
          `INSERT INTO stories (project_id, feature_id, epic_id, ref, actor, want, benefit, points, moscow, status, ai_generated)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'in_review', 0)`,
        )
        .run(story.project_id, story.feature_id, story.epic_id, ref, story.actor,
             String(part.want || story.want), part.benefit ?? story.benefit,
             Number(part.points) || Math.max(1, Math.round(story.points / parts.length)), story.moscow)
        .lastInsertRowid;
      created.push(withCriteria(id));
    }
    db.prepare("UPDATE stories SET status = 'rejected' WHERE id = ?").run(story.id);
  })();

  audit.log(req.user, `split into ${parts.length} stories`, "story", story.ref);
  res.json({ ok: true, created });
});

/* ------------------------------------------------------------------ *
 * AI generation steps
 * ------------------------------------------------------------------ */

/** Requirements → epics. */
router.post("/generate/epics", requireWrite, async (req, res, next) => {
  try {
    const projectId = Number((req.body || {}).projectId);
    const project = mustProject(projectId, res);
    if (!project) return;

    const requirements = db
      .prepare("SELECT * FROM requirements WHERE project_id = ? AND status != 'rejected' ORDER BY id")
      .all(projectId);
    if (!requirements.length) {
      return res.status(400).json({ error: "no_requirements", message: "Extract requirements first." });
    }

    const result = await ai.generateEpics(requirements, { projectName: project.name });
    const byRef = new Map(requirements.map((r) => [r.ref, r]));
    const created = [];

    db.transaction(() => {
      if ((req.body || {}).replace) db.prepare("DELETE FROM epics WHERE project_id = ?").run(projectId);
      for (const e of result.epics) {
        const ref = nextRef("epics", "EPIC", projectId);
        const id = db
          .prepare("INSERT INTO epics (project_id, ref, title, description, status, ai_generated, confidence) VALUES (?, ?, ?, ?, 'in_review', 1, ?)")
          .run(projectId, ref, e.title, e.description || null, e.confidence ?? null).lastInsertRowid;
        // Traceability: record which requirements this epic was derived from.
        const link = db.prepare("UPDATE requirements SET epic_id = ? WHERE id = ?");
        for (const rref of e.requirementRefs || []) {
          const r = byRef.get(rref);
          if (r) link.run(id, r.id);
        }
        created.push(db.prepare("SELECT * FROM epics WHERE id = ?").get(id));
      }
      advanceStep(projectId, 2);
    })();

    audit.log(req.user, `generated ${created.length} epics with the ${result.engine} engine`, "project", project.name);
    res.json({ items: created.map(ENTITIES.epics.map), engine: result.engine, reason: result.reason || null });
  } catch (err) { next(err); }
});

/** Epics → features. */
router.post("/generate/features", requireWrite, async (req, res, next) => {
  try {
    const b = req.body || {};
    const projectId = Number(b.projectId);
    const project = mustProject(projectId, res);
    if (!project) return;

    const epics = b.epicId
      ? db.prepare("SELECT * FROM epics WHERE id = ? AND project_id = ?").all(Number(b.epicId), projectId)
      : db.prepare("SELECT * FROM epics WHERE project_id = ? AND status != 'rejected' ORDER BY id").all(projectId);
    if (!epics.length) return res.status(400).json({ error: "no_epics", message: "Generate epics first." });

    const created = [];
    let engine = "local";
    for (const epic of epics) {
      // Only this epic's own requirements — passing the whole project's set
      // makes every epic produce the same features.
      const requirements = requirementsForEpic(projectId, epic.id);
      const result = await ai.generateFeatures(epic, requirements, { projectName: project.name });
      engine = result.engine;
      const byRef = new Map(requirements.map((r) => [r.ref, r]));
      db.transaction(() => {
        const link = db.prepare("UPDATE requirements SET feature_id = ? WHERE id = ?");
        for (const f of result.features) {
          const ref = nextRef("features", "FEAT", projectId);
          const id = db
            .prepare(
              `INSERT INTO features (project_id, epic_id, ref, title, description, points, moscow, status, ai_generated, confidence)
               VALUES (?, ?, ?, ?, ?, ?, ?, 'in_review', 1, ?)`,
            )
            .run(projectId, epic.id, ref, f.title, f.description || null,
                 Number(f.points) || 0, f.moscow || "Should", f.confidence ?? null).lastInsertRowid;
          // Traceability: which requirements this feature covers. Story
          // generation reads this so sibling features do not all decompose the
          // same requirements into the same stories.
          for (const rref of f.requirementRefs || []) {
            const r = byRef.get(rref);
            if (r) link.run(id, r.id);
          }
          created.push(db.prepare("SELECT * FROM features WHERE id = ?").get(id));
        }
      })();
    }
    advanceStep(projectId, 3);

    audit.log(req.user, `generated ${created.length} features with the ${engine} engine`, "project", project.name);
    res.json({ items: created.map(ENTITIES.features.map), engine });
  } catch (err) { next(err); }
});

/** Features → user stories with acceptance criteria. */
router.post("/generate/stories", requireWrite, async (req, res, next) => {
  try {
    const b = req.body || {};
    const projectId = Number(b.projectId);
    const project = mustProject(projectId, res);
    if (!project) return;

    const features = b.featureId
      ? db.prepare("SELECT * FROM features WHERE id = ? AND project_id = ?").all(Number(b.featureId), projectId)
      : db.prepare("SELECT * FROM features WHERE project_id = ? AND status != 'rejected' ORDER BY id").all(projectId);
    if (!features.length) return res.status(400).json({ error: "no_features", message: "Generate features first." });

    const created = [];
    let engine = "local";
    for (const feature of features) {
      const requirements = requirementsForFeature(projectId, feature);
      const result = await ai.generateStories(feature, requirements, { projectName: project.name });
      engine = result.engine;
      db.transaction(() => {
        for (const s of result.stories) {
          const ref = nextRef("stories", "US", projectId);
          const id = db
            .prepare(
              `INSERT INTO stories (project_id, feature_id, epic_id, ref, actor, want, benefit, points, moscow, status, ai_generated, confidence)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'in_review', 1, ?)`,
            )
            .run(projectId, feature.id, feature.epic_id, ref, s.actor || "user", s.want,
                 s.benefit || null, Number(s.points) || 0, s.moscow || "Should", s.confidence ?? null).lastInsertRowid;
          saveCriteria(id, s.acceptanceCriteria || []);
          created.push(id);
        }
      })();
    }
    advanceStep(projectId, 4);

    audit.log(req.user, `generated ${created.length} stories with the ${engine} engine`, "project", project.name);
    res.json({ items: created.map(withCriteria), engine });
  } catch (err) { next(err); }
});

/** Stories → tasks. */
router.post("/generate/tasks", requireWrite, async (req, res, next) => {
  try {
    const b = req.body || {};
    const projectId = Number(b.projectId);
    const project = mustProject(projectId, res);
    if (!project) return;

    const stories = b.storyId
      ? db.prepare("SELECT * FROM stories WHERE id = ? AND project_id = ?").all(Number(b.storyId), projectId)
      : db.prepare("SELECT * FROM stories WHERE project_id = ? AND status = 'approved' ORDER BY id").all(projectId);
    if (!stories.length) {
      return res.status(400).json({ error: "no_stories", message: "Approve some stories first." });
    }

    const created = [];
    let engine = "local";
    for (const story of stories) {
      const withAc = { ...story, acceptanceCriteria: criteriaFor(story.id) };
      const result = await ai.generateTasks(withAc, { projectName: project.name });
      engine = result.engine;
      db.transaction(() => {
        for (const t of result.tasks) {
          const ref = nextRef("tasks", "TASK", projectId);
          const id = db
            .prepare("INSERT INTO tasks (project_id, story_id, ref, title, hours, ai_generated) VALUES (?, ?, ?, ?, ?, 1)")
            .run(projectId, story.id, ref, t.title, Number(t.hours) || 0).lastInsertRowid;
          created.push(db.prepare("SELECT * FROM tasks WHERE id = ?").get(id));
        }
      })();
    }
    advanceStep(projectId, 5);

    audit.log(req.user, `generated ${created.length} tasks with the ${engine} engine`, "project", project.name);
    res.json({ items: created.map(ENTITIES.tasks.map), engine });
  } catch (err) { next(err); }
});

/* ------------------------------------------------------------------ *
 * Helpers
 * ------------------------------------------------------------------ */

function req8(v) {
  const s = String(v == null ? "" : v).trim();
  return s || "Untitled";
}

/**
 * Requirements traced to one epic.
 *
 * Epic generation records the link, so decomposition can stay faithful to the
 * slice of the document each epic came from. When nothing is linked — an epic
 * created by hand, or an older project — fall back to the project's full set
 * rather than generating from nothing.
 */
function requirementsForEpic(projectId, epicId) {
  if (epicId) {
    const linked = db
      .prepare("SELECT * FROM requirements WHERE project_id = ? AND epic_id = ? AND status != 'rejected' ORDER BY id")
      .all(projectId, epicId);
    if (linked.length) return linked;
  }
  return db
    .prepare("SELECT * FROM requirements WHERE project_id = ? AND status != 'rejected' ORDER BY id")
    .all(projectId);
}

/**
 * Requirements traced to one feature, falling back to its epic's set and then
 * to the project's, so a hand-made feature still generates something sensible.
 */
function requirementsForFeature(projectId, feature) {
  const linked = db
    .prepare("SELECT * FROM requirements WHERE project_id = ? AND feature_id = ? AND status != 'rejected' ORDER BY id")
    .all(projectId, feature.id);
  if (linked.length) return linked;
  return requirementsForEpic(projectId, feature.epic_id);
}

function mustProject(projectId, res) {
  const project = db.prepare("SELECT * FROM projects WHERE id = ?").get(projectId);
  if (!project) {
    res.status(404).json({ error: "project_not_found" });
    return null;
  }
  return project;
}

/** Moves a project forward through the pipeline, never backwards. */
function advanceStep(projectId, step) {
  const project = db.prepare("SELECT pipeline_step FROM projects WHERE id = ?").get(projectId);
  if (!project) return;
  const next = Math.max(project.pipeline_step, projects.clampStep(step));
  db.prepare("UPDATE projects SET pipeline_step = ?, status = ? WHERE id = ?")
    .run(next, next >= STEP_NAMES.length - 1 ? "ready" : "in_review", projectId);
}

function criteriaFor(storyId) {
  return db
    .prepare("SELECT * FROM acceptance_criteria WHERE story_id = ? ORDER BY position, id")
    .all(storyId)
    .map((c) => ({ id: c.id, given: c.given_txt, when: c.when_txt, then: c.then_txt }));
}

function attachCriteria(items) {
  for (const item of items) item.acceptanceCriteria = criteriaFor(item.id);
  return items;
}

function withCriteria(storyId) {
  const row = db.prepare("SELECT * FROM stories WHERE id = ?").get(storyId);
  if (!row) return null;
  const item = ENTITIES.stories.map(row);
  item.acceptanceCriteria = criteriaFor(storyId);
  return item;
}

function saveCriteria(storyId, list) {
  db.prepare("DELETE FROM acceptance_criteria WHERE story_id = ?").run(storyId);
  const insert = db.prepare(
    "INSERT INTO acceptance_criteria (story_id, given_txt, when_txt, then_txt, position) VALUES (?, ?, ?, ?, ?)",
  );
  list.forEach((c, i) => {
    const given = c.given ?? c.given_txt;
    const when = c.when ?? c.when_txt;
    const then = c.then ?? c.then_txt;
    if (given && when && then) insert.run(storyId, given, when, then, i);
  });
}

function statusVerb(status) {
  return { approved: "approved", rejected: "rejected", in_review: "reopened" }[status] || "updated";
}

module.exports = router;
module.exports.ENTITIES = ENTITIES;
module.exports.withCriteria = withCriteria;
module.exports.criteriaFor = criteriaFor;
module.exports.advanceStep = advanceStep;
