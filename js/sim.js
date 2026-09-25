/* Race sim. No rendering.
   yaw 0 faces +z. yaw > 0 turns toward +x (screen-left in the chase view).
   forward = (sin(yaw), 0, cos(yaw)). */
import { launchHeld, seedItems, stepItems, testItems } from "./items.js?v=gd39";
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

/* Crown Clover: one Gerono figure-8. The pass near pi lifts into a bridge;
   the other pass stays on the ground, so the cross is two roads, not a pinch. */
function cloverRaw() {
  const pts = [];
  const a = 148;
  const n = 36;
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2;
    const x = a * Math.sin(t);
    const z = a * Math.sin(t) * Math.cos(t) * 1.12;
    let delta = Math.abs(t - Math.PI);
    if (delta > Math.PI) delta = Math.PI * 2 - delta;
    const lift = Math.exp(-((delta / 0.48) ** 2));
    pts.push({ x, y: 3.15 + lift * 9.4, z, bridge: lift > 0.45 });
  }
  return pts;
}

/* Oasis Leap: two dam-style lips. Two high gap samples, then a low deck.
   The hole is air. Missing it meets the pool, not the next road. */
const OASIS_RAW = [
  { x: -150, z: -128, y: 4.0 },
  { x: -96, z: -136, y: 4.15 },
  { x: -48, z: -132, y: 4.4 },
  { x: -10, z: -122, y: 7.2 },
  { x: 4, z: -114, y: 10.2, lip: true },
  { x: 12, z: -110, y: 13.8, gap: true },
  { x: 20, z: -106, y: 13.2, gap: true },
  { x: 30, z: -100, y: 6.15, deck: true },
  { x: 48, z: -90, y: 5.7, deck: true },
  { x: 118, z: -48, y: 4.3 },
  { x: 156, z: 8, y: 4.0 },
  { x: 150, z: 64, y: 4.0 },
  { x: 112, z: 112, y: 4.15 },
  { x: 58, z: 136, y: 4.3 },
  { x: 8, z: 128, y: 7.0 },
  { x: -6, z: 120, y: 10.2, lip: true },
  { x: -14, z: 114, y: 13.8, gap: true },
  { x: -22, z: 108, y: 13.2, gap: true },
  { x: -32, z: 100, y: 6.15, deck: true },
  { x: -52, z: 88, y: 5.6, deck: true },
  { x: -128, z: 40, y: 4.25 },
  { x: -164, z: -16, y: 4.0 },
  { x: -158, z: -76, y: 4.0 },
];

/* Sky Loop 360: a vertical circle in the YZ plane, then a wide oval home.
   Samples far from the circle drop the loop flag so the exit is ordinary road. */
function skyRaw() {
  const pts = [];
  const before = [
    [140, 4.8, 148],
    [210, 5.25, 120],
    [265, 5.55, 70],
    [300, 5.5, 16],
    [305, 5.35, -40],
    [275, 5.1, -96],
    [210, 4.75, -145],
    [130, 4.4, -160],
    [78, 4.2, -130],
    [36, 4.12, -96],
    [14, 4.06, -68],
    [0, 4.04, -46],
    [0, 4.03, -30],
    [0, 4.02, -16],
  ];
  for (const p of before) pts.push({ x: p[0], y: p[1], z: p[2] });
  const R = 10.5;
  const cy = 4 + R;
  const n = 22;
  for (let i = 0; i < n; i++) {
    const th = (i / n) * Math.PI * 2;
    pts.push({
      x: 0,
      y: cy - R * Math.cos(th),
      z: R * Math.sin(th),
      loop: true,
    });
  }
  const after = [
    [0, 4.02, 16],
    [0, 4.05, 32],
    [10, 4.12, 54],
    [40, 4.28, 82],
  ];
  for (const p of after) pts.push({ x: p[0], y: p[1], z: p[2] });
  return pts;
}

const TRACK_RAW = {
  dam: () => DAM_RAW,
  frost: () => FROST_RAW,
  clover: cloverRaw,
  oasis: () => OASIS_RAW,
  sky: skyRaw,
};

const TRACK_NAME = {
  dam: "Dam Loop",
  frost: "Frost Ridge",
  clover: "Crown Clover",
  oasis: "Oasis Leap",
  sky: "Sky Loop 360",
};

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

function markWestVent(frames) {
  let best = -1;
  for (let i = 0; i < frames.length; i++) {
    const fr = frames[i];
    fr.drop = false;
    fr.vent = false;
    if (fr.gap || fr.lip || fr.deck || fr.bridge || fr.loop) continue;
    if (fr.p.y < 6.5) continue;
    if (best < 0 || fr.p.x < frames[best].p.x) best = i;
  }
  if (best < 0) return;
  const chosen = [];
  let acc = 0;
  const n = frames.length;
  for (let d = 0; d < 14 && acc < 6.2; d++) {
    for (const s of d === 0 ? [0] : [-d, d]) {
      const i = (best + s + n) % n;
      const fr = frames[i];
      if (fr.gap || fr.lip || fr.deck || fr.loop) continue;
      if (chosen.indexOf(i) >= 0) continue;
      chosen.push(i);
      acc += fr.ds || 2;
      if (acc >= 6.2) break;
    }
  }
  for (const i of chosen) frames[i].vent = true;
}

export function createTrack(id = "dam") {
  const raw = (TRACK_RAW[id] || TRACK_RAW.dam)();
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
      sample.loop = !!p1.loop;
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
      loop: !!pts[i].loop,
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
  const loopMarked = frames.filter((f) => f.loop);
  if (loopMarked.length) {
    let lx = 0;
    let ly = 0;
    let lz = 0;
    for (const f of loopMarked) {
      lx += f.p.x;
      ly += f.p.y;
      lz += f.p.z;
    }
    lx /= loopMarked.length;
    ly /= loopMarked.length;
    lz /= loopMarked.length;
    for (const f of frames) {
      if (!f.loop) continue;
      if (Math.hypot(f.p.x - lx, f.p.y - ly, f.p.z - lz) > 12) f.loop = false;
    }
    const keep = frames.filter((f) => f.loop);
    lx = 0;
    ly = 0;
    lz = 0;
    for (const f of keep) {
      lx += f.p.x;
      ly += f.p.y;
      lz += f.p.z;
    }
    const kn = keep.length || 1;
    lx /= kn;
    ly /= kn;
    lz /= kn;
    for (const f of frames) {
      if (!f.loop) continue;
      const ux = lx - f.p.x;
      const uy = ly - f.p.y;
      const uz = lz - f.p.z;
      const ul = Math.hypot(ux, uy, uz) || 1;
      f.up = { x: ux / ul, y: uy / ul, z: uz / ul };
      f.ceiling = f.up.y < -0.25;
    }
  }
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
    let w = id === "frost" ? 10.4 : 12.4;
    if (frames[i].bridge) w = id === "frost" ? 9.2 : 11.4;
    if (frames[i].lip || frames[i].deck) w = Math.max(w, 14);
    if (frames[i].loop) w = Math.max(w, id === "sky" ? 18 : 13);
    if (id === "frost" && p.y > 11) w = Math.max(w, 11.4);
    if (id === "dam" && p.y > 10) w = Math.max(w, 13.2);
    if (Math.abs(curv) > 0.007) w = Math.max(w, id === "frost" ? 12.2 : 14.4);
    if ((id === "clover" || id === "oasis" || id === "sky") && Math.abs(curv) > 0.005) w = Math.max(w, 15.8);
    frames[i].width = w;
    if (frames[i].loop) frames[i].bank = 0;
    const raised = frames[i].bridge || frames[i].lip || frames[i].deck || frames[i].loop || frames[i].p.y > 7.2;
    frames[i].rail = !frames[i].gap && raised;
    frames[i].shoulder = !frames[i].gap && !frames[i].rail;
  }
  if (id === "clover" || id === "oasis" || id === "sky") {
    for (let i = 0; i < frames.length; i++) {
      const fr = frames[i];
      if (fr.gap || fr.ceiling) {
        fr.rail = false;
        fr.shoulder = !fr.gap;
        continue;
      }
      const ahead = frames[(i + 12) % frames.length];
      const soon = frames[(i + 28) % frames.length];
      const approach = !!(ahead.lip || soon.lip || (ahead.loop && !fr.loop));
      const tight = Math.abs(fr.curvature) > 0.0048;
      const guided = tight || approach || fr.bridge || fr.lip || fr.deck || fr.loop || fr.p.y > 6.2;
      const vent = !tight && !approach && !fr.lip && !fr.deck && !fr.loop && !fr.bridge && i % 24 === 0;
      const onWall = fr.loop && fr.up && fr.up.y < 0.7;
      const pocket = !fr.lip && !onWall && Math.abs(fr.curvature) > 0.02;
      fr.rail = guided && !vent && !pocket;
      if (id === "sky" && fr.loop) fr.rail = false;
      fr.shoulder = !fr.rail && !fr.loop;
    }
  } else {
    for (let i = 0; i < frames.length; i++) {
      const fr = frames[i];
      if (fr.gap) continue;
      const ahead = frames[(i + 12) % frames.length];
      const soon = frames[(i + 24) % frames.length];
      const approach = !!(ahead.lip || soon.lip);
      const tight = Math.abs(fr.curvature) > 0.006 && Math.abs(fr.curvature) < 0.028;
      if (tight || approach) fr.rail = true;
      fr.shoulder = !fr.rail;
    }
  }
  if (id === "dam") markWestVent(frames);
  let cx = 0;
  let cz = 0;
  for (const f of frames) {
    cx += f.p.x;
    cz += f.p.z;
  }
  const track = {
    id,
    name: TRACK_NAME[id] || "Dam Loop",
    theme: id === "frost" || id === "clover" || id === "oasis" || id === "sky" ? id : "dam",
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
  if (track.id === "dam" || track.id === "frost") {
    for (const f of frames) {
      if (f.bridge) run.push(f);
      else flush();
    }
    flush();
  }
  if (track.id === "oasis") {
    let gapRun = [];
    const flushGap = () => {
      if (!gapRun.length) return;
      let minX = Infinity;
      let maxX = -Infinity;
      let minZ = Infinity;
      let maxZ = -Infinity;
      for (const f of gapRun) {
        minX = Math.min(minX, f.p.x);
        maxX = Math.max(maxX, f.p.x);
        minZ = Math.min(minZ, f.p.z);
        maxZ = Math.max(maxZ, f.p.z);
      }
      waters.push({
        id: "leap" + waters.length,
        kind: "box",
        x: (minX + maxX) / 2,
        z: (minZ + maxZ) / 2,
        y: 0.72,
        hx: (maxX - minX) / 2 + 9,
        hz: (maxZ - minZ) / 2 + 12,
      });
      gapRun = [];
    };
    for (const f of frames) {
      if (f.gap) gapRun.push(f);
      else if (gapRun.length) flushGap();
    }
    flushGap();
  }
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
  const theme = track.theme;
  const frost = theme === "frost";
  const trees = [];
  const rocks = [];
  const lodges = [];
  const solids = [];
  if (theme === "dam" || theme === "frost") {
  for (let i = 0; i < frames.length; i += frost ? 8 : 6) {
    const fr = frames[i];
    if (fr.gap || fr.bridge || fr.lip || fr.deck || fr.loop) continue;
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
  }
  if (theme === "clover" || theme === "oasis" || theme === "sky") {
    const step = theme === "sky" ? 10 : theme === "oasis" ? 8 : 7;
    for (let i = 0; i < frames.length; i += step) {
      const fr = frames[i];
      if (fr.gap || fr.bridge || fr.lip || fr.deck || fr.loop) continue;
      const side = i % (step * 2) === 0 ? 1 : -1;
      const dist = fr.width * 0.5 + (theme === "sky" ? 16 : 12) + (i % 4);
      const x = fr.p.x + fr.right.x * dist * side;
      const z = fr.p.z + fr.right.z * dist * side;
      if (!roadClear(frames, x, z, theme === "sky" ? 4 : 2.4)) continue;
      if (theme === "sky") {
        rocks.push({
          x, z, y: fr.p.y, h: 12 + (i % 3) * 3,
          yaw: Math.atan2(fr.tangent.x, fr.tangent.z), pylon: true,
        });
        solids.push({ x, z, r: 1.35 });
      } else if (theme === "oasis" && i % 16 !== 0) {
        rocks.push({ x, z, s: 2.1 + (i % 3) * 0.45, dune: true });
        solids.push({ x, z, r: 1.7 });
      } else {
        trees.push({ x, z, s: theme === "oasis" ? 1.2 : 0.85 + (i % 4) * 0.1, kind: theme });
        solids.push({ x, z, r: 0.65 });
      }
    }
  }
  if (theme === "dam") {
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

function nearest(track, x, y, z, hint) {
  const f = track.frames;
  const n = f.length;
  const yKnown = y != null && Number.isFinite(y);
  let start = hint == null ? 0 : hint;
  let best = start;
  let bestD = Infinity;
  const span = hint == null ? n : 28;
  const nearSeam = hint != null && (start < 16 || start > n - 16);
  for (let k = -span; k <= span; k++) {
    const raw = start + k;
    if (hint != null && (raw < 0 || raw >= n) && !nearSeam) continue;
    const i = (raw % n + n) % n;
    const dx = f[i].p.x - x;
    const dy = yKnown ? f[i].p.y - y : 0;
    const dz = f[i].p.z - z;
    const d = dx * dx + dy * dy + dz * dz;
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  if (hint != null && bestD > 18 * 18) {
    const full = nearest(track, x, y, z, null);
    let dt = full.frame.t - f[start].t;
    if (dt > 0.5) dt -= 1;
    if (dt < -0.5) dt += 1;
    if (Math.abs(dt) > 0.12 && bestD < full.dist2 + 64) {
      return { index: best, dist2: bestD, frame: f[best] };
    }
    return full;
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
    loopSpeed: null,
    loopDir: 1,
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
    along: t,
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
    kart.sector = ahead;
  }
}

/* Place is laps plus the live sample on the ribbon. A lap counts only when
   the kart walks forward across the finish after the halfway mark. A hop
   that skips the line, or a respawn behind the pack, does not keep a lead. */
function noteCrossing(kart, prev, next) {
  prev = ((prev % 1) + 1) % 1;
  next = ((next % 1) + 1) % 1;
  let d = next - prev;
  if (d > 0.5) d -= 1;
  if (d < -0.5) d += 1;
  if (d > 0 && d < 0.28 && next >= 0.5 && next <= 0.97) kart.seenHalf = true;
  if (d > 0 && d < 0.25 && next < 0.2 && prev > 0.8 && kart.seenHalf) {
    kart.laps = (kart.laps || 0) + 1;
    kart.seenHalf = false;
  } else if (d < -0.12 && next < 0.45) {
    kart.seenHalf = false;
  }
  kart.along = (kart.laps || 0) + next;
}

function ribbonDelta(kart, t) {
  const prev = ((kart.t % 1) + 1) % 1;
  const next = ((t % 1) + 1) % 1;
  let d = next - prev;
  if (d > 0.5) d -= 1;
  if (d < -0.5) d += 1;
  return d;
}

function outerSign(track, fr) {
  const toCenter = (track.cx - fr.p.x) * fr.right.x + (track.cz - fr.p.z) * fr.right.z;
  return toCenter >= 0 ? -1 : 1;
}

function adoptProgress(kart, index, track) {
  const fr = track.frames[index];
  const prev = ((kart.t % 1) + 1) % 1;
  const next = ((fr.t % 1) + 1) % 1;
  let d = next - prev;
  if (d > 0.5) d -= 1;
  if (d < -0.5) d += 1;
  noteCrossing(kart, prev, next);
  kart.hint = index;
  kart.t = next;
  if (Math.abs(d) > 0.14) kart.sector = sectorOf(next);
  else advanceSector(kart);
  kart.progress = (kart.laps || 0) + next;
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
  if (kart.stunCd > 0) kart.stunCd = Math.max(0, kart.stunCd - dt);
  if (kart.hitFlash > 0) kart.hitFlash = Math.max(0, kart.hitFlash - dt);
  if ((kart.slickImmune || 0) > 0) kart.slickImmune = Math.max(0, kart.slickImmune - dt);
  const stunned = (kart.stun || 0) > 0;
  if (stunned) kart.stun = Math.max(0, kart.stun - dt);
  if ((kart.slowT || 0) > 0) kart.slowT = Math.max(0, kart.slowT - dt);
  else if ((kart.speedMul || 1) < 0.999) kart.speedMul = Math.min(1, (kart.speedMul || 1) + dt / 0.4);
  const slowMul = Math.min(1, kart.speedMul > 0 ? kart.speedMul : 1);
  const rawSteer = stunned ? 0 : Math.max(-1, Math.min(1, input.steer || 0));
  const assisted = !!(kart.cpu || kart.assist);
  const damp = assisted ? 22 : 8;
  kart.steerSm = (kart.steerSm || 0) + (rawSteer - (kart.steerSm || 0)) * Math.min(1, dt * damp);
  const steer = stunned ? 0 : kart.steerSm;
  const gas = stunned ? 0 : Math.max(0, Math.min(1, Number(input.gas) || 0));
  const brake = stunned ? 0 : input.brake ? 1 : 0;
  kart.throttle = gas;
  kart.braking = brake;
  const speed = Math.hypot(kart.vx, kart.vz);
  kart.drifting = false;
  kart.spark = 0;

  const slow = 1 - Math.min(1, speed / MAX_SPEED);
  const steerRate = assisted
    ? 1.7 * (0.74 + 0.26 * slow) * (kart.handle || 1) * 1.22
    : 1.05 * (0.64 + 0.36 * slow) * (kart.handle || 1);
  if (stunned) {
    kart.stunClock = (kart.stunClock || 0) + dt;
    kart.yaw = wrapAngle(kart.yaw + Math.sin(kart.stunClock * 22) * 2.6 * dt);
  } else {
    kart.yaw = wrapAngle(kart.yaw + steer * steerRate * dt);
    if (!assisted && Math.abs(rawSteer) < 0.28 && Math.abs(kart.slip || 0) > 0.12) {
      kart.yaw = wrapAngle(kart.yaw + (kart.slip || 0) * Math.min(1, dt * 2.1));
    }
  }

  const f = forward(kart.yaw);
  const accel = ACCEL * (kart.cpu ? 0.84 : 1) * (kart.orb > 0 ? 1.12 : 1) * (stunned ? 0 : slowMul);
  if (gas > 0 && !stunned) {
    kart.vx += f.x * accel * dt;
    kart.vz += f.z * accel * dt;
  }
  if (kart.boost > 0 && !stunned) {
    kart.vx += f.x * kart.boostPow * dt;
    kart.vz += f.z * kart.boostPow * dt;
    kart.boost -= dt;
  } else if (kart.boost > 0) {
    kart.boost -= dt;
  }
  if (stunned) {
    const dump = Math.pow(0.15, Math.min(1, dt * 60));
    kart.vx *= dump;
    kart.vz *= dump;
  } else {
    const drag = (brake ? 3.4 : gas ? 0.38 : 1.35) * dt;
    kart.vx -= kart.vx * drag;
    kart.vz -= kart.vz * drag;
  }

  const fwdSp = kart.vx * f.x + kart.vz * f.z;
  let sx = kart.vx - f.x * fwdSp;
  let sz = kart.vz - f.z * fwdSp;
  const keep = Math.exp(-8.2 * dt);
  sx *= keep;
  sz *= keep;
  kart.vx = f.x * fwdSp + sx;
  kart.vz = f.z * fwdSp + sz;

  let sp = Math.hypot(kart.vx, kart.vz);
  const cap =
    (kart.baseCap || (kart.cpu ? 27 : MAX_SPEED)) *
    (kart.boost > 0 && !stunned ? 1.65 : 1) *
    (stunned ? 0.1 : slowMul) *
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
    const fr = track.frames[i];
    if (fr.gap || fr.ceiling || fr.loop) continue;
    return i;
  }
  return 0;
}

function respawnKart(track, kart) {
  kart.falls = (kart.falls || 0) + 1;
  const laps = kart.laps || 0;
  const idx = solidIndex(track, kart.safeHint == null ? kart.hint || 0 : kart.safeHint);
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
  kart.loopSpeed = null;
  kart.laps = laps;
  kart.sector = sectorOf(fr.t);
  kart.progress = laps + (((fr.t % 1) + 1) % 1);
  kart.along = kart.progress;
  kart.stun = Math.min(1.2, Math.max(kart.stun || 0, 0.4));
  kart.respawnCd = 0.75;
  kart.drifting = false;
  kart.spark = 0;
  kart.stuck = 0;
  kart.fallT = 0;
}

function bodyStep(track, kart, dt) {
  if (kart.splash > 0) kart.splash = Math.max(0, kart.splash - dt);
  if (kart.respawnCd > 0) kart.respawnCd = Math.max(0, kart.respawnCd - dt);
  const near = nearest(track, kart.x, kart.y, kart.z, kart.hint);
  const fr = near.frame;
  const lat = (kart.x - fr.p.x) * fr.right.x + (kart.z - fr.p.z) * fr.right.z;
  const edge = fr.width * 0.5 - 0.9;
  const offOuter = !!(fr.vent && (Math.sign(lat) || 0) === outerSign(track, fr) && Math.abs(lat) > edge);
  if (near.dist2 < 26 * 26 && Math.abs(ribbonDelta(kart, fr.t)) <= 0.08) adoptProgress(kart, near.index, track);
  let mode = "air";
  let latNow = lat;
  if (!fr.gap && fr.rail && Math.abs(lat) > edge && !offOuter) {
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
  } else if (!fr.gap && !offOuter && fr.shoulder && Math.abs(lat) <= edge + 3.6) {
    mode = "shoulder";
  } else if (offOuter) {
    mode = "void";
  }
  let rodeLoop = false;
  if (fr.loop && !fr.gap && near.dist2 < 160 * 160) {
    const hTan = Math.hypot(fr.tangent.x, fr.tangent.z);
    let sp = kart.loopSpeed;
    if (sp == null) {
      const alongH = kart.vx * fr.tangent.x + kart.vz * fr.tangent.z;
      sp = hTan > 0.2 ? Math.max(0, alongH / Math.max(0.25, hTan)) : Math.hypot(kart.vx, kart.vz);
    } else {
      const haveH = Math.hypot(kart.vx, kart.vz);
      const added = haveH - (kart.loopHoriz || 0);
      if (added > 0.01) sp += added;
      sp -= 8 * fr.tangent.y * dt;
    }
    const stunned = (kart.stun || 0) > 0;
    const slowMul = Math.min(1, kart.speedMul > 0 ? kart.speedMul : 1);
    const cap =
      (kart.baseCap || (kart.cpu ? 27 : MAX_SPEED)) *
      (kart.boost > 0 && !stunned ? 1.65 : 1) *
      (stunned ? 0.1 : slowMul) *
      (kart.orb > 0 ? 1.18 : 1);
    const floor = stunned ? 0 : fr.ceiling || (fr.up && fr.up.y < 0.35) ? 18 : 13;
    sp = Math.max(floor, Math.min(cap, sp));
    kart.loopSpeed = sp;
    kart.loopDir = 1;
    const nt = fr.t + (sp * dt) / Math.max(1, track.length);
    const nf = frameAt(track, nt);
    kart.loopHoriz = Math.hypot(nf.tangent.x, nf.tangent.z) * sp;
    const keep = Math.max(-fr.width * 0.28, Math.min(fr.width * 0.28, latNow));
    kart.x = nf.p.x + nf.right.x * keep;
    kart.y = nf.p.y + 0.05;
    kart.z = nf.p.z + nf.right.z * keep;
    kart.vx = nf.tangent.x * sp;
    kart.vz = nf.tangent.z * sp;
    kart.vy = nf.tangent.y * sp;
    kart.speed = sp;
    kart.grounded = true;
    kart.air = 0;
    kart.off = 0;
    kart.wet = 0;
    const h2 = Math.hypot(nf.tangent.x, nf.tangent.z);
    if (h2 > 0.2) {
      const aim = Math.atan2(nf.tangent.x, nf.tangent.z);
      kart.yaw = wrapAngle(kart.yaw + wrapAngle(aim - kart.yaw) * Math.min(1, dt * 6));
    }
    adoptProgress(kart, frameIndex(track, nf.t), track);
    rodeLoop = true;
  } else if (!fr.loop) {
    kart.loopSpeed = null;
  }
  const bankY = fr.p.y + Math.sin(fr.bank) * latNow;
  const along = kart.vx * fr.tangent.x + kart.vz * fr.tangent.z;
  const roadY = mode === "shoulder" ? bankY - 0.16 : bankY + 0.05;
  const closeEnough = kart.y <= roadY + 0.45 && kart.y >= roadY - 1.35;
  if (!rodeLoop && (mode === "road" || mode === "shoulder") && closeEnough && (kart.grounded || kart.vy <= 2.5)) {
    kart.y = roadY;
    kart.vy = along * fr.tangent.y;
    kart.grounded = true;
    kart.air = 0;
    kart.off = 0;
    kart.wet = 0;
    const pull = 22 * fr.tangent.y;
    kart.vx -= fr.tangent.x * pull * dt;
    kart.vz -= fr.tangent.z * pull * dt;
    const guided = track.theme === "clover" || track.theme === "oasis" || track.theme === "sky";
    if (guided && mode === "road" && fr.rail && Math.abs(latNow) > edge * 0.5) {
      const sign = Math.sign(latNow) || 1;
      const shove = 12 + (kart.speed > 18 ? 14 : 0);
      kart.vx -= fr.right.x * sign * shove * dt;
      kart.vz -= fr.right.z * sign * shove * dt;
    }
    if (mode === "shoulder") {
      const drag = track.theme === "frost" ? 2.2 : 1.45;
      const keep = Math.exp(-drag * dt);
      kart.vx *= keep;
      kart.vz *= keep;
      const sign = Math.sign(latNow) || 1;
      kart.vx -= fr.right.x * sign * 16 * dt;
      kart.vz -= fr.right.z * sign * 16 * dt;
      const aim = Math.atan2(fr.tangent.x, fr.tangent.z);
      kart.yaw = wrapAngle(kart.yaw + wrapAngle(aim - kart.yaw) * Math.min(1, dt * 2.4));
      kart.off = (kart.off || 0) + dt;
      if (kart.off > 2.5) respawnKart(track, kart);
    } else if (kart.respawnCd <= 0 && along > 8 && !fr.lip && !fr.deck && !fr.loop && Math.abs(ribbonDelta(kart, fr.t)) <= 0.08) {
      const back = frameAt(track, fr.t - 0.055);
      const soon = frameAt(track, fr.t + 0.04);
      if (!back.gap && !back.lip && !back.deck && !back.loop && !soon.gap && !soon.lip && !soon.loop) {
        kart.safeHint = frameIndex(track, back.t);
        const clear = frameAt(track, fr.t + 0.14);
        if (!clear.gap && !clear.lip && !clear.deck && !clear.loop) kart.falls = 0;
      }
      kart.off = 0;
    } else {
      kart.off = 0;
    }
  } else if (!rodeLoop && (mode === "road" || mode === "shoulder") && kart.y > roadY + 0.45) {
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
  } else if (!rodeLoop) {
    kart.vy -= GRAVITY * dt;
    kart.y += kart.vy * dt;
    kart.grounded = false;
    kart.air += dt;
    const w = waterUnder(track, kart.x, kart.z);
    if (offOuter) {
      kart.fallT = (kart.fallT || 0) + dt;
      if (kart.y < -4) {
        kart.y = -4;
        kart.vy = 0;
      }
      if (kart.fallT >= 1.5) respawnKart(track, kart);
    } else if (w && kart.y <= w.y + 0.55) {
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
      const keep = Math.exp(-3.1 * dt);
      kart.vx *= keep;
      kart.vz *= keep;
      if (kart.off > 1.85) respawnKart(track, kart);
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
  if (kart.loopSpeed == null && kart.grounded && (kart.speed < 7 || (fr.rail && kart.speed < 13))) {
    const aim = Math.atan2(fr.tangent.x, fr.tangent.z);
    const rate = kart.speed < 7 ? 3.2 : 2.4;
    kart.yaw = wrapAngle(kart.yaw + wrapAngle(aim - kart.yaw) * Math.min(1, dt * rate));
  }
  if (kart.grounded && kart.speed < 4.5 && mode === "road") {
    kart.creep = (kart.creep || 0) + dt;
    if (kart.creep > 0.7) {
      kart.vx += fr.tangent.x * 22 * dt;
      kart.vz += fr.tangent.z * 22 * dt;
    }
  } else kart.creep = 0;
  kart.speed = kart.loopSpeed != null ? kart.loopSpeed : Math.hypot(kart.vx, kart.vz);
  const guidedTheme = track.theme === "clover" || track.theme === "oasis" || track.theme === "sky";
  if (guidedTheme && (kart.respawnCd || 0) <= 0 && kart.loopSpeed == null) {
    kart.watchAge = (kart.watchAge || 0) + dt;
    if (kart.watchT == null) kart.watchT = kart.t;
    if (kart.watchAge > 3) {
      let adv = kart.t - kart.watchT;
      if (adv < -0.5) adv += 1;
      kart.watchAge = 0;
      kart.watchT = kart.t;
      if (adv < 0.04 && kart.grounded) {
        const ahead = frameAt(track, kart.t + 0.1);
        kart.safeHint = frameIndex(track, ahead.t);
        kart.falls = 0;
        respawnKart(track, kart);
      }
    }
  }
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
  const length = Math.max(80, race.track.length || 1000);
  let leader = race.karts[0];
  for (const k of race.karts) if ((k.progress || 0) > (leader.progress || 0)) leader = k;
  const band = { nib: 1.02, tall: 1.01, bober: 1, muscle: 0.98 };
  for (const kart of race.karts) {
    if (!kart.cpu) {
      kart.baseCap = MAX_SPEED;
      continue;
    }
    const spd = Math.max(16, kart.speed || 22);
    const behind = ((leader.progress - kart.progress) * length) / spd;
    const aheadYou = you ? ((kart.progress - you.progress) * length) / spd : 0;
    if (behind > 1.8) kart.chase = true;
    if (behind <= 0.6) kart.chase = false;
    if (aheadYou > 2.5) kart.ease = true;
    if (aheadYou <= 1.2) kart.ease = false;
    let mul = band[kart.id] || 1;
    if (kart.chase) mul *= 1.08;
    if (kart.ease) mul *= 0.94;
    kart.baseCap = MAX_SPEED * mul;
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
  const here0 = track.frames[kart.hint] || frameAt(track, kart.t);
  if (kart.grounded && here0.loop) {
    return { steer: 0, gas: 1, drift: false, brake: false, fire: false };
  }
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
  const now = track.frames[kart.hint] || frameAt(track, kart.t);
  const length = Math.max(80, track.length || 1000);
  const LINE = 12 * (18 / 280);
  const aimFr = frameAt(track, kart.t + 0.028);
  const soon = frameAt(track, kart.t + 0.05);
  const mid = frameAt(track, kart.t + 0.02);
  const latNow = (kart.x - now.p.x) * now.right.x + (kart.z - now.p.z) * now.right.z;
  const wantLat = Math.max(-LINE, Math.min(LINE, (kart.lane || 0) * LINE * 0.35));
  let tx = aimFr.p.x + aimFr.right.x * wantLat;
  let tz = aimFr.p.z + aimFr.right.z * wantLat;
  if (!kart.held && race.boxes) {
    let best = null;
    for (const box of race.boxes) {
      if (!box.alive) continue;
      let dt = box.t - kart.t;
      if (dt < -0.5) dt += 1;
      if (dt > 0.5) dt -= 1;
      if (dt < 0.004 || dt > 0.035) continue;
      const fr = frameAt(track, box.t);
      const blat = (box.lane || 0) * fr.width * 0.5;
      if (Math.abs(blat) > fr.width * 0.42) continue;
      const bx = fr.p.x + fr.right.x * blat;
      const bz = fr.p.z + fr.right.z * blat;
      const d = Math.hypot(kart.x - bx, kart.z - bz);
      if (!best || d < best.d) best = { bx, bz, d };
    }
    if (best) {
      tx = best.bx;
      tz = best.bz;
    }
  }
  let desired = Math.atan2(tx - kart.x, tz - kart.z);
  if (kart.stuck > 0.7) desired = Math.atan2(now.tangent.x, now.tangent.z);
  const err = wrapAngle(desired - kart.yaw);
  let steerOut = Math.max(-1, Math.min(1, err / 0.42));
  const curvSoon = Math.abs(soon.curvature);
  const curvNow = Math.abs(now.curvature);
  const curvMid = Math.abs(mid.curvature);
  let gas = 1;
  let brake = false;
  const coming = curvSoon > 0.0065 || curvMid > 0.008;
  const inCorner = curvNow > 0.007 || curvMid > 0.009;
  const exiting = curvNow < 0.0045 && curvSoon < 0.005;
  if (coming && kart.speed > 17) {
    const target = Math.max(15, kart.speed * 0.65);
    if (kart.speed > target + 2) {
      gas = 0.35;
      brake = kart.speed > target + 5;
    } else gas = 0.72;
  } else if (inCorner) {
    gas = 0.7;
  } else if (exiting) {
    gas = 1;
  }
  const hazard = frameAt(track, kart.t + 0.08);
  if (here.lip || here.deck || hazard.lip || hazard.gap || hazard.deck) {
    gas = 1;
    brake = false;
    steerOut = Math.max(-1, Math.min(1, steerOut - latNow / Math.max(2.5, here.width * 0.45)));
  }
  let fire = false;
  if (kart.cpu && kart.held && kart.fireCd <= 0 && kart.stun <= 0.15) {
    const you = humanOf(race);
    const age = kart.holdAge || 0;
    const px = 18 / 280;
    const nose = forward(kart.yaw);
    const relTo = (other) => {
      if (!other) return { rel: 0, dist: 99, cone: false };
      let rel = other.t - kart.t;
      if (rel > 0.5) rel -= 1;
      if (rel < -0.5) rel += 1;
      const dx = other.x - kart.x;
      const dz = other.z - kart.z;
      const dist = Math.hypot(dx, dz) || 1;
      const cone = (nose.x * dx + nose.z * dz) / dist > 0.72;
      return { rel, dist, cone };
    };
    const p = relTo(you && you.id !== kart.id ? you : null);
    let threat = null;
    for (const other of race.karts) {
      if (other.id === kart.id || other.finished) continue;
      const info = relTo(other);
      if (info.rel > 0.004 && info.dist < 70 && info.cone && (!threat || info.dist < threat.dist)) threat = info;
    }
    let h = 0;
    const stamp = kart.id + ":" + Math.floor((race.time || 0) * 2);
    for (let i = 0; i < stamp.length; i++) h = (h * 33 + stamp.charCodeAt(i)) >>> 0;
    const preferPlayer = (h % 1000) / 1000 < 0.6;
    const playerAhead = p.rel > 0.004 && p.dist < 70 && p.cone;
    const playerBehind = p.rel < -0.004 && p.dist < 120 * px;
    const choke = Math.abs(frameAt(track, kart.t + 0.03).curvature) > 0.008;
    let straight = true;
    for (let s = 1; s <= 3; s++) {
      if (Math.abs(frameAt(track, kart.t + (s * 5.2) / length).curvature) > 0.005) straight = false;
    }
    let inbound = false;
    for (const shot of race.shots || []) {
      if (shot.owner === kart.id) continue;
      const dx = kart.x - shot.x;
      const dz = kart.z - shot.z;
      if (Math.hypot(dx, dz) < 18 && shot.vx * dx + shot.vz * dz > 0) inbound = true;
    }
    for (const wall of race.surges || []) {
      if (wall.owner !== kart.id && Math.hypot(kart.x - wall.x, kart.z - wall.z) < 16) inbound = true;
    }
    const id = kart.held;
    let useful = false;
    if (id === "boost") useful = (straight && kart.speed > 14) || age >= 2.95;
    else if (id === "trap" || id === "slick") useful = playerBehind || choke;
    else if (id === "buckler") useful = inbound || (p.rel < -0.002 && p.dist < 100 * px);
    else useful = (preferPlayer && playerAhead) || (!!threat && (!preferPlayer || !playerAhead));
    const stunItem = id === "trap" || id === "pine" || id === "surge" || id === "meteor";
    const aimedAtYou = (id === "trap" || id === "slick") ? playerBehind : playerAhead || (preferPlayer && playerAhead);
    if (stunItem && aimedAtYou && you) {
      if ((you.stun || 0) > 0.12 || race.time - (race.stunLock || -9) < 2.5) useful = false;
    }
    if (useful && (age >= 0.4 || (id === "boost" && age >= 2.95))) {
      fire = true;
      if (stunItem && aimedAtYou) race.stunLock = race.time;
    }
  }
  return { steer: steerOut, gas, brake, drift: false, fire };
}

export function raceProgress(kart) {
  const t = ((kart.t % 1) + 1) % 1;
  return (kart.laps || 0) + t;
}

export function livePlace(race, id) {
  const sorted = [...race.karts].sort((a, b) => raceProgress(b) - raceProgress(a) || a.id.localeCompare(b.id));
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

function testStunDump(fails) {
  const track = createTrack();
  const fr = track.frames.find((f) => !f.loop && !f.gap && !f.ceiling && !f.vent && f.rail) || frameAt(track, 0.2);
  const gas = { steer: 1, gas: 1, brake: false, drift: false };
  const stunned = loneKart(track, fr, 22);
  stunned.cpu = true;
  stunned.baseCap = 29;
  stunned.stun = 0.7;
  stunned.hitFlash = 0.45;
  stunned.speedMul = 1;
  stunned.slowT = 0;
  for (let i = 0; i < 18; i++) {
    integrate(stunned, gas, 1 / 60);
    bodyStep(track, stunned, 1 / 60);
  }
  if (stunned.speed > 4) fails.push("stun crawl " + stunned.speed.toFixed(2));
  if (Math.abs(stunned.yaw) < 0.08 && (stunned.falls || 0) === 0) fails.push("stun wobble " + stunned.yaw.toFixed(3));
  if (!(stunned.hitFlash > 0.05)) fails.push("hit flash " + (stunned.hitFlash || 0).toFixed(2));

  const slowed = loneKart(track, fr, 26);
  slowed.cpu = true;
  slowed.baseCap = 29;
  slowed.stun = 0;
  slowed.speedMul = 0.3;
  slowed.slowT = 1.2;
  for (let i = 0; i < 10; i++) {
    integrate(slowed, gas, 1 / 60);
    bodyStep(track, slowed, 1 / 60);
  }
  if (slowed.speed > 29 * 0.3 + 1) fails.push("slow crawl " + slowed.speed.toFixed(2));

  const back = loneKart(track, fr, 8);
  back.cpu = true;
  back.baseCap = 29;
  back.stun = 0;
  back.speedMul = 0.35;
  back.slowT = 0.05;
  for (let i = 0; i < 45; i++) integrate(back, { steer: 0, gas: 1, drift: false }, 1 / 60);
  if (back.speedMul < 0.95) fails.push("slow recover " + back.speedMul.toFixed(2));
}

function testBoost(fails) {
  const kart = {
    x: 0, y: 0, z: 0, yaw: 0, vx: 0, vz: 18, speed: 18,
    spark: 0, drifting: false, boost: 1.8, boostPow: 44, steerHold: 0, slip: 0,
  };
  const before = kart.speed;
  integrate(kart, { steer: 0, gas: 1, drift: false }, 1 / 60);
  if (!(kart.boost > 1.7)) fails.push("boost life " + kart.boost.toFixed(2));
  if (!(kart.speed > before)) fails.push("boost speed");
  if (kart.drifting) fails.push("drift still on");
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
    const near = nearest(track, s.x, null, s.z, null);
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

function hardPinch(frames) {
  for (let i = 0; i < frames.length; i++) {
    const a = frames[i];
    if (!Number.isFinite(a.p.x) || !Number.isFinite(a.tangent.x)) return "nan";
    for (let j = i + 20; j < frames.length - 20; j++) {
      const b = frames[j];
      const dx = a.p.x - b.p.x;
      const dz = a.p.z - b.p.z;
      const dy = a.p.y - b.p.y;
      if (dx * dx + dz * dz >= 16 || Math.abs(dy) >= 3.2 || (a.loop && b.loop)) continue;
      const mouth = (a.loop && a.up && a.up.y > 0.35) || (b.loop && b.up && b.up.y > 0.35);
      if (mouth) continue;
      return i + ":" + j;
    }
  }
  return "";
}

function finishSim(track, fails, label, seconds) {
  const pinch = hardPinch(track.frames);
  if (pinch) fails.push(label + " pinch " + pinch);
  if (track.length < 700 || track.length > 1400) fails.push(label + " len " + track.length.toFixed(0));
  const race = createRace(track);
  if (!race.boxes || race.boxes.length !== 12) fails.push(label + " boxes");
  for (const b of race.boxes || []) {
    const fr = frameAt(track, b.t);
    if (fr.gap || fr.lip || fr.loop || fr.ceiling) {
      fails.push(label + " box hazard");
      break;
    }
  }
  race.phase = "race";
  for (const k of race.karts) k.assist = true;
  let guard = 0;
  const hud = new Set();
  while (race.phase !== "podium" && guard < 60 * (seconds || 280)) {
    const inputs = {};
    for (const k of race.karts) inputs[k.id] = adviceFor(race, k.id);
    stepRace(race, inputs, 1 / 60);
    for (const k of race.karts) hud.add(lapOf(k));
    guard++;
  }
  if (!hud.has(1) || !hud.has(2) || !hud.has(3)) fails.push(label + " hud " + [...hud].join(","));
  if (race.phase !== "podium") {
    fails.push(
      label +
        " no podium " +
        race.karts
          .map((k) => {
            const here = frameAt(track, k.t);
            return (
              k.id +
              ":" +
              k.laps +
              "@" +
              k.t.toFixed(2) +
              " " +
              here.p.x.toFixed(0) +
              "," +
              here.p.z.toFixed(0) +
              (here.rail ? "R" : "o")
            );
          })
          .join(" ")
    );
    return;
  }
  const lapSec = guard / 60 / LAPS;
  const slow = seconds ? 90 : 55;
  const fast = seconds ? 28 : 30;
  if (lapSec < fast || lapSec > slow) fails.push(label + " lap " + lapSec.toFixed(1));
  const sorted = [...race.karts].sort((a, b) => b.progress - a.progress);
  const cheeseCap = seconds ? 2.45 : 1.15;
  if (sorted[0].progress - sorted[sorted.length - 1].progress > cheeseCap) {
    fails.push(
      label +
        " cheese " +
        (sorted[0].progress - sorted[sorted.length - 1].progress).toFixed(2) +
        " " +
        sorted.map((k) => k.id + ":" + k.laps).join(" ")
    );
  }
}

function testClover(fails) {
  const track = createTrack("clover");
  if (track.theme !== "clover" || track.name !== "Crown Clover") fails.push("clover name");
  if ((track.waters || []).length) fails.push("clover water");
  let layered = false;
  const frames = track.frames;
  for (let i = 0; i < frames.length; i++) {
    for (let j = i + 20; j < frames.length - 20; j++) {
      const d = Math.hypot(frames[i].p.x - frames[j].p.x, frames[i].p.z - frames[j].p.z);
      if (d < 6 && Math.abs(frames[i].p.y - frames[j].p.y) > 6) layered = true;
    }
  }
  if (!layered) fails.push("clover flat cross");
  let high = null;
  let low = null;
  for (let i = 0; i < frames.length && !high; i++) {
    for (let j = i + 20; j < frames.length - 20; j++) {
      const d = Math.hypot(frames[i].p.x - frames[j].p.x, frames[i].p.z - frames[j].p.z);
      if (d < 8 && Math.abs(frames[i].p.y - frames[j].p.y) > 6) {
        high = frames[i].p.y > frames[j].p.y ? frames[i] : frames[j];
        low = high === frames[i] ? frames[j] : frames[i];
        break;
      }
    }
  }
  if (!high || !low) fails.push("clover layers");
  else {
    const top = loneKart(track, high, 16);
    const bot = loneKart(track, low, 16);
    for (let i = 0; i < 40; i++) {
      integrate(top, { steer: 0, gas: 1, drift: false }, 1 / 60);
      bodyStep(track, top, 1 / 60);
      integrate(bot, { steer: 0, gas: 1, drift: false }, 1 / 60);
      bodyStep(track, bot, 1 / 60);
    }
    if (top.y < 8) fails.push("clover dropped " + top.y.toFixed(1));
    if (bot.y > 6) fails.push("clover climbed " + bot.y.toFixed(1));
  }
  finishSim(track, fails, "clover");
}

function testLeap(track, fails, label) {
  const lips = [];
  for (let i = 0; i < track.frames.length; i++) {
    if (track.frames[i].lip && (i === 0 || !track.frames[i - 1].lip)) lips.push(i);
  }
  if (lips.length < 2) fails.push(label + " lips " + lips.length);
  for (const lip of lips) {
    let steep = lip;
    for (let i = lip; i < lip + 20 && i < track.frames.length; i++) {
      if (track.frames[i].lip && track.frames[i].tangent.y > track.frames[steep].tangent.y) steep = i;
    }
    if (track.frames[steep].tangent.y < 0.18) fails.push(label + " flat " + track.frames[steep].tangent.y.toFixed(3));
    const start = track.frames[lip];
    const jumper = loneKart(track, start, 26);
    let sawAir = false;
    let landed = false;
    let maxY = jumper.y;
    const y0 = jumper.y;
    for (let i = 0; i < 240; i++) {
      integrate(jumper, { steer: 0, gas: 1, drift: false }, 1 / 60);
      bodyStep(track, jumper, 1 / 60);
      if (!jumper.grounded) sawAir = true;
      if (jumper.y > maxY) maxY = jumper.y;
      if (sawAir && jumper.grounded && jumper.splash < 0.5) landed = true;
    }
    if (!sawAir || maxY < y0 + 0.55 || !landed) {
      fails.push(label + " jump air" + sawAir + " land" + landed + " y" + (maxY - y0).toFixed(2));
    }
    const slow = loneKart(track, start, 8);
    let slowLand = false;
    let slowWet = false;
    for (let i = 0; i < 260; i++) {
      integrate(slow, { steer: 0, gas: 0.15, drift: false }, 1 / 60);
      bodyStep(track, slow, 1 / 60);
      if (slow.splash > 0.5 || slow.wet > 0) slowWet = true;
      if (slow.grounded && slow.t > start.t + 0.06 && slow.t < start.t + 0.4) slowLand = true;
    }
    if (slowLand && !slowWet) fails.push(label + " slow cleared");
  }
  const gap = track.frames.find((f) => f.gap);
  if (gap) {
    const floater = loneKart(track, gap, 0);
    floater.y = gap.p.y + 1.2;
    floater.vy = 0;
    floater.vx = 0;
    floater.vz = 0;
    floater.grounded = true;
    bodyStep(track, floater, 1 / 60);
    if (floater.grounded || floater.vy > -0.2) fails.push(label + " air cruise");
  }
}

function testOasis(fails) {
  const track = createTrack("oasis");
  if (track.name !== "Oasis Leap") fails.push("oasis name");
  const leaps = (track.waters || []).filter((w) => String(w.id).startsWith("leap"));
  if (leaps.length < 2) fails.push("oasis pools " + leaps.length);
  for (const fr of track.frames) {
    if (fr.gap) continue;
    const w = waterUnder(track, fr.p.x, fr.p.z);
    if (w && fr.p.y < w.y + 1.15) fails.push("oasis wet road");
  }
  testLeap(track, fails, "oasis");
  finishSim(track, fails, "oasis");
}

function testSky(fails) {
  const track = createTrack("sky");
  if (track.name !== "Sky Loop 360") fails.push("sky name");
  if ((track.waters || []).length) fails.push("sky water");
  const tops = track.frames.filter((f) => f.loop && f.ceiling);
  if (tops.length < 8) fails.push("sky ceiling");
  const entry = track.frames.find((f) => f.loop && f.up && f.up.y > 0.8);
  if (!entry) {
    fails.push("sky entry");
    return;
  }
  const fast = loneKart(track, entry, 28);
  let maxY = fast.y;
  let stayed = false;
  for (let i = 0; i < 420; i++) {
    integrate(fast, { steer: 0, gas: 1, drift: false }, 1 / 60);
    bodyStep(track, fast, 1 / 60);
    if (fast.y > maxY) maxY = fast.y;
    if (fast.grounded && fast.y > 22) stayed = true;
  }
  if (maxY < 22 || !stayed) fails.push("sky loop " + maxY.toFixed(1) + " stay" + stayed);
  for (const [name, sp0] of [
    ["nib", 12],
    ["bober", 16],
    ["tall", 20],
    ["muscle", 14],
  ]) {
    const rider = loneKart(track, entry, sp0);
    const t0 = rider.t;
    let hi = rider.y;
    for (let i = 0; i < 500; i++) {
      integrate(rider, { steer: 0, gas: 1, drift: false }, 1 / 60);
      bodyStep(track, rider, 1 / 60);
      if (rider.y > hi) hi = rider.y;
    }
    let adv = rider.t - t0;
    if (adv < -0.5) adv += 1;
    if (hi < 18) fails.push(name + " sky low " + hi.toFixed(1));
    if (adv < 0.08) fails.push(name + " sky stuck " + adv.toFixed(3));
    const here = track.frames[rider.hint] || frameAt(track, rider.t);
    if (here.loop && here.ceiling) fails.push(name + " sky ceiling");
  }
  finishSim(track, fails, "sky", 420);
}

export function selfTest() {
  const fails = [];
  const track = createTrack();
  if (track.length < 700 || track.length > 1300) fails.push("length " + track.length.toFixed(1));
  const pinch = hardPinch(track.frames);
  if (pinch) fails.push("pinch " + pinch);
  testSteer(fails);
  testBoost(fails);
  testStunDump(fails);
  testPhysics(fails);
  const probe = createRace(track);
  resetRace(probe);
  probe.phase = "race";
  probe.time = 4;
  const cpuProbe = probe.karts.find((k) => k.cpu);
  cpuProbe.held = "boost";
  cpuProbe.holdAge = 3.1;
  cpuProbe.fireCd = 0;
  cpuProbe.speed = 20;
  cpuProbe.stun = 0;
  if (!adviceFor(probe, cpuProbe.id).fire) fails.push("boost hoard");
  cpuProbe.holdAge = 0.1;
  if (adviceFor(probe, cpuProbe.id).fire) fails.push("boost snap");
  const race = createRace(track);
  if (race.karts.length !== 4) fails.push("roster");
  race.phase = "race";
  for (const k of race.karts) k.assist = true;
  let guard = 0;
  let contend = 0;
  let fires = 0;
  const lapSeen = new Set();
  const watched = humanOf(race);
  while (race.phase !== "podium" && guard < 60 * 360) {
    const inputs = {};
    for (const k of race.karts) {
      const adv = adviceFor(race, k.id);
      if (k.cpu && adv.fire) fires += 1;
      inputs[k.id] = adv;
    }
    stepRace(race, inputs, 1 / 60);
    lapSeen.add(lapOf(watched));
    if (guard > 60 * 10 && guard % 45 === 0) {
      const sorted = [...race.karts].sort((a, b) => b.progress - a.progress);
      contend = sorted[0].progress - sorted[1].progress;
    }
    guard++;
  }
  if (!lapSeen.has(1) || !lapSeen.has(2) || !lapSeen.has(3)) fails.push("lap hud " + [...lapSeen].join(","));
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
    if (contend > 0.16) fails.push("cruise " + contend.toFixed(3));
    if (fires < 4) fails.push("cpu fire " + fires);
  }
  testNoInstant(fails);
  const itemRace = createRace(track);
  testItems(itemRace, fails);
  const frost = createTrack("frost");
  if (frost.theme !== "frost" || frost.length < 640 || frost.length > 1300) fails.push("frost " + frost.length.toFixed(0));
  if (frost.frames.filter((f) => f.bridge).length < 6) fails.push("bridges");
  const frostPinch = hardPinch(frost.frames);
  if (frostPinch) fails.push("frost pinch " + frostPinch);
  const frostRace = createRace(frost);
  resetRace(frostRace);
  for (let i = 0; i < 60 * 5; i++) {
    const inputs = {};
    for (const k of frostRace.karts) inputs[k.id] = k.cpu ? adviceFor(frostRace, k.id) : { steer: 0, gas: 1, drift: false };
    stepRace(frostRace, inputs, 1 / 60);
  }
  if (frostRace.phase !== "race" || frostRace.karts[0].laps !== 0) fails.push("frost instant");
  const walker = { t: 0.02, sector: 0, seenHalf: false, laps: 0, progress: 0.02, hint: 0 };
  for (let s = 1; s <= 24; s++) {
    const next = (0.02 + s / SECTORS) % 1;
    noteCrossing(walker, walker.t, next);
    walker.t = next;
    walker.sector = sectorOf(next);
  }
  if (walker.laps < 3) fails.push("laps stuck " + walker.laps);
  const seam = { t: 0.12, seenHalf: false, laps: 0, along: 0.12 };
  noteCrossing(seam, seam.t, 0.72);
  if (seam.laps !== 0) fails.push("half glitch " + seam.laps);
  noteCrossing(seam, 0.72, 0.9);
  seam.t = 0.9;
  noteCrossing(seam, seam.t, 0.04);
  if (seam.laps !== 1) fails.push("finish once " + seam.laps);
  noteCrossing(seam, 0.04, 0.93);
  if (seam.laps !== 1) fails.push("phantom back " + seam.laps);
  let cursor = 0.04;
  for (let n = 0; n < 16; n++) {
    const nxt = (cursor + 0.125) % 1;
    noteCrossing(seam, cursor, nxt);
    cursor = nxt;
  }
  if (seam.laps < 3) fails.push("three passes " + seam.laps);
  const hopped = { t: 0.12, sector: sectorOf(0.12), seenHalf: false, laps: 0, progress: 0.12, hint: 0 };
  adoptProgress(hopped, frameIndex(track, 0.72), track);
  if (hopped.laps !== 0) fails.push("phantom lap");
  if (hopped.sector !== sectorOf(0.72)) fails.push("sector stuck " + hopped.sector);
  const pack = createRace(track, "bober");
  resetRace(pack);
  pack.phase = "race";
  pack.time = 12;
  for (const k of pack.karts) {
    const t = k.id === "bober" ? 0.16 : 0.48;
    const fr = frameAt(track, t);
    k.t = t;
    k.laps = 0;
    k.seenHalf = false;
    k.progress = t;
    k.along = t;
    k.x = fr.p.x;
    k.y = fr.p.y;
    k.z = fr.p.z;
    k.hint = frameIndex(track, t);
    k.safeHint = k.hint;
    k.grounded = true;
  }
  if (livePlace(pack, "bober") !== 4) fails.push("behind place " + livePlace(pack, "bober"));
  const fallen = humanOf(pack);
  fallen.y = -8;
  fallen.air = 3;
  fallen.vy = -4;
  bodyStep(track, fallen, 1 / 60);
  if (livePlace(pack, "bober") !== 4) fails.push("respawn place " + livePlace(pack, "bober") + " t" + fallen.t.toFixed(2));
  const snapKart = humanOf(pack);
  const snapProg = snapKart.progress;
  const far = frameAt(track, snapKart.t + 0.45);
  snapKart.x = far.p.x;
  snapKart.y = far.p.y + 0.1;
  snapKart.z = far.p.z;
  snapKart.grounded = true;
  bodyStep(track, snapKart, 1 / 60);
  if (snapKart.progress > snapProg + 0.08) fails.push("snap ahead " + snapKart.progress.toFixed(2));
  if (livePlace(pack, snapKart.id) !== 4) fails.push("snap place " + livePlace(pack, snapKart.id));
  const dropFr = track.frames.find((f) => f.vent);
  if (!dropFr) fails.push("west vent");
  else {
    const faller = humanOf(pack);
    for (const k of pack.karts) {
      const t = k.id === faller.id ? 0.2 : 0.55;
      const fr = frameAt(track, t);
      k.t = t;
      k.laps = 0;
      k.seenHalf = false;
      k.progress = t;
      k.along = t;
      k.x = fr.p.x;
      k.y = fr.p.y;
      k.z = fr.p.z;
      k.hint = frameIndex(track, t);
      k.safeHint = k.hint;
      k.grounded = true;
      k.air = 0;
      k.falls = 0;
      k.vy = 0;
      k.vx = 0;
      k.vz = 0;
      k.respawnCd = 0;
    }
    const before = faller.progress;
    const sign = outerSign(track, dropFr);
    faller.x = dropFr.p.x + dropFr.right.x * sign * (dropFr.width * 0.5 + 2.4);
    faller.z = dropFr.p.z + dropFr.right.z * sign * (dropFr.width * 0.5 + 2.4);
    faller.y = dropFr.p.y + 0.2;
    faller.vy = 0;
    faller.grounded = false;
    let dropped = false;
    let frames = 0;
    for (let i = 0; i < 140; i++) {
      frames += 1;
      const y0 = faller.y;
      bodyStep(track, faller, 1 / 60);
      if (faller.y < y0 - 0.04) dropped = true;
      if ((faller.falls || 0) > 0) break;
    }
    if (!dropped) fails.push("no drop");
    if ((faller.falls || 0) < 1) fails.push("no respawn");
    if (frames < 80 || frames > 100) fails.push("vent time " + frames);
    if (faller.laps !== 0) fails.push("drop laps " + faller.laps);
    if (faller.progress > 0.5 || faller.progress < 0.05) fails.push("drop progress " + faller.progress.toFixed(3));
    if (livePlace(pack, faller.id) !== 4) fails.push("drop place " + livePlace(pack, faller.id) + " p" + faller.progress.toFixed(2));
    if (before < 0) fails.push("drop before");
  }
  testClover(fails);
  testOasis(fails);
  testSky(fails);
  return {
    ok: fails.length === 0,
    fails,
    length: Math.round(track.length),
    ticks: guard,
    seconds: Math.round(guard / 60),
  };
}
