/* Four beaver-and-cart pairs. Nose is local +z. rearPost sits at local -z.
   Heads are lathed muzzles, carts are plank or plate hulls. */

function canvasRepeat(THREE, draw) {
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 128;
  draw(c.getContext("2d"));
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  return tex;
}

function furMaps(THREE, base, strand, light) {
  const map = canvasRepeat(THREE, (g) => {
    g.fillStyle = base;
    g.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 640; i++) {
      g.strokeStyle = i % 4 === 0 ? light : strand;
      g.globalAlpha = 0.28 + (i % 5) * 0.1;
      g.lineWidth = 1 + (i % 2);
      const x = (i * 53) % 128;
      const y = (i * 29) % 128;
      g.beginPath();
      g.moveTo(x, y);
      g.quadraticCurveTo(x + 2, y + 3, x + ((i * 5) % 7) - 3, y + 6 + (i % 5));
      g.stroke();
    }
    g.globalAlpha = 0.22;
    g.fillStyle = light;
    g.beginPath();
    g.ellipse(64, 96, 28, 18, 0, 0, 6.3);
    g.fill();
  });
  const bump = canvasRepeat(THREE, (g) => {
    g.fillStyle = "#808080";
    g.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 500; i++) {
      const shade = 90 + (i % 9) * 14;
      g.strokeStyle = `rgb(${shade},${shade},${shade})`;
      g.lineWidth = 1;
      const x = (i * 41) % 128;
      const y = (i * 17) % 128;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + 1, y + 7);
      g.stroke();
    }
  });
  return { map, bump };
}

function furMat(THREE, base, strand, light) {
  const maps = furMaps(THREE, base, strand, light);
  return new THREE.MeshStandardMaterial({
    map: maps.map,
    bumpMap: maps.bump,
    bumpScale: 0.22,
    roughness: 0.88,
    metalness: 0.02,
  });
}

function mat(THREE, woodMap) {
  return {
    wood: new THREE.MeshPhysicalMaterial({ map: woodMap, roughness: 0.48, metalness: 0.05, clearcoat: 0.35, clearcoatRoughness: 0.3 }),
    woodDark: new THREE.MeshPhysicalMaterial({ map: woodMap, color: 0x6a3c22, roughness: 0.58, clearcoat: 0.16 }),
    iron: new THREE.MeshStandardMaterial({ color: 0x9aa3ad, metalness: 0.78, roughness: 0.28 }),
    ironDark: new THREE.MeshStandardMaterial({ color: 0x3c434c, metalness: 0.7, roughness: 0.38 }),
    brass: new THREE.MeshStandardMaterial({ color: 0xd7a441, metalness: 0.84, roughness: 0.26 }),
    rubber: new THREE.MeshStandardMaterial({ color: 0x1c1c1c, roughness: 0.94 }),
    hub: new THREE.MeshStandardMaterial({ color: 0xd5dde2, metalness: 0.55, roughness: 0.32 }),
    cream: new THREE.MeshStandardMaterial({ color: 0xf4e6c8, roughness: 0.42 }),
    eyeWhite: new THREE.MeshStandardMaterial({ color: 0xf7f1e4, roughness: 0.35 }),
    eye: new THREE.MeshStandardMaterial({ color: 0x140e0a, roughness: 0.3 }),
    nose: new THREE.MeshStandardMaterial({ color: 0x2a211c, roughness: 0.45 }),
  };
}

function lathePart(THREE, pts, segs, material) {
  const geo = new THREE.LatheGeometry(
    pts.map((p) => new THREE.Vector2(p[0], p[1])),
    segs
  );
  const top = pts[pts.length - 1][1];
  geo.translate(0, -top * 0.5, 0);
  const mesh = new THREE.Mesh(geo, material);
  mesh.rotation.x = Math.PI / 2;
  return mesh;
}

const BODY_PTS = [
  [0.1, 0],
  [0.46, 0.08],
  [0.82, 0.24],
  [1, 0.5],
  [0.86, 0.72],
  [0.48, 0.9],
  [0.14, 1],
];

const HEAD_PTS = [
  [0.08, 0],
  [0.42, 0.05],
  [0.7, 0.2],
  [0.78, 0.42],
  [0.55, 0.64],
  [0.24, 0.8],
  [0.08, 0.88],
];

function paddle(THREE, length, width, thick, material) {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.bezierCurveTo(width * 0.35, length * 0.12, width, length * 0.38, width * 0.72, length * 0.82);
  shape.bezierCurveTo(width * 0.35, length * 1.05, -width * 0.35, length * 1.05, -width * 0.72, length * 0.82);
  shape.bezierCurveTo(-width, length * 0.38, -width * 0.35, length * 0.12, 0, 0);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: thick,
    bevelEnabled: true,
    bevelThickness: thick * 0.35,
    bevelSize: width * 0.04,
    bevelSegments: 1,
    curveSegments: 8,
  });
  geo.translate(0, 0, -thick * 0.5);
  const mesh = new THREE.Mesh(geo, material);
  mesh.rotation.x = -Math.PI / 2;
  return mesh;
}

function wheel(THREE, g, x, y, z, radius, width, mats, capMat) {
  const pivot = new THREE.Group();
  pivot.position.set(x, y, z);
  const tire = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, width, 18), mats.rubber);
  tire.rotation.z = Math.PI / 2;
  pivot.add(tire);
  for (let i = 0; i < 6; i++) {
    const tread = new THREE.Mesh(new THREE.BoxGeometry(radius * 0.18, width * 0.92, radius * 0.22), mats.rubber);
    const a = (i / 6) * Math.PI * 2;
    tread.position.set(0, Math.cos(a) * radius * 0.92, Math.sin(a) * radius * 0.92);
    tread.rotation.x = a;
    pivot.add(tread);
  }
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.34, radius * 0.34, width * 1.08, 8), mats.hub);
  hub.rotation.z = Math.PI / 2;
  pivot.add(hub);
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.72, radius * 0.72, width * 0.28, 14), capMat);
  ring.rotation.z = Math.PI / 2;
  pivot.add(ring);
  g.add(pivot);
  return pivot;
}

function addBeaver(THREE, g, spec) {
  const fur = spec.fur;
  const body = lathePart(THREE, BODY_PTS, 16, fur);
  body.scale.set(spec.bodyW, spec.bodyL, spec.bodyH);
  body.position.set(0, spec.bodyY, spec.bodyZ);
  g.add(body);

  const belly = lathePart(THREE, BODY_PTS, 12, spec.belly);
  belly.scale.set(spec.bodyW * 0.55, spec.bodyL * 0.62, spec.bodyH * 0.42);
  belly.position.set(0, spec.bodyY - spec.bodyH * 0.28, spec.bodyZ + 0.02);
  g.add(belly);

  const head = lathePart(THREE, HEAD_PTS, 16, fur);
  head.scale.set(spec.headW, spec.headL, spec.headH);
  head.position.set(0, spec.headY, spec.headZ);
  g.add(head);

  const snout = lathePart(THREE, [
    [0.02, 0],
    [0.28, 0.02],
    [0.4, 0.16],
    [0.34, 0.32],
    [0.12, 0.4],
  ], 12, fur);
  snout.scale.set(spec.headW * 0.95, spec.headL * 0.55, spec.headH * 0.62);
  snout.position.set(0, spec.headY - spec.headH * 0.08, spec.headZ + spec.headL * 0.42);
  g.add(snout);

  const nose = new THREE.Mesh(new THREE.BoxGeometry(spec.headW * 0.28, spec.headH * 0.16, 0.06), spec.nose);
  nose.position.set(0, spec.headY - spec.headH * 0.02, spec.headZ + spec.headL * 0.72);
  g.add(nose);

  for (const side of [-1, 1]) {
    const tooth = new THREE.Mesh(
      new THREE.BoxGeometry(spec.toothW, spec.toothH, spec.toothD),
      spec.cream
    );
    tooth.position.set(
      side * spec.toothW * 0.7,
      spec.headY - spec.headH * 0.34,
      spec.headZ + spec.headL * 0.7
    );
    tooth.rotation.x = -0.15;
    g.add(tooth);
    const eyeW = new THREE.Mesh(new THREE.SphereGeometry(spec.eye * 1.35, 10, 8), spec.eyeWhite);
    eyeW.scale.set(1.15, 0.82, 0.7);
    eyeW.position.set(side * spec.headW * 0.38, spec.headY + spec.headH * 0.08, spec.headZ + spec.headL * 0.28);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(spec.eye * 0.55, 8, 6), spec.eye);
    pupil.position.set(0, 0, spec.eye * 0.7);
    eyeW.add(pupil);
    g.add(eyeW);
  }

  const scarf = new THREE.Mesh(
    new THREE.BoxGeometry(spec.bodyW * 1.15, spec.bodyH * 0.22, spec.bodyL * 0.55),
    spec.scarf
  );
  scarf.position.set(0, spec.bodyY + spec.bodyH * 0.28, spec.bodyZ + spec.bodyL * 0.12);
  g.add(scarf);
  const hang = new THREE.Mesh(new THREE.BoxGeometry(spec.bodyW * 0.28, spec.bodyH * 0.55, 0.06), spec.scarf);
  hang.position.set(spec.bodyW * 0.42, spec.bodyY - spec.bodyH * 0.05, spec.bodyZ + spec.bodyL * 0.22);
  hang.rotation.z = 0.35;
  g.add(hang);

  const tail = paddle(THREE, spec.tailL, spec.tailW, spec.tailT, spec.tailMark);
  tail.position.set(spec.tailX || 0, spec.tailY, spec.bodyZ - spec.bodyL * 0.42);
  tail.rotation.z = spec.tailRoll || 0;
  tail.rotation.y = spec.tailYaw || 0;
  g.add(tail);
  for (const side of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.BoxGeometry(spec.earThick, spec.earH, spec.earW), fur);
    ear.position.set(side * spec.earSpan, spec.headY + spec.headH * 0.35 + spec.earH * 0.45, spec.headZ - spec.headL * 0.1);
    ear.rotation.z = side * (spec.earLean || 0.15);
    g.add(ear);
  }

  if (spec.arms) {
    for (const side of [-1, 1]) {
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(spec.armR, spec.armR * 1.15, spec.armL, 10), fur);
      arm.position.set(side * (spec.bodyW * 0.62), spec.bodyY + 0.02, spec.bodyZ + spec.bodyL * 0.15);
      arm.rotation.z = side * 0.7;
      arm.rotation.x = 0.4;
      g.add(arm);
      const paw = new THREE.Mesh(new THREE.BoxGeometry(spec.armR * 1.8, spec.armR * 0.9, spec.armR * 1.6), fur);
      paw.position.set(side * (spec.bodyW * 0.95), spec.bodyY - spec.armL * 0.35, spec.bodyZ + spec.bodyL * 0.42);
      g.add(paw);
    }
  }
}

function finish(THREE, g, wheels, scale, kind, sig) {
  const rear = new THREE.Object3D();
  rear.name = "rearPost";
  rear.position.set(0, 0.85, -0.95);
  g.add(rear);
  const blob = new THREE.Mesh(
    new THREE.CircleGeometry(1.35, 16),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28, depthWrite: false })
  );
  blob.rotation.x = -Math.PI / 2;
  blob.position.y = 0.03;
  g.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  blob.castShadow = false;
  g.userData.kind = kind;
  g.userData.sig = sig;
  g.scale.setScalar(scale);
  return { group: g, wheels, blob, rear };
}

function buildBober(THREE, woodMap) {
  const g = new THREE.Group();
  const m = mat(THREE, woodMap);
  const bedY = 0.42;
  for (let i = 0; i < 5; i++) {
    const plank = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.08, 0.32), i % 2 ? m.wood : m.woodDark);
    plank.position.set(0, bedY, -0.64 + i * 0.34);
    g.add(plank);
  }
  for (const x of [-0.62, 0.62]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.46, 1.7), m.woodDark);
    rail.position.set(x, 0.66, 0.02);
    g.add(rail);
    const brass = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.05, 1.55), m.brass);
    brass.position.set(x, 0.5, 0.02);
    g.add(brass);
    for (const z of [-0.7, 0, 0.7]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.36, 0.08), m.wood);
      post.position.set(x, 0.62, z);
      g.add(post);
    }
  }
  const nose = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.22, 0.28), m.woodDark);
  nose.position.set(0, 0.5, 1.02);
  g.add(nose);
  const plate = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.16, 0.05), m.brass);
  plate.position.set(0, 0.56, 1.16);
  g.add(plate);
  for (const x of [-0.22, 0.22]) {
    const band = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.03, 1.35), m.brass);
    band.position.set(x, 0.78, 0.15);
    g.add(band);
  }
  const wheels = [
    wheel(THREE, g, -0.78, 0.4, 0.62, 0.4, 0.26, m, m.brass),
    wheel(THREE, g, 0.78, 0.4, 0.62, 0.4, 0.26, m, m.brass),
    wheel(THREE, g, -0.8, 0.46, -0.66, 0.46, 0.3, m, m.brass),
    wheel(THREE, g, 0.8, 0.46, -0.66, 0.46, 0.3, m, m.brass),
  ];
  addBeaver(THREE, g, {
    fur: furMat(THREE, "#8d5a32", "#5c3a22", "#c48a55"),
    belly: m.cream,
    scarf: new THREE.MeshStandardMaterial({ color: 0xe6a322, roughness: 0.48 }),
    cream: m.cream,
    nose: m.nose,
    eye: m.eye,
    eyeWhite: m.eyeWhite,
    tailMark: new THREE.MeshStandardMaterial({ color: 0x4a3424, roughness: 0.7 }),
    bodyW: 0.5, bodyL: 0.58, bodyH: 0.34, bodyY: 0.9, bodyZ: 0.02,
    headW: 0.36, headL: 0.34, headH: 0.22, headY: 1.22, headZ: 0.32,
    toothW: 0.08, toothH: 0.22, toothD: 0.07,
    eye: 0.05,
    earThick: 0.08, earH: 0.28, earW: 0.12, earSpan: 0.22, earLean: 0.2,
    tailL: 0.9, tailW: 0.62, tailT: 0.07, tailY: 1.15,
    arms: true, armR: 0.07, armL: 0.28,
  });
  return finish(THREE, g, wheels, 1.28, "bober", 11);
}

function buildMuscle(THREE, woodMap) {
  const g = new THREE.Group();
  const m = mat(THREE, woodMap);
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.28, 1.65), m.woodDark);
  chassis.position.set(0, 0.42, -0.02);
  g.add(chassis);
  const armor = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.42, 1.15), m.ironDark);
  armor.position.set(0, 0.72, 0.12);
  g.add(armor);
  for (const x of [-0.78, 0.78]) {
    const plate = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.62, 1.25), m.iron);
    plate.position.set(x, 0.9, 0.05);
    g.add(plate);
  }
  const ram = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.32, 0.36), m.iron);
  ram.position.set(0, 0.58, 0.98);
  ram.rotation.x = -0.25;
  g.add(ram);
  const bolt = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.2), m.brass);
  bolt.position.set(0, 0.62, 1.16);
  g.add(bolt);
  for (const x of [-0.34, 0.34]) {
    const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.15, 0.7, 8), m.ironDark);
    stack.position.set(x, 1.32, -0.72);
    g.add(stack);
    const glow = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.12, 8), m.brass);
    glow.position.set(x, 1.68, -0.72);
    g.add(glow);
  }
  const wheels = [
    wheel(THREE, g, -0.96, 0.36, 0.58, 0.36, 0.26, m, m.iron),
    wheel(THREE, g, 0.96, 0.36, 0.58, 0.36, 0.26, m, m.iron),
    wheel(THREE, g, -1.02, 0.56, -0.62, 0.58, 0.36, m, m.iron),
    wheel(THREE, g, 1.02, 0.56, -0.62, 0.58, 0.36, m, m.iron),
  ];
  addBeaver(THREE, g, {
    fur: furMat(THREE, "#6b4228", "#3d2818", "#a56b42"),
    belly: new THREE.MeshStandardMaterial({ color: 0xd7b48a, roughness: 0.6 }),
    scarf: new THREE.MeshStandardMaterial({ color: 0xb6402a, roughness: 0.5 }),
    cream: m.cream,
    nose: m.nose,
    eye: m.eye,
    eyeWhite: m.eyeWhite,
    tailMark: new THREE.MeshStandardMaterial({ color: 0x3a2a22, roughness: 0.75 }),
    bodyW: 0.72, bodyL: 0.5, bodyH: 0.46, bodyY: 1.12, bodyZ: 0.02,
    headW: 0.28, headL: 0.26, headH: 0.18, headY: 1.52, headZ: 0.26,
    toothW: 0.05, toothH: 0.12, toothD: 0.05,
    eye: 0.04,
    earThick: 0.07, earH: 0.16, earW: 0.1, earSpan: 0.2, earLean: 0.5,
    tailL: 0.28, tailW: 0.22, tailT: 0.07, tailY: 1.05,
    arms: true, armR: 0.13, armL: 0.46,
  });
  return finish(THREE, g, wheels, 1.22, "muscle", 27);
}

function buildTall(THREE, woodMap) {
  const g = new THREE.Group();
  const m = mat(THREE, woodMap);
  const sections = [
    [0.78, 0.16, 0.7, 0, 0.34, -0.15],
    [0.62, 0.14, 0.55, 0, 0.32, 0.45],
    [0.42, 0.12, 0.42, 0, 0.28, 0.95],
  ];
  for (const [w, h, d, x, y, z] of sections) {
    const hull = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m.wood);
    hull.position.set(x, y, z);
    g.add(hull);
  }
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.03, 1.7), m.brass);
  stripe.position.set(0, 0.44, 0.15);
  g.add(stripe);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.72, 0.5), m.woodDark);
  fin.position.set(0, 0.78, -0.62);
  g.add(fin);
  const wheels = [
    wheel(THREE, g, -0.5, 0.28, 0.74, 0.28, 0.18, m, m.brass),
    wheel(THREE, g, 0.5, 0.28, 0.74, 0.28, 0.18, m, m.brass),
    wheel(THREE, g, -0.5, 0.3, -0.58, 0.3, 0.18, m, m.brass),
    wheel(THREE, g, 0.5, 0.3, -0.58, 0.3, 0.18, m, m.brass),
  ];
  addBeaver(THREE, g, {
    fur: furMat(THREE, "#a56b42", "#6d452c", "#e0b088"),
    belly: m.cream,
    scarf: new THREE.MeshStandardMaterial({ color: 0x7eb6d6, roughness: 0.4 }),
    cream: m.cream,
    nose: m.nose,
    eye: m.eye,
    eyeWhite: m.eyeWhite,
    tailMark: new THREE.MeshStandardMaterial({ color: 0x5c4030, roughness: 0.6 }),
    bodyW: 0.24, bodyL: 0.7, bodyH: 0.55, bodyY: 0.95, bodyZ: 0.02,
    headW: 0.22, headL: 0.26, headH: 0.2, headY: 1.48, headZ: 0.28,
    toothW: 0.045, toothH: 0.16, toothD: 0.05,
    eye: 0.035,
    earThick: 0.05, earH: 0.62, earW: 0.1, earSpan: 0.12, earLean: 0.08,
    tailL: 0.48, tailW: 0.14, tailT: 0.035, tailY: 0.95,
    arms: true, armR: 0.04, armL: 0.4,
  });
  return finish(THREE, g, wheels, 1.32, "tall", 43);
}

function buildNib(THREE, woodMap) {
  const g = new THREE.Group();
  const m = mat(THREE, woodMap);
  const planks = [
    [0.55, 0.08, 0.9, 0.02, 0.32, 0.05, 0.05],
    [0.42, 0.07, 0.7, -0.16, 0.4, -0.2, -0.4],
    [0.36, 0.09, 0.62, 0.18, 0.36, 0.22, 0.35],
  ];
  for (const [w, h, d, x, y, z, rot] of planks) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m.wood);
    p.position.set(x, y, z);
    p.rotation.y = rot;
    g.add(p);
  }
  const crate = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.3, 0.3), m.woodDark);
  crate.position.set(-0.22, 0.55, -0.32);
  crate.rotation.y = 0.5;
  g.add(crate);
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.28, 8), m.wood);
  barrel.position.set(0.24, 0.5, -0.15);
  barrel.rotation.z = 0.4;
  g.add(barrel);
  const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.42, 6), m.brass);
  rope.position.set(0.05, 0.48, 0.32);
  rope.rotation.z = 0.8;
  g.add(rope);
  const wheels = [
    wheel(THREE, g, -0.38, 0.24, 0.4, 0.24, 0.16, m, m.brass),
    wheel(THREE, g, 0.4, 0.26, 0.24, 0.22, 0.16, m, m.iron),
    wheel(THREE, g, 0.02, 0.4, -0.52, 0.42, 0.22, m, m.ironDark),
  ];
  addBeaver(THREE, g, {
    fur: furMat(THREE, "#9a6238", "#6a4024", "#e2b07a"),
    belly: m.cream,
    scarf: new THREE.MeshStandardMaterial({ color: 0x3e7a45, roughness: 0.52 }),
    cream: m.cream,
    nose: m.nose,
    eye: m.eye,
    eyeWhite: m.eyeWhite,
    tailMark: new THREE.MeshStandardMaterial({ color: 0x6a4a30, roughness: 0.8 }),
    bodyW: 0.28, bodyL: 0.34, bodyH: 0.24, bodyY: 0.66, bodyZ: 0.02,
    headW: 0.4, headL: 0.36, headH: 0.26, headY: 1.02, headZ: 0.18,
    toothW: 0.1, toothH: 0.28, toothD: 0.08,
    eye: 0.055,
    earThick: 0.07, earH: 0.22, earW: 0.14, earSpan: 0.24, earLean: 0.55,
    tailL: 0.34, tailW: 0.18, tailT: 0.04, tailY: 0.72, tailX: 0.12, tailRoll: 0.5, tailYaw: 0.4,
    arms: true, armR: 0.05, armL: 0.2,
  });
  return finish(THREE, g, wheels, 1.18, "nib", 58);
}

export function buildKart(THREE, def, woodMap) {
  const id = def && def.id;
  if (id === "muscle") return buildMuscle(THREE, woodMap);
  if (id === "tall") return buildTall(THREE, woodMap);
  if (id === "nib") return buildNib(THREE, woodMap);
  return buildBober(THREE, woodMap);
}
