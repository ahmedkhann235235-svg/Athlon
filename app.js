window.state = {
  user: null,
  profile: null,
  rtt: 0,
  calories: 0
};

/* SIMPLE RTT ENGINE */
function calcRTT(hrv, sleep, rhr){
  let hrvScore = Math.max(0, Math.min(100, 50 + (hrv - 62) * 2));
  let sleepScore = Math.min(100, (sleep / 8) * 100);
  let rhrScore = rhr <= 60 ? 100 : Math.max(20, 100 - (rhr - 60) * 2);

  return Math.round(hrvScore*0.5 + sleepScore*0.3 + rhrScore*0.2);
}

/* VIEW HOOK */
window.addEventListener("viewChanged", () => {
  const hrvEl   = document.querySelector("#hrv");
  const sleepEl = document.querySelector("#sleep");
  const rhrEl   = document.querySelector("#rhr");

  // FIXED: guard all elements before attaching listeners
  if(document.querySelector("#rttBtn") && hrvEl && sleepEl && rhrEl){
    hrvEl.oninput   = update;
    sleepEl.oninput = update;
    rhrEl.oninput   = update;
  }
});

function update(){
  const hrvEl   = document.querySelector("#hrv");
  const sleepEl = document.querySelector("#sleep");
  const rhrEl   = document.querySelector("#rhr");

  // FIXED: guard before reading .value
  if(!hrvEl || !sleepEl || !rhrEl) return;

  const hrv   = +hrvEl.value;
  const sleep = +sleepEl.value;
  const rhr   = +rhrEl.value;

  const rtt = calcRTT(hrv, sleep, rhr);
  window.state.rtt = rtt;

  document.querySelector("#rtt").innerText = rtt;
}
