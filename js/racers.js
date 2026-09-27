/* Painted carts. Nose is local +z, rear marker is local -z.
   Static parts merge by material. Nails and rivets are instanced.
   Player crew keeps whiskers, highlights, and an outline. CPU crew drops those. */

import { mergeGeometries, mergeVertices } from "../vendor/BufferGeometryUtils.js?v=gd47";

const GEO = new Map();
const BUILD = { lod: false, curve: 2 };
const MADE = [];
const SIG = { bober: 91, muscle: 92, tall: 93, nib: 94 };

const WOOD = [0, 0.16, 1, 1];
const LEATHER_W = [0, 0.01, 0.5, 0.14];
const IRON = [0.02, 0.52, 0.48, 0.98];
const BRASS = [0.52, 0.52, 0.98, 0.98];
const RUST = [0.02, 0.02, 0.48, 0.48];
const GLASS = [0.52, 0.02, 0.98, 0.48];
const FUR = [0.02, 0.4, 0.98, 0.98];
const SCALES = [0.02, 0.02, 0.32, 0.18];
const LEATHER = [0.34, 0.02, 0.64, 0.18];
const EYE = [0.68, 0.02, 0.98, 0.18];
const TEETH = [0.02, 0.22, 0.34, 0.37];
const NOSE = [0.36, 0.22, 0.64, 0.37];
const TONGUE = [0.68, 0.22, 0.98, 0.37];
const RUBBER = [0.02, 0.05, 0.48, 0.95];
const WIRON = [0.52, 0.52, 0.98, 0.98];
const WWOOD = [0.52, 0.02, 0.98, 0.48];

let MATS = null;

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function canvasOf(size, draw) {
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  draw(c.getContext("2d"), size);
  return c;
}

function texOf(THREE, canvas, color) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.flipY = false;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

function grain(g, s, ink, lite, knots) {
  const img = g.getImageData(0, 0, s, s);
  const d = img.data;
  const rand = rng(knots);
  for (let y = 0; y < s; y++) {
    for (let x = 0; x < s; x++) {
      const i = (y * s + x) * 4;
      const n = rand();
      const wave = Math.sin(y * 0.09 + Math.sin(x * 0.02) * 2.2) * 0.5 + 0.5;
      const v = lite - wave * 28 - (n > 0.92 ? 50 : n * 18);
      d[i] = d[i + 1] = d[i + 2] = Math.max(40, Math.min(245, v));
      d[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  g.strokeStyle = ink;
  g.globalAlpha = 0.45;
  for (let i = 0; i < 36; i++) {
    g.lineWidth = 1 + (i % 3);
    g.beginPath();
    g.moveTo(0, (i * 17) % s);
    g.bezierCurveTo(s * 0.3, (i * 17 + 12) % s, s * 0.6, (i * 13) % s, s, (i * 19 + 4) % s);
    g.stroke();
  }
  g.globalAlpha = 0.9;
  for (let i = 0; i < 14; i++) {
    const x = (i * 97) % s;
    const y = (i * 53) % s;
    const rad = 8 + (i % 5) * 4;
    g.fillStyle = i % 2 ? "rgba(70,42,24,0.55)" : "rgba(40,24,16,0.4)";
    g.beginPath();
    g.ellipse(x, y, rad, rad * 0.72, i, 0, 6.28);
    g.fill();
    g.strokeStyle = "rgba(30,16,8,0.8)";
    g.lineWidth = 2;
    g.stroke();
  }
  g.globalAlpha = 1;
}

function paintWood(g, s) {
  g.fillStyle = "#e7e0d4";
  g.fillRect(0, 0, s, s);
  grain(g, s, "rgba(90,60,36,0.55)", 214, 11);
  g.fillStyle = "#6a4128";
  g.fillRect(0, 0, s, Math.floor(s * 0.14));
  g.strokeStyle = "rgba(40,22,12,0.45)";
  for (let y = 6; y < s * 0.14; y += 5) {
    g.beginPath();
    g.moveTo(0, y);
    g.lineTo(s * 0.5, y + 1);
    g.stroke();
  }
  g.fillStyle = "rgba(245,236,220,0.55)";
  const rand = rng(4);
  for (let i = 0; i < 30; i++) {
    g.fillRect(rand() * s, s * 0.16 + rand() * s * 0.8, 10 + rand() * 22, 6 + rand() * 8);
  }
}

function paintMetal(g, s) {
  const iron = g.createLinearGradient(0, 0, s, 0);
  iron.addColorStop(0, "#8d9094");
  iron.addColorStop(0.5, "#c5c8cc");
  iron.addColorStop(1, "#7e8286");
  g.fillStyle = iron;
  g.fillRect(0, s * 0.5, s * 0.5, s * 0.5);
  g.globalAlpha = 0.35;
  g.strokeStyle = "#4c5054";
  for (let y = s * 0.5; y < s; y += 3) {
    g.beginPath();
    g.moveTo(0, y);
    g.lineTo(s * 0.5, y + 0.5);
    g.stroke();
  }
  g.globalAlpha = 1;
  const brass = g.createLinearGradient(0, 0, 0, s);
  brass.addColorStop(0, "#f0d78a");
  brass.addColorStop(0.45, "#c9a544");
  brass.addColorStop(1, "#8a6a28");
  g.fillStyle = brass;
  g.fillRect(s * 0.5, s * 0.5, s * 0.5, s * 0.5);
  g.strokeStyle = "rgba(90,60,20,0.35)";
  for (let i = 0; i < 18; i++) {
    g.beginPath();
    g.moveTo(s * 0.5, s * 0.5 + i * 14);
    g.lineTo(s, s * 0.55 + i * 13);
    g.stroke();
  }
  g.fillStyle = "#5a5654";
  g.fillRect(0, 0, s * 0.5, s * 0.5);
  const rand = rng(19);
  for (let i = 0; i < 80; i++) {
    g.fillStyle = i % 3 === 0 ? "#8c4a26" : i % 3 === 1 ? "#6a3a20" : "#3a3430";
    g.globalAlpha = 0.55 + rand() * 0.4;
    g.beginPath();
    g.ellipse(rand() * s * 0.5, rand() * s * 0.5, 8 + rand() * 28, 6 + rand() * 18, rand() * 3, 0, 6.28);
    g.fill();
  }
  g.globalAlpha = 1;
  const glow = g.createRadialGradient(s * 0.75, s * 0.25, 8, s * 0.75, s * 0.25, s * 0.22);
  glow.addColorStop(0, "#fff1c4");
  glow.addColorStop(0.45, "#e8a33c");
  glow.addColorStop(1, "#a85a14");
  g.fillStyle = glow;
  g.fillRect(s * 0.5, 0, s * 0.5, s * 0.5);
}

function paintMetalMaps(gRough, gMetal, s) {
  const rough = gRough.createImageData(s, s);
  const metal = gMetal.createImageData(s, s);
  for (let y = 0; y < s; y++) {
    for (let x = 0; x < s; x++) {
      const i = (y * s + x) * 4;
      const brass = x >= s * 0.5 && y >= s * 0.5;
      const rust = x < s * 0.5 && y < s * 0.5;
      const glass = x >= s * 0.5 && y < s * 0.5;
      let r = 180;
      let m = 150;
      if (brass) {
        r = 70;
        m = 214;
      } else if (rust) {
        r = 220;
        m = 60;
      } else if (glass) {
        r = 30;
        m = 20;
      }
      rough.data[i] = rough.data[i + 1] = rough.data[i + 2] = r;
      rough.data[i + 3] = 255;
      metal.data[i] = metal.data[i + 1] = metal.data[i + 2] = m;
      metal.data[i + 3] = 255;
    }
  }
  gRough.putImageData(rough, 0, 0);
  gMetal.putImageData(metal, 0, 0);
}

function paintEmit(g, s) {
  g.fillStyle = "#000";
  g.fillRect(0, 0, s, s);
  const glow = g.createRadialGradient(s * 0.75, s * 0.25, 6, s * 0.75, s * 0.25, s * 0.2);
  glow.addColorStop(0, "#fff6d8");
  glow.addColorStop(0.5, "#e8a33c");
  glow.addColorStop(1, "#000");
  g.fillStyle = glow;
  g.fillRect(s * 0.5, 0, s * 0.5, s * 0.5);
}

function paintBeaver(g, s) {
  g.fillStyle = "#d7d0c8";
  g.fillRect(0, 0, s, s);
  const rand = rng(7);
  g.globalAlpha = 0.9;
  for (let i = 0; i < 2800; i++) {
    const x = rand() * s;
    const y = s * 0.4 + rand() * s * 0.6;
    const tip = rand();
    g.strokeStyle = tip > 0.82 ? "#c4a07a" : tip > 0.5 ? "#8d7b6c" : "#5c5148";
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + (rand() - 0.5) * 3, y + 2 + rand() * 4);
    g.stroke();
  }
  g.globalAlpha = 1;
  g.fillStyle = "#3a3a3e";
  g.fillRect(0, 0, s * 0.33, s * 0.19);
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 6; col++) {
      g.fillStyle = (row + col) % 2 ? "#55565c" : "#3a3a3e";
      const ox = (row % 2) * 10;
      g.beginPath();
      g.ellipse(16 + col * 26 + ox, 12 + row * 22, 14, 10, 0, 0, 6.28);
      g.fill();
      g.strokeStyle = "#222326";
      g.stroke();
    }
  }
  g.fillStyle = "#6a4128";
  g.fillRect(s * 0.34, 0, s * 0.3, s * 0.19);
  g.strokeStyle = "rgba(30,16,8,0.4)";
  for (let y = 4; y < s * 0.19; y += 4) {
    g.beginPath();
    g.moveTo(s * 0.34, y);
    g.lineTo(s * 0.64, y + 1);
    g.stroke();
  }
  g.fillStyle = "#f4f1ea";
  g.fillRect(s * 0.67, 0, s * 0.33, s * 0.19);
  g.fillStyle = "#fff";
  g.beginPath();
  g.arc(s * 0.86, s * 0.06, s * 0.03, 0, 6.28);
  g.fill();
  g.fillStyle = "#f4efe6";
  g.fillRect(0, s * 0.21, s * 0.34, s * 0.16);
  g.fillStyle = "#2a2320";
  g.fillRect(s * 0.36, s * 0.21, s * 0.28, s * 0.16);
  g.fillStyle = "#1a1412";
  g.beginPath();
  g.ellipse(s * 0.44, s * 0.28, 8, 5, 0, 0, 6.28);
  g.ellipse(s * 0.54, s * 0.28, 8, 5, 0, 0, 6.28);
  g.fill();
  g.fillStyle = "#c9606a";
  g.fillRect(s * 0.68, s * 0.21, s * 0.32, s * 0.16);
}

function paintBeaverRough(g, s) {
  const img = g.createImageData(s, s);
  for (let y = 0; y < s; y++) {
    for (let x = 0; x < s; x++) {
      const i = (y * s + x) * 4;
      let rough = 230;
      if (y < s * 0.19 && x < s * 0.33) rough = 140;
      else if (y < s * 0.19 && x < s * 0.66) rough = 170;
      else if (y < s * 0.19) rough = 28;
      else if (y < s * 0.38 && x < s * 0.34) rough = 90;
      else if (y < s * 0.38 && x < s * 0.66) rough = 120;
      else if (y < s * 0.38) rough = 150;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = rough;
      img.data[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
}

function paintKnit(g, s) {
  g.fillStyle = "#e6e6e6";
  g.fillRect(0, 0, s, s);
  for (let y = 0; y < s; y += 8) {
    g.strokeStyle = y % 16 === 0 ? "#ffffff" : "#9a9a9a";
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(0, y);
    for (let x = 0; x <= s; x += 8) g.lineTo(x, y + (x % 16 === 0 ? 3 : -2));
    g.stroke();
  }
}

function paintWheel(g, s) {
  g.fillStyle = "#1a1a1a";
  g.fillRect(0, 0, s * 0.5, s);
  const rand = rng(3);
  for (let i = 0; i < 500; i++) {
    g.fillStyle = rand() > 0.5 ? "#2c2c2c" : "#0c0c0c";
    g.fillRect(rand() * s * 0.5, rand() * s, 2, 2 + rand() * 7);
  }
  g.fillStyle = "#d7b48a";
  g.fillRect(s * 0.5, 0, s * 0.5, s * 0.5);
  g.strokeStyle = "rgba(90,52,28,0.55)";
  g.globalAlpha = 0.7;
  for (let y = 4; y < s * 0.5; y += 6) {
    g.beginPath();
    g.moveTo(s * 0.5, y);
    g.bezierCurveTo(s * 0.7, y + 3, s * 0.85, y - 2, s, y + 1);
    g.stroke();
  }
  g.globalAlpha = 1;
  g.fillStyle = "#8a5a32";
  g.beginPath();
  g.ellipse(s * 0.72, s * 0.22, 16, 11, 0.4, 0, 6.28);
  g.fill();
  g.fillStyle = "#c5c9cd";
  g.fillRect(s * 0.5, s * 0.5, s * 0.5, s * 0.5);
  g.strokeStyle = "rgba(50,54,58,0.55)";
  for (let y = s * 0.5; y < s; y += 3) {
    g.beginPath();
    g.moveTo(s * 0.5, y);
    g.lineTo(s, y);
    g.stroke();
  }
}

function paintWheelMaps(gRough, gMetal, s) {
  const rough = gRough.createImageData(s, s);
  const metal = gMetal.createImageData(s, s);
  for (let y = 0; y < s; y++) {
    for (let x = 0; x < s; x++) {
      const i = (y * s + x) * 4;
      const iron = x >= s * 0.5 && y >= s * 0.5;
      const wood = x >= s * 0.5 && y < s * 0.5;
      const r = iron ? 80 : wood ? 150 : 235;
      const m = iron ? 190 : wood ? 20 : 8;
      rough.data[i] = rough.data[i + 1] = rough.data[i + 2] = r;
      rough.data[i + 3] = 255;
      metal.data[i] = metal.data[i + 1] = metal.data[i + 2] = m;
      metal.data[i + 3] = 255;
    }
  }
  gRough.putImageData(rough, 0, 0);
  gMetal.putImageData(metal, 0, 0);
}

function paintFlame(g, s) {
  const grd = g.createLinearGradient(0, s, 0, 0);
  grd.addColorStop(0, "rgba(255,60,0,0)");
  grd.addColorStop(0.25, "rgba(255,90,16,0.95)");
  grd.addColorStop(0.6, "rgba(255,170,40,0.95)");
  grd.addColorStop(1, "rgba(255,246,210,0.2)");
  g.fillStyle = grd;
  g.beginPath();
  g.moveTo(s * 0.5, s * 0.02);
  g.bezierCurveTo(s * 0.95, s * 0.35, s * 0.8, s * 0.7, s * 0.5, s * 0.98);
  g.bezierCurveTo(s * 0.2, s * 0.7, s * 0.05, s * 0.35, s * 0.5, s * 0.02);
  g.fill();
}

function materials(THREE) {
  if (MATS) return MATS;
  const woodC = canvasOf(512, paintWood);
  const metalC = canvasOf(512, paintMetal);
  const beaverC = canvasOf(512, paintBeaver);
  const knitC = canvasOf(512, paintKnit);
  const wheelC = canvasOf(512, paintWheel);
  const flameC = canvasOf(128, paintFlame);
  const mRoughC = canvasOf(512, () => {});
  const mMetalC = canvasOf(512, () => {});
  paintMetalMaps(mRoughC.getContext("2d"), mMetalC.getContext("2d"), 512);
  const bRoughC = canvasOf(512, paintBeaverRough);
  const wRoughC = canvasOf(512, () => {});
  const wMetalC = canvasOf(512, () => {});
  paintWheelMaps(wRoughC.getContext("2d"), wMetalC.getContext("2d"), 512);
  const emitC = canvasOf(512, paintEmit);
  const woodMap = texOf(THREE, woodC, true);
  const metalMap = texOf(THREE, metalC, true);
  const beaverMap = texOf(THREE, beaverC, true);
  const knitMap = texOf(THREE, knitC, true);
  const wheelMap = texOf(THREE, wheelC, true);
  const roughM = texOf(THREE, mRoughC, false);
  const metalM = texOf(THREE, mMetalC, false);
  const roughB = texOf(THREE, bRoughC, false);
  const roughW = texOf(THREE, wRoughC, false);
  const metalW = texOf(THREE, wMetalC, false);
  const emit = texOf(THREE, emitC, true);
  const wood = new THREE.MeshStandardMaterial({
    map: woodMap,
    vertexColors: true,
    roughness: 0.72,
    metalness: 0.04,
  });
  const metal = new THREE.MeshStandardMaterial({
    map: metalMap,
    roughnessMap: roughM,
    metalnessMap: metalM,
    emissive: 0xffb45a,
    emissiveMap: emit,
    emissiveIntensity: 0,
    vertexColors: true,
    roughness: 1,
    metalness: 1,
  });
  const fur = new THREE.MeshStandardMaterial({
    map: beaverMap,
    roughnessMap: roughB,
    vertexColors: true,
    roughness: 1,
    metalness: 0,
    side: THREE.DoubleSide,
  });
  const knit = new THREE.MeshStandardMaterial({
    map: knitMap,
    vertexColors: true,
    roughness: 0.96,
    metalness: 0,
    side: THREE.DoubleSide,
  });
  const wheel = new THREE.MeshStandardMaterial({
    map: wheelMap,
    roughnessMap: roughW,
    metalnessMap: metalW,
    vertexColors: true,
    roughness: 1,
    metalness: 1,
  });
  const flame = new THREE.MeshBasicMaterial({
    map: texOf(THREE, flameC, true),
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  });
  MATS = { wood, metal, fur, knit, wheel, flame };
  return MATS;
}

function regionUV(geo, u0, v0, u1, v1) {
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) {
    let u = uv.getX(i);
    let v = uv.getY(i);
    if (u < 0 || u > 1) u = u - Math.floor(u);
    if (v < 0 || v > 1) v = v - Math.floor(v);
    uv.setXY(i, u0 + u * (u1 - u0), v0 + v * (v1 - v0));
  }
}

function stamp(g) {
  if (g && g.type) MADE.push(g.type);
  return g;
}

function prep(THREE, src, color, region, x, y, z, rx, ry, rz, sx, sy, sz, quat) {
  const g = src.index ? src.toNonIndexed() : src.clone();
  const fx = sx || 1;
  const syv = sy == null ? fx : sy;
  const szv = sz == null ? fx : sz;
  const m = new THREE.Matrix4();
  if (quat) {
    m.compose(new THREE.Vector3(x || 0, y || 0, z || 0), quat, new THREE.Vector3(fx, syv, szv));
  } else {
    const o = new THREE.Object3D();
    o.position.set(x || 0, y || 0, z || 0);
    o.rotation.set(rx || 0, ry || 0, rz || 0);
    o.scale.set(fx, syv, szv);
    o.updateMatrix();
    m.copy(o.matrix);
  }
  g.applyMatrix4(m);
  g.computeVertexNormals();
  if (!g.attributes.uv) {
    g.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
  }
  if (region) regionUV(g, region[0], region[1], region[2], region[3]);
  const c = new THREE.Color(color == null ? 0xffffff : color);
  const n = g.attributes.position.count;
  const col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    col[i * 3] = c.r;
    col[i * 3 + 1] = c.g;
    col[i * 3 + 2] = c.b;
  }
  g.setAttribute("color", new THREE.BufferAttribute(col, 3));
  return g;
}

function mergeParts(geos, label) {
  if (!geos.length) return null;
  const merged = mergeGeometries(geos, false);
  if (!merged) throw new Error("merge " + label);
  return merged;
}

function solidMesh(THREE, geos, material, shadow, label) {
  const merged = mergeParts(geos, label);
  if (!merged) return null;
  const mesh = new THREE.Mesh(merged, material);
  mesh.name = label || "part";
  mesh.castShadow = !!shadow;
  mesh.receiveShadow = true;
  return mesh;
}

function rr(THREE, w, h, rad) {
  const r = Math.max(0.004, Math.min(rad, w * 0.45, h * 0.45));
  const s = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

function chip(THREE, w, h, d) {
  const key = "chip" + [w, h, d].join(":");
  let g = GEO.get(key);
  if (!g) {
    const s = new THREE.Shape();
    s.moveTo(-w / 2, -h / 2);
    s.lineTo(w / 2, -h / 2);
    s.lineTo(w / 2 * 0.7, h / 2);
    s.lineTo(-w / 2 * 0.7, h / 2);
    s.closePath();
    const b = Math.min(0.02, w * 0.35, h * 0.35, d * 0.4);
    g = new THREE.ExtrudeGeometry(s, {
      depth: Math.max(d, 0.012),
      bevelEnabled: true,
      bevelThickness: Math.min(0.006, d * 0.3),
      bevelSize: Math.max(0.008, b),
      bevelSegments: 2,
      curveSegments: 1,
      steps: 1,
    });
    g.translate(0, 0, -Math.max(d, 0.012) / 2);
    GEO.set(key, g);
  }
  return stamp(g);
}

function board(THREE, w, h, d, bevel) {
  const b = Math.min(0.04, Math.max(0.02, bevel == null ? 0.026 : bevel), w * 0.42, h * 0.42);
  const key = [BUILD.curve, w, h, d, b].join(":");
  let g = GEO.get(key);
  if (!g) {
    g = new THREE.ExtrudeGeometry(rr(THREE, w, h, b), {
      depth: d,
      bevelEnabled: true,
      bevelThickness: Math.min(0.012, d * 0.3),
      bevelSize: b,
      bevelSegments: 2,
      curveSegments: BUILD.curve,
      steps: 1,
    });
    g.translate(0, 0, -d / 2);
    GEO.set(key, g);
  }
  return stamp(g);
}

function lBracket(THREE, a, b, t) {
  const key = "L" + [a, b, t, BUILD.curve].join(":");
  let g = GEO.get(key);
  if (!g) {
    const s = new THREE.Shape();
    s.moveTo(0, 0);
    s.lineTo(a, 0);
    s.lineTo(a, t);
    s.lineTo(t, t);
    s.lineTo(t, b);
    s.lineTo(0, b);
    s.closePath();
    const bevel = Math.min(0.028, t * 0.35);
    g = new THREE.ExtrudeGeometry(s, {
      depth: t,
      bevelEnabled: true,
      bevelThickness: Math.min(0.01, t * 0.25),
      bevelSize: bevel,
      bevelSegments: 2,
      curveSegments: BUILD.curve,
      steps: 1,
    });
    g.translate(-t, -t, -t / 2);
    GEO.set(key, g);
  }
  return stamp(g);
}

function lathe(THREE, pts, segs) {
  const key = "lat" + segs + ":" + pts.map((p) => p[0] + "," + p[1]).join(";");
  let g = GEO.get(key);
  if (!g) {
    g = new THREE.LatheGeometry(pts.map((p) => new THREE.Vector2(p[0], p[1])), segs);
    GEO.set(key, g);
  }
  return stamp(g);
}

function tube(THREE, points, radius, tubular, radial) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(p[0], p[1], p[2])));
  return stamp(new THREE.TubeGeometry(curve, tubular, radius, radial, false));
}

function lineTube(THREE, a, b, radius, radial) {
  const curve = new THREE.LineCurve3(new THREE.Vector3(a[0], a[1], a[2]), new THREE.Vector3(b[0], b[1], b[2]));
  return stamp(new THREE.TubeGeometry(curve, 1, radius, radial || 4, false));
}

function rivetGeo(THREE) {
  let g = GEO.get("rivet");
  if (!g) {
    g = lathe(THREE, [[0.001, 0], [0.028, 0.005], [0.016, 0.016], [0.001, 0.022]], 4);
    GEO.set("rivet", g);
  }
  return g;
}

function nails(THREE, parent, spots, color, shadow) {
  if (!spots.length) return null;
  const mesh = new THREE.InstancedMesh(rivetGeo(THREE), new THREE.MeshStandardMaterial({
    color,
    roughness: 0.38,
    metalness: 0.72,
  }), spots.length);
  const dummy = new THREE.Object3D();
  const up = new THREE.Vector3(0, 1, 0);
  const dir = new THREE.Vector3();
  spots.forEach((s, i) => {
    dummy.position.set(s[0], s[1], s[2]);
    dir.set(s[3] || 0, s[4] == null ? 1 : s[4], s[5] || 0);
    if (dir.lengthSq() < 1e-6) dir.set(0, 1, 0);
    dir.normalize();
    dummy.quaternion.setFromUnitVectors(up, dir);
    dummy.scale.setScalar(s[6] || 1);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
  mesh.name = "rivets";
  mesh.castShadow = !!shadow;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function displaceTire(geo, mode, knobs) {
  const pos = geo.attributes.position;
  let tubeR = 0.015;
  for (let i = 0; i < pos.count; i += 3) tubeR = Math.max(tubeR, Math.abs(pos.getZ(i)));
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i);
    let y = pos.getY(i);
    const z = pos.getZ(i);
    const ring = Math.hypot(x, y) || 1;
    const ang = Math.atan2(y, x);
    let disp = Math.sin(ang * 18) * tubeR * 0.2;
    if (mode === "knob") {
      const lobe = Math.pow(Math.max(0, Math.sin(ang * knobs)), 1.35);
      const tread = 1 - Math.min(1, Math.abs(z) / tubeR);
      disp = lobe * tubeR * (0.2 + tread * 0.9);
    }
    x += (x / ring) * disp;
    y += (y / ring) * disp;
    pos.setXYZ(i, x, y, z);
  }
  geo.computeVertexNormals();
}

function wheelParts(THREE, opt, side, xOff) {
  const parts = [];
  const cap = side < 0 ? -1 : 1;
  const tire = stamp(new THREE.TorusGeometry(opt.ring, opt.tube, opt.radial, opt.tubular));
  displaceTire(tire, opt.mode, opt.knobs || 10);
  parts.push(prep(THREE, tire, opt.tireColor || 0xffffff, opt.tireUV, xOff, 0, 0, 0, Math.PI / 2, 0));
  if (opt.band) {
    const band = stamp(new THREE.TorusGeometry(opt.ring + opt.tube * 0.82, opt.tube * 0.28, 4, opt.tubular));
    displaceTire(band, "tread", 8);
    parts.push(prep(THREE, band, 0xffffff, WIRON, xOff, 0, 0, 0, Math.PI / 2, 0));
  }
  const n = BUILD.lod ? 8 : opt.spokes;
  const inner = opt.ring * 0.22;
  const outer = opt.ring * 0.86;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const spoke = lineTube(
      THREE,
      [xOff, Math.cos(a) * inner, Math.sin(a) * inner],
      [xOff, Math.cos(a) * outer, Math.sin(a) * outer],
      opt.spokeR || 0.012,
      4
    );
    parts.push(prep(THREE, spoke, 0xffffff, opt.spokeUV));
  }
  const hub = lathe(THREE, [[0.02, 0], [opt.hubR, 0.01], [opt.hubR * 0.7, opt.hubW], [0.015, opt.hubW]], 10);
  const hubRot = cap > 0 ? -Math.PI / 2 : Math.PI / 2;
  parts.push(prep(THREE, hub, opt.hubColor || 0xffffff, opt.hubUV, xOff, 0, 0, 0, 0, hubRot));
  return parts;
}

function addAxle(THREE, parent, spec, mats, shadow) {
  const yaw = new THREE.Group();
  yaw.position.set(spec.x, spec.y, spec.z);
  const spin = new THREE.Group();
  yaw.add(spin);
  const geos = [];
  const sides = spec.half ? [-1, 1] : [1];
  for (const side of sides) {
    const xOff = spec.half ? side * spec.half : 0;
    geos.push(...wheelParts(THREE, spec.wheel, side, xOff));
  }
  if (spec.half) {
    const axle = lineTube(THREE, [-spec.half, 0, 0], [spec.half, 0, 0], spec.wheel.hubR * 0.28, 5);
    geos.push(prep(THREE, axle, 0xffffff, WIRON));
  }
  let lock = null;
  if (spec.fork) {
    const start = geos.reduce((n, g) => n + g.attributes.position.count, 0);
    geos.push(...spec.fork);
    lock = { start, count: geos.reduce((n, g) => n + g.attributes.position.count, 0) - start };
  }
  const merged = mergeParts(geos, "wheel");
  const mesh = new THREE.Mesh(merged, mats.wheel);
  mesh.castShadow = !!shadow;
  mesh.receiveShadow = true;
  spin.add(mesh);
  if (lock) {
    lock.base = new Float32Array(merged.attributes.position.array);
    lock.geo = merged;
  }
  parent.add(yaw);
  return {
    yawPivot: yaw,
    spinPivot: spin,
    radius: spec.wheel.outer,
    steer: !!spec.steer,
    spin: 0,
    lock,
    mesh,
    axle: { x: spec.x, y: spec.y, z: spec.z, half: spec.half || 0 },
  };
}

function countVerts(geos) {
  return geos.reduce((n, g) => n + g.attributes.position.count, 0);
}

function scarfPose(geo) {
  const base = new Float32Array(geo.attributes.position.array);
  const n = base.length / 3;
  let zMin = Infinity;
  let zMax = -Infinity;
  for (let i = 0; i < n; i++) {
    const z = base[i * 3 + 2];
    if (z < zMin) zMin = z;
    if (z > zMax) zMax = z;
  }
  const span = zMax - zMin || 1;
  const along = new Float32Array(n);
  for (let i = 0; i < n; i++) along[i] = (zMax - base[i * 3 + 2]) / span;
  const bones = 4;
  return (time, wind) => {
    const pos = geo.attributes.position;
    const off = [];
    for (let b = 0; b < bones; b++) {
      const t = b / (bones - 1);
      const w = Math.sin(time * (5.2 + wind * 6.5) + b * 0.8);
      off.push([
        w * t * (0.06 + wind * 0.12),
        Math.sin(time * 3.1 + b * 1.1) * t * (0.025 + wind * 0.04) - t * wind * 0.02,
        -t * (0.04 + wind * 0.3),
      ]);
    }
    for (let i = 0; i < n; i++) {
      const t = along[i];
      const f = t * (bones - 1);
      const b0 = Math.min(bones - 2, Math.max(0, Math.floor(f)));
      const u = Math.min(1, f - b0);
      const a = off[b0];
      const c = off[b0 + 1];
      pos.setXYZ(
        i,
        base[i * 3] + a[0] * (1 - u) + c[0] * u,
        base[i * 3 + 1] + a[1] * (1 - u) + c[1] * u,
        base[i * 3 + 2] + a[2] * (1 - u) + c[2] * u
      );
    }
    pos.needsUpdate = true;
  };
}

function tailPose(geo, start, root) {
  const base = new Float32Array(geo.attributes.position.array);
  const end = geo.attributes.position.count;
  return (time, speed) => {
    const amp = 0.18 + Math.min(0.28, speed * 0.01);
    const yaw = Math.sin(time * 3.3) * amp;
    const pitch = Math.sin(time * 2.1 + 0.6) * amp * 0.35;
    const cy = Math.cos(yaw);
    const sy = Math.sin(yaw);
    const cx = Math.cos(pitch);
    const sx = Math.sin(pitch);
    const pos = geo.attributes.position;
    for (let i = start; i < end; i++) {
      let x = base[i * 3] - root[0];
      let y = base[i * 3 + 1] - root[1];
      let z = base[i * 3 + 2] - root[2];
      const x1 = x * cy + z * sy;
      const z1 = -x * sy + z * cy;
      const y1 = y * cx - z1 * sx;
      const z2 = y * sx + z1 * cx;
      pos.setXYZ(i, x1 + root[0], y1 + root[1], z2 + root[2]);
    }
    pos.needsUpdate = true;
  };
}

function lockPose(wheels) {
  return () => {
    for (const w of wheels) {
      if (!w.lock) continue;
      const pos = w.lock.geo.attributes.position;
      const b = w.lock.base;
      const th = -w.spinPivot.rotation.x;
      const c = Math.cos(th);
      const s = Math.sin(th);
      const last = w.lock.start + w.lock.count;
      for (let i = w.lock.start; i < last; i++) {
        const x = b[i * 3];
        const y = b[i * 3 + 1];
        const z = b[i * 3 + 2];
        pos.setXYZ(i, x, y * c - z * s, y * s + z * c);
      }
      pos.needsUpdate = true;
    }
  };
}

function lanternPose(THREE, mesh, clusters, lanterns) {
  const base = new Float32Array(mesh.geometry.attributes.position.array);
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const v = new THREE.Vector3();
  return () => {
    const pos = mesh.geometry.attributes.position;
    for (const cl of clusters) {
      const lan = lanterns[cl.i];
      e.set(lan.rotation.x, lan.rotation.y, lan.rotation.z);
      q.setFromEuler(e);
      for (let n = 0; n < cl.count; n++) {
        const i = cl.start + n;
        v.set(base[i * 3] - cl.p[0], base[i * 3 + 1] - cl.p[1], base[i * 3 + 2] - cl.p[2]);
        v.applyQuaternion(q);
        pos.setXYZ(i, v.x + cl.p[0], v.y + cl.p[1], v.z + cl.p[2]);
      }
    }
    pos.needsUpdate = true;
  };
}

function flamePose(mesh, clusters) {
  const base = new Float32Array(mesh.geometry.attributes.position.array);
  return (time, boost) => {
    const pos = mesh.geometry.attributes.position;
    const kick = boost ? 1.75 : 0.72;
    clusters.forEach((cl, i) => {
      const flick = 0.72 + Math.abs(Math.sin(time * 29 + i * 2.1)) * 0.55;
      const s = kick * flick;
      for (const idx of cl.indices) {
        const x = base[idx * 3] - cl.o[0];
        const y = base[idx * 3 + 1] - cl.o[1];
        const z = base[idx * 3 + 2] - cl.o[2];
        pos.setXYZ(idx, cl.o[0] + x * (0.8 + flick * 0.25), cl.o[1] + y * s, cl.o[2] + z * (0.8 + flick * 0.2));
      }
    });
    pos.needsUpdate = true;
    if (mesh.material) mesh.material.opacity = boost ? 1 : 0.8;
  };
}

const DIAL = {
  bober: { R: 0.38, S: [1, 0.95, 1], H: 0.7, B: 0.34, e: 0.3, K: 1, earY: 1, O: 0.4, arm: [0.075, 0.065], elbow: 0.08, tail: [0.46, 0.78], fur: 1, crown: 1 },
  nib: { R: 0.34, S: [1.05, 1, 1], H: 0.52, B: 0.28, e: 0.36, K: 1.35, earY: 1, O: 0.4, arm: [0.075, 0.065], elbow: 0.08, tail: [0.36, 0.58], fur: 1, crown: 1.4 },
  muscle: { R: 0.37, S: [1.14, 0.92, 1.05], H: 0.72, B: 0.46, e: 0.24, K: 0.8, earY: 1, O: 0.55, arm: [0.1, 0.09], elbow: 0.08, tail: [0.54, 0.8], fur: 1.3, crown: 1.3 },
  tall: { R: 0.34, S: [0.94, 1.1, 1], H: 0.92, B: 0.26, e: 0.38, K: 1, earY: 1.3, O: 0.4, arm: [0.055, 0.05], elbow: 0.14, tail: [0.4, 0.95], fur: 0.8, crown: 0.8 },
};

let TAIL_TEX = null;

function tailTexture(THREE) {
  if (TAIL_TEX) return TAIL_TEX;
  const canvas = canvasOf(128, (g, s) => {
    g.fillStyle = "#3B2A20";
    g.fillRect(0, 0, s, s);
    g.strokeStyle = "#5A4030";
    g.lineWidth = 2;
    const cols = 8;
    const rows = 12;
    for (let i = 0; i <= cols; i++) {
      g.beginPath();
      g.moveTo((i / cols) * s, 0);
      g.lineTo((i / cols) * s, s);
      g.stroke();
    }
    for (let j = 0; j <= rows; j++) {
      g.beginPath();
      g.moveTo(0, (j / rows) * s);
      g.lineTo(s, (j / rows) * s);
      g.stroke();
    }
    g.beginPath();
    for (let k = -cols; k <= rows + cols; k++) {
      g.moveTo(0, (k / rows) * s);
      g.lineTo(s, (k / rows) * s + s);
      g.moveTo(0, (k / rows) * s);
      g.lineTo(s, (k / rows) * s - s);
    }
    g.stroke();
  });
  TAIL_TEX = texOf(THREE, canvas, true);
  TAIL_TEX.wrapS = THREE.RepeatWrapping;
  TAIL_TEX.wrapT = THREE.RepeatWrapping;
  return TAIL_TEX;
}

function furTrio(THREE, spec) {
  const main = new THREE.Color(spec.fur == null ? 0x6b4226 : spec.fur);
  const dark = main.clone().multiplyScalar(0.62);
  const light = main.clone().lerp(new THREE.Color(0xf4e6c3), 0.45);
  return { main, dark, light };
}

function nPos(THREE, x, y, z, k, R, S) {
  const l = Math.hypot(x, y, z) || 1;
  return new THREE.Vector3((k * R * x * S[0]) / l, (k * R * y * S[1]) / l, (k * R * z * S[2]) / l);
}

function aimAxis(THREE, axis, x, y, z) {
  const l = Math.hypot(x, y, z) || 1;
  return new THREE.Quaternion().setFromUnitVectors(axis, new THREE.Vector3(x / l, y / l, z / l));
}

function measureRim(THREE, chassis) {
  chassis.updateMatrixWorld(true);
  let minZ = Infinity;
  const ys = [];
  const zs = [];
  chassis.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh || !o.geometry || !o.geometry.attributes || !o.geometry.attributes.position) return;
    const pos = o.geometry.attributes.position;
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld);
      if (v.z < minZ) minZ = v.z;
      ys.push(v.y);
      zs.push(v.z);
    }
  });
  if (!isFinite(minZ)) return { y: 1, z: -0.7 };
  let top = -Infinity;
  for (let i = 0; i < ys.length; i++) {
    if (zs[i] <= minZ + 0.05 && ys[i] > top) top = ys[i];
  }
  if (!isFinite(top)) top = 1;
  return { y: top, z: minZ };
}

function paddleShape(THREE, W, L) {
  const s = new THREE.Shape();
  const hw0 = 0.18 * W;
  const hw1 = 0.5 * W;
  const y1 = 0.55 * L;
  s.moveTo(-hw0, 0);
  s.lineTo(-hw1, y1);
  s.quadraticCurveTo(-hw1 * 0.15, L, 0, L);
  s.quadraticCurveTo(hw1 * 0.15, L, hw1, y1);
  s.lineTo(hw0, 0);
  s.closePath();
  return s;
}

const DOME_SRC = [
  [0, 0], [1, 0], [0.99, 0.12], [0.94, 0.28], [0.82, 0.46],
  [0.64, 0.62], [0.4, 0.74], [0.15, 0.8], [0, 0.81],
];

let TOON = null;

function toonLib(THREE) {
  if (TOON) return TOON;
  const grad = new THREE.DataTexture(new Uint8Array([90, 170, 255]), 3, 1, THREE.RedFormat);
  grad.magFilter = THREE.NearestFilter;
  grad.minFilter = THREE.NearestFilter;
  grad.generateMipmaps = false;
  grad.needsUpdate = true;
  const furLo = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: grad });
  const fur = furLo.clone();
  fur.onBeforeCompile = (shader) => {
    const rim = "gl_FragColor.rgb += vec3(0.956863, 0.901961, 0.764706) * pow(1.0 - max(dot(normalize(vNormal), normalize(vViewPosition)), 0.0), 3.0) * 0.35;";
    if (shader.fragmentShader.indexOf("#include <dithering_fragment>") >= 0) {
      shader.fragmentShader = shader.fragmentShader.replace("#include <dithering_fragment>", "#include <dithering_fragment>\n" + rim);
    }
  };
  fur.customProgramCacheKey = () => "gd47rim";
  const white = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: grad });
  const dark = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: grad });
  const line = new THREE.MeshBasicMaterial({ color: 0x1e1410, side: THREE.BackSide, depthWrite: true });
  const tail = new THREE.MeshToonMaterial({ gradientMap: grad, color: 0xffffff });
  for (const m of [fur, furLo, white, dark, tail]) m.flatShading = false;
  TOON = { fur, furLo, white, dark, line, tail };
  return TOON;
}

function paintAttr(THREE, geo, color) {
  const c = new THREE.Color(color == null ? 0xffffff : color);
  const n = geo.attributes.position.count;
  const col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    col[i * 3] = c.r;
    col[i * 3 + 1] = c.g;
    col[i * 3 + 2] = c.b;
  }
  geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
}

function blankUV(THREE, geo) {
  if (!geo.attributes.uv) {
    geo.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(geo.attributes.position.count * 2), 2));
  }
}

function crewMatrix(THREE, x, y, z, rx, ry, rz, sx, sy, sz, quat) {
  const fx = sx == null ? 1 : sx;
  const syv = sy == null ? fx : sy;
  const szv = sz == null ? fx : sz;
  const m = new THREE.Matrix4();
  if (quat) {
    m.compose(new THREE.Vector3(x || 0, y || 0, z || 0), quat, new THREE.Vector3(fx, syv, szv));
  } else {
    const o = new THREE.Object3D();
    o.position.set(x || 0, y || 0, z || 0);
    o.rotation.set(rx || 0, ry || 0, rz || 0);
    o.scale.set(fx, syv, szv);
    o.updateMatrix();
    m.copy(o.matrix);
  }
  return m;
}

// Keep the lathe indexed. Weld drops uv so the seam shares a vertex, then normals are rebuilt once.
// The later transform is applyMatrix4, which carries those normals. Do not recompute after it.
function crewBake(THREE, src, color, matrix, weld) {
  let g = src.index || src.attributes ? src.clone() : src;
  // ExtrudeGeometry in this build is non-indexed. Weld it so bevels stay smooth and merges share an index.
  if (weld || !g.index) {
    if (g.attributes.uv) g.deleteAttribute("uv");
    if (g.attributes.color) g.deleteAttribute("color");
    g = mergeVertices(g, 1e-4);
    g.computeVertexNormals();
  } else if (!g.attributes.normal) {
    g.computeVertexNormals();
  }
  if (matrix) g.applyMatrix4(matrix);
  blankUV(THREE, g);
  paintAttr(THREE, g, color);
  return g;
}

function resample2(THREE, pts, n) {
  if (pts.length === n) return pts.map((p) => [Math.max(0.001, p[0]), p[1]]);
  const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(Math.max(0.001, p[0]), p[1], 0)));
  const out = [];
  for (let i = 0; i < n; i++) {
    const p = curve.getPoint(i / (n - 1));
    out.push([Math.max(0.001, p.x), p.y]);
  }
  return out;
}

function extrudeSeg(THREE, shape, depth, bevel, curveSeg, bevelSeg) {
  const d = Math.max(depth, 0.008);
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: d,
    bevelEnabled: true,
    bevelThickness: Math.min(0.01, d * 0.35),
    bevelSize: Math.max(0.004, bevel),
    bevelSegments: bevelSeg,
    curveSegments: curveSeg,
    steps: 1,
  });
  g.translate(0, 0, -d / 2);
  return stamp(g);
}

function halfMouth(THREE, w, h) {
  const s = new THREE.Shape();
  s.moveTo(-w / 2, 0);
  s.absellipse(0, 0, w / 2, h, Math.PI, Math.PI * 2, false);
  s.closePath();
  return s;
}

function blockShape(THREE, w, h) {
  const s = new THREE.Shape();
  s.moveTo(-w / 2, -h / 2);
  s.lineTo(w / 2, -h / 2);
  s.lineTo(w / 2, h / 2);
  s.lineTo(-w / 2, h / 2);
  s.closePath();
  return s;
}

function addShell(THREE, parent, source, mat, push) {
  const g = source.geometry.clone();
  const pos = g.attributes.position;
  const nor = g.attributes.normal;
  if (!nor) return null;
  for (let i = 0; i < pos.count; i++) {
    const nx = nor.getX(i);
    const ny = nor.getY(i);
    const nz = nor.getZ(i);
    const len = Math.hypot(nx, ny, nz) || 1;
    pos.setXYZ(i, pos.getX(i) + (nx / len) * push, pos.getY(i) + (ny / len) * push, pos.getZ(i) + (nz / len) * push);
  }
  const shell = new THREE.Mesh(g, mat);
  shell.name = "outline";
  shell.userData.outline = true;
  shell.position.copy(source.position);
  shell.quaternion.copy(source.quaternion);
  shell.scale.copy(source.scale);
  shell.castShadow = false;
  shell.receiveShadow = false;
  parent.add(shell);
  return shell;
}

function makeSpot(THREE, eye, eyeE, profile) {
  const qInv = new THREE.Quaternion();
  const headOff = new THREE.Vector3();
  return (px, py) => {
    qInv.copy(eye.quaternion).invert();
    headOff.set(px * eyeE, py * eyeE, 0).applyQuaternion(qInv);
    const lx = headOff.x / eyeE;
    const lz = headOff.z / eyeE;
    const d = Math.min(0.98, Math.hypot(lx, lz));
    let h = profile[profile.length - 1][1];
    let nr = 0;
    let nh = 1;
    for (let i = 1; i < profile.length - 1; i++) {
      const r0 = profile[i][0];
      const h0 = profile[i][1];
      const r1 = profile[i + 1][0];
      const h1 = profile[i + 1][1];
      if (d <= Math.max(r0, r1) + 1e-4 && d >= Math.min(r0, r1) - 1e-4) {
        const t = Math.abs(r0 - r1) < 1e-5 ? 0 : (r0 - d) / (r0 - r1);
        h = h0 + (h1 - h0) * Math.max(0, Math.min(1, t));
        let dr = r1 - r0;
        let dh = h1 - h0;
        nr = dh;
        nh = -dr;
        if (nh < 0) {
          nr = -nr;
          nh = -nh;
        }
        break;
      }
    }
    const ang = Math.atan2(lz, lx);
    const pos = new THREE.Vector3(Math.cos(ang) * d * eyeE, h * eyeE, Math.sin(ang) * d * eyeE);
    const n = new THREE.Vector3(Math.cos(ang) * nr, nh, Math.sin(ang) * nr);
    if (n.lengthSq() < 1e-6) n.set(0, 1, 0);
    n.normalize();
    pos.addScaledVector(n, 0.012 * eyeE);
    return { pos, n };
  };
}

function pupilButton(THREE, rad, thick, segs) {
  let g = lathe(THREE, [[rad, 0], [rad * 0.98, thick * 0.35], [rad, thick * 0.7], [0.001, thick]], segs).clone();
  if (g.attributes.uv) g.deleteAttribute("uv");
  g = mergeVertices(g, 1e-4);
  g.computeVertexNormals();
  g.translate(0, -thick, 0);
  g.rotateX(Math.PI / 2);
  return g;
}

function addCrew(THREE, chassis, spec, mats, shadow) {
  const who = spec.who || "bober";
  const dial = DIAL[who] || DIAL.bober;
  const R = dial.R;
  const S = dial.S;
  const H = dial.H;
  const B = dial.B;
  const E = dial.e * R;
  const fur = furTrio(THREE, spec);
  const lod = BUILD.lod;
  const seg = (hi, lo) => (lod ? lo : hi);
  const parts = {};
  const toon = toonLib(THREE);
  const furMat = lod ? toon.furLo : toon.fur;
  if (!toon.tail.map) toon.tail.map = tailTexture(THREE);
  const driver = new THREE.Group();
  driver.position.set(spec.seat[0], spec.seat[1], spec.seat[2]);
  driver.userData.baseY = spec.seat[1];
  const head = new THREE.Group();
  const torsoTop = 1.04 * H;
  head.position.set(0, torsoTop + R * S[1] - dial.O * R, 0.06);
  head.rotation.x = 0.08;
  head.userData.baseY = head.position.y;
  driver.add(head);
  const yup = new THREE.Vector3(0, 1, 0);
  const zup = new THREE.Vector3(0, 0, 1);

  const meshOf = (geo, mat, name, parent) => {
    const mesh = new THREE.Mesh(geo, mat);
    mesh.name = name || "part";
    mesh.castShadow = !!shadow;
    mesh.receiveShadow = true;
    if (parent) parent.add(mesh);
    return mesh;
  };
  const mergeMesh = (geos, mat, name, parent) => {
    if (!geos.length) return null;
    const merged = mergeGeometries(geos, false);
    if (!merged) throw new Error("merge " + name);
    return meshOf(merged, mat, name, parent);
  };
  const probe = (parent, name, geos) => {
    const merged = geos.length === 1 ? geos[0] : mergeGeometries(geos, false);
    if (!merged) {
      const desc = geos.map((g) => (g ? Object.keys(g.attributes).sort().join("+") + (g.index ? ":i" : ":n") : "null")).join(" | ");
      throw new Error("probe " + name + " " + desc);
    }
    const mesh = new THREE.Mesh(merged, new THREE.MeshBasicMaterial());
    mesh.name = name;
    mesh.visible = false;
    mesh.userData.artProbe = true;
    parent.add(mesh);
    parts[name] = mesh;
    return mesh;
  };
  const anchor = (color) => crewBake(
    THREE,
    lathe(THREE, [[0.001, 0], [0.05 * R, 0.02 * R], [0.001, 0.08 * R]], 5),
    color,
    crewMatrix(THREE, 0, 0.04 * R, 0.2 * R, Math.PI / 2, 0, 0, 1, 1, 1),
    false
  );
  const shell = (source, push) => {
    if (lod || !source) return;
    addShell(THREE, source.parent, source, toon.line, push);
  };

  const skullUnit = [
    [0.02, -0.92], [0.45, -0.86], [0.8, -0.6], [0.98, -0.2], [1, 0.1],
    [0.93, 0.45], [0.72, 0.78], [0.4, 0.96], [0.02, 1],
  ];
  const skullPts = resample2(THREE, skullUnit.map(([r, y]) => [r * R, (y - 0.04) * R]), seg(14, 9));
  const skullGeo = crewBake(THREE, lathe(THREE, skullPts, seg(24, 18)), fur.main, null, true);
  const skull = meshOf(skullGeo, furMat, "skull", head);
  skull.scale.set(S[0], S[1], S[2]);
  shell(skull, 0.008);

  const muzzlePts = resample2(THREE, [
    [0.02, 0], [0.42, 0.06], [0.58, 0.25], [0.58, 0.5], [0.5, 0.7], [0.32, 0.85], [0.02, 0.9],
  ].map(([r, h]) => [r * R, h * R]), seg(10, 6));
  const muzzleGeo = crewBake(
    THREE, lathe(THREE, muzzlePts, seg(18, 10)), fur.light,
    crewMatrix(THREE, 0, -0.28 * R, 0.4 * R, Math.PI / 2, 0, 0, 1.15, 0.85, 1),
    true
  );
  const muzzle = meshOf(muzzleGeo, furMat, "muzzle", head);
  shell(muzzle, 0.008);
  probe(head, "muzzle", [muzzleGeo.clone()]);
  let muzzleFront = -Infinity;
  const mp = muzzleGeo.attributes.position;
  for (let i = 0; i < mp.count; i++) muzzleFront = Math.max(muzzleFront, mp.getZ(i));

  const nosePts = [[0.02, 0], [0.18, 0.03], [0.2, 0.1], [0.1, 0.16], [0.01, 0.18]].map(([r, h]) => [r * R, h * R]);
  const noseGeo = crewBake(
    THREE, lathe(THREE, nosePts, seg(6, 4)), 0x2a211c,
    crewMatrix(THREE, 0, -0.08 * R, 1.16 * R, Math.PI / 2, 0, 0, 1.3, 0.8, 0.8),
    true
  );
  const noseBits = [noseGeo];
  probe(head, "nose", [noseGeo.clone(), anchor(0x2a211c)]);
  const dot = [[0.001, 0], [0.035 * R, 0.004 * R], [0.03 * R, 0.012 * R], [0.001, 0.016 * R]];
  for (const side of [-1, 1]) {
    const g = crewBake(
      THREE, lathe(THREE, dot, seg(5, 4)), 0x140e0c,
      crewMatrix(THREE, side * 0.07 * R, -0.06 * R, 1.33 * R, Math.PI / 2, 0, 0, 1, 1, 1),
      true
    );
    noseBits.push(g);
    probe(head, side < 0 ? "nostrilL" : "nostrilR", [g.clone(), anchor(0x140e0c)]);
  }
  shell(mergeMesh(noseBits, toon.dark, "nose", head), 0.008);

  const toothScale = who === "nib" ? 0.9 : who === "muscle" ? 1.15 : who === "tall" ? 1.2 : 1;
  const gap = (who === "tall" ? 0.06 : 0.03) * R;
  const toothW = 0.24 * R * toothScale;
  const toothH = 0.55 * R * toothScale;
  const toothD = 0.09 * R * toothScale;
  const toothGeos = [];
  for (const side of [-1, 1]) {
    let toothX = side * (gap / 2 + toothW / 2);
    let toothY = -0.5 * R - toothH / 2;
    if (who === "muscle" && side < 0) {
      toothX -= 0.08 * R;
      toothY += 0.03 * R;
    }
    const toothZ = muzzleFront - 0.02 * R + toothD / 2;
    const g = crewBake(
      THREE,
      extrudeSeg(THREE, blockShape(THREE, toothW, toothH), toothD, seg(0.018, 0.01), seg(6, 3), seg(3, 1)),
      spec.tooth,
      crewMatrix(THREE, toothX, toothY, toothZ, 0, 0, 0, 1, 1, 1),
      false
    );
    toothGeos.push(g);
    probe(head, side < 0 ? "toothL" : "toothR", [g.clone(), anchor(spec.tooth)]);
  }
  const teethMesh = mergeMesh(toothGeos, toon.white, "teeth", head);
  shell(teethMesh, 0.008);

  const aimZ = new THREE.Vector3(0, 0, 1);
  const pupilFrac = who === "nib" ? 0.3 : 0.42;
  const lidRest = who === "bober" ? -0.7 : who === "nib" ? -1.45 : who === "muscle" ? -1.05 : -1.35;
  const domeProfile = resample2(THREE, DOME_SRC, seg(7, 5));
  const pupilRest = [[0, 0], [0, 0]];
  const face = { head, torso: null, tail: null, tufts: null, bodyTufts: null, cheekL: null, cheekR: null };
  for (const side of [-1, 1]) {
    const right = side > 0;
    const eyeE = E * (who === "tall" && right ? 0.82 : 1);
    const raw = [side * 0.38, 0.22 + (who === "tall" && right ? 0.06 : 0), 0.9];
    const q = aimAxis(THREE, yup, raw[0], raw[1], raw[2]);
    const base = nPos(THREE, raw[0], raw[1], raw[2], 0.86, R, S);
    const eye = new THREE.Group();
    eye.name = right ? "eyeR" : "eyeL";
    eye.position.copy(base);
    eye.quaternion.copy(q);
    head.add(eye);
    const spot = makeSpot(THREE, eye, eyeE, domeProfile);
    eye.userData.spot = spot;
    eye.userData.E = eyeE;
    const domePts = domeProfile.map(([r, h]) => [Math.max(0.001, r) * eyeE, h * eyeE]);
    const dome = meshOf(
      crewBake(THREE, lathe(THREE, domePts, seg(16, 10)), 0xfffdf6, null, true),
      toon.white, right ? "eyeWhiteR" : "eyeWhiteL", eye
    );
    parts[dome.name] = dome;
    shell(dome, 0.008);
    const lidPts = domeProfile.map(([r, h]) => [Math.max(0.001, r) * eyeE * 1.04, h * eyeE * 1.04]);
    const lid = meshOf(
      crewBake(THREE, lathe(THREE, lidPts, seg(16, 10)), fur.main, null, true),
      furMat, right ? "lidR" : "lidL", eye
    );
    lid.rotation.x = lidRest;
    lid.userData.restX = lidRest;
    parts[lid.name] = lid;
    const iris = new THREE.Mesh(stamp(new THREE.CircleGeometry(eyeE * 0.66, seg(16, 10))), new THREE.MeshBasicMaterial());
    iris.name = right ? "irisR" : "irisL";
    iris.visible = false;
    iris.userData.artProbe = true;
    iris.rotation.x = -Math.PI / 2;
    iris.position.y = 0.08 * eyeE;
    eye.add(iris);
    parts[iris.name] = iris;
    const button = pupilButton(THREE, pupilFrac * eyeE, 0.28 * R, seg(16, 10));
    blankUV(THREE, button);
    paintAttr(THREE, button, 0x14110f);
    const pupil = meshOf(button, toon.dark, right ? "pupilR" : "pupilL", eye);
    const restP = [who === "tall" ? -side * 0.25 : 0, 0];
    pupil.userData.p = restP.slice();
    pupil.userData.restP = restP.slice();
    parts[pupil.name] = pupil;
    pupilRest[right ? 1 : 0] = restP.slice();
    if (!lod) {
      const hi = spot(-0.2, 0.32);
      const glint = meshOf(
        crewBake(THREE, stamp(new THREE.CircleGeometry(0.14 * eyeE, seg(16, 10))), 0xffffff, null, false),
        toon.white, "glint", eye
      );
      glint.position.copy(hi.pos).addScaledVector(hi.n, 0.03 * eyeE);
      glint.quaternion.setFromUnitVectors(aimZ, hi.n);
      glint.castShadow = false;
    }
    if (right) {
      face.eyeR = eye;
      face.pupilR = pupil;
      face.lidR = lid;
    } else {
      face.eyeL = eye;
      face.pupilL = pupil;
      face.lidL = lid;
    }
  }

  for (const side of [-1, 1]) {
    const right = side > 0;
    const raw = [side * 0.36, 0.52, 0.78];
    const q = aimAxis(THREE, zup, raw[0], raw[1], raw[2]);
    const at = nPos(THREE, raw[0], raw[1], raw[2], 0.94, R, S);
    let raise = 0;
    let tilt = 0;
    let thick = 1;
    if (who === "bober" && !right) {
      raise = 0.05 * R;
      tilt = 0.18;
    }
    if (who === "nib") raise = 0.08 * R;
    if (who === "muscle") {
      thick = 1.5;
      tilt = side < 0 ? 0.35 : -0.35;
      raise = -0.06 * R;
    }
    const browLen = 0.3 * R;
    const browRad = 0.0425 * R * thick;
    const lay = new THREE.Quaternion().setFromAxisAngle(zup, Math.PI / 2);
    const qBrow = q.clone().multiply(lay);
    let browGeo = crewBake(
      THREE,
      lathe(THREE, [
        [0.001, -browLen * 0.5],
        [browRad, -browLen * 0.28],
        [browRad, browLen * 0.28],
        [0.001, browLen * 0.5],
      ], seg(6, 4)),
      fur.dark,
      crewMatrix(THREE, at.x, at.y, at.z, 0, 0, 0, 1, 1, 0.55, qBrow),
      true
    );
    browGeo.translate(-at.x, -at.y, -at.z);
    const pivot = new THREE.Group();
    pivot.name = right ? "browR" : "browL";
    pivot.position.set(at.x, at.y + raise, at.z);
    pivot.rotation.z = tilt;
    pivot.userData.baseY = pivot.position.y;
    pivot.userData.baseZ = tilt;
    pivot.add(meshOf(browGeo, furMat, pivot.name + "mesh", null));
    head.add(pivot);
    parts[pivot.name] = pivot;
    if (right) face.browR = pivot;
    else face.browL = pivot;
  }

  const earSrc = [[0.02, 0], [0.16, 0.03], [0.2, 0.1], [0.17, 0.18], [0.06, 0.22]];
  const earPts = resample2(THREE, earSrc.map(([r, h]) => [r * R, h * R]), seg(6, 4));
  for (const side of [-1, 1]) {
    const right = side > 0;
    const raw = [side * 0.67, 0.73, -0.11];
    const q = aimAxis(THREE, yup, raw[0], raw[1], raw[2]);
    const at = nPos(THREE, raw[0], raw[1], raw[2], 0.9, R, S);
    const earGeo = crewBake(
      THREE, lathe(THREE, earPts, seg(12, 8)), fur.dark,
      crewMatrix(THREE, at.x, at.y, at.z, 0, 0, 0, dial.K, dial.K * dial.earY, dial.K * 0.55, q),
      true
    );
    earGeo.translate(-at.x, -at.y, -at.z);
    const inn = nPos(THREE, raw[0], raw[1], raw[2], 0.97, R, S);
    const innGeo = crewBake(
      THREE, lathe(THREE, [[0.001, 0], [0.12 * R, 0.002], [0.001, 0.01]], seg(8, 5)), 0xc98a6a,
      crewMatrix(THREE, inn.x, inn.y, inn.z, 0, 0, 0, 1, 1, 1, q.clone()),
      true
    );
    innGeo.translate(-at.x, -at.y, -at.z);
    const pivot = new THREE.Group();
    pivot.name = right ? "earR" : "earL";
    pivot.position.copy(at);
    pivot.userData.baseZ = who === "muscle" && !right ? -0.3 : 0;
    pivot.userData.baseX = 0;
    pivot.rotation.z = pivot.userData.baseZ;
    pivot.add(mergeMesh([earGeo, innGeo], furMat, pivot.name + "mesh", null));
    head.add(pivot);
    parts[pivot.name] = pivot;
    shell(pivot.children[0], 0.008);
    if (right) face.earR = pivot;
    else face.earL = pivot;
  }

  const cheekSrc = [[0.02, 0], [0.26, 0.05], [0.3, 0.16], [0.12, 0.26], [0.01, 0.28]];
  const cheekPts = resample2(THREE, cheekSrc.map(([r, h]) => [r * R, h * R]), seg(6, 4));
  for (const side of [-1, 1]) {
    const right = side > 0;
    const px = side * 0.45 * R;
    const py = -0.3 * R;
    const pz = 0.62 * R;
    const cheekGeo = crewBake(
      THREE, lathe(THREE, cheekPts, seg(12, 8)), fur.light,
      crewMatrix(THREE, px, py, pz, 0, 0, side * 0.35, 1.2, 0.9, 1),
      true
    );
    cheekGeo.translate(-px, -py, -pz);
    const pivot = new THREE.Group();
    pivot.name = right ? "cheekR" : "cheekL";
    pivot.position.set(px, py, pz);
    pivot.add(meshOf(cheekGeo, furMat, pivot.name + "mesh", null));
    head.add(pivot);
    parts[pivot.name] = pivot;
    shell(pivot.children[0], 0.008);
    if (right) face.cheekR = pivot;
    else face.cheekL = pivot;
  }

  if (!lod) {
    for (const side of [-1, 1]) {
      const root = new THREE.Vector3(side * 0.62 * R, -0.28 * R, 0.85 * R);
      const whisk = new THREE.Group();
      whisk.name = side < 0 ? "whiskL" : "whiskR";
      whisk.position.copy(root);
      whisk.userData.side = side;
      const bits = [];
      for (let i = 0; i < 3; i++) {
        const y0 = (i - 1) * 0.07 * R;
        const len = R;
        const tubeGeo = crewBake(
          THREE,
          tube(THREE, [
            [0, y0, 0],
            [side * len * 0.62, y0, 0.03 * R],
            [side * len * 0.84, y0 - 0.06 * R, 0.01 * R],
            [side * len, y0 - 0.14 * R, -0.02 * R],
          ], 0.014, 4, 4),
          0xe8dcc4, null, false
        );
        bits.push(tubeGeo);
        const probeTube = crewBake(
          THREE,
          lathe(THREE, [[0.001, 0], [0.02 * R, 0.01 * R], [0.001, 0.04 * R]], 5),
          0xe8dcc4,
          crewMatrix(THREE, root.x, root.y + y0, root.z, 0, 0, 0, 1, 1, 1),
          false
        );
        probe(head, (side < 0 ? "whiskerL" : "whiskerR") + i, [probeTube, anchor(0xe8dcc4)]);
      }
      whisk.add(mergeMesh(bits, furMat, whisk.name + "mesh", null));
      head.add(whisk);
      if (side < 0) face.whiskL = whisk;
      else face.whiskR = whisk;
    }
  } else {
    face.whiskL = null;
    face.whiskR = null;
  }

  const clumpPts = [[0.055, 0], [0.04, 0.1], [0.003, 0.2]];
  const tilt = 0.6108652381980153;
  const clumpGeo = (x, y, z, mul, color) => {
    const sink = 0.08 * mul;
    return crewBake(
      THREE, lathe(THREE, clumpPts, seg(4, 3)), color,
      crewMatrix(THREE, x, y - Math.cos(tilt) * sink, z - Math.sin(tilt) * sink, tilt, 0, 0, mul, mul, mul),
      true
    );
  };
  const headClumps = [];
  const crowns = [[0, 1, -0.1], [-0.25, 0.95, -0.2], [0.25, 0.95, -0.2]];
  crowns.forEach((n, i) => {
    const p = nPos(THREE, n[0], n[1], n[2], 0.95, R, S);
    const g = clumpGeo(p.x, p.y, p.z, dial.crown, fur.dark);
    headClumps.push(g);
    probe(head, "crown" + i, [g.clone()]);
  });
  for (const side of [-1, 1]) {
    const nape = nPos(THREE, side * 0.2, -0.2, -0.95, 0.95, R, S);
    const ng = clumpGeo(nape.x, nape.y, nape.z, dial.fur, fur.dark);
    headClumps.push(ng);
    probe(head, side < 0 ? "napeL" : "napeR", [ng.clone()]);
    const ch = nPos(THREE, side * 0.85, -0.35, 0.35, 0.95, R, S);
    const cg = clumpGeo(ch.x, ch.y, ch.z, dial.fur, fur.dark);
    headClumps.push(cg);
    probe(head, side < 0 ? "cheekFurL" : "cheekFurR", [cg.clone()]);
  }
  const tufts = new THREE.Group();
  tufts.name = "tufts";
  tufts.add(mergeMesh(headClumps, furMat, "tuftMesh", null));
  head.add(tufts);
  face.tufts = tufts;
  const bodyClumps = [
    clumpGeo(-0.75 * B, 0.78 * H, -0.1 * B, dial.fur, fur.dark),
    clumpGeo(0.75 * B, 0.78 * H, -0.1 * B, dial.fur, fur.dark),
    clumpGeo(0, 0.72 * H, 0.8 * B, dial.fur, fur.light),
  ];
  const bodyTufts = new THREE.Group();
  bodyTufts.name = "bodyTufts";
  bodyTufts.add(mergeMesh(bodyClumps, furMat, "bodyTuftMesh", null));
  driver.add(bodyTufts);
  face.bodyTufts = bodyTufts;

  let torsoProfile = [
    [0.05, -0.04], [0.7, 0], [0.95, 0.12], [1, 0.3], [0.93, 0.5],
    [0.78, 0.68], [0.62, 0.82], [0.48, 0.92], [0.4, 1], [0.02, 1.04],
  ];
  if (who === "muscle") {
    torsoProfile = torsoProfile.slice();
    torsoProfile[5] = [0.92, 0.68];
    torsoProfile[6] = [0.85, 0.82];
    torsoProfile[7] = [0.6, 0.92];
  }
  const torsoPts = resample2(THREE, torsoProfile.map(([r, y]) => [r * B, y * H]), seg(12, 8));
  const torsoSrc = lathe(THREE, torsoPts, seg(20, 22)).clone();
  const tp = torsoSrc.attributes.position;
  for (let i = 0; i < tp.count; i++) {
    const y = tp.getY(i);
    const z = tp.getZ(i);
    if (z > 0 && y > 0.1 * H && y < 0.6 * H) {
      tp.setZ(i, z + 0.18 * B * Math.sin(Math.PI * ((y / H - 0.1) / 0.5)));
    }
  }
  tp.needsUpdate = true;
  const torsoGeo = crewBake(THREE, torsoSrc, fur.main, crewMatrix(THREE, 0, 0, 0, 0, 0, 0, 1, 1, 0.85), true);
  const bodyBits = [torsoGeo];
  const capR = 0.62 * B;
  bodyBits.push(crewBake(
    THREE, lathe(THREE, [
      [0.02 * capR, 0], [capR, 0.04 * capR], [0.7 * capR, 0.22 * capR], [0.2 * capR, 0.4 * capR], [0.02 * capR, 0.46 * capR],
    ], seg(8, 5)), fur.light,
    crewMatrix(THREE, 0, 0.3 * H, 0.95 * B, Math.PI / 2, 0, 0, 1, 1, 1),
    true
  ));
  const footPts = [[0.02, 0], [0.1, 0.02], [0.12, 0.06], [0.04, 0.09]];
  for (const side of [-1, 1]) {
    bodyBits.push(crewBake(
      THREE, lathe(THREE, footPts, seg(8, 5)), fur.dark,
      crewMatrix(THREE, side * 0.55 * B, 0.02, 0.5 * B, 0, 0, 0, 1, 1, 1.8),
      true
    ));
  }
  const torsoMesh = mergeMesh(bodyBits, furMat, "torso", driver);
  face.torso = torsoMesh;
  probe(driver, "torso", [torsoGeo.clone()]);
  shell(torsoMesh, 0.012);
  driver.userData.smooth = { skull: skullGeo, torso: torsoGeo };

  const arms = [];
  spec.paws.forEach((p) => {
    const side = p[0] < 0 ? -1 : 1;
    const shoulder = [side * 0.62 * B, 0.8 * H, 0];
    const elbow = [side * (B + dial.elbow), 0.52 * H, 0.2];
    const upper = crewBake(THREE, tube(THREE, [shoulder, elbow], dial.arm[0], seg(8, 5), seg(5, 4)), fur.dark, null, false);
    const fore = crewBake(THREE, tube(THREE, [elbow, p], dial.arm[1], seg(8, 5), seg(5, 4)), fur.dark, null, false);
    const paw = crewBake(
      THREE, lathe(THREE, [[0.02, 0], [0.08, 0.02], [0.09, 0.07], [0.05, 0.11], [0.01, 0.12]], seg(6, 4)),
      fur.dark, crewMatrix(THREE, p[0], p[1], p[2], 0, 0, 0, 1, 1, 1), true
    );
    const foreProbe = crewBake(THREE, tube(THREE, [elbow, p], 0.012, 3, 4), fur.dark, null, false);
    probe(driver, side < 0 ? "armForeL" : "armForeR", [foreProbe]);
    probe(driver, side < 0 ? "pawL" : "pawR", [paw.clone()]);
    const bits = [upper, fore, paw];
    if (!lod) {
      for (let f = 0; f < 3; f++) {
        bits.push(crewBake(
          THREE, lathe(THREE, [[0.004, 0], [0.012, 0.012], [0.004, 0.042]], 4),
          fur.dark,
          crewMatrix(THREE, p[0] + side * (f - 1) * 0.028, p[1] + 0.012, p[2] + 0.06, Math.PI / 2, 0, side * 0.15, 1, 1, 1),
          true
        ));
      }
    }
    if (spec.reins) {
      bits.push(crewBake(THREE, tube(THREE, [
        [p[0], p[1] + 0.02, p[2] + 0.02],
        [side * 0.1, p[1] + 0.02, p[2] + 0.28],
        [side * 0.05, 0.06, 0.72],
      ], 0.012, lod ? 3 : 4, 3), 0x6a4030, null, false));
    }
    for (const g of bits) g.translate(-shoulder[0], -shoulder[1], -shoulder[2]);
    const pivot = new THREE.Group();
    pivot.position.set(shoulder[0], shoulder[1], shoulder[2]);
    pivot.userData.side = side;
    pivot.userData.baseZ = 0;
    pivot.userData.baseX = 0;
    pivot.add(mergeMesh(bits, furMat, side < 0 ? "armL" : "armR", null));
    driver.add(pivot);
    arms.push(pivot);
  });

  const mouthDepth = 0.48 * R;
  const mouthGeo = extrudeSeg(THREE, halfMouth(THREE, 0.34 * R, 0.22 * R), mouthDepth, 0.008 * R, seg(6, 3), seg(2, 1));
  mouthGeo.translate(0, 0, -mouthDepth / 2);
  const mouthBaked = crewBake(THREE, mouthGeo, 0x5a1e1e, null, false);
  const mouth = new THREE.Group();
  mouth.name = "mouth";
  const mouthRest = {
    bober: { x: 0.1 * R, y: -0.46 * R, z: 0.86 * R, sx: 0.7, sy: 0.18, rz: -0.2 },
    nib: { x: 0, y: -0.46 * R, z: 0.86 * R, sx: 1, sy: 0.45, rz: 0 },
    muscle: { x: 0, y: -0.46 * R, z: 0.86 * R, sx: 1, sy: 0.12, rz: Math.PI },
    tall: { x: 0, y: -0.46 * R, z: 0.86 * R, sx: 1, sy: 0.3, rz: 0 },
  }[who];
  mouth.position.set(mouthRest.x, mouthRest.y, mouthRest.z);
  mouth.scale.set(mouthRest.sx, mouthRest.sy, 1);
  mouth.rotation.z = mouthRest.rz;
  mouth.add(meshOf(mouthBaked, toon.dark, "mouthMesh", null));
  const tongueGeo = crewBake(THREE, stamp(new THREE.CircleGeometry(0.09 * R, seg(12, 8))), 0xd9606a, null, false);
  const tongue = meshOf(tongueGeo, toon.dark, "tongue", mouth);
  tongue.position.set(0, -0.06 * R, who === "tall" ? 0.06 * R : 0.015 * R);
  tongue.rotation.x = who === "tall" ? 0.4 : 0.15;
  head.add(mouth);
  parts.mouth = mouth;
  face.mouth = mouth;
  face.tongue = tongue;

  const scarfParts = [];
  const ringY = torsoTop - 0.1 * H;
  const ringR = 0.48 * B + 0.03;
  const ringN = lod ? 6 : 8;
  const ring = [];
  for (let i = 0; i <= ringN; i++) {
    const a = (i / ringN) * Math.PI * 2;
    ring.push([Math.cos(a) * ringR, ringY, Math.sin(a) * ringR]);
  }
  scarfParts.push(prep(THREE, tube(THREE, ring, spec.scarfR, ringN, 3), spec.scarfA, null));
  if (spec.knot) {
    scarfParts.push(prep(
      THREE, lathe(THREE, [[0.02, 0], [0.07, 0.02], [0.06, 0.08], [0.02, 0.1]], seg(8, 6)),
      spec.scarfA, null, 0, ringY - 0.02, ringR, Math.PI / 2, 0, 0
    ));
  }
  for (let t = 0; t < spec.tails; t++) {
    const spread = (t - (spec.tails - 1) / 2) * spec.tailGap;
    const len = spec.tailLen * (spec.tatter && t === 0 ? 0.62 : 1);
    const thick = spec.scarfR * (spec.chunky ? 1.25 : 0.85);
    scarfParts.push(prep(THREE, tube(THREE, [
      [spread * 0.3, ringY, -ringR],
      [spread, ringY - 0.08, -ringR - len * 0.45],
      [spread * 1.15, ringY - 0.16, -ringR - len],
    ], thick, lod ? 2 : 3, 3), t % 2 ? spec.scarfB : spec.scarfA, null));
  }
  const scarfMesh = solidMesh(THREE, scarfParts, mats.knit, false, "scarf");
  driver.add(scarfMesh);

  const rim = measureRim(THREE, chassis);
  const W = dial.tail[0];
  const L = dial.tail[1];
  let rootY = rim.y - spec.seat[1] + 0.03;
  const zFormula = -0.85 * B;
  const zRim = rim.z - spec.seat[2] + 0.02;
  const rootZ = Math.min(zFormula, zRim);
  let tailGeo = extrudeSeg(THREE, paddleShape(THREE, W, L), 0.05, 0.015, seg(12, 6), seg(3, 1));
  tailGeo.applyMatrix4(new THREE.Matrix4().makeRotationX(-Math.PI / 2 + 0.12));
  if (tailGeo.attributes.uv) tailGeo.deleteAttribute("uv");
  tailGeo = mergeVertices(tailGeo, 1e-4);
  tailGeo.computeVertexNormals();
  blankUV(THREE, tailGeo);
  const tpos = tailGeo.attributes.position;
  let minLocal = Infinity;
  for (let i = 0; i < tpos.count; i++) minLocal = Math.min(minLocal, tpos.getY(i));
  const worldDip = (spec.seat[1] + rootY + minLocal) * 1.2;
  if (worldDip < 0.25) rootY += (0.25 - worldDip) / 1.2 + 0.01;
  const tailMesh = new THREE.Mesh(tailGeo, toon.tail);
  tailMesh.name = "tail";
  tailMesh.position.set(0, rootY, rootZ);
  tailMesh.castShadow = !!shadow;
  tailMesh.userData.baseX = 0;
  driver.add(tailMesh);
  parts.tail = tailMesh;
  face.tail = tailMesh;

  const expr = {
    who, R, E, H,
    lid: [lidRest, lidRest],
    pupilR: pupilFrac,
    pupil: pupilRest,
    mouth: mouthRest,
    jitter: who === "nib",
  };
  driver.userData.aimZ = aimZ;
  driver.userData.parts = parts;
  driver.userData.face = face;
  driver.userData.expr = expr;
  driver.userData.arms = arms;
  driver.userData.beaver = {
    who, R, S, H, B, lod, paws: spec.paws,
    rimY: rim.y, rimZ: rim.z,
    seatY: spec.seat[1], seatZ: spec.seat[2],
    rootY, rootZ,
  };
  applyFacePose(driver, "rest", 0);
  const scarfTails = [new THREE.Object3D()];
  driver.add(scarfTails[0]);
  chassis.add(driver);
  let crewTris = 0;
  driver.traverse((o) => {
    if (!o.isMesh || (o.userData && (o.userData.artProbe || o.userData.outline))) return;
    const geo = o.geometry;
    crewTris += geo.index ? geo.index.count / 3 : geo.attributes.position.count / 3;
  });
  driver.userData.crewTris = Math.round(crewTris);
  return {
    driver,
    head,
    arms,
    face,
    scarfTails,
    tailFn: () => {},
    scarfFn: scarfPose(scarfMesh.geometry),
  };
}

export function faceTargets(expr, mode, time) {
  const t = time || 0;
  const R = expr.R;
  const mouth = {
    x: expr.mouth.x, y: expr.mouth.y, z: expr.mouth.z,
    sx: expr.mouth.sx, sy: expr.mouth.sy, rz: expr.mouth.rz,
  };
  const lid = [expr.lid[0], expr.lid[1]];
  const browAddY = [0, 0];
  const browAddZ = [0, 0];
  let eye = 1;
  let pupilMul = 1;
  const p = [expr.pupil[0].slice(), expr.pupil[1].slice()];
  let earFlat = 0;
  let cheek = 1;
  let tuftX = 0;
  let whiskOut = 0;
  let headX = null;
  if (mode === "blink") {
    lid[0] = 0;
    lid[1] = 0;
  } else if (mode === "panic") {
    lid[0] = -1.55;
    lid[1] = -1.55;
    eye = 1.45;
    pupilMul = 0.22 / expr.pupilR;
    mouth.sx = 1.15;
    mouth.sy = 1;
    mouth.rz = 0;
    browAddY[0] = 0.1 * R;
    browAddY[1] = 0.1 * R;
    browAddZ[0] = -0.25;
    browAddZ[1] = 0.25;
    earFlat = 0.9;
    whiskOut = 0.35;
    p[0] = [0.28, 0.16];
    p[1] = [-0.26, 0.14];
  } else if (mode === "boost") {
    lid[0] = -1;
    lid[1] = -1;
    browAddY[0] = -0.04 * R;
    browAddY[1] = -0.04 * R;
    browAddZ[0] = 0.3;
    browAddZ[1] = -0.3;
    mouth.sx = 1.2;
    mouth.sy = 0.55;
    if (expr.who === "muscle") mouth.rz = 0;
    cheek = 1.12;
    tuftX = -0.35;
    headX = -0.1;
  } else if (mode === "cheer") {
    lid[0] = -1.45;
    lid[1] = -1.45;
    eye = 1.15;
    mouth.sx = 1;
    mouth.sy = 1;
    mouth.rz = 0;
    if (expr.who === "tall") {
      p[0] = [0.3 * Math.cos(t * 8), 0.3 * Math.sin(t * 8)];
      p[1] = [0.3 * Math.cos(t * 8 + 1), 0.3 * Math.sin(t * 8 + 1)];
    }
  } else if (mode === "sulk") {
    lid[0] = -0.9;
    lid[1] = -0.9;
    mouth.sx = 1;
    mouth.sy = 0.12;
    mouth.rz = Math.PI;
    browAddZ[0] = -0.3;
    browAddZ[1] = 0.3;
    headX = 0.35;
  }
  return { lid, mouth, browAddY, browAddZ, eye, pupilMul, p, earFlat, cheek, tuftX, whiskOut, headX };
}

export function writeFace(driver, o) {
  const face = driver.userData.face;
  if (!face || !o) return;
  const eyes = [face.eyeL, face.eyeR];
  const pupils = [face.pupilL, face.pupilR];
  const lids = [face.lidL, face.lidR];
  const brows = [face.browL, face.browR];
  for (let i = 0; i < 2; i++) {
    if (lids[i]) lids[i].rotation.x = o.lid[i];
    const eyeScale = o.eye || 1;
    if (eyes[i]) eyes[i].scale.setScalar(eyeScale);
    const pupil = pupils[i];
    const eye = eyes[i];
    if (pupil && eye && eye.userData.spot) {
      const spot = eye.userData.spot(o.p[i][0], o.p[i][1]);
      // Eye-group scale would shove the pupil off the skull. Keep its world pose at pupilMul.
      pupil.position.copy(spot.pos).multiplyScalar(1 / eyeScale);
      const aimZ = driver.userData.aimZ;
      const n = spot.n.clone().normalize();
      if (aimZ && n.dot(aimZ) < -0.999) pupil.quaternion.set(1, 0, 0, 0);
      else if (aimZ) pupil.quaternion.setFromUnitVectors(aimZ, n);
      const mul = o.pupilMul == null ? 1 : o.pupilMul;
      pupil.scale.setScalar(mul / eyeScale);
      pupil.userData.p = [o.p[i][0], o.p[i][1]];
    }
    if (brows[i]) {
      brows[i].position.y = brows[i].userData.baseY + o.browAddY[i];
      brows[i].rotation.z = brows[i].userData.baseZ + o.browAddZ[i];
    }
  }
  if (face.mouth && o.mouth) {
    face.mouth.position.set(o.mouth.x, o.mouth.y, o.mouth.z);
    face.mouth.scale.set(o.mouth.sx, Math.max(0.02, o.mouth.sy), 1);
    face.mouth.rotation.z = o.mouth.rz;
  }
  if (face.cheekL) face.cheekL.scale.setScalar(o.cheek || 1);
  if (face.cheekR) face.cheekR.scale.setScalar(o.cheek || 1);
  if (face.tufts) face.tufts.rotation.x = o.tuftX || 0;
  if (face.bodyTufts) face.bodyTufts.rotation.x = o.tuftX || 0;
  if (o.whiskOut && face.whiskL) {
    face.whiskL.rotation.y = -o.whiskOut;
    face.whiskL.rotation.z = 0;
    face.whiskR.rotation.y = o.whiskOut;
    face.whiskR.rotation.z = 0;
  }
}

export function applyFacePose(driver, mode, time) {
  const expr = driver.userData.expr;
  const face = driver.userData.face;
  if (!expr || !face) return;
  const o = faceTargets(expr, mode, time || 0);
  writeFace(driver, o);
  [face.earL, face.earR].forEach((ear, i) => {
    if (!ear) return;
    const s = i === 0 ? -1 : 1;
    ear.rotation.z = (ear.userData.baseZ || 0) + s * (o.earFlat || 0);
    ear.rotation.x = ear.userData.baseX || 0;
  });
  if (face.head) face.head.rotation.x = o.headX == null ? 0.08 : o.headX;
  if (face.torso) {
    if (mode === "cheer") face.torso.scale.set(1 / Math.sqrt(1.08), 1.08, 1 / Math.sqrt(1.08));
    else face.torso.scale.set(1, 1, 1);
  }
  if (mode === "cheer") {
    driver.position.y = (driver.userData.baseY || 0) + (expr.who === "nib" ? 0.16 : 0.12);
    if (face.tail) face.tail.rotation.y = 0.35;
    if (expr.who === "bober" && face.browL) face.browL.position.y += Math.sin((time || 0.4) * 10) * 0.03 * expr.R;
    (driver.userData.arms || []).forEach((arm) => {
      const s = arm.userData.side || 1;
      if (expr.who === "muscle" && s < 0) return;
      arm.rotation.z = (arm.userData.baseZ || 0) + s * 2.2;
    });
  } else if (mode === "sulk") {
    driver.position.y = driver.userData.baseY || 0;
    if (face.tail) face.tail.rotation.y = 0.03;
    if (face.head) face.head.rotation.x = 0.35;
  } else {
    driver.position.y = driver.userData.baseY || 0;
    if (face.tail && mode === "rest") face.tail.rotation.y = 0;
  }
}
function bendPaddle(geo, arc) {
  const pos = geo.attributes.position;
  let yMin = Infinity;
  let yMax = -Infinity;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    if (y < yMin) yMin = y;
    if (y > yMax) yMax = y;
  }
  const span = yMax - yMin || 1;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const t = (y - yMin) / span;
    const a = t * arc;
    const cy = Math.cos(a);
    const sy = Math.sin(a);
    pos.setXYZ(i, x, yMin + (y - yMin) * cy, z - (y - yMin) * sy);
  }
  geo.computeVertexNormals();
}

function forkBits(THREE, opt) {
  const parts = [];
  const w = opt.tube * 2.2;
  for (const side of [-1, 1]) {
    parts.push(prep(THREE, board(THREE, 0.025, opt.outer * 0.7, 0.03, 0.02), 0xb0b4b8, WIRON, side * (w + 0.02), opt.outer * 0.25, 0));
  }
  parts.push(prep(THREE, board(THREE, w * 2.4, 0.04, 0.04, 0.02), 0xb0b4b8, WIRON, 0, opt.outer * 0.55, 0));
  parts.push(prep(THREE, tube(THREE, [
    [0, opt.outer * 0.5, 0],
    [opt.strut[0] * 0.45, opt.strut[1] * 0.55, opt.strut[2] * 0.45],
    opt.strut,
  ], 0.02, 5, 5), 0x8a8580, WIRON));
  return parts;
}

function buildBober(THREE, mats, shadow) {
  const g = new THREE.Group();
  const chassis = new THREE.Group();
  g.add(chassis);
  const wood = [];
  const colors = [0xd9c9a3, 0x9fa8ae, 0xb5584a, 0xc97a6b, 0x8e8a82];
  const sideLen = [1.28, 1.4, 1.16, 1.34];
  for (const x of [-0.6, 0.6]) {
    for (let i = 0; i < 4; i++) {
      const len = sideLen[i];
      const plank = board(THREE, len, 0.15, 0.055, 0.028);
      const skew = (i - 1.5) * 0.035 * Math.sign(x);
      wood.push(prep(THREE, plank, colors[(i + (x < 0 ? 0 : 2)) % 5], WOOD, x + skew * 0.4, 0.58 + i * 0.13, -0.02 + (i % 2) * 0.04, 0, Math.PI / 2 + skew, (i - 2) * 0.02));
    }
  }
  for (let i = 0; i < 3; i++) {
    wood.push(prep(THREE, board(THREE, 1.12, 0.15, 0.05, 0.026), colors[(i + 1) % 5], WOOD, (i - 1) * 0.02, 0.62 + i * 0.15, -0.74, 0, (i - 1) * 0.03, 0));
  }
  for (let i = 0; i < 3; i++) {
    wood.push(prep(THREE, board(THREE, 0.36, 1.15, 0.05, 0.024), colors[(i + 3) % 5], WOOD, -0.32 + i * 0.32, 0.5, 0.02, Math.PI / 2, 0, (i - 1) * 0.03));
  }
  const posts = [[-0.62, -0.72], [0.62, -0.72], [-0.62, 0.62], [0.62, 0.66]];
  posts.forEach((p, i) => {
    const h = i === 3 ? 0.55 : 0.78;
    wood.push(prep(THREE, board(THREE, 0.09, 0.09, h, 0.02), 0xcdbb92, WOOD, p[0], 0.48 + h * 0.5, p[1], Math.PI / 2, 0, 0));
  });
  wood.push(prep(THREE, board(THREE, 0.045, 0.28, 0.04, 0.02), 0xcdbb92, WOOD, 0.68, 1.08, 0.66, 0.2, 0, 0.45));
  wood.push(prep(THREE, board(THREE, 0.045, 0.26, 0.04, 0.02), 0xcdbb92, WOOD, 0.56, 1.06, 0.6, -0.15, 0, -0.5));
  const woodMesh = solidMesh(THREE, wood, mats.wood, shadow, "bober-wood");
  chassis.add(woodMesh);
  const spots = [];
  for (const x of [-0.6, 0.6]) {
    for (let i = 0; i < 4; i++) {
      for (const z of [-0.45, 0.05, 0.45]) spots.push([x, 0.6 + i * 0.13, z, x > 0 ? 1 : -1, 0, 0, 0.7]);
    }
  }
  for (let i = 0; i < 3; i++) {
    for (const x of [-0.35, 0, 0.35]) spots.push([x, 0.64 + i * 0.15, -0.78, 0, 0, -1, 0.65]);
  }
  nails(THREE, chassis, spots.slice(0, BUILD.lod ? 24 : 40), 0x2a2622, false);
  const rearR = 0.48;
  const frontR = 0.4;
  const wheelOpt = (outer, tubeR, spokes, mode) => ({
    outer,
    ring: outer - tubeR,
    tube: tubeR,
    radial: BUILD.lod ? 4 : mode === "knob" ? 7 : 6,
    tubular: BUILD.lod ? 12 : mode === "knob" ? 20 : 18,
    spokes,
    mode,
    knobs: 8,
    spokeR: 0.011,
    hubR: outer * 0.18,
    hubW: tubeR * 1.3,
    tireUV: RUBBER,
    spokeUV: WIRON,
    hubUV: WIRON,
    tireColor: 0xffffff,
  });
  const frontWheel = wheelOpt(frontR, frontR * 0.28, 8, "tread");
  const wheels = [
    addAxle(THREE, g, {
      x: 0, y: rearR, z: -0.28, half: 0.78, steer: false,
      wheel: wheelOpt(rearR, rearR * 0.2, 16, "tread"),
    }, mats, shadow),
    addAxle(THREE, g, {
      x: 0.82, y: frontR, z: 1.08, half: 0, steer: true,
      wheel: frontWheel,
      fork: forkBits(THREE, { tube: frontR * 0.22, outer: frontR, strut: [-0.5, 0.32, -0.7] }),
    }, mats, shadow),
  ];
  const crew = addCrew(THREE, chassis, {
    who: "bober",
    seed: 81,
    seat: [0, 0.78, 0.02],
    body: [1.05, 1, 0.92],
    head: [1.2, 1.14, 1.16],
    neckY: 0.95,
    neckZ: 0.08,
    tooth: 0xf08a24,
    toothW: 0.07,
    toothH: 0.16,
    toothD: 0.04,
    scarfA: 0x3fa535,
    scarfB: 0x2e7d2a,
    scarfR: 0.045,
    tails: 2,
    tailLen: 0.72,
    tailGap: 0.14,
    paws: [[-0.52, 0.28, 0.22], [0.52, 0.26, 0.18]],
    tail: { x: 0, y: 0.28, z: -0.62, w: 0.5, l: 0.72, rx: -1.05, ry: 0.12 },
    tufts: 42,
  }, mats, shadow);
  return pack(THREE, g, chassis, wheels, "bober", crew, mats);
}

function buildMuscle(THREE, mats, shadow) {
  const g = new THREE.Group();
  const chassis = new THREE.Group();
  g.add(chassis);
  const metalMat = mats.metal.clone();
  metalMat.emissiveIntensity = 0;
  const plates = [];
  for (const x of [-0.66, 0.66]) {
    plates.push(prep(THREE, board(THREE, 1.25, 0.72, 0.05, 0.03), 0xffffff, RUST, x, 0.78, 0.02, 0, Math.PI / 2, 0));
    for (let i = 0; i < 3; i++) {
      plates.push(prep(THREE, board(THREE, 0.06, 0.7, 0.035, 0.02), 0x5a5654, IRON, x + (x > 0 ? 0.03 : -0.03), 0.78, -0.4 + i * 0.4, 0, Math.PI / 2, 0));
    }
  }
  plates.push(prep(THREE, board(THREE, 1.2, 0.62, 0.05, 0.03), 0xffffff, RUST, 0, 0.78, -0.68));
  plates.push(prep(THREE, board(THREE, 1.15, 1.15, 0.05, 0.028), 0xffffff, RUST, 0, 0.52, 0, Math.PI / 2, 0, 0));
  plates.push(prep(THREE, board(THREE, 1.28, 0.08, 0.05, 0.02), 0x5a5654, IRON, 0, 1.16, 0.02, 0, Math.PI / 2, 0));
  for (const x of [-0.2, 0.2]) {
    const pipe = tube(THREE, [
      [x, 1.05, -0.62],
      [x * 1.1, 1.28, -0.78],
      [x * 1.3, 1.48, -0.7],
    ], 0.055, 6, 6);
    plates.push(prep(THREE, pipe, 0x3a3836, IRON));
    const flange = lathe(THREE, [[0.04, 0], [0.09, 0.015], [0.09, 0.04], [0.05, 0.05]], 8);
    plates.push(prep(THREE, flange, 0x3a3836, IRON, x * 1.3, 1.5, -0.7, 0.4, 0, 0));
  }
  const cart = solidMesh(THREE, plates, metalMat, shadow, "muscle-metal");
  chassis.add(cart);
  const spots = [];
  for (const x of [-0.66, 0.66]) {
    for (let i = 0; i < 5; i++) {
      for (let j = 0; j < 4; j++) spots.push([x + (x > 0 ? 0.04 : -0.04), 0.5 + j * 0.16, -0.5 + i * 0.24, x > 0 ? 1 : -1, 0, 0, 1.15]);
    }
  }
  for (let i = 0; i < 8; i++) spots.push([-0.45 + i * 0.13, 0.78, -0.72, 0, 0, -1, 1.1]);
  nails(THREE, chassis, spots.slice(0, BUILD.lod ? 60 : 100), 0xc8c2ba, false);
  const rearR = 0.5;
  const frontR = 0.38;
  const wheelOpt = (outer, tubeR, spokes, mode) => ({
    outer,
    ring: outer - tubeR,
    tube: tubeR,
    radial: 6,
    tubular: mode === "knob" ? 24 : 16,
    spokes,
    mode,
    knobs: 9,
    spokeR: 0.014,
    hubR: outer * 0.2,
    hubW: tubeR * 1.1,
    tireUV: RUBBER,
    spokeUV: WIRON,
    hubUV: WIRON,
  });
  const wheels = [
    addAxle(THREE, g, {
      x: 0, y: rearR, z: -0.32, half: 0.86, steer: false,
      wheel: wheelOpt(rearR, rearR * 0.24, 12, "knob"),
    }, mats, shadow),
    addAxle(THREE, g, {
      x: 0.6, y: frontR, z: 1.02, half: 0, steer: true,
      wheel: wheelOpt(frontR, frontR * 0.28, 8, "knob"),
      fork: forkBits(THREE, { tube: frontR * 0.24, outer: frontR, strut: [-0.52, 0.34, -0.72] }),
    }, mats, shadow),
  ];
  const crew = addCrew(THREE, chassis, {
    who: "muscle",
    seed: 82,
    seat: [0, 0.86, 0.04],
    body: [1.22, 0.96, 0.9],
    head: [1.18, 1.1, 1.12],
    neckY: 0.9,
    neckZ: 0.1,
    tooth: 0xefe3c2,
    toothW: 0.08,
    toothH: 0.16,
    toothD: 0.042,
    scarfA: 0xc4432a,
    scarfB: 0x9a301c,
    scarfR: 0.055,
    chunky: true,
    tails: 2,
    tailLen: 0.58,
    tailGap: 0.16,
    paws: [[-0.62, 0.32, 0.2], [0.6, 0.3, 0.16]],
    tail: { x: 0, y: 0.24, z: -0.55, w: 0.48, l: 0.62, rx: -1.0, ry: 0.1 },
    tufts: 40,
  }, mats, shadow);
  const flameGeos = [];
  const clusters = [];
  for (const x of [-0.26, 0.26]) {
    const origin = [x, 1.58, -0.72];
    const start = countVerts(flameGeos);
    const a = stamp(new THREE.PlaneGeometry(0.2, 0.46));
    const b = stamp(new THREE.PlaneGeometry(0.2, 0.46));
    flameGeos.push(prep(THREE, a, 0xffffff, null, origin[0], origin[1] + 0.2, origin[2]));
    flameGeos.push(prep(THREE, b, 0xffffff, null, origin[0], origin[1] + 0.2, origin[2], 0, Math.PI / 2, 0));
    const count = countVerts(flameGeos) - start;
    const indices = [];
    for (let i = 0; i < count; i++) indices.push(start + i);
    clusters.push({ o: origin, indices });
  }
  const flameMesh = solidMesh(THREE, flameGeos, mats.flame, false, "flames");
  flameMesh.userData.manual = true;
  chassis.add(flameMesh);
  const flames = [new THREE.Object3D(), new THREE.Object3D()];
  flames.forEach((f) => {
    f.userData.manual = true;
    chassis.add(f);
  });
  const built = pack(THREE, g, chassis, wheels, "muscle", crew, mats);
  built.flames = flames;
  const prev = built.pose;
  const flick = flamePose(flameMesh, clusters);
  built.pose = (time, speed, boost) => {
    prev(time, speed, boost);
    flick(time, boost);
  };
  return built;
}

function buildNib(THREE, mats, shadow) {
  const g = new THREE.Group();
  const chassis = new THREE.Group();
  g.add(chassis);
  const wood = [];
  const tones = [0x4a3a2c, 0x5e4a36];
  for (const x of [-0.68, 0.68]) {
    for (let i = 0; i < 3; i++) {
      wood.push(prep(THREE, board(THREE, 1.55, 0.2, 0.05, 0.024), tones[i % 2], WOOD, x, 0.62 + i * 0.2, 0, 0, Math.PI / 2, (i - 1) * 0.015));
    }
  }
  for (let i = 0; i < 2; i++) {
    wood.push(prep(THREE, board(THREE, 1.25, 0.2, 0.05, 0.024), tones[i], WOOD, 0, 0.7 + i * 0.22, -0.78));
    wood.push(prep(THREE, board(THREE, 1.2, 0.16, 0.045, 0.02), tones[1], WOOD, 0, 0.7 + i * 0.18, 0.72));
  }
  wood.push(prep(THREE, board(THREE, 1.2, 1.45, 0.05, 0.024), 0x5e4a36, WOOD, 0, 0.55, 0, Math.PI / 2, 0, 0));
  const logLathe = lathe(THREE, [[0.07, 0], [0.09, 0.04], [0.085, 0.2], [0.09, 0.4], [0.06, 0.48]], 8);
  for (let i = 0; i < (BUILD.lod ? 3 : 5); i++) {
    wood.push(prep(THREE, logLathe, i % 2 ? 0x4a3a2c : 0x5e4a36, WOOD, -0.28 + (i % 3) * 0.2, 1.22 + Math.floor(i / 3) * 0.16, -0.48, 0, 0, Math.PI / 2));
  }
  const crates = BUILD.lod ? [-0.05] : [-0.05, 0.38];
  for (const x of crates) {
    wood.push(prep(THREE, board(THREE, 0.36, 0.28, 0.32, 0.02), 0x5e4a36, WOOD, x, 1.18, -0.42, 0, 0.15, 0));
  }
  const belt = tube(THREE, [[-0.45, 1.28, -0.2], [0, 1.48, -0.5], [0.5, 1.3, -0.7]], 0.02, 6, 4);
  wood.push(prep(THREE, belt, 0x6a4128, LEATHER_W));
  const buckle = board(THREE, 0.08, 0.06, 0.02, 0.02);
  wood.push(prep(THREE, buckle, 0xc8c2ba, LEATHER_W, 0.15, 1.42, -0.48));
  for (const z of [-0.15, 0.55]) {
    const pole = board(THREE, 0.06, 0.06, 0.7, 0.02);
    wood.push(prep(THREE, pole, 0x5e4a36, WOOD, -0.16, 0.48, z, Math.PI / 2, 0, 0));
    wood.push(prep(THREE, pole, 0x5e4a36, WOOD, 0.16, 0.48, z, Math.PI / 2, 0, 0));
  }
  chassis.add(solidMesh(THREE, wood, mats.wood, shadow, "nib-wood"));

  const metalMat = mats.metal.clone();
  metalMat.emissiveIntensity = 1.15;
  const iron = [];
  const bandY = BUILD.lod ? [0.7, 1.02] : [0.62, 0.82, 1.02];
  for (const y of bandY) {
    iron.push(prep(THREE, board(THREE, 1.42, 0.045, 0.02, 0.02), 0xffffff, IRON, 0, y, 0.76));
    iron.push(prep(THREE, board(THREE, 1.42, 0.045, 0.02, 0.02), 0xffffff, IRON, 0, y, -0.8));
  }
  if (!BUILD.lod) {
    for (const x of [-0.68, 0.68]) {
      iron.push(prep(THREE, board(THREE, 0.05, 0.06, 1.5, 0.02), 0xffffff, IRON, x, 0.78, 0, 0, Math.PI / 2, 0));
    }
  }
  iron.push(prep(THREE, board(THREE, 0.34, 0.26, 0.02, 0.02), 0xffffff, RUST, 0.42, 0.9, 0.78));
  iron.push(prep(THREE, board(THREE, 0.3, 0.22, 0.02, 0.02), 0xffffff, RUST, -0.3, 0.78, -0.82));
  iron.push(prep(THREE, board(THREE, 0.28, 0.2, 0.02, 0.02), 0xffffff, RUST, 0.2, 0.7, -0.82));
  const draw = tube(THREE, [[-0.12, 0.5, 0.7], [0, 0.46, 1.15], [0.12, 0.5, 0.7]], 0.025, 4, 4);
  iron.push(prep(THREE, draw, 0xffffff, IRON));
  const lanterns = [];
  const clusters = [];
  const lamps = [[-0.78, 0.95, 0.48], [0.78, 0.95, -0.62]];
  lamps.forEach((p, i) => {
    const hang = new THREE.Object3D();
    hang.position.set(p[0], p[1], p[2]);
    hang.userData.glow = metalMat;
    chassis.add(hang);
    lanterns.push(hang);
    iron.push(prep(THREE, board(THREE, 0.08, 0.08, 0.12, 0.02), 0xffffff, BRASS, p[0], p[1], p[2], 0, Math.PI / 2, 0));
    const start = countVerts(iron);
    const glass = lathe(THREE, [[0.02, 0], [0.07, 0.03], [0.08, 0.1], [0.05, 0.16], [0.02, 0.18]], 10);
    iron.push(prep(THREE, glass, 0xffffff, GLASS, p[0], p[1] - 0.2, p[2]));
    if (!BUILD.lod) {
      for (const side of [-1, 1]) {
        iron.push(prep(THREE, chip(THREE, 0.02, 0.16, 0.02), 0xffffff, BRASS, p[0] + side * 0.07, p[1] - 0.18, p[2]));
        iron.push(prep(THREE, chip(THREE, 0.02, 0.16, 0.02), 0xffffff, BRASS, p[0], p[1] - 0.18, p[2] + side * 0.07));
      }
    }
    iron.push(prep(THREE, chip(THREE, 0.16, 0.04, 0.16), 0xffffff, BRASS, p[0], p[1] - 0.08, p[2]));
    iron.push(prep(THREE, tube(THREE, [[p[0], p[1], p[2]], [p[0], p[1] - 0.08, p[2]]], 0.008, 2, 4), 0xffffff, BRASS));
    clusters.push({ i, start, count: countVerts(iron) - start, p });
  });
  const metalMesh = solidMesh(THREE, iron, metalMat, shadow, "nib-iron");
  chassis.add(metalMesh);
  const spots = [];
  for (const y of [0.62, 0.82, 1.02]) {
    for (const x of [-0.5, -0.2, 0.15, 0.45]) spots.push([x, y, 0.78, 0, 0, 1, 0.85]);
  }
  for (let i = 0; i < 8; i++) spots.push([-0.55 + (i % 4) * 0.3, 0.7 + Math.floor(i / 4) * 0.25, -0.82, 0, 0, -1, 0.8]);
  for (const x of [-0.68, 0.68]) {
    for (let i = 0; i < 6; i++) spots.push([x, 0.78, -0.6 + i * 0.22, x > 0 ? 1 : -1, 0, 0, 0.75]);
  }
  nails(THREE, chassis, spots.filter((_, i) => !BUILD.lod || i % 2 === 0), 0xd5d8dc, false);

  const cartH = 1.05;
  const rearR = cartH * 0.75 * 0.5;
  const frontR = cartH * 0.65 * 0.5;
  const woodWheel = (outer) => ({
    outer,
    ring: outer - outer * 0.12,
    tube: outer * 0.12,
    radial: BUILD.lod ? 4 : 6,
    tubular: BUILD.lod ? 10 : 16,
    spokes: 12,
    mode: "tread",
    spokeR: 0.012,
    hubR: outer * 0.16,
    hubW: outer * 0.08,
    tireUV: WWOOD,
    spokeUV: WWOOD,
    hubUV: WIRON,
    band: true,
  });
  const wheels = [
    addAxle(THREE, g, { x: 0, y: rearR, z: -0.48, half: 0.84, steer: false, wheel: woodWheel(rearR) }, mats, shadow),
    addAxle(THREE, g, { x: 0, y: frontR, z: 0.58, half: 0.8, steer: true, wheel: woodWheel(frontR) }, mats, shadow),
  ];
  const crew = addCrew(THREE, chassis, {
    who: "nib",
    seed: 84,
    seat: [0, 0.82, 0.12],
    body: [1.02, 0.98, 0.9],
    head: [1.16, 1.1, 1.1],
    neckY: 0.9,
    neckZ: 0.1,
    tooth: 0xe8b84a,
    toothW: 0.07,
    toothH: 0.15,
    toothD: 0.04,
    scarfA: 0xb53a2a,
    scarfB: 0x8a2a22,
    scarfR: 0.038,
    tatter: true,
    tails: 2,
    tailLen: 0.55,
    tailGap: 0.12,
    harness: true,
    reins: true,
    paws: [[-0.22, 0.32, 0.42], [0.22, 0.32, 0.42]],
    tail: { x: 0, y: 0.22, z: -0.58, w: 0.46, l: 0.64, rx: -1.0, ry: 0.08 },
    tufts: 36,
  }, mats, shadow);
  const built = pack(THREE, g, chassis, wheels, "nib", crew, mats);
  built.lanterns = lanterns;
  const swing = lanternPose(THREE, metalMesh, clusters, lanterns);
  const prev = built.pose;
  built.pose = (time, speed, boost) => {
    prev(time, speed, boost);
    swing();
  };
  return built;
}

function buildTall(THREE, mats, shadow) {
  const g = new THREE.Group();
  const chassis = new THREE.Group();
  g.add(chassis);
  const woodMat = mats.wood.clone();
  woodMat.roughness = 0.35;
  const wood = [];
  const tones = [0xb5522e, 0xd1703f, 0x7a3620];
  for (const x of [-0.62, 0.62]) {
    for (let i = 0; i < 2; i++) {
      wood.push(prep(THREE, board(THREE, 1.45, 0.28, 0.07, 0.03), tones[(i + (x < 0 ? 0 : 1)) % 3], WOOD, x, 0.7 + i * 0.28, 0.02, 0, Math.PI / 2, 0));
    }
  }
  for (const z of [-0.74, 0.76]) {
    wood.push(prep(THREE, board(THREE, 1.2, 0.32, 0.06, 0.03), tones[z < 0 ? 2 : 0], WOOD, 0, 0.78, z));
    wood.push(prep(THREE, board(THREE, 1.16, 0.22, 0.055, 0.028), tones[1], WOOD, 0, 1.05, z));
  }
  wood.push(prep(THREE, board(THREE, 1.15, 1.4, 0.06, 0.03), 0xb5522e, WOOD, 0, 0.58, 0.02, Math.PI / 2, 0, 0));
  chassis.add(solidMesh(THREE, wood, woodMat, shadow, "tall-wood"));
  const brassMat = mats.metal.clone();
  brassMat.emissiveIntensity = 0;
  const brass = [];
  const corners = [[-0.62, 0.58, 0.76], [0.62, 0.58, 0.76], [-0.62, 1.05, 0.76], [0.62, 1.05, 0.76], [-0.62, 0.58, -0.74], [0.62, 0.58, -0.74], [-0.62, 1.05, -0.74], [0.62, 1.05, -0.74]];
  for (const c of corners) {
    const sx = c[0] > 0 ? -1 : 1;
    const sz = c[2] > 0 ? 1 : -1;
    brass.push(prep(THREE, lBracket(THREE, 0.2, 0.18, 0.035), 0xffffff, BRASS, c[0], c[1], c[2] + sz * 0.02, 0, c[2] > 0 ? 0 : Math.PI, 0, sx, 1, 1));
    brass.push(prep(THREE, lBracket(THREE, 0.16, 0.14, 0.03), 0xffffff, BRASS, c[0] + sx * -0.02, c[1], c[2], 0, Math.PI / 2 * sz, 0));
  }
  chassis.add(solidMesh(THREE, brass, brassMat, shadow, "tall-brass"));
  const spots = [];
  for (const c of corners) {
    spots.push([c[0], c[1], c[2] + Math.sign(c[2]) * 0.04, 0, 0, Math.sign(c[2]), 0.7]);
    spots.push([c[0] + Math.sign(c[0]) * 0.08, c[1], c[2], Math.sign(c[0]), 0, 0, 0.65]);
  }
  for (let i = 0; i < 8; i++) spots.push([-0.4 + i * 0.11, 1.2, 0.78, 0, 0, 1, 0.55]);
  nails(THREE, chassis, spots.slice(0, BUILD.lod ? 16 : 32), 0xc9a544, false);
  const cartH = 1.15;
  const radius = cartH * 0.8 * 0.5;
  const woodWheel = {
    outer: radius,
    ring: radius * 0.8,
    tube: radius * 0.11,
    radial: BUILD.lod ? 4 : 6,
    tubular: BUILD.lod ? 10 : 16,
    spokes: 12,
    mode: "tread",
    spokeR: 0.013,
    hubR: radius * 0.16,
    hubW: radius * 0.09,
    tireUV: WWOOD,
    spokeUV: WWOOD,
    hubUV: WIRON,
    hubColor: 0xf0d48a,
    band: true,
  };
  const wheels = [
    addAxle(THREE, g, { x: 0, y: radius, z: -0.5, half: 0.78, steer: false, wheel: woodWheel }, mats, shadow),
    addAxle(THREE, g, { x: 0, y: radius, z: 0.62, half: 0.78, steer: true, wheel: woodWheel }, mats, shadow),
  ];
  const crew = addCrew(THREE, chassis, {
    who: "tall",
    seed: 83,
    seat: [0, 0.95, 0.02],
    body: [0.82, 1.12, 0.72],
    head: [1.28, 1.18, 1.2],
    neckY: 1.12,
    neckZ: 0.12,
    tooth: 0xf6ebd9,
    toothW: 0.08,
    toothH: 0.18,
    toothD: 0.042,
    eyeBig: true,
    tongue: true,
    scarfA: 0xe88a1a,
    scarfB: 0xc46a10,
    scarfR: 0.042,
    knot: true,
    tails: 2,
    tailLen: 0.7,
    tailGap: 0.1,
    paws: [[-0.28, 0.28, 0.62], [0.28, 0.28, 0.62]],
    tail: { x: 0.05, y: 0.12, z: -1.15, w: 0.72, l: 0.98, rx: -1.2, ry: 0.15, rz: -0.1 },
    tufts: 38,
  }, mats, shadow);
  return pack(THREE, g, chassis, wheels, "tall", crew, mats);
}

function pack(THREE, g, chassis, wheels, kind, crew) {
  const rear = new THREE.Object3D();
  rear.name = "rearPost";
  rear.position.set(0, 0.85, -1.05);
  g.add(rear);
  const blob = new THREE.Mesh(
    stamp(new THREE.CircleGeometry(1.25, 16)),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28, depthWrite: false })
  );
  blob.rotation.x = -Math.PI / 2;
  blob.position.y = 0.02;
  g.userData.kind = kind;
  g.userData.sig = SIG[kind];
  g.scale.setScalar(1.2);
  const spinLock = lockPose(wheels);
  const pose = (time, speed) => {
    crew.scarfFn(time, Math.min(1.6, speed / 14));
    crew.tailFn(time, speed);
    spinLock();
  };
  let draws = 0;
  let tris = 0;
  g.traverse((o) => {
    if (o.userData && o.userData.artProbe) return;
    if (!o.isMesh && !o.isInstancedMesh) return;
    draws += 1;
    const geo = o.geometry;
    const n = geo.index ? geo.index.count / 3 : geo.attributes.position.count / 3;
    tris += n * (o.isInstancedMesh ? o.count : 1);
  });
  g.userData.draws = draws;
  g.userData.tris = Math.round(tris);
  g.userData.made = MADE.slice();
  g.userData.lod = BUILD.lod;
  return {
    group: g,
    wheels,
    blob,
    rear,
    chassis,
    driver: crew.driver,
    head: crew.head,
    arms: crew.arms,
    face: crew.face,
    scarfTails: crew.scarfTails,
    flames: [],
    lanterns: [],
    pose,
  };
}

export function buildKart(THREE, def, _wood, opts) {
  MADE.length = 0;
  BUILD.lod = !!(opts && opts.lod);
  BUILD.curve = BUILD.lod ? 1 : 2;
  const mats = materials(THREE);
  const id = def && def.id;
  const shadow = !BUILD.lod;
  if (id === "muscle") return buildMuscle(THREE, mats, shadow);
  if (id === "tall") return buildTall(THREE, mats, shadow);
  if (id === "nib") return buildNib(THREE, mats, shadow);
  return buildBober(THREE, mats, shadow);
}

const FACE_NAMES = [
  "muzzle", "nose", "nostrilL", "nostrilR", "toothL", "toothR",
  "eyeWhiteL", "eyeWhiteR", "irisL", "irisR", "pupilL", "pupilR",
  "browL", "browR", "earL", "earR", "cheekL", "cheekR",
  "mouth", "lidL", "lidR",
];
const FUR_NAMES = ["crown0", "crown1", "crown2", "napeL", "napeR", "cheekFurL", "cheekFurR"];
const WHISKER_NAMES = ["whiskerL0", "whiskerR0", "whiskerL1", "whiskerR1", "whiskerL2", "whiskerR2"];

export function checkArt(THREE, kart) {
  const fails = [];
  const g = kart.group;
  g.updateMatrixWorld(true);
  const driver = kart.driver;
  const head = kart.head;
  const info = driver.userData.beaver || {};
  const parts = driver.userData.parts || {};
  const banned = ["BoxGeometry", "SphereGeometry", "CylinderGeometry", "CapsuleGeometry"];
  for (const t of g.userData.made || []) {
    if (banned.indexOf(t) >= 0) fails.push((info.who || "crew") + " bare " + t);
  }
  const skull = head.getObjectByName("skull");
  if (!skull || !skull.geometry) {
    fails.push((info.who || "?") + " skull missing");
    return fails;
  }
  skull.geometry.computeBoundingSphere();
  const center = skull.geometry.boundingSphere.center.clone().applyMatrix4(skull.matrixWorld);
  const origin = new THREE.Vector3();
  head.getWorldPosition(origin);
  const centerDist = center.distanceTo(origin);
  if (centerDist > 0.01) fails.push(info.who + " skull center " + centerDist.toFixed(4));
  const ws = new THREE.Vector3();
  g.getWorldScale(ws);
  const radius = info.R * Math.max(info.S[0], info.S[1], info.S[2]) * ws.x;
  const sphere = new THREE.Sphere(origin, radius);
  const names = FACE_NAMES.slice();
  if (!info.lod) names.push(...WHISKER_NAMES, ...FUR_NAMES);
  for (const name of names) {
    const mesh = parts[name];
    if (!mesh) {
      fails.push(info.who + " " + name + " missing");
      continue;
    }
    const box = new THREE.Box3().setFromObject(mesh);
    if (box.isEmpty() || !box.intersectsSphere(sphere)) fails.push(info.who + " " + name + " off skull");
  }
  const overlap = (a, b) => {
    if (!parts[a] || !parts[b]) return;
    const ba = new THREE.Box3().setFromObject(parts[a]);
    const bb = new THREE.Box3().setFromObject(parts[b]);
    if (!ba.intersectsBox(bb)) fails.push(info.who + " " + a + " misses " + b);
  };
  overlap("irisL", "eyeWhiteL");
  overlap("irisR", "eyeWhiteR");
  overlap("pupilL", "eyeWhiteL");
  overlap("pupilR", "eyeWhiteR");
  overlap("toothL", "muzzle");
  overlap("toothR", "muzzle");
  const torso = parts.torso;
  if (!torso) fails.push(info.who + " torso missing");
  else {
    const pos = torso.geometry.attributes.position;
    const v = new THREE.Vector3();
    let best = new THREE.Vector3();
    let maxY = -Infinity;
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).applyMatrix4(torso.matrixWorld);
      if (v.y > maxY) {
        maxY = v.y;
        best.copy(v);
      }
    }
    const pen = radius - best.distanceTo(origin);
    if (pen < 0.15 * radius * 2) fails.push(info.who + " neck " + pen.toFixed(3));
  }
  const driverInv = new THREE.Matrix4().copy(driver.matrixWorld).invert();
  const localOf = (mesh) => {
    const pos = mesh.geometry.attributes.position;
    const v = new THREE.Vector3();
    const out = [];
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld).applyMatrix4(driverInv);
      out.push(v.clone());
    }
    return out;
  };
  const pawOf = (x) => (info.paws[0][0] < 0 ? (x < 0 ? info.paws[0] : info.paws[1]) : (x < 0 ? info.paws[1] : info.paws[0]));
  const endCheck = (name, paw) => {
    const mesh = parts[name];
    if (!mesh) {
      fails.push(info.who + " " + name + " missing");
      return;
    }
    const target = new THREE.Vector3(paw[0], paw[1], paw[2]);
    const pts = localOf(mesh);
    const mid = new THREE.Vector3();
    for (const p of pts) mid.add(p);
    mid.multiplyScalar(1 / Math.max(1, pts.length));
    const axis = target.clone().sub(mid);
    if (axis.lengthSq() < 1e-8) axis.set(0, 0, 1);
    axis.normalize();
    let maxD = -Infinity;
    const dots = [];
    for (const p of pts) {
      const d = p.dot(axis);
      dots.push(d);
      if (d > maxD) maxD = d;
    }
    const c = new THREE.Vector3();
    let n = 0;
    for (let i = 0; i < pts.length; i++) {
      if (dots[i] < maxD - 0.012) continue;
      c.add(pts[i]);
      n += 1;
    }
    if (n) c.multiplyScalar(1 / n);
    const dist = c.distanceTo(target);
    if (dist > 0.03) fails.push(info.who + " " + name + " end " + dist.toFixed(3));
  };
  endCheck("armForeL", pawOf(-1));
  endCheck("armForeR", pawOf(1));
  const bottomCheck = (name, paw) => {
    const mesh = parts[name];
    if (!mesh) {
      fails.push(info.who + " " + name + " missing");
      return;
    }
    let minY = Infinity;
    for (const p of localOf(mesh)) if (p.y < minY) minY = p.y;
    if (Math.abs(minY - paw[1]) > 0.02) fails.push(info.who + " " + name + " bottom " + minY.toFixed(3));
  };
  bottomCheck("pawL", pawOf(-1));
  bottomCheck("pawR", pawOf(1));
  const tail = parts.tail;
  if (!tail) fails.push(info.who + " tail missing");
  else {
    const rimZ = info.rimZ - info.seatZ;
    const rimY = info.rimY - info.seatY;
    const onRim = Math.abs(tail.position.z - rimZ) < 0.15 && Math.abs(tail.position.y - (rimY + 0.03)) < 0.12;
    let inTorso = false;
    if (torso) {
      const tb = new THREE.Box3().setFromObject(torso);
      const rw = new THREE.Vector3();
      tail.getWorldPosition(rw);
      inTorso = tb.distanceToPoint(rw) < 0.08;
    }
    if (!onRim && !inTorso) fails.push(info.who + " tail root");
    const pos = tail.geometry.attributes.position;
    const v = new THREE.Vector3();
    let tip = new THREE.Vector3();
    let minZ = Infinity;
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      if (v.z < minZ) {
        minZ = v.z;
        tip.copy(v);
      }
    }
    tip.applyMatrix4(tail.matrixWorld);
    if (tip.y < 0.25) fails.push(info.who + " tail tip " + tip.y.toFixed(3));
  }
  const cap = info.lod ? 3000 : 5000;
  if ((driver.userData.crewTris || 0) > cap) fails.push(info.who + " tris " + driver.userData.crewTris + "/" + cap);
  driver.traverse((o) => {
    if (!o.isMesh || (o.userData && o.userData.artProbe)) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    for (let i = 0; i < mats.length; i++) {
      if (mats[i] && mats[i].flatShading) fails.push(info.who + " flat " + (o.name || "mesh"));
    }
    if (!o.geometry || !o.geometry.attributes || !o.geometry.attributes.normal) {
      fails.push(info.who + " no normal " + (o.name || "mesh"));
    }
  });
  const smooth = driver.userData.smooth || {};
  const meanAngle = (geo) => {
    const nor = geo.attributes.normal;
    const index = geo.index;
    if (!nor || !index) return 90;
    const a = new THREE.Vector3();
    const b = new THREE.Vector3();
    let sum = 0;
    let n = 0;
    for (let i = 0; i < index.count; i += 3) {
      const tri = [index.getX(i), index.getX(i + 1), index.getX(i + 2)];
      for (let e = 0; e < 3; e++) {
        a.fromBufferAttribute(nor, tri[e]);
        b.fromBufferAttribute(nor, tri[(e + 1) % 3]);
        const d = Math.max(-1, Math.min(1, a.dot(b) / ((a.length() || 1) * (b.length() || 1))));
        sum += Math.acos(d) * 180 / Math.PI;
        n += 1;
      }
    }
    return n ? sum / n : 0;
  };
  for (const key of ["skull", "torso"]) {
    const geo = smooth[key];
    const tris = geo && geo.index ? geo.index.count / 3 : 0;
    const verts = geo && geo.attributes ? geo.attributes.position.count : 0;
    if (!geo || !geo.attributes.normal || verts < 0.45 * tris || verts > 1.5 * tris) {
      fails.push(info.who + " " + key + " weld " + verts + "/" + Math.round(tris));
    } else {
      const ang = meanAngle(geo);
      if (ang >= 20) fails.push(info.who + " " + key + " facet " + ang.toFixed(1));
    }
  }
  const maxExceed = (obj) => {
    let over = -Infinity;
    const v = new THREE.Vector3();
    obj.traverse((o) => {
      if (!o.isMesh || !o.geometry || !o.geometry.attributes.position) return;
      if (o.userData && o.userData.artProbe) return;
      const pos = o.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld);
        over = Math.max(over, v.distanceTo(origin) - radius);
      }
    });
    return over;
  };
  const limit = 0.15 * info.R * ws.x;
  const poseNames = ["mouth", "lidL", "lidR", "browL", "browR", "pupilL", "pupilR"];
  const poseCheck = (label) => {
    g.updateMatrixWorld(true);
    for (let i = 0; i < poseNames.length; i++) {
      const name = poseNames[i];
      const mesh = parts[name];
      if (!mesh) {
        fails.push(info.who + " " + label + " " + name + " missing");
        continue;
      }
      const box = new THREE.Box3().setFromObject(mesh);
      if (box.isEmpty() || !box.intersectsSphere(sphere)) fails.push(info.who + " " + label + " " + name + " off skull");
      if (name === "mouth" || name.indexOf("pupil") === 0) {
        const over = maxExceed(mesh);
        if (over > limit) fails.push(info.who + " " + label + " " + name + " exceed " + over.toFixed(3));
      }
    }
    const pupils = [parts.pupilL, parts.pupilR];
    for (let i = 0; i < pupils.length; i++) {
      const p = (pupils[i] && pupils[i].userData && pupils[i].userData.p) || [0, 0];
      const mag = Math.hypot(p[0], p[1]);
      if (mag > 0.451) fails.push(info.who + " " + label + " pupil " + mag.toFixed(3));
    }
  };
  poseCheck("rest");
  applyFacePose(driver, "panic", 0.2);
  poseCheck("panic");
  applyFacePose(driver, "rest", 0);
  return fails;
}
