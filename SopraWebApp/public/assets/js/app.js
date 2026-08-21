/**
 * Application entry point: boots the session, registers routes, starts the
 * router.
 */

import {
  api, state, route, navigate, startRouter, setNotFound, currentPath,
  loadContext, reportError, html, $,
} from "./core.js";
import { bindShell, hydrateShell } from "./shell.js";

import { renderLogin } from "./screens/auth.js";
import { renderOverview, renderTrains, renderSharedRequirements, renderTrainDependencies } from "./screens/train.js";
import { renderProjects, newProjectWizard } from "./screens/projects.js";
import {
  renderImport, renderRequirements, renderEpics, renderFeatures, renderStories, renderTasks,
} from "./screens/pipeline.js";
import {
  renderClusters, renderDependencies, renderPrioritization, renderExport,
} from "./screens/analysis.js";
import { renderRoadmap, renderCapacity } from "./screens/roadmap.js";
import { renderAdmin } from "./screens/admin.js";

const root = document.getElementById("app");

/* ------------------------------------------------------------------ *
 * Guards
 * ------------------------------------------------------------------ */

/**
 * Wraps a screen so it only renders for a signed-in user, with the shared
 * context loaded and the shell hydrated afterwards.
 */
function guarded(render) {
  return async (params, path) => {
    if (!state.user) {
      sessionStorage.setItem("spa:returnTo", path);
      navigate("/login", { replace: true });
      return;
    }
    root.setAttribute("aria-busy", "true");
    try {
      await loadContext();
      await render(root, params);
      await hydrateShell();
    } finally {
      root.removeAttribute("aria-busy");
    }
  };
}

/* ------------------------------------------------------------------ *
 * Routes
 * ------------------------------------------------------------------ */

route("/login", async () => {
  if (state.user) return navigate("/", { replace: true });
  renderLogin(root);
});

// Landing: straight to the first train's overview.
route("/", guarded(async () => {
  const target = state.trains.length ? `/train/${state.trains[0].id}` : "/trains";
  navigate(target, { replace: true });
}));

/* Train level */
route("/trains", guarded(renderTrains));
route("/train/:id", guarded(renderOverview));
route("/train/:id/roadmap", guarded(renderRoadmap));
route("/train/:id/capacity", guarded(renderCapacity));
route("/train/:id/requirements", guarded(renderSharedRequirements));
route("/train/:id/dependencies", guarded(renderTrainDependencies));

/* Projects */
route("/projects", guarded(renderProjects));
route("/projects/new", guarded(async (r) => {
  await renderProjects(r);
  await newProjectWizard(r);
}));

/* Project pipeline */
route("/project/:id/import", guarded(renderImport));
route("/project/:id/requirements", guarded(renderRequirements));
route("/project/:id/epics", guarded(renderEpics));
route("/project/:id/features", guarded(renderFeatures));
route("/project/:id/stories", guarded(renderStories));
route("/project/:id/tasks", guarded(renderTasks));
route("/project/:id/clusters", guarded(renderClusters));
route("/project/:id/dependencies", guarded(renderDependencies));
route("/project/:id/prioritization", guarded(renderPrioritization));
route("/project/:id/export", guarded(renderExport));

/* Administration */
route("/admin", guarded(renderAdmin));

setNotFound((path) => {
  root.innerHTML = html`
    <div class="login-page">
      <div class="card card--pad" style="max-width:460px;text-align:center">
        <h1 class="h2" style="margin-bottom:8px">Page not found</h1>
        <p class="meta">Nothing is routed at <code>${path}</code>.</p>
        <a class="btn btn--primary mt-16" href="#/">Back to the app</a>
      </div>
    </div>`;
});

/* ------------------------------------------------------------------ *
 * Boot
 * ------------------------------------------------------------------ */

async function boot() {
  bindShell(root);

  // Who is signed in?
  try {
    const { user } = await api.get("/auth/me", { allowAnonymous: true });
    state.user = user;
  } catch {
    state.user = null;
  }

  // AI availability drives the badge and the wording on the pipeline screens.
  if (state.user) {
    try {
      const status = await api.get("/admin/ai/status");
      state.ai = { configured: status.configured, engine: status.engine, model: status.model };
    } catch {
      state.ai = { configured: false, engine: "local" };
    }
  }

  if (!state.user && currentPath() !== "/login") {
    sessionStorage.setItem("spa:returnTo", currentPath());
    navigate("/login", { replace: true });
  } else if (state.user && currentPath() === "/login") {
    navigate(returnTo(), { replace: true });
  }

  startRouter();
}

function returnTo() {
  const saved = sessionStorage.getItem("spa:returnTo");
  sessionStorage.removeItem("spa:returnTo");
  return saved && saved !== "/login" ? saved : "/";
}

// After a successful sign-in the login screen navigates to "/", which lands
// here; send the user back where they were headed instead.
window.addEventListener("hashchange", () => {
  if (state.user && currentPath() === "/") {
    const saved = sessionStorage.getItem("spa:returnTo");
    if (saved && saved !== "/login" && saved !== "/") {
      sessionStorage.removeItem("spa:returnTo");
      navigate(saved, { replace: true });
    }
  }
});

boot().catch((err) => {
  reportError(err, "The application failed to start.");
  root.innerHTML = html`
    <div class="login-page">
      <div class="card card--pad" style="max-width:460px">
        <h1 class="h2" style="margin-bottom:8px">Could not start</h1>
        <p class="meta">${err && err.message ? err.message : "Unknown error."}</p>
        <button class="btn btn--primary mt-16" onclick="location.reload()">Retry</button>
      </div>
    </div>`;
});
