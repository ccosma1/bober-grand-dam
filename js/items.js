/* Item boxes and place-weighted throws. Blue Lodge Orb only in 1st or 2nd.
   Thunder Twig, Log Roller, Mirror Mist, and Crest Bomb share that table. */
import { frameAt, forward, livePlace } from "./sim.js?v=gd16";

export const ITEM_IDS = ["sap", "trap", "wall", "rocket", "star", "orb", "twig", "log", "mist", "bomb"];

const LEAD = [
  ["sap", 1],
  ["trap", 2],
  ["wall", 1],
  ["rocket", 1],
  ["star", 1],
  ["orb", 3],
  ["twig", 2],
  ["log", 2],
  ["bomb", 4],
  ["mist", 3],
];
const BACK = [
  ["sap", 2],
  ["trap", 2],
  ["wall", 2],
  ["rocket", 3],
  ["star", 2],
  ["twig", 3],
  ["log", 3],
  ["bomb", 5],
  ["mist", 1],
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
  kart.stun = Math.min(1.2, Math.max(kart.stun || 0, stun));
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
    if (dt > 0.012 && dt < 0.42 && (!best || dt < best.dt)) best = { kind, ref, id, dt, x, y, z };
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
  kart.fireCd = 1.5;
  const f = forward(kart.yaw);
  const fr = frameAt(race.track, kart.t);
  if (id === "sap" || id === "rocket") {
    race.shots.push({
      kind: id,
      owner: kart.id,
      x: kart.x + f.x * 1.6,
      y: kart.y + 0.85,
      z: kart.z + f.z * 1.6,
      vx: f.x,
      vz: f.z,
      t: kart.t,
      life: id === "sap" ? 2.5 : 1.45,
      trail: [],
    });
    juice(race, id, id === "rocket" ? 0.28 : 0.12);
  } else if (id === "trap") {
    race.traps.push({
      owner: kart.id,
      x: kart.x - f.x * 2.1,
      z: kart.z - f.z * 2.1,
      y: kart.y,
      life: 8,
      armed: 0.28,
    });
  } else if (id === "wall") {
    const ahead = frameAt(race.track, kart.t + 0.028);
    race.walls.push({
      owner: kart.id,
      t: ahead.t,
      x: ahead.p.x,
      y: ahead.p.y,
      z: ahead.p.z,
      life: 4.2,
      half: Math.min(2.05, ahead.width * 0.26),
      yaw: Math.atan2(ahead.tangent.x, ahead.tangent.z),
    });
  } else if (id === "star") {
    kart.invuln = Math.max(kart.invuln || 0, 3.2);
    juice(race, "star", 0.16);
  } else if (id === "orb") {
    kart.orb = Math.max(kart.orb || 0, 2.2);
    for (const other of race.karts) {
      if (other.id === kart.id) continue;
      const dx = other.x - kart.x;
      const dz = other.z - kart.z;
      const d = Math.hypot(dx, dz);
      if (d < 7.5 && d > 0.2) hurt(race, other, 0.45, (dx / d) * 10, (dz / d) * 10);
    }
    burst(race, "shock", kart.x, kart.y + 0.6, kart.z, 0.7);
    juice(race, "orb", 0.4);
  } else if (id === "twig") {
    const links = [{ x: kart.x + f.x * 6.5, y: kart.y + 1.7, z: kart.z + f.z * 6.5 }];
    let fromId = kart.id;
    let fromT = kart.t;
    for (let hop = 0; hop < 3; hop++) {
      const tgt = nearestAhead(race, fromId, fromT);
      if (!tgt || tgt.dt > 0.3) break;
      links.push({ x: tgt.x, y: (tgt.y || 0) + 1.15, z: tgt.z });
      if (tgt.kind === "decoy") {
        tgt.ref.life = 0;
        burst(race, "twig", tgt.x, tgt.y + 1, tgt.z, 0.45);
        break;
      }
      const dx = tgt.x - links[links.length - 2].x;
      const dz = tgt.z - links[links.length - 2].z;
      const d = Math.hypot(dx, dz) || 1;
      hurt(race, tgt.ref, hop === 0 ? 0.7 : 0.5, (dx / d) * 5, (dz / d) * 5);
      fromId = tgt.ref.id;
      fromT = tgt.ref.t;
    }
    if (links.length < 2) {
      for (const step of [0.045, 0.07, 0.1]) {
        const far = frameAt(race.track, kart.t + step);
        links.push({ x: far.p.x, y: far.p.y + 2.2, z: far.p.z });
      }
    }
    race.bolts.push({ links, life: 0.78, max: 0.78 });
    juice(race, "twig", 0.55);
  } else if (id === "log") {
    race.logs.push({
      owner: kart.id,
      t: (kart.t + 0.012) % 1,
      life: 3.4,
      spin: 0,
      hit: {},
    });
    juice(race, "log", 0.18);
  } else if (id === "mist") {
    const back = frameAt(race.track, kart.t);
    const side = kart.lane > 0 ? -1 : 1;
    race.decoys.push({
      owner: kart.id,
      t: back.t,
      x: back.p.x + back.right.x * 2.6 * side,
      y: back.p.y,
      z: back.p.z + back.right.z * 2.6 * side,
      yaw: Math.atan2(back.tangent.x, back.tangent.z),
      side,
      life: 2.7,
    });
    juice(race, "mist", 0.12);
  } else if (id === "bomb") {
    race.bombs.push({
      owner: kart.id,
      x: kart.x + f.x * 1.2,
      y: kart.y + 1.1,
      z: kart.z + f.z * 1.2,
      vx: f.x,
      vz: f.z,
      vy: 11,
      t: kart.t,
      age: 0,
      life: 1.4,
    });
    juice(race, "bomb", 0.42);
  }
  burst(race, id === "bomb" || id === "twig" ? "spark" : id, kart.x, fr.p.y + 0.9, kart.z, 0.28);
  race.lastFx = id;
  return id;
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
    if (d < 4.4 && d > 0.05) {
      const scale = 1 - d / 4.4;
      hurt(race, k, 0.55 + scale * 0.4, (dx / d) * 12 * scale, (dz / d) * 12 * scale);
    }
  }
}

export function stepItems(race, dt) {
  if (race.shake > 0) race.shake = Math.max(0, race.shake - dt * 1.6);
  for (const k of race.karts) {
    if (k.held) k.holdAge = (k.holdAge || 0) + dt;
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
        k.bombDry = (k.bombDry || 0) + 1;
        if (picked !== "bomb" && k.bombDry >= 4) picked = "bomb";
        if (picked === "bomb") k.bombDry = 0;
        k.held = picked;
        k.holdAge = 0;
        box.alive = false;
        box.respawn = 5.5 + Math.random() * 3.5;
        burst(race, "box", bx, k.y + 0.9, bz, 0.45);
        break;
      }
    }
  }
  for (const shot of race.shots || []) {
    shot.life -= dt;
    shot.trail.push({ x: shot.x, y: shot.y, z: shot.z });
    if (shot.trail.length > 16) shot.trail.shift();
    const tgt = nearestAhead(race, shot.owner, shot.t);
    if (shot.kind === "sap" && tgt) {
      const dx = tgt.x - shot.x;
      const dz = tgt.z - shot.z;
      const d = Math.hypot(dx, dz) || 1;
      shot.vx += (dx / d - shot.vx) * Math.min(1, dt * 4.5);
      shot.vz += (dz / d - shot.vz) * Math.min(1, dt * 4.5);
      const m = Math.hypot(shot.vx, shot.vz) || 1;
      shot.vx /= m;
      shot.vz /= m;
    }
    const speed = shot.kind === "sap" ? 36 : 62;
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
    const rad = shot.kind === "rocket" ? 1.7 : 1.35;
    const stun = shot.kind === "rocket" ? 0.7 : 0.85;
    if (hitRadius(race, shot, rad, stun) || shot.life <= 0) {
      if (shot.kind === "rocket") {
        for (const k of race.karts) {
          if (k.id === shot.owner || k.invuln > 0) continue;
          const d = Math.hypot(k.x - shot.x, k.z - shot.z);
          if (d < 3.6 && d > 0.2) {
            hurt(race, k, 0.55, ((k.x - shot.x) / d) * 11, ((k.z - shot.z) / d) * 11);
          }
        }
        burst(race, "blast", shot.x, shot.y, shot.z, 0.8);
        juice(race, "rocket", 0.45);
      } else if (shot.life <= 0 || true) {
        burst(race, "sap", shot.x, shot.y, shot.z, 0.5);
      }
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
      if (Math.hypot(k.x - trap.x, k.z - trap.z) < 1.55) {
        hurt(race, k, 0.9, 0, 0);
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
        k.wallHit = race.time + 0.85;
        const back = forward(k.yaw);
        k.vx -= back.x * 8;
        k.vz -= back.z * 8;
        hurt(race, k, 0.55, -back.x * 6, -back.z * 6);
      }
    }
  }
  race.walls = (race.walls || []).filter((w) => w.life > 0);

  const length = Math.max(80, race.track.length || 1000);
  for (const log of race.logs || []) {
    log.life -= dt;
    log.spin = (log.spin || 0) + dt * 7;
    log.t = (log.t + (22 / length) * dt) % 1;
    const fr = frameAt(race.track, log.t);
    log.x = fr.p.x;
    log.y = fr.p.y;
    log.z = fr.p.z;
    log.yaw = Math.atan2(fr.tangent.x, fr.tangent.z);
    if (popDecoyAt(race, log.x, log.z, 1.8)) continue;
    for (const k of race.karts) {
      if (k.id === log.owner || k.finished || k.invuln > 0) continue;
      if (log.hit[k.id]) continue;
      const along = Math.abs(wrapDt(log.t, k.t));
      const lat = Math.abs((k.x - fr.p.x) * fr.right.x + (k.z - fr.p.z) * fr.right.z);
      if (along < 0.012 && lat < 1.7) {
        log.hit[k.id] = true;
        const sign = Math.sign((k.x - fr.p.x) * fr.right.x + (k.z - fr.p.z) * fr.right.z) || (k.id.length % 2 ? 1 : -1);
        hurt(race, k, 0.8, fr.right.x * sign * 9, fr.right.z * sign * 9);
        burst(race, "log", k.x, k.y + 0.5, k.z, 0.4);
      }
    }
  }
  race.logs = (race.logs || []).filter((l) => l.life > 0);

  for (const d of race.decoys || []) {
    d.life -= dt;
    d.t = (d.t + (7 / length) * dt + 1) % 1;
    const fr = frameAt(race.track, d.t);
    const side = d.side || 1;
    d.x = fr.p.x + fr.right.x * 2.6 * side;
    d.y = fr.p.y;
    d.z = fr.p.z + fr.right.z * 2.6 * side;
    d.yaw = Math.atan2(fr.tangent.x, fr.tangent.z);
  }
  race.decoys = (race.decoys || []).filter((d) => d.life > 0);

  for (const bomb of race.bombs || []) {
    if (bomb.life <= 0) continue;
    bomb.age += dt;
    bomb.life -= dt;
    bomb.vy -= 30 * dt;
    bomb.y += bomb.vy * dt;
    bomb.x += bomb.vx * 18 * dt;
    bomb.z += bomb.vz * 18 * dt;
    let best = bomb.t;
    let bestD = 1e9;
    let roadY = 0;
    for (let s = -2; s <= 5; s++) {
      const tt = bomb.t + s * 0.01;
      const fr = frameAt(race.track, tt);
      const d = (fr.p.x - bomb.x) ** 2 + (fr.p.z - bomb.z) ** 2;
      if (d < bestD) {
        bestD = d;
        best = fr.t;
        roadY = fr.p.y;
      }
    }
    bomb.t = best;
    if ((bomb.age > 0.32 && bomb.y <= roadY + 0.45) || bomb.life <= 0) explodeBomb(race, bomb);
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
    if (id === "twig" || id === "log" || id === "mist" || id === "bomb") sawNew = true;
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
    foe.t = (you.t + 0.05) % 1;
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
    if (foe.stun > 1.2) fails.push("twig stun " + foe.stun);
  }
}
