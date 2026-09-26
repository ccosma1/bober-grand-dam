/* Eight lodge throws. One held item. Boxes return in 4.5s. */
import { frameAt, forward, livePlace } from "./sim.js?v=gd44";

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

const BASE = [
  ["boost", 16],
  ["trap", 13],
  ["pine", 14],
  ["surge", 13],
  ["magnet", 12],
  ["buckler", 10],
  ["meteor", 12],
  ["slick", 10],
];
const LEAD_BIAS = { boost: 1.25, slick: 1.25, trap: 1.25, buckler: 1.25 };
const BACK_BIAS = { meteor: 1.35, magnet: 1.35, pine: 1.35 };

const PINE_R = 1.45;
const PINE_REACH = 3.05;
const PINE_SPEED = 48;
const SURGE_AHEAD = 4;
const SURGE_SPEED = 46;
const SURGE_ALONG = 2;
const AIM_RANGE = 60;
const BUCK_R = 3.6;
const METEOR_R = 7;
const SLICK_W = 1.6;
const SLICK_L = 2.1;
const REACH = 3.05;
const HURT = 1.6;

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
  return Math.hypot(kart.x - x, kart.z - z) < rad + HURT;
}

function sideAxis(yaw) {
  return { x: Math.cos(yaw), z: -Math.sin(yaw) };
}

/* Every throw lands here. Full hits spin twice in 0.9s. Slick is the short form. */
export function applyHit(race, kart, weapon, extra) {
  extra = extra || {};
  if (!kart || kart.finished) return false;
  if ((kart.invuln || 0) > 0) return false;
  const incoming = weapon !== "buckler";
  if (incoming && (kart.buckler || 0) > 0 && (kart.bucklerHits || 0) > 0 && !extra.unblockable) {
    kart.bucklerHits -= 1;
    kart.buckFlash = 0.35;
    burst(race, "block", kart.x, kart.y + 1.1, kart.z, 0.45);
    kart.hitFlash = 0.45;
    if (!kart.bucklerKnocked) {
      kart.bucklerKnocked = true;
      knockBuckler(race, kart);
    }
    noteHit(race, "block", kart);
    race.hitToast = "BLOCKED";
    race.hitToastT = 1.15;
    return false;
  }
  if ((kart.stunCd || 0) > 0 && !extra.unblockable && !extra.ignoreStun) return false;
  const short = !!(extra.short || weapon === "slick");
  const dur = short ? 0.45 : 0.9;
  const turns = short ? 1 : 2;
  kart.spinT = Math.max(kart.spinT || 0, dur);
  kart.spinDur = dur;
  kart.spinTurns = turns;
  if (!(kart.spinDir === 1 || kart.spinDir === -1) || (kart.spinT || 0) >= dur - 0.02) {
    kart.spinDir = Math.random() < 0.5 ? -1 : 1;
  }
  kart.dizzyT = Math.max(kart.dizzyT || 0, short ? 0.7 : 1.5);
  kart.hitMarkT = Math.max(kart.hitMarkT || 0, short ? 0.85 : 1.15);
  kart.hitFlash = 0.8;
  const mulNow = kart.speedMul && kart.speedMul > 0 ? kart.speedMul : 1;
  kart.speedMul = Math.min(mulNow, 0.2);
  kart.slowT = Math.max(kart.slowT || 0, short ? 0.3 : 1.2);
  kart.stun = Math.max(kart.stun || 0, short ? 0.3 : 0.2);
  kart.vx = (kart.vx || 0) * 0.2;
  kart.vz = (kart.vz || 0) * 0.2;
  if (extra.ix || extra.iz) {
    kart.vx += extra.ix || 0;
    kart.vz += extra.iz || 0;
  }
  if (extra.nudge) {
    kart.x += extra.nudge.x;
    kart.z += extra.nudge.z;
  }
  kart.stunCd = short ? 0.25 : 0.4;
  kart.hitTick = (kart.hitTick || 0) + 1;
  kart.lastWeapon = weapon;
  burst(race, weapon || "hit", kart.x, kart.y + 1.1, kart.z, 0.55);
  juice(race, weapon || "hit", extra.shake || 0.4);
  noteHit(race, weapon || "hit", kart);
  const you = (race.karts || []).find((k) => k && !k.cpu);
  if (extra.by != null && you && extra.by === you.id && kart.id !== you.id) {
    race.hitToast = "HIT " + String(kart.name || kart.id).toUpperCase() + "!";
    race.hitToastT = 1.15;
  }
  return true;
}

function knockBuckler(race, owner) {
  if (!owner.buckHit) owner.buckHit = {};
  const axis = sideAxis(owner.yaw);
  let flashed = false;
  for (const other of race.karts || []) {
    if (other.id === owner.id || other.finished || owner.buckHit[other.id]) continue;
    const dx = other.x - owner.x;
    const dz = other.z - owner.z;
    if (Math.hypot(dx, dz) > BUCK_R) continue;
    const side = Math.sign(dx * axis.x + dz * axis.z) || 1;
    const landed = applyHit(race, other, "buckler", {
      by: owner.id,
      unblockable: true,
      nudge: { x: axis.x * 4 * side, z: axis.z * 4 * side },
      shake: 0.4,
    });
    if (!landed) continue;
    owner.buckHit[other.id] = true;
    flashed = true;
  }
  if (flashed) {
    owner.buckFlash = 0.35;
    burst(race, "block", owner.x, owner.y + 1.2, owner.z, 0.35);
  }
}

function wheelTouch(kart, x, z, rad) {
  const f = forward(kart.yaw);
  for (const along of [0, 1.15, -1.15]) {
    const wx = kart.x + f.x * along;
    const wz = kart.z + f.z * along;
    if (Math.hypot(wx - x, wz - z) <= rad) return true;
  }
  return false;
}

function noteHit(race, item, kart) {
  if (!race.hitLog) race.hitLog = {};
  const key = item + ":" + kart.id;
  if (race.hitLog[key]) return;
  race.hitLog[key] = true;
  console.info("HIT " + item + " → " + (kart.name || kart.id) + " stunT=" + (kart.stun || 0).toFixed(2));
}

function pickTarget(race, from, range) {
  const limit = range == null ? AIM_RANGE : range;
  let front = null;
  let back = null;
  for (const k of race.karts) {
    if (k.id === from.id || k.finished) continue;
    const dist = Math.hypot(k.x - from.x, k.z - from.z);
    if (dist > limit) continue;
    const dt = wrapDt(from.t, k.t);
    const slot = { kart: k, dist, dt };
    if (dt >= -0.001) {
      if (!front || dist < front.dist) front = slot;
    } else if (!back || dist < back.dist) back = slot;
  }
  return front || back;
}

function missKeep(race, kart, id) {
  kart.held = id;
  kart.fireCd = 0.2;
  if (!kart.cpu) {
    race.hitToast = "NO TARGET";
    race.hitToastT = 1.15;
    race.buzz = (race.buzz || 0) + 1;
  }
  return "";
}

export function launchHeld(race, kart) {
  if (!kart.held || kart.fireCd > 0 || kart.finished || kart.stun > 0.2) return "";
  const id = kart.held;
  if (id === "pine" || id === "surge" || id === "magnet" || id === "meteor") {
    if (!pickTarget(race, kart, AIM_RANGE)) return missKeep(race, kart, id);
  }
  kart.held = null;
  kart.holdAge = 0;
  kart.fireCd = 0.85;
  const f = forward(kart.yaw);
  const length = Math.max(80, race.track.length || 1000);
  if (id === "boost") {
    kart.boost = 1.8;
    kart.boostPow = 44;
    juice(race, "boost", 0.4);
    burst(race, "boost", kart.x - f.x * 1.4, kart.y + 0.4, kart.z - f.z * 1.4, 0.45);
  } else if (id === "trap") {
    const drop = 3;
    race.traps.push({
      owner: kart.id,
      x: kart.x - f.x * drop,
      z: kart.z - f.z * drop,
      y: kart.y,
      yaw: kart.yaw,
      life: 12,
      armed: 0.05,
      halfW: 3.2,
      halfL: 2.8,
    });
    burst(race, "trap", kart.x - f.x * drop, kart.y + 0.5, kart.z - f.z * drop, 0.45);
  } else if (id === "pine") {
    const prey = pickTarget(race, kart, AIM_RANGE);
    if (!prey) return missKeep(race, kart, id);
    const yaw = Math.atan2(prey.kart.x - kart.x, prey.kart.z - kart.z);
    const volley = (race.volley = (race.volley || 0) + 1);
    for (const deg of [-18, -9, 0, 9, 18]) {
      const a = yaw + (deg * Math.PI) / 180;
      const vx = Math.sin(a);
      const vz = Math.cos(a);
      race.shots.push({
        kind: "pine",
        owner: kart.id,
        prey: prey.kart.id,
        volley,
        x: kart.x + vx * 1.4,
        y: kart.y + 0.9,
        z: kart.z + vz * 1.4,
        vx,
        vz,
        t: kart.t,
        life: 1.8,
        age: 0,
        trail: [],
      });
    }
    juice(race, "pine", 0.3);
  } else if (id === "surge") {
    if (!pickTarget(race, kart, AIM_RANGE)) return missKeep(race, kart, id);
    const spawnWall = (sample, back) => {
      race.surges.push({
        owner: kart.id,
        t: sample.t,
        x: sample.p.x,
        y: sample.p.y,
        z: sample.p.z,
        yaw: Math.atan2(sample.tangent.x, sample.tangent.z),
        life: 1.4,
        max: 1.4,
        travel: 0,
        hit: {},
        back: !!back,
      });
    };
    spawnWall(frameAt(race.track, kart.t + SURGE_AHEAD / length), false);
    spawnWall(frameAt(race.track, kart.t - 4 / length), true);
    juice(race, "surge", 0.45);
  } else if (id === "magnet") {
    const tgt = pickTarget(race, kart, AIM_RANGE);
    if (!tgt) return missKeep(race, kart, id);
    const landed = applyHit(race, tgt.kart, "magnet", { by: kart.id, shake: 0.45 });
    race.tethers.push({
      owner: kart.id,
      id: tgt.kart.id,
      life: 1.6,
      pull: 18,
      pulse: 0,
      landed: !!landed,
    });
  } else if (id === "buckler") {
    kart.buckler = 2.5;
    kart.bucklerHits = 1;
    kart.buckHit = {};
    kart.bucklerKnocked = false;
    juice(race, "buckler", 0.3);
    burst(race, "buckler", kart.x, kart.y + 1, kart.z, 0.5);
    knockBuckler(race, kart);
  } else if (id === "meteor") {
    const prey = pickTarget(race, kart, AIM_RANGE);
    if (!prey) return missKeep(race, kart, id);
    const leadT = prey.kart.t + (Math.max(12, prey.kart.speed || 16) * 0.4) / length;
    const dest = frameAt(race.track, leadT);
    race.meteors.push({
      owner: kart.id,
      prey: prey.kart.id,
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
    const drop = 3;
    race.slicks.push({
      owner: kart.id,
      x: kart.x - f.x * drop,
      z: kart.z - f.z * drop,
      y: kart.y,
      yaw: kart.yaw,
      life: 9,
      hit: {},
    });
    kart.slickImmune = 0.35;
    burst(race, "slick", kart.x - f.x * drop, kart.y + 0.25, kart.z - f.z * drop, 0.5);
  }
  race.lastFx = id;
  race.pickup = id;
  return id;
}

function stepItems(race, dt) {
  if (race.shake > 0) race.shake = Math.max(0, race.shake - dt * 1.6);
  if (race.hitToastT > 0) race.hitToastT = Math.max(0, race.hitToastT - dt);
  for (const k of race.karts) {
    if (k.held) k.holdAge = (k.holdAge || 0) + dt;
    if (k.got > 0) k.got -= dt;
    if (k.buckler > 0) {
      k.buckler = Math.max(0, k.buckler - dt);
      if ((k.buckFlash || 0) > 0) k.buckFlash = Math.max(0, k.buckFlash - dt);
      knockBuckler(race, k);
    } else if ((k.buckFlash || 0) > 0) {
      k.buckFlash = Math.max(0, k.buckFlash - dt);
    }
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
    if (shot.life <= 0) continue;
    shot.life -= dt;
    shot.age = (shot.age || 0) + dt;
    shot.trail.push({ x: shot.x, y: shot.y, z: shot.z });
    if (shot.trail.length > 8) shot.trail.shift();
    if (shot.prey) {
      const prey = race.karts.find((k) => k.id === shot.prey && !k.finished);
      if (prey) {
        const dx = prey.x - shot.x;
        const dz = prey.z - shot.z;
        const dist = Math.hypot(dx, dz) || 1;
        const aim = Math.min(1, dt * 6);
        shot.vx += (dx / dist - shot.vx) * aim;
        shot.vz += (dz / dist - shot.vz) * aim;
        const n = Math.hypot(shot.vx, shot.vz) || 1;
        shot.vx /= n;
        shot.vz /= n;
      }
    }
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
        const pdx = k.x - shot.x;
        const pdz = k.z - shot.z;
        const pineReach = Math.max(PINE_R, PINE_REACH);
        if (pdx * pdx + pdz * pdz > pineReach * pineReach) continue;
        if (!applyHit(race, k, "pine", { by: shot.owner, shake: 0.32 })) continue;
        for (const other of race.shots) {
          if (other.owner === shot.owner && other.volley === shot.volley) other.life = 0;
        }
        break;
      }
    }
  }
  race.shots = (race.shots || []).filter((s) => s.life > 0);

  for (const trap of race.traps || []) {
    trap.life -= dt;
    trap.armed = Math.max(0, (trap.armed || 0) - dt);
    if ((trap.armed || 0) > 0) continue;
    for (const k of race.karts) {
      if (k.id === trap.owner || k.finished) continue;
      const dx = k.x - trap.x;
      const dz = k.z - trap.z;
      const s = Math.sin(trap.yaw);
      const c = Math.cos(trap.yaw);
      const along = dx * s + dz * c;
      const across = dx * c - dz * s;
      if (Math.abs(along) > (trap.halfL || 2.8) || Math.abs(across) > (trap.halfW || 3.2)) continue;
      const back = forward(k.yaw);
      const landed = applyHit(race, k, "trap", {
        by: trap.owner,
        shake: 0.55,
        ix: -back.x * 6,
        iz: -back.z * 6,
      });
      if (!landed) continue;
      trap.life = 0;
      break;
    }
  }
  race.traps = (race.traps || []).filter((t) => t.life > 0);

  const length = Math.max(80, race.track.length || 1000);
  for (const wall of race.surges || []) {
    wall.life -= dt;
    const step = SURGE_SPEED * dt * (wall.back ? -1 : 1);
    wall.t = wall.t + step / length;
    wall.t = ((wall.t % 1) + 1) % 1;
    const fr = frameAt(race.track, wall.t);
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
      const surgeHalf = fr.width * 0.5;
      const inSlab = Math.abs(across) <= surgeHalf && Math.abs(along) <= SURGE_ALONG;
      if (!inSlab && dx * dx + dz * dz > REACH * REACH) continue;
      const sign = Math.sign(across) || 1;
      const landed = applyHit(race, k, "surge", {
        by: wall.owner,
        shake: 0.5,
        ix: fr.right.x * sign * 8,
        iz: fr.right.z * sign * 8,
        nudge: { x: fr.right.x * sign * 2, z: fr.right.z * sign * 2 },
      });
      if (landed) wall.hit[k.id] = true;
    }
  }
  race.surges = (race.surges || []).filter((w) => w.life > 0);

  for (const link of race.tethers || []) {
    link.life -= dt;
    const owner = race.karts.find((k) => k.id === link.owner);
    const tgt = race.karts.find((k) => k.id === link.id);
    if (!owner || !tgt || tgt.finished) {
      link.life = 0;
      continue;
    }
    link.pulse = (link.pulse || 0) + dt;
    if (link.pulse >= 0.2) {
      link.pulse -= 0.2;
      if (!link.landed) {
        const hit = applyHit(race, tgt, "magnet", { by: owner.id, shake: 0.45, ignoreStun: true });
        if (hit) link.landed = true;
      }
      const dx = owner.x - tgt.x;
      const dz = owner.z - tgt.z;
      const d = Math.hypot(dx, dz) || 1;
      const step = d > 2.2 ? Math.max(2, Math.min(3.4, d - 1.4)) : 0;
      if (step > 0) {
        tgt.x += (dx / d) * step;
        tgt.z += (dz / d) * step;
        link.hauled = (link.hauled || 0) + step;
      }
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
    if (!chip.boom && chip.prey) {
      const prey = race.karts.find((k) => k.id === chip.prey && !k.finished);
      if (prey) {
        chip.tx = prey.x;
        chip.tz = prey.z;
        chip.ty = prey.y + 0.4;
        chip.x = prey.x;
        chip.z = prey.z;
      }
    }
    const k = Math.min(1, chip.age / 0.42);
    chip.y = chip.ty + (1 - k) * 9;
    chip.x = chip.tx;
    chip.z = chip.tz;
    if (!chip.boom && (k >= 1 || chip.life <= 0)) {
      chip.boom = true;
      chip.blast = 0.3;
      chip.hit = {};
      burst(race, "meteor", chip.x, chip.y + 0.6, chip.z, 0.9);
      burst(race, "blast", chip.x, chip.y + 1.4, chip.z, 0.7);
      race.craters.push({ x: chip.x, y: chip.ty, z: chip.z, life: 2, max: 2 });
      juice(race, "meteor", 0.7);
    }
    if (chip.boom && (chip.blast || 0) > 0) {
      chip.blast -= dt;
      for (const kart of race.karts) {
        if (kart.finished || kart.id === chip.owner || chip.hit[kart.id]) continue;
        const mdx = kart.x - chip.x;
        const mdz = kart.z - chip.z;
        if (mdx * mdx + mdz * mdz > METEOR_R * METEOR_R) continue;
        const d = Math.hypot(mdx, mdz) || 1;
        const landed = applyHit(race, kart, "meteor", {
          by: chip.owner,
          shake: 0.6,
          ignoreStun: true,
          ix: (mdx / d) * 6,
          iz: (mdz / d) * 6,
        });
        if (landed) chip.hit[kart.id] = true;
      }
    }
  }
  race.meteors = (race.meteors || []).filter((m) => !m.boom || (m.blast || 0) > 0);

  for (const patch of race.slicks || []) {
    patch.life -= dt;
    patch.age = (patch.age || 0) + dt;
    const c = Math.cos(patch.yaw);
    const s = Math.sin(patch.yaw);
    for (const k of race.karts) {
      if (k.finished || patch.hit[k.id]) continue;
      if (k.id === patch.owner && ((k.slickImmune || 0) > 0 || patch.age < 0.35)) continue;
      const dx = k.x - patch.x;
      const dz = k.z - patch.z;
      const along = dx * s + dz * c;
      const across = dx * c - dz * s;
      const inPatch = Math.abs(across) <= SLICK_W && Math.abs(along) <= SLICK_L;
      if (!inPatch && dx * dx + dz * dz > REACH * REACH) continue;
      if (!applyHit(race, k, "slick", { short: true, by: patch.owner, shake: 0.3 })) continue;
      patch.hit[k.id] = true;
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
  kart.stunCd = 0;
  kart.invuln = 0;
  kart.slickImmune = 0;
  kart.hitFlash = 0;
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
  if (!(you.boost >= 1.75)) fails.push("boost time");
  if (you.fireCd < 0.8 || you.fireCd > 0.9) fails.push("cd " + you.fireCd);

  clear();
  park(race, you, 0.34);
  const aim = forward(you.yaw);
  if (arm("trap") !== "trap") fails.push("trap launch");
  const trap = race.traps[race.traps.length - 1];
  if (!trap) fails.push("trap drop");
  else {
    const before = foe.hitTick || 0;
    const dir = frameAt(race.track, you.t);
    foe.x = trap.x - dir.tangent.x * 4;
    foe.z = trap.z - dir.tangent.z * 4;
    foe.y = trap.y;
    foe.finished = false;
    foe.stun = 0;
    foe.stunCd = 0;
    foe.buckler = 0;
    foe.bucklerHits = 0;
    for (let i = 0; i < 36; i++) {
      stepItems(race, 1 / 60);
      if (trap.armed <= 0 && foe.stun <= 0) {
        foe.x += dir.tangent.x * 0.55;
        foe.z += dir.tangent.z * 0.55;
      }
    }
    if ((foe.hitTick || 0) <= before || (foe.spinT || 0) < 0.4 || (foe.dizzyT || 0) < 0.8) fails.push("trap hit");
    if (race.traps.some((t) => t === trap && t.life > 0)) fails.push("trap stay");
  }

  clear();
  park(race, you, 0.4);
  park(race, foe, you.t + 8 / length);
  you.yaw = Math.atan2(foe.x - you.x, foe.z - you.z);
  const pineBefore = foe.hitTick || 0;
  foe.stun = 0;
  foe.stunCd = 0;
  arm("pine");
  for (let i = 0; i < 40; i++) stepItems(race, 1 / 60);
  if ((foe.hitTick || 0) <= pineBefore || (foe.spinT || 0) < 0.4 || (foe.dizzyT || 0) < 0.8 || (foe.speedMul || 1) > 0.25) fails.push("pine hit");
  if (!String(race.hitToast || "").startsWith("HIT ")) fails.push("pine toast " + race.hitToast);

  clear();
  park(race, you, 0.48);
  park(race, foe, you.t + SURGE_AHEAD / length);
  const surgeBefore = foe.hitTick || 0;
  foe.stun = 0;
  foe.stunCd = 0;
  arm("surge");
  for (let i = 0; i < 20; i++) stepItems(race, 1 / 60);
  if ((foe.hitTick || 0) <= surgeBefore || (foe.spinT || 0) < 0.4 || (foe.dizzyT || 0) < 0.8) fails.push("surge hit");

  clear();
  park(race, you, 0.56);
  park(race, foe, you.t + 10 / length);
  const magBefore = foe.hitTick || 0;
  const far = Math.hypot(foe.x - you.x, foe.z - you.z);
  arm("magnet");
  for (let i = 0; i < 30; i++) stepItems(race, 1 / 60);
  const near = Math.hypot(foe.x - you.x, foe.z - you.z);
  if ((foe.hitTick || 0) <= magBefore || foe.speedMul > 0.58 || near > far - 0.4) fails.push("magnet hit");

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
  park(race, foe, you.t + 12 / length);
  arm("meteor");
  const chip = race.meteors[race.meteors.length - 1];
  if (!chip) fails.push("meteor drop");
  else {
    foe.x = chip.tx;
    foe.z = chip.tz;
    foe.y = chip.ty;
    foe.finished = false;
    foe.stun = 0;
    foe.stunCd = 0;
    const metBefore = foe.hitTick || 0;
    for (let i = 0; i < 40; i++) stepItems(race, 1 / 60);
    if ((foe.hitTick || 0) <= metBefore || (foe.spinT || 0) < 0.4 || (foe.dizzyT || 0) < 0.8) fails.push("meteor hit");
    if (!race.craters.length) fails.push("crater");
    if ((you.stun || 0) > 0.05) fails.push("meteor self " + (you.stun || 0).toFixed(2));
  }

  clear();
  park(race, you, 0.74);
  park(race, foe, you.t + 8 / length);
  you.stun = 0;
  you.stunCd = 0;
  you.hitTick = you.hitTick || 0;
  const selfBefore = you.hitTick;
  arm("meteor");
  const own = race.meteors[race.meteors.length - 1];
  if (!own) fails.push("meteor own");
  else {
    you.x = own.tx;
    you.z = own.tz;
    you.y = own.ty;
    foe.x = own.tx + 1.2;
    foe.z = own.tz;
    foe.stun = 0;
    foe.stunCd = 0;
    foe.spinT = 0;
    foe.dizzyT = 0;
    const stillBefore = foe.hitTick || 0;
    for (let i = 0; i < 40; i++) stepItems(race, 1 / 60);
    if ((you.hitTick || 0) > selfBefore || (you.stun || 0) > 0.05) fails.push("meteor owner");
    if ((foe.hitTick || 0) <= stillBefore || (foe.spinT || 0) < 0.4) fails.push("meteor still");
  }

  clear();
  park(race, you, 0.2);
  for (const k of race.karts) {
    if (k.id === you.id) continue;
    k.finished = true;
    k.x += 800;
    k.z += 800;
  }
  for (const miss of ["pine", "magnet", "meteor", "surge"]) {
    clear();
    you.held = miss;
    you.fireCd = 0;
    you.stun = 0;
    const fired = launchHeld(race, you);
    if (fired || you.held !== miss || you.fireCd > 0.25) fails.push("refund " + miss + " " + fired);
    if (race.hitToast !== "NO TARGET") fails.push("no target " + miss + " " + race.hitToast);
    if (miss === "pine" && race.shots.length) fails.push("pine spent");
    if (miss === "meteor" && race.meteors.length) fails.push("meteor spent");
    if (miss === "magnet" && race.tethers.length) fails.push("magnet spent");
    if (miss === "surge" && race.surges.length) fails.push("surge spent");
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
    foe.stunCd = 0;
    foe.slowT = 0;
    foe.speedMul = 1;
    const slickBefore = foe.hitTick || 0;
    stepItems(race, 1 / 60);
    if ((foe.hitTick || 0) <= slickBefore || foe.speedMul > 0.25 || (foe.stun || 0) < 0.2 || (foe.spinT || 0) < 0.2) fails.push("slick hit");
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
