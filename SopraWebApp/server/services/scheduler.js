/**
 * Roadmap scheduling — places features into sprints under two constraints:
 * per-project sprint capacity, and cross-project dependencies.
 *
 * Deterministic and explainable: the same backlog always yields the same plan,
 * and every unplaced feature comes back with the reason it could not fit.
 */

const { db } = require("../db");

const MOSCOW_RANK = { Must: 0, Should: 1, Could: 2, Wont: 3 };

/**
 * Reads everything the planner needs for one train.
 */
function loadTrain(trainId) {
  const sprints = db
    .prepare("SELECT * FROM sprints WHERE train_id = ? ORDER BY position, id")
    .all(trainId);
  const projects = db
    .prepare("SELECT * FROM projects WHERE train_id = ? ORDER BY id")
    .all(trainId);
  const projectIds = projects.map((p) => p.id);

  const features = projectIds.length
    ? db
        .prepare(
          `SELECT f.*, p.name AS project_name
             FROM features f JOIN projects p ON p.id = f.project_id
            WHERE f.project_id IN (${projectIds.map(() => "?").join(",")})
              AND f.status != 'rejected'
            ORDER BY f.id`,
        )
        .all(...projectIds)
    : [];

  const capacity = sprints.length
    ? db
        .prepare(
          `SELECT * FROM capacity WHERE sprint_id IN (${sprints.map(() => "?").join(",")})`,
        )
        .all(...sprints.map((s) => s.id))
    : [];

  const deps = db
    .prepare("SELECT * FROM dependencies WHERE from_type = 'feature' AND to_type = 'feature'")
    .all();

  return { sprints, projects, features, capacity, deps };
}

/** capacity lookup: `${sprintId}:${projectId}` → available points. */
function capacityMap(capacity) {
  const map = new Map();
  for (const c of capacity) map.set(`${c.sprint_id}:${c.project_id}`, c.available_points);
  return map;
}

/**
 * Computes the current load per sprint and project from whatever is already
 * scheduled, so the board can render capacity bars without replanning.
 */
function computeLoad(trainId) {
  const { sprints, projects, features, capacity } = loadTrain(trainId);
  const cap = capacityMap(capacity);
  const load = new Map();

  for (const f of features) {
    if (!f.sprint_id) continue;
    const key = `${f.sprint_id}:${f.project_id}`;
    load.set(key, (load.get(key) || 0) + (f.points || 0));
  }

  const rows = [];
  for (const s of sprints) {
    for (const p of projects) {
      const key = `${s.id}:${p.id}`;
      const available = cap.get(key) || 0;
      const used = load.get(key) || 0;
      rows.push({
        sprintId: s.id,
        sprintName: s.name,
        projectId: p.id,
        projectName: p.name,
        available,
        used,
        ratio: available > 0 ? used / available : used > 0 ? Infinity : 0,
      });
    }
  }
  return rows;
}

/**
 * Auto-plans the train.
 *
 * Strategy: order features by MoSCoW then by dependency depth (so blockers are
 * placed before the things they block), then greedily place each one in the
 * earliest sprint that has room and that is not earlier than every blocker.
 *
 * `dryRun` computes the plan without writing it.
 */
function autoPlan(trainId, { dryRun = false, respectPinned = true } = {}) {
  const { sprints, features, capacity, deps } = loadTrain(trainId);
  if (!sprints.length) {
    return { placed: [], unplaced: [], warnings: ["This train has no sprints yet."], load: [] };
  }

  const cap = capacityMap(capacity);
  const byId = new Map(features.map((f) => [f.id, f]));

  // blockers[featureId] = [featureId, …] that must ship no later than it.
  const blockers = new Map();
  for (const d of deps) {
    if (!byId.has(d.from_id) || !byId.has(d.to_id)) continue;
    if (!blockers.has(d.to_id)) blockers.set(d.to_id, []);
    blockers.get(d.to_id).push(d.from_id);
  }

  const depth = memoDepth(blockers);

  // A feature a human placed by hand stays put; only AI-scheduled and
  // unscheduled features are re-planned.
  const pinned = respectPinned ? features.filter((f) => f.sprint_id && !f.ai_scheduled) : [];
  const pinnedIds = new Set(pinned.map((f) => f.id));
  const toPlace = features.filter((f) => !pinnedIds.has(f.id));

  toPlace.sort((a, b) => {
    const m = (MOSCOW_RANK[a.moscow] ?? 9) - (MOSCOW_RANK[b.moscow] ?? 9);
    if (m) return m;
    const d = depth(a.id) - depth(b.id);
    if (d) return d;
    return b.points - a.points || a.id - b.id;
  });

  // Running load starts from the pinned features.
  const load = new Map();
  const assignment = new Map();
  for (const f of pinned) {
    const key = `${f.sprint_id}:${f.project_id}`;
    load.set(key, (load.get(key) || 0) + f.points);
    assignment.set(f.id, f.sprint_id);
  }

  const placed = [];
  const unplaced = [];
  const warnings = [];

  for (const f of toPlace) {
    // Cannot start before every blocker's sprint.
    const blockerSprints = (blockers.get(f.id) || [])
      .map((id) => assignment.get(id))
      .filter(Boolean)
      .map((sid) => sprints.findIndex((s) => s.id === sid));
    const earliest = blockerSprints.length ? Math.max(...blockerSprints) : 0;

    let target = null;
    for (let i = earliest; i < sprints.length; i++) {
      const s = sprints[i];
      const key = `${s.id}:${f.project_id}`;
      const available = cap.get(key) || 0;
      const used = load.get(key) || 0;
      if (available > 0 && used + f.points <= available) {
        target = s;
        break;
      }
    }

    if (target) {
      const key = `${target.id}:${f.project_id}`;
      load.set(key, (load.get(key) || 0) + f.points);
      assignment.set(f.id, target.id);
      placed.push({ featureId: f.id, ref: f.ref, title: f.title, sprintId: target.id, sprintName: target.name });
    } else {
      const totalAvailable = sprints.reduce((a, s) => a + (cap.get(`${s.id}:${f.project_id}`) || 0), 0);
      unplaced.push({
        featureId: f.id,
        ref: f.ref,
        title: f.title,
        reason:
          totalAvailable === 0
            ? "No capacity recorded for this project — import a capacity workbook first."
            : `Needs ${f.points} pts; no sprint from ${sprints[earliest] ? sprints[earliest].name : sprints[0].name} onward has room.`,
      });
    }
  }

  if (unplaced.length) {
    warnings.push(`${unplaced.length} feature${unplaced.length > 1 ? "s" : ""} could not be scheduled.`);
  }

  if (!dryRun) {
    const clear = db.prepare("UPDATE features SET sprint_id = NULL, ai_scheduled = 0 WHERE id = ?");
    const assign = db.prepare("UPDATE features SET sprint_id = ?, ai_scheduled = 1 WHERE id = ?");
    db.transaction(() => {
      for (const f of toPlace) clear.run(f.id);
      for (const p of placed) assign.run(p.sprintId, p.featureId);
    })();
  }

  return { placed, unplaced, warnings, load: computeLoad(trainId) };
}

/** Longest blocker chain ending at a feature — memoised, cycle-safe. */
function memoDepth(blockers) {
  const cache = new Map();
  const visiting = new Set();
  return function depth(id) {
    if (cache.has(id)) return cache.get(id);
    if (visiting.has(id)) return 0; // cycle — treat as depth 0 rather than looping
    visiting.add(id);
    const parents = blockers.get(id) || [];
    const d = parents.length ? 1 + Math.max(...parents.map(depth)) : 0;
    visiting.delete(id);
    cache.set(id, d);
    return d;
  };
}

/** Cross-project dependency edges for the board's arrow overlay. */
function crossProjectEdges(trainId) {
  const { features } = loadTrain(trainId);
  const byId = new Map(features.map((f) => [f.id, f]));
  const deps = db
    .prepare("SELECT * FROM dependencies WHERE from_type = 'feature' AND to_type = 'feature'")
    .all();

  return deps
    .filter((d) => byId.has(d.from_id) && byId.has(d.to_id))
    .map((d) => {
      const from = byId.get(d.from_id);
      const to = byId.get(d.to_id);
      const fromPos = sprintPosition(trainId, from.sprint_id);
      const toPos = sprintPosition(trainId, to.sprint_id);
      return {
        id: d.id,
        from: { id: from.id, ref: from.ref, projectId: from.project_id, sprintId: from.sprint_id },
        to: { id: to.id, ref: to.ref, projectId: to.project_id, sprintId: to.sprint_id },
        kind: d.kind,
        severity: d.severity,
        note: d.note,
        crossProject: from.project_id !== to.project_id,
        // A blocker scheduled after the thing it blocks is a real plan defect.
        backwardInTime: fromPos !== null && toPos !== null && fromPos > toPos,
      };
    });
}

const sprintPosCache = new Map();
function sprintPosition(trainId, sprintId) {
  if (!sprintId) return null;
  if (!sprintPosCache.has(trainId)) {
    const list = db.prepare("SELECT id FROM sprints WHERE train_id = ? ORDER BY position, id").all(trainId);
    sprintPosCache.set(trainId, new Map(list.map((s, i) => [s.id, i])));
  }
  const map = sprintPosCache.get(trainId);
  return map.has(sprintId) ? map.get(sprintId) : null;
}

/** Call after sprints change so `sprintPosition` does not serve a stale order. */
function invalidateSprintCache(trainId) {
  if (trainId == null) sprintPosCache.clear();
  else sprintPosCache.delete(trainId);
}

module.exports = { autoPlan, computeLoad, crossProjectEdges, loadTrain, invalidateSprintCache };
