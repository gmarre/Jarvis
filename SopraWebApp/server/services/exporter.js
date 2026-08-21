/**
 * Backlog export — JSON, CSV, and a Jira-shaped bulk-import payload.
 *
 * Export is gated on approval: by default only approved items leave the system,
 * which is what makes the Export screen an approval gate rather than a dump.
 */

const { db } = require("../db");

/**
 * Collects the full backlog for one project.
 *
 * `includeRejected` and `includeInReview` widen the gate for teams that want a
 * snapshot rather than a clean handover.
 */
function collect(projectId, { includeInReview = false, includeRejected = false } = {}) {
  const statuses = ["approved"];
  if (includeInReview) statuses.push("in_review");
  if (includeRejected) statuses.push("rejected");
  const ph = statuses.map(() => "?").join(",");

  const project = db.prepare("SELECT * FROM projects WHERE id = ?").get(projectId);
  if (!project) throw Object.assign(new Error("project_not_found"), { status: 404 });
  const train = project.train_id
    ? db.prepare("SELECT * FROM trains WHERE id = ?").get(project.train_id)
    : null;

  const requirements = db
    .prepare(`SELECT * FROM requirements WHERE project_id = ? AND status IN (${ph}) ORDER BY id`)
    .all(projectId, ...statuses);
  const epics = db
    .prepare(`SELECT * FROM epics WHERE project_id = ? AND status IN (${ph}) ORDER BY id`)
    .all(projectId, ...statuses);
  const features = db
    .prepare(`SELECT * FROM features WHERE project_id = ? AND status IN (${ph}) ORDER BY id`)
    .all(projectId, ...statuses);
  const stories = db
    .prepare(`SELECT * FROM stories WHERE project_id = ? AND status IN (${ph}) ORDER BY id`)
    .all(projectId, ...statuses);

  const storyIds = stories.map((s) => s.id);
  const criteria = storyIds.length
    ? db
        .prepare(
          `SELECT * FROM acceptance_criteria WHERE story_id IN (${storyIds.map(() => "?").join(",")}) ORDER BY story_id, position`,
        )
        .all(...storyIds)
    : [];
  const tasks = storyIds.length
    ? db
        .prepare(`SELECT * FROM tasks WHERE story_id IN (${storyIds.map(() => "?").join(",")}) ORDER BY id`)
        .all(...storyIds)
    : [];

  const sprints = train
    ? db.prepare("SELECT * FROM sprints WHERE train_id = ? ORDER BY position, id").all(train.id)
    : [];
  const sprintById = new Map(sprints.map((s) => [s.id, s]));

  const acByStory = new Map();
  for (const c of criteria) {
    if (!acByStory.has(c.story_id)) acByStory.set(c.story_id, []);
    acByStory.get(c.story_id).push({ given: c.given_txt, when: c.when_txt, then: c.then_txt });
  }
  const tasksByStory = new Map();
  for (const t of tasks) {
    if (!tasksByStory.has(t.story_id)) tasksByStory.set(t.story_id, []);
    tasksByStory.get(t.story_id).push({ ref: t.ref, title: t.title, hours: t.hours, done: Boolean(t.done) });
  }

  const epicById = new Map(epics.map((e) => [e.id, e]));
  const featureById = new Map(features.map((f) => [f.id, f]));

  return {
    exportedAt: new Date().toISOString(),
    gate: { includeInReview, includeRejected },
    train: train ? { name: train.name, pi: train.pi_name, rte: train.rte } : null,
    project: { name: project.name, description: project.description, status: project.status },
    requirements: requirements.map((r) => ({
      ref: r.ref,
      title: r.title,
      body: r.body,
      section: r.source_section,
      status: r.status,
      aiGenerated: Boolean(r.ai_generated),
      confidence: r.confidence,
    })),
    epics: epics.map((e) => ({
      ref: e.ref,
      title: e.title,
      description: e.description,
      status: e.status,
    })),
    features: features.map((f) => ({
      ref: f.ref,
      title: f.title,
      description: f.description,
      epic: f.epic_id && epicById.has(f.epic_id) ? epicById.get(f.epic_id).ref : null,
      points: f.points,
      moscow: f.moscow,
      sprint: f.sprint_id && sprintById.has(f.sprint_id) ? sprintById.get(f.sprint_id).name : null,
      status: f.status,
    })),
    stories: stories.map((s) => ({
      ref: s.ref,
      asA: s.actor,
      iWant: s.want,
      soThat: s.benefit,
      feature: s.feature_id && featureById.has(s.feature_id) ? featureById.get(s.feature_id).ref : null,
      epic: s.epic_id && epicById.has(s.epic_id) ? epicById.get(s.epic_id).ref : null,
      points: s.points,
      moscow: s.moscow,
      status: s.status,
      acceptanceCriteria: acByStory.get(s.id) || [],
      tasks: tasksByStory.get(s.id) || [],
    })),
    counts: {
      requirements: requirements.length,
      epics: epics.length,
      features: features.length,
      stories: stories.length,
      tasks: tasks.length,
    },
  };
}

/** Flat CSV — one row per story, with its parents denormalised. */
function toCsv(payload) {
  const header = [
    "story_ref", "as_a", "i_want", "so_that", "points", "moscow", "status",
    "feature_ref", "epic_ref", "sprint", "acceptance_criteria", "tasks",
  ];
  const featureByRef = new Map(payload.features.map((f) => [f.ref, f]));

  const rows = payload.stories.map((s) => {
    const feature = s.feature ? featureByRef.get(s.feature) : null;
    return [
      s.ref,
      s.asA,
      s.iWant,
      s.soThat || "",
      s.points,
      s.moscow,
      s.status,
      s.feature || "",
      s.epic || "",
      feature && feature.sprint ? feature.sprint : "",
      s.acceptanceCriteria.map((c) => `Given ${c.given} / When ${c.when} / Then ${c.then}`).join(" | "),
      s.tasks.map((t) => `${t.title} (${t.hours}h)`).join(" | "),
    ];
  });

  return [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n");
}

function csvCell(value) {
  const s = value == null ? "" : String(value);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * Jira bulk-import shape: a flat issue list with parent links by key.
 * Matches what Jira's external-import CSV/JSON step expects.
 */
function toJira(payload, { projectKey = "PI" } = {}) {
  const issues = [];
  const keyFor = (ref) => `${projectKey}-${ref.replace(/[^A-Za-z0-9]/g, "")}`;

  for (const e of payload.epics) {
    issues.push({
      key: keyFor(e.ref),
      issueType: "Epic",
      summary: e.title,
      description: e.description || "",
      labels: ["pi-planning", "ai-assisted"],
    });
  }
  for (const f of payload.features) {
    issues.push({
      key: keyFor(f.ref),
      issueType: "Feature",
      summary: f.title,
      description: f.description || "",
      parent: f.epic ? keyFor(f.epic) : undefined,
      storyPoints: f.points,
      priority: jiraPriority(f.moscow),
      sprint: f.sprint || undefined,
      labels: ["pi-planning"],
    });
  }
  for (const s of payload.stories) {
    const ac = s.acceptanceCriteria
      .map((c, i) => `${i + 1}. *Given* ${c.given}\n   *When* ${c.when}\n   *Then* ${c.then}`)
      .join("\n");
    issues.push({
      key: keyFor(s.ref),
      issueType: "Story",
      summary: `As a ${s.asA}, I want ${s.iWant}`,
      description: `${s.soThat ? `*So that* ${s.soThat}\n\n` : ""}h3. Acceptance criteria\n${ac || "_none_"}`,
      parent: s.feature ? keyFor(s.feature) : s.epic ? keyFor(s.epic) : undefined,
      storyPoints: s.points,
      priority: jiraPriority(s.moscow),
      labels: ["pi-planning"],
    });
    for (const t of s.tasks) {
      issues.push({
        key: keyFor(t.ref),
        issueType: "Sub-task",
        summary: t.title,
        parent: keyFor(s.ref),
        originalEstimate: `${t.hours}h`,
      });
    }
  }

  return {
    projects: [
      {
        name: payload.project.name,
        key: projectKey,
        issues,
      },
    ],
  };
}

function jiraPriority(moscow) {
  return { Must: "Highest", Should: "High", Could: "Medium", Wont: "Lowest" }[moscow] || "Medium";
}

/**
 * Readiness check for the Export screen's approval gate — what is still
 * unapproved, and therefore what would be dropped.
 */
function readiness(projectId) {
  const count = (table) =>
    db
      .prepare(
        `SELECT status, COUNT(*) AS n FROM ${table} WHERE project_id = ? GROUP BY status`,
      )
      .all(projectId)
      .reduce((acc, r) => ({ ...acc, [r.status]: r.n }), {});

  const sections = ["requirements", "epics", "features", "stories"].map((table) => {
    const c = count(table);
    const approved = c.approved || 0;
    const inReview = c.in_review || 0;
    const rejected = c.rejected || 0;
    return { entity: table, approved, inReview, rejected, total: approved + inReview + rejected };
  });

  return {
    sections,
    blocking: sections.filter((s) => s.inReview > 0),
    ready: sections.every((s) => s.inReview === 0) && sections.some((s) => s.approved > 0),
  };
}

module.exports = { collect, toCsv, toJira, readiness };
