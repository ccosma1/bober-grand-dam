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
  swapTrack,
  writeSave,
} from "./sim.js?v=gd3";
import { createWorld } from "./world.js?v=gd3";
import { createSfx } from "./audio.js?v=gd3";

const app = document.getElementById("app");
const stage = document.getElementById("stage");
const splash = document.getElementById("splash");
const controls = document.getElementById("controls");
const hud = document.getElementById("hud");
const countdownEl = document.getElementById("countdown");
const hintEl = document.getElementById("hint");
const historyEl = document.getElementById("history");
const stillEl = document.getElementById("still");
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
const held = { left: false, right: false, gas: false, drift: false };

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
  if (auto) return adviceFor(race, "you");
  return {
    // +steer yaws toward screen-left in the chase view. Left is +1.
    steer: (held.left ? 1 : 0) - (held.right ? 1 : 0),
    gas: !!held.gas,
    drift: !!held.drift,
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
bindHold("btn-left", "left");
bindHold("btn-right", "right");
bindHold("btn-drift", "drift");
bindHold("btn-gas", "gas");
document.getElementById("btn-fire").addEventListener("pointerdown", (e) => {
  e.preventDefault();
  firePulse = true;
  document.getElementById("btn-fire").classList.add("on");
});
document.getElementById("btn-fire").addEventListener("pointerup", () => {
  document.getElementById("btn-fire").classList.remove("on");
});

window.addEventListener("keydown", (e) => {
  const map = {
    ArrowLeft: "left",
    KeyA: "left",
    ArrowRight: "right",
    KeyD: "right",
    ArrowUp: "gas",
    KeyW: "gas",
    KeyF: "fire",
    Space: "drift",
    ShiftLeft: "drift",
    ShiftRight: "drift",
  };
  if (!map[e.code]) return;
  e.preventDefault();
  if (map[e.code] === "fire") firePulse = true;
  else held[map[e.code]] = true;
});
window.addEventListener("keyup", (e) => {
  const map = {
    ArrowLeft: "left",
    KeyA: "left",
    ArrowRight: "right",
    KeyD: "right",
    ArrowUp: "gas",
    KeyW: "gas",
    KeyF: "fire",
    Space: "drift",
    ShiftLeft: "drift",
    ShiftRight: "drift",
  };
  if (!map[e.code]) return;
  held[map[e.code]] = false;
});

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
  historyEl.classList.add("hidden");
  museumEl.classList.add("hidden");
  stillEl.classList.add("hidden");
  exhibitEl.classList.add("hidden");
  hintEl.classList.remove("hidden");
  hintEl.textContent = "Hold a turn. Let go when it sparks.";
  layout();
}

function showPodium() {
  const you = race.karts.find((k) => k.id === "you");
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
    if (k.id === "you") li.classList.add("me");
    list.appendChild(li);
  }
  document.getElementById("podium-best").textContent =
    "Best " + placeWord(save.bestPlace) + " · " + fmt(save.bestTime);
  podiumEl.classList.remove("hidden");
  sfx.stop();
}

const STILLS = {
  "dam-loop": {
    src: "assets/history/dam-loop.jpg?v=gd1",
    title: "Dam Loop",
    cap: "One crest, one bank, one spillway. The line is the crest. Three laps.",
  },
  "crest-drift": {
    src: "assets/history/crest-drift.jpg?v=gd1",
    title: "Crest drift",
    cap: "Hold the turn until the bands spark. Let go and the bowl kicks up the face.",
  },
};

function openStill(id) {
  const s = STILLS[id];
  document.getElementById("still-img").src = s.src;
  document.getElementById("still-title").textContent = s.title;
  document.getElementById("still-cap").textContent = s.cap;
  stillEl.classList.remove("hidden");
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
document.getElementById("btn-history").addEventListener("click", () => {
  historyEl.classList.remove("hidden");
});
document.getElementById("btn-history-back").addEventListener("click", () => {
  historyEl.classList.add("hidden");
  stillEl.classList.add("hidden");
});
document.getElementById("btn-still-back").addEventListener("click", () => {
  stillEl.classList.add("hidden");
});
const EXHIBITS = {
  "dam-loop": {
    src: "assets/museum/dam-loop.jpg?v=gd2",
    title: "Dam Loop",
    cap: "The only circuit. Three laps. The line is the crest.",
  },
  "sling-kart": {
    src: "assets/museum/sling-kart.jpg?v=gd2",
    title: "Sling Kart",
    cap: "Cedar bowl. Twin sling bands on the rear posts. Hold a turn until the bands spark, then let go.",
  },
  "frost-ridge": {
    src: "assets/museum/frost-ridge.jpg?v=gd3",
    title: "Frost Ridge",
    cap: "Ice, drifts, and two narrow bridges. Same three laps. Same four racers.",
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
});
document.getElementById("btn-museum-back").addEventListener("click", () => {
  closeExhibit();
  museumEl.classList.add("hidden");
});
document.querySelectorAll("[data-exhibit]").forEach((btn) => {
  btn.addEventListener("click", () => openExhibit(btn.getAttribute("data-exhibit")));
});
document.getElementById("exhibit-scrim").addEventListener("click", closeExhibit);
document.getElementById("btn-exhibit-close").addEventListener("click", closeExhibit);
document.querySelectorAll("[data-still]").forEach((btn) => {
  btn.addEventListener("click", () => openStill(btn.getAttribute("data-still")));
});

function hudTick() {
  const you = race.karts.find((k) => k.id === "you");
  document.getElementById("hud-place").textContent = livePlace(race, "you") + "/" + race.karts.length;
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
  driftBtn.textContent = you.spark >= 0.42 ? "LET GO" : "DRIFT";
  const fireBtn = document.getElementById("btn-fire");
  const labels = { sap: "SAP", trap: "TRAP", wall: "WALL", rocket: "ROCKET", star: "THAW", orb: "ORB" };
  fireBtn.textContent = you.held ? labels[you.held] || "FIRE" : you.fireCd > 0 ? "WAIT" : "FIRE";
  fireBtn.classList.toggle("armed", !!you.held && you.fireCd <= 0);
  const order = [...race.karts].sort((a, b) => b.progress - a.progress);
  document.getElementById("hud-order").textContent = order.map((k) => k.name).join("  ");
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
  const beforeBoost = race.karts[0].boost;
  stepRace(race, inputs, dt);
  if (race.karts[0].boost > 0 && beforeBoost <= 0) {
    sfx.boost();
    if (navigator.vibrate) navigator.vibrate(12);
  }
  if (race.phase === "podium") showPodium();
  else podiumEl.classList.add("hidden");
  const you = race.karts[0];
  if (race.phase === "race" || race.phase === "countdown") sfx.engine(you.speed, you.boost > 0);
  hudTick();
  const portrait = window.innerHeight >= window.innerWidth;
  world.update(race, dt, portrait);
  requestAnimationFrame(frame);
}

window.addEventListener("resize", layout);
paintBest();
layout();
const check = world.frameCheck();
window.__grand = {
  snapshot() {
    const you = race.karts.find((k) => k.id === "you");
    const stageBox = stage.getBoundingClientRect();
    return {
      phase: race.phase,
      time: race.time,
      countdown: race.countdown,
      lap: lapOf(you),
      place: you.place || livePlace(race, "you"),
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
      advice: adviceFor(race, "you"),
      stageH: stageBox.height,
      viewH: window.innerHeight,
      names: race.karts.map((k) => k.name),
    };
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
    const you = race.karts.find((k) => k.id === "you");
    you.held = id;
    you.fireCd = 0;
    you.holdAge = 0;
    you.stun = 0;
  },
  fireNow() {
    const you = race.karts.find((k) => k.id === "you");
    return launchHeld(race, you);
  },
  setTrack(id) {
    swapTrack(race, id);
    world.setTrack(race.track);
  },
};
requestAnimationFrame(frame);
