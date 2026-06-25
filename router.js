export const state = {
  userSession: {
    authenticated: false
  },
  rttScore: 0,
  dailyCalories: 2200,
  cache: {}
};

const canvas = document.getElementById("app-canvas");

async function loadView(view) {
  if (state.cache[view]) {
    canvas.innerHTML = state.cache[view];
    return;
  }

  const res = await fetch(`./${view}.html`);
  const html = await res.text();

  state.cache[view] = html;
  canvas.innerHTML = html;

  // execute inline scripts manually (FIX for "showing code issue")
  const scripts = canvas.querySelectorAll("script");
  scripts.forEach(old => {
    const s = document.createElement("script");
    s.textContent = old.textContent;
    old.remove();
    document.body.appendChild(s);
  });
}

function navigate(view) {
  loadView(view);
}

document.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-route]");
  if (!btn) return;
  navigate(btn.dataset.route);
});

window.router = { navigate, loadView, state };

// default load
loadView("dashboard");
