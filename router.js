const cache = {};

window.router = {
  go: async (page) => {
    const app = document.getElementById("app");

    if(cache[page]){
      app.innerHTML = cache[page];
      window.dispatchEvent(new Event("viewChanged"));
      return;
    }

    try {
      const res = await fetch(page + ".html");
      const html = await res.text();

      cache[page] = html;
      app.innerHTML = html;

      window.dispatchEvent(new Event("viewChanged"));

    } catch (e) {
      app.innerHTML = "<h2>Page load error</h2>";
    }
  }
};

window.addEventListener("DOMContentLoaded", () => {
  router.go("dashboard");
});
window.addEventListener("DOMContentLoaded", () => {
  router.navigate("auth");
});  function normalizeRoute(route) {
    return String(route || "").trim().replace(/^#/, "").toLowerCase() || "dashboard";
  }

  function guardRoute(route) {
    if (!session.authenticated && route !== "auth") return "auth";
    if (!VIEW_MAP[route]) return "dashboard";
    return route;
  }

  function extractFragment(text) {
    const doc = new DOMParser().parseFromString(text, "text/html");
    return doc.body ? doc.body.innerHTML : text;
  }

  function rehydrateScripts(root) {
    const scripts = [...root.querySelectorAll("script")];
    for (const oldScript of scripts) {
      const newScript = document.createElement("script");
      for (const attr of oldScript.attributes) newScript.setAttribute(attr.name, attr.value);
      newScript.textContent = oldScript.textContent;
      oldScript.replaceWith(newScript);
    }
  }

  function highlightNav(route) {
    document.querySelectorAll("[data-route]").forEach((el) => {
      const target = el.dataset.route;
      const active = target === route || (route === "settings" && target === "profile");
      el.classList.toggle("is-active", active);
      if (active) el.setAttribute("aria-current", "page");
      else el.removeAttribute("aria-current");
    });
  }

  async function mountRoute(route) {
    const file = VIEW_MAP[route] || VIEW_MAP.dashboard;
    const canvas = document.getElementById("app-canvas");
    if (!canvas) return;

    let html = cache[file];

    if (!html) {
      if (loading[file]) {
        html = await loading[file];
      } else {
        loading[file] = fetch(file, { cache: "no-store" })
          .then(async (res) => {
            if (!res.ok) throw new Error(`Failed to fetch ${file}`);
            const text = await res.text();
            const fragment = extractFragment(text);
            cache[file] = fragment;
            return fragment;
          })
          .finally(() => {
            delete loading[file];
          });
        html = await loading[file];
      }
    }

    canvas.innerHTML = html;
    rehydrateScripts(canvas);
    appState.activeView = route;
    window.dispatchEvent(new CustomEvent("hpos:view-mounted", { detail: { route } }));
  }

  async function prefetchViews() {
    const routes = ["auth", "dashboard", "workout", "chatbot", "settings"];
    await Promise.all(
      routes.map(async (route) => {
        const file = VIEW_MAP[route];
        if (cache[file]) return;
        try {
          const res = await fetch(file, { cache: "no-store" });
          if (!res.ok) return;
          cache[file] = extractFragment(await res.text());
        } catch {
          // no-op
        }
      })
    );
  }

  function bindGlobalNavigation() {
    if (window.__hposNavBound) return;
    window.__hposNavBound = true;

    document.addEventListener("click", async (event) => {
      const routeEl = event.target.closest("[data-route]");
      const actionEl = event.target.closest("[data-action]");

      if (actionEl && actionEl.dataset.action === "toggle-theme") {
        event.preventDefault();
        router.toggleTheme();
        return;
      }

      if (!routeEl) return;

      event.preventDefault();
      const route = routeEl.dataset.route;
      if (!route) return;
      await router.navigate(route);
    });
  }

  function bindPopState() {
    if (window.__hposPopBound) return;
    window.__hposPopBound = true;

    window.addEventListener("popstate", async (event) => {
      const route = guardRoute(normalizeRoute(event.state?.route || location.hash));
      await mountRoute(route);
      highlightNav(route);
    });
  }

  const router = (window.router = window.router || {
    cache,

    async init() {
      await window.db.ready;

      const profile = await window.db.get("userProfiles", "current");
      session.authenticated = !!profile;
      session.profile = profile || null;
      if (profile) appState.activeGoal = profile.NutritionGoal || profile.goal || "";

      const savedTheme = localStorage.getItem("hpos_theme") || session.theme || "dark";
      this.setTheme(savedTheme);

      bindGlobalNavigation();
      bindPopState();

      const startRoute = profile ? "dashboard" : "auth";
      await this.navigate(startRoute, { replace: true, skipHistory: true });
      prefetchViews().catch(() => {});
    },

    async navigate(route, opts = {}) {
      const normalized = normalizeRoute(route);
      const guarded = guardRoute(normalized);

      if (!opts.skipHistory) {
        if (opts.replace) history.replaceState({ route: guarded }, "", `#${guarded}`);
        else history.pushState({ route: guarded }, "", `#${guarded}`);
      } else if (opts.replace) {
        history.replaceState({ route: guarded }, "", `#${guarded}`);
      }

      session.lastRoute = guarded;
      appState.activeView = guarded;
      await mountRoute(guarded);
      highlightNav(guarded);
      saveSession();
      return guarded;
    },

    setTheme(theme) {
      const next = theme === "light" ? "light" : "dark";
      session.theme = next;
      document.documentElement.setAttribute("data-theme", next);
      localStorage.setItem("hpos_theme", next);
      saveSession();
      return next;
    },

    toggleTheme() {
      return this.setTheme(session.theme === "dark" ? "light" : "dark");
    },

    refreshSession(profile) {
      session.profile = profile || null;
      session.authenticated = !!profile;
      if (profile) appState.activeGoal = profile.NutritionGoal || profile.goal || "";
      saveSession();
    },
  });

  window.saveUserSession = saveSession;

  window.addEventListener("storage", (event) => {
    if (event.key === "hpos_theme") router.setTheme(event.newValue || "dark");
  });

  document.addEventListener("DOMContentLoaded", async () => {
    await router.init();
  });
})();    chat: {
      history: [],
      messages: [],
    },
  };

  const globalState = (window.userSession = window.userSession || loadSession());
  const routerState = (window.routerState = window.routerState || {
    cache: Object.create(null),
    loading: Object.create(null),
    currentRoute: null,
    lastHtml: "",
  });

  window.appState = globalState;

  const router = (window.router = {
    cache: routerState.cache,
    state: routerState,

    async init() {
      syncThemeFromSession();
      bindGlobalNavigation();
      bindPopState();

      const initialRoute = resolveInitialRoute();
      await this.navigate(initialRoute, { replace: true, skipHistory: true });

      prefetchKnownViews().catch(() => {});
    },

    async navigate(route, options = {}) {
      const normalized = normalizeRoute(route);
      const targetRoute = guardRoute(normalized);

      if (options.replace) {
        history.replaceState({ route: targetRoute }, "", `#${targetRoute}`);
      } else if (!options.skipHistory) {
        history.pushState({ route: targetRoute }, "", `#${targetRoute}`);
      }

      routerState.currentRoute = targetRoute;
      highlightActiveNav(targetRoute);

      await loadIntoCanvas(targetRoute);
      return targetRoute;
    },

    setTheme(theme) {
      const next = theme === "dark" ? "dark" : "light";
      globalState.theme = next;
      document.documentElement.setAttribute("data-theme", next);
      localStorage.setItem(THEME_KEY, next);
      saveSession();
      return next;
    },

    toggleTheme() {
      return this.setTheme(globalState.theme === "dark" ? "light" : "dark");
    },
  });

  function loadSession() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return clone(fallbackSession);
      const parsed = JSON.parse(raw);
      return deepMerge(clone(fallbackSession), parsed);
    } catch {
      return clone(fallbackSession);
    }
  }

  function saveSession() {
    localStorage.setItem(SESSION_KEY, JSON.stringify(globalState));
    localStorage.setItem(THEME_KEY, globalState.theme || "light");
  }

  function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function deepMerge(base, patch) {
    if (!patch || typeof patch !== "object") return base;
    for (const key of Object.keys(patch)) {
      const value = patch[key];
      if (value && typeof value === "object" && !Array.isArray(value)) {
        base[key] = deepMerge(base[key] || {}, value);
      } else {
        base[key] = value;
      }
    }
    return base;
  }

  function normalizeRoute(route) {
    const r = String(route || "").trim().replace(/^#/, "").toLowerCase();
    if (!r) return "dashboard";
    return r;
  }

  function guardRoute(route) {
    if (!VIEW_MAP[route]) return "dashboard";
    if (!globalState.authenticated && route !== "auth") return "auth";
    return route;
  }

  function resolveInitialRoute() {
    const hashRoute = normalizeRoute(location.hash);
    if (hashRoute && VIEW_MAP[hashRoute]) return guardRoute(hashRoute);
    return globalState.authenticated ? "dashboard" : "auth";
  }

  function syncThemeFromSession() {
    const theme = localStorage.getItem(THEME_KEY) || globalState.theme || "light";
    globalState.theme = theme === "dark" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", globalState.theme);
    saveSession();
  }

  function bindGlobalNavigation() {
    document.addEventListener("click", async (event) => {
      const navTarget = event.target.closest("[data-route]");
      const actionTarget = event.target.closest("[data-action]");

      if (actionTarget && actionTarget.dataset.action === "toggle-theme") {
        event.preventDefault();
        router.toggleTheme();
        return;
      }

      if (!navTarget) return;

      const route = navTarget.dataset.route;
      if (!route) return;

      event.preventDefault();
      await router.navigate(route);
    });
  }

  function bindPopState() {
    window.addEventListener("popstate", async () => {
      const route = resolveInitialRoute();
      await router.navigate(route, { replace: true, skipHistory: true });
    });
  }

  async function loadIntoCanvas(route) {
    const canvas = document.getElementById("app-canvas");
    if (!canvas) return;

    const file = VIEW_MAP[route] || VIEW_MAP.dashboard;

    if (routerState.loading[file]) {
      await routerState.loading[file];
    }

    let html = routerState.cache[file];
    if (!html) {
      const request = fetch(file, { cache: "no-store" })
        .then(async (response) => {
          if (!response.ok) throw new Error(`Failed to load ${file}`);
          return response.text();
        })
        .then((text) => {
          const fragment = extractFragment(text);
          routerState.cache[file] = fragment;
          return fragment;
        });

      routerState.loading[file] = request;
      try {
        html = await request;
      } finally {
        delete routerState.loading[file];
      }
    }

    canvas.innerHTML = html;
    activateScripts(canvas);
    routerState.lastHtml = html;

    // Give each fragment a chance to rebind after insertion.
    window.dispatchEvent(new CustomEvent("athlon:view-mounted", { detail: { route } }));
  }

  function extractFragment(text) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, "text/html");
    if (doc.body && doc.body.children.length) return doc.body.innerHTML;
    return text;
  }

  function activateScripts(root) {
    const scripts = Array.from(root.querySelectorAll("script"));
    for (const oldScript of scripts) {
      const newScript = document.createElement("script");
      for (const attr of oldScript.attributes) newScript.setAttribute(attr.name, attr.value);
      newScript.textContent = oldScript.textContent;
      oldScript.replaceWith(newScript);
    }
  }

  function highlightActiveNav(route) {
    document.querySelectorAll("[data-route]").forEach((el) => {
      const target = el.dataset.route;
      const isActive =
        (route === "profile" && target === "profile") ||
        (route === "auth" && target === "profile") ||
        target === route;

      el.classList.toggle("is-active", !!isActive);
      el.setAttribute("aria-current", isActive ? "page" : "false");
    });
  }

  async function prefetchKnownViews() {
    const routes = ["auth", "dashboard", "workout", "chatbot"];
    await Promise.all(
      routes.map(async (route) => {
        const file = VIEW_MAP[route];
        if (routerState.cache[file]) return;
        try {
          const response = await fetch(file, { cache: "no-store" });
          if (!response.ok) return;
          const text = await response.text();
          routerState.cache[file] = extractFragment(text);
        } catch {
          // no-op
        }
      })
    );
  }

  window.addEventListener("storage", (event) => {
    if (event.key === SESSION_KEY) {
      try {
        const next = JSON.parse(event.newValue || "{}");
        Object.assign(globalState, deepMerge(clone(fallbackSession), next));
      } catch {}
    }
    if (event.key === THEME_KEY) {
      syncThemeFromSession();
    }
  });

  document.addEventListener("DOMContentLoaded", () => {
    if (!globalState.authenticated) {
      router.navigate("auth", { replace: true, skipHistory: true });
    }
  });
})();
