/* Race sim. No rendering.
   yaw 0 faces +z. yaw > 0 turns toward +x (screen-left in the chase view).
   forward = (sin(yaw), 0, cos(yaw)). */
import { launchHeld, seedItems, stepItems, testItems } from "./items.js?v=gd13";
export { launchHeld };

export const LAPS = 3;
export const SAVE_KEY = "bober-grand-dam-v1";
export const DNF_TIME = 420;
const SECTORS = 8;

export const ROSTER = [
  { id: "bober", name: "BOBER", scarf: 0xe6a322, color: "#e6a322", lane: -0.36, style: "clean", handle: 1 },
  { id: "muscle", name: "MUSCLE", scarf: 0xb6402a, color: "#b6402a", lane: 0.4, style: "clean", handle: 0.78 },
  { id: "tall", name: "TALL", scarf: 0x7eb6d6, color: "#7eb6d6", lane: -0.22, style: "wide", handle: 1.08 },
  { id: "nib", name: "NIB", scarf: 0x3e7a45, color: "#3e7a45", lane: 0.22, style: "spark", handle: 1.34 },
];

/* Shorter bowls. Dam's west lip climbs into two airborne samples, then a low deck.
   Gap samples are not road. Frost keeps two side bridges and no jump. */
const DAM_RAW = [
  { x: -92, z: -153, y: 12.4 },
  { x: -42, z: -158, y: 12.6 },
  { x: 11, z: -156, y: 12.0 },
  { x: 63, z: -143, y: 10.6 },
  { x: 111, z: -119, y: 8.2 },
  { x: 148, z: -84, y: 5.8 },
  { x: 169, z: -50, y: 3.8 },
  { x: 180, z: -11, y: 3.2 },
  { x: 174, z: 26, y: 3.05 },
  { x: 161, z: 61, y: 3.0 },
  { x: 137, z: 92, y: 3.02 },
  { x: 106, z: 119, y: 3.08 },
  { x: 82, z: 129, y: 3.1, bridge: true },
  { x: 32, z: 143, y: 3.15, bridge: true },
  { x: -21, z: 145, y: 3.15, bridge: true },
  { x: -71, z: 137, y: 3.2, bridge: true },
  { x: -116, z: 114, y: 3.45, bridge: true },
  { x: -145, z: 85, y: 4.6 },
  { x: -164, z: 58, y: 6.2 },
  { x: -177, z: 40, y: 7.6 },
  { x: -185, z: 24, y: 9.0 },
  { x: -187, z: 11, y: 10.2, lip: true },
  { x: -183, z: 2, y: 13.8, gap: true },
  { x: -177, z: -6, y: 13.2, gap: true },
  { x: -169, z: -13, y: 6.15, deck: true },
  { x: -157, z: -29, y: 6.25, deck: true },
  { x: -129, z: -69, y: 8.2 },
  { x: -103, z: -106, y: 10.4 },
  { x: -92, z: -132, y: 11.6 },
];

const FROST_RAW = [
  { x: -74, z: -142, y: 12.2 },
  { x: -28, z: -150, y: 12.6 },
  { x: 20, z: -148, y: 12.0 },
  { x: 66, z: -132, y: 10.6 },
  { x: 104, z: -104, y: 8.8 },
  { x: 132, z: -66, y: 7.2 },
  { x: 142, z: -26, y: 6.4, bridge: true },
  { x: 132, z: 16, y: 6.3, bridge: true },
  { x: 106, z: 54, y: 6.8 },
  { x: 66, z: 86, y: 7.6 },
  { x: 20, z: 106, y: 8.4 },
  { x: -28, z: 114, y: 8.8 },
  { x: -74, z: 104, y: 8.0 },
  { x: -112, z: 74, y: 7.0 },
  { x: -132, z: 34, y: 6.5, bridge: true },
  { x: -130, z: -10, y: 6.8, bridge: true },
  { x: -112, z: -54, y: 8.4 },
  { x: -86, z: -100, y: 10.6 },
];

const MAX_SPEED = 29;
const ACCEL = 24;
const SPARK_MIN = 0.42;

export function wrapAngle(a) {
  let x = a;
  while (x > Math.PI) x -= Math.PI * 2;
  while (x < -Math.PI) x += Math.PI * 2;
  return x;
}

export function forward(yaw) {
  return { x: Math.sin(yaw), z: Math.cos(yaw) };
}

function sub(a, b) {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}
function add(a, b) {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}
function mul(a, s) {
  return { x: a.x * s, y: a.y * s, z: a.z * s };
}
function dot(a, b) {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}
function len(a) {
  return Math.hypot(a.x, a.y, a.z);
}
function norm(a) {
  const l = len(a) || 1;
  return mul(a, 1 / l);
}
function cross(a, b) {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

function cr(p0, p1, p2, p3, t) {
  const t2 = t * t;
  const t3 = t2 * t;
  const x =
    0.5 *
    (2 * p1.x +
      (-p0.x + p2.x) * t +
      (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
      (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3);
  const y =
    0.5 *
    (2 * p1.y +
      (-p0.y + p2.y) * t +
      (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
      (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3);
  const z =
    0.5 *
    (2 * p1.z +
      (-p0.z + p2.z) * t +
      (2 * p0.z - 5 * p1.z + 4 * p2.z - p3.z) * t2 +
      (-p0.z + 3 * p1.z - 3 * p2.z + p3.z) * t3);
  return { x, y, z };
}

export function createTrack(id = "dam") {
  const raw = id === "frost" ? FROST_RAW : DAM_RAW;
  const n = raw.length;
  const per = 16;
  const pts = [];
  for (let i = 0; i < n; i++) {
    const p0 = raw[(i - 1 + n) % n];
    const p1 = raw[i];
    const p2 = raw[(i + 1) % n];
    const p3 = raw[(i + 2) % n];
    for (let s = 0; s < per; s++) {
      const sample = cr(p0, p1, p2, p3, s / per);
      sample.bridge = !!p1.bridge;
      sample.gap = !!p1.gap;
      sample.lip = !!p1.lip;
      sample.deck = !!p1.deck;
      pts.push(sample);
    }
  }
  const frames = [];
  let length = 0;
  for (let i = 0; i < pts.length; i++) {
    const prev = pts[(i - 1 + pts.length) % pts.length];
    const next = pts[(i + 1) % pts.length];
    const tangent = norm(sub(next, prev));
    const up = { x: 0, y: 1, z: 0 };
    let right = cross(up, tangent);
    if (len(right) < 0.2) right = { x: 1, y: 0, z: 0 };
    right = norm(right);
    const ds = Math.hypot(next.x - pts[i].x, next.z - pts[i].z);
    frames.push({
      p: pts[i],
      tangent,
      right,
      t: 0,
      dist: 0,
      curvature: 0,
      bank: 0,
      width: 8,
      ds,
      bridge: !!pts[i].bridge,
      gap: !!pts[i].gap,
      lip: !!pts[i].lip,
      deck: !!pts[i].deck,
    });
  }
  for (let i = 0; i < frames.length; i++) {
    const a = frames[i].p;
    const b = frames[(i + 1) % frames.length].p;
    const step = Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
    frames[i].ds = step;
    if (i > 0) length += frames[i - 1].ds;
    frames[i].dist = i === 0 ? 0 : length;
  }
  length += frames[frames.length - 1].ds;
  for (let i = 0; i < frames.length; i++) {
    frames[i].t = frames[i].dist / length;
    const h0 = Math.atan2(frames[i].tangent.x, frames[i].tangent.z);
    const h1 = Math.atan2(
      frames[(i + 1) % frames.length].tangent.x,
      frames[(i + 1) % frames.length].tangent.z
    );
    const dh = wrapAngle(h1 - h0);
    const curv = dh / Math.max(0.4, frames[i].ds);
    frames[i].curvature = curv;
    frames[i].bank = Math.max(-0.22, Math.min(0.22, -curv * 7));
    const p = frames[i].p;
    let w = id === "frost" ? 9.4 : 11.4;
    if (frames[i].bridge) w = id === "frost" ? 8.4 : 10.6;
    if (frames[i].lip || frames[i].deck) w = Math.max(w, id === "frost" ? 10 : 13.2);
    if (id === "frost" && p.y > 11) w = Math.max(w, 10.6);
    if (id !== "frost" && p.y > 10) w = Math.max(w, 12.4);
    if (Math.abs(curv) > 0.007) w = Math.max(w, id === "frost" ? 11.2 : 13.4);
    frames[i].width = w;
    const raised = frames[i].bridge || frames[i].lip || frames[i].deck || frames[i].p.y > 7.2;
    frames[i].rail = !frames[i].gap && raised;
    frames[i].shoulder = !frames[i].gap && !frames[i].rail;
  }
  let cx = 0;
  let cz = 0;
  for (const f of frames) {
    cx += f.p.x;
    cz += f.p.z;
  }
  const track = {
    id,
    name: id === "frost" ? "Frost Ridge" : "Dam Loop",
    theme: id === "frost" ? "frost" : "dam",
    frames,
    length,
    samples: frames.length,
    cx: cx / frames.length,
    cz: cz / frames.length,
  };
  track.waters = buildWaters(track);
  buildDress(track);
  return track;
}

function buildWaters(track) {
  const frames = track.frames;
  const waters = [];
  let run = [];
  const flush = () => {
    if (run.length >= 8) {
      let minX = Infinity;
      let maxX = -Infinity;
      let minZ = Infinity;
      let maxZ = -Infinity;
      let minY = Infinity;
      for (const f of run) {
        minX = Math.min(minX, f.p.x);
        maxX = Math.max(maxX, f.p.x);
        minZ = Math.min(minZ, f.p.z);
        maxZ = Math.max(maxZ, f.p.z);
        minY = Math.min(minY, f.p.y);
      }
      waters.push({
        id: "span" + waters.length,
        kind: "box",
        x: (minX + maxX) / 2,
        z: (minZ + maxZ) / 2,
        y: Math.max(0.35, minY - 2.55),
        hx: (maxX - minX) / 2 + 7,
        hz: (maxZ - minZ) / 2 + 6.5,
      });
    }
    run = [];
  };
  for (const f of frames) {
    if (f.bridge) run.push(f);
    else flush();
  }
  flush();
  if (track.id !== "dam") return waters;
  const hole = frames.filter((f) => f.gap || f.lip || f.deck);
  if (hole.length) {
    let minX = Infinity;
    let maxX = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;
    for (const f of hole) {
      minX = Math.min(minX, f.p.x);
      maxX = Math.max(maxX, f.p.x);
      minZ = Math.min(minZ, f.p.z);
      maxZ = Math.max(maxZ, f.p.z);
    }
    waters.push({
      id: "plunge",
      kind: "box",
      x: (minX + maxX) / 2,
      z: (minZ + maxZ) / 2,
      y: 0.82,
      hx: (maxX - minX) / 2 + 8,
      hz: (maxZ - minZ) / 2 + 6,
    });
  }
  let crest = frames.find((f) => !f.gap && !f.lip && !f.deck) || frames[0];
  for (const f of frames) {
    if (f.gap || f.lip || f.deck) continue;
    if (f.p.y > crest.p.y) crest = f;
  }
  const ox = crest.p.x - track.cx;
  const oz = crest.p.z - track.cz;
  const ol = Math.hypot(ox, oz) || 1;
  waters.push({
    id: "reservoir",
    kind: "box",
    x: crest.p.x + (ox / ol) * 32,
    z: crest.p.z + (oz / ol) * 32,
    y: crest.p.y - 2.6,
    hx: 26,
    hz: 16,
  });
  let minD = Infinity;
  for (const f of frames) minD = Math.min(minD, Math.hypot(f.p.x - track.cx, f.p.z - track.cz));
  waters.push({
    id: "pond",
    kind: "circle",
    x: track.cx,
    z: track.cz,
    y: 0.32,
    r: Math.max(6, Math.min(13, minD - 11)),
  });
  return waters;
}

function roadClear(frames, x, z, extra) {
  let best = Infinity;
  let lat = 0;
  let half = 0;
  for (const f of frames) {
    const d = (f.p.x - x) * (f.p.x - x) + (f.p.z - z) * (f.p.z - z);
    if (d < best) {
      best = d;
      lat = Math.abs((x - f.p.x) * f.right.x + (z - f.p.z) * f.right.z);
      half = f.width * 0.5;
    }
  }
  return lat > half + extra;
}

function buildDress(track) {
  const frames = track.frames;
  const frost = track.theme === "frost";
  const trees = [];
  const rocks = [];
  const lodges = [];
  const solids = [];
  for (let i = 0; i < frames.length; i += frost ? 8 : 6) {
    const fr = frames[i];
    if (fr.gap || fr.bridge || fr.lip || fr.deck) continue;
    for (const side of [-1, 1]) {
      if (side > 0 && i % 12 !== 0) continue;
      const dist = fr.width * 0.5 + (frost ? 14 : 12) + (i % 4);
      const x = fr.p.x + fr.right.x * dist * side;
      const z = fr.p.z + fr.right.z * dist * side;
      if (!roadClear(frames, x, z, frost ? 3.4 : 1.6)) continue;
      if (frost) {
        rocks.push({ x, z, y: fr.p.y, h: 7.5 + (i % 4) * 1.4, yaw: Math.atan2(fr.tangent.x, fr.tangent.z) });
        solids.push({ x, z, r: 3.1 });
      } else {
        trees.push({ x, z, s: 0.92 + (i % 5) * 0.1 });
        solids.push({ x, z, r: 0.8 });
      }
    }
  }
  if (!frost) {
    let nLodge = 0;
    for (let i = 10; i < frames.length && nLodge < 4; i += 36) {
      const fr = frames[i];
      if (fr.bridge || fr.gap || fr.lip || fr.deck || fr.p.y > 7) continue;
      const dx = track.cx - fr.p.x;
      const dz = track.cz - fr.p.z;
      const dl = Math.hypot(dx, dz) || 1;
      const x = fr.p.x + (dx / dl) * (fr.width * 0.5 + 16);
      const z = fr.p.z + (dz / dl) * (fr.width * 0.5 + 16);
      if (Math.hypot(x - track.cx, z - track.cz) < 14) continue;
      if (!roadClear(frames, x, z, 4)) continue;
      lodges.push({ x, z, yaw: Math.atan2(dx, dz) });
      solids.push({ x, z, r: 3.3 });
      nLodge += 1;
    }
    for (let i = 0; i < frames.length; i += 18) {
      const fr = frames[i];
      if (fr.gap || fr.bridge || fr.lip || fr.deck) continue;
      const side = i % 36 === 0 ? 1 : -1;
      const x = fr.p.x + fr.right.x * (fr.width * 0.5 + 6.8) * side;
      const z = fr.p.z + fr.right.z * (fr.width * 0.5 + 6.8) * side;
      if (!roadClear(frames, x, z, 2.2)) continue;
      rocks.push({ x, z, s: 1.15 + (i % 3) * 0.25 });
      solids.push({ x, z, r: 1.35 });
    }
  }
  track.trees = trees;
  track.rocks = rocks;
  track.lodges = lodges;
  track.solids = solids;
}

function frameIndex(track, t) {
  const f = track.frames;
  const tt = ((t % 1) + 1) % 1;
  let lo = 0;
  let hi = f.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (f[mid].t < tt) lo = mid + 1;
    else hi = mid;
  }
  return lo % f.length;
}

export function frameAt(track, t) {
  return track.frames[frameIndex(track, t)];
}

function nearest(track, x, z, hint) {
  const f = track.frames;
  const n = f.length;
  let start = hint == null ? 0 : hint;
  let best = start;
  let bestD = Infinity;
  const span = hint == null ? n : 24;
  const nearSeam = hint != null && (start < 16 || start > n - 16);
  for (let k = -span; k <= span; k++) {
    const raw = start + k;
    if (hint != null && (raw < 0 || raw >= n) && !nearSeam) continue;
    const i = (raw % n + n) % n;
    const dx = f[i].p.x - x;
    const dz = f[i].p.z - z;
    const d = dx * dx + dz * dz;
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  if (hint != null && bestD > 18 * 18) {
    return nearest(track, x, z, null);
  }
  return { index: best, dist2: bestD, frame: f[best] };
}

function blankKart(def, track, slot) {
  const t = slot;
  const frame = frameAt(track, t);
  const lateral = def.lane * frame.width * 0.5;
  const yaw = Math.atan2(frame.tangent.x, frame.tangent.z);
  return {
    id: def.id,
    name: def.name,
    scarf: def.scarf,
    color: def.color,
    handle: def.handle || 1,
    cpu: def.cpu,
    lane: def.lane,
    style: def.style,
    x: frame.p.x + frame.right.x * lateral,
    y: frame.p.y,
    z: frame.p.z + frame.right.z * lateral,
    yaw,
    vx: 0,
    vy: 0,
    vz: 0,
    speed: 0,
    grounded: true,
    air: 0,
    off: 0,
    wet: 0,
    splash: 0,
    safeHint: frameIndex(track, t),
    respawnCd: 0,
    spark: 0,
    drifting: false,
    boost: 0,
    boostPow: 0,
    steerHold: 0,
    stuck: 0,
    t,
    hint: frameIndex(track, t),
    sector: sectorOf(t),
    seenHalf: false,
    laps: 0,
    progress: t,
    finished: false,
    crossed: false,
    finishTime: 0,
    place: 0,
    slip: 0,
    held: null,
    holdAge: 0,
    fireCd: 0,
    stun: 0,
    invuln: 0,
    orb: 0,
  };
}

function sectorOf(t) {
  const tt = ((t % 1) + 1) % 1;
  const s = Math.floor(tt * SECTORS);
  return s >= SECTORS ? 0 : s;
}

function advanceSector(kart) {
  const s = sectorOf(kart.t);
  if (s === kart.sector) return;
  for (let step = 0; step < 3; step++) {
    if (kart.sector === s) return;
    const ahead = (kart.sector + 1) % SECTORS;
    const ahead2 = (kart.sector + 2) % SECTORS;
    const ahead3 = (kart.sector + 3) % SECTORS;
    const back = (kart.sector + SECTORS - 1) % SECTORS;
    if (s !== ahead && s !== ahead2 && s !== ahead3) {
      if (s === back) kart.sector = s;
      return;
    }
    if (ahead === 4 || kart.sector === 3) kart.seenHalf = true;
    if (kart.sector === SECTORS - 1 && ahead === 0 && kart.seenHalf) {
      kart.laps += 1;
      kart.seenHalf = false;
    }
    kart.sector = ahead;
  }
}

const GRID = [0.024, 0.024, 0.007, 0.007];

export function humanOf(race) {
  return race.karts.find((k) => !k.cpu) || race.karts[0];
}

export function spawnKarts(track, driverId) {
  const driver = ROSTER.some((r) => r.id === driverId) ? driverId : "bober";
  return ROSTER.map((def, i) =>
    blankKart({ ...def, cpu: def.id !== driver }, track, GRID[i])
  );
}

export function createRace(track, driverId = "bober") {
  const race = {
    phase: "splash",
    countdown: 3,
    time: 0,
    places: [],
    driver: ROSTER.some((r) => r.id === driverId) ? driverId : "bober",
    karts: [],
    track,
  };
  race.karts = spawnKarts(track, race.driver);
  seedItems(race);
  return race;
}

export function resetRace(race) {
  race.phase = "countdown";
  race.countdown = 3;
  race.time = 0;
  race.places = [];
  race.karts = spawnKarts(race.track, race.driver);
  seedItems(race);
}

export function setDriver(race, id) {
  if (!ROSTER.some((r) => r.id === id)) return race.driver;
  race.driver = id;
  if (race.phase === "splash" || race.phase === "podium") {
    race.karts = spawnKarts(race.track, id);
    seedItems(race);
  }
  return race.driver;
}

export function swapTrack(race, id) {
  race.track = createTrack(id);
  race.phase = "splash";
  race.countdown = 3;
  race.time = 0;
  race.places = [];
  race.karts = spawnKarts(race.track, race.driver);
  seedItems(race);
}

function integrate(kart, input, dt) {
  if (kart.fireCd > 0) kart.fireCd = Math.max(0, kart.fireCd - dt);
  if (kart.invuln > 0) kart.invuln = Math.max(0, kart.invuln - dt);
  if (kart.orb > 0) kart.orb = Math.max(0, kart.orb - dt);
  let steerMul = 1;
  if (kart.stun > 0) {
    kart.stun = Math.max(0, kart.stun - dt);
    steerMul = 0.22;
  }
  const steer = Math.max(-1, Math.min(1, input.steer || 0));
  const gas = Math.max(0, Math.min(1, Number(input.gas) || 0));
  const brake = input.brake ? 1 : 0;
  const speed = Math.hypot(kart.vx, kart.vz);
  const turning = Math.abs(steer) > 0.42;
  kart.steerHold = turning ? kart.steerHold + dt : 0;
  const wantDrift =
    turning &&
    speed > 9 &&
    (input.drift || kart.steerHold > 0.1);
  const was = kart.drifting;
  kart.drifting = wantDrift;

  const steerRate =
    (kart.drifting ? 3.15 : 2.45) *
    (0.62 + 0.38 * (1 - Math.min(1, speed / MAX_SPEED))) *
    (kart.handle || 1);
  kart.yaw = wrapAngle(kart.yaw + steer * steerMul * steerRate * dt);

  const f = forward(kart.yaw);
  const accel = ACCEL * (kart.cpu ? 0.84 : 1) * (kart.stun > 0 ? 0.3 : 1) * (kart.orb > 0 ? 1.12 : 1);
  if (gas) {
    kart.vx += f.x * accel * dt;
    kart.vz += f.z * accel * dt;
  }
  if (kart.boost > 0) {
    kart.vx += f.x * kart.boostPow * dt;
    kart.vz += f.z * kart.boostPow * dt;
    kart.boost -= dt;
  }
  const drag = (brake ? 3.4 : gas ? 0.38 : 1.35) * dt;
  kart.vx -= kart.vx * drag;
  kart.vz -= kart.vz * drag;

  const fwdSp = kart.vx * f.x + kart.vz * f.z;
  let sx = kart.vx - f.x * fwdSp;
  let sz = kart.vz - f.z * fwdSp;
  const grip = kart.drifting ? 1.25 : 8.2;
  const keep = Math.exp(-grip * dt);
  sx *= keep;
  sz *= keep;
  kart.vx = f.x * fwdSp + sx;
  kart.vz = f.z * fwdSp + sz;

  const side = Math.hypot(sx, sz);
  if (kart.drifting) {
    kart.spark = Math.min(1, kart.spark + dt * (0.55 + Math.min(0.5, side * 0.06)));
  } else if (was && kart.spark >= SPARK_MIN) {
    kart.boost = 0.32 + kart.spark * 0.45;
    kart.boostPow = 20 + kart.spark * 30;
    kart.spark = 0;
  } else {
    kart.spark = Math.max(0, kart.spark - dt * 0.85);
  }

  let sp = Math.hypot(kart.vx, kart.vz);
  const cap =
    (kart.baseCap || (kart.cpu ? 27 : MAX_SPEED)) *
    (kart.boost > 0 ? 1.32 : 1) *
    (kart.orb > 0 ? 1.18 : 1);
  if (sp > cap) {
    kart.vx *= cap / sp;
    kart.vz *= cap / sp;
    sp = cap;
  }
  kart.speed = sp;
  kart.slip = wrapAngle(Math.atan2(kart.vx, kart.vz) - kart.yaw);
  kart.x += kart.vx * dt;
  kart.z += kart.vz * dt;
}

const GRAVITY = 34;
const GROUND_Y = 0.08;

function horizInside(w, x, z) {
  const dx = x - w.x;
  const dz = z - w.z;
  if (w.kind === "circle") return dx * dx + dz * dz <= w.r * w.r;
  return Math.abs(dx) <= w.hx && Math.abs(dz) <= w.hz;
}

function waterUnder(track, x, z) {
  for (const w of track.waters || []) if (horizInside(w, x, z)) return w;
  return null;
}

function solidIndex(track, idx) {
  const n = track.frames.length;
  for (let k = 0; k < n; k++) {
    const i = (idx - k + n) % n;
    if (!track.frames[i].gap) return i;
  }
  return 0;
}

function respawnKart(track, kart) {
  kart.falls = (kart.falls || 0) + 1;
  let idx = solidIndex(track, kart.safeHint == null ? kart.hint || 0 : kart.safeHint);
  if (kart.falls >= 3) {
    const ahead = frameAt(track, track.frames[idx].t + 0.09);
    idx = solidIndex(track, frameIndex(track, ahead.t));
    kart.falls = 0;
  }
  const fr = track.frames[idx];
  const yaw = Math.atan2(fr.tangent.x, fr.tangent.z);
  kart.x = fr.p.x;
  kart.z = fr.p.z;
  kart.y = fr.p.y + 0.08;
  kart.yaw = yaw;
  kart.vx = fr.tangent.x * 9;
  kart.vz = fr.tangent.z * 9;
  kart.vy = fr.tangent.y * 9;
  kart.speed = 9;
  kart.grounded = true;
  kart.air = 0;
  kart.off = 0;
  kart.wet = 0;
  kart.splash = 0.7;
  kart.hint = idx;
  kart.t = fr.t;
  kart.sector = sectorOf(fr.t);
  kart.stun = Math.min(1.2, Math.max(kart.stun || 0, 0.4));
  kart.respawnCd = 0.75;
  kart.drifting = false;
  kart.spark = 0;
  kart.stuck = 0;
}

function bodyStep(track, kart, dt) {
  if (kart.splash > 0) kart.splash = Math.max(0, kart.splash - dt);
  if (kart.respawnCd > 0) kart.respawnCd = Math.max(0, kart.respawnCd - dt);
  const near = nearest(track, kart.x, kart.z, kart.hint);
  const fr = near.frame;
  const lat = (kart.x - fr.p.x) * fr.right.x + (kart.z - fr.p.z) * fr.right.z;
  const edge = fr.width * 0.5 - 0.9;
  if (near.dist2 < 26 * 26) {
    kart.hint = near.index;
    kart.t = fr.t;
    advanceSector(kart);
    const wrapped = ((fr.t % 1) + 1) % 1;
    kart.progress = kart.laps + wrapped;
  }
  let mode = "air";
  let latNow = lat;
  if (!fr.gap && fr.rail && Math.abs(lat) > edge) {
    const sign = Math.sign(lat) || 1;
    const push = Math.abs(lat) - edge;
    kart.x -= fr.right.x * sign * push;
    kart.z -= fr.right.z * sign * push;
    const out = kart.vx * fr.right.x + kart.vz * fr.right.z;
    if (out * sign > 0) {
      kart.vx -= fr.right.x * out;
      kart.vz -= fr.right.z * out;
    }
    latNow = edge * sign;
    mode = "road";
  } else if (!fr.gap && Math.abs(lat) <= edge) {
    mode = "road";
  } else if (!fr.gap && fr.shoulder && Math.abs(lat) <= edge + 2.45) {
    mode = "shoulder";
  }
  const bankY = fr.p.y + Math.sin(fr.bank) * latNow;
  const along = kart.vx * fr.tangent.x + kart.vz * fr.tangent.z;
  const roadY = mode === "shoulder" ? bankY - 0.16 : bankY + 0.05;
  const closeEnough = kart.y <= roadY + 0.45 && kart.y >= roadY - 1.35;
  if ((mode === "road" || mode === "shoulder") && closeEnough && (kart.grounded || kart.vy <= 2.5)) {
    kart.y = roadY;
    kart.vy = along * fr.tangent.y;
    kart.grounded = true;
    kart.air = 0;
    kart.off = 0;
    kart.wet = 0;
    const pull = 22 * fr.tangent.y;
    kart.vx -= fr.tangent.x * pull * dt;
    kart.vz -= fr.tangent.z * pull * dt;
    if (mode === "shoulder") {
      const drag = track.theme === "frost" ? 3.4 : 2.4;
      const keep = Math.exp(-drag * dt);
      kart.vx *= keep;
      kart.vz *= keep;
      const sign = Math.sign(latNow) || 1;
      kart.vx -= fr.right.x * sign * 10 * dt;
      kart.vz -= fr.right.z * sign * 10 * dt;
      kart.off = (kart.off || 0) + dt;
      if (kart.off > 1.35) respawnKart(track, kart);
    } else if (kart.respawnCd <= 0 && along > 8 && !fr.lip && !fr.deck) {
      const back = frameAt(track, fr.t - 0.055);
      const soon = frameAt(track, fr.t + 0.04);
      if (!back.gap && !back.lip && !back.deck && !soon.gap && !soon.lip) {
        kart.safeHint = frameIndex(track, back.t);
        const clear = frameAt(track, fr.t + 0.14);
        if (!clear.gap && !clear.lip && !clear.deck) kart.falls = 0;
      }
      kart.off = 0;
    } else {
      kart.off = 0;
    }
  } else if ((mode === "road" || mode === "shoulder") && kart.y > roadY + 0.45) {
    kart.vy -= GRAVITY * dt;
    kart.y += kart.vy * dt;
    kart.grounded = false;
    kart.air += dt;
    if (kart.y <= roadY + 0.02) {
      kart.y = roadY;
      kart.vy = along * fr.tangent.y;
      kart.grounded = true;
      kart.air = 0;
      kart.splash = Math.max(kart.splash || 0, 0.28);
    }
  } else {
    kart.vy -= GRAVITY * dt;
    kart.y += kart.vy * dt;
    kart.grounded = false;
    kart.air += dt;
    const w = waterUnder(track, kart.x, kart.z);
    if (w && kart.y <= w.y + 0.55) {
      kart.y = w.y + 0.12;
      kart.vy = Math.min(kart.vy, -1.2);
      kart.vx *= 0.9;
      kart.vz *= 0.9;
      kart.splash = 0.8;
      kart.wet = (kart.wet || 0) + dt;
      if (kart.wet > 0.26) respawnKart(track, kart);
    } else if (!w && kart.y <= GROUND_Y && kart.vy <= 0) {
      kart.y = GROUND_Y;
      kart.vy = 0;
      kart.off = (kart.off || 0) + dt;
      const keep = Math.exp(-6.4 * dt);
      kart.vx *= keep;
      kart.vz *= keep;
      if (kart.off > 1.05) respawnKart(track, kart);
    } else if (kart.y < -3.5 || kart.air > 2.5) {
      respawnKart(track, kart);
    }
  }
  const wet = waterUnder(track, kart.x, kart.z);
  if (wet && kart.y <= wet.y + 0.5 && (kart.respawnCd || 0) <= 0) {
    kart.splash = 0.8;
    kart.vx *= 0.88;
    kart.vz *= 0.88;
    kart.wet = (kart.wet || 0) + dt;
    if (kart.wet > 0.22) respawnKart(track, kart);
  }
  for (const s of track.solids || []) {
    const dx = kart.x - s.x;
    const dz = kart.z - s.z;
    const d = Math.hypot(dx, dz);
    if (d < s.r && d > 0.001) {
      const push = s.r - d;
      kart.x += (dx / d) * push;
      kart.z += (dz / d) * push;
      const vn = (kart.vx * dx + kart.vz * dz) / d;
      if (vn < 0) {
        kart.vx -= (dx / d) * vn;
        kart.vz -= (dz / d) * vn;
      }
    }
  }
  if (kart.speed < 7 && kart.grounded) {
    const aim = Math.atan2(fr.tangent.x, fr.tangent.z);
    kart.yaw = wrapAngle(kart.yaw + wrapAngle(aim - kart.yaw) * Math.min(1, dt * 3.2));
  }
  if (kart.grounded && kart.speed < 4.5 && mode === "road") {
    kart.creep = (kart.creep || 0) + dt;
    if (kart.creep > 0.7) {
      kart.vx += fr.tangent.x * 22 * dt;
      kart.vz += fr.tangent.z * 22 * dt;
    }
  } else kart.creep = 0;
  kart.speed = Math.hypot(kart.vx, kart.vz);
  if (kart.cpu) {
    if (kart.speed < 2.2 && kart.grounded) kart.stuck += dt;
    else kart.stuck = 0;
  }
}

function separate(karts) {
  const min = 2.15;
  for (let i = 0; i < karts.length; i++) {
    for (let j = i + 1; j < karts.length; j++) {
      const a = karts[i];
      const b = karts[j];
      let dx = b.x - a.x;
      let dz = b.z - a.z;
      let d = Math.hypot(dx, dz);
      if (d < 0.001) {
        dx = 0.02;
        dz = 0;
        d = 0.02;
      }
      if (d < min) {
        const push = (min - d) * 0.5;
        const nx = dx / d;
        const nz = dz / d;
        if (!a.finished) {
          a.x -= nx * push;
          a.z -= nz * push;
        }
        if (!b.finished) {
          b.x += nx * push;
          b.z += nz * push;
        }
      }
    }
  }
}

function markFinished(race, kart, crossed) {
  kart.finished = true;
  kart.crossed = crossed;
  kart.finishTime = crossed ? race.time : 0;
  race.places.push(kart.id);
  kart.place = race.places.length;
  kart.vx *= 0.45;
  kart.vz *= 0.45;
}

function tuneCaps(race) {
  const you = humanOf(race);
  for (const kart of race.karts) {
    if (!kart.cpu) {
      kart.baseCap = MAX_SPEED;
      continue;
    }
    const gap = you ? you.progress - kart.progress : 0;
    if (gap > 0.035) kart.baseCap = 31.4;
    else if (gap < -0.07) kart.baseCap = 24.5;
    else kart.baseCap = 27.2;
  }
}

function finishIfNeeded(race) {
  if (race.time < 8) return;
  const done = race.karts
    .filter((k) => !k.finished && k.laps >= LAPS)
    .sort((a, b) => b.progress - a.progress);
  for (const k of done) markFinished(race, k, true);
  const you = humanOf(race);
  const dnf = race.time >= DNF_TIME;
  if ((you && you.finished) || dnf) {
    const rest = race.karts
      .filter((k) => !k.finished)
      .sort((a, b) => b.progress - a.progress);
    for (const k of rest) markFinished(race, k, k.laps >= LAPS);
    race.phase = "podium";
  }
}

export function stepRace(race, inputs, dt) {
  const step = Math.max(0, Math.min(0.05, dt));
  if (race.phase === "countdown") {
    race.countdown -= step;
    if (race.countdown <= 0) {
      race.countdown = 0;
      race.phase = "race";
      race.time = 0;
    }
    return;
  }
  if (race.phase !== "race") return;
  race.time += step;
  tuneCaps(race);
  for (const kart of race.karts) {
    if (kart.finished) {
      kart.vx *= 0.98;
      kart.vz *= 0.98;
      kart.x += kart.vx * step;
      kart.z += kart.vz * step;
      continue;
    }
    const input = inputs[kart.id] || { steer: 0, gas: 0, drift: false };
    if (input.fire) launchHeld(race, kart);
    integrate(kart, input, step);
  }
  separate(race.karts);
  for (const kart of race.karts) bodyStep(race.track, kart, step);
  stepItems(race, step);
  finishIfNeeded(race);
}

export function adviceFor(race, id) {
  const kart = race.karts.find((k) => k.id === id);
  const track = race.track;
  if (!kart.grounded) {
    const land = frameAt(track, kart.t + 0.04);
    const desired = Math.atan2(land.tangent.x, land.tangent.z);
    const err = wrapAngle(desired - kart.yaw);
    return {
      steer: Math.max(-1, Math.min(1, err / 0.45)),
      gas: 1,
      drift: false,
      brake: false,
      fire: false,
    };
  }
  const here = track.frames[kart.hint] || frameAt(track, kart.t);
  if (here.lip || here.deck) {
    const desired = Math.atan2(here.tangent.x, here.tangent.z);
    const err = wrapAngle(desired - kart.yaw);
    return {
      steer: Math.max(-1, Math.min(1, err / 0.8)),
      gas: 1,
      drift: false,
      brake: false,
      fire: false,
    };
  }
  const offLat = Math.abs((kart.x - here.p.x) * here.right.x + (kart.z - here.p.z) * here.right.z);
  const look = offLat > here.width * 0.22 ? 0.018 : kart.style === "spark" ? 0.045 : kart.style === "wide" ? 0.06 : 0.05;
  const ahead = frameAt(track, kart.t + look + Math.min(0.03, kart.speed * 0.0008));
  const now = track.frames[kart.hint] || frameAt(track, kart.t);
  const cx = track.cx || 0;
  const cz = track.cz || 2;
  const toC = norm({ x: cx - ahead.p.x, y: 0, z: cz - ahead.p.z });
  const inward = toC.x * ahead.right.x + toC.z * ahead.right.z;
  const lane = kart.lane * 0.35;
  const u = Math.max(-0.42, Math.min(0.42, inward * 0.32 + lane * 0.5));
  const tx = ahead.p.x + ahead.right.x * u * ahead.width * 0.5;
  const tz = ahead.p.z + ahead.right.z * u * ahead.width * 0.5;
  let desired = Math.atan2(tx - kart.x, tz - kart.z);
  if (kart.stuck > 0.7) {
    const back = now;
    desired = Math.atan2(back.tangent.x, back.tangent.z);
  }
  const err = wrapAngle(desired - kart.yaw);
  const steer = Math.max(-1, Math.min(1, err / 0.55));
  const tight = Math.max(Math.abs(now.curvature), Math.abs(ahead.curvature));
  let gas = 1;
  if (tight > 0.012 && kart.speed > 26 && kart.style !== "spark") gas = 0.45;
  let drift = false;
  if (kart.style === "spark") drift = tight > 0.007 && kart.speed > 14 && Math.abs(steer) > 0.25;
  else if (kart.style === "wide") drift = tight > 0.014 && kart.speed > 18;
  else drift = tight > 0.011 && kart.speed > 17 && Math.abs(steer) > 0.35;
  if (kart.stuck > 0.7 || kart.stun > 0) drift = false;
  let steerOut = kart.stuck > 0.7 ? Math.max(-1, Math.min(1, err / 0.3)) : steer;
  const hazard = frameAt(track, kart.t + 0.1);
  if (here.lip || here.deck || hazard.lip || hazard.gap || hazard.deck) {
    drift = false;
    const lat = (kart.x - here.p.x) * here.right.x + (kart.z - here.p.z) * here.right.z;
    steerOut = Math.max(-1, Math.min(1, steerOut - lat / Math.max(2.5, here.width * 0.45)));
  }
  let fire = false;
  if (kart.cpu && kart.held && kart.fireCd <= 0 && kart.stun <= 0) {
    const wait = kart.held === "trap" ? 0.7 : 0.35;
    fire = (kart.holdAge || 0) > wait;
  }
  return { steer: steerOut, gas, drift, fire };
}

export function livePlace(race, id) {
  const sorted = [...race.karts].sort((a, b) => b.progress - a.progress);
  return sorted.findIndex((k) => k.id === id) + 1;
}

export function lapOf(kart) {
  return Math.min(LAPS, (kart.laps || 0) + 1);
}

export function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return { bestPlace: 0, bestTime: 0, races: 0 };
    const d = JSON.parse(raw);
    return {
      bestPlace: d.bestPlace || 0,
      bestTime: d.bestTime || 0,
      races: d.races || 0,
    };
  } catch (e) {
    return { bestPlace: 0, bestTime: 0, races: 0 };
  }
}

export function writeSave(save) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(save));
  } catch (e) {
    /* private mode */
  }
}

export function noteFinish(save, place, time) {
  save.races += 1;
  if (!save.bestPlace || place < save.bestPlace) save.bestPlace = place;
  if (!save.bestTime || time < save.bestTime) save.bestTime = time;
  writeSave(save);
  return save;
}

function testSteer(fails) {
  const kart = {
    x: 0, y: 0, z: 0, yaw: 0, vx: 0, vz: 0, speed: 0,
    spark: 0, drifting: false, boost: 0, boostPow: 0, steerHold: 0, slip: 0,
  };
  for (let i = 0; i < 36; i++) integrate(kart, { steer: 1, gas: 1, drift: false }, 1 / 60);
  if (!(kart.x > 0.4)) fails.push("right steer x " + kart.x.toFixed(2));
  if (!(kart.yaw > 0.25 && kart.yaw < 2)) fails.push("right yaw " + kart.yaw.toFixed(2));
  const nose = forward(kart.yaw);
  const sp = Math.hypot(kart.vx, kart.vz) || 1;
  const align = (kart.vx / sp) * nose.x + (kart.vz / sp) * nose.z;
  if (align < 0.75) fails.push("facing " + align.toFixed(2));

  const left = {
    x: 0, y: 0, z: 0, yaw: 0, vx: 0, vz: 0, speed: 0,
    spark: 0, drifting: false, boost: 0, boostPow: 0, steerHold: 0, slip: 0,
  };
  for (let i = 0; i < 36; i++) integrate(left, { steer: -1, gas: 1, drift: false }, 1 / 60);
  if (!(left.x < -0.4)) fails.push("left steer x " + left.x.toFixed(2));
}

function testBoost(fails) {
  const kart = {
    x: 0, y: 0, z: 0, yaw: 0, vx: 0, vz: 18, speed: 18,
    spark: 0.8, drifting: true, boost: 0, boostPow: 0, steerHold: 0.4, slip: 0,
  };
  integrate(kart, { steer: 0, gas: 1, drift: false }, 1 / 60);
  if (!(kart.boost > 0.2)) fails.push("boost " + kart.boost.toFixed(2));
  const before = kart.speed;
  integrate(kart, { steer: 0, gas: 1, drift: false }, 1 / 60);
  if (!(kart.speed > before - 1)) fails.push("boost speed");
}

function loneKart(track, fr, speed) {
  const yaw = Math.atan2(fr.tangent.x, fr.tangent.z);
  return {
    id: "probe",
    cpu: false,
    x: fr.p.x,
    y: fr.p.y + 0.05,
    z: fr.p.z,
    yaw,
    vx: fr.tangent.x * speed,
    vy: fr.tangent.y * speed,
    vz: fr.tangent.z * speed,
    speed,
    spark: 0,
    drifting: false,
    boost: 0,
    boostPow: 0,
    steerHold: 0,
    slip: 0,
    stuck: 0,
    t: fr.t,
    hint: track.frames.indexOf(fr),
    sector: sectorOf(fr.t),
    seenHalf: false,
    laps: 0,
    progress: fr.t,
    finished: false,
    grounded: true,
    air: 0,
    off: 0,
    wet: 0,
    splash: 0,
    safeHint: solidIndex(track, track.frames.indexOf(fr)),
    respawnCd: 0,
    stun: 0,
    invuln: 0,
  };
}

function testPhysics(fails) {
  const track = createTrack("dam");
  const lip = track.frames.findIndex((f) => f.lip);
  if (lip < 10) {
    fails.push("no lip");
    return;
  }
  let steep = lip;
  for (let i = lip; i < lip + 18 && i < track.frames.length; i++) {
    if (track.frames[i].lip && track.frames[i].tangent.y > track.frames[steep].tangent.y) steep = i;
  }
  const rise = track.frames[steep].tangent.y;
  if (rise < 0.18) fails.push("flat ramp " + rise.toFixed(3));
  const start = track.frames[lip];
  const jumper = loneKart(track, start, 26);
  let sawAir = false;
  let landed = false;
  let maxY = jumper.y;
  const y0 = jumper.y;
  for (let i = 0; i < 220; i++) {
    integrate(jumper, { steer: 0, gas: 1, drift: false }, 1 / 60);
    bodyStep(track, jumper, 1 / 60);
    if (!jumper.grounded) sawAir = true;
    if (jumper.y > maxY) maxY = jumper.y;
    if (sawAir && jumper.grounded && jumper.splash < 0.5) landed = true;
  }
  if (!sawAir) fails.push("no air");
  if (maxY < y0 + 0.55) fails.push("no arc " + (maxY - y0).toFixed(2));
  if (!landed) fails.push("no land y" + jumper.y.toFixed(1) + " air" + jumper.air.toFixed(2));

  const gap = track.frames.find((f) => f.gap);
  const floater = loneKart(track, gap, 0);
  floater.y = gap.p.y + 1.2;
  floater.vy = 0;
  floater.vx = 0;
  floater.vz = 0;
  floater.grounded = true;
  bodyStep(track, floater, 1 / 60);
  if (floater.grounded) fails.push("air cruise grounded");
  if (floater.vy > -0.2) fails.push("air cruise vy " + floater.vy.toFixed(2));

  const plunge = track.waters.find((w) => w.id === "plunge");
  if (!plunge) fails.push("no plunge");
  else {
    const swimmer = loneKart(track, gap, 0);
    swimmer.x = plunge.x;
    swimmer.z = plunge.z;
    swimmer.y = plunge.y + 0.15;
    swimmer.vy = -2;
    swimmer.vx = 0;
    swimmer.vz = 0;
    swimmer.grounded = false;
    swimmer.safeHint = solidIndex(track, 0);
    for (let i = 0; i < 40; i++) bodyStep(track, swimmer, 1 / 60);
    const still = Math.hypot(swimmer.x - plunge.x, swimmer.z - plunge.z) < plunge.hx * 0.5;
    if (still && swimmer.splash < 0.2) fails.push("water silent");
    if (still && swimmer.y <= plunge.y + 0.2 && swimmer.wet < 0.2 && swimmer.splash < 0.2) {
      fails.push("water stuck");
    }
  }

  const bridge = track.frames.find((f) => f.bridge && f.rail);
  if (!bridge) fails.push("no rail");
  else {
    const bumper = loneKart(track, bridge, 10);
    const sign = 1;
    bumper.x = bridge.p.x + bridge.right.x * (bridge.width * 0.5 + 1.2) * sign;
    bumper.z = bridge.p.z + bridge.right.z * (bridge.width * 0.5 + 1.2) * sign;
    bumper.y = bridge.p.y;
    bumper.vx = bridge.right.x * 12;
    bumper.vz = bridge.right.z * 12;
    for (let i = 0; i < 20; i++) bodyStep(track, bumper, 1 / 60);
    const lat =
      (bumper.x - bridge.p.x) * bridge.right.x + (bumper.z - bridge.p.z) * bridge.right.z;
    if (lat > bridge.width * 0.5 - 0.4) fails.push("rail clip " + lat.toFixed(2));
  }

  for (const fr of track.frames) {
    if (fr.gap) continue;
    const w = waterUnder(track, fr.p.x, fr.p.z);
    if (w && fr.p.y < w.y + 1.15) fails.push("wet road " + w.id + " " + fr.p.y.toFixed(1));
  }
  for (const s of track.solids) {
    const near = nearest(track, s.x, s.z, null);
    const lat = Math.abs(
      (s.x - near.frame.p.x) * near.frame.right.x + (s.z - near.frame.p.z) * near.frame.right.z
    );
    if (lat < near.frame.width * 0.5 + 1.2) fails.push("solid on road");
  }
  const slow = loneKart(track, start, 11);
  let slowLand = false;
  let slowWet = false;
  for (let i = 0; i < 240; i++) {
    integrate(slow, { steer: 0, gas: 0.15, drift: false }, 1 / 60);
    bodyStep(track, slow, 1 / 60);
    if (slow.splash > 0.5 || slow.wet > 0) slowWet = true;
    if (slow.grounded && slow.hint > lip + 30) slowLand = true;
  }
  if (slowLand && !slowWet) fails.push("slow cleared jump");
}

function testNoInstant(fails) {
  const track = createTrack();
  for (let pass = 0; pass < 3; pass++) {
    const race = createRace(track);
    resetRace(race);
    const inputs = {};
    for (let i = 0; i < 60 * 5; i++) {
      for (const k of race.karts) {
        inputs[k.id] = k.cpu ? adviceFor(race, k.id) : { steer: 0, gas: 1, drift: false };
      }
      stepRace(race, inputs, 1 / 60);
    }
    const you = humanOf(race);
    if (race.phase !== "race") fails.push("instant " + pass + " " + race.phase);
    if (you.laps !== 0) fails.push("early lap " + pass + " " + you.laps);
    if (you.progress >= 1) fails.push("early prog " + pass + " " + you.progress.toFixed(2));
  }
}

export function selfTest() {
  const fails = [];
  const track = createTrack();
  if (track.length < 700 || track.length > 1300) fails.push("length " + track.length.toFixed(1));
  for (let i = 0; i < track.frames.length; i++) {
    const a = track.frames[i];
    if (!Number.isFinite(a.p.x) || !Number.isFinite(a.tangent.x)) fails.push("nan frame");
    for (let j = i + 20; j < track.frames.length - 20; j++) {
      const b = track.frames[j];
      const d = Math.hypot(a.p.x - b.p.x, a.p.z - b.p.z);
      if (d < 4) {
        fails.push("pinch " + i + " " + j);
        i = track.frames.length;
        break;
      }
    }
  }
  testSteer(fails);
  testBoost(fails);
  testPhysics(fails);
  const race = createRace(track);
  if (race.karts.length !== 4) fails.push("roster");
  race.phase = "race";
  let guard = 0;
  const lapSeen = new Set();
  const watched = humanOf(race);
  while (race.phase !== "podium" && guard < 60 * 360) {
    const inputs = {};
    for (const k of race.karts) inputs[k.id] = adviceFor(race, k.id);
    stepRace(race, inputs, 1 / 60);
    lapSeen.add(watched.laps);
    guard++;
  }
  if (!lapSeen.has(1) || !lapSeen.has(2)) fails.push("lap hud " + [...lapSeen].join(","));
  if (race.phase !== "podium") {
    fails.push(
      "no podium " +
        race.karts.map((k) => k.id + ":" + k.laps + ":" + k.progress.toFixed(2)).join(" ")
    );
  } else {
    const you = humanOf(race);
    if (!you.finished || you.place < 1 || you.place > 4) fails.push("place " + you.place);
    if (you.laps < LAPS) fails.push("laps " + you.laps);
    if (guard < 60 * 15) fails.push("too fast " + guard);
    const lapSec = guard / 60 / LAPS;
    if (lapSec < 34 || lapSec > 52) fails.push("lap pace " + lapSec.toFixed(1));
    const sorted = [...race.karts].sort((a, b) => b.progress - a.progress);
    const gap = sorted[0].progress - sorted[sorted.length - 1].progress;
    if (gap > 0.75) fails.push("cheese gap " + gap.toFixed(2));
  }
  testNoInstant(fails);
  const itemRace = createRace(track);
  testItems(itemRace, fails);
  const frost = createTrack("frost");
  if (frost.theme !== "frost" || frost.length < 640 || frost.length > 1300) fails.push("frost " + frost.length.toFixed(0));
  if (frost.frames.filter((f) => f.bridge).length < 6) fails.push("bridges");
  for (let i = 0; i < frost.frames.length; i++) {
    for (let j = i + 20; j < frost.frames.length - 20; j++) {
      const d = Math.hypot(frost.frames[i].p.x - frost.frames[j].p.x, frost.frames[i].p.z - frost.frames[j].p.z);
      if (d < 4) {
        fails.push("frost pinch");
        i = frost.frames.length;
        break;
      }
    }
  }
  const frostRace = createRace(frost);
  resetRace(frostRace);
  for (let i = 0; i < 60 * 5; i++) {
    const inputs = {};
    for (const k of frostRace.karts) inputs[k.id] = k.cpu ? adviceFor(frostRace, k.id) : { steer: 0, gas: 1, drift: false };
    stepRace(frostRace, inputs, 1 / 60);
  }
  if (frostRace.phase !== "race" || frostRace.karts[0].laps !== 0) fails.push("frost instant");
  return {
    ok: fails.length === 0,
    fails,
    length: Math.round(track.length),
    ticks: guard,
    seconds: Math.round(guard / 60),
  };
}
