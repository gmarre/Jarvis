/**
 * Core runtime: API client, DOM helpers, router, toasts, shared state.
 */

/* ------------------------------------------------------------------ *
 * DOM helpers
 * ------------------------------------------------------------------ */

/** Escapes a value for interpolation into HTML. */
export function esc(value) {
  if (value == null) return "";
  return String(value)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

/**
 * Markup that has already been escaped (or is trusted) and must be inserted
 * verbatim. Carrying this as a type is what makes nesting work: an `html`
 * result interpolated into another `html` is recognised as safe instead of
 * being escaped a second time.
 */
class Safe {
  constructor(value) { this.value = String(value == null ? "" : value); }
  toString() { return this.value; }
}

/**
 * Tagged template that escapes interpolations by default.
 *
 * Values are escaped, arrays are joined (so `${items.map(...)}` works), and
 * `Safe` values — anything produced by `html` or wrapped in `raw()` — are
 * inserted as-is. Returns a `Safe`, so `innerHTML = html\`…\`` still works
 * through normal string coercion.
 */
export function html(strings, ...values) {
  let out = strings[0];
  for (let i = 0; i < values.length; i++) {
    out += render(values[i]) + strings[i + 1];
  }
  return new Safe(out);
}

/** Marks a hand-built markup string as safe to insert verbatim. */
export function raw(value) {
  return value instanceof Safe ? value : new Safe(value);
}

function render(v) {
  if (v == null || v === false) return "";
  if (v instanceof Safe) return v.value;
  if (Array.isArray(v)) return v.map(render).join("");
  return esc(v);
}

export { Safe };

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

/** Delegated event binding, scoped to a container. */
export function on(root, event, selector, handler) {
  root.addEventListener(event, (e) => {
    const target = e.target.closest(selector);
    if (target && root.contains(target)) handler(e, target);
  });
}

/* ------------------------------------------------------------------ *
 * Formatting
 * ------------------------------------------------------------------ */

export const STATUS_LABEL = { approved: "Approved", in_review: "In review", rejected: "Rejected" };
export const STATUS_CLASS = { approved: "pill--ok", in_review: "pill--warn", rejected: "pill--grey" };

export function statusPill(status) {
  return raw(
    `<span class="pill ${STATUS_CLASS[status] || "pill--grey"}"><span class="pill-dot"></span>${
      esc(STATUS_LABEL[status] || status)
    }</span>`,
  );
}

export function aiPill(label = "AI generated") {
  return raw(
    `<span class="pill pill--ai">${SPARK}${esc(label)}</span>`,
  );
}

export const SPARK =
  '<svg width="11" height="11" viewBox="0 0 24 24" fill="#6366F1" aria-hidden="true"><path d="M12 2l1.9 5.6L19.5 9l-5.6 1.9L12 16.5l-1.9-5.6L4.5 9l5.6-1.4z"></path></svg>';

export const CHEVRON =
  '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" stroke-width="2" aria-hidden="true"><path d="M6 9l6 6 6-6"></path></svg>';

export function fmtDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso.includes("T") ? iso : iso.replace(" ", "T") + "Z");
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function fmtAgo(iso) {
  if (!iso) return "never";
  const d = new Date(iso.includes("T") ? iso : iso.replace(" ", "T") + "Z");
  const secs = Math.round((Date.now() - d.getTime()) / 1000);
  if (secs < 60) return "just now";
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  if (days < 31) return `${days} day${days > 1 ? "s" : ""} ago`;
  const months = Math.round(days / 30);
  if (months < 12) return `${months} month${months > 1 ? "s" : ""} ago`;
  return `${Math.round(months / 12)} year${months >= 24 ? "s" : ""} ago`;
}

export function fmtTime(iso) {
  if (!iso) return "";
  const d = new Date(iso.includes("T") ? iso : iso.replace(" ", "T") + "Z");
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

export function pct(n) {
  return `${Math.round(n || 0)} %`;
}

/* ------------------------------------------------------------------ *
 * API client
 * ------------------------------------------------------------------ */

export class ApiError extends Error {
  constructor(status, payload) {
    super(payload && payload.message ? payload.message : `Request failed (${status})`);
    this.status = status;
    this.code = payload && payload.error ? payload.error : "error";
    this.payload = payload || {};
  }
}

async function request(method, path, body, options = {}) {
  const init = { method, headers: {}, credentials: "same-origin" };

  if (body instanceof FormData) {
    init.body = body;
  } else if (body !== undefined) {
    init.headers["Content-Type"] = "application/json";
    init.body = JSON.stringify(body);
  }

  const res = await fetch(`/api${path}`, init);

  if (res.status === 401 && !options.allowAnonymous) {
    state.user = null;
    if (location.hash !== "#/login") navigate("/login");
    throw new ApiError(401, { error: "authentication_required" });
  }

  if (options.raw) return res;

  const text = await res.text();
  let payload = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = { message: text.slice(0, 200) };
    }
  }
  if (!res.ok) throw new ApiError(res.status, payload);
  return payload;
}

export const api = {
  get: (path, options) => request("GET", path, undefined, options),
  post: (path, body, options) => request("POST", path, body, options),
  patch: (path, body, options) => request("PATCH", path, body, options),
  put: (path, body, options) => request("PUT", path, body, options),
  del: (path, options) => request("DELETE", path, undefined, options),

  /** Triggers a browser download for an endpoint that returns a file. */
  download(path, filename) {
    const a = document.createElement("a");
    a.href = `/api${path}`;
    if (filename) a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  },
};

/* ------------------------------------------------------------------ *
 * Shared state
 * ------------------------------------------------------------------ */

export const state = {
  user: null,
  trains: [],
  projects: [],
  trainId: null,
  projectId: null,
  ai: { configured: false, engine: "local" },
};

/** Loads the context every shell render needs. Cheap enough to call per route. */
export async function loadContext() {
  const [{ trains }, { projects }] = await Promise.all([
    api.get("/trains"),
    api.get("/projects"),
  ]);
  state.trains = trains;
  state.projects = projects;
  if (!state.trainId && trains.length) state.trainId = trains[0].id;
  return state;
}

export function currentTrain() {
  return state.trains.find((t) => t.id === state.trainId) || state.trains[0] || null;
}

export function currentProject() {
  return state.projects.find((p) => p.id === state.projectId) || null;
}

/* ------------------------------------------------------------------ *
 * Toasts
 * ------------------------------------------------------------------ */

let toastRoot = null;

export function toast(message, kind = "info", ms = 4200) {
  if (!toastRoot) {
    toastRoot = document.createElement("div");
    toastRoot.className = "toast-stack";
    document.body.appendChild(toastRoot);
  }
  const el = document.createElement("div");
  el.className = `toast${kind === "error" ? " toast--error" : kind === "ok" ? " toast--ok" : ""}`;
  el.textContent = message;
  toastRoot.appendChild(el);
  setTimeout(() => {
    el.style.transition = "opacity .25s";
    el.style.opacity = "0";
    setTimeout(() => el.remove(), 250);
  }, ms);
}

/** Reports an error to the user without swallowing the detail. */
export function reportError(err, fallback = "Something went wrong.") {
  const message = err instanceof ApiError
    ? err.message || describeCode(err.code)
    : err && err.message ? err.message : fallback;
  toast(message, "error", 6000);
  if (!(err instanceof ApiError) || err.status >= 500) console.error(err);
}

function describeCode(code) {
  return {
    read_only_role: "Your role has read-only access.",
    admin_required: "Only an administrator can do that.",
    authentication_required: "Please sign in again.",
    unsupported_file_type: "That file type is not supported.",
    file_too_large: "That file is larger than 25 MB.",
    no_text_extracted: "No text could be extracted from that document.",
    train_not_empty: "Move or delete the projects in this train first.",
    dependency_exists: "That dependency already exists.",
  }[code] || "Request failed.";
}

/* ------------------------------------------------------------------ *
 * Router
 * ------------------------------------------------------------------ */

const routes = [];

/** `pattern` uses :params, e.g. "/project/:id/stories". */
export function route(pattern, handler) {
  const keys = [];
  const rx = new RegExp(
    "^" + pattern.replace(/:[A-Za-z0-9_]+/g, (m) => {
      keys.push(m.slice(1));
      return "([^/]+)";
    }) + "$",
  );
  routes.push({ rx, keys, handler, pattern });
}

export function navigate(path, { replace = false } = {}) {
  const target = `#${path}`;
  if (location.hash === target) return resolve();
  if (replace) location.replace(target);
  else location.hash = target;
}

export function currentPath() {
  return location.hash.replace(/^#/, "") || "/";
}

let notFoundHandler = null;
export function setNotFound(fn) { notFoundHandler = fn; }

let resolving = false;

export async function resolve() {
  if (resolving) return;
  resolving = true;
  const path = currentPath();
  try {
    for (const r of routes) {
      const m = path.match(r.rx);
      if (!m) continue;
      const params = {};
      r.keys.forEach((k, i) => { params[k] = decodeURIComponent(m[i + 1]); });
      await r.handler(params, path);
      return;
    }
    if (notFoundHandler) await notFoundHandler(path);
  } catch (err) {
    reportError(err, "Could not open that page.");
    console.error("[router]", path, err);
  } finally {
    resolving = false;
  }
}

export function startRouter() {
  window.addEventListener("hashchange", resolve);
  resolve();
}

/* ------------------------------------------------------------------ *
 * Small UI utilities
 * ------------------------------------------------------------------ */

/** Renders a modal and resolves with the caller's result, or null on cancel. */
export function modal(renderBody, { onMount } = {}) {
  return new Promise((resolveModal) => {
    const overlay = document.createElement("div");
    overlay.className = "overlay";
    overlay.innerHTML = `<div class="modal" role="dialog" aria-modal="true">${renderBody()}</div>`;

    const close = (result) => {
      document.removeEventListener("keydown", onKey);
      overlay.remove();
      resolveModal(result);
    };
    const onKey = (e) => { if (e.key === "Escape") close(null); };

    overlay.addEventListener("mousedown", (e) => { if (e.target === overlay) close(null); });
    document.addEventListener("keydown", onKey);
    document.body.appendChild(overlay);

    const first = overlay.querySelector("input, textarea, select, button");
    if (first) first.focus();
    if (onMount) onMount(overlay, close);
  });
}

/** Confirmation dialog. Resolves true when the user confirms. */
export function confirmDialog({ title, message, confirmLabel = "Confirm", danger = false }) {
  return modal(
    () => html`
      <div class="modal-head">
        <h2 class="h2">${title}</h2>
        ${message ? html`<p class="sub">${message}</p>` : ""}
      </div>
      <div class="modal-foot">
        <button class="btn" data-act="cancel">Cancel</button>
        <button class="btn ${danger ? "btn--danger" : "btn--primary"} push" data-act="ok">${confirmLabel}</button>
      </div>`,
    {
      onMount(overlay, close) {
        on(overlay, "click", "[data-act]", (_e, el) => close(el.dataset.act === "ok"));
      },
    },
  ).then(Boolean);
}

/** Wraps an async action with a busy state on the triggering button. */
export async function withBusy(button, fn) {
  if (!button) return fn();
  const original = button.innerHTML;
  button.disabled = true;
  button.innerHTML = `<span class="spinner${button.classList.contains("btn--primary") ? "" : " spinner--ink"}"></span>${original}`;
  try {
    return await fn();
  } finally {
    button.disabled = false;
    button.innerHTML = original;
  }
}
