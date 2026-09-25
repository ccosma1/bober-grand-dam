/* Four painted carts. Nose is local +z. The rear marker sits at local -z.
   Each build returns the same motion hooks so player and CPU share one mesh. */

const GEO = {};

function geo(key, build) {
  if (!GEO[key]) GEO[key] = build();
  return GEO[key];
}

function boxGeo(THREE, w, h, d) {
  return geo("b:" + w + "x" + h + "x" + d, () => new THREE.BoxGeometry(w, h, d));
}

function sphereGeo(THREE, r, sw, sh) {
  return geo("s:" + r + ":" + sw + ":" + sh, () => new THREE.SphereGeometry(r, sw, sh));
}

function cylGeo(THREE, rt, rb, h, seg) {
  return geo("c:" + rt + ":" + rb + ":" + h + ":" + seg, () => new THREE.CylinderGeometry(rt, rb, h, seg));
}

function torusGeo(THREE, r, tube, rs, ts) {
  return geo("t:" + r + ":" + tube + ":" + rs + ":" + ts, () => new THREE.TorusGeometry(r, tube, rs, ts));
}

function canvasTex(THREE, w, h, draw) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d"), w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  return tex;
}

function furMat(THREE) {
  return geo("mat:fur", () => {
    const map = canvasTex(THREE, 128, 128, (g) => {
      g.fillStyle = "#6d452c";
      g.fillRect(0, 0, 128, 128);
      for (let i = 0; i < 700; i++) {
        const light = i % 5 === 0;
        g.strokeStyle = light ? "#c49262" : "#3e2918";
        g.globalAlpha = 0.35 + (i % 4) * 0.12;
        g.lineWidth = 1;
        const x = (i * 47) % 128;
        const y = (i * 19) % 128;
        g.beginPath();
        g.moveTo(x, y);
        g.quadraticCurveTo(x + 1, y + 4, x + ((i * 3) % 5) - 2, y + 8);
        g.stroke();
      }
      g.globalAlpha = 1;
    });
    const bump = canvasTex(THREE, 64, 64, (g) => {
      g.fillStyle = "#808080";
      g.fillRect(0, 0, 64, 64);
      for (let i = 0; i < 280; i++) {
        const s = 70 + (i % 8) * 18;
        g.strokeStyle = "rgb(" + s + "," + s + "," + s + ")";
        const x = (i * 17) % 64;
        const y = (i * 9) % 64;
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x + 1, y + 6);
        g.stroke();
      }
    });
    return new THREE.MeshStandardMaterial({ map, bumpMap: bump, bumpScale: 0.28, roughness: 0.9 });
  });
}

function flatMat(THREE, color, rough, metal) {
  const key = "mat:" + color + ":" + rough + ":" + (metal || 0);
  return geo(key, () => new THREE.MeshStandardMaterial({
    color,
    roughness: rough,
    metalness: metal || 0,
  }));
}

function knitMat(THREE, hex) {
  return geo("knit:" + hex, () => {
    const map = canvasTex(THREE, 64, 64, (g) => {
      g.fillStyle = "#" + hex.toString(16).padStart(6, "0");
      g.fillRect(0, 0, 64, 64);
      g.strokeStyle = "rgba(255,255,255,0.28)";
      g.lineWidth = 2;
      for (let y = 3; y < 64; y += 5) {
        g.beginPath();
        g.moveTo(0, y);
        for (let x = 0; x <= 64; x += 4) g.lineTo(x, y + (x % 8 === 0 ? 2 : -1));
        g.stroke();
      }
      g.strokeStyle = "rgba(0,0,0,0.25)";
      for (let y = 5; y < 64; y += 5) {
        g.beginPath();
        g.moveTo(0, y);
        g.lineTo(64, y);
        g.stroke();
      }
    });
    return new THREE.MeshStandardMaterial({ map, roughness: 0.95 });
  });
}

function woodTone(THREE, tint) {
  return geo("wood:" + tint, () => {
    const map = canvasTex(THREE, 128, 64, (g) => {
      g.fillStyle = "#" + tint.toString(16).padStart(6, "0");
      g.fillRect(0, 0, 128, 64);
      g.globalAlpha = 0.35;
      for (let i = 0; i < 18; i++) {
        g.strokeStyle = i % 2 ? "rgba(255,220,170,0.45)" : "rgba(40,16,8,0.55)";
        g.lineWidth = 1 + (i % 3);
        g.beginPath();
        g.moveTo(0, 2 + i * 3.4);
        g.bezierCurveTo(40, 6 + i * 3, 80, i * 2, 128, 4 + i * 3.2);
        g.stroke();
      }
      g.globalAlpha = 1;
    });
    return new THREE.MeshStandardMaterial({ map, roughness: 0.62, metalness: 0.04 });
  });
}

function rustMat(THREE) {
  return geo("mat:rust", () => {
    const map = canvasTex(THREE, 128, 128, (g) => {
      g.fillStyle = "#3a342f";
      g.fillRect(0, 0, 128, 128);
      for (let i = 0; i < 40; i++) {
        g.fillStyle = i % 3 === 0 ? "#8a4a28" : i % 3 === 1 ? "#5c4038" : "#6e5848";
        g.globalAlpha = 0.55 + (i % 4) * 0.1;
        g.beginPath();
        g.ellipse((i * 37) % 128, (i * 53) % 128, 10 + (i % 7) * 3, 8 + (i % 5) * 2, i, 0, 6.28);
        g.fill();
      }
      g.globalAlpha = 0.9;
      g.strokeStyle = "#1c1816";
      g.lineWidth = 3;
      g.strokeRect(6, 6, 116, 116);
      g.fillStyle = "#c8c2b8";
      for (let i = 0; i < 5; i++) {
        for (let j = 0; j < 5; j++) {
          g.beginPath();
          g.arc(16 + i * 24, 16 + j * 24, 2.4, 0, 6.28);
          g.fill();
        }
      }
    });
    return new THREE.MeshStandardMaterial({ map, roughness: 0.72, metalness: 0.48 });
  });
}

function scaleMat(THREE) {
  return geo("mat:scale", () => {
    const map = canvasTex(THREE, 64, 64, (g) => {
      g.fillStyle = "#3a2c24";
      g.fillRect(0, 0, 64, 64);
      g.strokeStyle = "#1a120e";
      g.lineWidth = 1.5;
      for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 8; x++) {
          const ox = (y % 2) * 4;
          g.strokeRect(ox + x * 8, y * 8, 7, 7);
          g.strokeStyle = y % 2 ? "#5a4034" : "#1a120e";
        }
      }
    });
    return new THREE.MeshStandardMaterial({ map, roughness: 0.78 });
  });
}

function put(THREE, geometry, x, y, z, rx, ry, rz, sx, sy, sz) {
  const m = new THREE.Mesh(geometry);
  m.position.set(x, y, z);
  if (rx) m.rotation.x = rx;
  if (ry) m.rotation.y = ry;
  if (rz) m.rotation.z = rz;
  if (sx) m.scale.set(sx, sy || sx, sz || sx);
  m.updateMatrix();
  return m;
}

function mergeParts(THREE, parts, material) {
  let count = 0;
  const baked = [];
  for (const p of parts) {
    const g = p.geometry.index ? p.geometry.toNonIndexed() : p.geometry.clone();
    g.applyMatrix4(p.matrix);
    baked.push(g);
    count += g.attributes.position.count;
  }
  const pos = new Float32Array(count * 3);
  const nrm = new Float32Array(count * 3);
  const uv = new Float32Array(count * 2);
  let o = 0;
  for (const g of baked) {
    const p = g.attributes.position;
    const n = g.attributes.normal;
    const u = g.attributes.uv;
    pos.set(p.array, o * 3);
    if (n) nrm.set(n.array, o * 3);
    if (u) uv.set(u.array, o * 2);
    o += p.count;
    g.dispose();
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geometry.setAttribute("normal", new THREE.BufferAttribute(nrm, 3));
  geometry.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function addMerged(THREE, parent, parts, material) {
  if (!parts.length) return null;
  const mesh = mergeParts(THREE, parts, material);
  parent.add(mesh);
  return mesh;
}

function nailField(THREE, parent, spots, material) {
  const g = boxGeo(THREE, 0.035, 0.035, 0.02);
  addMerged(THREE, parent, spots.map((s) => put(THREE, g, s[0], s[1], s[2])), material);
}

function wheelUnit(THREE, radius, width, style, mats) {
  const spin = new THREE.Group();
  const tube = Math.max(0.045, width * 0.42);
  const tireMat = style === "wood" ? mats.wood : mats.rubber;
  const spokeMat = style === "wood" ? mats.woodDark : mats.spoke;
  const rimMat = style === "wood" ? mats.iron : mats.spoke;
  const tire = new THREE.Mesh(torusGeo(THREE, radius * 0.78, tube, 6, 16), tireMat);
  tire.rotation.y = Math.PI / 2;
  tire.castShadow = true;
  spin.add(tire);
  const rim = new THREE.Mesh(torusGeo(THREE, radius * 0.9, Math.max(0.012, tube * 0.28), 5, 16), rimMat);
  rim.rotation.y = Math.PI / 2;
  spin.add(rim);
  const spokeGeo = boxGeo(THREE, width * 0.18, radius * 0.06, radius * 0.78);
  for (let i = 0; i < 8; i++) {
    const spoke = new THREE.Mesh(spokeGeo, spokeMat);
    spoke.rotation.x = (i / 8) * Math.PI;
    spin.add(spoke);
  }
  const hub = new THREE.Mesh(cylGeo(THREE, radius * 0.2, radius * 0.2, width * 0.72, 8), mats.hub);
  hub.rotation.z = Math.PI / 2;
  spin.add(hub);
  const cap = new THREE.Mesh(cylGeo(THREE, radius * 0.1, radius * 0.1, width * 0.2, 8), mats.hub);
  cap.rotation.z = Math.PI / 2;
  cap.position.x = width * 0.28;
  spin.add(cap);
  if (style === "knob") {
    const knob = boxGeo(THREE, width * 0.7, radius * 0.16, radius * 0.18);
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const n = new THREE.Mesh(knob, mats.rubber);
      n.position.set(0, Math.cos(a) * radius * 0.9, Math.sin(a) * radius * 0.9);
      n.rotation.x = a;
      spin.add(n);
    }
  }
  return spin;
}

function addAxle(THREE, parent, x, y, z, radius, half, width, style, mats, steer) {
  const yawPivot = new THREE.Group();
  yawPivot.position.set(x, y, z);
  const spinPivot = new THREE.Group();
  yawPivot.add(spinPivot);
  const sides = half === 0 ? [0] : [-1, 1];
  for (const side of sides) {
    const unit = wheelUnit(THREE, radius, width, style, mats);
    unit.position.x = side * half;
    spinPivot.add(unit);
  }
  if (sides.length === 2) {
    const bar = new THREE.Mesh(cylGeo(THREE, radius * 0.08, radius * 0.08, half * 2, 6), mats.iron);
    bar.rotation.z = Math.PI / 2;
    spinPivot.add(bar);
  }
  if (steer) {
    const fork = new THREE.Mesh(boxGeo(THREE, Math.max(0.04, radius * 0.22), radius * 0.85, Math.max(0.04, radius * 0.16)), mats.iron);
    fork.position.y = radius * 0.2;
    yawPivot.add(fork);
  }
  parent.add(yawPivot);
  return { yawPivot, spinPivot, radius, steer: !!steer, spin: 0 };
}

function addBeaver(THREE, chassis, spec) {
  const fur = furMat(THREE);
  const driver = new THREE.Group();
  driver.name = "driver";
  const body = new THREE.Mesh(sphereGeo(THREE, 0.5, 12, 10), fur);
  body.scale.set(spec.body.x, spec.body.y, spec.body.z);
  body.position.set(0, spec.bodyY, spec.bodyZ);
  body.castShadow = true;
  driver.add(body);
  const belly = new THREE.Mesh(sphereGeo(THREE, 0.5, 10, 8), flatMat(THREE, 0xe4c4a0, 0.84, 0));
  belly.scale.set(spec.body.x * 0.62, spec.body.y * 0.55, spec.body.z * 0.5);
  belly.position.set(0, spec.bodyY - spec.body.y * 0.12, spec.bodyZ + spec.body.z * 0.28);
  driver.add(belly);

  const head = new THREE.Group();
  head.position.set(0, spec.headY, spec.headZ);
  const skull = new THREE.Mesh(sphereGeo(THREE, 0.5, 12, 10), fur);
  skull.scale.set(spec.head.x, spec.head.y, spec.head.z);
  skull.castShadow = true;
  head.add(skull);
  const snout = new THREE.Mesh(sphereGeo(THREE, 0.5, 10, 8), fur);
  snout.scale.set(spec.head.x * 0.72, spec.head.y * 0.48, spec.head.z * 0.7);
  snout.position.set(0, -spec.head.y * 0.22, spec.head.z * 0.62);
  head.add(snout);
  const nose = new THREE.Mesh(sphereGeo(THREE, 0.5, 8, 6), flatMat(THREE, 0x1a120e, 0.45, 0.05));
  nose.scale.set(spec.head.x * 0.28, spec.head.y * 0.18, 0.08);
  nose.position.set(0, -spec.head.y * 0.12, spec.head.z * 0.98);
  head.add(nose);
  const mouth = new THREE.Mesh(sphereGeo(THREE, 0.5, 8, 6), flatMat(THREE, 0x2a1410, 0.7, 0));
  mouth.scale.set(spec.mouthW, spec.mouthH, 0.06);
  mouth.position.set(0, -spec.head.y * 0.42, spec.head.z * 0.78);
  head.add(mouth);
  const toothMat = flatMat(THREE, spec.toothColor, 0.4, 0.05);
  const tooth = new THREE.Mesh(boxGeo(THREE, spec.toothW, spec.toothH, spec.toothD), toothMat);
  tooth.position.set(0, -spec.head.y * 0.5, spec.head.z * 0.9);
  head.add(tooth);
  const tooth2 = tooth.clone();
  tooth.position.x = -spec.toothW * 0.55;
  tooth2.position.x = spec.toothW * 0.55;
  head.add(tooth2);

  const eyeWhite = flatMat(THREE, 0xf6f1e6, 0.32, 0);
  const pupilMat = flatMat(THREE, 0x140e0c, 0.25, 0.1);
  const shine = flatMat(THREE, 0xffffff, 0.15, 0);
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(sphereGeo(THREE, spec.eyeR, 8, 6), eyeWhite);
    eye.scale.set(1.05, spec.eyeTall ? 1.15 : 0.86, 0.72);
    eye.position.set(side * spec.head.x * 0.42, spec.head.y * 0.08, spec.head.z * 0.42);
    const pupil = new THREE.Mesh(sphereGeo(THREE, spec.eyeR * 0.48, 6, 5), pupilMat);
    pupil.position.set(side * 0.01, 0, spec.eyeR * 0.55);
    eye.add(pupil);
    const glint = new THREE.Mesh(sphereGeo(THREE, spec.eyeR * 0.16, 5, 4), shine);
    glint.position.set(spec.eyeR * 0.22, spec.eyeR * 0.22, spec.eyeR * 0.7);
    eye.add(glint);
    head.add(eye);
    const ear = new THREE.Mesh(sphereGeo(THREE, 0.5, 8, 6), fur);
    ear.scale.set(spec.ear.x, spec.ear.y, spec.ear.z);
    ear.position.set(side * spec.head.x * 0.72, spec.head.y * 0.55, -spec.head.z * 0.05);
    head.add(ear);
  }
  const whisk = boxGeo(THREE, 0.22, 0.012, 0.012);
  const whiskMat = flatMat(THREE, 0xf0e6d4, 0.5, 0);
  const whiskers = [];
  for (const side of [-1, 1]) {
    for (const row of [-1, 0, 1]) {
      whiskers.push(put(
        THREE,
        whisk,
        side * (spec.head.x * 0.55 + 0.08),
        -spec.head.y * 0.18 + row * 0.035,
        spec.head.z * 0.7,
        0,
        0,
        side * row * -0.15
      ));
    }
  }
  head.add(mergeParts(THREE, whiskers, whiskMat));
  driver.add(head);

  const scarfMat = knitMat(THREE, spec.scarf);
  const collar = new THREE.Mesh(torusGeo(THREE, spec.neck, spec.scarfThick, 6, 12), scarfMat);
  collar.position.set(0, spec.neckY, spec.bodyZ + 0.02);
  collar.rotation.x = Math.PI / 2;
  driver.add(collar);
  if (spec.knot) {
    const knot = new THREE.Mesh(boxGeo(THREE, 0.12, 0.1, 0.1), scarfMat);
    knot.position.set(0, spec.neckY - 0.02, spec.bodyZ + spec.body.z * 0.45);
    driver.add(knot);
  }
  const scarfTails = [];
  const fringeN = spec.fringe || 5;
  for (let i = 0; i < fringeN; i++) {
    const pivot = new THREE.Group();
    const spread = (i - (fringeN - 1) / 2) * spec.fringeGap;
    pivot.position.set(spread, spec.neckY - 0.08, spec.bodyZ - Math.max(0.2, spec.body.z * 0.62));
    const len = spec.fringeLen;
    const strip = new THREE.Mesh(boxGeo(THREE, spec.fringeW, 0.02, len), scarfMat);
    strip.position.z = -len * 0.5;
    pivot.add(strip);
    driver.add(pivot);
    scarfTails.push(pivot);
  }

  const arms = [];
  for (const side of [-1, 1]) {
    const arm = new THREE.Group();
    const limb = new THREE.Mesh(cylGeo(THREE, spec.armR, spec.armR * 1.05, spec.armL, 7), fur);
    limb.position.y = -spec.armL * 0.45;
    limb.castShadow = true;
    arm.add(limb);
    const paw = new THREE.Mesh(sphereGeo(THREE, spec.armR * 1.35, 7, 6), fur);
    paw.scale.set(1.3, 0.7, 1.15);
    paw.position.set(side * spec.pawReach, -spec.armL * 0.92, spec.pawZ);
    arm.add(paw);
    if (spec.claws) {
      const claw = new THREE.Mesh(boxGeo(THREE, 0.035, 0.02, 0.07), flatMat(THREE, 0x1a120e, 0.4, 0.2));
      claw.position.set(side * spec.pawReach, -spec.armL * 0.95, spec.pawZ + 0.08);
      arm.add(claw);
    }
    arm.position.set(side * spec.body.x * 0.72, spec.bodyY + spec.body.y * 0.15, spec.bodyZ + 0.05);
    arm.rotation.z = side * spec.armOut;
    arm.rotation.x = spec.armPitch;
    arm.userData.baseZ = arm.rotation.z;
    arm.userData.baseX = arm.rotation.x;
    arm.userData.side = side;
    driver.add(arm);
    arms.push(arm);
  }

  if (spec.harness) {
    const leather = flatMat(THREE, 0x5a3a28, 0.8, 0.08);
    const band = new THREE.Mesh(boxGeo(THREE, spec.body.x * 1.15, 0.06, 0.08), leather);
    band.position.set(0, spec.bodyY + 0.05, spec.bodyZ + spec.body.z * 0.35);
    driver.add(band);
    for (const side of [-1, 1]) {
      const strap = new THREE.Mesh(boxGeo(THREE, 0.05, spec.body.y * 0.7, 0.04), leather);
      strap.position.set(side * spec.body.x * 0.28, spec.bodyY + 0.08, spec.bodyZ + 0.02);
      strap.rotation.z = side * -0.15;
      driver.add(strap);
    }
    const reinMat = flatMat(THREE, 0x6a4630, 0.75, 0);
    for (const side of [-1, 1]) {
      const rein = new THREE.Mesh(boxGeo(THREE, 0.025, 0.025, 0.85), reinMat);
      rein.position.set(side * 0.16, spec.bodyY + 0.02, spec.bodyZ + 0.55);
      rein.rotation.x = 0.35;
      driver.add(rein);
    }
  }

  if (spec.tail) {
    const tail = new THREE.Mesh(boxGeo(THREE, spec.tail.w, 0.06, spec.tail.l), scaleMat(THREE));
    tail.position.set(spec.tail.x, spec.tail.y, spec.tail.z);
    tail.rotation.z = spec.tail.rz || 0;
    tail.rotation.x = spec.tail.rx || -0.4;
    tail.castShadow = true;
    driver.add(tail);
  }

  chassis.add(driver);
  return { driver, head, arms, scarfTails };
}

function pack(THREE, g, chassis, wheels, scale, kind, sig, extra) {
  const rear = new THREE.Object3D();
  rear.name = "rearPost";
  rear.position.set(0, 0.85, -1.05);
  g.add(rear);
  const blob = new THREE.Mesh(
    new THREE.CircleGeometry(1.25, 16),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28, depthWrite: false })
  );
  blob.rotation.x = -Math.PI / 2;
  blob.position.y = 0.02;
  blob.castShadow = false;
  g.add(chassis);
  g.userData.kind = kind;
  g.userData.sig = sig;
  g.scale.setScalar(scale);
  return {
    group: g,
    wheels,
    blob,
    rear,
    chassis,
    driver: extra.driver,
    head: extra.head,
    arms: extra.arms,
    scarfTails: extra.scarfTails,
    flames: extra.flames || [],
    lanterns: extra.lanterns || [],
  };
}

function buildBober(THREE) {
  const g = new THREE.Group();
  const chassis = new THREE.Group();
  const salmon = woodTone(THREE, 0xc47868);
  const grey = woodTone(THREE, 0xc5c1b4);
  const cream = woodTone(THREE, 0xf0e2c4);
  const post = woodTone(THREE, 0xc4a574);
  const nail = flatMat(THREE, 0x2a2420, 0.6, 0.3);
  const iron = flatMat(THREE, 0x8e969c, 0.4, 0.55);
  const mats = {
    rubber: flatMat(THREE, 0x161616, 0.94, 0),
    spoke: flatMat(THREE, 0xd5dde2, 0.32, 0.62),
    hub: flatMat(THREE, 0xc5ced4, 0.35, 0.5),
    iron,
    wood: post,
    woodDark: woodTone(THREE, 0x8a623c),
  };
  const bed = boxGeo(THREE, 1.2, 0.06, 0.28);
  const bedParts = [];
  for (let i = 0; i < 6; i++) {
    const tone = i % 3 === 0 ? salmon : i % 3 === 1 ? grey : cream;
    bedParts.push([put(THREE, bed, 0, 0.58, -0.7 + i * 0.3), tone]);
  }
  for (const tone of [salmon, grey, cream]) {
    addMerged(THREE, chassis, bedParts.filter((row) => row[1] === tone).map((row) => row[0]), tone);
  }

  const slat = boxGeo(THREE, 0.08, 0.1, 1.15);
  const back = boxGeo(THREE, 1.05, 0.1, 0.08);
  const tones = [salmon, grey, cream];
  tones.forEach((mat, layer) => {
    const y = 0.72 + layer * 0.14;
    const parts = [
      put(THREE, slat, -0.62, y, 0.05),
      put(THREE, slat, 0.62, y, 0.05),
      put(THREE, back, 0, y, -0.72),
    ];
    addMerged(THREE, chassis, parts, mat);
  });
  const postGeo = boxGeo(THREE, 0.09, 0.55, 0.09);
  const posts = [
    put(THREE, postGeo, -0.62, 0.9, -0.7),
    put(THREE, postGeo, 0.62, 0.9, -0.7),
    put(THREE, postGeo, -0.62, 0.9, 0.55),
  ];
  addMerged(THREE, chassis, posts, post);
  const tall = new THREE.Mesh(boxGeo(THREE, 0.1, 0.95, 0.1), post);
  tall.position.set(0.62, 1.12, 0.72);
  tall.castShadow = true;
  chassis.add(tall);
  const nails = [];
  for (const x of [-0.62, 0.62]) {
    for (const z of [-0.45, 0, 0.4]) nails.push([x, 0.78, z]);
    for (const z of [-0.45, 0.15]) nails.push([x, 0.92, z]);
  }
  for (const x of [-0.3, 0, 0.3]) nails.push([x, 0.78, -0.72]);
  nailField(THREE, chassis, nails, nail);
  const strut = new THREE.Mesh(boxGeo(THREE, 0.06, 0.06, 0.7), iron);
  strut.position.set(0.22, 0.38, 0.7);
  strut.rotation.x = 0.22;
  strut.rotation.z = -0.12;
  chassis.add(strut);
  const fork = new THREE.Mesh(boxGeo(THREE, 0.05, 0.16, 0.05), iron);
  fork.position.set(0.34, 0.3, 1.02);
  chassis.add(fork);

  const wheels = [
    addAxle(THREE, g, 0, 0.5, -0.4, 0.5, 0.82, 0.16, "rubber", mats, false),
    addAxle(THREE, g, 0.34, 0.2, 1.02, 0.2, 0, 0.08, "rubber", mats, true),
  ];
  const beaver = addBeaver(THREE, chassis, {
    body: { x: 0.92, y: 0.88, z: 0.7 },
    bodyY: 1.08,
    bodyZ: 0.02,
    head: { x: 0.7, y: 0.58, z: 0.56 },
    headY: 1.78,
    headZ: 0.22,
    ear: { x: 0.16, y: 0.16, z: 0.1 },
    eyeR: 0.07,
    mouthW: 0.2,
    mouthH: 0.09,
    toothW: 0.07,
    toothH: 0.16,
    toothD: 0.05,
    toothColor: 0xe36a22,
    scarf: 0x2f9a4a,
    scarfThick: 0.07,
    neck: 0.26,
    neckY: 1.42,
    fringe: 6,
    fringeLen: 0.55,
    fringeW: 0.07,
    fringeGap: 0.06,
    armR: 0.09,
    armL: 0.48,
    armOut: 0.65,
    armPitch: 0.95,
    pawReach: 0.08,
    pawZ: 0.22,
  });
  return pack(THREE, g, chassis, wheels, 1.2, "bober", 81, beaver);
}

function buildMuscle(THREE) {
  const g = new THREE.Group();
  const chassis = new THREE.Group();
  const rust = rustMat(THREE);
  const iron = flatMat(THREE, 0x2e2a28, 0.55, 0.62);
  const chip = flatMat(THREE, 0x6a5348, 0.7, 0.2);
  const mats = {
    rubber: flatMat(THREE, 0x141414, 0.96, 0),
    spoke: flatMat(THREE, 0xb7c0c6, 0.38, 0.58),
    hub: flatMat(THREE, 0x9aa3a8, 0.4, 0.5),
    iron,
    wood: iron,
    woodDark: iron,
  };
  const shell = new THREE.Mesh(boxGeo(THREE, 1.4, 0.62, 1.55), rust);
  shell.position.set(0, 0.95, 0.02);
  shell.castShadow = true;
  shell.receiveShadow = true;
  chassis.add(shell);
  const lip = new THREE.Mesh(boxGeo(THREE, 1.48, 0.08, 1.62), iron);
  lip.position.set(0, 1.26, 0.02);
  chassis.add(lip);
  const postGeo = boxGeo(THREE, 0.08, 0.55, 0.08);
  addMerged(THREE, chassis, [
    put(THREE, postGeo, -0.66, 1.2, -0.7),
    put(THREE, postGeo, 0.66, 1.2, -0.7),
    put(THREE, postGeo, -0.66, 1.2, 0.72),
    put(THREE, postGeo, 0.66, 1.2, 0.72),
  ], iron);
  const patch = boxGeo(THREE, 0.28, 0.22, 0.02);
  addMerged(THREE, chassis, [
    put(THREE, patch, -0.4, 0.9, 0.8),
    put(THREE, patch, 0.35, 1.05, 0.8),
    put(THREE, patch, 0.2, 0.85, -0.76, 0, Math.PI, 0),
  ], chip);
  const pipeGeo = cylGeo(THREE, 0.07, 0.09, 0.42, 8);
  const pipes = [];
  for (const x of [-0.22, 0.22]) {
    const pipe = new THREE.Mesh(pipeGeo, iron);
    pipe.position.set(x, 1.42, -0.62);
    chassis.add(pipe);
    pipes.push(pipe);
  }
  const flames = [];
  pipes.forEach((pipe) => {
    const mat = new THREE.MeshBasicMaterial({ color: 0xff6a1a, transparent: true, opacity: 0.95, depthWrite: false, side: THREE.DoubleSide });
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.48, 7), mat);
    flame.position.set(0, 0.36, 0);
    const side = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.42), mat);
    side.position.y = 0.05;
    flame.add(side);
    const cross = side.clone();
    cross.rotation.y = Math.PI / 2;
    flame.add(cross);
    pipe.add(flame);
    flames.push(flame);
  });
  const strut = new THREE.Mesh(boxGeo(THREE, 0.07, 0.06, 0.62), iron);
  strut.position.set(0.28, 0.4, 0.78);
  strut.rotation.x = 0.28;
  chassis.add(strut);

  const wheels = [
    addAxle(THREE, g, 0, 0.55, -0.38, 0.55, 0.9, 0.22, "knob", mats, false),
    addAxle(THREE, g, 0.36, 0.18, 1.08, 0.18, 0, 0.08, "rubber", mats, true),
  ];
  const beaver = addBeaver(THREE, chassis, {
    body: { x: 1.02, y: 0.82, z: 0.68 },
    bodyY: 1.2,
    bodyZ: 0.04,
    head: { x: 0.68, y: 0.56, z: 0.52 },
    headY: 1.82,
    headZ: 0.24,
    ear: { x: 0.15, y: 0.14, z: 0.09 },
    eyeR: 0.065,
    mouthW: 0.22,
    mouthH: 0.08,
    toothW: 0.065,
    toothH: 0.12,
    toothD: 0.04,
    toothColor: 0xf4f0e6,
    scarf: 0xc24a2c,
    scarfThick: 0.09,
    neck: 0.28,
    neckY: 1.5,
    fringe: 5,
    fringeLen: 0.48,
    fringeW: 0.09,
    fringeGap: 0.08,
    armR: 0.11,
    armL: 0.46,
    armOut: 0.85,
    armPitch: 0.85,
    pawReach: 0.1,
    pawZ: 0.26,
  });
  return pack(THREE, g, chassis, wheels, 1.2, "muscle", 82, { ...beaver, flames });
}

function buildTall(THREE) {
  const g = new THREE.Group();
  const chassis = new THREE.Group();
  const wood = woodTone(THREE, 0xc46a32);
  const brass = flatMat(THREE, 0xd4a017, 0.28, 0.78);
  const rivet = flatMat(THREE, 0xf0d48a, 0.3, 0.7);
  const mats = {
    rubber: flatMat(THREE, 0x222, 0.8, 0),
    spoke: woodTone(THREE, 0xa85a30),
    hub: flatMat(THREE, 0x8a9094, 0.35, 0.6),
    iron: flatMat(THREE, 0x6e757a, 0.4, 0.55),
    wood,
    woodDark: woodTone(THREE, 0x8d4a28),
  };
  const box = new THREE.Mesh(boxGeo(THREE, 1.25, 0.48, 1.45), wood);
  box.position.set(0, 0.78, 0.02);
  box.castShadow = true;
  box.receiveShadow = true;
  chassis.add(box);
  const rimBox = new THREE.Mesh(boxGeo(THREE, 1.32, 0.06, 1.52), woodTone(THREE, 0xa85a28));
  rimBox.position.set(0, 1.04, 0.02);
  chassis.add(rimBox);
  const bracket = boxGeo(THREE, 0.22, 0.2, 0.04);
  const corners = [
    [-0.58, 0.62, 0.7], [0.58, 0.62, 0.7], [-0.58, 0.96, 0.7], [0.58, 0.96, 0.7],
    [-0.58, 0.62, -0.68], [0.58, 0.62, -0.68], [-0.58, 0.96, -0.68], [0.58, 0.96, -0.68],
  ];
  const plates = [];
  const rivets = [];
  for (const [x, y, z] of corners) {
    plates.push(put(THREE, bracket, x, y, z > 0 ? z + 0.04 : z - 0.04));
    plates.push(put(THREE, boxGeo(THREE, 0.03, 0.16, 0.16), x > 0 ? x + 0.04 : x - 0.04, y, z));
    rivets.push([x, y, z > 0 ? z + 0.07 : z - 0.07]);
  }
  addMerged(THREE, chassis, plates, brass);
  nailField(THREE, chassis, rivets, rivet);

  const wheels = [
    addAxle(THREE, g, 0, 0.4, -0.5, 0.4, 0.78, 0.1, "wood", mats, false),
    addAxle(THREE, g, 0, 0.4, 0.62, 0.4, 0.78, 0.1, "wood", mats, true),
  ];
  const beaver = addBeaver(THREE, chassis, {
    body: { x: 0.7, y: 0.95, z: 0.55 },
    bodyY: 1.02,
    bodyZ: 0.02,
    head: { x: 0.78, y: 0.66, z: 0.62 },
    headY: 1.78,
    headZ: 0.28,
    ear: { x: 0.16, y: 0.16, z: 0.1 },
    eyeR: 0.11,
    eyeTall: true,
    mouthW: 0.26,
    mouthH: 0.12,
    toothW: 0.08,
    toothH: 0.22,
    toothD: 0.05,
    toothColor: 0xf7f4ee,
    scarf: 0xf0a024,
    scarfThick: 0.08,
    neck: 0.26,
    neckY: 1.38,
    knot: true,
    fringe: 6,
    fringeLen: 0.58,
    fringeW: 0.08,
    fringeGap: 0.06,
    armR: 0.07,
    armL: 0.55,
    armOut: 0.45,
    armPitch: 1.15,
    pawReach: 0.06,
    pawZ: 0.32,
    claws: true,
    tail: { w: 0.55, l: 0.9, x: 0.78, y: 0.92, z: -0.15, rz: -1.15, rx: 0.55 },
  });
  return pack(THREE, g, chassis, wheels, 1.2, "tall", 83, beaver);
}

function buildNib(THREE) {
  const g = new THREE.Group();
  const chassis = new THREE.Group();
  const wood = woodTone(THREE, 0x6b5340);
  const dark = woodTone(THREE, 0x4a3a2e);
  const iron = flatMat(THREE, 0x3e3a36, 0.5, 0.6);
  const rust = flatMat(THREE, 0x7a3e28, 0.72, 0.25);
  const mats = {
    rubber: iron,
    spoke: woodTone(THREE, 0x7a5a40),
    hub: flatMat(THREE, 0x8d9296, 0.35, 0.62),
    iron,
    wood,
    woodDark: dark,
  };
  const bed = new THREE.Mesh(boxGeo(THREE, 1.35, 0.42, 1.6), wood);
  bed.position.set(0, 0.82, 0);
  bed.castShadow = true;
  bed.receiveShadow = true;
  chassis.add(bed);
  const band = boxGeo(THREE, 1.4, 0.06, 0.08);
  addMerged(THREE, chassis, [
    put(THREE, band, 0, 0.7, 0.35),
    put(THREE, band, 0, 0.95, -0.15),
    put(THREE, boxGeo(THREE, 0.08, 0.06, 1.5), -0.64, 0.78, 0),
    put(THREE, boxGeo(THREE, 0.08, 0.06, 1.5), 0.64, 0.78, 0),
  ], iron);
  const patch = boxGeo(THREE, 0.32, 0.24, 0.03);
  addMerged(THREE, chassis, [
    put(THREE, patch, 0.4, 0.9, 0.81),
    put(THREE, patch, -0.35, 0.75, -0.81, 0, Math.PI, 0),
  ], rust);
  nailField(THREE, chassis, [
    [-0.55, 0.7, 0.35], [0, 0.7, 0.35], [0.55, 0.7, 0.35],
    [-0.55, 0.95, -0.15], [0.55, 0.95, -0.15],
    [0.4, 0.9, 0.84], [-0.2, 0.9, 0.84],
  ], flatMat(THREE, 0xd0d4d8, 0.35, 0.7));

  const logGeo = cylGeo(THREE, 0.06, 0.06, 0.55, 6);
  const logs = [];
  for (let i = 0; i < 4; i++) logs.push(put(THREE, logGeo, -0.28 + (i % 2) * 0.18, 1.14 + Math.floor(i / 2) * 0.12, -0.48, 0, 0, Math.PI / 2));
  addMerged(THREE, chassis, logs, dark);
  const crate = new THREE.Mesh(boxGeo(THREE, 0.32, 0.26, 0.28), woodTone(THREE, 0x5c4636));
  crate.position.set(0.32, 1.16, -0.42);
  crate.rotation.y = 0.2;
  crate.castShadow = true;
  chassis.add(crate);

  const lanterns = [];
  for (const x of [-0.78, 0.78]) {
    const hang = new THREE.Group();
    hang.position.set(x, 0.95, 0.15);
    const hook = new THREE.Mesh(boxGeo(THREE, 0.02, 0.16, 0.02), iron);
    hook.position.y = 0.08;
    const cage = new THREE.Mesh(boxGeo(THREE, 0.2, 0.26, 0.2), iron);
    cage.position.y = -0.16;
    const glowMat = new THREE.MeshStandardMaterial({
      color: 0xffd27a,
      emissive: 0xffc04a,
      emissiveIntensity: 1.35,
      roughness: 0.22,
    });
    const glow = new THREE.Mesh(boxGeo(THREE, 0.12, 0.16, 0.12), glowMat);
    glow.position.y = -0.16;
    hang.add(hook, cage, glow);
    hang.userData.glow = glowMat;
    chassis.add(hang);
    lanterns.push(hang);
  }

  const wheels = [
    addAxle(THREE, g, 0, 0.46, -0.55, 0.46, 0.84, 0.1, "wood", mats, false),
    addAxle(THREE, g, 0, 0.46, 0.62, 0.46, 0.84, 0.1, "wood", mats, true),
  ];
  const beaver = addBeaver(THREE, chassis, {
    body: { x: 0.9, y: 0.82, z: 0.66 },
    bodyY: 1.12,
    bodyZ: 0.16,
    head: { x: 0.64, y: 0.54, z: 0.5 },
    headY: 1.72,
    headZ: 0.32,
    ear: { x: 0.14, y: 0.14, z: 0.09 },
    eyeR: 0.06,
    mouthW: 0.12,
    mouthH: 0.045,
    toothW: 0.045,
    toothH: 0.08,
    toothD: 0.035,
    toothColor: 0xf3ecdf,
    scarf: 0xc4372a,
    scarfThick: 0.06,
    neck: 0.24,
    neckY: 1.42,
    fringe: 6,
    fringeLen: 0.62,
    fringeW: 0.055,
    fringeGap: 0.05,
    armR: 0.08,
    armL: 0.42,
    armOut: 0.4,
    armPitch: 1.2,
    pawReach: 0.04,
    pawZ: 0.24,
    harness: true,
  });
  return pack(THREE, g, chassis, wheels, 1.2, "nib", 84, { ...beaver, lanterns });
}

export function buildKart(THREE, def) {
  const id = def && def.id;
  if (id === "muscle") return buildMuscle(THREE);
  if (id === "tall") return buildTall(THREE);
  if (id === "nib") return buildNib(THREE);
  return buildBober(THREE);
}
