/* Item boxes and place-weighted throws. Blue Lodge Orb only in 1st or 2nd.
   BOOST, Thunder Twig, and Crest Bomb share that table. */
import { frameAt, forward, livePlace } from "./sim.js?v=gd30";

export const ITEM_IDS = ["sap", "trap", "wall", "rocket", "star", "orb", "twig", "bomb", "boost"];
export const ITEM_NAME = {
  sap: "Sap Shell",
  trap: "Stick Trap",
  wall: "Snow Wall",
  rocket: "Yeet Rocket",
  star: "Star Thaw",
  orb: "Lodge Orb",
  twig: "Thunder Twig",
  bomb: "Crest Bomb",
  boost: "BOOST",
};

const U = 18 / 280;
const SAP_RANGE = 220 * U;
const SAP_R = 28 * U;
const TRAP_R = 36 * U;
const WALL_AHEAD = 60 * U;
const WALL_HALF = (70 * U) * 0.5;
const ROCKET_SPEED = 46;
const ROCKET_R = 32 * U;
const TWIG_RANGE = 280 * U;
const BOMB_AHEAD = 180 * U;
const BOMB_R = 55 * U;
const ORB_R = 34 * U;

const LEAD = [
  ["sap", 3],
  ["trap", 2],
  ["wall", 1],
  ["rocket", 1],
  ["star", 2],
  ["orb", 2],
  ["twig", 2],
  ["bomb", 2],
  ["boost", 3],
];
const BACK = [
  ["sap", 3],
  ["trap", 3],
  ["wall", 3],
  ["rocket", 4],
  ["star", 2],
  ["twig", 4],
  ["bomb", 4],
  ["boost", 5],
];

function hash(n) {
  let x = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b);
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35);
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
}

function wrapDt(a, b) {
  let dt = b - a;
  if (dt < -0.5) dt += 1;
  if (dt > 0.5) dt -= 1;
  return dt;
}

export function rollItem(place, rng = Math.random) {
  const table = place <= 2 ? LEAD : BACK;
  let sum = 0;
  for (const row of table) sum += row[1];
  let r = rng() * sum;
  for (const [id, w] of table) {
    r -= w;
    if (r <= 0) return id;
  }
  return table[0][0];
}

function safeT(track, t) {
  let tt = ((t % 1) + 1) % 1;
  for (let n = 0; n < 8; n++) {
    const fr = frameAt(track, tt);
    if (!fr.gap && !fr.lip && !fr.loop && !fr.ceiling) return fr.t;
    tt = (tt + 0.028) % 1;
  }
  return tt;
}

export function seedItems(race) {
  const seeds = { frost: 91, clover: 41, oasis: 63, sky: 77 };
  const seed = seeds[race.track && race.track.id] || 17;
  const count = 12;
  const boxes = [];
  for (let i = 0; i < count; i++) {
    const slot = (i + 0.42) / count;
    const jitter = (hash(seed * 40 + i * 5) - 0.5) * 0.045;
    let t = safeT(race.track, slot + jitter);
    for (const other of boxes) {
      let d = Math.abs(other.t - t);
      if (d > 0.5) d = 1 - d;
      if (d < 0.04) t = safeT(race.track, t + 0.045);
    }
    const roll = hash(seed * 13 + i * 9);
    const side = hash(seed * 3 + i * 11) < 0.5 ? -1 : 1;
    const lane = roll < 0.42 ? (hash(seed + i) - 0.5) * 0.22 : side * (0.32 + hash(seed * 7 + i) * 0.18);
    boxes.push({ t, lane, alive: true, respawn: 0 });
  }
  if (boxes[0]) boxes[0].lane = 0.05;
  if (boxes[1]) boxes[1].lane = 0.42;
  race.boxes = boxes;
  race.shots = [];
  race.traps = [];
  race.walls = [];
  race.logs = [];
  race.bolts = [];
  race.decoys = [];
  race.bombs = [];
  race.craters = [];
  race.bursts = [];
  race.lastFx = "";
  race.shake = 0;
  race.flash = "";
}

function burst(race, kind, x, y, z, life) {
  const max = life || (kind === "bomb" || kind === "blast" ? 0.85 : 0.62);
  race.bursts.push({ kind, x, y, z, life: max, max });
  race.lastFx = kind;
}

function juice(race, kind, amount) {
  race.flash = kind;
  race.shake = Math.max(race.shake || 0, amount);
}

function hurt(race, kart, stun, ix, iz) {
  if (!kart || kart.finished || kart.invuln > 0) return false;
  kart.stun = Math.min(1.3, Math.max(kart.stun || 0, stun));
  if (ix || iz) {
    kart.vx += ix || 0;
    kart.vz += iz || 0;
  }
  burst(race, "hit", kart.x, kart.y + 0.8, kart.z);
  return true;
}

function nearestAhead(race, fromId, t) {
  let best = null;
  const consider = (kind, ref, id, tt, x, y, z) => {
    if (id === fromId) return;
    const dt = wrapDt(t, tt);
    // Floor is a couple of units, not a fat slice of a long lap, so a racer
    // inside the shell or twig range still counts as ahead.
    if (dt > 0.002 && dt < 0.42 && (!best || dt < best.dt)) best = { kind, ref, id, dt, x, y, z };
  };
  for (const k of race.karts) {
    if (k.finished) continue;
    consider("kart", k, k.id, k.t, k.x, k.y, k.z);
  }
  for (const d of race.decoys || []) {
    if (d.life <= 0) continue;
    consider("decoy", d, "decoy-" + d.owner, d.t, d.x, d.y, d.z);
  }
  return best;
}

function popDecoyAt(race, x, z, rad) {
  for (const d of race.decoys || []) {
    if (d.life <= 0) continue;
    if (Math.hypot(d.x - x, d.z - z) < rad) {
      d.life = 0;
      burst(race, "mist", d.x, d.y + 0.8, d.z, 0.5);
      return true;
    }
  }
  return false;
}

export function launchHeld(race, kart) {
  if (!kart.held || kart.fireCd > 0 || kart.finished || kart.stun > 0.2) return "";
  const id = kart.held;
  kart.held = null;
  kart.holdAge = 0;
  kart.fireCd = 1.2;
  const f = forward(kart.yaw);
  const fr = frameAt(race.track, kart.t);
  const length = Math.max(80, race.track.length || 1000);
  if (id === "boost") {
    kart.boost = 1.4;
    kart.boostPow = 28;
    juice(race, "boost", 0.25);
  } else if (id === "sap" || id === "rocket" || id === "orb") {
    let vx = f.x;
    let vz = f.z;
    if (id === "rocket" || id === "orb") {
      const tgt = id === "orb" ? farthestOther(race, kart) : nearestAhead(race, kart.id, kart.t);
      if (tgt) {
        const dx = tgt.x - kart.x;
        const dz = tgt.z - kart.z;
        const dist = Math.hypot(dx, dz) || 1;
        const aim = Math.atan2(dx, dz);
        const yaw = Math.atan2(f.x, f.z);
        let diff = aim - yaw;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        if (id === "orb" || (dist < SAP_RANGE * 1.4 && Math.abs(diff) < (35 * Math.PI) / 180)) {
          vx = dx / dist;
          vz = dz / dist;
        }
      }
    }
    race.shots.push({
      kind: id,
      owner: kart.id,
      x: kart.x + vx * 1.8,
      y: kart.y + 0.9,
      z: kart.z + vz * 1.8,
      vx,
      vz,
      t: kart.t,
      life: id === "sap" ? 2.4 : 1.6,
      age: 0,
      trail: [],
    });
    juice(race, id, id === "sap" ? 0.12 : 0.3);
  } else if (id === "trap") {
    race.traps.push({
      owner: kart.id,
      x: kart.x - f.x * 2.4,
      z: kart.z - f.z * 2.4,
      y: kart.y,
      life: 8,
      armed: 0.2,
    });
  } else if (id === "wall") {
    const ahead = frameAt(race.track, kart.t + WALL_AHEAD / length);
    race.walls.push({
      owner: kart.id,
      t: ahead.t,
      x: ahead.p.x,
      y: ahead.p.y,
      z: ahead.p.z,
      life: 2.5,
      hits: 2,
      half: Math.min(WALL_HALF, ahead.width * 0.42),
      yaw: Math.atan2(ahead.tangent.x, ahead.tangent.z),
    });
  } else if (id === "star") {
    kart.invuln = Math.max(kart.invuln || 0, 2);
    juice(race, "star", 0.16);
  } else if (id === "twig") {
    const links = [{ x: kart.x, y: kart.y + 1.35, z: kart.z }];
    let fromId = kart.id;
    let fromT = kart.t;
    let fromX = kart.x;
    let fromZ = kart.z;
    for (let hop = 0; hop < 2; hop++) {
      const tgt = nearestAhead(race, fromId, fromT);
      if (!tgt) break;
      const dist = Math.hypot(tgt.x - fromX, tgt.z - fromZ);
      if (dist > TWIG_RANGE || tgt.dt > 0.08) break;
      links.push({ x: tgt.x, y: (tgt.y || 0) + 1.4, z: tgt.z });
      if (tgt.kind === "kart") hurt(race, tgt.ref, 0.6, 0, 0);
      fromId = tgt.id;
      fromT = tgt.ref.t || fromT;
      fromX = tgt.x;
      fromZ = tgt.z;
    }
    if (links.length > 1) {
      race.bolts.push({ links, life: 0.7, max: 0.7 });
      juice(race, "twig", 0.4);
    } else {
      burst(race, "twig", kart.x, kart.y + 1.2, kart.z, 0.25);
    }
  } else if (id === "bomb") {
    const dest = frameAt(race.track, kart.t + BOMB_AHEAD / length);
    race.bombs.push({
      owner: kart.id,
      x: kart.x,
      y: kart.y + 1.1,
      z: kart.z,
      sx: kart.x,
      sy: kart.y + 1.1,
      sz: kart.z,
      tx: dest.p.x,
      ty: dest.p.y + 0.6,
      tz: dest.p.z,
      t: dest.t,
      age: 0,
      life: 0.85,
    });
    juice(race, "bomb", 0.35);
  }
  if (id !== "twig") burst(race, id === "boost" ? "boost" : id, kart.x, fr.p.y + 0.9, kart.z, 0.28);
  race.lastFx = id;
  race.pickup = id;
  return id;
}

function farthestShot(race, shot) {
  let best = null;
  let bestD = 0;
  for (const k of race.karts) {
    if (k.id === shot.owner || k.finished) continue;
    const d = Math.hypot(k.x - shot.x, k.z - shot.z);
    if (d > bestD) {
      bestD = d;
      best = k;
    }
  }
  return best;
}

function farthestOther(race, kart) {
  let best = null;
  let bestD = 0;
  for (const k of race.karts) {
    if (k.id === kart.id || k.finished) continue;
    const d = Math.hypot(k.x - kart.x, k.z - kart.z);
    if (d > bestD) {
      bestD = d;
      best = { x: k.x, y: k.y, z: k.z, ref: k, dt: wrapDt(kart.t, k.t) };
    }
  }
  return best;
}

function hitRadius(race, shot, rad, stun) {
  if (popDecoyAt(race, shot.x, shot.z, rad + 0.4)) return true;
  for (const k of race.karts) {
    if (k.id === shot.owner || k.finished || k.invuln > 0) continue;
    const d = Math.hypot(k.x - shot.x, k.z - shot.z);
    if (d < rad) {
      const nx = d > 0.05 ? (k.x - shot.x) / d : shot.vx;
      const nz = d > 0.05 ? (k.z - shot.z) / d : shot.vz;
      const kick = shot.kind === "rocket" ? 14 : 8;
      hurt(race, k, stun, nx * kick, nz * kick);
      return true;
    }
  }
  return false;
}

function explodeBomb(race, bomb) {
  bomb.life = 0;
  const fr = frameAt(race.track, bomb.t);
  const y = fr.p.y + 0.4;
  burst(race, "bomb", bomb.x, y + 0.8, bomb.z, 1.15);
  burst(race, "blast", bomb.x, y + 1.4, bomb.z, 0.9);
  race.craters.push({ x: bomb.x, y, z: bomb.z, life: 1.35, max: 1.35 });
  juice(race, "bomb", 0.85);
  for (const k of race.karts) {
    if (k.finished || k.invuln > 0) continue;
    if (bomb.age < 0.28 && k.id === bomb.owner) continue;
    const dx = k.x - bomb.x;
    const dz = k.z - bomb.z;
    const d = Math.hypot(dx, dz);
    if (d < BOMB_R) {
      const scale = d < 0.05 ? 1 : 1 - d / BOMB_R;
      const nx = d > 0.05 ? dx / d : 0;
      const nz = d > 0.05 ? dz / d : 1;
      hurt(race, k, 0.7 + scale * 0.4, nx * 12 * scale, nz * 12 * scale);
    }
  }
}

export function stepItems(race, dt) {
  if (race.shake > 0) race.shake = Math.max(0, race.shake - dt * 1.6);
  for (const k of race.karts) {
    if (k.held) k.holdAge = (k.holdAge || 0) + dt;
    if (k.got > 0) k.got -= dt;
  }
  for (const box of race.boxes || []) {
    if (!box.alive) {
      box.respawn -= dt;
      if (box.respawn <= 0) box.alive = true;
      continue;
    }
    const bf = frameAt(race.track, box.t);
    const lat = (box.lane || 0) * bf.width * 0.5;
    const bx = bf.p.x + bf.right.x * lat;
    const bz = bf.p.z + bf.right.z * lat;
    for (const k of race.karts) {
      if (k.held || k.finished) continue;
      let gap = Math.abs(k.t - box.t);
      if (gap > 0.5) gap = 1 - gap;
      if (gap < 0.03 && Math.hypot(k.x - bx, k.z - bz) < 3.15) {
        let picked = rollItem(livePlace(race, k.id));
        k.held = picked;
        k.holdAge = 0;
        k.got = 0.45;
        box.alive = false;
        box.respawn = 5.5 + Math.random() * 3.5;
        race.flash = "box";
        race.pickup = picked;
        burst(race, "box", bx, k.y + 0.9, bz, 0.45);
        break;
      }
    }
  }
  for (const shot of race.shots || []) {
    shot.life -= dt;
    shot.age = (shot.age || 0) + dt;
    shot.trail.push({ x: shot.x, y: shot.y, z: shot.z });
    if (shot.trail.length > 16) shot.trail.shift();
    const tgt = shot.kind === "orb"
      ? farthestShot(race, shot)
      : nearestAhead(race, shot.owner, shot.t);
    if (tgt && (shot.kind === "sap" || shot.kind === "orb")) {
      const dx = tgt.x - shot.x;
      const dz = tgt.z - shot.z;
      const d = Math.hypot(dx, dz) || 1;
      if (shot.kind === "orb" || d < SAP_RANGE) {
        const turn = shot.kind === "sap" ? 14 : 6;
        shot.vx += (dx / d - shot.vx) * Math.min(1, dt * turn);
        shot.vz += (dz / d - shot.vz) * Math.min(1, dt * turn);
        const m = Math.hypot(shot.vx, shot.vz) || 1;
        shot.vx /= m;
        shot.vz /= m;
      }
    }
    const speed = shot.kind === "sap" ? 34 : shot.kind === "orb" ? 32 : ROCKET_SPEED;
    shot.x += shot.vx * speed * dt;
    shot.z += shot.vz * speed * dt;
    let best = shot.t;
    let bestD = 1e9;
    for (let s = -3; s <= 6; s++) {
      const tt = shot.t + s * 0.008;
      const fr = frameAt(race.track, tt);
      const d = (fr.p.x - shot.x) ** 2 + (fr.p.z - shot.z) ** 2;
      if (d < bestD) {
        bestD = d;
        best = fr.t;
        shot.y = fr.p.y + 0.7;
      }
    }
    shot.t = best;
    const rad = shot.kind === "rocket" ? ROCKET_R : shot.kind === "orb" ? ORB_R : SAP_R;
    const stun = shot.kind === "rocket" ? 1 : shot.kind === "orb" ? 1.3 : 0.9;
    const armed = shot.kind !== "sap" || shot.age >= 0.15;
    if (armed && (hitRadius(race, shot, rad, stun) || shot.life <= 0)) {
      if (shot.kind === "rocket" || shot.kind === "orb") {
        for (const k of race.karts) {
          if (k.id === shot.owner || k.invuln > 0) continue;
          const d = Math.hypot(k.x - shot.x, k.z - shot.z);
          if (d < rad + 0.4 && d > 0.05) {
            hurt(race, k, stun, ((k.x - shot.x) / d) * 10, ((k.z - shot.z) / d) * 10);
          }
        }
        burst(race, "blast", shot.x, shot.y, shot.z, 0.85);
        juice(race, shot.kind, 0.45);
      } else burst(race, "sap", shot.x, shot.y, shot.z, 0.5);
      shot.life = 0;
    }
  }
  race.shots = (race.shots || []).filter((s) => s.life > 0);
  for (const trap of race.traps || []) {
    trap.life -= dt;
    trap.armed -= dt;
    if (trap.armed > 0) continue;
    if (popDecoyAt(race, trap.x, trap.z, 1.5)) {
      trap.life = 0;
      continue;
    }
    for (const k of race.karts) {
      if (k.id === trap.owner || k.finished || k.invuln > 0) continue;
      if (Math.hypot(k.x - trap.x, k.z - trap.z) < TRAP_R) {
        hurt(race, k, 0.7, 0, 0);
        k.yaw += 1.05;
        trap.life = 0;
        burst(race, "trap", trap.x, trap.y + 0.4, trap.z, 0.5);
        break;
      }
    }
  }
  race.traps = (race.traps || []).filter((t) => t.life > 0);
  for (const wall of race.walls || []) {
    wall.life -= dt;
    const fr = frameAt(race.track, wall.t);
    wall.x = fr.p.x;
    wall.y = fr.p.y;
    wall.z = fr.p.z;
    for (const k of race.karts) {
      if (k.finished || k.invuln > 0) continue;
      const gap = Math.abs(wrapDt(wall.t, k.t));
      const lat = (k.x - fr.p.x) * fr.right.x + (k.z - fr.p.z) * fr.right.z;
      if (gap < 0.012 && Math.abs(lat) < wall.half) {
        if ((k.wallHit || 0) > race.time) continue;
        k.wallHit = race.time + 0.7;
        const back = forward(k.yaw);
        k.vx -= back.x * 10;
        k.vz -= back.z * 10;
        hurt(race, k, 0.45, -back.x * 8, -back.z * 8);
        wall.hits = (wall.hits || 1) - 1;
        if (wall.hits <= 0) wall.life = 0;
      }
    }
  }
  race.walls = (race.walls || []).filter((w) => w.life > 0);

  for (const bomb of race.bombs || []) {
    if (bomb.life <= 0) continue;
    bomb.age += dt;
    bomb.life -= dt;
    const k = Math.min(1, bomb.age / 0.55);
    const arc = Math.sin(k * Math.PI) * 3.2;
    bomb.x = bomb.sx + (bomb.tx - bomb.sx) * k;
    bomb.z = bomb.sz + (bomb.tz - bomb.sz) * k;
    bomb.y = bomb.sy + (bomb.ty - bomb.sy) * k + arc;
    if (k >= 1 || bomb.life <= 0) explodeBomb(race, bomb);
  }
  race.bombs = (race.bombs || []).filter((b) => b.life > 0);

  for (const b of race.bolts || []) b.life -= dt;
  race.bolts = (race.bolts || []).filter((b) => b.life > 0);
  for (const c of race.craters || []) c.life -= dt;
  race.craters = (race.craters || []).filter((c) => c.life > 0);
  for (const b of race.bursts || []) b.life -= dt;
  if (race.bursts.length > 36) race.bursts.splice(0, race.bursts.length - 36);
  race.bursts = (race.bursts || []).filter((b) => b.life > 0);
}

export function testItems(race, fails) {
  const you = race.karts[0];
  for (let i = 0; i < 40; i++) {
    if (rollItem(4, Math.random) === "orb") fails.push("orb in back");
  }
  let sawOrb = false;
  for (let i = 0; i < 40; i++) if (rollItem(1, Math.random) === "orb") sawOrb = true;
  if (!sawOrb) fails.push("orb never leads");
  let sawNew = false;
  for (let i = 0; i < 40; i++) {
    const id = rollItem(4, Math.random);
    if (id === "twig" || id === "bomb" || id === "boost") sawNew = true;
  }
  if (!sawNew) fails.push("new weapons missing");
  if (!race.boxes || race.boxes.length < 10) fails.push("boxes " + (race.boxes ? race.boxes.length : 0));
  const lanes = new Set((race.boxes || []).map((b) => (Math.abs(b.lane) < 0.2 ? "mid" : "side")));
  if (!lanes.has("mid") || !lanes.has("side")) fails.push("box lanes " + [...lanes].join(","));
  race.phase = "race";
  race.time = 20;
  for (const id of ITEM_IDS) {
    you.held = id;
    you.fireCd = 0;
    you.stun = 0;
    const launched = launchHeld(race, you);
    if (launched !== id) fails.push("launch " + id);
    if (you.fireCd < 1.05) fails.push("cd " + id);
    you.held = id;
    const blocked = launchHeld(race, you);
    if (blocked) fails.push("recast " + id);
    you.fireCd = 0;
  }
  you.invuln = 2;
  hurt(race, you, 1, 0, 0);
  if (you.stun > 0) fails.push("star hurt");
  you.invuln = 0;
  hurt(race, you, 5, 0, 0);
  if (you.stun > 1.3) fails.push("stun cap " + you.stun);
  stepItems(race, 0.05);
  const alive =
    (race.shots && race.shots.length) ||
    (race.traps && race.traps.length) ||
    (race.walls && race.walls.length) ||
    (race.logs && race.logs.length) ||
    (race.bombs && race.bombs.length) ||
    (race.bolts && race.bolts.length) ||
    (race.decoys && race.decoys.length) ||
    you.invuln > 0 ||
    you.orb > 0;
  if (!alive) fails.push("no fx");
  const foe = race.karts[1];
  if (foe) {
    foe.t = (you.t + 14 / Math.max(80, race.track.length)) % 1;
    const fr = frameAt(race.track, foe.t);
    foe.x = fr.p.x;
    foe.z = fr.p.z;
    foe.finished = false;
    foe.invuln = 0;
    foe.stun = 0;
    you.held = "twig";
    you.fireCd = 0;
    you.stun = 0;
    launchHeld(race, you);
    if (foe.stun <= 0) fails.push("twig miss");
    if (foe.stun > 0.7) fails.push("twig stun " + foe.stun);
    const length = Math.max(80, race.track.length || 1000);
    const park = (kart, t) => {
      const fr = frameAt(race.track, ((t % 1) + 1) % 1);
      kart.t = fr.t;
      kart.x = fr.p.x;
      kart.y = fr.p.y;
      kart.z = fr.p.z;
      kart.finished = false;
      kart.invuln = 0;
      kart.stun = 0;
      kart.vx = 0;
      kart.vz = 0;
    };
    const clearFx = () => {
      race.shots = [];
      race.traps = [];
      race.walls = [];
      race.bombs = [];
      race.bolts = [];
    };
    const isolate = (tYou) => {
      park(you, tYou);
      for (const k of race.karts) {
        if (k.id !== you.id && k.id !== foe.id) park(k, tYou - 0.18);
      }
    };
    const watch = (id, frames, label) => {
      you.held = id;
      you.fireCd = 0;
      you.stun = 0;
      launchHeld(race, you);
      for (let i = 0; i < frames; i++) {
        stepItems(race, 1 / 60);
        if (foe.stun > 0.2) return;
      }
      fails.push(label);
    };
    clearFx();
    isolate(0.22);
    park(foe, you.t + 10 / length);
    you.yaw = Math.atan2(foe.x - you.x, foe.z - you.z);
    watch("sap", 100, "sap miss");
    clearFx();
    foe.stun = 0;
    isolate(0.4);
    park(foe, you.t + 12 / length);
    you.yaw = Math.atan2(foe.x - you.x, foe.z - you.z);
    watch("rocket", 90, "rocket miss");
    clearFx();
    foe.stun = 0;
    isolate(0.55);
    const aim = frameAt(race.track, you.t);
    you.yaw = Math.atan2(aim.tangent.x, aim.tangent.z);
    you.held = "trap";
    you.fireCd = 0;
    launchHeld(race, you);
    const trap = race.traps[race.traps.length - 1];
    if (!trap) fails.push("trap drop");
    else {
      foe.x = trap.x;
      foe.z = trap.z;
      foe.y = trap.y;
      foe.stun = 0;
      foe.invuln = 0;
      for (let i = 0; i < 24; i++) stepItems(race, 1 / 60);
      if (foe.stun <= 0) fails.push("trap miss");
    }
    clearFx();
    foe.stun = 0;
    isolate(0.7);
    you.held = "bomb";
    you.fireCd = 0;
    launchHeld(race, you);
    const bomb = race.bombs[race.bombs.length - 1];
    if (!bomb) fails.push("bomb drop");
    else {
      foe.x = bomb.tx;
      foe.z = bomb.tz;
      foe.y = bomb.ty;
      foe.stun = 0;
      foe.invuln = 0;
      for (let i = 0; i < 50; i++) stepItems(race, 1 / 60);
      if (foe.stun <= 0) fails.push("bomb miss");
    }
    clearFx();
    isolate(0.15);
    for (const k of race.karts) {
      if (k.id !== you.id) park(k, you.t + 0.3);
    }
    you.held = "twig";
    you.fireCd = 0;
    const beforeBolts = race.bolts.length;
    launchHeld(race, you);
    if (race.bolts.length > beforeBolts) fails.push("twig void");
  }
}
