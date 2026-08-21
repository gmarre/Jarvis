/**
 * Pipeline screens 04–08 and 16:
 * URD Import, Requirements, Epics, Features, User Stories, Tasks.
 */

import {
  html, raw, esc, api, state, on, toast, reportError, withBusy,
  statusPill, aiPill, confirmDialog, modal, SPARK,
} from "../core.js";
import { layout } from "../shell.js";

/** Loads the project + sidebar counters every pipeline screen needs. */
async function projectContext(projectId) {
  const [{ project }, { counts }] = await Promise.all([
    api.get(`/projects/${projectId}`),
    api.get(`/projects/${projectId}/counts`),
  ]);
  state.projectId = project.id;
  if (project.train) state.trainId = project.train.id;
  if (!state.projects.find((p) => p.id === project.id)) state.projects.push(project);
  else state.projects = state.projects.map((p) => (p.id === project.id ? project : p));
  return { project, counts };
}

/** Approve / reject / reopen buttons shared by every review screen. */
function reviewActions(entity, item) {
  return html`
    <div class="row-flex gap-6">
      <button class="btn btn--sm" data-review="in_review" data-entity="${entity}" data-id="${item.id}"
              ${item.status === "in_review" ? "disabled" : ""}>Reopen</button>
      <button class="btn btn--sm" data-review="rejected" data-entity="${entity}" data-id="${item.id}"
              ${item.status === "rejected" ? "disabled" : ""}>Reject</button>
      <button class="btn btn--sm btn--primary" data-review="approved" data-entity="${entity}" data-id="${item.id}"
              ${item.status === "approved" ? "disabled" : ""}>Approve</button>
    </div>`;
}

/** Binds the shared review buttons to the API and re-renders. */
function bindReview(root, rerender) {
  on(root, "click", "[data-review]", async (_e, el) => {
    try {
      await api.patch(`/backlog/${el.dataset.entity}/${el.dataset.id}`, { status: el.dataset.review });
      rerender();
    } catch (err) { reportError(err); }
  });

  on(root, "click", "[data-approve-all]", async (_e, btn) => {
    const entity = btn.dataset.approveAll;
    const ok = await confirmDialog({
      title: "Approve everything in review?",
      message: `Every ${entity.replace(/s$/, "")} still in review will be approved.`,
      confirmLabel: "Approve all",
    });
    if (!ok) return;
    try {
      const res = await withBusy(btn, () =>
        api.post(`/backlog/${entity}/bulk-status`, { projectId: state.projectId, status: "approved" }));
      toast(`${res.changed} approved.`, "ok");
      rerender();
    } catch (err) { reportError(err); }
  });
}

function confidenceBar(value) {
  if (value == null) return "";
  const p = Math.round(value * 100);
  const low = value < 0.7;
  return raw(`<span class="row-flex gap-8" title="AI confidence">
    <span class="meta-2">AI confidence</span>
    <span class="progress" style="width:60px"><i style="width:${p}%;background:${low ? "var(--warn)" : "var(--primary)"}"></i></span>
    <span class="meta" style="font-weight:600">${p} %</span></span>`);
}

/* ================================================================== *
 * 04 — URD Import
 * ================================================================== */

export async function renderImport(root, { id }) {
  const { project, counts } = await projectContext(id);
  const { documents } = await api.get(`/documents?projectId=${id}`);
  const latest = documents[0] || null;
  const detail = latest ? (await api.get(`/documents/${latest.id}`)).document : null;

  const body = html`
    <main class="screen">
      <h1 class="h1">Requirements document import</h1>
      <p class="sub" style="margin-bottom:16px">
        PDF, DOCX, TXT or MD · 25 MB max. The document stays in your project workspace.
      </p>

      <div class="row-flex gap-12 wrap mb-16">
        <span class="meta" style="font-weight:600">Scope</span>
        <span class="segmented">
          <button data-scope="train">${raw('<span class="sidebar-rail" style="height:13px"></span>')}Train-level</button>
          <button class="is-active" data-scope="project">Project-level</button>
        </span>
        ${state.trainId ? html`
          <span class="row-flex gap-8" style="height:34px;padding:0 12px;border-radius:10px;background:var(--primary-tint);border:1px solid rgba(99,102,241,.25);font-size:12.5px;color:var(--ink-2)">
            ${aiPill("AI")} shared train requirements available to link
            <a href="#/train/${state.trainId}/requirements" style="font-weight:600;text-decoration:none;margin-left:2px">Review</a>
          </span>` : ""}
      </div>

      <div style="display:grid;grid-template-columns:340px 1fr;gap:20px">
        <div class="card" style="padding:20px;height:fit-content">
          <h3 class="h3" style="margin-bottom:16px">Project</h3>
          <form class="stack gap-14" id="project-form">
            <label class="field"><span class="field-label">Project name</span>
              <input class="input input--sm" name="name" value="${project.name}"></label>
            <label class="field"><span class="field-label">Short description</span>
              <textarea class="textarea" name="description">${project.description || ""}</textarea></label>
            <label class="field"><span class="field-label">SAFe team</span>
              <input class="input input--sm" name="safeTeam" value="${project.safeTeam || ""}"></label>
            <button class="btn btn--sm" type="submit">Save project</button>
          </form>
        </div>

        <div class="stack gap-16">
          <div class="dropzone" data-dropzone tabindex="0" role="button">
            <div style="width:44px;height:44px;border-radius:14px;background:var(--primary-tint);display:flex;align-items:center;justify-content:center;margin-bottom:14px">
              <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="#6366F1" stroke-width="1.9" stroke-linecap="round">
                <path d="M12 16V4M7 9l5-5 5 5"></path><path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"></path>
              </svg>
            </div>
            <div style="font-size:14px;font-weight:600">Drag your requirements document or click to browse</div>
            <div class="meta-2 mt-6">PDF · DOCX · TXT · MD — 25 MB max</div>
            <input type="file" accept=".pdf,.docx,.txt,.md" hidden data-file-input>
          </div>

          ${detail ? html`
            <div class="card" style="padding:20px">
              <div class="row-flex gap-12">
                <div style="width:38px;height:38px;flex:none;border-radius:11px;background:var(--primary-tint);display:flex;align-items:center;justify-content:center">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6366F1" stroke-width="1.8">
                    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"></path><path d="M14 3v5h5"></path>
                  </svg>
                </div>
                <div class="grow">
                  <div style="font-size:14px;font-weight:600">${detail.filename}</div>
                  <div class="meta mt-2">
                    ${detail.sizeLabel}${detail.pages ? ` · ${detail.pages} pages` : ""} ·
                    ${detail.sectionsDetected} sections · ${detail.requirementCount} requirements extracted
                  </div>
                </div>
                ${statusPill(detail.status === "parsed" ? "approved" : detail.status === "failed" ? "rejected" : "in_review")}
                <button class="btn btn--sm btn--danger" data-act="delete-doc" data-id="${detail.id}">✕</button>
              </div>
              <div class="row-flex gap-10 mt-16">
                <span class="progress grow"><i style="width:${detail.progress}%"></i></span>
                <span class="meta mono" style="font-weight:600">${detail.progress} %</span>
              </div>
              ${detail.error ? html`<div class="meta mt-8" style="color:var(--danger-ink)">${detail.error}</div>` : ""}
            </div>

            <div class="card" style="padding:20px">
              <div class="card-head">
                <h3 class="h3">Extracted text preview</h3>
                <span class="meta-2">first ${detail.sectionsDetected} sections</span>
              </div>
              <pre style="font-size:13px;line-height:1.65;color:var(--ink-2);white-space:pre-wrap;font-family:var(--font);max-height:180px;overflow:auto;margin:0">${detail.excerpt || "No text extracted."}</pre>
              <div class="row-flex gap-12 mt-16" style="padding-top:16px;border-top:1px solid var(--border-soft)">
                ${aiPill(state.ai.configured ? "Claude · claude-opus-5" : "Local extraction engine")}
                <span class="meta">${detail.requirementCount ? `${detail.requirementCount} requirements already extracted` : "Not extracted yet"}</span>
                <button class="btn btn--primary push" data-act="extract" data-id="${detail.id}"
                        ${detail.status !== "parsed" ? "disabled" : ""}>
                  ${raw(SPARK.replace('fill="#6366F1"', 'fill="#fff"'))}
                  ${detail.requirementCount ? "Re-run extraction" : "Run AI extraction"}
                </button>
              </div>
            </div>` : html`
            <div class="empty">No document imported yet. Upload a URD to start the pipeline.</div>`}
        </div>
      </div>
    </main>`;

  root.innerHTML = layout({ screen: "URD Import", active: "import", step: 0, counts, body });

  const rerender = () => renderImport(root, { id });

  // Project details form.
  root.querySelector("#project-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = e.target;
    try {
      await withBusy(f.querySelector("button"), () => api.patch(`/projects/${id}`, {
        name: f.elements.name.value.trim(),
        description: f.elements.description.value.trim() || null,
        safeTeam: f.elements.safeTeam.value.trim() || null,
      }));
      toast("Project saved.", "ok");
      rerender();
    } catch (err) { reportError(err); }
  });

  // Upload — click, keyboard, and drag-and-drop.
  const zone = root.querySelector("[data-dropzone]");
  const input = root.querySelector("[data-file-input]");
  let scope = "project";

  on(root, "click", "[data-scope]", (_e, el) => {
    scope = el.dataset.scope;
    root.querySelectorAll("[data-scope]").forEach((b) => b.classList.toggle("is-active", b === el));
  });

  zone.addEventListener("click", () => input.click());
  zone.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); input.click(); } });
  ["dragenter", "dragover"].forEach((evt) =>
    zone.addEventListener(evt, (e) => { e.preventDefault(); zone.classList.add("is-over"); }));
  ["dragleave", "drop"].forEach((evt) =>
    zone.addEventListener(evt, (e) => { e.preventDefault(); zone.classList.remove("is-over"); }));
  zone.addEventListener("drop", (e) => { if (e.dataTransfer.files[0]) upload(e.dataTransfer.files[0]); });
  input.addEventListener("change", () => { if (input.files[0]) upload(input.files[0]); });

  async function upload(file) {
    const fd = new FormData();
    fd.append("file", file);
    if (scope === "train" && state.trainId) { fd.append("scope", "train"); fd.append("trainId", state.trainId); }
    else { fd.append("scope", "project"); fd.append("projectId", id); }

    zone.innerHTML = '<div class="row-flex gap-10"><span class="spinner spinner--ink"></span>Parsing ' + esc(file.name) + "…</div>";
    try {
      const res = await api.post("/documents", fd);
      toast(`${res.document.filename} parsed — ${res.document.sectionsDetected} sections found.`, "ok");
      rerender();
    } catch (err) {
      reportError(err, "Upload failed.");
      rerender();
    }
  }

  on(root, "click", '[data-act="extract"]', async (_e, btn) => {
    try {
      const res = await withBusy(btn, () => api.post(`/documents/${btn.dataset.id}/extract`, { replace: true }));
      toast(`${res.items.length} requirements extracted with the ${res.engine} engine.`,
            res.engine === "claude" ? "ok" : "info");
      location.hash = `#/project/${id}/requirements`;
    } catch (err) { reportError(err, "Extraction failed."); }
  });

  on(root, "click", '[data-act="delete-doc"]', async (_e, el) => {
    if (!await confirmDialog({ title: "Delete this document?", confirmLabel: "Delete", danger: true })) return;
    try { await api.del(`/documents/${el.dataset.id}`); rerender(); }
    catch (err) { reportError(err); }
  });
}

/* ================================================================== *
 * 05 — Requirements review
 * ================================================================== */

export async function renderRequirements(root, { id }) {
  const { project, counts } = await projectContext(id);
  const [{ items }, { documents }] = await Promise.all([
    api.get(`/backlog/requirements?projectId=${id}`),
    api.get(`/documents?projectId=${id}`),
  ]);
  const doc = documents[0] || null;
  const source = doc ? (await api.get(`/documents/${doc.id}/text`)).text : "";

  const inReview = items.filter((r) => r.status === "in_review").length;

  const body = html`
    <main class="screen screen--tight">
      <div class="row-flex end mb-16">
        <div>
          <h1 class="h1">Requirements</h1>
          <p class="sub">${items.length} extracted · ${inReview} awaiting review</p>
        </div>
        <div class="push row-flex gap-10">
          ${inReview ? html`<button class="btn" data-approve-all="requirements">Approve all in review</button>` : ""}
          <button class="btn btn--primary" data-act="to-epics" ${items.filter((r) => r.status === "approved").length ? "" : "disabled"}>
            ${raw(SPARK.replace('fill="#6366F1"', 'fill="#fff"'))}Generate epics
          </button>
        </div>
      </div>

      <div style="flex:1;min-height:0;display:grid;grid-template-columns:1fr 1.35fr;grid-template-rows:minmax(0,1fr);gap:14px">
        <div class="card card--flush stack">
          <div class="row-flex gap-10" style="padding:16px 18px 12px">
            <h3 class="h3">Source document</h3>
            <span class="push meta-2">${doc ? doc.filename : "none"}</span>
          </div>
          <pre class="scroll-y" style="margin:0;padding:0 18px 18px;font-family:var(--font);font-size:12.5px;line-height:1.7;color:var(--ink-2);white-space:pre-wrap">${source || "No document imported."}</pre>
        </div>

        <div class="card card--flush stack">
          <div class="row-flex gap-10" style="padding:16px 18px 12px">
            <h3 class="h3">Extracted requirements</h3>
            <span class="push">${aiPill()}</span>
          </div>
          <div class="scroll-y">
            ${items.length ? items.map((r) => html`
              <div class="row" style="grid-template-columns:1fr;gap:8px;padding:14px 18px">
                <div class="row-flex gap-10 wrap">
                  <span class="num">${r.ref}</span>
                  ${r.section ? html`<span class="meta-2">§ ${r.section}${r.page ? ` · p. ${r.page}` : ""}</span>` : ""}
                  ${statusPill(r.status)}
                  <span class="push">${confidenceBar(r.confidence)}</span>
                </div>
                <div style="font-size:13.5px;color:var(--ink);font-weight:600">${r.title}</div>
                ${r.body ? html`<div class="meta" style="line-height:1.6">${r.body}</div>` : ""}
                <div class="row-flex gap-6">
                  <button class="btn btn--sm" data-act="edit-req" data-id="${r.id}">Edit</button>
                  ${reviewActions("requirements", r)}
                </div>
              </div>`) : html`<div class="empty">Nothing extracted yet. Import a document and run extraction.</div>`}
          </div>
        </div>
      </div>
    </main>`;

  root.innerHTML = layout({ screen: "Requirements", active: "requirements", step: 1, counts, body });

  const rerender = () => renderRequirements(root, { id });
  bindReview(root, rerender);

  on(root, "click", '[data-act="edit-req"]', async (_e, el) => {
    const item = items.find((r) => r.id === Number(el.dataset.id));
    const saved = await editDialog("Edit requirement", [
      { name: "title", label: "Title", value: item.title },
      { name: "body", label: "Statement", value: item.body || "", type: "textarea" },
      { name: "section", label: "Section", value: item.section || "" },
    ], (values) => api.patch(`/backlog/requirements/${item.id}`, values));
    if (saved) rerender();
  });

  on(root, "click", '[data-act="to-epics"]', async (_e, btn) => {
    try {
      const res = await withBusy(btn, () => api.post("/backlog/generate/epics", { projectId: Number(id), replace: true }));
      toast(`${res.items.length} epics generated with the ${res.engine} engine.`, "ok");
      location.hash = `#/project/${id}/epics`;
    } catch (err) { reportError(err); }
  });
}

/* ================================================================== *
 * 06 — Epics review
 * ================================================================== */

export async function renderEpics(root, { id }) {
  const { counts } = await projectContext(id);
  const [{ items }, features] = await Promise.all([
    api.get(`/backlog/epics?projectId=${id}`),
    api.get(`/backlog/features?projectId=${id}`),
  ]);
  const byEpic = new Map();
  for (const f of features.items) {
    if (!byEpic.has(f.epicId)) byEpic.set(f.epicId, []);
    byEpic.get(f.epicId).push(f);
  }
  const inReview = items.filter((e) => e.status === "in_review").length;

  const body = html`
    <main class="screen">
      <div class="row-flex end mb-20">
        <div>
          <h1 class="h1">Epics</h1>
          <p class="sub">${items.length} epics · ${inReview} awaiting review</p>
        </div>
        <div class="push row-flex gap-10">
          ${inReview ? html`<button class="btn" data-approve-all="epics">Approve all in review</button>` : ""}
          <button class="btn" data-act="regenerate">${raw(SPARK)}Regenerate</button>
          <button class="btn btn--primary" data-act="to-features"
                  ${items.filter((e) => e.status === "approved").length ? "" : "disabled"}>
            ${raw(SPARK.replace('fill="#6366F1"', 'fill="#fff"'))}Generate features
          </button>
        </div>
      </div>

      <div class="stack gap-14">
        ${items.length ? items.map((e) => {
          const list = byEpic.get(e.id) || [];
          return html`
            <div class="card card--pad">
              <div class="row-flex gap-10 wrap mb-12">
                <span class="card-rule"></span>
                <span class="num">${e.ref}</span>
                <h3 class="h3">${e.title}</h3>
                ${statusPill(e.status)}
                ${e.aiGenerated ? aiPill() : ""}
                <span class="push">${confidenceBar(e.confidence)}</span>
              </div>
              ${e.description ? html`<p class="meta" style="line-height:1.6;margin:0 0 12px">${e.description}</p>` : ""}
              <div class="row-flex gap-8 wrap mb-12">
                <span class="pill pill--plain">${list.length} feature${list.length === 1 ? "" : "s"}</span>
                <span class="pill pill--plain">${list.reduce((a, f) => a + f.points, 0)} pts</span>
              </div>
              ${list.length ? html`
                <div class="stack gap-4" style="border-top:1px solid var(--border-soft);padding-top:10px">
                  ${list.map((f) => html`
                    <div class="row-flex gap-10" style="font-size:12.5px;color:var(--ink-2)">
                      <span class="num">${f.ref}</span><span class="grow truncate">${f.title}</span>
                      <span class="meta-2">${f.points} pts</span>${statusPill(f.status)}
                    </div>`)}
                </div>` : ""}
              <div class="row-flex gap-6 mt-12">
                <button class="btn btn--sm" data-act="edit-epic" data-id="${e.id}">Edit</button>
                <button class="btn btn--sm" data-act="features-for" data-id="${e.id}">${raw(SPARK)}Features for this epic</button>
                <span class="push">${reviewActions("epics", e)}</span>
              </div>
            </div>`;
        }) : html`<div class="empty">No epics yet. Approve requirements, then generate epics.</div>`}
      </div>
    </main>`;

  root.innerHTML = layout({ screen: "Epics", active: "epics", step: 2, counts, body });

  const rerender = () => renderEpics(root, { id });
  bindReview(root, rerender);

  on(root, "click", '[data-act="edit-epic"]', async (_e, el) => {
    const item = items.find((x) => x.id === Number(el.dataset.id));
    const saved = await editDialog("Edit epic", [
      { name: "title", label: "Title", value: item.title },
      { name: "description", label: "Description", value: item.description || "", type: "textarea" },
    ], (values) => api.patch(`/backlog/epics/${item.id}`, values));
    if (saved) rerender();
  });

  on(root, "click", '[data-act="regenerate"]', async (_e, btn) => {
    if (!await confirmDialog({ title: "Regenerate all epics?", message: "The current epics are replaced.", confirmLabel: "Regenerate", danger: true })) return;
    try {
      const res = await withBusy(btn, () => api.post("/backlog/generate/epics", { projectId: Number(id), replace: true }));
      toast(`${res.items.length} epics regenerated (${res.engine}).`, "ok");
      rerender();
    } catch (err) { reportError(err); }
  });

  on(root, "click", '[data-act="features-for"]', async (_e, btn) => {
    try {
      const res = await withBusy(btn, () => api.post("/backlog/generate/features", { projectId: Number(id), epicId: Number(btn.dataset.id) }));
      toast(`${res.items.length} features generated (${res.engine}).`, "ok");
      rerender();
    } catch (err) { reportError(err); }
  });

  on(root, "click", '[data-act="to-features"]', async (_e, btn) => {
    try {
      const res = await withBusy(btn, () => api.post("/backlog/generate/features", { projectId: Number(id) }));
      toast(`${res.items.length} features generated (${res.engine}).`, "ok");
      location.hash = `#/project/${id}/features`;
    } catch (err) { reportError(err); }
  });
}

/* ================================================================== *
 * 16 — Features
 * ================================================================== */

export async function renderFeatures(root, { id }) {
  const { counts } = await projectContext(id);
  const [{ items }, epics, sprintsRes] = await Promise.all([
    api.get(`/backlog/features?projectId=${id}`),
    api.get(`/backlog/epics?projectId=${id}`),
    state.trainId ? api.get(`/trains/${state.trainId}/sprints`) : Promise.resolve({ sprints: [] }),
  ]);
  const epicByRef = new Map(epics.items.map((e) => [e.id, e]));
  const sprintById = new Map(sprintsRes.sprints.map((s) => [s.id, s]));
  const inReview = items.filter((f) => f.status === "in_review").length;
  const totalPoints = items.reduce((a, f) => a + f.points, 0);

  const body = html`
    <main class="screen">
      <div class="row-flex end mb-20">
        <div>
          <h1 class="h1">Features</h1>
          <p class="sub">
            ${items.length} features · ${totalPoints} points · the unit scheduled into a sprint
          </p>
        </div>
        <div class="push row-flex gap-10">
          ${inReview ? html`<button class="btn" data-approve-all="features">Approve all in review</button>` : ""}
          ${state.trainId ? html`<a class="btn" href="#/train/${state.trainId}/roadmap">Open roadmap</a>` : ""}
          <button class="btn btn--primary" data-act="to-stories"
                  ${items.filter((f) => f.status === "approved").length ? "" : "disabled"}>
            ${raw(SPARK.replace('fill="#6366F1"', 'fill="#fff"'))}Generate stories
          </button>
        </div>
      </div>

      <div class="card card--flush">
        <div class="row-head" style="grid-template-columns:90px 2.2fr 1.2fr 90px 1fr 1fr 220px">
          <div>Ref</div><div>Feature</div><div>Epic</div><div>Points</div><div>MoSCoW</div><div>Sprint</div><div style="text-align:right">Review</div>
        </div>
        ${items.length ? items.map((f) => html`
          <div class="row" style="grid-template-columns:90px 2.2fr 1.2fr 90px 1fr 1fr 220px">
            <div class="num">${f.ref}</div>
            <div>
              <div style="font-weight:600">${f.title}</div>
              ${f.description ? html`<div class="meta mt-2 truncate">${f.description}</div>` : ""}
              <div class="row-flex gap-6 mt-2">${statusPill(f.status)}${f.aiGenerated ? aiPill() : ""}</div>
            </div>
            <div class="meta">${epicByRef.has(f.epicId) ? epicByRef.get(f.epicId).title : "—"}</div>
            <div>
              <input class="input input--sm" style="width:70px;text-align:center" type="number" min="0"
                     value="${f.points}" data-points="${f.id}">
            </div>
            <div>
              <select class="select input--sm" data-moscow="${f.id}">
                ${["Must", "Should", "Could", "Wont"].map((m) => html`
                  <option value="${m}" ${f.moscow === m ? "selected" : ""}>${m === "Wont" ? "Won't" : m}</option>`)}
              </select>
            </div>
            <div>
              <select class="select input--sm" data-sprint="${f.id}">
                <option value="">Unscheduled</option>
                ${sprintsRes.sprints.map((s) => html`
                  <option value="${s.id}" ${f.sprintId === s.id ? "selected" : ""}>${s.name}</option>`)}
              </select>
              ${f.aiScheduled ? html`<div class="meta-2 mt-2">${raw(SPARK)} auto-scheduled</div>` : ""}
            </div>
            <div style="text-align:right">${reviewActions("features", f)}</div>
          </div>`) : html`<div class="empty">No features yet. Approve epics, then generate features.</div>`}
      </div>
    </main>`;

  root.innerHTML = layout({ screen: "Features", active: "features", step: 3, counts, body });

  const rerender = () => renderFeatures(root, { id });
  bindReview(root, rerender);

  on(root, "change", "[data-points]", async (_e, el) => {
    try { await api.patch(`/backlog/features/${el.dataset.points}`, { points: Number(el.value) }); toast("Points updated.", "ok"); }
    catch (err) { reportError(err); }
  });
  on(root, "change", "[data-moscow]", async (_e, el) => {
    try { await api.patch(`/backlog/features/${el.dataset.moscow}`, { moscow: el.value }); }
    catch (err) { reportError(err); }
  });
  on(root, "change", "[data-sprint]", async (_e, el) => {
    try {
      await api.post(`/roadmap/features/${el.dataset.sprint}/schedule`, { sprintId: el.value ? Number(el.value) : null });
      toast(el.value ? `Scheduled into ${sprintById.get(Number(el.value)).name}.` : "Unscheduled.", "ok");
      rerender();
    } catch (err) { reportError(err); }
  });

  on(root, "click", '[data-act="to-stories"]', async (_e, btn) => {
    try {
      const res = await withBusy(btn, () => api.post("/backlog/generate/stories", { projectId: Number(id) }));
      toast(`${res.items.length} stories generated (${res.engine}).`, "ok");
      location.hash = `#/project/${id}/stories`;
    } catch (err) { reportError(err); }
  });
}

/* ================================================================== *
 * 07 — User stories (tree + detail)
 * ================================================================== */

let selectedStoryId = null;

export async function renderStories(root, { id }) {
  const { counts } = await projectContext(id);
  const [{ items }, epics, features] = await Promise.all([
    api.get(`/backlog/stories?projectId=${id}`),
    api.get(`/backlog/epics?projectId=${id}`),
    api.get(`/backlog/features?projectId=${id}`),
  ]);

  const epicById = new Map(epics.items.map((e) => [e.id, e]));
  const featureById = new Map(features.items.map((f) => [f.id, f]));
  const approved = items.filter((s) => s.status === "approved").length;

  if (!items.find((s) => s.id === selectedStoryId)) selectedStoryId = items.length ? items[0].id : null;
  const selected = items.find((s) => s.id === selectedStoryId) || null;

  // Group by epic for the backlog tree.
  const groups = new Map();
  for (const s of items) {
    const key = s.epicId || 0;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(s);
  }

  const body = html`
    <main class="screen screen--tight">
      <div class="row-flex end mb-16">
        <div class="row-flex gap-12 baseline">
          <h1 class="h1">User Stories</h1>
          <span class="sub" style="margin:0">${items.length} stories · ${approved} approved</span>
        </div>
        <div class="push row-flex gap-10">
          <button class="btn" data-approve-all="stories">Approve all in review</button>
          <button class="btn btn--primary" data-act="to-tasks" ${approved ? "" : "disabled"}>
            ${raw(SPARK.replace('fill="#6366F1"', 'fill="#fff"'))}Generate tasks
          </button>
        </div>
      </div>

      <div style="flex:1;min-height:0;display:grid;grid-template-columns:340px 1fr;grid-template-rows:minmax(0,1fr);gap:14px">
        <div class="card card--pad stack" style="min-height:0">
          <div class="eyebrow" style="margin-bottom:8px">Backlog</div>
          <div class="scroll-y stack gap-2">
            ${[...groups.entries()].map(([epicId, list]) => html`
              <div style="margin-bottom:8px">
                <div class="row-flex gap-8" style="padding:6px 8px">
                  <span style="font-size:13px;font-weight:600;color:var(--ink)">
                    ${epicById.has(epicId) ? epicById.get(epicId).title : "Unassigned"}
                  </span>
                  <span class="push meta-2">${list.length}</span>
                </div>
                ${list.map((s) => html`
                  <button class="list-item ${s.id === selectedStoryId ? "is-active" : ""} ${s.status === "rejected" ? "is-muted" : ""}"
                          data-story="${s.id}">
                    <span style="width:7px;height:7px;border-radius:99px;flex:none;background:${
                      s.status === "approved" ? "var(--ok)" : s.status === "rejected" ? "var(--muted-3)" : "var(--warn)"}"></span>
                    <span class="grow truncate">${s.want}</span>
                    <span class="meta-2 mono">${s.ref}</span>
                  </button>`)}
              </div>`)}
            ${items.length ? "" : html`<div class="empty">No stories yet.</div>`}
          </div>
        </div>

        <div class="card card--pad stack" style="min-height:0">
          ${selected ? raw(storyDetail(selected, featureById, epicById)) : html`<div class="empty">Select a story.</div>`}
        </div>
      </div>
    </main>`;

  root.innerHTML = layout({ screen: "User Stories", active: "stories", step: 4, counts, body });

  const rerender = () => renderStories(root, { id });
  bindReview(root, rerender);

  on(root, "click", "[data-story]", (_e, el) => {
    selectedStoryId = Number(el.dataset.story);
    rerender();
  });

  on(root, "click", '[data-act="edit-story"]', async () => {
    const saved = await editDialog("Edit story", [
      { name: "actor", label: "As a", value: selected.actor },
      { name: "want", label: "I want", value: selected.want, type: "textarea" },
      { name: "benefit", label: "So that", value: selected.benefit || "", type: "textarea" },
      { name: "points", label: "Story points", value: selected.points, type: "number" },
    ], (values) => api.patch(`/backlog/stories/${selected.id}`, { ...values, points: Number(values.points) }));
    if (saved) rerender();
  });

  on(root, "click", '[data-act="merge"]', async () => {
    const others = items.filter((s) => s.id !== selected.id);
    const target = await pickDialog("Merge into…", others.map((s) => ({ value: s.id, label: `${s.ref} — ${s.want}` })));
    if (!target) return;
    try {
      await api.post(`/backlog/stories/${target}/merge`, { sourceId: selected.id });
      toast(`${selected.ref} merged.`, "ok");
      selectedStoryId = Number(target);
      rerender();
    } catch (err) { reportError(err); }
  });

  on(root, "click", '[data-act="split"]', async () => {
    const parts = await splitDialog(selected);
    if (!parts) return;
    try {
      const res = await api.post(`/backlog/stories/${selected.id}/split`, { parts });
      toast(`Split into ${res.created.length} stories.`, "ok");
      selectedStoryId = res.created[0].id;
      rerender();
    } catch (err) { reportError(err); }
  });

  on(root, "click", '[data-act="delete-story"]', async () => {
    if (!await confirmDialog({ title: `Delete ${selected.ref}?`, confirmLabel: "Delete", danger: true })) return;
    try { await api.del(`/backlog/stories/${selected.id}`); selectedStoryId = null; rerender(); }
    catch (err) { reportError(err); }
  });

  on(root, "click", '[data-act="to-tasks"]', async (_e, btn) => {
    try {
      const res = await withBusy(btn, () => api.post("/backlog/generate/tasks", { projectId: Number(id) }));
      toast(`${res.items.length} tasks generated (${res.engine}).`, "ok");
      location.hash = `#/project/${id}/tasks`;
    } catch (err) { reportError(err); }
  });
}

function storyDetail(s, featureById, epicById) {
  const feature = featureById.get(s.featureId);
  const epic = epicById.get(s.epicId);
  return html`
    <div class="row-flex gap-10 wrap mb-16">
      <span class="num">${s.ref}</span>
      ${s.aiGenerated ? aiPill() : ""}
      ${statusPill(s.status)}
      <span class="pill pill--plain">MoSCoW · ${s.moscow === "Wont" ? "Won't" : s.moscow}</span>
      <span class="push">${confidenceBar(s.confidence)}</span>
    </div>

    <div style="border-left:3px solid var(--primary);padding-left:16px;margin-bottom:20px">
      <div class="eyebrow">As a</div>
      <div style="font-family:var(--font-display);font-size:26px;font-weight:500">${s.actor}</div>
      <div class="eyebrow" style="margin-top:10px">I want</div>
      <div style="font-family:var(--font-display);font-size:26px;font-weight:500">${s.want}</div>
      <div class="eyebrow" style="margin-top:10px">So that</div>
      <div style="font-family:var(--font-display);font-size:26px;font-weight:500">${s.benefit || "—"}</div>
    </div>

    <div class="eyebrow" style="margin-bottom:8px">Acceptance criteria</div>
    <div class="scroll-y stack gap-10" style="flex:1;min-height:60px">
      ${s.acceptanceCriteria && s.acceptanceCriteria.length ? s.acceptanceCriteria.map((c) => html`
        <div class="card" style="padding:12px 14px;background:var(--bg)">
          <div style="display:grid;grid-template-columns:56px 1fr;gap:6px 10px;font-size:12.5px">
            <span style="color:var(--primary-dark);font-weight:600">Given</span><span style="color:var(--ink-2)">${c.given}</span>
            <span style="color:var(--primary-dark);font-weight:600">When</span><span style="color:var(--ink-2)">${c.when}</span>
            <span style="color:var(--primary-dark);font-weight:600">Then</span><span style="color:var(--ink-2)">${c.then}</span>
          </div>
        </div>`) : html`<div class="meta">No acceptance criteria yet.</div>`}
    </div>

    <div class="row-flex gap-12 wrap mt-16" style="padding-top:14px;border-top:1px solid var(--border-soft);font-size:12.5px;color:var(--muted)">
      <span>Epic: <b style="color:var(--ink-2)">${epic ? epic.title : "—"}</b></span>
      <span>Feature: <b style="color:var(--ink-2)">${feature ? feature.title : "—"}</b></span>
      <span>Story points: <b style="color:var(--ink-2)">${s.points}</b></span>
    </div>

    <div class="row-flex gap-8 mt-16">
      <button class="btn btn--sm" data-act="edit-story">Edit</button>
      <button class="btn btn--sm" data-act="merge">Merge</button>
      <button class="btn btn--sm" data-act="split">Split</button>
      <button class="btn btn--sm btn--danger" data-act="delete-story">Delete</button>
      <span class="push">${reviewActions("stories", s)}</span>
    </div>`;
}

/* ================================================================== *
 * 08 — Tasks
 * ================================================================== */

export async function renderTasks(root, { id }) {
  const { counts } = await projectContext(id);
  const [{ items }, stories] = await Promise.all([
    api.get(`/backlog/tasks?projectId=${id}`),
    api.get(`/backlog/stories?projectId=${id}`),
  ]);

  const storyById = new Map(stories.items.map((s) => [s.id, s]));
  const byStory = new Map();
  for (const t of items) {
    if (!byStory.has(t.storyId)) byStory.set(t.storyId, []);
    byStory.get(t.storyId).push(t);
  }
  const done = items.filter((t) => t.done).length;
  const hours = items.reduce((a, t) => a + t.hours, 0);

  const body = html`
    <main class="screen">
      <div class="row-flex end mb-20">
        <div>
          <h1 class="h1">Tasks</h1>
          <p class="sub">${items.length} tasks · ${done} done · ${hours} h estimated</p>
        </div>
        <div class="push row-flex gap-10">
          <button class="btn" data-act="regenerate">${raw(SPARK)}Regenerate for approved stories</button>
          <a class="btn btn--primary" href="#/project/${id}/clusters">Continue to clusters →</a>
        </div>
      </div>

      <div class="stack gap-14">
        ${byStory.size ? [...byStory.entries()].map(([storyId, list]) => {
          const s = storyById.get(storyId);
          const storyDone = list.filter((t) => t.done).length;
          return html`
            <div class="card card--pad">
              <div class="row-flex gap-10 wrap mb-12">
                <span class="num">${s ? s.ref : "?"}</span>
                <h3 class="h3" style="font-size:17px">${s ? s.want : "Orphan tasks"}</h3>
                ${s ? statusPill(s.status) : ""}
                <span class="push meta">${storyDone} / ${list.length} done · ${list.reduce((a, t) => a + t.hours, 0)} h</span>
              </div>
              <div class="progress mb-12"><i class="${storyDone === list.length ? "is-done" : ""}" style="width:${Math.round((storyDone / list.length) * 100)}%"></i></div>
              <div class="stack gap-2">
                ${list.map((t) => html`
                  <label class="list-item" style="cursor:pointer">
                    <input type="checkbox" data-task="${t.id}" ${t.done ? "checked" : ""}
                           style="width:16px;height:16px;accent-color:var(--primary)">
                    <span class="grow" style="${t.done ? "text-decoration:line-through;color:var(--muted-2)" : ""}">${t.title}</span>
                    <span class="meta-2 mono">${t.ref}</span>
                    <span class="meta" style="width:44px;text-align:right">${t.hours} h</span>
                    <button class="btn btn--sm btn--icon" data-act="delete-task" data-id="${t.id}" title="Delete">✕</button>
                  </label>`)}
              </div>
              <button class="btn btn--sm mt-12" data-act="add-task" data-story="${storyId}">+ Add task</button>
            </div>`;
        }) : html`<div class="empty">No tasks yet. Approve some stories, then generate tasks.</div>`}
      </div>
    </main>`;

  root.innerHTML = layout({ screen: "Tasks", active: "tasks", step: 5, counts, body });

  const rerender = () => renderTasks(root, { id });

  on(root, "change", "[data-task]", async (_e, el) => {
    try { await api.patch(`/backlog/tasks/${el.dataset.task}`, { done: el.checked }); rerender(); }
    catch (err) { reportError(err); rerender(); }
  });

  on(root, "click", '[data-act="delete-task"]', async (e, el) => {
    e.preventDefault();
    try { await api.del(`/backlog/tasks/${el.dataset.id}`); rerender(); }
    catch (err) { reportError(err); }
  });

  on(root, "click", '[data-act="add-task"]', async (_e, el) => {
    const saved = await editDialog("New task", [
      { name: "title", label: "Task", value: "" },
      { name: "hours", label: "Hours", value: 2, type: "number" },
    ], (values) => api.post("/backlog/tasks", {
      projectId: Number(id), storyId: Number(el.dataset.story),
      title: values.title, hours: Number(values.hours),
    }));
    if (saved) rerender();
  });

  on(root, "click", '[data-act="regenerate"]', async (_e, btn) => {
    try {
      const res = await withBusy(btn, () => api.post("/backlog/generate/tasks", { projectId: Number(id) }));
      toast(`${res.items.length} tasks generated (${res.engine}).`, "ok");
      rerender();
    } catch (err) { reportError(err); }
  });
}

/* ================================================================== *
 * Shared dialogs
 * ================================================================== */

export async function editDialog(title, fields, save) {
  const result = await modal(
    () => html`
      <div class="modal-head"><h2 class="h2">${title}</h2></div>
      <form class="modal-body stack gap-16" id="edit-form">
        ${fields.map((f) => html`
          <label class="field">
            <span class="field-label">${f.label}</span>
            ${f.type === "textarea"
              ? html`<textarea class="textarea" name="${f.name}">${f.value}</textarea>`
              : html`<input class="input" type="${f.type || "text"}" name="${f.name}" value="${f.value}">`}
          </label>`)}
      </form>
      <div class="modal-foot">
        <button class="btn" data-act="cancel">Cancel</button>
        <button class="btn btn--primary push" data-act="save">Save</button>
      </div>`,
    {
      onMount(overlay, close) {
        on(overlay, "click", '[data-act="cancel"]', () => close(null));
        on(overlay, "click", '[data-act="save"]', async (_e, btn) => {
          const f = overlay.querySelector("#edit-form");
          const values = {};
          for (const field of fields) values[field.name] = f.elements[field.name].value;
          try { await withBusy(btn, () => save(values)); close(true); }
          catch (err) { reportError(err); }
        });
      },
    },
  );
  if (result) toast("Saved.", "ok");
  return result;
}

async function pickDialog(title, options) {
  return modal(
    () => html`
      <div class="modal-head"><h2 class="h2">${title}</h2></div>
      <div class="modal-body">
        <select class="select" id="pick" size="10" style="height:auto">
          ${options.map((o) => html`<option value="${o.value}">${o.label}</option>`)}
        </select>
      </div>
      <div class="modal-foot">
        <button class="btn" data-act="cancel">Cancel</button>
        <button class="btn btn--primary push" data-act="ok">Confirm</button>
      </div>`,
    {
      onMount(overlay, close) {
        on(overlay, "click", '[data-act="cancel"]', () => close(null));
        on(overlay, "click", '[data-act="ok"]', () => close(overlay.querySelector("#pick").value));
      },
    },
  );
}

async function splitDialog(story) {
  return modal(
    () => html`
      <div class="modal-head">
        <h2 class="h2">Split ${story.ref}</h2>
        <p class="sub">The original is rejected and replaced by the parts below.</p>
      </div>
      <form class="modal-body stack gap-12" id="split-form">
        ${[0, 1].map((i) => html`
          <div style="display:grid;grid-template-columns:1fr 90px;gap:10px">
            <label class="field"><span class="field-label">Part ${i + 1} — I want</span>
              <input class="input" name="want${i}" value="${i === 0 ? story.want : ""}"></label>
            <label class="field"><span class="field-label">Points</span>
              <input class="input" type="number" name="points${i}" value="${Math.max(1, Math.round(story.points / 2))}"></label>
          </div>`)}
      </form>
      <div class="modal-foot">
        <button class="btn" data-act="cancel">Cancel</button>
        <button class="btn btn--primary push" data-act="ok">Split</button>
      </div>`,
    {
      onMount(overlay, close) {
        on(overlay, "click", '[data-act="cancel"]', () => close(null));
        on(overlay, "click", '[data-act="ok"]', () => {
          const f = overlay.querySelector("#split-form");
          const parts = [0, 1]
            .map((i) => ({ want: f.elements[`want${i}`].value.trim(), points: Number(f.elements[`points${i}`].value) }))
            .filter((p) => p.want);
          if (parts.length < 2) { toast("Fill in both parts.", "error"); return; }
          close(parts);
        });
      },
    },
  );
}
