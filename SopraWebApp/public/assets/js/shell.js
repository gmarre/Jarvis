/**
 * The application shell — Sidebar, Topbar, Stepper.
 *
 * These are ports of the three Claude Design components (Sidebar.dc.html,
 * Topbar.dc.html, Stepper.dc.html): same structure, same states, same counters,
 * but driven by live data instead of props typed into the canvas.
 */

import { html, raw, esc, state, currentTrain, currentProject, CHEVRON, api, navigate, on, toast } from "./core.js";

/** The 11 pipeline steps, mirroring STEP_NAMES on the server. */
export const STEP_NAMES = [
  "Import", "Extraction", "Epics", "Features", "Stories",
  "Tasks", "Clusters", "Dependencies", "Prioritization", "Roadmap", "Review",
];

/** Stepper index → route builder. */
const STEP_ROUTES = [
  (p) => `/project/${p}/import`,
  (p) => `/project/${p}/requirements`,
  (p) => `/project/${p}/epics`,
  (p) => `/project/${p}/features`,
  (p) => `/project/${p}/stories`,
  (p) => `/project/${p}/tasks`,
  (p) => `/project/${p}/clusters`,
  (p) => `/project/${p}/dependencies`,
  (p) => `/project/${p}/prioritization`,
  (p, t) => `/train/${t}/roadmap`,
  (p) => `/project/${p}/export`,
];

/** Project-level sidebar entries, in pipeline order. */
const PROJECT_NAV = [
  { key: "import", label: "URD Import", count: null },
  { key: "requirements", label: "Requirements", count: "requirements" },
  { key: "epics", label: "Epics", count: "epics" },
  { key: "features", label: "Features", count: "features" },
  { key: "stories", label: "User Stories", count: "stories" },
  { key: "tasks", label: "Tasks", count: "tasks" },
  { key: "clusters", label: "Clusters", count: "clusters" },
  { key: "dependencies", label: "Dependencies", count: "dependencies", alert: true },
  { key: "prioritization", label: "Prioritization", count: null },
  { key: "export", label: "Export", count: null, needsApproval: true },
];

/* ------------------------------------------------------------------ *
 * Sidebar
 * ------------------------------------------------------------------ */

/**
 * @param {object} opts
 *   active       — key of the current entry ("overview", "stories", …)
 *   showProject  — render the project section
 *   counts       — { requirements, epics, … } for the active project
 */
export function Sidebar({ active = "", showProject = false, counts = {} } = {}) {
  const train = currentTrain();
  const project = currentProject();
  const user = state.user || {};

  const trainNav = [
    { key: "overview", label: "Overview", href: train ? `/train/${train.id}` : "/trains", count: null },
    { key: "projects", label: "Projects", href: "/projects",
      count: train ? state.projects.filter((p) => p.train && p.train.id === train.id).length : state.projects.length },
    { key: "roadmap", label: "Roadmap", href: train ? `/train/${train.id}/roadmap` : "/trains", gantt: true },
    { key: "shared", label: "Shared Requirements", href: train ? `/train/${train.id}/requirements` : "/trains",
      count: train ? train.sharedRequirements : null },
    { key: "crossdeps", label: "Cross-project Deps", href: train ? `/train/${train.id}/dependencies` : "/trains",
      count: null, alert: true, dynamic: "crossDeps" },
  ];

  const activeIndex = PROJECT_NAV.findIndex((n) => n.key === active);

  return html`
    <aside class="sidebar">
      <a class="sidebar-logo" href="#/trains">
        <div class="sidebar-mark">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round">
            <path d="M12 3v18M4 8h16M7 14h10"></path>
          </svg>
        </div>
        <div class="sidebar-wordmark">PI Planning<br>Assistant</div>
      </a>

      <div class="sidebar-train">
        <a class="sidebar-train-card" href="#/trains">
          <span class="sidebar-rail" style="height:26px"></span>
          <span class="grow">
            <span class="eyebrow" style="font-size:10.5px">Train</span>
            <span style="display:block;font-size:13px;font-weight:600;color:var(--ink);line-height:1.3;margin-top:1px">
              ${train ? train.name : "No train"}
            </span>
          </span>
          ${raw(CHEVRON)}
        </a>
      </div>

      <nav class="sidebar-section">
        <div class="sidebar-heading">Train level</div>
        ${trainNav.map((item) => sidebarItem(item, active))}
      </nav>

      ${showProject && project ? html`
        <nav class="sidebar-section">
          <div class="sidebar-heading sidebar-heading--project">
            <span>Project</span>
            <span style="font-size:11.5px;font-weight:600;color:var(--ink-2);line-height:1.3">${project.name}</span>
          </div>
          ${PROJECT_NAV.map((item, i) => sidebarItem({
            key: item.key,
            label: item.label,
            href: `/project/${project.id}/${item.key}`,
            count: item.count ? counts[item.count] : null,
            alert: item.alert && counts[item.count] > 0,
            done: activeIndex > -1 && i < activeIndex,
            locked: item.needsApproval && !counts.exportReady,
          }, active))}
        </nav>` : ""}

      <button class="sidebar-user" data-act="account" type="button">
        <span class="avatar ${user.readOnly ? "is-readonly" : ""}">${user.initials || "?"}</span>
        <span style="min-width:0">
          <span style="display:block;font-size:13px;font-weight:600;line-height:1.3;color:var(--ink)">${user.name || ""}</span>
          <span class="pill ${user.readOnly ? "pill--grey" : "pill--ai"}" style="margin-top:3px;font-size:11px">
            ${user.role || ""}${user.readOnly ? " · read only" : ""}
          </span>
        </span>
        <span class="push">${raw(CHEVRON)}</span>
      </button>
    </aside>`;
}

function sidebarItem(item, active) {
  const isActive = item.key === active;
  const classes = [
    "sidebar-item",
    isActive ? "is-active" : "",
    item.done ? "is-done" : "",
    item.locked ? "is-locked" : "",
  ].filter(Boolean).join(" ");

  const marker = item.gantt
    ? '<span class="sidebar-gantt"></span>'
    : '<span class="sidebar-dot"></span>';

  const count = item.count != null && item.count !== ""
    ? `<span class="sidebar-count${item.alert ? " is-alert" : ""}">${esc(item.count)}</span>`
    : item.dynamic
      ? `<span class="sidebar-count is-alert" data-dynamic="${esc(item.dynamic)}"></span>`
      : "";

  if (item.locked) {
    return raw(`<span class="${classes}" title="Approve the backlog to unlock">${marker}${esc(item.label)}${count}</span>`);
  }
  return raw(`<a class="${classes}" href="#${esc(item.href)}">${marker}${esc(item.label)}${count}</a>`);
}

/* ------------------------------------------------------------------ *
 * Topbar
 * ------------------------------------------------------------------ */

export function Topbar({ screen, level = "project" } = {}) {
  const train = currentTrain();
  const project = currentProject();
  const user = state.user || {};
  const showProject = level !== "train" && project;

  return html`
    <header class="topbar">
      <div class="crumbs">
        <a class="crumb" href="#/trains">
          <span class="sidebar-rail" style="height:14px"></span>${train ? train.name : "All trains"}${raw(CHEVRON.replace('width="14" height="14"', 'width="13" height="13"'))}
        </a>
        ${showProject ? html`
          <span class="crumb-sep">▸</span>
          <a class="crumb" href="#/projects">${project.name}${raw(CHEVRON.replace('width="14" height="14"', 'width="13" height="13"'))}</a>` : ""}
        <span class="crumb-sep">▸</span><span class="crumb-current">${screen}</span>
      </div>

      <label class="topbar-search">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" stroke-width="2" aria-hidden="true">
          <circle cx="11" cy="11" r="7"></circle><path d="M20 20l-3.5-3.5"></path>
        </svg>
        <input type="search" placeholder="Search epics, features, stories…" data-search aria-label="Search">
        <span class="kbd">⌘K</span>
      </label>

      <div class="topbar-right">
        <span data-ai-badge></span>
        <button class="btn btn--ghost btn--icon" title="Notifications" type="button" data-act="notifications">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#64748B" stroke-width="1.8">
            <path d="M18 8a6 6 0 1 0-12 0c0 7-3 8-3 8h18s-3-1-3-8"></path><path d="M13.7 21a2 2 0 0 1-3.4 0"></path>
          </svg>
        </button>
        <span class="avatar avatar--sm ${user.readOnly ? "is-readonly" : ""}">${user.initials || "?"}</span>
      </div>
    </header>`;
}

/* ------------------------------------------------------------------ *
 * Stepper
 * ------------------------------------------------------------------ */

export function Stepper(current) {
  const project = currentProject();
  const train = currentTrain();
  const c = Number(current) || 0;

  return html`
    <div class="stepper">
      <div class="stepper-track">
        ${STEP_NAMES.map((name, i) => {
          const done = i < c;
          const isCurrent = i === c;
          const href = project ? STEP_ROUTES[i](project.id, train ? train.id : "") : null;
          const inner = html`
            <div class="step-rail">
              <div class="step-line ${i === 0 ? "is-hidden" : i <= c ? "is-done" : ""}"></div>
              <div class="step-node">
                ${done ? raw('<span class="step-check"></span>') : isCurrent ? raw('<span class="step-pip"></span>') : ""}
              </div>
              <div class="step-line ${i === STEP_NAMES.length - 1 ? "is-hidden" : i < c ? "is-done" : ""}"></div>
            </div>
            <div class="step-label">${name}</div>`;
          const cls = `step ${done ? "is-done" : ""} ${isCurrent ? "is-current" : ""}`;
          return href
            ? html`<a class="${cls}" href="#${href}">${inner}</a>`
            : html`<div class="${cls}">${inner}</div>`;
        })}
      </div>
    </div>`;
}

/* ------------------------------------------------------------------ *
 * Layout assembly
 * ------------------------------------------------------------------ */

/**
 * Renders a full screen inside the shell.
 *
 * @param {object} opts
 *   screen      — topbar breadcrumb label
 *   active      — sidebar key
 *   level       — "train" | "project"
 *   step        — stepper index, or null to omit the stepper
 *   counts      — sidebar counters
 *   body        — the screen markup
 */
export function layout({ screen, active, level = "project", step = null, counts = {}, body }) {
  return html`
    <div class="app-shell">
      ${raw(Sidebar({ active, showProject: level !== "train", counts }))}
      <div class="app-main">
        ${raw(Topbar({ screen, level }))}
        ${step != null ? raw(Stepper(step)) : ""}
        ${raw(body)}
      </div>
    </div>`;
}

/* ------------------------------------------------------------------ *
 * Shell-level behaviour, bound once
 * ------------------------------------------------------------------ */

export function bindShell(root) {
  // Account menu → sign out.
  on(root, "click", '[data-act="account"]', async () => {
    const { confirmDialog } = await import("./core.js");
    if (await confirmDialog({ title: "Sign out?", message: `You are signed in as ${state.user.name}.`, confirmLabel: "Sign out" })) {
      await api.post("/auth/logout");
      state.user = null;
      navigate("/login");
    }
  });

  on(root, "click", '[data-act="notifications"]', () => {
    toast("Notifications are not part of this build.", "info");
  });

  // ⌘K / Ctrl+K focuses search.
  document.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
      const input = document.querySelector("[data-search]");
      if (input) { e.preventDefault(); input.focus(); }
    }
  });
}

/** Fills the dynamic sidebar counters and AI badge after a render. */
export async function hydrateShell() {
  const badge = document.querySelector("[data-ai-badge]");
  if (badge) {
    badge.innerHTML = state.ai.configured
      ? '<span class="pill pill--ai" title="Claude is configured">Claude</span>'
      : '<span class="pill pill--grey" title="No ANTHROPIC_API_KEY — the local engine is used"><span class="pill-dot"></span>Local engine</span>';
  }

  const slot = document.querySelector('[data-dynamic="crossDeps"]');
  if (slot && state.trainId) {
    try {
      const { counts } = await api.get(`/analysis/dependencies?trainId=${state.trainId}`);
      // The train-level entry counts links that span two projects; a project's
      // internal story dependencies belong to that project's own counter.
      slot.textContent = counts.crossProject;
      slot.classList.toggle("is-alert", counts.blocking > 0);
    } catch {
      slot.remove();
    }
  }
}
