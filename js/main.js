import * as THREE from "../vendor/three.module.js";
import {
  LAPS,
  adviceFor,
  createRace,
  createTrack,
  lapOf,
  livePlace,
  raceProgress,
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
} from "./sim.js?v=gd31";
import { createWorld } from "./world.js?v=gd31";
import { createSfx } from "./audio.js?v=gd21";

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

function blockZoom(e) {
  if (e.touches && e.touches.length > 1) e.preventDefault();
  if (e.ctrlKey) e.preventDefault();
}
document.addEventListener("touchmove", blockZoom, { passive: false });
document.addEventListener("gesturestart", (e) => e.preventDefault(), { passive: false });
document.addEventListener("gesturechange", (e) => e.preventDefault(), { passive: false });
window.addEventListener("wheel", (e) => { if (e.ctrlKey) e.preventDefault(); }, { passive: false });
stage.addEventListener("dblclick", (e) => e.preventDefault());

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
      drift: false,
      fire: takeFire(),
    };
  }
  return {
    // +steer yaws toward screen-left in the chase view. Left is +1.
    steer: keySteer,
    gas: !!held.gas && !held.brake,
    drift: false,
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
bindHold("desk-left", "left");
bindHold("desk-right", "right");
bindHold("desk-go", "gas");
bindHold("desk-brake", "brake");
document.getElementById("desk-fire").addEventListener("pointerdown", (e) => {
  e.preventDefault();
  firePulse = true;
  document.getElementById("desk-fire").classList.add("on");
});
document.getElementById("desk-fire").addEventListener("pointerup", () => {
  document.getElementById("desk-fire").classList.remove("on");
});
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

function showTrackStep() {
  document.getElementById("menu-track").classList.remove("hidden");
  document.getElementById("menu-beaver").classList.add("hidden");
  splashFocus = 0;
}

function showBeaverStep() {
  document.getElementById("menu-track").classList.add("hidden");
  document.getElementById("menu-beaver").classList.remove("hidden");
  splashFocus = 0;
}

function splashButtons() {
  const onTrack = !document.getElementById("menu-track").classList.contains("hidden");
  if (onTrack) {
    return [
      ...document.querySelectorAll("#track-pick [data-track]"),
      document.getElementById("btn-continue"),
      document.getElementById("btn-how"),
      document.getElementById("btn-museum"),
    ];
  }
  return [
    ...document.querySelectorAll("#roster-pick [data-driver]"),
    document.getElementById("btn-start"),
    document.getElementById("btn-beaver-back"),
  ];
}

function focusAt(list, index) {
  if (!list.length) return 0;
  const i = (index + list.length) % list.length;
  list[i].focus();
  return i;
}

let splashFocus = 9;

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
  };
  if (!map[e.code]) return;
  held[map[e.code]] = false;
});
document.getElementById("controls").addEventListener("selectstart", (e) => e.preventDefault());
document.getElementById("stage").addEventListener("selectstart", (e) => e.preventDefault());
document.getElementById("controls").addEventListener("contextmenu", (e) => e.preventDefault());

function layout() {
  const wide = window.innerWidth >= 900;
  const portrait = window.innerHeight >= window.innerWidth;
  app.classList.toggle("portrait", portrait);
  const rect = stage.getBoundingClientRect();
  const w = wide ? window.innerWidth : rect.width;
  const h = wide ? window.innerHeight : rect.height;
  world.resize(w, h, w < 700 ? 1.5 : 2);
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
  hintEl.textContent = "Drive through a box. FIRE uses what you hold.";
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
document.getElementById("btn-continue").addEventListener("click", () => {
  showBeaverStep();
  document.querySelector("#roster-pick .who.on")?.focus();
});
document.getElementById("btn-beaver-back").addEventListener("click", () => {
  showTrackStep();
  document.querySelector("#track-pick .on")?.focus();
});
document.getElementById("btn-splash").addEventListener("click", () => {
  race.phase = "splash";
  showTrackStep();
  showRaceChrome(false);
  paintBest();
  layout();
});
document.getElementById("btn-quit").addEventListener("click", () => {
  race.phase = "splash";
  showTrackStep();
  showRaceChrome(false);
  paintBest();
  sfx.stop();
  layout();
});
const EXHIBITS = {
  "dam-loop": {
    src: "assets/history/dam-loop.jpg?v=gd12",
    title: "Dam Loop",
    cap: "The crest road, the bank, the spillway. Three laps. The line is the crest.",
  },
  "frost-ridge": {
    src: "assets/history/frost-ridge.jpg?v=gd12",
    title: "Frost Ridge",
    cap: "Ice, banks, and two narrow bridges. Same three laps. Same four racers.",
  },
  "crown-clover": {
    src: "assets/museum/crown-clover.jpg?v=gd21",
    title: "Crown Clover",
    cap: "A figure-eight. One pass is a bridge over the cross. Tight apexes, three laps.",
  },
  "oasis-leap": {
    src: "assets/museum/oasis-leap.jpg?v=gd21",
    title: "Oasis Leap",
    cap: "Two ramps. You leave the lip, arc, and land on the deck. The pools under the holes are real.",
  },
  "sky-loop": {
    src: "assets/museum/sky-loop.jpg?v=gd21",
    title: "Sky Loop 360",
    cap: "A full loop overhead. Carry speed or you fall. The camera stays upright.",
  },
  "sling-kart": {
    src: "assets/history/crest-drift.jpg?v=gd12",
    title: "Cedar Sling",
    cap: "Cedar bowl. Twin sling bands on the rear posts.",
  },
  boost: {
    src: "assets/museum/star.jpg?v=gd21",
    title: "BOOST",
    cap: "A short amber burst. FIRE spends it for a faster straight.",
  },
  trap: {
    src: "assets/museum/trap.jpg?v=gd21",
    title: "Stick Trap",
    cap: "Drops behind the bowl. The next racer through it stops short.",
  },
  pine: {
    src: "assets/museum/sap.jpg?v=gd21",
    title: "Pinecone Barrage",
    cap: "Five cones fan ahead. Each one that lands stuns.",
  },
  surge: {
    src: "assets/museum/orb.jpg?v=gd21",
    title: "Dam Surge",
    cap: "A blue water wall runs the road and shoves racers aside.",
  },
  magnet: {
    src: "assets/museum/twig.jpg?v=gd21",
    title: "Lodge Magnet",
    cap: "Latches the nearest racer ahead and hauls them back.",
  },
  buckler: {
    src: "assets/museum/wall.jpg?v=gd21",
    title: "Bark Buckler",
    cap: "A bark shield. It blocks one hit and shoves anyone too close.",
  },
  meteor: {
    src: "assets/museum/bomb.jpg?v=gd21",
    title: "Meteor Chip",
    cap: "Drops on the line ahead. Wide stun, then a crater of light.",
  },
  slick: {
    src: "assets/museum/rocket.jpg?v=gd21",
    title: "Resin Slick",
    cap: "An amber patch behind you. Drive through it and you slow down.",
  },
  bober: {
    src: "assets/museum/bober.jpg?v=gd12",
    title: "Bober",
    cap: "Chunky lodge beaver in the classic cedar cart. Amber scarf.",
  },
  muscle: {
    src: "assets/museum/muscle.jpg?v=gd21",
    title: "Muscle",
    cap: "Bulky beaver in a heavy armored hauler. Big rear wheels.",
  },
  tall: {
    src: "assets/museum/tall.jpg?v=gd21",
    title: "Tall Handsome",
    cap: "Tall lean beaver in a long sleek speed cart.",
  },
  nib: {
    src: "assets/museum/nib.jpg?v=gd12",
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
  ctx.lineWidth = 4;
  ctx.lineJoin = "round";
  let drawing = false;
  let style = "";
  const step = 2;
  for (let i = 0; i < frames.length; i += step) {
    const fr = frames[i];
    const nxt = frames[(i + step) % frames.length];
    const [px, py] = pt(fr.p.x, fr.p.z);
    if (fr.gap || nxt.gap) {
      if (drawing) ctx.stroke();
      drawing = false;
      continue;
    }
    const nextStyle = fr.loop ? "#7ec8e3" : fr.bridge ? "#f4e6c8" : "#f0a024";
    if (!drawing) {
      ctx.beginPath();
      ctx.strokeStyle = nextStyle;
      style = nextStyle;
      ctx.moveTo(px, py);
      drawing = true;
    } else if (nextStyle !== style) {
      ctx.lineTo(px, py);
      ctx.stroke();
      ctx.beginPath();
      ctx.strokeStyle = nextStyle;
      style = nextStyle;
      ctx.moveTo(px, py);
    } else ctx.lineTo(px, py);
  }
  if (drawing) ctx.stroke();
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
  const fireBtn = document.getElementById("btn-fire");
  const deskFire = document.getElementById("desk-fire");
  const labels = { boost: "BOOST", trap: "TRAP", pine: "PINE", surge: "SURGE", magnet: "MAGNET", buckler: "BARK", meteor: "METEOR", slick: "SLICK" };
  const full = { boost: "BOOST", trap: "Stick Trap", pine: "Pinecone Barrage", surge: "Dam Surge", magnet: "Lodge Magnet", buckler: "Bark Buckler", meteor: "Meteor Chip", slick: "Resin Slick" };
  const mark = document.getElementById("held-mark");
  const name = document.getElementById("held-name");
  const heldBox = document.getElementById("held");
  const tag = you.held ? labels[you.held] || "—" : "—";
  if (mark) mark.textContent = tag;
  if (name) name.textContent = you.held ? full[you.held] || tag : "—";
  if (heldBox) {
    heldBox.classList.toggle("empty", !you.held);
    heldBox.classList.toggle("ready", !!you.held && you.fireCd <= 0);
    heldBox.classList.toggle("got", (you.got || 0) > 0);
  }
  const juice = document.getElementById("juice");
  if (juice && race.flash) {
    const kind = race.flash;
    race.flash = "";
    juice.className = "";
    void juice.offsetWidth;
    juice.className = "pop " + kind;
  }
  const fireLabel = you.held ? labels[you.held] || "—" : "—";
  fireBtn.textContent = fireLabel;
  fireBtn.classList.toggle("armed", !!you.held && you.fireCd <= 0);
  if (deskFire) {
    deskFire.textContent = fireLabel;
    deskFire.classList.toggle("armed", !!you.held && you.fireCd <= 0);
  }
  const order = [...race.karts].sort((a, b) => raceProgress(b) - raceProgress(a));
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
      y: you.y,
      grounded: !!you.grounded,
      splash: you.splash || 0,
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
  sightClear(x, y, z) {
    return world.sightClear(x, y, z);
  },
};
requestAnimationFrame(frame);
