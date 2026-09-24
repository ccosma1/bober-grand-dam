/* Eight lodge throws. One held item. Boxes return in 4.5s. */
import { frameAt, forward, livePlace } from "./sim.js?v=gd32";

export const ITEM_IDS = ["boost", "trap", "pine", "surge", "magnet", "buckler", "meteor", "slick"];
export const ITEM_NAME = {
  boost: "BOOST",
  trap: "Stick Trap",
  pine: "Pinecone Barrage",
  surge: "Dam Surge",
  magnet: "Lodge Magnet",
  buckler: "Bark Buckler",
  meteor: "Meteor Chip",
  slick: "Resin Slick",
};

const U = 18 / 280;
const BASE = [
  ["boost", 18],
  ["trap", 13],
  ["pine", 14],
  ["surge", 13],
  ["magnet", 12],
  ["buckler", 10],
  ["meteor", 12],
  ["slick", 8],
];
const LEAD_BIAS = { boost: 1.25, slick: 1.25, trap: 1.25, buckler: 1.25 };
const BACK_BIAS = { meteor: 1.35, magnet: 1.35, pine: 1.35 };

const TRAP_BACK = 40 * U;
const TRAP_R = 48 * U;
const PINE_R = 24 * U;
const PINE_SPEED = 44;
const SURGE_AHEAD = 50 * U;
const SURGE_TRAVEL = 220 * U;
const SURGE_HALF = (90 * U) * 0.5;
const SURGE_R = 42 * U;
const SURGE_KNOCK = 80 * U;
const MAG_RANGE = 280 * U;
const MAG_PULL = 120 * U;
const BUCK_R = 50 * U;
const BUCK_KNOCK = 40 * U;
const METEOR_AHEAD = 220 * U;
const METEOR_R = 72 * U;
const SLICK_W = (70 * U) * 0.5;
const SLICK_L = (90 * U) * 0.5;
const BODY = 1.2;

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
  const bias = place <= 1 ? LEAD_BIAS : place >= 4 ? BACK_BIAS : null;
  let sum = 0;
  const rows = BASE.map(([id, w]) => {
    const weight = w * (bias && bias[id] ? bias[id] : 1);
    sum += weight;
    return [id, weight];
  });
  let r = rng() * sum;
  for (const [id, w] of rows) {
    r -= w;
    if (r <= 0) return id;
  }
  return rows[0][0];
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
  race.surges = [];
  race.slicks = [];
  race.meteors = [];
  race.tethers = [];
  race.craters = [];
  race.bursts = [];
  race.walls = [];
  race.logs = [];
  race.bolts = [];
  race.decoys = [];
  race.bombs = [];
  race.lastFx = "";
  race.shake = 0;
  race.flash = "";
}

function burst(race, kind, x, y, z, life) {
  const max = life || 0.62;
  race.bursts.push({ kind, x, y, z, life: max, max });
  race.lastFx = kind;
}

function juice(race, kind, amount) {
  race.flash = kind;
  race.shake = Math.max(race.shake || 0, amount);
}

function overlapsKart(kart, x, z, rad) {
  const dx = x - kart.x;
  const dz = z - kart.z;
  if (Math.hypot(dx, dz) < rad + BODY) return true;
  const across = dx * Math.cos(kart.yaw) - dz * Math.sin(kart.yaw);
  const along = dx * Math.sin(kart.yaw) + dz * Math.cos(kart.yaw);
  return Math.abs(across) < 1.15 + rad * 0.25 && Math.abs(along) < 1.5 + rad * 0.25;
}

export function onHitKart(race, kart, spec) {
  if (!kart || kart.finished) return false;
  const specStun = spec.stun || 0;
  if ((kart.buckler || 0) > 0 && (kart.bucklerHits || 0) > 0 && specStun > 0 && !spec.unblockable) {
    kart.bucklerHits -= 1;
    burst(race, "block", kart.x, kart.y + 1.1, kart.z, 0.45);
    kart.hitTick = (kart.hitTick || 0) + 1;
    return true;
  }
  let felt = false;
  if (specStun > 0) {
    const cap = spec.cap || 1.2;
    kart.stun = spec.stack
      ? Math.min(cap, (kart.stun || 0) + specStun)
      : Math.min(cap, Math.max(kart.stun || 0, specStun));
    felt = true;
  }
  if (spec.slow) {
    kart.slowT = Math.max(kart.slowT || 0, spec.slow);
    kart.speedMul = Math.min(kart.speedMul && kart.speedMul > 0 ? kart.speedMul : 1, spec.mul || 0.4);
    felt = true;
  }
  if (spec.ix || spec.iz) {
    kart.vx += spec.ix || 0;
    kart.vz += spec.iz || 0;
    felt = true;
  }
  if (spec.nudge) {
    kart.x += spec.nudge.x;
    kart.z += spec.nudge.z;
    felt = true;
  }
  if (!felt) return false;
  burst(race, spec.fx || "hit", kart.x, kart.y + 0.9, kart.z, spec.fxLife || 0.55);
  juice(race, spec.fx || "hit", spec.shake || 0.35);
  kart.hitTick = (kart.hitTick || 0) + 1;
  return true;
}

function nearestAhead(race, from, range) {
  let best = null;
  for (const k of race.karts) {
    if (k.id === from.id || k.finished) continue;
    const dt = wrapDt(from.t, k.t);
    if (dt <= 0.002 || dt > 0.42) continue;
    const dist = Math.hypot(k.x - from.x, k.z - from.z);
    if (dist > range) continue;
    if (!best || dist < best.dist) best = { kart: k, dist, dt };
  }
  return best;
}

export function launchHeld(race, kart) {
  if (!kart.held || kart.fireCd > 0 || kart.finished || kart.stun > 0.2) return "";
  const id = kart.held;
  kart.held = null;
  kart.holdAge = 0;
  kart.fireCd = 0.85;
  const f = forward(kart.yaw);
  const length = Math.max(80, race.track.length || 1000);
  if (id === "boost") {
    kart.boost = 1.6;
    kart.boostPow = 36;
    juice(race, "boost", 0.4);
    burst(race, "boost", kart.x - f.x * 1.4, kart.y + 0.4, kart.z - f.z * 1.4, 0.45);
  } else if (id === "trap") {
    race.traps.push({
      owner: kart.id,
      x: kart.x - f.x * TRAP_BACK,
      z: kart.z - f.z * TRAP_BACK,
      y: kart.y,
      life: 10,
      armed: 0.18,
    });
    burst(race, "trap", kart.x - f.x * TRAP_BACK, kart.y + 0.4, kart.z - f.z * TRAP_BACK, 0.35);
  } else if (id === "pine") {
    const yaw = Math.atan2(f.x, f.z);
    for (const deg of [-18, -9, 0, 9, 18]) {
      const a = yaw + (deg * Math.PI) / 180;
      const vx = Math.sin(a);
      const vz = Math.cos(a);
      race.shots.push({
        kind: "pine",
        owner: kart.id,
        x: kart.x + vx * 1.4,
        y: kart.y + 0.9,
        z: kart.z + vz * 1.4,
        vx,
        vz,
        t: kart.t,
        life: 1.35,
        age: 0,
        trail: [],
      });
    }
    juice(race, "pine", 0.3);
  } else if (id === "surge") {
    const ahead = frameAt(race.track, kart.t + SURGE_AHEAD / length);
    race.surges.push({
      owner: kart.id,
      t: ahead.t,
      x: ahead.p.x,
      y: ahead.p.y,
      z: ahead.p.z,
      yaw: Math.atan2(ahead.tangent.x, ahead.tangent.z),
      life: 1.2,
      max: 1.2,
      travel: 0,
      hit: {},
    });
    juice(race, "surge", 0.45);
  } else if (id === "magnet") {
    const tgt = nearestAhead(race, kart, MAG_RANGE);
    if (tgt) {
      race.tethers.push({ owner: kart.id, id: tgt.kart.id, life: 1.4, pull: MAG_PULL, hit: false });
      onHitKart(race, tgt.kart, { slow: 1.4, mul: 0.6, fx: "magnet", shake: 0.3 });
    } else {
      burst(race, "magnet", kart.x, kart.y + 1.2, kart.z, 0.3);
    }
  } else if (id === "buckler") {
    kart.buckler = 2.5;
    kart.bucklerHits = 1;
    juice(race, "buckler", 0.3);
    burst(race, "buckler", kart.x, kart.y + 1, kart.z, 0.5);
    for (const k of race.karts) {
      if (k.id === kart.id || k.finished) continue;
      const dx = k.x - kart.x;
      const dz = k.z - kart.z;
      const d = Math.hypot(dx, dz) || 1;
      if (d > BUCK_R + BODY) continue;
      const nx = dx / d;
      const nz = dz / d;
      onHitKart(race, k, {
        ix: nx * 10,
        iz: nz * 10,
        nudge: { x: nx * BUCK_KNOCK, z: nz * BUCK_KNOCK },
        fx: "buckler",
        shake: 0.4,
      });
    }
  } else if (id === "meteor") {
    const dest = frameAt(race.track, kart.t + METEOR_AHEAD / length);
    race.meteors.push({
      owner: kart.id,
      x: dest.p.x,
      y: dest.p.y + 9,
      z: dest.p.z,
      tx: dest.p.x,
      ty: dest.p.y + 0.4,
      tz: dest.p.z,
      t: dest.t,
      age: 0,
      life: 0.48,
      boom: false,
    });
    juice(race, "meteor", 0.4);
  } else if (id === "slick") {
    race.slicks.push({
      owner: kart.id,
      x: kart.x - f.x * 2.2,
      z: kart.z - f.z * 2.2,
      y: kart.y,
      yaw: Math.atan2(f.x, f.z),
      life: 9,
      hit: {},
    });
    burst(race, "slick", kart.x - f.x * 2.2, kart.y + 0.2, kart.z - f.z * 2.2, 0.4);
  }
  race.lastFx = id;
  race.pickup = id;
  return id;
}

function stepItems(race, dt) {
  if (race.shake > 0) race.shake = Math.max(0, race.shake - dt * 1.6);
  for (const k of race.karts) {
    if (k.held) k.holdAge = (k.holdAge || 0) + dt;
    if (k.got > 0) k.got -= dt;
    if (k.slowT > 0) {
      k.slowT -= dt;
      if (k.slowT <= 0) {
        k.slowT = 0;
        k.speedMul = 1;
      }
    }
    if (k.buckler > 0) k.buckler = Math.max(0, k.buckler - dt);
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
        k.held = rollItem(livePlace(race, k.id));
        k.holdAge = 0;
        k.got = 0.45;
        box.alive = false;
        box.respawn = 4.5;
        race.flash = "box";
        race.pickup = k.held;
        burst(race, "box", bx, k.y + 0.9, bz, 0.45);
        break;
      }
    }
  }
  for (const shot of race.shots || []) {
    shot.life -= dt;
    shot.age = (shot.age || 0) + dt;
    shot.trail.push({ x: shot.x, y: shot.y, z: shot.z });
    if (shot.trail.length > 8) shot.trail.shift();
    shot.x += shot.vx * PINE_SPEED * dt;
    shot.z += shot.vz * PINE_SPEED * dt;
    let best = shot.t;
    let bestD = 1e9;
    for (let s = -2; s <= 4; s++) {
      const tt = shot.t + s * 0.006;
      const fr = frameAt(race.track, tt);
      const d = (fr.p.x - shot.x) ** 2 + (fr.p.z - shot.z) ** 2;
      if (d < bestD) {
        bestD = d;
        best = fr.t;
        shot.y = fr.p.y + 0.8;
      }
    }
    shot.t = best;
    if (shot.age > 0.05) {
      for (const k of race.karts) {
        if (k.id === shot.owner || k.finished) continue;
        if (!overlapsKart(k, shot.x, shot.z, PINE_R)) continue;
        onHitKart(race, k, { stun: 0.55, stack: true, cap: 1.2, fx: "pine", shake: 0.28 });
        shot.life = 0;
        break;
      }
    }
  }
  race.shots = (race.shots || []).filter((s) => s.life > 0);

  for (const trap of race.traps || []) {
    trap.life -= dt;
    trap.armed -= dt;
    if (trap.armed > 0) continue;
    for (const k of race.karts) {
      if (k.id === trap.owner || k.finished) continue;
      if (!overlapsKart(k, trap.x, trap.z, TRAP_R)) continue;
      onHitKart(race, k, { stun: 0.85, fx: "trap", shake: 0.4 });
      k.yaw += 0.9;
      trap.life = 0;
      break;
    }
  }
  race.traps = (race.traps || []).filter((t) => t.life > 0);

  const length = Math.max(80, race.track.length || 1000);
  for (const wall of race.surges || []) {
    wall.life -= dt;
    const step = (SURGE_TRAVEL / 1.2) * dt;
    const fr = frameAt(race.track, wall.t + step / length);
    wall.t = fr.t;
    wall.x = fr.p.x;
    wall.y = fr.p.y;
    wall.z = fr.p.z;
    wall.yaw = Math.atan2(fr.tangent.x, fr.tangent.z);
    wall.travel += step;
    for (const k of race.karts) {
      if (k.id === wall.owner || k.finished || wall.hit[k.id]) continue;
      const dx = k.x - wall.x;
      const dz = k.z - wall.z;
      const across = dx * fr.right.x + dz * fr.right.z;
      const along = dx * fr.tangent.x + dz * fr.tangent.z;
      if (Math.abs(across) > SURGE_HALF + BODY || Math.abs(along) > SURGE_R + BODY) continue;
      const sign = Math.sign(across) || 1;
      onHitKart(race, k, {
        stun: 0.7,
        ix: fr.right.x * sign * 12,
        iz: fr.right.z * sign * 12,
        nudge: { x: fr.right.x * sign * SURGE_KNOCK, z: fr.right.z * sign * SURGE_KNOCK },
        fx: "surge",
        shake: 0.5,
      });
      wall.hit[k.id] = true;
    }
  }
  race.surges = (race.surges || []).filter((w) => w.life > 0 && w.travel < SURGE_TRAVEL + 0.4);

  for (const link of race.tethers || []) {
    link.life -= dt;
    const owner = race.karts.find((k) => k.id === link.owner);
    const tgt = race.karts.find((k) => k.id === link.id);
    if (!owner || !tgt || tgt.finished) {
      link.life = 0;
      continue;
    }
    tgt.slowT = Math.max(tgt.slowT || 0, link.life);
    tgt.speedMul = Math.min(tgt.speedMul && tgt.speedMul > 0 ? tgt.speedMul : 1, 0.6);
    if (link.pull > 0) {
      const dx = owner.x - tgt.x;
      const dz = owner.z - tgt.z;
      const d = Math.hypot(dx, dz) || 1;
      const step = Math.min(link.pull, (MAG_PULL / 1.4) * dt, d);
      tgt.x += (dx / d) * step;
      tgt.z += (dz / d) * step;
      link.pull -= step;
    }
    link.ax = owner.x;
    link.az = owner.z;
    link.bx = tgt.x;
    link.bz = tgt.z;
    link.y = tgt.y + 1;
  }
  race.tethers = (race.tethers || []).filter((l) => l.life > 0);

  for (const chip of race.meteors || []) {
    chip.age += dt;
    chip.life -= dt;
    const k = Math.min(1, chip.age / 0.42);
    chip.y = chip.ty + (1 - k) * 9;
    chip.x = chip.tx;
    chip.z = chip.tz;
    if (!chip.boom && (k >= 1 || chip.life <= 0)) {
      chip.boom = true;
      chip.life = 0;
      burst(race, "meteor", chip.x, chip.y + 0.6, chip.z, 0.9);
      burst(race, "blast", chip.x, chip.y + 1.4, chip.z, 0.7);
      race.craters.push({ x: chip.x, y: chip.ty, z: chip.z, life: 2, max: 2 });
      juice(race, "meteor", 0.7);
      for (const kart of race.karts) {
        if (kart.finished) continue;
        if (kart.id === chip.owner && chip.age < 0.2) continue;
        if (!overlapsKart(kart, chip.x, chip.z, METEOR_R)) continue;
        const dx = kart.x - chip.x;
        const dz = kart.z - chip.z;
        const d = Math.hypot(dx, dz) || 1;
        onHitKart(race, kart, {
          stun: 1.2,
          ix: (dx / d) * 8,
          iz: (dz / d) * 8,
          fx: "meteor",
          shake: 0.6,
        });
      }
    }
  }
  race.meteors = (race.meteors || []).filter((m) => !m.boom);

  for (const patch of race.slicks || []) {
    patch.life -= dt;
    const c = Math.cos(patch.yaw);
    const s = Math.sin(patch.yaw);
    for (const k of race.karts) {
      if (k.finished || patch.hit[k.id]) continue;
      const dx = k.x - patch.x;
      const dz = k.z - patch.z;
      const along = dx * s + dz * c;
      const across = dx * c - dz * s;
      if (Math.abs(along) > SLICK_L + 0.8 || Math.abs(across) > SLICK_W + 0.8) continue;
      patch.hit[k.id] = true;
      onHitKart(race, k, { slow: 1.5, mul: 0.4, fx: "slick", shake: 0.22 });
    }
  }
  race.slicks = (race.slicks || []).filter((p) => p.life > 0);

  for (const c of race.craters || []) c.life -= dt;
  race.craters = (race.craters || []).filter((c) => c.life > 0);
  for (const b of race.bursts || []) b.life -= dt;
  if (race.bursts.length > 40) race.bursts.splice(0, race.bursts.length - 40);
  race.bursts = race.bursts.filter((b) => b.life > 0);
}

export { stepItems };

function park(race, kart, t) {
  const fr = frameAt(race.track, ((t % 1) + 1) % 1);
  kart.t = fr.t;
  kart.x = fr.p.x;
  kart.y = fr.p.y;
  kart.z = fr.p.z;
  kart.yaw = Math.atan2(fr.tangent.x, fr.tangent.z);
  kart.finished = false;
  kart.stun = 0;
  kart.slowT = 0;
  kart.speedMul = 1;
  kart.buckler = 0;
  kart.bucklerHits = 0;
  kart.vx = 0;
  kart.vz = 0;
  kart.hitTick = kart.hitTick || 0;
  return fr;
}

export function testItems(race, fails) {
  const you = race.karts[0];
  const foe = race.karts[1];
  if (!you || !foe) {
    fails.push("roster");
    return;
  }
  const seen = new Set();
  for (let i = 0; i < 200; i++) seen.add(rollItem(3, Math.random));
  for (const id of ITEM_IDS) if (!seen.has(id)) fails.push("pool " + id);
  const biasOf = (place, id) => {
    const row = BASE.find((r) => r[0] === id);
    const bias = place <= 1 ? LEAD_BIAS : place >= 4 ? BACK_BIAS : null;
    return row[1] * (bias && bias[id] ? bias[id] : 1);
  };
  if (biasOf(4, "meteor") <= biasOf(1, "meteor")) fails.push("meteor bias");
  if (biasOf(1, "boost") <= biasOf(4, "boost")) fails.push("boost bias");
  if (!race.boxes || race.boxes.length < 10) fails.push("boxes");
  race.phase = "race";
  race.time = 12;
  const length = Math.max(80, race.track.length || 1000);
  const clear = () => {
    race.shots = [];
    race.traps = [];
    race.surges = [];
    race.slicks = [];
    race.meteors = [];
    race.tethers = [];
  };
  const arm = (id) => {
    you.held = id;
    you.fireCd = 0;
    you.stun = 0;
    return launchHeld(race, you);
  };

  park(race, you, 0.3);
  you.vx = 0;
  you.vz = 18;
  you.speed = 18;
  if (arm("boost") !== "boost") fails.push("boost launch");
  if (!(you.boost >= 1.55)) fails.push("boost time");
  if (you.fireCd < 0.8 || you.fireCd > 0.9) fails.push("cd " + you.fireCd);

  clear();
  park(race, you, 0.34);
  const aim = forward(you.yaw);
  if (arm("trap") !== "trap") fails.push("trap launch");
  const trap = race.traps[race.traps.length - 1];
  if (!trap) fails.push("trap drop");
  else {
    const before = foe.hitTick || 0;
    foe.x = trap.x;
    foe.z = trap.z;
    foe.y = trap.y;
    foe.finished = false;
    foe.stun = 0;
    foe.buckler = 0;
    for (let i = 0; i < 20; i++) stepItems(race, 1 / 60);
    if ((foe.hitTick || 0) <= before || foe.stun < 0.7) fails.push("trap hit");
  }

  clear();
  park(race, you, 0.4);
  park(race, foe, you.t + 8 / length);
  you.yaw = Math.atan2(foe.x - you.x, foe.z - you.z);
  const pineBefore = foe.hitTick || 0;
  foe.stun = 0;
  arm("pine");
  for (let i = 0; i < 40; i++) stepItems(race, 1 / 60);
  if ((foe.hitTick || 0) <= pineBefore || foe.stun < 0.4) fails.push("pine hit");

  clear();
  park(race, you, 0.48);
  park(race, foe, you.t + SURGE_AHEAD / length);
  const surgeBefore = foe.hitTick || 0;
  foe.stun = 0;
  arm("surge");
  for (let i = 0; i < 20; i++) stepItems(race, 1 / 60);
  if ((foe.hitTick || 0) <= surgeBefore || foe.stun < 0.5) fails.push("surge hit");

  clear();
  park(race, you, 0.56);
  park(race, foe, you.t + 10 / length);
  const magBefore = foe.hitTick || 0;
  const far = Math.hypot(foe.x - you.x, foe.z - you.z);
  arm("magnet");
  for (let i = 0; i < 30; i++) stepItems(race, 1 / 60);
  const near = Math.hypot(foe.x - you.x, foe.z - you.z);
  if ((foe.hitTick || 0) <= magBefore || foe.speedMul > 0.65 || near > far - 0.2) fails.push("magnet hit");

  clear();
  park(race, you, 0.62);
  park(race, foe, you.t);
  const side = frameAt(race.track, you.t);
  foe.x = you.x + side.right.x * 2.2;
  foe.z = you.z + side.right.z * 2.2;
  const buckBefore = foe.hitTick || 0;
  const bx = foe.x;
  const bz = foe.z;
  arm("buckler");
  if ((foe.hitTick || 0) <= buckBefore) fails.push("buckler hit");
  if (Math.hypot(foe.x - bx, foe.z - bz) < 0.4 && Math.hypot(foe.vx, foe.vz) < 1) fails.push("buckler knock");
  if (!(you.buckler > 2)) fails.push("buckler shield");

  clear();
  park(race, you, 0.7);
  arm("meteor");
  const chip = race.meteors[race.meteors.length - 1];
  if (!chip) fails.push("meteor drop");
  else {
    foe.x = chip.tx;
    foe.z = chip.tz;
    foe.y = chip.ty;
    foe.finished = false;
    foe.stun = 0;
    const metBefore = foe.hitTick || 0;
    for (let i = 0; i < 40; i++) stepItems(race, 1 / 60);
    if ((foe.hitTick || 0) <= metBefore || foe.stun < 1) fails.push("meteor hit");
    if (!race.craters.length) fails.push("crater");
  }

  clear();
  park(race, you, 0.78);
  arm("slick");
  const patch = race.slicks[race.slicks.length - 1];
  if (!patch) fails.push("slick drop");
  else {
    foe.x = patch.x;
    foe.z = patch.z;
    foe.finished = false;
    foe.slowT = 0;
    foe.speedMul = 1;
    const slickBefore = foe.hitTick || 0;
    stepItems(race, 1 / 60);
    if ((foe.hitTick || 0) <= slickBefore || foe.speedMul > 0.45 || foe.slowT < 1) fails.push("slick hit");
  }

  const box = race.boxes && race.boxes[0];
  if (box) {
    box.alive = false;
    box.respawn = 4.5;
    stepItems(race, 4);
    if (box.alive) fails.push("box early");
    stepItems(race, 1.2);
    if (!box.alive) fails.push("box 6s");
  }
}
