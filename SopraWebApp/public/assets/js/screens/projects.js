/** Screens 03 (Projects) and 15 (New project — the two-step train wizard). */

import {
  html, raw, api, state, on, navigate, toast, reportError, withBusy,
  statusPill, fmtDate, confirmDialog, modal,
} from "../core.js";
import { layout, STEP_NAMES } from "../shell.js";

const FILTERS = [
  { key: "all", label: "All", dot: null },
  { key: "draft", label: "Draft", dot: "var(--grey)" },
  { key: "in_review", label: "In review", dot: "var(--warn)" },
  { key: "ready", label: "Ready", dot: "var(--ok)" },
];

let activeFilter = "all";
let search = "";

export async function renderProjects(root) {
  const { projects } = await api.get("/projects");
  state.projects = projects;

  const visible = projects.filter((p) => {
    if (activeFilter !== "all" && p.status !== activeFilter) return false;
    if (search && !`${p.name} ${p.description || ""}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });
  const ready = projects.filter((p) => p.status === "ready").length;

  const body = html`
    <main class="screen">
      <div class="row-flex end mb-20">
        <div>
          <h1 class="h1">Projects</h1>
          <p class="sub">${projects.length} projects · ${ready} ready for PI Planning</p>
        </div>
        <button class="btn btn--primary push" data-act="new">+ New project</button>
      </div>

      <div class="row-flex gap-10 mb-16 wrap">
        <label class="topbar-search" style="width:300px;margin:0">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" stroke-width="2">
            <circle cx="11" cy="11" r="7"></circle><path d="M20 20l-3.5-3.5"></path>
          </svg>
          <input type="search" placeholder="Search a project…" data-filter-search value="${search}">
        </label>
        ${FILTERS.map((f) => html`
          <button class="chip ${activeFilter === f.key ? "is-active" : ""}" data-filter="${f.key}">
            ${f.dot ? raw(`<span style="width:7px;height:7px;border-radius:99px;background:${f.dot}"></span>`) : ""}
            ${f.label}
            ${f.key === "all" ? html`<span style="color:var(--muted);font-weight:500">${projects.length}</span>` : ""}
          </button>`)}
      </div>

      <div class="card card--flush">
        <div class="row-head" style="grid-template-columns:2.4fr 1fr 1.2fr 1fr 1.4fr">
          <div>Project</div><div>Status</div><div>Pipeline</div><div>Content</div><div>Created</div>
        </div>
        ${visible.length ? visible.map((p) => html`
          <div class="row" style="grid-template-columns:2.4fr 1fr 1.2fr 1fr 1.4fr">
            <div>
              <div style="font-size:14px;font-weight:600">${p.name}</div>
              <div class="meta mt-2">${p.description || "No description"}</div>
              ${p.train ? html`<div class="meta-2 mt-2">${p.train.name}</div>` : html`<div class="meta-2 mt-2">Not in a train</div>`}
            </div>
            <div>${raw(statusLabel(p.status))}</div>
            <div>
              <div class="progress"><i class="${p.pipelineStep >= p.stepTotal - 1 ? "is-done" : ""}" style="width:${p.progress}%"></i></div>
              <div class="meta-2 mt-6">${p.pipelineStep + 1} / ${p.stepTotal} · ${p.stepName}</div>
            </div>
            <div style="font-size:12.5px;color:var(--ink-2)">
              ${p.counts.epics} epics · ${p.counts.stories} stories
            </div>
            <div class="row-flex gap-8">
              <span style="font-size:12.5px;color:var(--muted)">${fmtDate(p.createdAt)}</span>
              <span class="row-actions">
                <a class="btn btn--sm btn--primary" href="#/project/${p.id}/import">Open</a>
                <button class="btn btn--sm btn--icon" title="Duplicate" data-act="duplicate" data-id="${p.id}">⧉</button>
                <button class="btn btn--sm btn--icon" title="Delete" data-act="delete" data-id="${p.id}" data-name="${p.name}">✕</button>
              </span>
            </div>
          </div>`) : html`<div class="empty">No project matches this filter.</div>`}
      </div>
    </main>`;

  root.innerHTML = layout({ screen: "Projects", active: "projects", level: "train", body });

  on(root, "click", "[data-filter]", (_e, el) => { activeFilter = el.dataset.filter; renderProjects(root); });

  const searchInput = root.querySelector("[data-filter-search]");
  if (searchInput) {
    searchInput.addEventListener("input", debounce((e) => {
      search = e.target.value;
      renderProjects(root).then(() => {
        const next = root.querySelector("[data-filter-search]");
        if (next) { next.focus(); next.setSelectionRange(next.value.length, next.value.length); }
      });
    }, 220));
  }

  on(root, "click", '[data-act="new"]', () => newProjectWizard(root));

  on(root, "click", '[data-act="duplicate"]', async (_e, el) => {
    try {
      await api.post(`/projects/${el.dataset.id}/duplicate`);
      toast("Project duplicated.", "ok");
      renderProjects(root);
    } catch (err) { reportError(err); }
  });

  on(root, "click", '[data-act="delete"]', async (_e, el) => {
    const ok = await confirmDialog({
      title: `Delete ${el.dataset.name}?`,
      message: "Its requirements, epics, features, stories and tasks are deleted with it.",
      confirmLabel: "Delete project", danger: true,
    });
    if (!ok) return;
    try {
      await api.del(`/projects/${el.dataset.id}`);
      toast("Project deleted.", "ok");
      renderProjects(root);
    } catch (err) { reportError(err); }
  });
}

function statusLabel(status) {
  const map = {
    ready: '<span class="pill pill--ok"><span class="pill-dot"></span>Ready</span>',
    in_review: '<span class="pill pill--warn"><span class="pill-dot"></span>In review</span>',
    draft: '<span class="pill pill--grey"><span class="pill-dot"></span>Draft</span>',
  };
  return map[status] || map.draft;
}

function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

/* ================================================================== *
 * 15 — New project wizard
 * ================================================================== */

export async function newProjectWizard(root) {
  const { trains } = await api.get("/trains");
  let step = 1;
  const draft = { mode: trains.length ? "existing" : "new", trainId: trains.length ? trains[0].id : null,
                  newTrainName: "", newTrainDescription: "", name: "", description: "", safeTeam: "" };

  const created = await modal(renderStep, {
    onMount(overlay, close) {
      const rerender = () => {
        overlay.querySelector(".modal").innerHTML = renderStep();
        bind();
      };

      function readStep2() {
        const f = overlay.querySelector("#wizard-form");
        if (!f) return;
        draft.name = f.elements.name.value;
        draft.description = f.elements.description.value;
        draft.safeTeam = f.elements.safeTeam.value;
      }

      function bind() {
        on(overlay, "click", '[data-act="cancel"]', () => close(null));

        on(overlay, "click", "[data-mode]", (_e, el) => {
          draft.mode = el.dataset.mode;
          rerender();
        });

        const select = overlay.querySelector("[data-train-select]");
        if (select) select.addEventListener("change", (e) => { draft.trainId = Number(e.target.value); });

        const newName = overlay.querySelector("[data-new-train-name]");
        if (newName) newName.addEventListener("input", (e) => { draft.newTrainName = e.target.value; });
        const newDesc = overlay.querySelector("[data-new-train-desc]");
        if (newDesc) newDesc.addEventListener("input", (e) => { draft.newTrainDescription = e.target.value; });

        on(overlay, "click", '[data-act="next"]', () => {
          if (draft.mode === "new" && !draft.newTrainName.trim()) {
            toast("Name the new train, or pick an existing one.", "error");
            return;
          }
          step = 2;
          rerender();
        });

        on(overlay, "click", '[data-act="back"]', () => { readStep2(); step = 1; rerender(); });

        on(overlay, "click", '[data-act="create"]', async (_e, btn) => {
          readStep2();
          if (!draft.name.trim()) { toast("Give the project a name.", "error"); return; }
          const payload = {
            name: draft.name.trim(),
            description: draft.description.trim() || null,
            safeTeam: draft.safeTeam.trim() || null,
          };
          if (draft.mode === "existing") payload.trainId = draft.trainId;
          else {
            payload.newTrainName = draft.newTrainName.trim();
            payload.newTrainDescription = draft.newTrainDescription.trim() || null;
          }
          try {
            const res = await withBusy(btn, () => api.post("/projects", payload));
            close(res.project);
          } catch (err) { reportError(err); }
        });
      }
      bind();
    },
  });

  if (created) {
    toast(`${created.name} created.`, "ok");
    state.projectId = created.id;
    if (created.train) state.trainId = created.train.id;
    navigate(`/project/${created.id}/import`);
  }

  function renderStep() {
    return step === 1 ? renderStep1() : renderStep2();
  }

  function renderStep1() {
    const selected = trains.find((t) => t.id === draft.trainId);
    return html`
      <div class="modal-head">
        ${raw(wizardHeader(1))}
        <h2 class="h2">Does this project belong to a train?</h2>
        <p class="sub">Projects in the same train can share requirements, dependencies and one roadmap.</p>
      </div>
      <div class="modal-body" style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
        <div class="radio-card ${draft.mode === "existing" ? "is-selected" : ""}" data-mode="existing"
             ${trains.length ? "" : 'style="opacity:.5;pointer-events:none"'}>
          <div class="row-flex gap-10" style="margin-bottom:10px">
            <span class="radio-mark"></span><span style="font-size:14px;font-weight:600">Add to an existing train</span>
          </div>
          ${trains.length ? html`
            <select class="select input--sm" data-train-select ${draft.mode === "existing" ? "" : "disabled"}>
              ${trains.map((t) => html`<option value="${t.id}" ${t.id === draft.trainId ? "selected" : ""}>${t.name}</option>`)}
            </select>
            <div class="meta mt-12" style="line-height:1.6">
              ${selected ? html`${selected.projectCount} project${selected.projectCount === 1 ? "" : "s"} · ${selected.sharedRequirements} shared requirements will be available.` : ""}
            </div>` : html`<div class="meta">No train exists yet.</div>`}
        </div>

        <div class="radio-card ${draft.mode === "new" ? "is-selected" : ""}" data-mode="new">
          <div class="row-flex gap-10" style="margin-bottom:10px">
            <span class="radio-mark"></span><span style="font-size:14px;font-weight:600">Create a new train</span>
          </div>
          <div class="stack gap-8">
            <input class="input input--sm" placeholder="Train name" data-new-train-name
                   value="${draft.newTrainName}" ${draft.mode === "new" ? "" : "disabled"}>
            <input class="input input--sm" placeholder="Description" data-new-train-desc
                   value="${draft.newTrainDescription}" ${draft.mode === "new" ? "" : "disabled"}>
          </div>
          <div class="meta mt-12">Starts empty — no shared requirements yet.</div>
        </div>
      </div>
      <div class="modal-foot">
        <button class="btn" data-act="cancel">Cancel</button>
        <button class="btn btn--primary push" data-act="next">Continue →</button>
      </div>`;
  }

  function renderStep2() {
    const trainName = draft.mode === "new"
      ? draft.newTrainName
      : (trains.find((t) => t.id === draft.trainId) || {}).name || "";
    return html`
      <div class="modal-head">
        ${raw(wizardHeader(2))}
        <h2 class="h2">Name the project</h2>
        <p class="sub row-flex gap-8">Joining
          <span class="pill pill--plain"><span class="sidebar-rail" style="height:12px"></span>${trainName}</span>
        </p>
      </div>
      <form class="modal-body stack gap-16" id="wizard-form">
        <label class="field"><span class="field-label">Project name</span>
          <input class="input" name="name" value="${draft.name}" required autofocus></label>
        <label class="field"><span class="field-label">Description</span>
          <textarea class="textarea" name="description" style="height:74px">${draft.description}</textarea></label>
        <label class="field"><span class="field-label">SAFe team</span>
          <input class="input" name="safeTeam" value="${draft.safeTeam}" placeholder="ART Digital Retail"></label>
        <div class="row-flex gap-12" style="align-items:flex-start;background:var(--bg);border:1px solid var(--border);border-radius:12px;padding:13px 14px">
          <span class="pill pill--ai" style="margin-top:1px">${raw('<svg width="11" height="11" viewBox="0 0 24 24" fill="#6366F1"><path d="M12 2l1.9 5.6L19.5 9l-5.6 1.9L12 16.5l-1.9-5.6L4.5 9l5.6-1.4z"></path></svg>')}AI</span>
          <div style="font-size:12.5px;color:var(--ink-2);line-height:1.55">
            Requirements can be imported at project level next, or inherited from the train.
          </div>
        </div>
      </form>
      <div class="modal-foot">
        <button class="btn" data-act="back">Back</button>
        <button class="btn btn--primary push" data-act="create">Create project</button>
      </div>`;
  }

  function wizardHeader(current) {
    const item = (n, label) => {
      const cls = current === n ? "is-active" : current > n ? "is-done" : "";
      return `<span class="wizard-step ${cls}"><span class="wizard-bullet">${current > n ? "✓" : n}</span>${label}</span>`;
    };
    return `<div class="wizard-steps">${item(1, "Train")}<span class="wizard-rule ${current > 1 ? "is-done" : ""}"></span>${item(2, "Project")}</div>`;
  }
}
