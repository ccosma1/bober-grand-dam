/* Item boxes and place-weighted throws. Blue Lodge Orb only in 1st or 2nd. */
import { frameAt, forward, livePlace } from "./sim.js?v=gd12";

export const ITEM_IDS = ["sap", "trap", "wall", "rocket", "star", "orb"];

const LEAD = [
  ["sap", 1],
  ["trap", 2],
  ["wall", 1],
  ["rocket", 1],
  ["star", 1],
  ["orb", 3],
];
const BACK = [
  ["sap", 3],
  ["trap", 2],
  ["wall", 2],
  ["rocket", 3],
  ["star", 2],
];

const BOX_T = [0.17, 0.39, 0.63, 0.86];

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

export function seedItems(race) {
  race.boxes = BOX_T.map((t) => {
    let tt = t;
    if (frameAt(race.track, tt).gap) tt = (t + 0.05) % 1;
    return { t: tt, alive: true, respawn: 0 };
  });
  race.shots = [];
  race.traps = [];
  race.walls = [];
  race.bursts = [];
  race.lastFx = "";
}

function burst(race, kind, x, y, z) {
  race.bursts.push({ kind, x, y, z, life: 0.7, max: 0.7 });
  race.lastFx = kind;
}

function hurt(race, kart, stun, ix, iz) {
  if (!kart || kart.finished || kart.invuln > 0) return;
  kart.stun = Math.min(1.2, Math.max(kart.stun || 0, stun));
  if (ix || iz) {
    kart.vx += ix || 0;
    kart.vz += iz || 0;
  }
  burst(race, "hit", kart.x, kart.y + 0.7, kart.z);
}

function aheadFoe(race, fromId, t) {
  let best = null;
  let bestDt = 0.45;
  for (const k of race.karts) {
    if (k.id === fromId || k.finished) continue;
    let dt = k.t - t;
    if (dt < -0.5) dt += 1;
    if (dt > 0.5) dt -= 1;
    if (dt > 0.01 && dt < bestDt) {
      bestDt = dt;
      best = k;
    }
  }
  return best;
}

export function launchHeld(race, kart) {
  if (!kart.held || kart.fireCd > 0 || kart.finished || kart.stun > 0.2) return "";
  const id = kart.held;
  kart.held = null;
  kart.holdAge = 0;
  kart.fireCd = 1.5;
  const f = forward(kart.yaw);
  const fr = frameAt(race.track, kart.t);
  if (id === "sap" || id === "rocket") {
    race.shots.push({
      kind: id,
      owner: kart.id,
      x: kart.x + f.x * 1.4,
      y: kart.y + 0.7,
      z: kart.z + f.z * 1.4,
      vx: f.x,
      vz: f.z,
      t: kart.t,
      life: id === "sap" ? 2.4 : 1.35,
      trail: [],
    });
  } else if (id === "trap") {
    race.traps.push({
      owner: kart.id,
      x: kart.x - f.x * 1.6,
      z: kart.z - f.z * 1.6,
      y: kart.y,
      life: 8,
      armed: 0.35,
    });
  } else if (id === "wall") {
    const ahead = frameAt(race.track, kart.t + 0.03);
    race.walls.push({
      owner: kart.id,
      t: ahead.t,
      x: ahead.p.x,
      y: ahead.p.y,
      z: ahead.p.z,
      life: 4.2,
      half: Math.min(2.1, ahead.width * 0.28),
    });
  } else if (id === "star") {
    kart.invuln = Math.max(kart.invuln || 0, 3.2);
  } else if (id === "orb") {
    kart.orb = Math.max(kart.orb || 0, 2.2);
    for (const other of race.karts) {
      if (other.id === kart.id) continue;
      const dx = other.x - kart.x;
      const dz = other.z - kart.z;
      const d = Math.hypot(dx, dz);
      if (d < 7 && d > 0.2) {
        hurt(race, other, 0.45, (dx / d) * 10, (dz / d) * 10);
      }
    }
    burst(race, "shock", kart.x, kart.y + 0.5, kart.z);
  }
  burst(race, id, kart.x, fr.p.y + 0.8, kart.z);
  race.lastFx = id;
  return id;
}

function hitRadius(race, shot, rad, stun) {
  for (const k of race.karts) {
    if (k.id === shot.owner || k.finished) continue;
    const d = Math.hypot(k.x - shot.x, k.z - shot.z);
    if (d < rad) {
      const nx = d > 0.05 ? (k.x - shot.x) / d : shot.vx;
      const nz = d > 0.05 ? (k.z - shot.z) / d : shot.vz;
      hurt(race, k, stun, nx * (shot.kind === "rocket" ? 16 : 8), nz * (shot.kind === "rocket" ? 16 : 8));
      return true;
    }
  }
  return false;
}

export function stepItems(race, dt) {
  for (const k of race.karts) {
    if (k.held) k.holdAge = (k.holdAge || 0) + dt;
  }
  for (const box of race.boxes) {
    if (!box.alive) {
      box.respawn -= dt;
      if (box.respawn <= 0) box.alive = true;
      continue;
    }
    const bf = frameAt(race.track, box.t);
    for (const k of race.karts) {
      if (k.held || k.finished) continue;
      let gap = Math.abs(k.t - box.t);
      if (gap > 0.5) gap = 1 - gap;
      const lat = Math.abs((k.x - bf.p.x) * bf.right.x + (k.z - bf.p.z) * bf.right.z);
      if (gap < 0.02 && lat < bf.width * 0.48) {
        k.held = rollItem(livePlace(race, k.id));
        k.holdAge = 0;
        box.alive = false;
        box.respawn = 8 + Math.random() * 4;
        burst(race, "box", k.x, k.y + 0.8, k.z);
        break;
      }
    }
  }
  for (const shot of race.shots) {
    shot.life -= dt;
    shot.trail.push({ x: shot.x, y: shot.y, z: shot.z });
    if (shot.trail.length > 14) shot.trail.shift();
    if (shot.kind === "sap") {
      const foe = aheadFoe(race, shot.owner, shot.t);
      if (foe) {
        const dx = foe.x - shot.x;
        const dz = foe.z - shot.z;
        const d = Math.hypot(dx, dz) || 1;
        shot.vx += (dx / d - shot.vx) * Math.min(1, dt * 4.5);
        shot.vz += (dz / d - shot.vz) * Math.min(1, dt * 4.5);
        const m = Math.hypot(shot.vx, shot.vz) || 1;
        shot.vx /= m;
        shot.vz /= m;
      }
      shot.x += shot.vx * 38 * dt;
      shot.z += shot.vz * 38 * dt;
    } else {
      shot.x += shot.vx * 64 * dt;
      shot.z += shot.vz * 64 * dt;
    }
    const near = frameAt(race.track, shot.t);
    let best = shot.t;
    let bestD = 1e9;
    for (let s = -3; s <= 6; s++) {
      const tt = shot.t + s * 0.008;
      const fr = frameAt(race.track, tt);
      const d = (fr.p.x - shot.x) ** 2 + (fr.p.z - shot.z) ** 2;
      if (d < bestD) {
        bestD = d;
        best = fr.t;
        shot.y = fr.p.y + 0.65;
      }
    }
    shot.t = best;
    const rad = shot.kind === "rocket" ? 1.55 : 1.25;
    const stun = shot.kind === "rocket" ? 0.7 : 0.85;
    if (hitRadius(race, shot, rad, stun) || shot.life <= 0) {
      if (shot.kind === "rocket") {
        for (const k of race.karts) {
          if (k.id === shot.owner) continue;
          const d = Math.hypot(k.x - shot.x, k.z - shot.z);
          if (d < 3.5 && d > 0.2) {
            hurt(race, k, 0.55, ((k.x - shot.x) / d) * 12, ((k.z - shot.z) / d) * 12);
          }
        }
        burst(race, "blast", shot.x, shot.y, shot.z);
      } else {
        burst(race, "sap", shot.x, shot.y, shot.z);
      }
      shot.life = 0;
    }
    void near;
  }
  race.shots = race.shots.filter((s) => s.life > 0);
  for (const trap of race.traps) {
    trap.life -= dt;
    trap.armed -= dt;
    if (trap.armed > 0) continue;
    for (const k of race.karts) {
      if (k.id === trap.owner || k.finished) continue;
      if (Math.hypot(k.x - trap.x, k.z - trap.z) < 1.35) {
        hurt(race, k, 0.9, 0, 0);
        k.yaw += 1.1;
        trap.life = 0;
        burst(race, "trap", trap.x, trap.y, trap.z);
        break;
      }
    }
  }
  race.traps = race.traps.filter((t) => t.life > 0);
  for (const wall of race.walls) {
    wall.life -= dt;
    const fr = frameAt(race.track, wall.t);
    for (const k of race.karts) {
      if (k.finished || k.invuln > 0) continue;
      let gap = Math.abs(k.t - wall.t);
      if (gap > 0.5) gap = 1 - gap;
      const lat = (k.x - fr.p.x) * fr.right.x + (k.z - fr.p.z) * fr.right.z;
      if (gap < 0.012 && Math.abs(lat) < wall.half) {
        if ((k.wallHit || 0) > race.time) continue;
        k.wallHit = race.time + 0.85;
        const back = forward(k.yaw);
        k.vx -= back.x * 8;
        k.vz -= back.z * 8;
        hurt(race, k, 0.55, -back.x * 6, -back.z * 6);
      }
    }
  }
  race.walls = race.walls.filter((w) => w.life > 0);
  for (const b of race.bursts) b.life -= dt;
  if (race.bursts.length > 24) race.bursts.splice(0, race.bursts.length - 24);
  race.bursts = race.bursts.filter((b) => b.life > 0);
}

export function testItems(race, fails) {
  const you = race.karts[0];
  for (let i = 0; i < 40; i++) {
    if (rollItem(4, Math.random) === "orb") fails.push("orb in back");
  }
  let sawOrb = false;
  for (let i = 0; i < 30; i++) if (rollItem(1, Math.random) === "orb") sawOrb = true;
  if (!sawOrb) fails.push("orb never leads");
  race.phase = "race";
  race.time = 20;
  for (const id of ITEM_IDS) {
    you.held = id;
    you.fireCd = 0;
    you.stun = 0;
    const launched = launchHeld(race, you);
    if (launched !== id) fails.push("launch " + id);
    if (you.fireCd < 1.4) fails.push("cd " + id);
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
  if (you.stun > 1.2) fails.push("stun cap " + you.stun);
  stepItems(race, 0.05);
  if (!race.shots.length && !race.traps.length && !race.walls.length && !(you.invuln > 0) && !(you.orb > 0)) {
    fails.push("no fx");
  }
}
