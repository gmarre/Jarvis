/** Screen 13 — Administration: users, AI configuration, audit log. */

import {
  html, raw, api, state, on, toast, reportError, withBusy,
  confirmDialog, modal, fmtAgo, fmtTime, fmtDate,
} from "../core.js";
import { layout } from "../shell.js";

let adminTab = "users";

export async function renderAdmin(root) {
  if (state.user.role !== "Administrator") {
    root.innerHTML = layout({
      screen: "Administration", active: "", level: "train",
      body: html`<main class="screen"><div class="empty">
        <h2 class="h2" style="margin-bottom:8px">Administrator access required</h2>
        <p class="meta">You are signed in as ${state.user.role}. Ask an administrator for access.</p>
      </div></main>`,
    });
    return;
  }

  const [users, aiConfig, audit] = await Promise.all([
    api.get("/admin/users"),
    api.get("/admin/ai/config"),
    api.get("/admin/audit?limit=40"),
  ]);

  const body = html`
    <main class="screen">
      <div class="row-flex end gap-12 mb-20">
        <h1 class="h1">Administration</h1>
        <span class="segmented">
          ${[["users", "Users"], ["ai", "AI configuration"], ["audit", "Audit"]].map(([k, label]) => html`
            <button class="${adminTab === k ? "is-active" : ""}" data-tab="${k}">${label}</button>`)}
        </span>
        ${adminTab === "users" ? html`<button class="btn btn--primary push" data-act="invite">Invite a user</button>` : ""}
      </div>

      ${adminTab === "users" ? raw(usersPanel(users)) : ""}
      ${adminTab === "ai" ? raw(aiPanel(aiConfig)) : ""}
      ${adminTab === "audit" ? raw(auditPanel(audit.entries)) : ""}
    </main>`;

  root.innerHTML = layout({ screen: "Administration", active: "", level: "train", body });

  const rerender = () => renderAdmin(root);

  on(root, "click", "[data-tab]", (_e, el) => { adminTab = el.dataset.tab; rerender(); });

  /* ---- users ---- */

  on(root, "click", '[data-act="invite"]', async () => {
    const created = await userDialog(null, users.roles);
    if (created) { toast("User invited.", "ok"); rerender(); }
  });

  on(root, "change", "[data-role]", async (_e, el) => {
    try {
      await api.patch(`/admin/users/${el.dataset.role}`, { role: el.value });
      toast("Role updated.", "ok");
      rerender();
    } catch (err) {
      if (err.code === "last_administrator") toast("There must always be one active administrator.", "error");
      else reportError(err);
      rerender();
    }
  });

  on(root, "click", '[data-act="toggle-user"]', async (_e, el) => {
    const deactivating = el.dataset.status === "active";
    if (deactivating && !await confirmDialog({
      title: `Deactivate ${el.dataset.name}?`,
      message: "Their sessions end immediately and they can no longer sign in.",
      confirmLabel: "Deactivate", danger: true,
    })) return;
    try {
      await api.patch(`/admin/users/${el.dataset.id}`, { status: deactivating ? "deactivated" : "active" });
      toast(deactivating ? "Account deactivated." : "Account reactivated.", "ok");
      rerender();
    } catch (err) {
      if (err.code === "last_administrator") toast("There must always be one active administrator.", "error");
      else reportError(err);
    }
  });

  on(root, "click", '[data-act="reset-password"]', async (_e, el) => {
    const result = await modal(
      () => html`
        <div class="modal-head"><h2 class="h2">Reset password</h2>
          <p class="sub">${el.dataset.name} will be signed out of every session.</p></div>
        <form class="modal-body" id="pw-form">
          <label class="field"><span class="field-label">New password (8 characters minimum)</span>
            <input class="input" type="text" name="password" minlength="8" required></label>
        </form>
        <div class="modal-foot">
          <button class="btn" data-act="cancel">Cancel</button>
          <button class="btn btn--primary push" data-act="save">Reset</button>
        </div>`,
      {
        onMount(overlay, close) {
          on(overlay, "click", '[data-act="cancel"]', () => close(null));
          on(overlay, "click", '[data-act="save"]', async (_e2, btn) => {
            const pw = overlay.querySelector("#pw-form").elements.password.value;
            if (pw.length < 8) { toast("Use at least 8 characters.", "error"); return; }
            try {
              await withBusy(btn, () => api.post(`/admin/users/${el.dataset.id}/password`, { password: pw }));
              close(true);
            } catch (err) { reportError(err); }
          });
        },
      },
    );
    if (result) toast("Password reset.", "ok");
  });

  /* ---- AI ---- */

  const aiForm = root.querySelector("#ai-form");
  if (aiForm) {
    aiForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const f = e.target;
      const payload = {
        provider: f.elements.provider.value,
        model: f.elements.model.value.trim(),
        minConfidence: Number(f.elements.minConfidence.value) / 100,
      };
      // Only send the key when the field was actually touched.
      if (f.elements.apiKey.value.trim()) payload.apiKey = f.elements.apiKey.value.trim();
      try {
        const res = await withBusy(f.querySelector('button[type="submit"]'), () => api.put("/admin/ai/config", payload));
        state.ai = { configured: res.configured, engine: res.engine };
        toast(res.configured ? "Claude is configured." : "Saved — the local engine is in use.", "ok");
        rerender();
      } catch (err) { reportError(err); }
    });
  }

  on(root, "click", '[data-act="clear-key"]', async (_e, btn) => {
    if (!await confirmDialog({
      title: "Clear the stored API key?",
      message: "Generation falls back to the local engine unless ANTHROPIC_API_KEY is set in the environment.",
      confirmLabel: "Clear key", danger: true,
    })) return;
    try {
      const res = await withBusy(btn, () => api.put("/admin/ai/config", { apiKey: "" }));
      state.ai = { configured: res.configured, engine: res.engine };
      toast("API key cleared.", "ok");
      rerender();
    } catch (err) { reportError(err); }
  });

  const slider = root.querySelector("[data-confidence]");
  if (slider) {
    slider.addEventListener("input", () => {
      root.querySelector("[data-confidence-out]").textContent = `${slider.value} %`;
    });
  }
}

/* ------------------------------------------------------------------ *
 * Panels
 * ------------------------------------------------------------------ */

function usersPanel({ users, roles }) {
  return `<div class="card card--flush">
    <div class="row-head" style="grid-template-columns:2.2fr 1.4fr 1.2fr 1fr 200px">
      <div>User</div><div>Role</div><div>Last access</div><div>Status</div><div style="text-align:right">Actions</div>
    </div>
    ${users.map((u) => `
      <div class="row" style="grid-template-columns:2.2fr 1.4fr 1.2fr 1fr 200px">
        <div class="row-flex gap-10">
          <span class="avatar avatar--xs ${u.readOnly ? "is-readonly" : ""}">${esc(u.initials)}</span>
          <span>
            <span style="display:block;font-weight:600">${esc(u.name)}</span>
            <span class="meta-2">${esc(u.email)}</span>
          </span>
        </div>
        <div>
          <select class="select input--sm" data-role="${u.id}" ${u.status === "deactivated" ? "disabled" : ""}>
            ${roles.map((r) => `<option value="${esc(r)}" ${r === u.role ? "selected" : ""}>${esc(r)}</option>`).join("")}
          </select>
          ${u.readOnly ? '<div class="meta-2" style="margin-top:3px">read only</div>' : ""}
        </div>
        <div class="meta">${esc(fmtAgo(u.lastAccessAt))}</div>
        <div>${u.status === "active"
          ? '<span class="pill pill--ok"><span class="pill-dot"></span>Active</span>'
          : '<span class="pill pill--grey"><span class="pill-dot"></span>Deactivated</span>'}</div>
        <div class="row-flex gap-6" style="justify-content:flex-end">
          <button class="btn btn--sm" data-act="reset-password" data-id="${u.id}" data-name="${esc(u.name)}">Password</button>
          <button class="btn btn--sm ${u.status === "active" ? "btn--danger" : ""}"
                  data-act="toggle-user" data-id="${u.id}" data-status="${u.status}" data-name="${esc(u.name)}">
            ${u.status === "active" ? "Deactivate" : "Reactivate"}
          </button>
        </div>
      </div>`).join("")}
  </div>`;
}

function aiPanel(cfg) {
  const confidencePct = Math.round((cfg.minConfidence || 0.7) * 100);
  return `<div style="display:grid;grid-template-columns:1.2fr 1fr;gap:14px;align-items:start">
    <form class="card card--pad stack gap-16" id="ai-form">
      <div class="row-flex gap-10">
        <h3 class="h3">AI configuration</h3>
        <span class="push pill ${cfg.configured ? "pill--ok" : "pill--grey"}">
          <span class="pill-dot"></span>${cfg.configured ? "Claude active" : "Local engine"}
        </span>
      </div>

      <label class="field"><span class="field-label">Provider</span>
        <select class="select" name="provider">
          <option ${cfg.provider === "Anthropic" ? "selected" : ""}>Anthropic</option>
        </select></label>

      <label class="field"><span class="field-label">Model</span>
        <input class="input" name="model" value="${esc(cfg.model)}"></label>

      <label class="field">
        <span class="field-label">API key ${cfg.keySource ? `· currently from ${esc(cfg.keySource)}` : "· not set"}</span>
        <input class="input" name="apiKey" type="password" autocomplete="off"
               placeholder="${cfg.keyPreview ? esc(cfg.keyPreview) : "sk-ant-…"}">
        <span class="meta-2" style="display:block;margin-top:6px">
          Leave blank to keep the current key. Stored in the database, never returned to the browser.
        </span>
      </label>

      <label class="field">
        <span class="field-label">Minimum confidence · below this an item is flagged for review
          <b data-confidence-out>${confidencePct} %</b></span>
        <input type="range" min="0" max="100" step="5" value="${confidencePct}"
               name="minConfidence" data-confidence style="width:100%;accent-color:var(--primary)">
      </label>

      <div class="row-flex gap-10">
        <button class="btn btn--primary" type="submit">Save configuration</button>
        ${cfg.keySource === "settings" ? '<button class="btn btn--danger" type="button" data-act="clear-key">Clear key</button>' : ""}
      </div>
    </form>

    <div class="card card--pad stack gap-12">
      <h3 class="h3">How generation runs</h3>
      <p class="meta" style="line-height:1.7;margin:0">
        With a key configured, extraction and generation call <b>${esc(cfg.model)}</b> with structured JSON output
        and prompt caching. Without one — or if a request fails or is declined — the app falls back to a local
        heuristic engine so the pipeline still runs end to end.
      </p>
      <div class="stack gap-8" style="border-top:1px solid var(--border-soft);padding-top:12px">
        ${[["Requirement extraction", "Document text → normative requirements"],
           ["Epic and feature generation", "Requirements → capability areas → sprint-sized features"],
           ["Story generation", "Features → user stories with Given/When/Then criteria"],
           ["Task breakdown", "Stories → engineering tasks in hours"],
           ["Clustering", "Semantic grouping and duplicate detection"],
           ["Prioritisation", "WSJF scoring and MoSCoW suggestion"],
           ["Dependency detection", "Cross-project delivery dependencies"]]
          .map(([title, detail]) => `<div>
            <div style="font-size:12.5px;font-weight:600">${title}</div>
            <div class="meta-2">${detail}</div></div>`).join("")}
      </div>
    </div>
  </div>`;
}

function auditPanel(entries) {
  return `<div class="card card--flush">
    <div class="row-flex gap-10" style="padding:16px 18px 12px">
      <h3 class="h3">Audit log</h3>
      <span class="push meta-2">read only · append only</span>
    </div>
    ${entries.length ? entries.map((e) => `
      <div class="row" style="grid-template-columns:70px 1fr;padding:11px 18px">
        <div class="meta mono">${esc(fmtTime(e.created_at))}</div>
        <div>
          <span style="font-size:13px;color:var(--ink-2)">
            <b>${esc(e.actor_name || "System")}</b> ${esc(e.action)}
            ${e.entity_ref ? `<b>${esc(e.entity_ref)}</b>` : ""}
            ${e.entity_type && !e.entity_ref ? `<span class="meta">(${esc(e.entity_type)})</span>` : ""}
          </span>
          ${e.detail ? `<div class="meta-2" style="margin-top:2px">${esc(e.detail)}</div>` : ""}
          <div class="meta-2" style="margin-top:2px">${esc(fmtDate(e.created_at))}</div>
        </div>
      </div>`).join("") : '<div class="empty">Nothing recorded yet.</div>'}
  </div>`;
}

function esc(v) {
  return String(v == null ? "" : v)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

/* ------------------------------------------------------------------ *
 * Invite dialog
 * ------------------------------------------------------------------ */

async function userDialog(existing, roles) {
  return modal(
    () => html`
      <div class="modal-head"><h2 class="h2">Invite a user</h2>
        <p class="sub">They sign in with the password you set here.</p></div>
      <form class="modal-body stack gap-16" id="user-form">
        <label class="field"><span class="field-label">Full name</span>
          <input class="input" name="name" required></label>
        <label class="field"><span class="field-label">Work email</span>
          <input class="input" name="email" type="email" required></label>
        <label class="field"><span class="field-label">Role</span>
          <select class="select" name="role">
            ${roles.map((r) => html`<option value="${r}">${r}</option>`)}
          </select></label>
        <label class="field"><span class="field-label">Initial password (8 characters minimum)</span>
          <input class="input" name="password" type="text" minlength="8" required></label>
      </form>
      <div class="modal-foot">
        <button class="btn" data-act="cancel">Cancel</button>
        <button class="btn btn--primary push" data-act="save">Invite</button>
      </div>`,
    {
      onMount(overlay, close) {
        on(overlay, "click", '[data-act="cancel"]', () => close(null));
        on(overlay, "click", '[data-act="save"]', async (_e, btn) => {
          const f = overlay.querySelector("#user-form");
          const payload = {
            name: f.elements.name.value.trim(),
            email: f.elements.email.value.trim(),
            role: f.elements.role.value,
            password: f.elements.password.value,
          };
          if (!payload.name || !payload.email) { toast("Name and email are required.", "error"); return; }
          if (payload.password.length < 8) { toast("Use at least 8 characters.", "error"); return; }
          try {
            await withBusy(btn, () => api.post("/admin/users", payload));
            close(true);
          } catch (err) {
            if (err.code === "email_taken") toast("That email already has an account.", "error");
            else reportError(err);
          }
        });
      },
    },
  );
}
