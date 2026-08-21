/** Screen 01 — Login. */

import { html, raw, api, state, navigate, on, reportError, withBusy, $ } from "../core.js";

export function renderLogin(root) {
  root.innerHTML = html`
    <div class="login-page">
      <form class="login-card" id="login-form" novalidate>
        <div class="login-mark">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round">
            <path d="M12 3v18M4 8h16M7 14h10"></path>
          </svg>
        </div>
        <h1 style="margin:0;font-family:var(--font-display);font-size:30px;font-weight:500;letter-spacing:-.4px">
          PI Planning Assistant
        </h1>
        <p style="margin:8px 0 26px;font-size:13.5px;color:var(--muted)">Prepare your backlog before PI Planning.</p>

        <div class="stack gap-16">
          <label class="field">
            <span class="field-label">Work email</span>
            <input class="input" type="email" name="email" autocomplete="username"
                   value="lea.moore@commerce-group.com" required>
          </label>
          <label class="field">
            <span class="field-label">Password</span>
            <input class="input" type="password" name="password" autocomplete="current-password"
                   value="piplanning" required>
          </label>

          <p id="login-error" class="hidden" role="alert"
             style="margin:0;font-size:12.5px;color:var(--danger-ink);background:var(--danger-tint);padding:9px 12px;border-radius:10px"></p>

          <button class="btn btn--primary" style="height:44px" type="submit">Sign in</button>

          <div class="divider"><i></i><span>or</span><i></i></div>

          <button class="btn" style="height:44px" type="button" data-act="sso">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#64748B" stroke-width="1.9">
              <rect x="3" y="11" width="18" height="10" rx="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>Enterprise SSO
          </button>
        </div>

        <div style="text-align:center;margin-top:22px">
          <a href="#/login" style="font-size:12px;color:var(--muted);text-decoration:none" data-act="forgot">
            Forgot your password?
          </a>
        </div>

        <details style="margin-top:22px">
          <summary style="font-size:11.5px;color:var(--muted-2);cursor:pointer">Demo accounts</summary>
          <div class="stack gap-4" style="margin-top:10px;font-size:11.5px;color:var(--muted)">
            ${DEMO_ACCOUNTS.map((a) => html`
              <button type="button" class="list-item" data-fill="${a.email}" style="padding:6px 8px;font-size:11.5px">
                <span class="grow">${a.email}</span><span class="meta-2">${a.role}</span>
              </button>`)}
            <span class="meta-2">Password for all: <code>piplanning</code></span>
          </div>
        </details>
      </form>
    </div>`;

  const form = $("#login-form", root);
  const error = $("#login-error", root);

  on(root, "click", "[data-fill]", (_e, el) => {
    form.elements.email.value = el.dataset.fill;
    form.elements.password.value = "piplanning";
  });

  on(root, "click", '[data-act="sso"]', () => {
    error.textContent = "Enterprise SSO is not configured in this build. Use an email and password.";
    error.classList.remove("hidden");
  });

  on(root, "click", '[data-act="forgot"]', (e) => {
    e.preventDefault();
    error.textContent = "Password recovery is handled by your administrator in this build.";
    error.classList.remove("hidden");
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    error.classList.add("hidden");
    const email = form.elements.email.value.trim();
    const password = form.elements.password.value;

    if (!email || !password) {
      error.textContent = "Enter your email address and password.";
      error.classList.remove("hidden");
      return;
    }

    try {
      await withBusy(form.querySelector('button[type="submit"]'), async () => {
        const { user } = await api.post("/auth/login", { email, password }, { allowAnonymous: true });
        state.user = user;
      });
      navigate("/");
    } catch (err) {
      if (err.status === 401) {
        error.textContent = "That email and password combination is not recognised.";
        error.classList.remove("hidden");
      } else if (err.status === 403) {
        error.textContent = "This account has been deactivated. Contact your administrator.";
        error.classList.remove("hidden");
      } else {
        reportError(err, "Could not sign in.");
      }
    }
  });
}

const DEMO_ACCOUNTS = [
  { email: "lea.moore@commerce-group.com", role: "Product Owner" },
  { email: "adam.mercer@commerce-group.com", role: "Business Analyst" },
  { email: "tom.barnes@commerce-group.com", role: "Scrum Master · read only" },
  { email: "karim.benali@commerce-group.com", role: "Administrator" },
];
