/**
 * Train-level screens: Overview (02), Trains (14), Shared requirements,
 * Cross-project dependencies (10).
 */

import {
  html, raw, api, state, on, navigate, toast, reportError, withBusy,
  statusPill, aiPill, pct, confirmDialog, modal, fmtDate,
} from "../core.js";
import { layout } from "../shell.js";

/* ================================================================== *
 * 02 — Train Overview
 * ================================================================== */

export async function renderOverview(root, { id }) {
  state.trainId = Number(id);
  const data = await api.get(`/trains/${id}/overview`);
  const { train, stats, projects, sharedRequirements, matrix } = data;

  const body = html`
    <main class="screen screen--tight">
      <div class="row-flex end gap-16 mb-18">
        <div class="row-flex gap-14" style="align-items:stretch">
          <span class="sidebar-rail" style="align-self:stretch"></span>
          <div>
            <div class="eyebrow">Agile Release Train</div>
            <h1 class="h1" style="margin-top:4px">${train.name}</h1>
            <p class="sub">
              ${train.projectCount} projects advancing together · ${train.piName} ·
              Sprint ${train.sprintCurrent} of ${train.sprintCount} · RTE ${train.rte || "unassigned"}
            </p>
          </div>
        </div>
        <div class="push row-flex gap-10">
          <a class="btn" href="#/train/${train.id}/requirements">Shared requirements</a>
          <a class="btn btn--primary" href="#/train/${train.id}/roadmap">
            <span class="sidebar-gantt" style="filter:brightness(3)"></span>Open Roadmap
          </a>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:repeat(6,1fr);gap:12px" class="mb-16">
        ${statTile("Projects", stats.projects)}
        ${statTile("Features", stats.features)}
        ${statTile("Shared requirements", stats.sharedRequirements)}
        ${raw(`<div class="stat"><div class="meta">Cross-project deps</div>
          <div class="stat-value row-flex gap-8">${stats.crossProjectDeps}
          ${stats.blockingDeps ? `<span class="pill pill--danger" style="font-family:var(--font);font-size:11px">${stats.blockingDeps} blocking</span>` : ""}
          </div></div>`)}
        ${raw(`<div class="stat"><div class="meta">Backlog approved</div>
          <div class="stat-value" style="color:var(--primary)">${pct(stats.approvalPct)}</div></div>`)}
        ${raw(`<div class="stat"><div class="meta">Capacity load · ${train.piName}</div>
          <div class="stat-value" style="color:${stats.capacityPct > 90 ? "var(--danger-ink)" : "var(--warn-ink)"}">${pct(stats.capacityPct)}</div></div>`)}
      </div>

      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:14px" class="mb-16">
        ${projects.map((p) => html`
          <a class="card card--pad" href="#/project/${p.id}/import" style="text-decoration:none;color:inherit">
            <div class="card-head">
              <span class="card-rule"></span>
              <h3 class="h3">${p.name}</h3>
              <span class="push meta">${p.featureCount} features</span>
            </div>
            <div class="progress"><i class="${p.exported ? "is-done" : ""}" style="width:${p.progress}%"></i></div>
            <div class="meta mt-6">Step ${p.step + 1} / 11 · ${p.stepName}</div>
            <div class="row-flex wrap gap-8 mt-12">
              ${p.approved ? html`<span class="pill pill--ok"><span class="pill-dot"></span>${p.approved} approved</span>` : ""}
              ${p.inReview ? html`<span class="pill pill--warn"><span class="pill-dot"></span>${p.inReview} in review</span>` : ""}
              ${p.rejected ? html`<span class="pill pill--grey"><span class="pill-dot"></span>${p.rejected} rejected</span>` : ""}
            </div>
          </a>`)}
      </div>

      <div style="flex:1;min-height:0;display:grid;grid-template-columns:1.25fr 1fr;grid-template-rows:minmax(0,1fr);gap:14px">
        <div class="card card--flush stack">
          <div class="row-flex gap-10" style="padding:16px 18px 12px">
            <h3 class="h3">Shared requirements</h3>
            <span class="push">${aiPill()}</span>
          </div>
          <div class="row-head" style="grid-template-columns:2.6fr .9fr 1fr;padding:9px 18px;border-top:1px solid var(--border-soft)">
            <div>Train-level requirement</div><div>Projects</div><div style="text-align:right">Status</div>
          </div>
          <div class="scroll-y">
            ${sharedRequirements.slice(0, 8).map((r) => html`
              <div class="row" style="grid-template-columns:2.6fr .9fr 1fr;padding:13px 18px;border-bottom:1px solid var(--border-faint)">
                <div>
                  <span class="num">${r.ref}</span>
                  <div style="color:var(--ink-2);margin-top:2px">${r.title}</div>
                </div>
                <div style="font-weight:600">${r.projectCount}</div>
                <div style="text-align:right">${statusPill(r.status)}</div>
              </div>`)}
          </div>
        </div>

        <div class="card card--pad stack">
          <h3 class="h3">Cross-project dependencies</h3>
          <div class="meta" style="margin-bottom:14px">Rows block columns · red cells threaten the train</div>
          ${raw(dependencyMatrix(matrix))}
          <div class="row-flex gap-10 mt-16" style="margin-top:auto;padding-top:14px;border-top:1px solid var(--border-soft)">
            ${stats.blockingDeps ? html`
              <span style="width:20px;height:20px;flex:none;border-radius:99px;background:var(--danger);color:#fff;font-size:13px;font-weight:700;display:flex;align-items:center;justify-content:center">!</span>
              <div style="font-size:12.5px;color:var(--ink-2);line-height:1.5">
                ${stats.blockingDeps} blocking dependenc${stats.blockingDeps > 1 ? "ies" : "y"} across the train.
              </div>` : html`<div class="meta">No blocking dependencies.</div>`}
            <a class="push" href="#/train/${train.id}/dependencies" style="font-size:12.5px;font-weight:600;text-decoration:none">Inspect</a>
          </div>
        </div>
      </div>
    </main>`;

  root.innerHTML = layout({ screen: "Overview", active: "overview", level: "train", body });
}

function statTile(label, value) {
  return raw(`<div class="stat"><div class="meta">${label}</div><div class="stat-value">${value}</div></div>`);
}

function dependencyMatrix(matrix) {
  if (!matrix.projects.length) return '<div class="meta">No projects in this train yet.</div>';
  const cols = matrix.projects.length;
  const cell = (c) => {
    if (c.count === null) return '<div style="height:44px;border-radius:10px;background:var(--border-faint);border:1px dashed var(--border)"></div>';
    if (c.count === 0) return '<div style="height:44px;border-radius:10px;background:#fff;border:1px solid var(--border);display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:600;color:var(--muted-3)">—</div>';
    const danger = c.blocking;
    return `<div style="height:44px;border-radius:10px;background:${danger ? "var(--danger-tint)" : "#fff"};border:1px solid ${danger ? "rgba(239,68,68,.35)" : "var(--border)"};display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:${danger ? 700 : 600};color:${danger ? "var(--danger-ink)" : "var(--muted)"}">${c.count}</div>`;
  };

  // "Web Storefront" -> Storefront, "Mobile App" -> Mobile, "Payments Service"
  // -> Payments. Drop a leading qualifier or a trailing generic noun, whichever
  // leaves the word that actually identifies the project.
  const short = (n) => {
    const words = String(n).split(/\s+/).filter(Boolean);
    if (words.length === 1) return words[0];
    const GENERIC = /^(app|service|portal|platform|system|site)$/i;
    if (GENERIC.test(words[words.length - 1])) return words.slice(0, -1).join(" ");
    return words.slice(1).join(" ");
  };

  let out = `<div style="display:grid;grid-template-columns:96px repeat(${cols},1fr);gap:6px;font-size:11px;color:var(--muted-2);align-items:center">`;
  out += "<div></div>";
  for (const p of matrix.projects) out += `<div style="text-align:center">${short(p.name)}</div>`;
  for (const from of matrix.projects) {
    out += `<div style="text-align:right;color:var(--ink-2);font-weight:600;font-size:11.5px">${short(from.name)}</div>`;
    for (const to of matrix.projects) {
      out += cell(matrix.cells.find((c) => c.from === from.id && c.to === to.id) || { count: 0 });
    }
  }
  return out + "</div>";
}

/* ================================================================== *
 * 14 — Trains
 * ================================================================== */

export async function renderTrains(root) {
  const { trains } = await api.get("/trains");
  state.trains = trains;

  const body = html`
    <main class="screen">
      <div class="row-flex end mb-20">
        <div>
          <h1 class="h1">Trains</h1>
          <p class="sub">A train groups the projects that ship together in one Program Increment.</p>
        </div>
        <button class="btn btn--primary push" data-act="new-train">+ New train</button>
      </div>

      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:14px">
        ${trains.map((t) => html`
          <div class="card card--pad">
            <div class="card-head">
              <span class="card-rule"></span>
              <h3 class="h3">${t.name}</h3>
              <span class="push meta">${t.piName}</span>
            </div>
            <p class="meta" style="min-height:32px">${t.description || "No description."}</p>
            <div class="row-flex gap-8 wrap mt-12">
              <span class="pill pill--plain">${t.projectCount} project${t.projectCount === 1 ? "" : "s"}</span>
              <span class="pill pill--plain">${t.sprintCount} sprints</span>
              <span class="pill pill--plain">${t.sharedRequirements} shared req.</span>
            </div>
            <div class="meta mt-12">RTE ${t.rte || "unassigned"} · Sprint ${t.sprintCurrent} of ${t.sprintCount}</div>
            <div class="row-flex gap-8 mt-16">
              <a class="btn btn--sm btn--primary" href="#/train/${t.id}">Open</a>
              <a class="btn btn--sm" href="#/train/${t.id}/roadmap">Roadmap</a>
              <button class="btn btn--sm push" data-act="edit-train" data-id="${t.id}">Edit</button>
              <button class="btn btn--sm btn--danger" data-act="delete-train" data-id="${t.id}" data-name="${t.name}">Delete</button>
            </div>
          </div>`)}
      </div>
      ${trains.length ? "" : html`<div class="empty">No trains yet. Create one to group your projects.</div>`}
    </main>`;

  root.innerHTML = layout({ screen: "Trains", active: "", level: "train", body });

  on(root, "click", '[data-act="new-train"]', () => trainDialog(null));
  on(root, "click", '[data-act="edit-train"]', (_e, el) => {
    trainDialog(trains.find((t) => t.id === Number(el.dataset.id)));
  });
  on(root, "click", '[data-act="delete-train"]', async (_e, el) => {
    const ok = await confirmDialog({
      title: `Delete ${el.dataset.name}?`,
      message: "The train must have no projects assigned. This cannot be undone.",
      confirmLabel: "Delete", danger: true,
    });
    if (!ok) return;
    try {
      await api.del(`/trains/${el.dataset.id}`);
      toast("Train deleted.", "ok");
      navigate("/trains");
      location.reload();
    } catch (err) { reportError(err); }
  });
}

async function trainDialog(train) {
  const isEdit = Boolean(train);
  const result = await modal(
    () => html`
      <div class="modal-head">
        <h2 class="h2">${isEdit ? "Edit train" : "New train"}</h2>
        <p class="sub">Projects in the same train share requirements, dependencies and one roadmap.</p>
      </div>
      <form class="modal-body stack gap-16" id="train-form">
        <label class="field"><span class="field-label">Train name</span>
          <input class="input" name="name" required value="${train ? train.name : ""}"></label>
        <label class="field"><span class="field-label">Description</span>
          <textarea class="textarea" name="description">${train ? train.description || "" : ""}</textarea></label>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <label class="field"><span class="field-label">RTE</span>
            <input class="input" name="rte" value="${train ? train.rte || "" : ""}"></label>
          <label class="field"><span class="field-label">Program Increment</span>
            <input class="input" name="piName" value="${train ? train.piName : "PI 2026.1"}"></label>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <label class="field"><span class="field-label">Current sprint</span>
            <input class="input" name="sprintCurrent" type="number" min="1" value="${train ? train.sprintCurrent : 1}"></label>
          <label class="field"><span class="field-label">Sprints in the PI</span>
            <input class="input" name="sprintCount" type="number" min="1" max="12" value="${train ? train.sprintCount : 5}"></label>
        </div>
      </form>
      <div class="modal-foot">
        <button class="btn" data-act="cancel">Cancel</button>
        <button class="btn btn--primary push" data-act="save">${isEdit ? "Save" : "Create train"}</button>
      </div>`,
    {
      onMount(overlay, close) {
        on(overlay, "click", '[data-act="cancel"]', () => close(null));
        on(overlay, "click", '[data-act="save"]', async (_e, btn) => {
          const f = overlay.querySelector("#train-form");
          const payload = {
            name: f.elements.name.value.trim(),
            description: f.elements.description.value.trim() || null,
            rte: f.elements.rte.value.trim() || null,
            piName: f.elements.piName.value.trim(),
            sprintCurrent: Number(f.elements.sprintCurrent.value),
            sprintCount: Number(f.elements.sprintCount.value),
          };
          if (!payload.name) { toast("Give the train a name.", "error"); return; }
          try {
            await withBusy(btn, () =>
              isEdit ? api.patch(`/trains/${train.id}`, payload) : api.post("/trains", payload));
            close(true);
          } catch (err) { reportError(err); }
        });
      },
    },
  );
  if (result) {
    toast(isEdit ? "Train updated." : "Train created.", "ok");
    location.reload();
  }
}

/* ================================================================== *
 * Shared requirements (train scope)
 * ================================================================== */

export async function renderSharedRequirements(root, { id }) {
  state.trainId = Number(id);
  const [{ items }, { trains }] = await Promise.all([
    api.get(`/backlog/requirements?trainId=${id}&scope=train`),
    api.get("/trains"),
  ]);
  state.trains = trains;
  const train = trains.find((t) => t.id === Number(id));

  const body = html`
    <main class="screen">
      <div class="row-flex end mb-20">
        <div>
          <h1 class="h1">Shared requirements</h1>
          <p class="sub">${items.length} train-level requirements available to every project in ${train ? train.name : "this train"}.</p>
        </div>
        <button class="btn btn--primary push" data-act="add">+ Add requirement</button>
      </div>

      <div class="card card--flush">
        <div class="row-head" style="grid-template-columns:110px 3fr 1fr 140px">
          <div>Reference</div><div>Requirement</div><div>Status</div><div style="text-align:right">Actions</div>
        </div>
        ${items.length ? items.map((r) => html`
          <div class="row" style="grid-template-columns:110px 3fr 1fr 140px" data-id="${r.id}">
            <div class="num">${r.ref}</div>
            <div>
              <div style="color:var(--ink-2)">${r.title}</div>
              ${r.body ? html`<div class="meta-2 mt-2">${r.body}</div>` : ""}
            </div>
            <div>${statusPill(r.status)}</div>
            <div class="row-flex gap-6" style="justify-content:flex-end">
              <button class="btn btn--sm" data-act="approve" data-id="${r.id}" ${r.status === "approved" ? "disabled" : ""}>Approve</button>
              <button class="btn btn--sm btn--danger" data-act="delete" data-id="${r.id}" data-ref="${r.ref}">✕</button>
            </div>
          </div>`) : html`<div class="empty">No shared requirements yet.</div>`}
      </div>
    </main>`;

  root.innerHTML = layout({ screen: "Shared Requirements", active: "shared", level: "train", body });

  on(root, "click", '[data-act="approve"]', async (_e, el) => {
    try {
      await api.patch(`/backlog/requirements/${el.dataset.id}`, { status: "approved" });
      renderSharedRequirements(root, { id });
    } catch (err) { reportError(err); }
  });

  on(root, "click", '[data-act="delete"]', async (_e, el) => {
    if (!await confirmDialog({ title: `Delete ${el.dataset.ref}?`, confirmLabel: "Delete", danger: true })) return;
    try {
      await api.del(`/backlog/requirements/${el.dataset.id}`);
      renderSharedRequirements(root, { id });
    } catch (err) { reportError(err); }
  });

  on(root, "click", '[data-act="add"]', async () => {
    const created = await modal(
      () => html`
        <div class="modal-head"><h2 class="h2">New shared requirement</h2>
          <p class="sub">Available to every project in this train.</p></div>
        <form class="modal-body stack gap-16" id="req-form">
          <label class="field"><span class="field-label">Title</span><input class="input" name="title" required></label>
          <label class="field"><span class="field-label">Statement</span><textarea class="textarea" name="body"></textarea></label>
        </form>
        <div class="modal-foot">
          <button class="btn" data-act="cancel">Cancel</button>
          <button class="btn btn--primary push" data-act="save">Add</button>
        </div>`,
      {
        onMount(overlay, close) {
          on(overlay, "click", '[data-act="cancel"]', () => close(null));
          on(overlay, "click", '[data-act="save"]', async (_e, btn) => {
            const f = overlay.querySelector("#req-form");
            if (!f.elements.title.value.trim()) { toast("Give it a title.", "error"); return; }
            try {
              await withBusy(btn, () => api.post("/backlog/requirements", {
                trainId: Number(id), scope: "train",
                title: f.elements.title.value.trim(),
                body: f.elements.body.value.trim() || null,
              }));
              close(true);
            } catch (err) { reportError(err); }
          });
        },
      },
    );
    if (created) { toast("Requirement added.", "ok"); renderSharedRequirements(root, { id }); }
  });
}

/* ================================================================== *
 * 10 — Cross-project dependencies (train scope)
 * ================================================================== */

export async function renderTrainDependencies(root, { id }) {
  state.trainId = Number(id);
  const [{ dependencies, counts }, board] = await Promise.all([
    api.get(`/analysis/dependencies?trainId=${id}`),
    api.get(`/roadmap/${id}/board`),
  ]);

  const bySprint = new Map(board.sprints.map((s) => [s.id, s.name]));

  const body = html`
    <main class="screen">
      <div class="row-flex end mb-20">
        <div>
          <h1 class="h1">Cross-project dependencies</h1>
          <p class="sub">${counts.total} dependencies · ${counts.blocking} blocking · ${counts.crossProject} span two projects.</p>
        </div>
        <button class="btn btn--primary push" data-act="detect">${raw('<svg width="14" height="14" viewBox="0 0 24 24" fill="#fff"><path d="M12 2l1.9 5.6L19.5 9l-5.6 1.9L12 16.5l-1.9-5.6L4.5 9l5.6-1.4z"></path></svg>')}Detect with AI</button>
      </div>

      ${board.warnings.length ? html`
        <div class="card card--pad mb-16" style="border-color:rgba(239,68,68,.35);background:var(--danger-tint)">
          <div class="row-flex gap-10">
            <span style="width:20px;height:20px;flex:none;border-radius:99px;background:var(--danger);color:#fff;font-size:13px;font-weight:700;display:flex;align-items:center;justify-content:center">!</span>
            <div style="font-size:12.5px;color:var(--danger-ink)">
              ${board.warnings.map((w) => html`<div>${w.message}</div>`)}
            </div>
          </div>
        </div>` : ""}

      <div class="card card--flush">
        <div class="row-head" style="grid-template-columns:1.4fr 40px 1.4fr 1fr 2fr 60px">
          <div>Blocker</div><div></div><div>Blocked</div><div>Severity</div><div>Why</div><div></div>
        </div>
        ${dependencies.length ? dependencies.map((d) => html`
          <div class="row" style="grid-template-columns:1.4fr 40px 1.4fr 1fr 2fr 60px">
            <div>
              <span class="num">${d.from.ref}</span>
              <div style="color:var(--ink-2)" class="truncate">${d.from.label}</div>
              <span class="meta-2">${d.from.projectName}${d.from.sprintId ? ` · ${bySprint.get(d.from.sprintId) || ""}` : ""}</span>
            </div>
            <div style="text-align:center;color:var(--muted-2)">→</div>
            <div>
              <span class="num">${d.to.ref}</span>
              <div style="color:var(--ink-2)" class="truncate">${d.to.label}</div>
              <span class="meta-2">${d.to.projectName}${d.to.sprintId ? ` · ${bySprint.get(d.to.sprintId) || ""}` : ""}</span>
            </div>
            <div>
              <span class="pill ${d.severity === "blocking" ? "pill--danger" : "pill--grey"}">
                <span class="pill-dot"></span>${d.severity === "blocking" ? "Blocking" : "Normal"}
              </span>
              ${d.crossProject ? html`<div class="meta-2 mt-2">cross-project</div>` : ""}
            </div>
            <div class="meta">${d.note || "—"}</div>
            <div style="text-align:right">
              <button class="btn btn--sm btn--danger" data-act="remove" data-id="${d.id}">✕</button>
            </div>
          </div>`) : html`<div class="empty">No dependencies recorded. Run detection to find them.</div>`}
      </div>
    </main>`;

  root.innerHTML = layout({ screen: "Cross-project Dependencies", active: "crossdeps", level: "train", body });

  on(root, "click", '[data-act="detect"]', async (_e, btn) => {
    try {
      const res = await withBusy(btn, () => api.post("/analysis/dependencies/detect", { trainId: Number(id) }));
      toast(`${res.created} dependencies found (${res.engine} engine).`, "ok");
      renderTrainDependencies(root, { id });
    } catch (err) { reportError(err); }
  });

  on(root, "click", '[data-act="remove"]', async (_e, el) => {
    try {
      await api.del(`/analysis/dependencies/${el.dataset.id}`);
      renderTrainDependencies(root, { id });
    } catch (err) { reportError(err); }
  });
}
