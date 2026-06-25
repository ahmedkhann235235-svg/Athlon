(() => {
  const FOOD_LIBRARY = [
    { id: "phulka-roti", name: "Phulka Roti", serving: "1 medium", calories: 80, protein: 3, carbs: 15, fats: 1 },
    { id: "white-rice", name: "Cooked White Rice", serving: "1 bowl / 150g", calories: 205, protein: 4.3, carbs: 45, fats: 0.4 },
    { id: "dal-tadka", name: "Cooked Dal Tadka", serving: "1 bowl", calories: 150, protein: 7, carbs: 20, fats: 4 },
    { id: "paneer-butter-masala", name: "Paneer Butter Masala", serving: "1 bowl", calories: 300, protein: 10, carbs: 10, fats: 22 },
    { id: "chicken-tikka", name: "Chicken Tikka", serving: "1 skewer / 100g", calories: 150, protein: 22, carbs: 2, fats: 5 },
    { id: "poha", name: "Vegetable Poha", serving: "1 cup", calories: 180, protein: 4, carbs: 35, fats: 3 },
    { id: "idli", name: "Idli", serving: "2 pieces", calories: 130, protein: 4, carbs: 27, fats: 0.4 },
    { id: "masala-dosa", name: "Masala Dosa", serving: "1 medium", calories: 387, protein: 7, carbs: 77, fats: 5.6 },
    { id: "boiled-egg", name: "Boiled Egg", serving: "1 whole", calories: 75, protein: 6, carbs: 0.6, fats: 5 },
    { id: "samosa", name: "Samosa", serving: "1 piece", calories: 150, protein: 5, carbs: 20, fats: 12 }
  ];

  const INTENT_RULES = [
    {
      intent: "injury",
      keywords: ["pain", "hurt", "knee", "back", "sore", "injury", "discomfort", "shoulder", "ache"],
    },
    {
      intent: "nutrition",
      keywords: ["cal", "diet", "food", "paneer", "roti", "curry", "carb", "protein", "rice", "dal", "calories", "meal"],
    },
    {
      intent: "plateau",
      keywords: ["stuck", "heavy", "cannot", "fail", "hard", "plateau", "deload", "weaker"],
    },
    {
      intent: "recovery",
      keywords: ["hello", "hi", "tired", "rest", "lazy", "sleep", "fatigue", "recovery", "drained"],
    },
    {
      intent: "workout",
      keywords: ["workout", "set", "rep", "exercise", "training", "lift", "program", "split"],
    },
    {
      intent: "app",
      keywords: ["login", "signup", "theme", "reset", "sync", "firebase", "settings", "profile", "save", "offline"],
    }
  ];

  const state = {
    route: "",
    user: null,
    profile: null,
    calorieLog: null,
    workoutLogs: [],
    chatMessages: [],
    theme: localStorage.getItem("hpos_theme") || "dark",
    controller: null,
    intervals: [],
    timeouts: [],
    profileSaveTimer: null,
    workout: {
      plan: null,
      activeIndex: 0,
      startedAt: Date.now()
    }
  };

  window.userSession = window.userSession || {};
  window.userSession.theme = state.theme;

  function now() {
    return Date.now();
  }

  function todayKey() {
    return new Date().toISOString().slice(0, 10);
  }

  function escapeHtml(str) {
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
  }

  function clone(value) {
    return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
  }

  function deepMerge(base = {}, patch = {}) {
    const out = Array.isArray(base) ? [...base] : { ...base };
    for (const [key, value] of Object.entries(patch)) {
      if (value && typeof value === "object" && !Array.isArray(value)) {
        out[key] = deepMerge(base[key] || {}, value);
      } else {
        out[key] = value;
      }
    }
    return out;
  }

  function qs(root, selector) {
    return root.querySelector(selector);
  }

  function qsa(root, selector) {
    return [...root.querySelectorAll(selector)];
  }

  function toast(message) {
    if (window.hposToast) {
      window.hposToast(message);
      return;
    }
    const el = document.getElementById("toast");
    if (!el) return;
    el.textContent = message;
    el.classList.add("show");
    clearTimeout(window.__hposToastTimer);
    window.__hposToastTimer = setTimeout(() => el.classList.remove("show"), 1600);
  }

  function setTheme(theme) {
    const next = theme === "light" ? "light" : "dark";
    state.theme = next;
    window.userSession.theme = next;
    document.documentElement.dataset.theme = next;
    localStorage.setItem("hpos_theme", next);
    saveSession();
    return next;
  }

  function saveSession() {
    const payload = {
      authenticated: !!state.user,
      user: state.user ? { uid: state.user.uid, email: state.user.email || "" } : null,
      profile: state.profile ? clone(state.profile) : null,
      theme: state.theme,
      rttScore: window.userSession.rttScore || 0,
      dailyCalories: window.userSession.dailyCalories || 0
    };
    localStorage.setItem("hpos_session", JSON.stringify(payload));
  }

  function clearRouteTimers() {
    if (state.controller) {
      state.controller.abort();
    }
    state.controller = new AbortController();

    for (const id of state.intervals) clearInterval(id);
    for (const id of state.timeouts) clearTimeout(id);

    state.intervals = [];
    state.timeouts = [];
    state.profileSaveTimer = null;
  }

  function interval(fn, ms) {
    const id = setInterval(fn, ms);
    state.intervals.push(id);
    return id;
  }

  function timeout(fn, ms) {
    const id = setTimeout(fn, ms);
    state.timeouts.push(id);
    return id;
  }

  function bind(root, selector, event, handler) {
    const el = typeof selector === "string" ? root.querySelector(selector) : selector;
    if (!el) return;
    el.addEventListener(event, handler, { signal: state.controller.signal });
  }

  function setText(root, selector, value) {
    const el = qs(root, selector);
    if (el) el.textContent = value;
  }

  function normalizeProfileDoc(data, uid, email = "") {
    const progress = deepMerge({
      xp: 0,
      level: 1,
      streak: 0,
      workoutsCompleted: 0,
      nutrition: {
        targetCalories: 0,
        loggedCalories: 0,
        targetProtein: 0,
        loggedProtein: 0,
        loggedCarbs: 0,
        loggedFats: 0,
        meals: []
      },
      latestWorkout: null,
      lastChat: null,
      lastProgressionReviewAt: null
    }, data?.progress || {});

    return {
      userId: uid,
      email: data?.email || email || "",
      Name: data?.Name || data?.name || "",
      Gender: data?.Gender || data?.gender || "male",
      Age: Number(data?.Age ?? data?.age ?? 28),
      Height: Number(data?.Height ?? data?.height ?? 178),
      Weight: Number(data?.Weight ?? data?.weight ?? 72),
      NutritionGoal: data?.NutritionGoal || data?.goal || "Performance Maintenance",
      ActivityMultiplier: Number(data?.ActivityMultiplier ?? data?.activityMultiplier ?? 1.55),
      TrainingExperience: data?.TrainingExperience || data?.experience || "Intermediate",
      PhysicalPainPatterns: data?.PhysicalPainPatterns || data?.painPattern || "None",
      AvailableEquipment: data?.AvailableEquipment || data?.equipment || "Full Gym",
      BMR: Number(data?.BMR ?? 0),
      BMI: Number(data?.BMI ?? 0),
      DailyCalorieTarget: Number(data?.DailyCalorieTarget ?? 0),
      TargetProtein: Number(data?.TargetProtein ?? 0),
      TargetFats: Number(data?.TargetFats ?? 0),
      TargetCarbs: Number(data?.TargetCarbs ?? 0),
      GraceTokens: Number(data?.GraceTokens ?? 2),
      LastHRV: Number(data?.LastHRV ?? 62),
      LastSleepHours: Number(data?.LastSleepHours ?? 8),
      LastRHR: Number(data?.LastRHR ?? 60),
      CurrentRTT: Number(data?.CurrentRTT ?? 0),
      LastWorkoutAt: data?.LastWorkoutAt || null,
      LastProgressionReviewAt: data?.LastProgressionReviewAt || progress.lastProgressionReviewAt || null,
      progress,
      createdAt: data?.createdAt || now(),
      updatedAt: data?.updatedAt || now()
    };
  }

  function serializeProfile(profile) {
    return {
      userId: profile.userId,
      email: profile.email || "",
      Name: profile.Name || "",
      Gender: profile.Gender || "male",
      Age: Number(profile.Age || 0),
      Height: Number(profile.Height || 0),
      Weight: Number(profile.Weight || 0),
      NutritionGoal: profile.NutritionGoal || "Performance Maintenance",
      ActivityMultiplier: Number(profile.ActivityMultiplier || 1.55),
      TrainingExperience: profile.TrainingExperience || "Intermediate",
      PhysicalPainPatterns: profile.PhysicalPainPatterns || "None",
      AvailableEquipment: profile.AvailableEquipment || "Full Gym",
      BMR: Number(profile.BMR || 0),
      BMI: Number(profile.BMI || 0),
      DailyCalorieTarget: Number(profile.DailyCalorieTarget || 0),
      TargetProtein: Number(profile.TargetProtein || 0),
      TargetFats: Number(profile.TargetFats || 0),
      TargetCarbs: Number(profile.TargetCarbs || 0),
      GraceTokens: Number(profile.GraceTokens || 2),
      LastHRV: Number(profile.LastHRV || 62),
      LastSleepHours: Number(profile.LastSleepHours || 8),
      LastRHR: Number(profile.LastRHR || 60),
      CurrentRTT: Number(profile.CurrentRTT || 0),
      LastWorkoutAt: profile.LastWorkoutAt || null,
      LastProgressionReviewAt: profile.LastProgressionReviewAt || null,
      progress: clone(profile.progress || {}),
      createdAt: profile.createdAt || now(),
      updatedAt: now()
    };
  }

  async function loadRemoteProfile(uid) {
    if (!window.FB?.user) return null;
    const snap = await window.FB.api.getDoc(window.FB.api.doc(window.FB.db, "users", uid));
    if (!snap.exists()) return null;
    return snap.data();
  }

  async function loadCurrentProfile() {
    await window.db.ready;
    await window.FB.ready;

    const user = window.FB.user;
    if (!user) return null;

    const local = await window.db.get("userProfiles", user.uid);
    const remote = await loadRemoteProfile(user.uid);

    const normalized = normalizeProfileDoc(
      remote ? remote : local || {},
      user.uid,
      user.email || ""
    );

    if (local) {
      const merged = deepMerge(normalized, local);
      merged.userId = user.uid;
      state.profile = normalizeProfileDoc(merged, user.uid, user.email || "");
    } else {
      state.profile = normalized;
    }

    await window.db.put("userProfiles", state.profile);
    saveSession();
    return state.profile;
  }

  async function persistProfile(patch = {}) {
    if (!state.profile) return null;
    state.profile = deepMerge(state.profile, patch);
    state.profile.updatedAt = now();
    await window.db.put("userProfiles", state.profile);

    if (window.FB?.user) {
      await window.FB.api.setDoc(
        window.FB.api.doc(window.FB.db, "users", window.FB.user.uid),
        serializeProfile(state.profile),
        { merge: true }
      );
    }

    window.userSession.profile = clone(state.profile);
    saveSession();
    return state.profile;
  }

  function debounceProfileSave() {
    if (state.profileSaveTimer) clearTimeout(state.profileSaveTimer);
    state.profileSaveTimer = setTimeout(() => {
      persistProfile().catch(console.error);
    }, 350);
  }

  async function loadCalorieLog(profile) {
    const key = todayKey();
    let log = await window.db.get("calorieLogs", key);

    if (!log) {
      const nutrition = window.HPOSIntel.computeNutritionTargets(profile, profile.ActivityMultiplier || 1.55);
      log = {
        date: key,
        DailyCalorieTarget: nutrition.dailyTarget,
        LoggedCalories: 0,
        TargetProtein: nutrition.targetProtein,
        LoggedProtein: 0,
        LoggedCarbs: 0,
        LoggedFats: 0,
        ListOfLoggedMeals: [],
        updatedAt: now()
      };
      await window.db.put("calorieLogs", log);
    }

    state.calorieLog = log;
    return log;
  }

  async function persistCalorieLog(log) {
    log.updatedAt = now();
    state.calorieLog = log;
    await window.db.put("calorieLogs", log);

    if (state.profile) {
      state.profile = deepMerge(state.profile, {
        DailyCalorieTarget: log.DailyCalorieTarget,
        TargetProtein: log.TargetProtein,
        progress: {
          nutrition: {
            targetCalories: log.DailyCalorieTarget,
            loggedCalories: log.LoggedCalories,
            targetProtein: log.TargetProtein,
            loggedProtein: log.LoggedProtein,
            loggedCarbs: log.LoggedCarbs,
            loggedFats: log.LoggedFats,
            meals: log.ListOfLoggedMeals
          }
        }
      });
      await persistProfile();
    }
  }

  async function loadWorkoutLogs() {
    state.workoutLogs = await window.db.getAll("workoutLogs");
    return state.workoutLogs;
  }

  async function persistWorkoutLog(log) {
    await window.db.put("workoutLogs", log);
    state.workoutLogs = await window.db.getAll("workoutLogs");
    return log;
  }

  async function persistChatMessage(message) {
    await window.db.put("chatHistory", message);
    if (state.profile) {
      state.profile = deepMerge(state.profile, {
        progress: {
          lastChat: {
            text: message.text,
            intent: message.intent,
            createdAt: message.createdAt
          }
        }
      });
      await persistProfile();
    }
  }

  async function getContextSnapshot() {
    const profile = state.profile || await loadCurrentProfile();
    if (!profile) return null;

    const calorieLog = state.calorieLog || await loadCalorieLog(profile);
    const workoutLogs = state.workoutLogs.length ? state.workoutLogs : await loadWorkoutLogs();
    const biometrics = {
      hrv: Number(profile.LastHRV || 62),
      sleepHours: Number(profile.LastSleepHours || 8),
      rhr: Number(profile.LastRHR || 60),
      activity: Number(profile.ActivityMultiplier || 1.55)
    };

    const intelligence = window.HPOSIntel.getCurrentIntelligence(profile, calorieLog, workoutLogs, biometrics);
    return { profile, calorieLog, workoutLogs, biometrics, intelligence };
  }

  function renderAuth(root) {
    const modeButtons = qsa(root, "[data-auth-mode]");
    const signupOnly = qsa(root, "[data-signup-only]");
    const status = qs(root, "#auth-status");
    const submit = qs(root, "#auth-submit");
    const modeCopy = qs(root, "#auth-mode-copy");

    let mode = "login";

    const syncMode = () => {
      const signup = mode === "signup";
      modeButtons.forEach((btn) => btn.classList.toggle("is-active", btn.dataset.authMode === mode));
      signupOnly.forEach((el) => el.classList.toggle("hidden", !signup));
      submit.textContent = signup ? "Create account" : "Login";
      modeCopy.textContent = signup
        ? "Create your profile once, then the system remembers the rest."
        : "Sign in to resume your cached progress, recovery, and sessions.";
    };

    modeButtons.forEach((btn) => {
      bind(btn, "click", () => {
        mode = btn.dataset.authMode;
        syncMode();
      });
    });

    const form = qs(root, "#auth-form");
    bind(form, "submit", async (event) => {
      event.preventDefault();
      if (!window.FB?.ready) return;

      const email = qs(root, "#auth-email").value.trim();
      const password = qs(root, "#auth-password").value;

      if (!email || !password) {
        status.textContent = "Email and password are required.";
        return;
      }

      submit.disabled = true;
      status.textContent = mode === "signup" ? "Creating account..." : "Signing in...";

      try {
        if (mode === "signup") {
          const userCred = await window.FB.api.createUserWithEmailAndPassword(window.FB.auth, email, password);
          const profile = normalizeProfileDoc({
            userId: userCred.user.uid,
            email,
            Name: qs(root, "#auth-name").value.trim() || "Athlete",
            Gender: qs(root, "#auth-gender").value,
            Age: Number(qs(root, "#auth-age").value || 28),
            Height: Number(qs(root, "#auth-height").value || 178),
            Weight: Number(qs(root, "#auth-weight").value || 72),
            NutritionGoal: qs(root, "#auth-goal").value,
            TrainingExperience: qs(root, "#auth-experience").value,
            PhysicalPainPatterns: qs(root, "#auth-pain").value,
            AvailableEquipment: qs(root, "#auth-equipment").value
          }, userCred.user.uid, email);

          const nutrition = window.HPOSIntel.computeNutritionTargets(profile, profile.ActivityMultiplier || 1.55);
          profile.BMR = nutrition.bmr;
          profile.BMI = nutrition.bmi;
          profile.DailyCalorieTarget = nutrition.dailyTarget;
          profile.TargetProtein = nutrition.targetProtein;
          profile.TargetFats = nutrition.targetFats;
          profile.TargetCarbs = nutrition.targetCarbs;
          profile.progress = deepMerge(profile.progress, {
            nutrition: {
              targetCalories: nutrition.dailyTarget,
              loggedCalories: 0,
              targetProtein: nutrition.targetProtein,
              loggedProtein: 0,
              loggedCarbs: 0,
              loggedFats: 0,
              meals: []
            }
          });

          await window.db.put("userProfiles", profile);
          await window.db.put("calorieLogs", {
            date: todayKey(),
            DailyCalorieTarget: nutrition.dailyTarget,
            LoggedCalories: 0,
            TargetProtein: nutrition.targetProtein,
            LoggedProtein: 0,
            LoggedCarbs: 0,
            LoggedFats: 0,
            ListOfLoggedMeals: [],
            updatedAt: now()
          });

          await window.FB.api.setDoc(
            window.FB.api.doc(window.FB.db, "users", userCred.user.uid),
            serializeProfile(profile),
            { merge: true }
          );

          state.user = userCred.user;
          state.profile = profile;
          window.userSession.authenticated = true;
          window.userSession.user = { uid: userCred.user.uid, email };
          window.userSession.profile = clone(profile);
          window.userSession.dailyCalories = profile.DailyCalorieTarget;
          saveSession();

          status.textContent = "Account created. Loading dashboard...";
          window.HPOSHaptics?.success();
          await window.router.go("dashboard", { force: true });
        } else {
          const userCred = await window.FB.api.signInWithEmailAndPassword(window.FB.auth, email, password);
          state.user = userCred.user;
          window.userSession.authenticated = true;
          window.userSession.user = { uid: userCred.user.uid, email };

          const profile = await loadCurrentProfile();
          if (!profile) {
            const basic = normalizeProfileDoc({ userId: userCred.user.uid, email }, userCred.user.uid, email);
            state.profile = basic;
            await window.db.put("userProfiles", basic);
            await window.FB.api.setDoc(
              window.FB.api.doc(window.FB.db, "users", userCred.user.uid),
              serializeProfile(basic),
              { merge: true }
            );
          }

          saveSession();
          status.textContent = "Signed in. Loading dashboard...";
          window.HPOSHaptics?.success();
          await window.router.go("dashboard", { force: true });
        }
      } catch (error) {
        console.error(error);
        status.textContent = error.message || "Authentication failed.";
        window.HPOSHaptics?.error();
      } finally {
        submit.disabled = false;
      }
    });

    syncMode();
  }

  function renderCurrentState(root, ctx) {
    const { profile, calorieLog, intelligence } = ctx;
    const zone = intelligence.rtt.zone;
    const remaining = intelligence.dailyRemaining;

    setText(root, "#dashboard-hero-name", `Welcome back, ${profile.Name || "Athlete"}`);
    setText(root, "#dashboard-hero-subtitle", `Your goal is ${profile.NutritionGoal}. The system is synced across readiness, calories, workouts, and chat.`);
    setText(root, "#dashboard-goal-chip", profile.NutritionGoal || "Performance Maintenance");

    setText(root, "#dashboard-zone-label", zone.label);
    setText(root, "#dashboard-zone-badge", zone.badge);
    setText(root, "#dashboard-zone-copy", zone.summary);

    setText(root, "#dashboard-ring-value", Math.round(intelligence.rtt.rtt));
    setText(root, "#dashboard-bmr", Math.round(intelligence.nutrition.bmr)
