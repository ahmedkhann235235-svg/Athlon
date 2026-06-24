/* router.js */
(() => {
  const VIEW_MAP = {
    auth: "auth.html",
    profile: "auth.html",
    dashboard: "dashboard.html",
    workout: "workout.html",
    chatbot: "chatbot.html",
  };

  const SESSION_KEY = "athlon_session_v2";
  const THEME_KEY = "athlon_theme_v2";

  const fallbackSession = {
    authenticated: false,
    profile: {
      name: "",
      gender: "male",
      age: 28,
      heightCm: 178,
      weightKg: 72,
      goal: "maintenance",
    },
    biometrics: {
      hrv: 62,
      rhr: 60,
    },
    rttScore: 0,
    dailyCalories: 0,
    activityMultiplier: 1.55,
    theme: "light",
    workout: {
      completedSets: {},
      stopwatchStartedAt: null,
      lastWorkoutZone: "yellow",
    },
    chat: {
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
