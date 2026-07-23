(() => {
  const SCRIPT_VERSION = "2026-07-23.1";
  const sameOriginPath = (path) => new URL(path, window.location.origin).toString();
  const SESSION_URL = sameOriginPath("/api/auth/suite-session");
  const AUTH_LOGOUT_URL = "https://opsslate-auth.vercel.app/api/auth/logout";
  const LOGIN_URL = sameOriginPath("/login");
  const SIGNUP_URL = sameOriginPath("/signup");
  const PRICING_URL = sameOriginPath("/pricing");

  const apps = [
    {
      key: "project-management",
      configKey: "projectManagement",
      short: "PM",
      label: "Project Management",
      appHref: sameOriginPath("/"),
      salesHref: sameOriginPath("/project-management"),
      ready: true,
    },
    {
      key: "estimating",
      configKey: "estimating",
      short: "Bid",
      label: "Estimating",
      appHref: sameOriginPath("/estimating"),
      salesHref: sameOriginPath("/estimating"),
      ready: true,
    },
    {
      key: "helios",
      configKey: "helios",
      short: "AI",
      label: "Helios",
      appHref: sameOriginPath("/helios"),
      salesHref: sameOriginPath("/helios"),
      ready: false,
    },
    {
      key: "scheduler",
      configKey: "scheduler",
      short: "Plan",
      label: "Scheduler",
      appHref: sameOriginPath("/scheduler"),
      salesHref: sameOriginPath("/scheduler"),
      ready: true,
    },
    {
      key: "books",
      configKey: "books",
      short: "Books",
      label: "Books",
      appHref: sameOriginPath("/books"),
      salesHref: sameOriginPath("/books"),
      ready: true,
    },
    {
      key: "takeoff",
      configKey: "takeoff",
      short: "Qty",
      label: "Takeoff",
      appHref: sameOriginPath("/takeoff"),
      salesHref: sameOriginPath("/takeoff"),
      ready: true,
    },
    {
      key: "cad",
      configKey: "cad",
      short: "CAD",
      label: "CAD",
      appHref: sameOriginPath("/cad"),
      salesHref: sameOriginPath("/cad"),
      ready: false,
    },
    {
      key: "crm",
      configKey: "crm",
      short: "CRM",
      label: "CRM",
      appHref: sameOriginPath("/crm"),
      salesHref: sameOriginPath("/crm"),
      ready: false,
    },
  ];

  const css = `
    :host {
      display: block;
      min-height: 72px;
      color-scheme: dark;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }

    * {
      box-sizing: border-box;
    }

    .suite-toolbar {
      position: sticky;
      top: 0;
      z-index: 2147483000;
      width: 100%;
      min-height: 72px;
      border-bottom: 1px solid rgba(148, 163, 184, 0.12);
      background:
        radial-gradient(circle at 24% 0%, rgba(249, 115, 22, 0.08), transparent 36%),
        rgba(5, 10, 17, 0.96);
      padding: 8px 10px;
      backdrop-filter: blur(18px);
      box-shadow: 0 14px 42px rgba(0, 0, 0, 0.28);
    }

    .suite-frame {
      display: flex;
      min-height: 56px;
      width: 100%;
      align-items: center;
      gap: 10px;
      border: 1px solid rgba(255, 255, 255, 0.10);
      border-radius: 18px;
      background: rgba(6, 11, 18, 0.92);
      padding: 8px 10px;
      box-shadow: 0 18px 55px rgba(0, 0, 0, 0.28);
    }

    a,
    button {
      font: inherit;
    }

    a {
      text-decoration: none;
    }

    .brand {
      display: inline-flex;
      flex: 0 0 auto;
      align-items: center;
      gap: 8px;
      border-radius: 12px;
      padding: 6px 8px;
      color: #fff;
      white-space: nowrap;
    }

    .brand:hover {
      background: rgba(255, 255, 255, 0.04);
    }

    .mark {
      display: grid;
      width: 32px;
      height: 32px;
      place-items: center;
      border: 1px solid rgba(249, 115, 22, 0.36);
      border-radius: 9px;
      background: rgba(249, 115, 22, 0.12);
      color: #fed7aa;
      font-size: 11px;
      font-weight: 900;
      box-shadow: 0 0 24px rgba(249, 115, 22, 0.16);
    }

    .name {
      font-size: 14px;
      font-weight: 900;
      letter-spacing: -0.02em;
    }

    .suite-badge {
      border: 1px solid rgba(190, 242, 100, 0.24);
      border-radius: 7px;
      background: rgba(190, 242, 100, 0.10);
      padding: 2px 7px;
      color: #d9f99d;
      font-size: 10px;
      font-weight: 900;
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }

    .products {
      display: flex;
      min-width: 0;
      flex: 1 1 auto;
      gap: 5px;
      overflow-x: auto;
      scrollbar-width: thin;
    }

    .link {
      display: inline-flex;
      flex: 0 0 auto;
      align-items: center;
      gap: 7px;
      border: 1px solid transparent;
      border-radius: 11px;
      padding: 9px 12px;
      color: rgba(226, 232, 240, 0.62);
      font-size: 12px;
      font-weight: 800;
      transition: 0.16s ease;
      white-space: nowrap;
    }

    .link small {
      color: #bef264;
      font-size: 10px;
      font-weight: 900;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .link[href]:hover {
      border-color: rgba(255, 255, 255, 0.10);
      background: rgba(255, 255, 255, 0.045);
      color: #fff;
    }

    .active {
      border-color: rgba(251, 146, 60, 0.38);
      background: rgba(249, 115, 22, 0.18);
      color: #ffedd5;
      box-shadow: 0 10px 28px rgba(249, 115, 22, 0.14);
    }

    .disabled {
      cursor: not-allowed;
      border-color: rgba(255, 255, 255, 0.08);
      background: rgba(255, 255, 255, 0.025);
      color: rgba(255, 255, 255, 0.30);
    }

    .pill {
      margin-left: 2px;
      border-radius: 5px;
      background: rgba(255, 255, 255, 0.08);
      padding: 1px 5px;
      color: rgba(255, 255, 255, 0.42);
      font-size: 9px;
      letter-spacing: 0.10em;
      text-transform: uppercase;
    }

    .actions {
      display: flex;
      flex: 0 0 auto;
      align-items: center;
      gap: 8px;
      padding-left: 8px;
    }

    .action {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 36px;
      border-radius: 11px;
      border: 1px solid rgba(255, 255, 255, 0.10);
      background: transparent;
      padding: 8px 13px;
      color: rgba(255, 255, 255, 0.82);
      font-size: 12px;
      font-weight: 900;
      cursor: pointer;
      transition: 0.16s ease;
      white-space: nowrap;
    }

    .action:hover {
      border-color: rgba(251, 146, 60, 0.35);
      background: rgba(255, 255, 255, 0.045);
      color: #fff;
    }

    .primary {
      border-color: rgba(249, 115, 22, 0.42);
      background: #ea580c;
      color: #fff;
    }

    .primary:hover {
      background: #f97316;
    }

    @media (max-width: 760px) {
      .suite-toolbar {
        padding: 6px;
      }

      .suite-frame {
        border-radius: 14px;
        padding: 7px;
      }

      .name,
      .suite-badge,
      .actions .pricing {
        display: none;
      }

      .link {
        padding: 8px 10px;
      }
    }
  `;

  function hasSuiteCookie() {
    const cookie = document.cookie || "";
    return (cookie.includes("opsslate_token=") || cookie.includes("opsslate_convex_token=")) && !cookie.includes("opsslate_logged_out=1");
  }

  function inferActive() {
    const host = window.location.hostname.replace(/^www\./, "");
    const path = window.location.pathname;

    if (host === "estimating.opsslate.app" || path.startsWith("/estimating")) return "estimating";
    if (host === "helios.opsslate.app" || path.startsWith("/helios")) return "helios";
    if (host === "scheduler.opsslate.app" || path.startsWith("/scheduler")) return "scheduler";
    if (host === "books.opsslate.app" || path.startsWith("/books")) return "books";
    if (host === "takeoff.opsslate.app" || path.startsWith("/takeoff")) return "takeoff";
    if (path.startsWith("/cad")) return "cad";
    if (path.startsWith("/crm")) return "crm";
    return "project-management";
  }

  function clearCookie(name, domain) {
    document.cookie = `${name}=; path=/; max-age=0; secure; samesite=lax${domain ? `; domain=${domain}` : ""}`;
  }

  function clearLocalAuth() {
    [
      "opsslate_token",
      "opsslate_convex_token",
      "opsslate_user",
      "opsslate_logged_out",
      "authToken",
      "sessionToken",
      "token",
    ].forEach((key) => {
      try {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      } catch {
      }
    });

    ["opsslate_token", "opsslate_convex_token"].forEach((name) => {
      clearCookie(name);
      clearCookie(name, ".opsslate.app");
    });

    document.cookie = "opsslate_logged_out=1; path=/; domain=.opsslate.app; max-age=2592000; secure; samesite=lax";
  }

  class OpsSlateSuiteToolbar extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: "open" });
      this.loggedIn = this.getAttribute("is-logged-in") === "true" || hasSuiteCookie();
      this.active = this.getAttribute("active") || inferActive();
    }

    static get observedAttributes() {
      return ["active", "is-logged-in", "show-actions", "app-hrefs"];
    }

    connectedCallback() {
      this.active = this.getAttribute("active") || inferActive();
      this.render();
      this.refreshSession();
    }

    attributeChangedCallback() {
      if (this.isConnected) {
        this.active = this.getAttribute("active") || inferActive();
        this.loggedIn = this.getAttribute("is-logged-in") === "true" || this.loggedIn;
        this.render();
      }
    }

    async refreshSession() {
      try {
        const res = await fetch(SESSION_URL, {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = await res.json();
        this.loggedIn = Boolean(data.loggedIn);
        this.render();
      } catch {
        this.loggedIn = hasSuiteCookie();
        this.render();
      }
    }

    async logout() {
      const logoutEvent = new CustomEvent("opsslate:logout", {
        bubbles: true,
        cancelable: true,
        composed: true,
      });
      if (!this.dispatchEvent(logoutEvent)) return;

      let sharedToken = "";
      try {
        sharedToken = localStorage.getItem("opsslate_token") || "";
      } catch {
      }

      if (sharedToken) {
        fetch(AUTH_LOGOUT_URL, {
          method: "POST",
          headers: { Authorization: `Bearer ${sharedToken}` },
        }).catch(() => {});
      }

      fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      }).catch(() => {});

      clearLocalAuth();
      try {
        await fetch(SESSION_URL, {
          method: "DELETE",
          credentials: "include",
        });
      } catch {
      }
      window.location.assign(LOGIN_URL);
    }

    renderLink(app) {
      const active = app.key === this.active;
      let overrides = {};
      try {
        overrides = JSON.parse(this.getAttribute("app-hrefs") || "{}");
      } catch {
      }
      const overrideHref = overrides[app.configKey || app.key];
      const enabled = app.ready || Boolean(overrideHref);
      const href = this.loggedIn ? (overrideHref || app.appHref) : app.salesHref;
      const content = `<small>${app.short}</small><span>${app.label}</span>${enabled ? "" : '<span class="pill">Soon</span>'}`;

      if (active) return `<span class="link active">${content}</span>`;
      if (!enabled) return `<span class="link disabled" title="${app.label} is not available yet.">${content}</span>`;
      return `<a class="link" href="${href}">${content}</a>`;
    }

    renderActions() {
      if (this.getAttribute("show-actions") === "false") return "";
      if (this.loggedIn) {
        return `
          <a class="action pricing" href="${PRICING_URL}">Pricing</a>
          <button class="action primary" type="button" data-logout>Log out</button>
        `;
      }

      return `
        <a class="action pricing" href="${PRICING_URL}">Pricing</a>
        <a class="action" href="${LOGIN_URL}">Sign In</a>
        <a class="action primary" href="${SIGNUP_URL}">Start Free</a>
      `;
    }

    render() {
      this.shadowRoot.innerHTML = `
        <style>${css}</style>
        <header class="suite-toolbar" data-version="${SCRIPT_VERSION}">
          <div class="suite-frame">
            <a href="${this.loggedIn ? sameOriginPath("/") : sameOriginPath("/project-management")}" class="brand" aria-label="OpsSlate home">
              <span class="mark">OS</span>
              <span class="name">OpsSlate</span>
              <span class="suite-badge">Suite</span>
            </a>
            <nav class="products" aria-label="OpsSlate suite apps">
              ${apps.map((app) => this.renderLink(app)).join("")}
            </nav>
            <div class="actions">
              ${this.renderActions()}
            </div>
          </div>
        </header>
      `;

      const logout = this.shadowRoot.querySelector("[data-logout]");
      if (logout) logout.addEventListener("click", () => this.logout());
    }
  }

  if (!customElements.get("opsslate-suite-toolbar")) {
    customElements.define("opsslate-suite-toolbar", OpsSlateSuiteToolbar);
  }
})();

export {};
