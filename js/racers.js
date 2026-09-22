/* Four beaver-and-cart pairs. Nose is +z. rearPost sits at local -z. */

function mat(THREE, woodMap) {
  return {
    wood: new THREE.MeshPhysicalMaterial({ map: woodMap, roughness: 0.46, metalness: 0.06, clearcoat: 0.42, clearcoatRoughness: 0.28 }),
    woodDark: new THREE.MeshPhysicalMaterial({ map: woodMap, color: 0x6b3d22, roughness: 0.55, clearcoat: 0.2 }),
    iron: new THREE.MeshStandardMaterial({ color: 0x8a9098, metalness: 0.72, roughness: 0.32 }),
    ironDark: new THREE.MeshStandardMaterial({ color: 0x3a4048, metalness: 0.64, roughness: 0.4 }),
    brass: new THREE.MeshStandardMaterial({ color: 0xd7a441, metalness: 0.82, roughness: 0.28 }),
    rubber: new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.92 }),
    hub: new THREE.MeshStandardMaterial({ color: 0xc5ccd0, metalness: 0.5, roughness: 0.35 }),
    cream: new THREE.MeshStandardMaterial({ color: 0xf3e2c4, roughness: 0.4 }),
    eye: new THREE.MeshStandardMaterial({ color: 0x140e0a, roughness: 0.35 }),
  };
}

function finish(THREE, g, wheels, scale, kind, sig) {
  const rear = new THREE.Object3D();
  rear.name = "rearPost";
  rear.position.set(0, 1.0, -0.7);
  g.add(rear);
  const blob = new THREE.Mesh(
    new THREE.CircleGeometry(1.2, 14),
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

function wheel(THREE, g, x, y, z, radius, mats, brass) {
  const pivot = new THREE.Group();
  pivot.position.set(x, y, z);
  const tire = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, radius * 0.72, 14), mats.rubber);
  tire.rotation.z = Math.PI / 2;
  pivot.add(tire);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.38, radius * 0.38, radius * 0.9, 8), mats.hub);
  cap.rotation.z = Math.PI / 2;
  pivot.add(cap);
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.92, radius * 0.92, radius * 0.2, 12), brass);
  ring.rotation.z = Math.PI / 2;
  pivot.add(ring);
  g.add(pivot);
  return pivot;
}

function beaver(THREE, g, fur, scarfMat, spec) {
  const body = new THREE.Mesh(new THREE.BoxGeometry(spec.bw, spec.bh, spec.bd), fur);
  body.position.set(0, spec.by, spec.bz);
  g.add(body);
  const head = new THREE.Mesh(new THREE.BoxGeometry(spec.hw, spec.hh, spec.hd), fur);
  head.position.set(0, spec.hy, spec.hz);
  g.add(head);
  const earG = new THREE.BoxGeometry(spec.ew, spec.eh, 0.08);
  const earL = new THREE.Mesh(earG, fur);
  earL.position.set(-spec.hw * 0.38, spec.hy + spec.hh * 0.55, spec.hz - 0.02);
  const earR = earL.clone();
  earR.position.x = spec.hw * 0.38;
  g.add(earL, earR);
  const eye = new THREE.MeshStandardMaterial({ color: 0x140e0a, roughness: 0.3 });
  for (const x of [-0.28, 0.28]) {
    const e = new THREE.Mesh(new THREE.SphereGeometry(spec.eye, 8, 8), eye);
    e.position.set(x * spec.hw, spec.hy + spec.hh * 0.08, spec.hz + spec.hd * 0.52);
    g.add(e);
  }
  const tooth = new THREE.Mesh(new THREE.BoxGeometry(spec.hw * 0.16, spec.hh * 0.28, 0.05), new THREE.MeshStandardMaterial({ color: 0xf3e2c4 }));
  tooth.position.set(-spec.hw * 0.1, spec.hy - spec.hh * 0.42, spec.hz + spec.hd * 0.5);
  const tooth2 = tooth.clone();
  tooth2.position.x = spec.hw * 0.1;
  g.add(tooth, tooth2);
  const nose = new THREE.Mesh(new THREE.BoxGeometry(spec.hw * 0.22, spec.hh * 0.16, 0.06), eye);
  nose.position.set(0, spec.hy - spec.hh * 0.05, spec.hz + spec.hd * 0.55);
  g.add(nose);
  const scarf = new THREE.Mesh(new THREE.BoxGeometry(spec.bw * 0.92, 0.12, spec.bd * 0.7), scarfMat);
  scarf.position.set(0, spec.by + spec.bh * 0.42, spec.bz + 0.04);
  g.add(scarf);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(spec.bw * 0.55, 0.08, 0.42), fur);
  tail.position.set(0, spec.by - spec.bh * 0.15, spec.bz - spec.bd * 0.7);
  tail.rotation.x = -0.4;
  g.add(tail);
}

function buildBober(THREE, woodMap) {
  const g = new THREE.Group();
  const m = mat(THREE, woodMap);
  const fur = new THREE.MeshStandardMaterial({ color: 0x8d5a32, roughness: 0.78 });
  const scarf = new THREE.MeshStandardMaterial({ color: 0xe6a322, roughness: 0.5 });
  const bed = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.22, 1.85), m.wood);
  bed.position.set(0, 0.36, 0.02);
  g.add(bed);
  for (const x of [-0.66, 0.66]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.38, 1.7), m.woodDark);
    rail.position.set(x, 0.58, 0);
    g.add(rail);
    const brass = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 1.55), m.brass);
    brass.position.set(x, 0.42, 0);
    g.add(brass);
  }
  const nose = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.28, 0.36), m.woodDark);
  nose.position.set(0, 0.5, 1.02);
  g.add(nose);
  const plate = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.16, 0.06), m.brass);
  plate.position.set(0, 0.52, 1.2);
  g.add(plate);
  const wheels = [
    wheel(THREE, g, -0.72, 0.3, 0.62, 0.28, m, m.brass),
    wheel(THREE, g, 0.72, 0.3, 0.62, 0.28, m, m.brass),
    wheel(THREE, g, -0.74, 0.3, -0.58, 0.3, m, m.brass),
    wheel(THREE, g, 0.74, 0.3, -0.58, 0.3, m, m.brass),
  ];
  beaver(THREE, g, fur, scarf, {
    bw: 0.72, bh: 0.42, bd: 0.58, by: 0.78, bz: 0.05,
    hw: 0.56, hh: 0.46, hd: 0.42, hy: 1.22, hz: 0.16,
    ew: 0.12, eh: 0.16, eye: 0.045,
  });
  return finish(THREE, g, wheels, 1.12, "bober", 11);
}

function buildMuscle(THREE, woodMap) {
  const g = new THREE.Group();
  const m = mat(THREE, woodMap);
  const fur = new THREE.MeshStandardMaterial({ color: 0x6b4228, roughness: 0.8 });
  const scarf = new THREE.MeshStandardMaterial({ color: 0xb6402a, roughness: 0.48 });
  const bed = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.34, 1.7), m.woodDark);
  bed.position.set(0, 0.4, -0.05);
  g.add(bed);
  const armor = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.55, 1.15), m.ironDark);
  armor.position.set(0, 0.72, 0.15);
  g.add(armor);
  for (const x of [-0.72, 0.72]) {
    const plate = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.7, 1.3), m.iron);
    plate.position.set(x, 0.85, 0.05);
    g.add(plate);
  }
  const ram = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.36, 0.28), m.iron);
  ram.position.set(0, 0.55, 1.0);
  g.add(ram);
  const wheels = [
    wheel(THREE, g, -0.86, 0.28, 0.55, 0.24, m, m.iron),
    wheel(THREE, g, 0.86, 0.28, 0.55, 0.24, m, m.iron),
    wheel(THREE, g, -0.9, 0.4, -0.55, 0.4, m, m.iron),
    wheel(THREE, g, 0.9, 0.4, -0.55, 0.4, m, m.iron),
  ];
  beaver(THREE, g, fur, scarf, {
    bw: 1.05, bh: 0.62, bd: 0.7, by: 1.15, bz: 0.02,
    hw: 0.42, hh: 0.36, hd: 0.36, hy: 1.62, hz: 0.18,
    ew: 0.1, eh: 0.12, eye: 0.035,
  });
  for (const x of [-0.62, 0.62]) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.48, 0.22), fur);
    arm.position.set(x, 1.05, 0.2);
    g.add(arm);
  }
  return finish(THREE, g, wheels, 1.08, "muscle", 27);
}

function buildTall(THREE, woodMap) {
  const g = new THREE.Group();
  const m = mat(THREE, woodMap);
  const fur = new THREE.MeshStandardMaterial({ color: 0xa56b42, roughness: 0.7 });
  const scarf = new THREE.MeshStandardMaterial({ color: 0x7eb6d6, roughness: 0.42 });
  const hull = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.16, 2.35), m.wood);
  hull.position.set(0, 0.32, 0.05);
  g.add(hull);
  const nose = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.14, 0.55), m.woodDark);
  nose.position.set(0, 0.28, 1.25);
  g.add(nose);
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.04, 2.1), m.brass);
  stripe.position.set(0, 0.42, 0.05);
  g.add(stripe);
  const wheels = [
    wheel(THREE, g, -0.48, 0.22, 0.95, 0.2, m, m.brass),
    wheel(THREE, g, 0.48, 0.22, 0.95, 0.2, m, m.brass),
    wheel(THREE, g, -0.48, 0.22, -0.85, 0.2, m, m.brass),
    wheel(THREE, g, 0.48, 0.22, -0.85, 0.2, m, m.brass),
  ];
  beaver(THREE, g, fur, scarf, {
    bw: 0.4, bh: 0.78, bd: 0.36, by: 0.86, bz: 0.05,
    hw: 0.36, hh: 0.48, hd: 0.32, hy: 1.48, hz: 0.12,
    ew: 0.08, eh: 0.28, eye: 0.032,
  });
  return finish(THREE, g, wheels, 1.14, "tall", 43);
}

function buildNib(THREE, woodMap) {
  const g = new THREE.Group();
  const m = mat(THREE, woodMap);
  const fur = new THREE.MeshStandardMaterial({ color: 0x9a6238, roughness: 0.82 });
  const scarf = new THREE.MeshStandardMaterial({ color: 0x3e7a45, roughness: 0.5 });
  const planks = [
    [0, 0.34, 0.05, 0.08],
    [-0.16, 0.4, -0.15, -0.12],
    [0.14, 0.3, 0.2, 0.18],
  ];
  for (const [x, y, z, rot] of planks) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.1, 0.85), m.wood);
    p.position.set(x, y, z);
    p.rotation.y = rot;
    g.add(p);
  }
  const crate = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.28, 0.32), m.woodDark);
  crate.position.set(-0.18, 0.52, -0.35);
  crate.rotation.y = 0.4;
  g.add(crate);
  const wheels = [
    wheel(THREE, g, -0.32, 0.18, 0.4, 0.16, m, m.brass),
    wheel(THREE, g, 0.34, 0.18, 0.28, 0.14, m, m.iron),
    wheel(THREE, g, 0.02, 0.28, -0.48, 0.32, m, m.ironDark),
  ];
  beaver(THREE, g, fur, scarf, {
    bw: 0.36, bh: 0.28, bd: 0.32, by: 0.62, bz: 0.02,
    hw: 0.48, hh: 0.4, hd: 0.36, hy: 0.98, hz: 0.12,
    ew: 0.1, eh: 0.14, eye: 0.04,
  });
  return finish(THREE, g, wheels, 0.92, "nib", 58);
}

export function buildKart(THREE, def, woodMap) {
  const id = def && def.id;
  if (id === "muscle") return buildMuscle(THREE, woodMap);
  if (id === "tall") return buildTall(THREE, woodMap);
  if (id === "nib") return buildNib(THREE, woodMap);
  return buildBober(THREE, woodMap);
}
