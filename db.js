(() => {
  const DB_NAME = "hpos_local_db";
  const DB_VERSION = 1;

  const STORE_DEFS = {
    userProfiles: { keyPath: "userId" },
    workoutLogs: { keyPath: "logId" },
    calorieLogs: { keyPath: "date" },
    chatHistory: { keyPath: "chatId", autoIncrement: true },
  };

  const clone = (value) => JSON.parse(JSON.stringify(value));

  const memoryCache = {
    userProfiles: new Map(),
    workoutLogs: new Map(),
    calorieLogs: new Map(),
    chatHistory: new Map(),
  };

  let _db = null;
  let _readyResolve;
  let _readyReject;
  const ready = new Promise((resolve, reject) => {
    _readyResolve = resolve;
    _readyReject = reject;
  });

  const todayKey = () => new Date().toISOString().slice(0, 10);
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

  function isIOS() {
    return /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  }

  function isAndroid() {
    return /Android/i.test(navigator.userAgent);
  }

  async function ensureBody() {
    if (document.body) return;
    await new Promise((resolve) => document.addEventListener("DOMContentLoaded", resolve, { once: true }));
  }

  function emitChange(store, key, record) {
    window.dispatchEvent(
      new CustomEvent("hpos:db-updated", {
        detail: { store, key, record: record ? clone(record) : null },
      })
    );
  }

  function keyOf(storeName, record) {
    if (storeName === "userProfiles") return record.userId;
    if (storeName === "workoutLogs") return record.logId;
    if (storeName === "calorieLogs") return record.date;
    if (storeName === "chatHistory") return record.chatId;
    return undefined;
  }

  function sortResults(storeName, list) {
    if (storeName === "chatHistory") return list.sort((a, b) => (a.chatId || 0) - (b.chatId || 0));
    if (storeName === "workoutLogs") return list.sort((a, b) => String(a.Date || "").localeCompare(String(b.Date || "")));
    if (storeName === "calorieLogs") return list.sort((a, b) => String(a.date || "").localeCompare(String(b.date || "")));
    return list;
  }

  class HPOSDatabase {
    constructor() {
      this.db = null;
      this.openPromise = this.open();
    }

    async open() {
      return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
          const db = event.target.result;
          for (const [name, def] of Object.entries(STORE_DEFS)) {
            if (!db.objectStoreNames.contains(name)) {
              db.createObjectStore(name, { keyPath: def.keyPath, autoIncrement: !!def.autoIncrement });
            }
          }
        };

        request.onsuccess = () => {
          this.db = request.result;
          _db = this.db;
          resolve(this.db);
        };

        request.onerror = () => reject(request.error);
      });
    }

    async init() {
      await this.openPromise;
      await this.hydrateCache();
      _readyResolve?.(true);
      return this;
    }

    async hydrateCache() {
      for (const store of Object.keys(STORE_DEFS)) {
        const all = await this.getAll(store);
        memoryCache[store].clear();
        for (const record of all) {
          const k = keyOf(store, record);
          if (k !== undefined) memoryCache[store].set(k, clone(record));
        }
      }
    }

    async tx(storeName, mode = "readonly") {
      if (!this.db) await this.openPromise;
      return this.db.transaction(storeName, mode).objectStore(storeName);
    }

    normalize(storeName, data) {
      const record = clone(data || {});

      if (storeName === "userProfiles") {
        if (!record.userId) record.userId = "current";
      }

      if (storeName === "workoutLogs") {
        if (!record.logId) record.logId = `log_${Date.now()}_${Math.random().toString(16).slice(2)}`;
        if (!record.Date) record.Date = todayKey();
      }

      if (storeName === "calorieLogs") {
        if (!record.date) record.date = todayKey();
        if (!Array.isArray(record.ListOfLoggedMeals)) record.ListOfLoggedMeals = [];
      }

      return record;
    }

    async get(storeName, key) {
      await this.openPromise;
      if (memoryCache[storeName]?.has(key)) return clone(memoryCache[storeName].get(key));

      const store = await this.tx(storeName);
      return new Promise((resolve, reject) => {
        const req = store.get(key);
        req.onsuccess = () => {
          const record = req.result || null;
          if (record) memoryCache[storeName].set(key, clone(record));
          resolve(record ? clone(record) : null);
        };
        req.onerror = () => reject(req.error);
      });
    }

    async getAll(storeName) {
      await this.openPromise;
      const store = await this.tx(storeName);
      return new Promise((resolve, reject) => {
        const req = store.getAll();
        req.onsuccess = () => resolve(sortResults(storeName, req.result || []).map(clone));
        req.onerror = () => reject(req.error);
      });
    }

    async put(storeName, data) {
      await this.openPromise;
      const record = this.normalize(storeName, data);
      const store = await this.tx(storeName, "readwrite");

      return new Promise((resolve, reject) => {
        const req = store.put(record);
        req.onsuccess = () => {
          const k = keyOf(storeName, record) ?? req.result;
          if (storeName === "chatHistory") record.chatId = req.result;
          if (storeName === "userProfiles" && !record.userId) record.userId = "current";
          if (storeName === "workoutLogs" && !record.logId) record.logId = req.result;
          if (storeName === "calorieLogs" && !record.date) record.date = req.result;

          const cacheKey = keyOf(storeName, record);
          if (cacheKey !== undefined) memoryCache[storeName].set(cacheKey, clone(record));
          emitChange(storeName, cacheKey ?? k, record);
          resolve(clone(record));
        };
        req.onerror = () => reject(req.error);
      });
    }

    async delete(storeName, key) {
      await this.openPromise;
      const store = await this.tx(storeName, "readwrite");

      return new Promise((resolve, reject) => {
        const req = store.delete(key);
        req.onsuccess = () => {
          memoryCache[storeName].delete(key);
          emitChange(storeName, key, null);
          resolve(true);
        };
        req.onerror = () => reject(req.error);
      });
    }

    async clear(storeName) {
      await this.openPromise;
      const store = await this.tx(storeName, "readwrite");

      return new Promise((resolve, reject) => {
        const req = store.clear();
        req.onsuccess = () => {
          memoryCache[storeName].clear();
          emitChange(storeName, null, null);
          resolve(true);
        };
        req.onerror = () => reject(req.error);
      });
    }

    async clearAll() {
      await Promise.all(Object.keys(STORE_DEFS).map((store) => this.clear(store)));
    }
  }

  const HPOSIntel = {
    defaultActivityMultiplier(experience) {
      if (experience === "Beginner") return 1.4;
      if (experience === "Advanced") return 1.725;
      return 1.55;
    },

    zoneFor(rtt) {
      if (rtt >= 85) {
        return {
          key: "green",
          label: "Homeostasis Fully Restored",
          badge: "+15% Volume Hypertrophy Plan",
          color: "#34D399",
          volumeHint: "+10% to +15% progression",
          summary: "Push progression with control and clean execution.",
          multiplier: 1.1,
        };
      }
      if (rtt >= 60) {
        return {
          key: "amber",
          label: "Moderate Fatigue Detected",
          badge: "Deload -20% Set Management",
          color: "#FBBF24",
          volumeHint: "-20% to -25% set volume",
          summary: "Manage fatigue and trim unnecessary volume.",
          multiplier: 0.9,
        };
      }
      return {
        key: "red",
        label: "High Autonomic Stress",
        badge: "Somatic Mobility / Active Rest",
        color: "#F87171",
        volumeHint: "Recovery-first training",
        summary: "Keep intensity out of the session and bias recovery.",
        multiplier: 0.75,
      };
    },

    computeRTT({ hrv = 62, sleepHours = 8, rhr = 60 } = {}) {
      const scoreHrv = clamp(50 + (((Number(hrv) - 62) / 8) * 17.5), 0, 100);
      const scoreSleep = clamp((Number(sleepHours) / 8) * 100, 0, 100);
      const scoreRhr = Number(rhr) <= 60 ? 100 : Math.max(20, 100 - ((Number(rhr) - 60) * 8));
      const rtt = clamp((scoreHrv * 0.5) + (scoreSleep * 0.3) + (scoreRhr * 0.2), 0, 100);
      return { scoreHrv, scoreSleep, scoreRhr, rtt, zone: this.zoneFor(rtt) };
    },

    computeBMR(profile = {}) {
      const weight = Number(profile.Weight ?? 72);
      const height = Number(profile.Height ?? 178);
      const age = Number(profile.Age ?? 28);
      const gender = String(profile.Gender ?? "male");
      const bmi = weight / Math.pow(height / 100, 2);

      let effectiveWeight = weight;
      if (bmi >= 30) {
        const ideal = gender === "female"
          ? 45 + 0.92 * (height - 152)
          : 50 + 0.92 * (height - 152);
        effectiveWeight = ideal + 0.4 * (weight - ideal);
      }

      let bmr =
        (10 * effectiveWeight) +
        (6.25 * height) -
        (5 * age) +
        (gender === "female" ? -161 : 5);

      if (age >= 65) bmr *= 0.925;

      return { bmr, bmi, effectiveWeight };
    },

    computeNutritionTargets(profile = {}, activityMultiplier = 1.55) {
      const { bmr, bmi, effectiveWeight } = this.computeBMR(profile);
      const activity = Number(activityMultiplier || profile.ActivityMultiplier || 1.55);
      const goal = String(profile.NutritionGoal || "Performance Maintenance");

      const goalDelta = goal === "Fat Loss" ? -0.2 : goal === "Muscle Gain" ? 0.1 : 0;
      const proteinFactor = goal === "Fat Loss" ? 2.2 : goal === "Muscle Gain" ? 1.8 : 2.0;

      const tdee = bmr * activity;
      const dailyTarget = tdee * (1 + goalDelta);
      const targetProtein = effectiveWeight * proteinFactor;
      const targetFats = (dailyTarget * 0.25) / 9;
      const targetCarbs = Math.max(0, (dailyTarget - (targetProtein * 4) - (targetFats * 9)) / 4);

      return {
        bmr,
        bmi,
        effectiveWeight,
        tdee,
        dailyTarget,
        goalDelta,
        proteinFactor,
        targetProtein,
        targetFats,
        targetCarbs,
      };
    },

    computeLoadAnalytics(workoutLogs = []) {
      const today = new Date();
      const series = [];

      for (let i = 27; i >= 0; i--) {
        const date = new Date(today.getTime() - (i * 86400000)).toISOString().slice(0, 10);
        const logs = workoutLogs.filter((log) => String(log.Date || log.date || "").slice(0, 10) === date);
        const load = logs.reduce((sum, log) => {
          const stress = Number(log.TrainingStress ?? ((Number(log.Duration || 0) * Number(log.sRPE || 0))));
          return sum + stress;
        }, 0);
        series.push({ date, load });
      }

      const ewma = (values, alpha) => {
        let out = 0;
        values.forEach((v) => { out = (alpha * v) + ((1 - alpha) * out); });
        return out;
      };

      const loads = series.map((d) => d.load);
      const acute = ewma(loads.slice(-7), 0.5);
      const chronic = ewma(loads, 0.1);
      const acwr = chronic > 0 ? acute / chronic : 0;

      return {
        series,
        acute,
        chronic,
        acwr,
        danger: acwr > 1.5,
        peak: Math.max(...loads, 0),
      };
    },

    buildPeriodization(profile = {}, rtt = 0, loadAnalytics = { acwr: 0, danger: false }) {
      const exp = String(profile.TrainingExperience || "Intermediate");
      const zone = this.zoneFor(rtt);
      const mode = exp === "Beginner" ? "Linear Periodization" : "Daily Undulating Periodization";

      const microcycle = (() => {
        if (zone.key === "green") return exp === "Beginner" ? "Strength Foundation" : "Strength / Hypertrophy / Power";
        if (zone.key === "amber") return exp === "Beginner" ? "Technique + Volume" : "Hypertrophy / Technique / Volume Control";
        return "Mobility / Easy Volume / Restoration";
      })();

      const suggestedMultiplier = loadAnalytics.danger
        ? 0.75
        : zone.multiplier;

      const note = loadAnalytics.danger
        ? "ACWR is elevated. A recovery-led session is safer today."
        : zone.key === "green"
          ? "Ready for progressive overload."
          : zone.key === "amber"
            ? "Keep the dose controlled and high quality."
            : "Bias mobility and recovery work.";

      return { mode, microcycle, suggestedMultiplier, note };
    },

    getExerciseLibrary() {
      return [
        { name: "Barbell Squat", pattern: "knee", chain: "lower", equipment: "full", movers: ["quads", "glutes"], substitutes: ["Leg Press", "Goblet Squat", "Split Squat"] },
        { name: "Leg Press", pattern: "knee", chain: "lower", equipment: "full", movers: ["quads", "glutes"], substitutes: ["Goblet Squat", "Belt Squat", "Step-up"] },
        { name: "Romanian Deadlift", pattern: "back", chain: "posterior", equipment: "full", movers: ["hamstrings", "glutes"], substitutes: ["Hip Thrust", "Cable Pull Through"] },
        { name: "Bench Press", pattern: "shoulder", chain: "upper", equipment: "full", movers: ["chest", "triceps"], substitutes: ["DB Bench Press", "Floor Press", "Push-up"] },
        { name: "Overhead Press", pattern: "shoulder", chain: "upper", equipment: "full", movers: ["delts", "triceps"], substitutes: ["Landmine Press", "Incline DB Press"] },
        { name: "Lat Pulldown", pattern: "none", chain: "upper", equipment: "full", movers: ["lats", "biceps"], substitutes: ["Band Pulldown", "Inverted Row"] },
        { name: "Chest-Supported Row", pattern: "back", chain: "upper", equipment: "full", movers: ["upper back", "lats"], substitutes: ["Seated Cable Row", "1-Arm DB Row"] },
        { name: "Push-up", pattern: "shoulder", chain: "upper", equipment: "bodyweight", movers: ["chest", "triceps"], substitutes: ["Incline Push-up", "DB Floor Press"] },
        { name: "Goblet Squat", pattern: "knee", chain: "lower", equipment: "dumbbell", movers: ["quads", "glutes"], substitutes: ["Leg Press", "Box Squat"] },
        { name: "Split Squat", pattern: "knee", chain: "lower", equipment: "dumbbell", movers: ["quads", "glutes"], substitutes: ["Step-up", "Leg Press"] },
        { name: "Hip Thrust", pattern: "back", chain: "lower", equipment: "full", movers: ["glutes", "hamstrings"], substitutes: ["Glute Bridge", "Cable Pull Through"] },
        { name: "Landmine Press", pattern: "shoulder", chain: "upper", equipment: "full", movers: ["delts", "triceps"], substitutes: ["DB Bench Press", "Push-up"] },
        { name: "Dumbbell Bench Press", pattern: "shoulder", chain: "upper", equipment: "dumbbell", movers: ["chest", "triceps"], substitutes: ["Floor Press", "Push-up"] },
        { name: "DB RDL", pattern: "back", chain: "posterior", equipment: "dumbbell", movers: ["hamstrings", "glutes"], substitutes: ["Hip Thrust", "Cable Pull Through"] },
        { name: "1-Arm DB Row", pattern: "back", chain: "upper", equipment: "dumbbell", movers: ["lats", "upper back"], substitutes: ["Seated Cable Row", "Chest-Supported Row"] },
      ];
    },

    similarityScore(candidate, painfulPattern, equipment) {
      const lib = this.getExerciseLibrary();
      const c = lib.find((x) => x.name === candidate) || {
        pattern: "none",
        chain: "upper",
        equipment: "full",
        movers: [],
      };

      const pain = String(painfulPattern || "None");
      const targetPain = pain === "Knee" ? "knee" : pain === "Shoulder" ? "shoulder" : pain === "Lower Back" ? "back" : "none";

      const primaryMoverOverlap = c.pattern === targetPain ? 0 : 1;
      const secondaryMoverOverlap = targetPain === "none" ? 1 : (c.pattern === "none" ? 1 : 0.5);
      const kineticChainMatch = 1;
      const equipmentParity =
        (equipment === "Bodyweight" && c.equipment === "bodyweight") ||
        (equipment === "Dumbbells" && (c.equipment === "dumbbell" || c.equipment === "bodyweight")) ||
        (equipment === "Full Gym" && c.equipment === "full") ? 1 : 0.6;

      return (0.50 * primaryMoverOverlap) + (0.20 * secondaryMoverOverlap) + (0.15 * kineticChainMatch) + (0.15 * equipmentParity);
    },

    findBestSubstitute(exercise, profile = {}, reason = "pain") {
      const equipment = String(profile.AvailableEquipment || "Full Gym");
      const pain = String(profile.PhysicalPainPatterns || "None");
      const lib = this.getExerciseLibrary();
      const entry = lib.find((x) => x.name === exercise);

      const fallbackByEquipment = {
        Bodyweight: ["Push-up", "Inverted Row", "Split Squat", "Glute Bridge", "Air Squat"],
        Dumbbells: ["Dumbbell Bench Press", "1-Arm DB Row", "Goblet Squat", "DB RDL", "Landmine Press"],
        "Full Gym": entry?.substitutes || ["Leg Press", "DB Bench Press", "1-Arm DB Row"],
      };

      const candidates = fallbackByEquipment[equipment] || entry?.substitutes || [];

      const filtered = candidates
        .map((candidate) => ({ candidate, score: this.similarityScore(candidate, pain, equipment) }))
        .filter((x) => x.score >= 0.8)
        .sort((a, b) => b.score - a.score);

      if (filtered[0]) return filtered[0].candidate;
      return candidates[0] || exercise;
    },

    buildWorkoutPlan(profile = {}, rtt = 0, loadAnalytics = { acwr: 0, danger: false }) {
      const experience = String(profile.TrainingExperience || "Intermediate");
      const zone = this.zoneFor(rtt);
      const periodization = this.buildPeriodization(profile, rtt, loadAnalytics);
      const weight = Number(profile.Weight || 72);
      const equipment = String(profile.AvailableEquipment || "Full Gym");
      const pain = String(profile.PhysicalPainPatterns || "None");

      const base =
        experience === "Beginner"
          ? [
              { exercise: "Goblet Squat", sets: 3, reps: "8-10", factor: 0.45 },
              { exercise: "Push-up", sets: 3, reps: "8-12", factor: 0.4 },
              { exercise: "Lat Pulldown", sets: 3, reps: "10-12", factor: 0.55 },
              { exercise: "DB RDL", sets: 2, reps: "8-10", factor: 0.55 },
            ]
          : experience === "Advanced"
            ? [
                { exercise: "Barbell Squat", sets: 4, reps: "4-6", factor: 1.0 },
                { exercise: "Bench Press", sets: 4, reps: "4-6", factor: 0.8 },
                { exercise: "Romanian Deadlift", sets: 3, reps: "5-8", factor: 0.9 },
                { exercise: "Chest-Supported Row", sets: 3, reps: "6-8", factor: 0.6 },
                { exercise: "Overhead Press", sets: 3, reps: "5-8", factor: 0.45 },
              ]
            : [
                { exercise: "Barbell Squat", sets: 4, reps: "5-8", factor: 0.95 },
                { exercise: "Bench Press", sets: 4, reps: "5-8", factor: 0.75 },
                { exercise: "Romanian Deadlift", sets: 3, reps: "6-8", factor: 0.85 },
                { exercise: "Lat Pulldown", sets: 3, reps: "8-10", factor: 0.55 },
                { exercise: "Chest-Supported Row", sets: 3, reps: "8-10", factor: 0.55 },
              ];

      const loadMultiplier = loadAnalytics.danger ? 0.75 : periodization.suggestedMultiplier;

      const items = base.map((item) => {
        let exercise = item.exercise;
        exercise = this.findBestSubstitute(exercise, profile, "pain");

        if (equipment === "Bodyweight") {
          const map = {
            "Barbell Squat": "Air Squat",
            "Goblet Squat": "Air Squat",
            "Split Squat": "Tempo Split Squat",
            "Bench Press": "Push-up",
            "Dumbbell Bench Press": "Push-up",
            "Overhead Press": "Pike Push-up",
            "Romanian Deadlift": "Single-Leg Hip Hinge",
            "DB RDL": "Si
