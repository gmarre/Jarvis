/**
 * Full-pipeline integration test.
 *
 * Drives a brand-new project from an uploaded requirements document all the way
 * to a Jira export, through the real HTTP API. Runs against the local engine,
 * so it needs no API key — with ANTHROPIC_API_KEY set it exercises Claude
 * instead and the assertions still hold.
 *
 *   node test/pipeline.mjs [--base http://127.0.0.1:4199]
 */

import { writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import ExcelJS from "exceljs";

const arg = (n, d) => {
  const i = process.argv.indexOf(`--${n}`);
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : d;
};
const BASE = arg("base", "http://127.0.0.1:4199");

let cookie = "";
const steps = [];

function record(name, ok, detail) {
  steps.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  — ${detail}` : ""}`);
  if (!ok) process.exitCode = 1;
}

async function call(method, url, body, { raw = false } = {}) {
  const init = { method, headers: { cookie }, redirect: "manual" };
  if (body instanceof FormData) init.body = body;
  else if (body !== undefined) {
    init.headers["content-type"] = "application/json";
    init.body = JSON.stringify(body);
  }
  const res = await fetch(`${BASE}/api${url}`, init);
  const setCookie = res.headers.get("set-cookie");
  if (setCookie) cookie = setCookie.split(";")[0];
  if (raw) return res;
  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { json = { raw: text.slice(0, 200) }; }
  if (!res.ok) {
    const err = new Error(`${method} ${url} → ${res.status} ${JSON.stringify(json)}`);
    err.status = res.status;
    throw err;
  }
  return json;
}

const URD = `Customer Support Console — User Requirements Document

1. Purpose
This document specifies the agent-facing console for the customer support team.

2.1 Agent authentication
The agent must sign in with their corporate account through the group identity provider.
The system must end an agent session after 20 minutes of inactivity.
An agent must not be able to view a customer record without an assigned ticket.

2.2 Ticket handling
The agent must be able to search tickets by customer email, order reference or phone number.
The system must display the full order history for the customer attached to a ticket.
The agent must be able to add an internal note that the customer never sees.
Every note must record its author and timestamp.

3.1 Refunds
The agent must be able to issue a full or partial refund against a delivered order.
A refund above 500 EUR must require approval from a supervisor.
The system must show the refund status until the payment provider confirms settlement.

3.2 Audit
Every action taken on a customer record must be written to an immutable audit log.
The audit log must be exportable for a date range by a compliance officer.

4.1 Performance
The console must load a ticket with its order history in under two seconds.
`;

/* ------------------------------------------------------------------ */

const t0 = Date.now();
console.log(`\nPipeline test against ${BASE}\n`);

// 1. Sign in
const auth = await call("POST", "/auth/login", {
  email: "lea.moore@commerce-group.com", password: "piplanning",
});
record("sign in", auth.user.email === "lea.moore@commerce-group.com", auth.user.role);

const ai = await call("GET", "/admin/ai/status");
console.log(`      engine: ${ai.engine}${ai.configured ? ` (${ai.model})` : " (no API key — local heuristics)"}\n`);

// 2. Create a train and a project
const { train } = await call("POST", "/trains", {
  name: `Test Train ${Date.now()}`, rte: "Test RTE", piName: "PI 2026.9", sprintCount: 4,
});
record("create train", Boolean(train.id), `${train.name}, ${train.sprintCount} sprints`);

const { project } = await call("POST", "/projects", {
  trainId: train.id, name: "Customer Support Console", description: "Agent-facing console",
});
record("create project", Boolean(project.id), project.name);

// 3. Upload the URD
const dir = mkdtempSync(path.join(tmpdir(), "spa-"));
const urdPath = path.join(dir, "URD_Support_Console.txt");
writeFileSync(urdPath, URD, "utf8");

const fd = new FormData();
fd.append("file", new Blob([URD], { type: "text/plain" }), "URD_Support_Console.txt");
fd.append("projectId", String(project.id));
fd.append("scope", "project");
const upload = await call("POST", "/documents", fd);
record("upload + parse document", upload.document.status === "parsed",
       `${upload.document.sectionsDetected} sections, ${upload.document.sizeLabel}`);

// 4. Extract requirements
const extract = await call("POST", `/documents/${upload.document.id}/extract`, { replace: true });
record("extract requirements", extract.items.length > 0,
       `${extract.items.length} requirements (${extract.engine} engine)`);

// Approve them so the next step has something to work from.
const approvedReqs = await call("POST", "/backlog/requirements/bulk-status",
                                { projectId: project.id, status: "approved" });
record("approve requirements", approvedReqs.changed > 0, `${approvedReqs.changed} approved`);

// 5. Epics
const epics = await call("POST", "/backlog/generate/epics", { projectId: project.id, replace: true });
record("generate epics", epics.items.length > 0, `${epics.items.length} epics (${epics.engine})`);
await call("POST", "/backlog/epics/bulk-status", { projectId: project.id, status: "approved" });

// 6. Features
const features = await call("POST", "/backlog/generate/features", { projectId: project.id });
record("generate features", features.items.length > 0, `${features.items.length} features (${features.engine})`);
await call("POST", "/backlog/features/bulk-status", { projectId: project.id, status: "approved" });

// 7. Stories with acceptance criteria
const stories = await call("POST", "/backlog/generate/stories", { projectId: project.id });
const withCriteria = stories.items.filter((s) => s.acceptanceCriteria && s.acceptanceCriteria.length);
record("generate stories", stories.items.length > 0,
       `${stories.items.length} stories, ${withCriteria.length} with acceptance criteria (${stories.engine})`);
await call("POST", "/backlog/stories/bulk-status", { projectId: project.id, status: "approved" });

// 8. Tasks
const tasks = await call("POST", "/backlog/generate/tasks", { projectId: project.id });
record("generate tasks", tasks.items.length > 0, `${tasks.items.length} tasks (${tasks.engine})`);

// 9. Clustering
const clusters = await call("POST", "/analysis/clusters/generate", { projectId: project.id });
record("cluster stories", clusters.clusters > 0,
       `${clusters.clusters} clusters, ${clusters.duplicates.length} duplicates (${clusters.engine})`);

// 10. Dependencies
const deps = await call("POST", "/analysis/dependencies/detect", { projectId: project.id });
record("detect dependencies", deps.created >= 0, `${deps.created} found (${deps.engine})`);

// 11. Prioritisation
const scored = await call("POST", "/analysis/prioritization/score", { projectId: project.id });
record("score backlog", scored.scored > 0, `${scored.scored} scored (${scored.engine})`);

const prio = await call("GET", `/analysis/prioritization?projectId=${project.id}`);
const ranked = prio.wsjfRanked;
record("WSJF ranking is ordered", ranked.every((r, i) => i === 0 || ranked[i - 1].wsjf >= r.wsjf),
       ranked.length ? `top: ${ranked[0].ref} = ${ranked[0].wsjf}` : "no scores");

// 12. Capacity import from a generated workbook
const { sprints } = await call("GET", `/trains/${train.id}/sprints`);
const wb = new ExcelJS.Workbook();
const sheet = wb.addWorksheet("Capacity");
sheet.addRow(["Project", ...sprints.map((s) => s.name)]);
sheet.addRow([project.name, ...sprints.map(() => 40)]);
const xlsxPath = path.join(dir, "capacity.xlsx");
await wb.xlsx.writeFile(xlsxPath);

const capFd = new FormData();
const { readFileSync } = await import("node:fs");
capFd.append("file", new Blob([readFileSync(xlsxPath)], {
  type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
}), "capacity.xlsx");
const capacity = await call("POST", `/roadmap/${train.id}/capacity/import`, capFd);
record("import capacity workbook", capacity.applied === sprints.length,
       `${capacity.applied} sprint/project pairs`);

// 13. Auto-plan
const plan = await call("POST", `/roadmap/${train.id}/auto-plan`, {});
record("auto-plan the train", plan.placed.length > 0,
       `${plan.placed.length} scheduled, ${plan.unplaced.length} unplaced`);

const board = await call("GET", `/roadmap/${train.id}/board`);
const scheduledOnBoard = board.swimlanes.reduce(
  (a, l) => a + l.cells.reduce((b, c) => b + c.features.length, 0), 0);
record("board reflects the plan", scheduledOnBoard === plan.placed.length,
       `${scheduledOnBoard} features on the board`);

// Capacity is respected.
const overCapacity = board.swimlanes.flatMap((l) => l.cells).filter((c) => c.available > 0 && c.used > c.available);
record("auto-plan respects capacity", overCapacity.length === 0,
       overCapacity.length ? `${overCapacity.length} sprints over capacity` : "no sprint over capacity");

// 14. Export
const readiness = await call("GET", `/exports/${project.id}/readiness`);
record("export gate reports readiness", typeof readiness.ready === "boolean",
       readiness.ready ? "ready" : `${readiness.blocking.length} sections blocking`);

const json = await call("GET", `/exports/${project.id}/download?format=json`, undefined, { raw: true });
const jsonBody = JSON.parse(await json.text());
record("export JSON", jsonBody.counts.stories > 0,
       `${jsonBody.counts.epics} epics / ${jsonBody.counts.features} features / ${jsonBody.counts.stories} stories / ${jsonBody.counts.tasks} tasks`);

const csv = await call("GET", `/exports/${project.id}/download?format=csv`, undefined, { raw: true });
const csvText = await csv.text();
const csvLines = csvText.trim().split(/\r?\n/);
record("export CSV", csvLines.length === jsonBody.counts.stories + 1,
       `${csvLines.length - 1} data rows + header`);

const jira = await call("GET", `/exports/${project.id}/download?format=jira&projectKey=CSC`, undefined, { raw: true });
const jiraBody = JSON.parse(await jira.text());
const issues = jiraBody.projects[0].issues;
const types = [...new Set(issues.map((i) => i.issueType))];
record("export Jira payload", issues.length > 0, `${issues.length} issues (${types.join(", ")})`);

const orphans = issues.filter((i) => i.parent && !issues.some((p) => p.key === i.parent));
record("Jira parent links resolve", orphans.length === 0,
       orphans.length ? `${orphans.length} orphan parents` : "every parent exists");

// 15. Read-only role is enforced
const savedCookie = cookie;
cookie = "";
await call("POST", "/auth/login", { email: "tom.barnes@commerce-group.com", password: "piplanning" });
let blocked = false;
try {
  await call("PATCH", `/projects/${project.id}`, { name: "Should not work" });
} catch (err) { blocked = err.status === 403; }
record("read-only role blocked from writing", blocked, "Scrum Master got 403");
cookie = savedCookie;

// 16. Clean up
await call("DELETE", `/projects/${project.id}`);
await call("DELETE", `/trains/${train.id}`);
record("clean up", true, "test project and train removed");

/* ------------------------------------------------------------------ */

const failed = steps.filter((s) => !s.ok);
console.log(`\n${steps.length - failed.length}/${steps.length} steps passed in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
if (failed.length) {
  console.log("\nFailures:");
  for (const f of failed) console.log(`  · ${f.name}`);
}
