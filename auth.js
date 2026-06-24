<div style="padding:20px">
  <h1>Login</h1>

  <input id="email" placeholder="email" style="display:block;margin:10px 0;padding:10px">
  <input id="pass" type="password" placeholder="password" style="display:block;margin:10px 0;padding:10px">

  <button onclick="login()" style="padding:12px;background:#A78BFA;color:white;width:100%">
    Login
  </button>

  <button onclick="signup()" style="padding:12px;margin-top:10px;width:100%">
    Signup
  </button>
</div>

<script type="module">
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword }
from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";

const auth = window.auth;

window.login = async () => {
  const email = document.getElementById("email").value;
  const pass = document.getElementById("pass").value;

  await signInWithEmailAndPassword(auth, email, pass);

  window.userSession.authenticated = true;
  router.navigate("dashboard");
};

window.signup = async () => {
  const email = document.getElementById("email").value;
  const pass = document.getElementById("pass").value;

  await createUserWithEmailAndPassword(auth, email, pass);

  window.userSession.authenticated = true;
  router.navigate("dashboard");
};
</script>
  window.userSession.user = cred.user;
  window.userSession.authenticated = true;

  router.navigate("dashboard");
};
</script>          </label>
          <label class="grid gap-2">
            <span class="text-xs text-[var(--muted)]">Height (cm)</span>
            <input id="Height" type="number" min="100" class="min-h-[56px] rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 outline-none" value="178" />
          </label>
          <label class="grid gap-2">
            <span class="text-xs text-[var(--muted)]">Weight (kg)</span>
            <input id="Weight" type="number" min="20" class="min-h-[56px] rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 outline-none" value="72" />
          </label>
        </div>
        <label class="grid gap-2">
          <span class="text-xs text-[var(--muted)]">Training Experience</span>
          <select id="TrainingExperience" class="min-h-[56px] rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 outline-none">
            <option>Beginner</option>
            <option selected>Intermediate</option>
            <option>Advanced</option>
          </select>
        </label>
      </div>

      <div id="step-3" class="step-panel hidden space-y-4">
        <div class="grid gap-4 lg:grid-cols-2">
          <label class="grid gap-2">
            <span class="text-xs text-[var(--muted)]">Primary Goal</span>
            <select id="NutritionGoal" class="min-h-[56px] rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 outline-none">
              <option value="Fat Loss">Fat Loss</option>
              <option value="Muscle Gain">Muscle Gain</option>
              <option value="Performance Maintenance" selected>Performance Maintenance</option>
            </select>
          </label>

          <label class="grid gap-2">
            <span class="text-xs text-[var(--muted)]">Available Equipment</span>
            <select id="AvailableEquipment" class="min-h-[56px] rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 outline-none">
              <option>Full Gym</option>
              <option>Dumbbells</option>
              <option>Bodyweight</option>
            </select>
          </label>
        </div>

        <div class="grid gap-2">
          <span class="text-xs text-[var(--muted)]">Physical Pain Pattern</span>
          <div class="grid grid-cols-2 lg:grid-cols-4 gap-2">
            <button type="button" class="min-h-[56px] rounded-2xl border border-[var(--border)] bg-[var(--surface)] font-semibold pain-btn is-active" data-pain="None">None</button>
            <button type="button" class="min-h-[56px] rounded-2xl border border-[var(--border)] bg-[var(--surface)] font-semibold pain-btn" data-pain="Knee">Knee</button>
            <button type="button" class="min-h-[56px] rounded-2xl border border-[var(--border)] bg-[var(--surface)] font-semibold pain-btn" data-pain="Shoulder">Shoulder</button>
            <button type="button" class="min-h-[56px] rounded-2xl border border-[var(--border)] bg-[var(--surface)] font-semibold pain-btn" data-pain="Lower Back">Lower Back</button>
          </div>
        </div>
      </div>

      <div class="grid gap-3 lg:grid-cols-2">
        <button type="button" id="prevStep" class="min-h-[56px] rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 font-extrabold">Back</button>
        <button id="completeBtn" type="submit" class="min-h-[56px] rounded-2xl bg-[var(--accent)] px-4 font-extrabold text-white shadow-[0_12px_24px_color-mix(in_srgb,var(--accent)_20%,transparent)] transition-transform duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5">
          Complete Profile & Sync
        </button>
      </div>
    </form>
  </div>

  <div class="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow)] p-5 lg:p-6">
    <h3 class="text-lg font-bold tracking-tight">Live metabolic preview</h3>

    <div class="mt-4 grid gap-3">
      <div class="rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] p-4">
        <p class="text-xs text-[var(--muted)]">Current step</p>
        <p id="previewStep" class="mt-1 text-sm font-semibold">1 of 3</p>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div class="rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] p-4">
          <p class="text-xs text-[var(--muted)]">BMR</p>
          <p id="previewBmr" class="mt-1 text-sm font-semibold">—</p>
        </div>
        <div class="rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] p-4">
          <p class="text-xs text-[var(--muted)]">Calories</p>
          <p id="previewCalories" class="mt-1 text-sm font-semibold">—</p>
        </div>
      </div>

      <div class="rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] p-4">
        <p class="text-xs text-[var(--muted)]">Macros</p>
        <p id="previewMacros" class="mt-1 text-sm font-semibold leading-6">—</p>
      </div>

      <div class="rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] p-4">
        <p class="text-xs text-[var(--muted)]">Profile summary</p>
        <p id="previewProfile" class="mt-1 text-sm font-semibold leading-6">Fill the form to see the live target block.</p>
      </div>
    </div>
  </div>
</section>

<script>
(() => {
  const session = window.userSession || (window.userSession = {});
  const steps = [...document.querySelectorAll(".step-btn")];
  const painButtons = [...document.querySelectorAll(".pain-btn")];
  const form = document.getElementById("auth-form");
  const prevStepBtn = document.getElementById("prevStep");

  const fields = {
    Name: document.getElementById("Name"),
    Gender: document.getElementById("Gender"),
    Age: document.getElementById("Age"),
    Height: document.getElementById("Height"),
    Weight: document.getElementById("Weight"),
    TrainingExperience: document.getElementById("TrainingExperience"),
    NutritionGoal: document.getElementById("NutritionGoal"),
    AvailableEquipment: document.getElementById("AvailableEquipment"),
  };

  const previewStep = document.getElementById("previewStep");
  const previewBmr = document.getElementById("previewBmr");
  const previewCalories = document.getElementById("previewCalories");
  const previewMacros = document.getElementById("previewMacros");
  const previewProfile = document.getElementById("previewProfile");

  let currentStep = 1;
  let currentPain = "None";

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  function setStep(step) {
    currentStep = clamp(step, 1, 3);
    previewStep.textContent = `${currentStep} of 3`;
    steps.forEach((btn) => btn.classList.toggle("is-active", Number(btn.dataset.step) === currentStep));
    document.querySelectorAll(".step-panel").forEach((panel, index) => panel.classList.toggle("hidden", index !== currentStep - 1));
    prevStepBtn.disabled = currentStep === 1;
  }

  function setPain(pain) {
    currentPain = pain;
    painButtons.forEach((btn) => btn.classList.toggle("is-active", btn.dataset.pain === pain));
  }

  function calcProfile() {
    const Name = fields.Name.value.trim() || "Athlete";
    const Gender = fields.Gender.value;
    const Age = Number(fields.Age.value || 28);
    const Height = Number(fields.Height.value || 178);
    const Weight = Number(fields.Weight.value || 72);
    const TrainingExperience = fields.TrainingExperience.value;
    const NutritionGoal = fields.NutritionGoal.value;
    const AvailableEquipment = fields.AvailableEquipment.value;
    const ActivityMultiplier = window.HPOSIntel.defaultActivityMultiplier(TrainingExperience);

    const { bmr, bmi, effectiveWeight } = window.HPOSIntel.computeBMR({ Name, Gender, Age, Height, Weight });
    const targetWeight = bmi >= 30 ? effectiveWeight : Weight;
    const nutrition = window.HPOSIntel.computeNutritionTargets({ Name, Gender, Age, Height, Weight, NutritionGoal, ActivityMultiplier }, ActivityMultiplier);
    const targetProtein = targetWeight * nutrition.proteinFactor;

    return {
      userId: "current",
      Name,
      Age,
      Height,
      Weight,
      Gender,
      NutritionGoal,
      ActivityMultiplier,
      TrainingExperience,
      PhysicalPainPatterns: currentPain,
      AvailableEquipment,
      BMR: bmr,
      BMI: bmi,
      DailyCalorieTarget: nutrition.dailyTarget,
      TargetProtein: targetProtein,
      TargetFats: nutrition.targetFats,
      TargetCarbs: nutrition.targetCarbs,
      GraceTokens: session.profile?.GraceTokens ?? 2,
      LastProgressionReviewAt: session.profile?.LastProgressionReviewAt || null,
      LastWorkoutAt: session.profile?.LastWorkoutAt || null,
      NextMicrocycleMultiplier: session.profile?.NextMicrocycleMultiplier || 1,
      updatedAt: Date.now(),
    };
  }

  function updatePreview() {
    const p = calcProfile();
    previewBmr.textContent = Math.round(p.BMR);
    previewCalories.textContent = Math.round(p.DailyCalorieTarget);
    previewMacros.textContent = `Protein ${Math.round(p.TargetProtein)}g • Fat ${Math.round(p.TargetFats)}g • Carbs ${Math.round(p.TargetCarbs)}g`;
    previewProfile.textContent = [
      p.Name,
      p.Gender,
      `${p.Age}y`,
      `${p.Height}cm`,
      `${p.Weight}kg`,
      p.TrainingExperience,
      p.AvailableEquipment,
      `Pain: ${p.PhysicalPainPatterns}`,
    ].join(" • ");
  }

  steps.forEach((btn) => btn.addEventListener("click", () => setStep(Number(btn.dataset.step))));
  painButtons.forEach((btn) => btn.addEventListener("click", () => setPain(btn.dataset.pain)));
  prevStepBtn.addEventListener("click", () => setStep(currentStep - 1));

  Object.values(fields).forEach((input) => {
    input.addEventListener("input", updatePreview);
    input.addEventListener("change", updatePreview);
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const profile = calcProfile();
    await window.db.put("userProfiles", profile);

    const targets = window.HPOSIntel.computeNutritionTargets(profile, profile.ActivityMultiplier);
    await window.db.put("calorieLogs", {
      date: new Date().toISOString().slice(0, 10),
      DailyCalorieTarget: targets.dailyTarget,
      LoggedCalories: 0,
      TargetProtein: profile.TargetProtein,
      LoggedProtein: 0,
      LoggedCarbs: 0,
      LoggedFats: 0,
      ListOfLoggedMeals: [],
      updatedAt: Date.now(),
    });

    session.authenticated = true;
    session.profile = profile;
    session.rttScore = 0;
    session.dailyCalories = profile.DailyCalorieTarget;
    localStorage.setItem("hpos_session", JSON.stringify(session));
    window.saveUserSession?.();
    window.HPOSHaptics?.success();

    await window.router.navigate("dashboard");
  });

  updatePreview();
  setStep(1);
  setPain("None");

  window.addEventListener("hpos:view-mounted", (event) => {
    if (event.detail?.route === "auth") updatePreview();
  });
})();
                                                               </script>          </div>
        </div>
      </div>

      <div id="step-signup" class="step-panel hidden space-y-4">
        <div class="grid gap-4 lg:grid-cols-3">
          <label class="grid gap-2">
            <span class="text-xs text-[var(--muted)]">Age</span>
            <input id="age" type="number" min="10" class="min-h-[56px] rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 outline-none" value="28" />
          </label>
          <label class="grid gap-2">
            <span class="text-xs text-[var(--muted)]">Height (cm)</span>
            <input id="heightCm" type="number" min="100" class="min-h-[56px] rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 outline-none" value="178" />
          </label>
          <label class="grid gap-2">
            <span class="text-xs text-[var(--muted)]">Weight (kg)</span>
            <input id="weightKg" type="number" min="20" class="min-h-[56px] rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 outline-none" value="72" />
          </label>
        </div>
      </div>

      <div id="step-biometric" class="step-panel hidden space-y-4">
        <div class="grid gap-4 lg:grid-cols-2">
          <label class="grid gap-2">
            <span class="text-xs text-[var(--muted)]">Primary Fitness Objective</span>
            <select id="goal" class="min-h-[56px] rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 outline-none">
              <option value="fat_loss">Fat Loss</option>
              <option value="muscle_gain">Muscle Gain</option>
              <option value="maintenance">Performance Maintenance</option>
            </select>
          </label>
          <div class="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
            <p class="text-xs text-[var(--muted)]">Biometric setup</p>
            <p class="mt-2 text-sm text-[var(--text)] leading-6">
              Athlon will use these inputs to calculate recovery, calorie targets, and recovery-zone programming.
            </p>
          </div>
        </div>
      </div>

      <button id="completeBtn" type="submit" class="min-h-[56px] w-full rounded-2xl bg-[var(--accent)] px-4 font-extrabold text-white shadow-[0_12px_24px_color-mix(in_srgb,var(--accent)_20%,transparent)] transition-transform duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5">
        Complete Profile &amp; Sync
      </button>
    </form>
  </div>

  <div class="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow)] p-5 lg:p-6">
    <h3 class="text-lg font-bold tracking-tight">Profile preview</h3>
    <div class="mt-4 grid gap-3">
      <div class="rounded-2xl bg-[var(--surface-2)] p-4 border border-[var(--border)]">
        <p class="text-xs text-[var(--muted)]">Current state</p>
        <p id="previewState" class="mt-1 text-sm font-semibold">Not synced yet</p>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div class="rounded-2xl bg-[var(--surface-2)] p-4 border border-[var(--border)]">
          <p class="text-xs text-[var(--muted)]">Goal</p>
          <p id="previewGoal" class="mt-1 text-sm font-semibold">—</p>
        </div>
        <div class="rounded-2xl bg-[var(--surface-2)] p-4 border border-[var(--border)]">
          <p class="text-xs text-[var(--muted)]">Bodyweight</p>
          <p id="previewWeight" class="mt-1 text-sm font-semibold">— kg</p>
        </div>
      </div>
      <div class="rounded-2xl bg-[var(--surface-2)] p-4 border border-[var(--border)]">
        <p class="text-xs text-[var(--muted)]">What happens next</p>
        <p class="mt-1 text-sm text-[var(--text)] leading-6">
          Your profile is written to the shared global session, and Athlon will switch straight into the Dashboard after sync.
        </p>
      </div>
    </div>
  </div>
</section>

<script>
(() => {
  const stepButtons = Array.from(document.querySelectorAll(".step-btn"));
  const stepPanels = {
    login: document.getElementById("step-login"),
    signup: document.getElementById("step-signup"),
    biometric: document.getElementById("step-biometric"),
  };

  const objectiveButtons = Array.from(document.querySelectorAll(".objective-btn"));
  const previewState = document.getElementById("previewState");
  const previewGoal = document.getElementById("previewGoal");
  const previewWeight = document.getElementById("previewWeight");
  const form = document.getElementById("auth-form");

  const fields = {
    name: document.getElementById("name"),
    gender: document.getElementById("gender"),
    age: document.getElementById("age"),
    heightCm: document.getElementById("heightCm"),
    weightKg: document.getElementById("weightKg"),
    goal: document.getElementById("goal"),
  };

  let currentStep = "login";

  function updatePreview() {
    const name = fields.name.value.trim() || "Athlete";
    const goal = fields.goal.value;
    const weight = fields.weightKg.value || "72";
    previewState.textContent = `${name} · ${fields.gender.value} · ${fields.age.value || 28}y`;
    previewGoal.textContent = goal.replace("_", " ");
    previewWeight.textContent = `${weight} kg`;
  }

  function setStep(step) {
    currentStep = step;
    stepButtons.forEach((btn) => btn.classList.toggle("is-active", btn.dataset.step === step));
    Object.entries(stepPanels).forEach(([key, panel]) => {
      panel.classList.toggle("hidden", key !== step);
    });
  }

  function setGoal(goal) {
    fields.goal.value = goal;
    objectiveButtons.forEach((btn) => btn.classList.toggle("is-active", btn.dataset.goal === goal));
    updatePreview();
  }

  stepButtons.forEach((btn) => {
    btn.addEventListener("click", () => setStep(btn.dataset.step));
  });

  objectiveButtons.forEach((btn) => {
    btn.addEventListener("click", () => setGoal(btn.dataset.goal));
  });

  Object.values(fields).forEach((field) => {
    field.addEventListener("input", updatePreview);
    field.addEventListener("change", updatePreview);
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const session = window.userSession || (window.userSession = {});
    session.profile = {
      name: fields.name.value.trim() || "Athlete",
      gender: fields.gender.value,
      age: Number(fields.age.value || 28),
      heightCm: Number(fields.heightCm.value || 178),
      weightKg: Number(fields.weightKg.value || 72),
      goal: fields.goal.value,
    };
    session.authenticated = true;

    window.saveUserSession?.();

    if (window.router?.navigate) {
      await window.router.navigate("dashboard");
    }
  });

  updatePreview();

  if (window.userSession?.authenticated) {
    previewState.textContent = "Profile already synced";
    setStep("biometric");
  }
})();
</script>
