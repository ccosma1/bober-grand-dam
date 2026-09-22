import * as THREE from "../vendor/three.module.js";
import {
  LAPS,
  adviceFor,
  createRace,
  createTrack,
  lapOf,
  livePlace,
  loadSave,
  noteFinish,
  resetRace,
  selfTest,
  stepRace,
  launchHeld,
  humanOf,
  setDriver as chooseDriver,
  swapTrack,
  writeSave,
} from "./sim.js?v=gd11";
import { createWorld } from "./world.js?v=gd11";
import { createSfx } from "./audio.js?v=gd11";

const app = document.getElementById("app");
const stage = document.getElementById("stage");
const splash = document.getElementById("splash");
const controls = document.getElementById("controls");
const hud = document.getElementById("hud");
const countdownEl = document.getElementById("countdown");
const hintEl = document.getElementById("hint");
const museumEl = document.getElementById("museum");
const exhibitEl = document.getElementById("exhibit");
const podiumEl = document.getElementById("podium");

const track = createTrack();
const race = createRace(track);
const world = createWorld(THREE, track);
const sfx = createSfx();
stage.insertBefore(world.renderer.domElement, stage.firstChild);

let save = loadSave();
let scripted = null;
let firePulse = false;
let auto = false;
let savedThisRace = false;
let lastTick = performance.now();
let ceilSeen = 4;
let hinted = false;
const held = { left: false, right: false, gas: false, brake: false, drift: false };
const joy = { active: false, steer: 0, gas: false, brake: false };

function fmt(t) {
  const m = Math.floor(t / 60);
  const s = Math.max(0, t - m * 60);
  return m + ":" + s.toFixed(1).padStart(4, "0");
}

function placeWord(n) {
  return ["", "1ST", "2ND", "3RD", "4TH"][n] || n + "TH";
}

function paintBest() {
  const el = document.getElementById("splash-best");
  if (!save.bestPlace) {
    el.textContent = "No crest time yet.";
    return;
  }
  el.textContent = "Best " + placeWord(save.bestPlace) + " · " + fmt(save.bestTime);
}

function youInput() {
  if (scripted) return scripted;
  const you = humanOf(race);
  if (auto) return adviceFor(race, you.id);
  const keySteer = (held.left ? 1 : 0) - (held.right ? 1 : 0);
  if (joy.active) {
    return {
      steer: joy.steer,
      gas: joy.gas && !joy.brake,
      brake: joy.brake,
      drift: !!held.drift,
      fire: takeFire(),
    };
  }
  return {
    // +steer yaws toward screen-left in the chase view. Left is +1.
    steer: keySteer,
    gas: !!held.gas && !held.brake,
    drift: !!held.drift,
    brake: !!held.brake,
    fire: takeFire(),
  };
}

function takeFire() {
  const fire = firePulse;
  firePulse = false;
  return fire;
}

function bindHold(id, key) {
  const el = document.getElementById(id);
  el.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    el.setPointerCapture(e.pointerId);
    held[key] = true;
    el.classList.add("on");
  });
  const up = () => {
    held[key] = false;
    el.classList.remove("on");
  };
  el.addEventListener("pointerup", up);
  el.addEventListener("pointercancel", up);
}
const driftBtn = document.getElementById("btn-drift");
if (driftBtn) bindHold("btn-drift", "drift");
const stick = document.getElementById("stick");
const knob = document.getElementById("stick-knob");
function stickAt(e) {
  const rect = stick.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const rad = Math.max(24, Math.min(rect.width, rect.height) * 0.36);
  let dx = e.clientX - cx;
  let dy = e.clientY - cy;
  const mag = Math.hypot(dx, dy) || 1;
  const lim = Math.min(1, mag / rad);
  const nx = (dx / mag) * lim;
  const ny = (dy / mag) * lim;
  joy.steer = Math.max(-1, Math.min(1, -nx));
  joy.gas = ny < -0.2;
  joy.brake = ny > 0.45;
  knob.style.transform = "translate(calc(-50% + " + nx * rad + "px), calc(-50% + " + ny * rad + "px))";
}
stick.addEventListener("pointerdown", (e) => {
  e.preventDefault();
  stick.setPointerCapture(e.pointerId);
  joy.active = true;
  stickAt(e);
});
stick.addEventListener("pointermove", (e) => {
  if (!joy.active) return;
  stickAt(e);
});
function stickUp() {
  joy.active = false;
  joy.steer = 0;
  joy.gas = false;
  joy.brake = false;
  knob.style.transform = "translate(-50%, -50%)";
}
stick.addEventListener("pointerup", stickUp);
stick.addEventListener("pointercancel", stickUp);
document.getElementById("btn-fire").addEventListener("pointerdown", (e) => {
  e.preventDefault();
  firePulse = true;
  document.getElementById("btn-fire").classList.add("on");
});
document.getElementById("btn-fire").addEventListener("pointerup", () => {
  document.getElementById("btn-fire").classList.remove("on");
});

function inRace() {
  return race.phase === "race" || race.phase === "countdown";
}

function splashButtons() {
  return [
    document.querySelector("[data-track=dam]"),
    document.querySelector("[data-track=frost]"),
    ...document.querySelectorAll("[data-driver]"),
    document.getElementById("btn-start"),
    document.getElementById("btn-how"),
    document.getElementById("btn-museum"),
  ];
}

function focusAt(list, index) {
  if (!list.length) return 0;
  const i = (index + list.length) % list.length;
  list[i].focus();
  return i;
}

let splashFocus = 6;

function menuKey(e) {
  if (!exhibitEl.classList.contains("hidden")) {
    if (e.code === "Escape" || e.code === "Backspace") {
      e.preventDefault();
      exhibitEl.classList.add("hidden");
      document.querySelector("[data-exhibit]")?.focus();
    }
    return true;
  }
  if (!museumEl.classList.contains("hidden")) {
    const cards = [...museumEl.querySelectorAll("[data-exhibit], #btn-museum-back")];
    const cur = Math.max(0, cards.indexOf(document.activeElement));
    if (e.code === "ArrowDown" || e.code === "ArrowRight") {
      e.preventDefault();
      focusAt(cards, cur + 1);
    } else if (e.code === "ArrowUp" || e.code === "ArrowLeft") {
      e.preventDefault();
      focusAt(cards, cur - 1);
    } else if (e.code === "Escape" || e.code === "Backspace") {
      e.preventDefault();
      museumEl.classList.add("hidden");
      document.getElementById("btn-museum").focus();
    }
    return true;
  }
  const howEl = document.getElementById("how");
  if (howEl && !howEl.classList.contains("hidden")) {
    if (e.code === "Escape" || e.code === "Enter" || e.code === "Backspace") {
      e.preventDefault();
      howEl.classList.add("hidden");
      document.getElementById("btn-how").focus();
    }
    return true;
  }
  if (!podiumEl.classList.contains("hidden")) {
    const row = [document.getElementById("btn-rematch"), document.getElementById("btn-splash")];
    const cur = Math.max(0, row.indexOf(document.activeElement));
    if (e.code === "ArrowLeft" || e.code === "ArrowUp") {
      e.preventDefault();
      focusAt(row, cur - 1);
    } else if (e.code === "ArrowRight" || e.code === "ArrowDown") {
      e.preventDefault();
      focusAt(row, cur + 1);
    } else if (e.code === "Escape") {
      e.preventDefault();
      document.getElementById("btn-splash").click();
    }
    return true;
  }
  if (race.phase === "splash") {
    const row = splashButtons();
    if (e.code === "ArrowRight" || e.code === "ArrowDown") {
      e.preventDefault();
      splashFocus = focusAt(row, splashFocus + 1);
    } else if (e.code === "ArrowLeft" || e.code === "ArrowUp") {
      e.preventDefault();
      splashFocus = focusAt(row, splashFocus - 1);
    } else if (e.code === "Escape") {
      return true;
    } else {
      return false;
    }
    const picked = row[splashFocus];
    if (picked && (picked.hasAttribute("data-track") || picked.hasAttribute("data-driver"))) picked.click();
    return true;
  }
  return false;
}

window.addEventListener("keydown", (e) => {
  if (!inRace()) {
    const used = menuKey(e);
    if (used) return;
    return;
  }
  const map = {
    ArrowLeft: "left",
    KeyA: "left",
    ArrowRight: "right",
    KeyD: "right",
    ArrowUp: "gas",
    KeyW: "gas",
    ArrowDown: "brake",
    KeyS: "brake",
    Space: "drift",
    ShiftLeft: "drift",
    ShiftRight: "drift",
  };
  if (e.code === "KeyF" || e.code === "KeyE" || e.code === "Enter" || e.code === "NumpadEnter") {
    e.preventDefault();
    firePulse = true;
    return;
  }
  if (!map[e.code]) return;
  e.preventDefault();
  if (!e.repeat) held[map[e.code]] = true;
});
window.addEventListener("keyup", (e) => {
  const map = {
    ArrowLeft: "left",
    KeyA: "left",
    ArrowRight: "right",
    KeyD: "right",
    ArrowUp: "gas",
    KeyW: "gas",
    ArrowDown: "brake",
    KeyS: "brake",
    Space: "drift",
    ShiftLeft: "drift",
    ShiftRight: "drift",
  };
  if (!map[e.code]) return;
  held[map[e.code]] = false;
});
document.getElementById("controls").addEventListener("selectstart", (e) => e.preventDefault());
document.getElementById("stage").addEventListener("selectstart", (e) => e.preventDefault());
document.getElementById("controls").addEventListener("contextmenu", (e) => e.preventDefault());

function layout() {
  const portrait = window.innerHeight >= window.innerWidth;
  app.classList.toggle("portrait", portrait);
  const rect = stage.getBoundingClientRect();
  world.resize(rect.width, rect.height, rect.width < 700 ? 1.5 : 2);
}

function showRaceChrome(on) {
  app.classList.toggle("live", on);
  splash.classList.toggle("hidden", on);
  controls.classList.toggle("hidden", !on);
  hud.classList.toggle("hidden", !on);
  document.getElementById("minimap").classList.toggle("hidden", !on);
  if (!on) {
    podiumEl.classList.add("hidden");
    countdownEl.classList.add("hidden");
    hintEl.classList.add("hidden");
    exhibitEl.classList.add("hidden");
  }
}

function startRace() {
  sfx.unlock();
  savedThisRace = false;
  hinted = false;
  ceilSeen = 4;
  auto = false;
  scripted = null;
  resetRace(race);
  showRaceChrome(true);
  document.getElementById("minimap").classList.remove("hidden");
  museumEl.classList.add("hidden");
  document.getElementById("how").classList.add("hidden");
  exhibitEl.classList.add("hidden");
  hintEl.classList.remove("hidden");
  hintEl.textContent = "Hold a turn. Let go when it sparks.";
  layout();
}

function showPodium() {
  const you = humanOf(race);
  if (!savedThisRace) {
    savedThisRace = true;
    save = noteFinish(save, you.place, you.finishTime);
    sfx.finish();
    if (navigator.vibrate) navigator.vibrate(24);
  }
  document.getElementById("podium-title").textContent =
    you.place === 1 ? "FIRST TO THE CREST" : "CREST REACHED";
  document.getElementById("podium-place").textContent = placeWord(you.place);
  const list = document.getElementById("podium-list");
  list.innerHTML = "";
  const ordered = [...race.karts].sort((a, b) => a.place - b.place);
  for (const k of ordered) {
    const li = document.createElement("li");
    li.textContent = k.crossed
      ? k.place + "  " + k.name + "  " + fmt(k.finishTime)
      : k.place + "  " + k.name;
    if (!k.cpu) li.classList.add("me");
    list.appendChild(li);
  }
  document.getElementById("podium-best").textContent =
    "Best " + placeWord(save.bestPlace) + " · " + fmt(save.bestTime);
  podiumEl.classList.remove("hidden");
  sfx.stop();
  document.getElementById("btn-rematch").focus();
}

document.getElementById("btn-start").addEventListener("click", () => startRace());
document.getElementById("btn-rematch").addEventListener("click", () => startRace());
document.getElementById("btn-splash").addEventListener("click", () => {
  race.phase = "splash";
  showRaceChrome(false);
  paintBest();
  layout();
});
document.getElementById("btn-quit").addEventListener("click", () => {
  race.phase = "splash";
  showRaceChrome(false);
  paintBest();
  sfx.stop();
  layout();
});
const EXHIBITS = {
  "dam-loop": {
    src: "assets/history/dam-loop.jpg?v=gd11",
    title: "Dam Loop",
    cap: "The crest road, the bank, the spillway. Three laps. The line is the crest.",
  },
  "frost-ridge": {
    src: "assets/history/frost-ridge.jpg?v=gd11",
    title: "Frost Ridge",
    cap: "Ice, drifts, and two narrow bridges. Same three laps. Same four racers.",
  },
  "sling-kart": {
    src: "assets/history/crest-drift.jpg?v=gd11",
    title: "Sling Kart",
    cap: "Cedar bowl. Twin sling bands on the rear posts. Hold a turn until the bands spark, then let go.",
  },
  sap: {
    src: "assets/museum/sap.jpg?v=gd3",
    title: "Sap Shell",
    cap: "A soft homing blob. It sticks to whoever is ahead and slows them.",
  },
  trap: {
    src: "assets/museum/trap.jpg?v=gd3",
    title: "Stick Trap",
    cap: "Drops behind the bowl. The next racer through it spins.",
  },
  wall: {
    src: "assets/museum/wall.jpg?v=gd3",
    title: "Snow Wall",
    cap: "A short ice block ahead. There is still room to slip around it.",
  },
  rocket: {
    src: "assets/museum/rocket.jpg?v=gd3",
    title: "Yeet Rocket",
    cap: "A forward rocket with a long trail and a wide blast.",
  },
  star: {
    src: "assets/museum/star.jpg?v=gd3",
    title: "Star Thaw",
    cap: "A short sparkle. Hits and traps pass through you.",
  },
  orb: {
    src: "assets/museum/orb.jpg?v=gd3",
    title: "Blue Lodge Orb",
    cap: "Rare. Only while you are 1st or 2nd. A blue surge and a short push.",
  },
  bober: {
    src: "assets/museum/bober.jpg?v=gd11",
    title: "Bober",
    cap: "Chunky lodge beaver in the classic cedar cart. Amber scarf.",
  },
  muscle: {
    src: "assets/museum/muscle.jpg?v=gd11",
    title: "Muscle",
    cap: "Bulky beaver in a heavy armored hauler. Big rear wheels.",
  },
  tall: {
    src: "assets/museum/tall.jpg?v=gd11",
    title: "Tall Handsome",
    cap: "Tall lean beaver in a long sleek speed cart.",
  },
  nib: {
    src: "assets/museum/nib.jpg?v=gd11",
    title: "Nib",
    cap: "Small scrappy beaver on a light scrap cart.",
  },
};

function openExhibit(id) {
  const item = EXHIBITS[id];
  if (!item) return;
  document.getElementById("exhibit-img").src = item.src;
  document.getElementById("exhibit-title").textContent = item.title;
  document.getElementById("exhibit-cap").textContent = item.cap;
  exhibitEl.classList.remove("hidden");
}

function closeExhibit() {
  exhibitEl.classList.add("hidden");
}

document.querySelectorAll("[data-driver]").forEach((btn) => {
  btn.addEventListener("click", () => {
    if (race.phase !== "splash" && race.phase !== "podium") return;
    chooseDriver(race, btn.getAttribute("data-driver"));
    document.querySelectorAll("[data-driver]").forEach((b) => b.classList.toggle("on", b === btn));
  });
});
document.querySelectorAll("[data-track]").forEach((btn) => {
  btn.addEventListener("click", () => {
    if (race.phase !== "splash") return;
    swapTrack(race, btn.getAttribute("data-track"));
    world.setTrack(race.track);
    document.querySelectorAll("[data-track]").forEach((b) => b.classList.toggle("on", b === btn));
  });
});
document.getElementById("btn-how").addEventListener("click", () => {
  document.getElementById("how").classList.remove("hidden");
});
document.getElementById("btn-how-back").addEventListener("click", () => {
  document.getElementById("how").classList.add("hidden");
});
document.getElementById("btn-museum").addEventListener("click", () => {
  closeExhibit();
  museumEl.classList.remove("hidden");
  museumEl.querySelector("[data-exhibit]")?.focus();
});
document.getElementById("btn-museum-back").addEventListener("click", () => {
  closeExhibit();
  museumEl.classList.add("hidden");
});
document.querySelectorAll("[data-exhibit]").forEach((btn) => {
  btn.addEventListener("click", () => {
    openExhibit(btn.getAttribute("data-exhibit"));
    document.getElementById("btn-exhibit-close").focus();
  });
});
document.getElementById("exhibit-scrim").addEventListener("click", closeExhibit);
document.getElementById("btn-exhibit-close").addEventListener("click", closeExhibit);


function paintMinimap() {
  const canvas = document.getElementById("minimap");
  if (!canvas || canvas.classList.contains("hidden")) return;
  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  const frames = race.track.frames;
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (let i = 0; i < frames.length; i += 2) {
    const p = frames[i].p;
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.z < minZ) minZ = p.z;
    if (p.z > maxZ) maxZ = p.z;
  }
  const pad = 12;
  const spanX = Math.max(1, maxX - minX);
  const spanZ = Math.max(1, maxZ - minZ);
  const s = Math.min((w - pad * 2) / spanX, (h - pad * 2) / spanZ);
  const ox = (w - spanX * s) / 2;
  const oy = (h - spanZ * s) / 2;
  const pt = (x, z) => [ox + (x - minX) * s, oy + (maxZ - z) * s];
  ctx.beginPath();
  ctx.lineWidth = 4;
  ctx.strokeStyle = "#f0a024";
  for (let i = 0; i < frames.length; i += 3) {
    const [px, py] = pt(frames[i].p.x, frames[i].p.z);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.stroke();
  for (const k of race.karts) {
    const [px, py] = pt(k.x, k.z);
    ctx.fillStyle = k.color || "#f4e6c8";
    ctx.beginPath();
    ctx.arc(px, py, k.cpu ? 5 : 7, 0, Math.PI * 2);
    ctx.fill();
    if (!k.cpu) {
      ctx.strokeStyle = "#f4e6c8";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }
}

function hudTick() {
  const you = humanOf(race);
  document.getElementById("hud-place").textContent = livePlace(race, you.id) + "/" + race.karts.length;
  document.getElementById("hud-lap").textContent = "LAP " + lapOf(you) + "/" + LAPS;
  document.getElementById("hud-time").textContent = fmt(race.time);
  const fill = document.getElementById("spark-fill");
  const label = document.getElementById("spark-label");
  const pct = Math.round(you.spark * 100);
  fill.style.width = pct + "%";
  fill.classList.toggle("hot", you.spark >= 0.42);
  fill.classList.toggle("full", you.spark >= 0.75);
  if (you.boost > 0) label.textContent = "BOOST";
  else if (you.spark >= 0.75) label.textContent = "LET GO";
  else if (you.spark >= 0.42) label.textContent = "HOT";
  else label.textContent = "SPARK";
  const driftBtn = document.getElementById("btn-drift");
  if (driftBtn) driftBtn.textContent = you.spark >= 0.42 ? "LET GO" : "DRIFT";
  const fireBtn = document.getElementById("btn-fire");
  const labels = { sap: "SAP", trap: "TRAP", wall: "WALL", rocket: "ROCKET", star: "THAW", orb: "ORB" };
  fireBtn.textContent = you.held ? labels[you.held] || "FIRE" : you.fireCd > 0 ? "WAIT" : "FIRE";
  fireBtn.classList.toggle("armed", !!you.held && you.fireCd <= 0);
  const order = [...race.karts].sort((a, b) => b.progress - a.progress);
  document.getElementById("hud-order").textContent = order.map((k) => k.name).join("  ");
  paintMinimap();
  if (race.phase === "countdown") {
    countdownEl.classList.remove("hidden");
    const n = Math.max(1, Math.ceil(race.countdown));
    countdownEl.textContent = String(n);
    if (n !== ceilSeen) {
      ceilSeen = n;
      sfx.beep(n);
    }
  } else if (race.phase === "race" && race.time < 0.45) {
    countdownEl.classList.remove("hidden");
    countdownEl.textContent = "GO";
    if (ceilSeen !== 0) {
      ceilSeen = 0;
      sfx.beep(0);
    }
  } else {
    countdownEl.classList.add("hidden");
  }
  if (race.phase === "race" && (you.boost > 0 || race.time > 8)) {
    hintEl.classList.add("hidden");
    hinted = true;
  }
}

function frame(now) {
  const dt = Math.min(0.05, (now - lastTick) / 1000);
  lastTick = now;
  const inputs = {};
  for (const k of race.karts) {
    inputs[k.id] = k.cpu ? adviceFor(race, k.id) : youInput();
  }
  const pilot = humanOf(race);
  const beforeBoost = pilot.boost;
  stepRace(race, inputs, dt);
  const youNow = humanOf(race);
  if (youNow.boost > 0 && beforeBoost <= 0) {
    sfx.boost();
    if (navigator.vibrate) navigator.vibrate(12);
  }
  if (race.phase === "podium") showPodium();
  else podiumEl.classList.add("hidden");
  const you = humanOf(race);
  if (race.phase === "race" || race.phase === "countdown") sfx.engine(you.speed, you.boost > 0);
  hudTick();
  const portrait = window.innerHeight >= window.innerWidth;
  world.update(race, dt, portrait);
  requestAnimationFrame(frame);
}

window.addEventListener("resize", layout);
paintBest();
layout();
document.getElementById("btn-start").disabled = true;
world.ready.then(() => {
  const startBtn = document.getElementById("btn-start");
  startBtn.disabled = false;
  startBtn.textContent = "START";
  startBtn.focus();
});
const check = world.frameCheck();
window.__grand = {
  snapshot() {
    const you = humanOf(race);
    const stageBox = stage.getBoundingClientRect();
    return {
      phase: race.phase,
      time: race.time,
      countdown: race.countdown,
      driver: you.id,
      lap: lapOf(you),
      place: you.place || livePlace(race, you.id),
      progress: you.progress,
      laps: you.laps,
      speed: you.speed,
      spark: you.spark,
      boost: you.boost,
      x: you.x,
      z: you.z,
      yaw: you.yaw,
      finished: you.finished,
      held: you.held || "",
      lastFx: race.lastFx || "",
      track: race.track.id,
      lapTarget: LAPS,
      advice: adviceFor(race, you.id),
      stageH: stageBox.height,
      viewH: window.innerHeight,
      names: race.karts.map((k) => k.name),
      colors: race.karts.map((k) => k.color),
      model: world.modelOf(you.id).kind,
      sig: world.modelOf(you.id).sig,
    };
  },
  setDriver(id) {
    return chooseDriver(race, id);
  },
  setInput(inp) {
    scripted = inp;
  },
  setAuto(on) {
    auto = !!on;
    scripted = null;
  },
  selfTest,
  frameCheck: () => check,
  save,
  grant(id) {
    const you = humanOf(race);
    you.held = id;
    you.fireCd = 0;
    you.holdAge = 0;
    you.stun = 0;
  },
  fireNow() {
    const you = humanOf(race);
    return launchHeld(race, you);
  },
  setTrack(id) {
    swapTrack(race, id);
    world.setTrack(race.track);
  },
};
requestAnimationFrame(frame);
