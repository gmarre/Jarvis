/** Screens 09–12: Clusters, Dependencies, Prioritization, Export. */

import {
  html, raw, api, state, on, toast, reportError, withBusy,
  statusPill, aiPill, confirmDialog, modal, fmtDate, fmtTime, SPARK,
} from "../core.js";
import { layout } from "../shell.js";

async function projectContext(projectId) {
  const [{ project }, { counts }] = await Promise.all([
    api.get(`/projects/${projectId}`),
    api.get(`/projects/${projectId}/counts`),
  ]);
  state.projectId = project.id;
  if (project.train) state.trainId = project.train.id;
  state.projects = state.projects.some((p) => p.id === project.id)
    ? state.projects.map((p) => (p.id === project.id ? project : p))
    : [...state.projects, project];
  return { project, counts };
}

/* ================================================================== *
 * 09 — Story clusters
 * ================================================================== */

export async function renderClusters(root, { id }) {
  const { counts } = await projectContext(id);
  const { clusters, ungrouped } = await api.get(`/analysis/clusters?projectId=${id}`);
  const duplicates = clusters.filter((c) => c.kind === "duplicate");
  const grouped = clusters.reduce((a, c) => a + c.stories.length, 0);

  const body = html`
    <main class="screen">
      <div class="row-flex end mb-20">
        <div>
          <h1 class="h1">Story clusters</h1>
          <p class="sub">
            ${clusters.length} clusters · ${grouped} stories grouped · ${ungrouped.length} ungrouped
            ${duplicates.length ? ` · ${duplicates.length} flagged for duplicates` : ""}
          </p>
        </div>
        <div class="push row-flex gap-10">
          <button class="btn btn--primary" data-act="recluster">${raw(SPARK.replace('fill="#6366F1"', 'fill="#fff"'))}Re-cluster</button>
          <a class="btn" href="#/project/${id}/dependencies">Continue →</a>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:14px">
        ${clusters.map((c) => html`
          <div class="card card--pad" data-cluster="${c.id}">
            <div class="row-flex gap-10 wrap mb-12">
              <span class="card-rule"></span>
              <h3 class="h3" style="font-size:17px">${c.name}</h3>
              ${c.kind === "duplicate" ? html`<span class="pill pill--danger"><span class="pill-dot"></span>duplicates</span>` : ""}
              <span class="push meta-2">${c.stories.length}</span>
            </div>
            ${c.summary ? html`<p class="meta" style="margin:0 0 12px">${c.summary}</p>` : ""}
            <div class="stack gap-2">
              ${c.stories.map((s) => html`
                <div class="list-item" draggable="true" data-story="${s.id}" style="cursor:grab">
                  <span style="width:7px;height:7px;border-radius:99px;flex:none;background:${
                    s.status === "approved" ? "var(--ok)" : s.status === "rejected" ? "var(--muted-3)" : "var(--warn)"}"></span>
                  <span class="grow truncate">${s.want}</span>
                  <span class="meta-2 mono">${s.ref}</span>
                  <span class="meta-2">${s.points} pts</span>
                </div>`)}
            </div>
            ${c.kind === "duplicate" ? html`
              <div class="row-flex gap-8 mt-12" style="padding-top:10px;border-top:1px solid var(--border-soft)">
                <span class="meta" style="color:var(--danger-ink)">Review these for overlap before planning.</span>
                <a class="btn btn--sm push" href="#/project/${id}/stories">Open stories</a>
              </div>` : ""}
          </div>`)}

        ${ungrouped.length ? html`
          <div class="card card--pad" data-cluster="">
            <div class="row-flex gap-10 mb-12">
              <span class="card-rule" style="background:var(--muted-3)"></span>
              <h3 class="h3" style="font-size:17px">Ungrouped</h3>
              <span class="push meta-2">${ungrouped.length}</span>
            </div>
            <div class="stack gap-2">
              ${ungrouped.map((s) => html`
                <div class="list-item is-muted" draggable="true" data-story="${s.id}" style="cursor:grab">
                  <span class="grow truncate">${s.want}</span><span class="meta-2 mono">${s.ref}</span>
                </div>`)}
            </div>
          </div>` : ""}
      </div>

      ${clusters.length ? "" : html`<div class="empty">No clusters yet. Run clustering on the story backlog.</div>`}
    </main>`;

  root.innerHTML = layout({ screen: "Clusters", active: "clusters", step: 6, counts, body });

  const rerender = () => renderClusters(root, { id });

  on(root, "click", '[data-act="recluster"]', async (_e, btn) => {
    try {
      const res = await withBusy(btn, () => api.post("/analysis/clusters/generate", { projectId: Number(id) }));
      toast(`${res.clusters} clusters, ${res.duplicates.length} duplicates flagged (${res.engine}).`, "ok");
      rerender();
    } catch (err) { reportError(err); }
  });

  // Drag a story between clusters.
  let dragged = null;
  on(root, "dragstart", "[data-story]", (e, el) => { dragged = el.dataset.story; e.dataTransfer.effectAllowed = "move"; });
  on(root, "dragover", "[data-cluster]", (e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; });
  on(root, "drop", "[data-cluster]", async (e, el) => {
    e.preventDefault();
    if (!dragged) return;
    try {
      await api.post("/analysis/clusters/assign", {
        storyId: Number(dragged),
        clusterId: el.dataset.cluster ? Number(el.dataset.cluster) : null,
      });
      dragged = null;
      rerender();
    } catch (err) { reportError(err); }
  });
}

/* ================================================================== *
 * 10 — Project dependencies
 * ================================================================== */

export async function renderDependencies(root, { id }) {
  const { counts } = await projectContext(id);
  const [{ dependencies, counts: depCounts }, { items: stories }] = await Promise.all([
    api.get(`/analysis/dependencies?projectId=${id}`),
    api.get(`/backlog/stories?projectId=${id}`),
  ]);

  const body = html`
    <main class="screen">
      <div class="row-flex end mb-20">
        <div>
          <h1 class="h1">Dependencies</h1>
          <p class="sub">${depCounts.total} dependencies · ${depCounts.blocking} blocking · ${depCounts.crossProject} cross-project</p>
        </div>
        <div class="push row-flex gap-10">
          <button class="btn" data-act="add">+ Add manually</button>
          <button class="btn btn--primary" data-act="detect">${raw(SPARK.replace('fill="#6366F1"', 'fill="#fff"'))}Detect with AI</button>
          ${state.trainId ? html`<a class="btn" href="#/train/${state.trainId}/dependencies">Train view</a>` : ""}
        </div>
      </div>

      <div class="card card--flush">
        <div class="row-head" style="grid-template-columns:1.3fr 40px 1.3fr 1fr 2fr 60px">
          <div>Blocker</div><div></div><div>Blocked</div><div>Severity</div><div>Why</div><div></div>
        </div>
        ${dependencies.length ? dependencies.map((d) => html`
          <div class="row" style="grid-template-columns:1.3fr 40px 1.3fr 1fr 2fr 60px">
            <div><span class="num">${d.from.ref}</span><div class="truncate" style="color:var(--ink-2)">${d.from.label}</div>
              <span class="meta-2">${d.from.projectName}</span></div>
            <div style="text-align:center;color:var(--muted-2)">→</div>
            <div><span class="num">${d.to.ref}</span><div class="truncate" style="color:var(--ink-2)">${d.to.label}</div>
              <span class="meta-2">${d.to.projectName}</span></div>
            <div><span class="pill ${d.severity === "blocking" ? "pill--danger" : "pill--grey"}">
              <span class="pill-dot"></span>${d.severity === "blocking" ? "Blocking" : "Normal"}</span></div>
            <div class="meta">${d.note || "—"}</div>
            <div style="text-align:right"><button class="btn btn--sm btn--danger" data-act="remove" data-id="${d.id}">✕</button></div>
          </div>`) : html`<div class="empty">No dependencies recorded for this project.</div>`}
      </div>
    </main>`;

  root.innerHTML = layout({ screen: "Dependencies", active: "dependencies", step: 7, counts, body });

  const rerender = () => renderDependencies(root, { id });

  on(root, "click", '[data-act="detect"]', async (_e, btn) => {
    try {
      const res = await withBusy(btn, () => api.post("/analysis/dependencies/detect", { projectId: Number(id) }));
      toast(`${res.created} dependencies detected (${res.engine}).`, "ok");
      rerender();
    } catch (err) { reportError(err); }
  });

  on(root, "click", '[data-act="remove"]', async (_e, el) => {
    try { await api.del(`/analysis/dependencies/${el.dataset.id}`); rerender(); }
    catch (err) { reportError(err); }
  });

  on(root, "click", '[data-act="add"]', async () => {
    const opts = stories.map((s) => ({ value: s.id, label: `${s.ref} — ${s.want}` }));
    const created = await modal(
      () => html`
        <div class="modal-head"><h2 class="h2">Add a dependency</h2>
          <p class="sub">The blocker must ship before the blocked item.</p></div>
        <form class="modal-body stack gap-16" id="dep-form">
          <label class="field"><span class="field-label">Blocker</span>
            <select class="select" name="fromId">${opts.map((o) => html`<option value="${o.value}">${o.label}</option>`)}</select></label>
          <label class="field"><span class="field-label">Blocked</span>
            <select class="select" name="toId">${opts.map((o) => html`<option value="${o.value}">${o.label}</option>`)}</select></label>
          <label class="field"><span class="field-label">Severity</span>
            <select class="select" name="severity"><option value="normal">Normal</option><option value="blocking">Blocking</option></select></label>
          <label class="field"><span class="field-label">Why</span>
            <textarea class="textarea" name="note" placeholder="What makes this a dependency?"></textarea></label>
        </form>
        <div class="modal-foot">
          <button class="btn" data-act="cancel">Cancel</button>
          <button class="btn btn--primary push" data-act="save">Add</button>
        </div>`,
      {
        onMount(overlay, close) {
          on(overlay, "click", '[data-act="cancel"]', () => close(null));
          on(overlay, "click", '[data-act="save"]', async (_e, btn) => {
            const f = overlay.querySelector("#dep-form");
            try {
              await withBusy(btn, () => api.post("/analysis/dependencies", {
                fromType: "story", fromId: Number(f.elements.fromId.value),
                toType: "story", toId: Number(f.elements.toId.value),
                severity: f.elements.severity.value,
                note: f.elements.note.value.trim() || null,
              }));
              close(true);
            } catch (err) { reportError(err); }
          });
        },
      },
    );
    if (created) { toast("Dependency added.", "ok"); rerender(); }
  });
}

/* ================================================================== *
 * 11 — Prioritization
 * ================================================================== */

let prioTab = "moscow";

export async function renderPrioritization(root, { id }) {
  const { counts } = await projectContext(id);
  const { items, buckets, wsjfRanked } = await api.get(`/analysis/prioritization?projectId=${id}`);

  const body = html`
    <main class="screen">
      <div class="row-flex end mb-20">
        <div class="row-flex gap-12 baseline">
          <h1 class="h1">Prioritization</h1>
          <span class="segmented">
            ${[["moscow", "MoSCoW"], ["wsjf", "WSJF"], ["matrix", "Value × Risk"]].map(([k, label]) => html`
              <button class="${prioTab === k ? "is-active" : ""}" data-tab="${k}">${label}</button>`)}
          </span>
        </div>
        <button class="btn btn--primary push" data-act="score">
          ${raw(SPARK.replace('fill="#6366F1"', 'fill="#fff"'))}Recalculate priorities (AI)
        </button>
      </div>

      ${prioTab === "moscow" ? raw(moscowBoard(buckets)) : ""}
      ${prioTab === "wsjf" ? raw(wsjfTable(wsjfRanked, items)) : ""}
      ${prioTab === "matrix" ? raw(valueRiskMatrix(items)) : ""}
    </main>`;

  root.innerHTML = layout({ screen: "Prioritization", active: "prioritization", step: 8, counts, body });

  const rerender = () => renderPrioritization(root, { id });

  on(root, "click", "[data-tab]", (_e, el) => { prioTab = el.dataset.tab; rerender(); });

  on(root, "click", '[data-act="score"]', async (_e, btn) => {
    try {
      const res = await withBusy(btn, () => api.post("/analysis/prioritization/score", { projectId: Number(id) }));
      toast(`${res.scored} stories scored (${res.engine}).`, "ok");
      rerender();
    } catch (err) { reportError(err); }
  });

  // MoSCoW drag-and-drop.
  let dragged = null;
  on(root, "dragstart", "[data-prio-story]", (e, el) => { dragged = el.dataset.prioStory; e.dataTransfer.effectAllowed = "move"; });
  on(root, "dragover", "[data-bucket]", (e, el) => { e.preventDefault(); el.classList.add("is-drop"); });
  on(root, "dragleave", "[data-bucket]", (_e, el) => el.classList.remove("is-drop"));
  on(root, "drop", "[data-bucket]", async (e, el) => {
    e.preventDefault();
    el.classList.remove("is-drop");
    if (!dragged) return;
    try {
      await api.post("/analysis/prioritization/moscow", { storyId: Number(dragged), moscow: el.dataset.bucket });
      dragged = null;
      rerender();
    } catch (err) { reportError(err); }
  });

  on(root, "click", "[data-wsjf-edit]", async (_e, el) => {
    const item = items.find((i) => i.id === Number(el.dataset.wsjfEdit));
    const saved = await modal(
      () => html`
        <div class="modal-head"><h2 class="h2">WSJF · ${item.ref}</h2>
          <p class="sub">(Business Value + Time Criticality + Risk Reduction) ÷ Job Size</p></div>
        <form class="modal-body" id="wsjf-form" style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
          ${[["businessValue", "Business value", item.businessValue ?? 5],
             ["timeCriticality", "Time criticality", item.timeCriticality ?? 5],
             ["riskReduction", "Risk reduction", item.riskReduction ?? 3],
             ["jobSize", "Job size", item.jobSize ?? item.points ?? 5]].map(([name, label, value]) => html`
            <label class="field"><span class="field-label">${label}</span>
              <input class="input" type="number" min="0" max="20" name="${name}" value="${value}"></label>`)}
        </form>
        <div class="modal-foot">
          <button class="btn" data-act="cancel">Cancel</button>
          <button class="btn btn--primary push" data-act="save">Save</button>
        </div>`,
      {
        onMount(overlay, close) {
          on(overlay, "click", '[data-act="cancel"]', () => close(null));
          on(overlay, "click", '[data-act="save"]', async (_e, btn) => {
            const f = overlay.querySelector("#wsjf-form");
            try {
              await withBusy(btn, () => api.post("/analysis/prioritization/wsjf", {
                storyId: item.id,
                businessValue: Number(f.elements.businessValue.value),
                timeCriticality: Number(f.elements.timeCriticality.value),
                riskReduction: Number(f.elements.riskReduction.value),
                jobSize: Number(f.elements.jobSize.value),
              }));
              close(true);
            } catch (err) { reportError(err); }
          });
        },
      },
    );
    if (saved) rerender();
  });
}

const BUCKET_META = {
  Must: { color: "var(--primary)", label: "Must" },
  Should: { color: "var(--primary)", label: "Should" },
  Could: { color: "var(--muted-2)", label: "Could" },
  Wont: { color: "var(--muted-3)", label: "Won't" },
};

function moscowBoard(buckets) {
  return `<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px;align-items:start">${
    Object.entries(BUCKET_META).map(([key, meta]) => {
      const list = buckets[key] || [];
      return `<div class="card card--pad" data-bucket="${key}" style="min-height:220px">
        <div class="row-flex gap-10" style="margin-bottom:12px">
          <span style="width:8px;height:8px;border-radius:99px;background:${meta.color}"></span>
          <h3 class="h3" style="font-size:18px">${meta.label}</h3>
          <span class="push pill pill--plain">${list.length}</span>
        </div>
        <div class="stack gap-8">${
          list.map((s) => `<div class="card" draggable="true" data-prio-story="${s.id}"
              style="padding:10px 12px;cursor:grab;background:var(--bg)${s.status === "rejected" ? ";opacity:.55" : ""}">
              <div class="num">${s.ref}</div>
              <div style="font-size:13px;color:var(--ink-2);margin-top:2px">${escapeHtml(s.title)}</div>
              <div class="row-flex gap-6" style="margin-top:6px">
                <span class="meta-2">${s.points} pts</span>
                ${s.wsjf != null ? `<span class="push meta" style="font-weight:600;color:var(--primary-dark)">WSJF ${s.wsjf}</span>` : ""}
              </div>
            </div>`).join("")
        }${list.length ? "" : '<div class="meta-2" style="text-align:center;padding:18px 0">Drop here</div>'}</div>
      </div>`;
    }).join("")
  }</div>`;
}

function wsjfTable(ranked, items) {
  const rows = ranked.length ? ranked : items;
  return `<div class="card card--flush">
    <div class="row-flex gap-10" style="padding:16px 18px 12px">
      <h3 class="h3">WSJF score</h3>
      <span class="meta">(Business Value + Time Criticality + Risk Reduction) ÷ Job Size</span>
    </div>
    <div class="row-head" style="grid-template-columns:2.4fr 70px 70px 70px 90px 80px 90px">
      <div>Story</div><div>BV</div><div>TC</div><div>RR</div><div>Job size</div><div>WSJF</div><div></div>
    </div>
    ${rows.map((s) => `<div class="row" style="grid-template-columns:2.4fr 70px 70px 70px 90px 80px 90px">
      <div><span class="num">${s.ref}</span><div style="color:var(--ink-2)">${escapeHtml(s.title)}</div></div>
      <div>${s.businessValue ?? "—"}</div><div>${s.timeCriticality ?? "—"}</div>
      <div>${s.riskReduction ?? "—"}</div><div>${s.jobSize ?? "—"}</div>
      <div style="font-weight:700;color:${s.wsjf != null ? "var(--primary-dark)" : "var(--muted-3)"}">${s.wsjf ?? "—"}</div>
      <div style="text-align:right"><button class="btn btn--sm" data-wsjf-edit="${s.id}">Edit</button></div>
    </div>`).join("")}
    ${rows.length ? "" : '<div class="empty">No stories to score.</div>'}
  </div>`;
}

function valueRiskMatrix(items) {
  const scored = items.filter((i) => i.businessValue != null);
  const dot = (s) => {
    // Value on Y, risk (inverse of risk reduction) on X.
    const x = ((10 - (s.riskReduction || 5)) / 10) * 100;
    const y = 100 - ((s.businessValue || 5) / 10) * 100;
    const colour = s.status === "approved" ? "var(--ok)" : s.status === "rejected" ? "var(--muted-3)" : "var(--warn)";
    return `<span title="${escapeHtml(s.ref + " — " + s.title)}"
      style="position:absolute;left:${x}%;top:${y}%;transform:translate(-50%,-50%);width:12px;height:12px;border-radius:99px;background:${colour};border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,.2)"></span>`;
  };

  return `<div class="card card--pad">
    <h3 class="h3">Value × Risk</h3>
    <div class="meta" style="margin-bottom:14px">Each dot is one story · colour = review status</div>
    <div style="position:relative;height:380px;border:1px solid var(--border);border-radius:12px;background:
      linear-gradient(to right, var(--border-faint) 1px, transparent 1px) 0 0/50% 100%,
      linear-gradient(to bottom, var(--border-faint) 1px, transparent 1px) 0 0/100% 50%">
      <span class="meta-2" style="position:absolute;top:8px;left:10px">Quick wins</span>
      <span class="meta-2" style="position:absolute;top:8px;right:10px">Big bets</span>
      <span class="meta-2" style="position:absolute;bottom:8px;left:10px">Fill-ins</span>
      <span class="meta-2" style="position:absolute;bottom:8px;right:10px">Question marks</span>
      ${scored.map(dot).join("")}
    </div>
    <div class="row-flex gap-16 mt-12">
      <span class="meta">← Value</span><span class="push meta">Risk →</span>
    </div>
    ${scored.length ? "" : '<div class="meta mt-12">No WSJF scores yet — run the AI scoring to populate the matrix.</div>'}
  </div>`;
}

function escapeHtml(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/* ================================================================== *
 * 12 — Export
 * ================================================================== */

export async function renderExport(root, { id }) {
  const { project, counts } = await projectContext(id);
  const readiness = await api.get(`/exports/${id}/readiness`);

  const body = html`
    <main class="screen">
      <div class="row-flex end mb-20">
        <div>
          <h1 class="h1">Export</h1>
          <p class="sub">Approval gate — only approved items leave the workspace by default.</p>
        </div>
        <span class="push">${readiness.ready
          ? html`<span class="pill pill--ok"><span class="pill-dot"></span>Ready to export</span>`
          : html`<span class="pill pill--warn"><span class="pill-dot"></span>${readiness.blocking.length} section${readiness.blocking.length === 1 ? "" : "s"} still in review</span>`}</span>
      </div>

      <div style="display:grid;grid-template-columns:1.2fr 1fr;gap:14px">
        <div class="card card--flush">
          <div class="row-flex gap-10" style="padding:16px 18px 12px"><h3 class="h3">Approval gate</h3></div>
          <div class="row-head" style="grid-template-columns:1.4fr 1fr 1fr 1fr">
            <div>Section</div><div>Approved</div><div>In review</div><div>Rejected</div>
          </div>
          ${readiness.sections.map((s) => html`
            <div class="row" style="grid-template-columns:1.4fr 1fr 1fr 1fr">
              <div style="text-transform:capitalize;font-weight:600">${s.entity}</div>
              <div><span class="pill pill--ok"><span class="pill-dot"></span>${s.approved}</span></div>
              <div>${s.inReview
                ? html`<span class="pill pill--warn"><span class="pill-dot"></span>${s.inReview}</span>`
                : html`<span class="meta-2">0</span>`}</div>
              <div>${s.rejected
                ? html`<span class="pill pill--grey"><span class="pill-dot"></span>${s.rejected}</span>`
                : html`<span class="meta-2">0</span>`}</div>
            </div>`)}
        </div>

        <div class="card card--pad stack gap-14">
          <h3 class="h3">Download</h3>
          <label class="row-flex gap-10" style="font-size:13px;cursor:pointer">
            <input type="checkbox" data-include-review style="width:16px;height:16px;accent-color:var(--primary)">
            Include items still in review
          </label>
          <label class="row-flex gap-10" style="font-size:13px;cursor:pointer">
            <input type="checkbox" data-include-rejected style="width:16px;height:16px;accent-color:var(--primary)">
            Include rejected items
          </label>
          <label class="field"><span class="field-label">Jira project key</span>
            <input class="input input--sm" data-jira-key value="PI" maxlength="10"></label>

          <div class="stack gap-8 mt-8">
            <button class="btn btn--primary" data-export="json">Download JSON</button>
            <button class="btn" data-export="csv">Download CSV</button>
            <button class="btn" data-export="jira">Download Jira payload</button>
            <button class="btn btn--ghost" data-act="preview">Preview payload</button>
          </div>
        </div>
      </div>

      <div class="card card--flush mt-16">
        <div class="row-flex gap-10" style="padding:16px 18px 12px"><h3 class="h3">Export history</h3></div>
        ${readiness.history.length ? html`
          <div class="row-head" style="grid-template-columns:1fr 1fr 1fr 1.4fr">
            <div>Format</div><div>Items</div><div>By</div><div>When</div>
          </div>
          ${readiness.history.map((h) => html`
            <div class="row" style="grid-template-columns:1fr 1fr 1fr 1.4fr">
              <div style="text-transform:uppercase;font-weight:600">${h.format}</div>
              <div>${h.itemCount}</div>
              <div class="meta">${h.user || "—"}</div>
              <div class="meta">${fmtDate(h.createdAt)} ${fmtTime(h.createdAt)}</div>
            </div>`)}` : html`<div class="empty">Nothing exported yet.</div>`}
      </div>
    </main>`;

  root.innerHTML = layout({ screen: "Export", active: "export", step: 10, counts, body });

  const flags = () => {
    const q = [];
    if (root.querySelector("[data-include-review]").checked) q.push("includeInReview=1");
    if (root.querySelector("[data-include-rejected]").checked) q.push("includeRejected=1");
    return q;
  };

  on(root, "click", "[data-export]", (_e, el) => {
    const format = el.dataset.export;
    const q = [`format=${format}`, ...flags()];
    if (format === "jira") q.push(`projectKey=${encodeURIComponent(root.querySelector("[data-jira-key]").value || "PI")}`);
    api.download(`/exports/${id}/download?${q.join("&")}`);
    toast(`${format.toUpperCase()} export started.`, "ok");
    setTimeout(() => renderExport(root, { id }), 900);
  });

  on(root, "click", '[data-act="preview"]', async (_e, btn) => {
    try {
      const { payload } = await withBusy(btn, () => api.get(`/exports/${id}/preview?${flags().join("&")}`));
      await modal(() => html`
        <div class="modal-head"><h2 class="h2">Export preview</h2>
          <p class="sub">${payload.counts.epics} epics · ${payload.counts.features} features ·
            ${payload.counts.stories} stories · ${payload.counts.tasks} tasks</p></div>
        <div class="modal-body">
          <pre style="margin:0;max-height:420px;overflow:auto;font-size:11.5px;line-height:1.6;background:var(--bg);padding:14px;border-radius:12px">${JSON.stringify(payload, null, 2)}</pre>
        </div>
        <div class="modal-foot"><button class="btn push" data-act="cancel">Close</button></div>`,
        { onMount(overlay, close) { on(overlay, "click", '[data-act="cancel"]', () => close(null)); } });
    } catch (err) { reportError(err); }
  });
}
