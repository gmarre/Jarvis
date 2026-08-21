/** Screens 17 (Train Roadmap — Program Board) and 18 (Capacity import). */

import {
  html, raw, esc, api, state, on, toast, reportError, withBusy,
  confirmDialog, modal, fmtDate, SPARK,
} from "../core.js";
import { layout } from "../shell.js";

let showDependencies = true;

/* ================================================================== *
 * 17 — Program board
 * ================================================================== */

export async function renderRoadmap(root, { id }) {
  state.trainId = Number(id);
  const board = await api.get(`/roadmap/${id}/board`);
  const { train, sprints, swimlanes, trainCapacity, edges, warnings } = board;

  const totalFeatures = swimlanes.reduce((a, l) => a + l.featureCount, 0);
  const totalPoints = swimlanes.reduce((a, l) => a + l.totalPoints, 0);
  const unscheduled = swimlanes.reduce((a, l) => a + l.unscheduled.length, 0);

  const cols = `220px repeat(${sprints.length}, minmax(150px, 1fr))`;

  const body = html`
    <main class="screen screen--tight">
      <div class="row-flex end gap-12 wrap mb-16">
        <h1 class="h1">Roadmap</h1>
        <span class="sub" style="margin:0">
          ${totalFeatures} features · ${totalPoints} pts · ${train.piName} · Sprint ${train.sprintCurrent} in flight
        </span>
        <div class="push row-flex gap-10 wrap">
          <button class="chip ${showDependencies ? "is-active" : ""}" data-act="toggle-deps">
            <span class="toggle ${showDependencies ? "is-on" : ""}" style="pointer-events:none"></span>Dependencies
          </button>
          <a class="btn" href="#/train/${id}/capacity">${raw(UPLOAD_ICON)}Import capacity</a>
          <button class="btn btn--primary" data-act="auto-plan">
            ${raw(SPARK.replace('fill="#6366F1"', 'fill="#fff"'))}Auto-plan
          </button>
        </div>
      </div>

      ${warnings.length ? html`
        <div class="card card--pad mb-12" style="border-color:rgba(239,68,68,.35);background:var(--danger-tint);padding:12px 16px">
          ${warnings.map((w) => html`
            <div class="row-flex gap-10" style="font-size:12.5px;color:var(--danger-ink)">
              <span style="width:18px;height:18px;flex:none;border-radius:99px;background:var(--danger);color:#fff;font-size:12px;font-weight:700;display:flex;align-items:center;justify-content:center">!</span>
              ${w.message}
            </div>`)}
        </div>` : ""}

      <div class="card card--flush board grow" style="min-height:0">
        <div class="board-grid" style="grid-template-columns:${cols}">
          <div style="padding:14px 16px;border-right:1px solid var(--border-soft);border-bottom:1px solid var(--border-soft);position:sticky;left:0;background:var(--card);z-index:2">
            <div class="eyebrow">Project swimlanes</div>
            <div class="meta mt-2">${totalFeatures} features scheduled</div>
          </div>
          ${sprints.map((s) => {
            const cap = trainCapacity.find((c) => c.sprintId === s.id) || { used: 0, available: 0, state: "empty" };
            return html`
              <div style="padding:12px 14px;border-right:1px solid var(--border-soft);border-bottom:1px solid var(--border-soft);background:${
                s.position + 1 === train.sprintCurrent ? "#F8FAFF" : "var(--card)"}">
                <div style="font-size:13.5px;font-weight:600">${s.name}</div>
                <div class="meta-2">${s.startsOn ? fmtDate(s.startsOn) : ""} ${s.endsOn ? `– ${fmtDate(s.endsOn)}` : ""}</div>
                <div class="meta mt-6">${cap.used} / ${cap.available} pts</div>
                <div class="progress mt-2"><i class="${capClass(cap.state)}" style="width:${capWidth(cap)}%"></i></div>
              </div>`;
          })}

          ${swimlanes.map((lane) => html`
            <div style="padding:14px 16px;border-right:1px solid var(--border-soft);border-bottom:1px solid var(--border-soft);position:sticky;left:0;background:var(--card);z-index:2">
              <div class="row-flex gap-8"><span class="card-rule"></span>
                <span style="font-size:13.5px;font-weight:600">${lane.projectName}</span></div>
              <div class="meta mt-6">${lane.featureCount} features · ${lane.totalPoints} pts</div>
              ${lane.unscheduled.length ? html`
                <div class="mt-8" data-backlog="${lane.projectId}">
                  <div class="eyebrow" style="font-size:10px;padding:0">Unscheduled</div>
                  ${lane.unscheduled.map((f) => featureCard(f, true))}
                </div>` : ""}
            </div>
            ${lane.cells.map((cell) => html`
              <div class="board-cell" data-drop-sprint="${cell.sprintId}" data-drop-project="${lane.projectId}">
                ${cell.features.map((f) => featureCard(f, false))}
                <div class="meta-2 mt-6" style="font-size:10.5px">${cell.used} / ${cell.available}</div>
                <div class="progress" style="height:3px"><i class="${capClass(cell.state)}" style="width:${capWidth(cell)}%"></i></div>
              </div>`)}`)}
        </div>
        ${showDependencies ? raw(`<svg class="board-edges" data-edges='${esc(JSON.stringify(edges))}'></svg>`) : ""}
      </div>

      <div class="row-flex gap-16 wrap mt-12" style="font-size:11.5px;color:var(--muted)">
        <span class="row-flex gap-6"><span style="width:12px;height:12px;border-radius:4px;background:var(--ok-tint);border:1px solid rgba(16,185,129,.35)"></span>Approved</span>
        <span class="row-flex gap-6"><span style="width:12px;height:12px;border-radius:4px;background:var(--warn-tint);border:1px solid rgba(245,158,11,.35)"></span>In review</span>
        <span class="row-flex gap-6"><span style="width:12px;height:12px;border-radius:4px;background:var(--grey-tint);border:1px solid rgba(148,163,184,.35)"></span>Rejected</span>
        <span class="row-flex gap-6"><span style="width:14px;height:2px;background:var(--danger)"></span>Blocks</span>
        <span class="row-flex gap-6"><span style="width:14px;height:2px;background:var(--warn)"></span>Depends on</span>
        <span class="row-flex gap-6">${raw(SPARK)}Auto-scheduled</span>
        <span class="push">${unscheduled} feature${unscheduled === 1 ? "" : "s"} unscheduled</span>
      </div>
    </main>`;

  root.innerHTML = layout({ screen: "Roadmap", active: "roadmap", level: "train", body });

  const rerender = () => renderRoadmap(root, { id });

  on(root, "click", '[data-act="toggle-deps"]', () => { showDependencies = !showDependencies; rerender(); });

  on(root, "click", '[data-act="auto-plan"]', async (_e, btn) => {
    try {
      const preview = await withBusy(btn, () => api.post(`/roadmap/${id}/auto-plan`, { dryRun: true }));
      const ok = await confirmDialog({
        title: "Auto-plan the train?",
        message: `${preview.placed.length} features would be scheduled` +
          (preview.unplaced.length ? `, ${preview.unplaced.length} could not fit.` : ".") +
          " Features you placed by hand stay where they are.",
        confirmLabel: "Auto-plan",
      });
      if (!ok) return;
      const res = await api.post(`/roadmap/${id}/auto-plan`, {});
      toast(`${res.placed.length} features scheduled.` +
            (res.unplaced.length ? ` ${res.unplaced.length} could not fit.` : ""), "ok");
      if (res.unplaced.length) {
        await modal(() => html`
          <div class="modal-head"><h2 class="h2">Could not schedule</h2>
            <p class="sub">These features need capacity or an earlier blocker.</p></div>
          <div class="modal-body stack gap-8">
            ${res.unplaced.map((u) => html`
              <div class="card" style="padding:10px 12px">
                <div class="row-flex gap-8"><span class="num">${u.ref}</span>
                  <span style="font-weight:600">${u.title}</span></div>
                <div class="meta mt-2">${u.reason}</div>
              </div>`)}
          </div>
          <div class="modal-foot"><button class="btn push" data-act="cancel">Close</button></div>`,
          { onMount(o, close) { on(o, "click", '[data-act="cancel"]', () => close(null)); } });
      }
      rerender();
    } catch (err) { reportError(err); }
  });

  // Drag features between sprints.
  let dragged = null;
  on(root, "dragstart", "[data-feature]", (e, el) => {
    dragged = el.dataset.feature;
    e.dataTransfer.effectAllowed = "move";
  });
  on(root, "dragover", "[data-drop-sprint]", (e, el) => { e.preventDefault(); el.classList.add("is-drop"); });
  on(root, "dragleave", "[data-drop-sprint]", (_e, el) => el.classList.remove("is-drop"));
  on(root, "drop", "[data-drop-sprint]", async (e, el) => {
    e.preventDefault();
    el.classList.remove("is-drop");
    if (!dragged) return;
    try {
      await api.post(`/roadmap/features/${dragged}/schedule`, { sprintId: Number(el.dataset.dropSprint) });
      dragged = null;
      rerender();
    } catch (err) { reportError(err); }
  });
  on(root, "dragover", "[data-backlog]", (e) => e.preventDefault());
  on(root, "drop", "[data-backlog]", async (e) => {
    e.preventDefault();
    if (!dragged) return;
    try {
      await api.post(`/roadmap/features/${dragged}/schedule`, { sprintId: null });
      dragged = null;
      rerender();
    } catch (err) { reportError(err); }
  });

  if (showDependencies) requestAnimationFrame(() => drawEdges(root));
}

const UPLOAD_ICON =
  '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M12 16V4M7 9l5-5 5 5"></path><path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"></path></svg>';

function featureCard(f, compact) {
  // The metadata line has to survive a ~130px column, so it stays on one line
  // and clips rather than wrapping the card to double height.
  const moscow = f.moscow === "Wont" ? "Won't" : f.moscow;
  return raw(`<div class="feature-card is-${esc(f.status)}" draggable="true" data-feature="${f.id}"
       title="${esc(f.ref)} — ${esc(f.title)} · ${f.points} pts · ${esc(moscow)}">
    <div class="feature-card-title truncate">${esc(f.title)}</div>
    <div class="row-flex gap-6 truncate" style="margin-top:3px;white-space:nowrap;font-size:10px;line-height:1.4">
      <span class="mono" style="color:var(--muted)">${esc(f.ref)}</span>
      <span style="font-weight:700">${f.points}p</span>
      <span style="color:var(--muted);font-weight:600">${esc(moscow)}</span>
      ${f.aiScheduled && !compact ? `<span class="push" style="flex:none">${SPARK}</span>` : ""}
    </div>
  </div>`);
}

function capClass(state) {
  return { over: "is-over", near: "is-near", under: "", empty: "is-empty" }[state] || "";
}

function capWidth(cell) {
  if (!cell.available) return cell.used > 0 ? 100 : 0;
  return Math.min(100, Math.round((cell.used / cell.available) * 100));
}

/**
 * Draws dependency arrows between feature cards.
 *
 * Positions are read from the live DOM, so the overlay stays correct after a
 * drag, a scroll, or a window resize.
 */
function drawEdges(root) {
  const svg = root.querySelector("[data-edges]");
  if (!svg) return;
  const board = svg.closest(".board");
  const edges = JSON.parse(svg.dataset.edges || "[]");
  const boardRect = board.getBoundingClientRect();

  svg.setAttribute("width", board.scrollWidth);
  svg.setAttribute("height", board.scrollHeight);
  svg.style.width = `${board.scrollWidth}px`;
  svg.style.height = `${board.scrollHeight}px`;

  const centre = (featureId) => {
    const el = board.querySelector(`[data-feature="${featureId}"]`);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return {
      x: r.left - boardRect.left + board.scrollLeft + r.width / 2,
      y: r.top - boardRect.top + board.scrollTop + r.height / 2,
    };
  };

  let markup = `<defs>
    <marker id="arrow-block" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M0 0 L8 4 L0 8 z" fill="#EF4444"></path></marker>
    <marker id="arrow-dep" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M0 0 L8 4 L0 8 z" fill="#F59E0B"></path></marker>
  </defs>`;

  for (const e of edges) {
    const from = centre(e.from.id);
    const to = centre(e.to.id);
    if (!from || !to) continue;
    const blocking = e.severity === "blocking" || e.backwardInTime;
    const colour = blocking ? "#EF4444" : "#F59E0B";
    const marker = blocking ? "arrow-block" : "arrow-dep";
    const dx = Math.max(30, Math.abs(to.x - from.x) / 2);
    const d = `M ${from.x} ${from.y} C ${from.x + dx} ${from.y}, ${to.x - dx} ${to.y}, ${to.x} ${to.y}`;
    markup += `<path d="${d}" fill="none" stroke="${colour}" stroke-width="2"
      ${e.backwardInTime ? 'stroke-dasharray="5 4"' : ""} marker-end="url(#${marker})" opacity=".85"></path>`;
    if (e.backwardInTime) {
      const mx = (from.x + to.x) / 2;
      const my = (from.y + to.y) / 2 - 10;
      markup += `<rect x="${mx - 52}" y="${my - 11}" width="104" height="20" rx="6" fill="#fff" stroke="#EF4444"></rect>
        <text x="${mx}" y="${my + 3}" text-anchor="middle" font-size="10.5" font-family="Inter, sans-serif" fill="#B91C1C">backward in time</text>`;
    }
  }
  svg.innerHTML = markup;
}

/* ================================================================== *
 * 18 — Capacity import
 * ================================================================== */

export async function renderCapacity(root, { id }) {
  state.trainId = Number(id);
  const [{ rows }, { sprints }, { projects }] = await Promise.all([
    api.get(`/roadmap/${id}/capacity`),
    api.get(`/trains/${id}/sprints`),
    api.get(`/projects?trainId=${id}`),
  ]);

  const byKey = new Map(rows.map((r) => [`${r.sprintId}:${r.projectId}`, r]));

  const body = html`
    <main class="screen">
      <div class="row-flex end mb-20">
        <div>
          <h1 class="h1">Capacity</h1>
          <p class="sub">Import an Excel workbook, or edit the grid directly. Capacity feeds the roadmap.</p>
        </div>
        <div class="push row-flex gap-10">
          <button class="btn" data-act="template">Download template</button>
          <a class="btn btn--primary" href="#/train/${id}/roadmap">Back to roadmap</a>
        </div>
      </div>

      <div class="dropzone mb-20" data-dropzone tabindex="0" role="button">
        <div style="width:44px;height:44px;border-radius:14px;background:var(--primary-tint);display:flex;align-items:center;justify-content:center;margin-bottom:14px;color:var(--primary)">
          ${raw(UPLOAD_ICON.replace('width="14" height="14"', 'width="21" height="21"'))}
        </div>
        <div style="font-size:14px;font-weight:600">Drop a capacity workbook, or click to browse</div>
        <div class="meta-2 mt-6">.xlsx — rows are projects, columns are “Sprint 1”, “Sprint 2”, …</div>
        <input type="file" accept=".xlsx,.xls" hidden data-file-input>
      </div>

      <div class="card card--flush">
        <div class="row-flex gap-10" style="padding:16px 18px 12px">
          <h3 class="h3">Capacity grid</h3>
          <span class="push meta">points available per project and sprint</span>
        </div>
        <div style="overflow:auto">
          <div style="display:grid;grid-template-columns:200px repeat(${sprints.length}, minmax(110px,1fr));min-width:${200 + sprints.length * 110}px">
            <div class="row-head" style="grid-template-columns:1fr;padding:10px 16px;border-right:1px solid var(--border-soft)">Project</div>
            ${sprints.map((s) => html`
              <div class="row-head" style="grid-template-columns:1fr;padding:10px 12px;text-align:center">${s.name}</div>`)}
            ${projects.map((p) => html`
              <div style="padding:12px 16px;border-right:1px solid var(--border-soft);border-bottom:1px solid var(--border-soft);font-size:13px;font-weight:600">
                ${p.name}
              </div>
              ${sprints.map((s) => {
                const row = byKey.get(`${s.id}:${p.id}`) || { available: 0, used: 0, ratio: 0 };
                return html`
                  <div style="padding:8px;border-bottom:1px solid var(--border-soft);text-align:center">
                    <input class="input input--sm" style="text-align:center" type="number" min="0"
                           value="${row.available}" data-cap-sprint="${s.id}" data-cap-project="${p.id}">
                    <div class="meta-2 mt-2" style="font-size:10.5px">
                      used ${row.used}${row.available ? ` · ${Math.round(row.ratio * 100)} %` : ""}
                    </div>
                  </div>`;
              })}`)}
          </div>
        </div>
      </div>
    </main>`;

  root.innerHTML = layout({ screen: "Capacity", active: "roadmap", level: "train", body });

  const rerender = () => renderCapacity(root, { id });

  on(root, "change", "[data-cap-sprint]", async (_e, el) => {
    try {
      await api.post(`/roadmap/${id}/capacity`, {
        sprintId: Number(el.dataset.capSprint),
        projectId: Number(el.dataset.capProject),
        availablePoints: Number(el.value),
      });
      toast("Capacity updated.", "ok");
      rerender();
    } catch (err) { reportError(err); }
  });

  on(root, "click", '[data-act="template"]', () => {
    api.download(`/roadmap/${id}/capacity/template`);
  });

  const zone = root.querySelector("[data-dropzone]");
  const input = root.querySelector("[data-file-input]");
  zone.addEventListener("click", () => input.click());
  zone.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); input.click(); } });
  ["dragenter", "dragover"].forEach((evt) => zone.addEventListener(evt, (e) => { e.preventDefault(); zone.classList.add("is-over"); }));
  ["dragleave", "drop"].forEach((evt) => zone.addEventListener(evt, (e) => { e.preventDefault(); zone.classList.remove("is-over"); }));
  zone.addEventListener("drop", (e) => { if (e.dataTransfer.files[0]) upload(e.dataTransfer.files[0]); });
  input.addEventListener("change", () => { if (input.files[0]) upload(input.files[0]); });

  async function upload(file) {
    const fd = new FormData();
    fd.append("file", file);
    zone.innerHTML = `<div class="row-flex gap-10"><span class="spinner spinner--ink"></span>Reading ${esc(file.name)}…</div>`;
    try {
      const res = await api.post(`/roadmap/${id}/capacity/import`, fd);
      const problems = [
        ...res.unmatched.projects.map((p) => `Project “${p}” is not in this train.`),
        ...res.unmatched.sprints.map((s) => `Sprint “${s}” does not exist in this train.`),
        ...res.warnings,
      ];
      toast(`${res.applied} capacity values imported from ${res.sheetName}.`, "ok");
      if (problems.length) {
        await modal(() => html`
          <div class="modal-head"><h2 class="h2">Imported with warnings</h2>
            <p class="sub">${res.applied} values applied. These rows were skipped or adjusted.</p></div>
          <div class="modal-body stack gap-8">
            ${problems.map((p) => html`<div class="meta" style="color:var(--warn-ink)">${p}</div>`)}
          </div>
          <div class="modal-foot"><button class="btn push" data-act="cancel">Close</button></div>`,
          { onMount(o, close) { on(o, "click", '[data-act="cancel"]', () => close(null)); } });
      }
      rerender();
    } catch (err) {
      reportError(err, "Import failed.");
      rerender();
    }
  }
}
