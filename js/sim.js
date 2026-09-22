/* Race sim. No rendering.
   yaw 0 faces +z. yaw > 0 turns toward +x (screen-left in the chase view).
   forward = (sin(yaw), 0, cos(yaw)). */
import { launchHeld, seedItems, stepItems, testItems } from "./items.js?v=gd9";
export { launchHeld };

export const LAPS = 3;
export const SAVE_KEY = "bober-grand-dam-v1";
export const DNF_TIME = 420;
const SECTORS = 8;

export const ROSTER = [
  { id: "bober", name: "BOBER", scarf: 0xe6a322, color: "#e6a322", lane: -0.42, style: "clean" },
  { id: "nib", name: "NIB", scarf: 0x2f6a34, color: "#3e7a45", lane: 0.42, style: "wide" },
  { id: "puddle", name: "PUDDLE", scarf: 0x1499a0, color: "#1499a0", lane: -0.28, style: "spark" },
  { id: "twig", name: "TWIG", scarf: 0xd06a32, color: "#d06a32", lane: 0.28, style: "clean" },
];

const DAM_RAW = [
  { x: -140.8, z: -256, y: 24.2 },
  { x: -70.4, z: -256, y: 24.2 },
  { x: 0, z: -256, y: 24.2 },
  { x: 70.4, z: -256, y: 24.2 },
  { x: 140.8, z: -256, y: 24.2 },
  { x: 230.4, z: -232, y: 22.2 },
  { x: 296, z: -166.4, y: 16.9 },
  { x: 320, z: -76.8, y: 9.5 },
  { x: 300, z: -25.6, y: 5.3 },
  { x: 340, z: 25.6, y: 3.2 },
  { x: 320, z: 76.8, y: 3.2 },
  { x: 296, z: 166.4, y: 3.2 },
  { x: 230.4, z: 232, y: 3.2, bridge: true },
  { x: 140.8, z: 256, y: 3.2, bridge: true },
  { x: 70.4, z: 256, y: 3.2, bridge: true },
  { x: 0, z: 256, y: 3.2, bridge: true },
  { x: -70.4, z: 256, y: 3.2, bridge: true },
  { x: -140.8, z: 256, y: 3.2, bridge: true },
  { x: -230.4, z: 232, y: 3.2, bridge: true },
  { x: -296, z: 166.4, y: 12 },
  { x: -320, z: 76.8, y: 16 },
  { x: -320, z: 25.6, y: 17, gap: true },
  { x: -320, z: -25.6, y: 8, gap: true },
  { x: -320, z: -76.8, y: 6 },
  { x: -296, z: -166.4, y: 14 },
  { x: -230.4, z: -232, y: 22.2 },
];

const FROST_RAW = [
  { x: -134.2, z: -292.8, y: 26.8 },
  { x: -67.1, z: -292.8, y: 26.8 },
  { x: 0, z: -292.8, y: 26.8 },
  { x: 67.1, z: -292.8, y: 26.8 },
  { x: 134.2, z: -292.8, y: 26.8 },
  { x: 207.4, z: -273.2, y: 25.5 },
  { x: 261, z: -219.6, y: 22.1 },
  { x: 280.6, z: -146.4, y: 17.4 },
  { x: 258, z: -48.8, y: 14, bridge: true },
  { x: 302, z: 48.8, y: 14, bridge: true },
  { x: 280.6, z: 146.4, y: 14 },
  { x: 261, z: 219.6, y: 12 },
  { x: 207.4, z: 273.2, y: 10 },
  { x: 134.2, z: 292.8, y: 9 },
  { x: 67.1, z: 292.8, y: 10 },
  { x: 0, z: 292.8, y: 14 },
  { x: -67.1, z: 292.8, y: 18 },
  { x: -134.2, z: 292.8, y: 18 },
  { x: -207.4, z: 273.2, y: 16 },
  { x: -261, z: 219.6, y: 14 },
  { x: -280.6, z: 146.4, y: 14 },
  { x: -280.6, z: 48.8, y: 15, bridge: true },
  { x: -280.6, z: -48.8, y: 16, bridge: true },
  { x: -280.6, z: -146.4, y: 18 },
  { x: -261, z: -219.6, y: 22.1 },
  { x: -207.4, z: -273.2, y: 25.5 },
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
    let w = id === "frost" ? 10.6 : 13.4;
    if (frames[i].bridge) w = id === "frost" ? 7.4 : 8.8;
    if (id === "frost" && p.y > 22) w = Math.max(w, 12);
    if (id !== "frost" && p.y > 18) w = Math.max(w, 15.6);
    if (Math.abs(curv) > 0.006) w = Math.min(w, id === "frost" ? 9.4 : 11.6);
    frames[i].width = w;
  }
  let cx = 0;
  let cz = 0;
  for (const f of frames) {
    cx += f.p.x;
    cz += f.p.z;
  }
  return {
    id,
    name: id === "frost" ? "Frost Ridge" : "Dam Loop",
    theme: id === "frost" ? "frost" : "dam",
    frames,
    length,
    samples: frames.length,
    cx: cx / frames.length,
    cz: cz / frames.length,
  };
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
    cpu: def.cpu,
    lane: def.lane,
    style: def.style,
    x: frame.p.x + frame.right.x * lateral,
    y: frame.p.y,
    z: frame.p.z + frame.right.z * lateral,
    yaw,
    vx: 0,
    vz: 0,
    speed: 0,
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

  const steerRate = (kart.drifting ? 3.15 : 2.45) * (0.62 + 0.38 * (1 - Math.min(1, speed / MAX_SPEED)));
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

function constrain(track, kart, dt) {
  const near = nearest(track, kart.x, kart.z, kart.hint);
  const frame = near.frame;
  let dtS = frame.t - kart.t;
  if (dtS < -0.5) dtS += 1;
  if (dtS > 0.5) dtS -= 1;
  const maxDt = (Math.max(kart.speed, 10) / track.length) * dt * 12 + 0.045;
  if (Math.abs(dtS) > maxDt) {
    const back = track.frames[kart.hint];
    kart.x += (back.p.x - kart.x) * 0.35;
    kart.z += (back.p.z - kart.z) * 0.35;
    kart.vx *= 0.9;
    kart.vz *= 0.9;
    return;
  }
  kart.hint = near.index;
  kart.t = frame.t;
  advanceSector(kart);
  const wrapped = ((frame.t % 1) + 1) % 1;
  kart.progress = kart.laps + wrapped;
  const lat =
    (kart.x - frame.p.x) * frame.right.x + (kart.z - frame.p.z) * frame.right.z;
  const half = frame.width * 0.5 - 1.05;
  if (Math.abs(lat) > half) {
    const sign = Math.sign(lat);
    const push = Math.abs(lat) - half;
    kart.x -= frame.right.x * sign * push;
    kart.z -= frame.right.z * sign * push;
    const out = kart.vx * frame.right.x + kart.vz * frame.right.z;
    if (out * sign > 0) {
      kart.vx -= frame.right.x * out * 0.85;
      kart.vz -= frame.right.z * out * 0.85;
      kart.speed = Math.hypot(kart.vx, kart.vz);
    }
  }
  const along = kart.vx * frame.tangent.x + kart.vz * frame.tangent.z;
  if (along > 0) {
    kart.vx -= frame.tangent.x * frame.tangent.y * 28 * dt;
    kart.vz -= frame.tangent.z * frame.tangent.y * 28 * dt;
  }
  kart.y = frame.p.y;
  if (kart.speed < 7) {
    const aim = Math.atan2(frame.tangent.x, frame.tangent.z);
    kart.yaw = wrapAngle(kart.yaw + wrapAngle(aim - kart.yaw) * Math.min(1, dt * 4));
  }
  kart.speed = Math.hypot(kart.vx, kart.vz);
  if (kart.cpu) {
    if (kart.speed < 2.4) kart.stuck += dt;
    else kart.stuck = 0;
  }
}

function separate(karts) {
  const min = 1.9;
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
  for (const kart of race.karts) {
    if (!kart.finished) constrain(race.track, kart, step);
  }
  stepItems(race, step);
  finishIfNeeded(race);
}

export function adviceFor(race, id) {
  const kart = race.karts.find((k) => k.id === id);
  const track = race.track;
  const look = kart.style === "spark" ? 0.05 : kart.style === "wide" ? 0.075 : 0.06;
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
  const steerOut = kart.stuck > 0.7 ? Math.max(-1, Math.min(1, err / 0.3)) : steer;
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
  if (track.length < 900 || track.length > 2800) fails.push("length " + track.length.toFixed(1));
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
    if (lapSec < 48) fails.push("short lap " + lapSec.toFixed(1));
    const sorted = [...race.karts].sort((a, b) => b.progress - a.progress);
    const gap = sorted[0].progress - sorted[sorted.length - 1].progress;
    if (gap > 0.75) fails.push("cheese gap " + gap.toFixed(2));
  }
  testNoInstant(fails);
  const itemRace = createRace(track);
  testItems(itemRace, fails);
  const frost = createTrack("frost");
  if (frost.theme !== "frost" || frost.length < 900 || frost.length > 2800) fails.push("frost " + frost.length.toFixed(0));
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
