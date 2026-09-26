/* Painted carts. Nose is local +z, rear marker is local -z.
   Static parts merge by material. Nails and rivets are instanced.
   Player detail is the full mesh; CPU detail drops whiskers, tufts, and spokes. */

import { mergeGeometries } from "../vendor/BufferGeometryUtils.js?v=gd42";

const GEO = new Map();
const BUILD = { lod: false, curve: 2 };
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

function prep(THREE, src, color, region, x, y, z, rx, ry, rz, sx, sy, sz) {
  const g = src.index ? src.toNonIndexed() : src.clone();
  const o = new THREE.Object3D();
  o.position.set(x || 0, y || 0, z || 0);
  o.rotation.set(rx || 0, ry || 0, rz || 0);
  const fx = sx || 1;
  o.scale.set(fx, sy == null ? fx : sy, sz == null ? fx : sz);
  o.updateMatrix();
  g.applyMatrix4(o.matrix);
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
  return g;
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
  return g;
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
  return g;
}

function lathe(THREE, pts, segs) {
  const key = "lat" + segs + ":" + pts.map((p) => p[0] + "," + p[1]).join(";");
  let g = GEO.get(key);
  if (!g) {
    g = new THREE.LatheGeometry(pts.map((p) => new THREE.Vector2(p[0], p[1])), segs);
    GEO.set(key, g);
  }
  return g;
}

function tube(THREE, points, radius, tubular, radial) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(p[0], p[1], p[2])));
  return new THREE.TubeGeometry(curve, tubular, radius, radial, false);
}

function lineTube(THREE, a, b, radius, radial) {
  const curve = new THREE.LineCurve3(new THREE.Vector3(a[0], a[1], a[2]), new THREE.Vector3(b[0], b[1], b[2]));
  return new THREE.TubeGeometry(curve, 1, radius, radial || 4, false);
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
  const tire = new THREE.TorusGeometry(opt.ring, opt.tube, opt.radial, opt.tubular);
  displaceTire(tire, opt.mode, opt.knobs || 10);
  parts.push(prep(THREE, tire, opt.tireColor || 0xffffff, opt.tireUV, xOff, 0, 0, 0, Math.PI / 2, 0));
  if (opt.band) {
    const band = new THREE.TorusGeometry(opt.ring + opt.tube * 0.82, opt.tube * 0.28, 4, opt.tubular);
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

function pearGeo(THREE) {
  return lathe(THREE, [
    [0.04, 0], [0.16, 0.06], [0.3, 0.2], [0.4, 0.4], [0.48, 0.62],
    [0.4, 0.84], [0.28, 1.02], [0.16, 1.18], [0.06, 1.28],
  ], BUILD.lod ? 12 : 16);
}

function headGeo(THREE) {
  return lathe(THREE, [
    [0.05, 0], [0.12, 0.03], [0.18, 0.1], [0.22, 0.2],
    [0.2, 0.32], [0.14, 0.42], [0.07, 0.48], [0.02, 0.52],
  ], BUILD.lod ? 10 : 14);
}

function muzzleGeo(THREE) {
  return lathe(THREE, [
    [0.012, 0], [0.05, 0.02], [0.09, 0.07], [0.11, 0.14],
    [0.1, 0.24], [0.07, 0.34], [0.035, 0.4],
  ], BUILD.lod ? 8 : 12);
}

function earGeo(THREE) {
  return lathe(THREE, [[0.02, 0], [0.09, 0.03], [0.11, 0.09], [0.06, 0.15], [0.02, 0.18]], BUILD.lod ? 6 : 8);
}

function addCrew(THREE, chassis, spec, mats, shadow) {
  const driver = new THREE.Group();
  driver.position.set(spec.seat[0], spec.seat[1], spec.seat[2]);
  driver.userData.baseY = spec.seat[1];
  const bodyParts = [];
  const fur = 0xffffff;
  bodyParts.push(prep(THREE, pearGeo(THREE), spec.fur || 0x6b4226, FUR, 0, -0.42, 0, 0, 0, 0, spec.body[0], spec.body[1], spec.body[2]));
  const belly = lathe(THREE, [[0.02, 0], [0.16, 0.04], [0.2, 0.16], [0.1, 0.26], [0.02, 0.3]], 12);
  bodyParts.push(prep(THREE, belly, 0x5a3820, FUR, 0, -0.05, spec.body[2] * 0.28, 0.4, 0, 0, spec.body[0] * 0.7, 0.7, 0.55));
  const rand = rng(spec.seed);
  const tufts = BUILD.lod ? 16 : spec.tufts || 40;
  const card = new THREE.PlaneGeometry(0.07, 0.11);
  for (let i = 0; i < tufts; i++) {
    const y = -0.2 + rand() * 1.15;
    const ang = rand() * 6.28;
    const chest = y > 0.2 && y < 0.85;
    const rad = 0.16 + (chest ? 0.12 : 0.05) + rand() * 0.04;
    const x = Math.cos(ang) * rad * spec.body[0];
    const z = Math.sin(ang) * rad * spec.body[2];
    const tip = i % 3 === 0 ? 0xa06a3c : 0x8b5a2b;
    bodyParts.push(prep(THREE, card, tip, FUR, x, y, z, (rand() - 0.5) * 0.5, ang, (rand() - 0.5) * 0.8));
  }
  const shoulderBulb = lathe(THREE, [[0.02, 0], [0.09, 0.02], [0.11, 0.08], [0.04, 0.14]], BUILD.lod ? 6 : 8);
  for (const side of [-1, 1]) {
    bodyParts.push(prep(THREE, shoulderBulb, spec.fur || 0x6b4226, FUR, side * 0.34 * spec.body[0], 0.55, 0.02));
    if (BUILD.lod && side > 0) continue;
    for (let i = 0; i < (BUILD.lod ? 2 : 4); i++) {
      const ang = -0.4 + i * 0.35;
      bodyParts.push(prep(
        THREE,
        card,
        i % 2 ? 0xa06a3c : 0xc4926a,
        FUR,
        side * (0.36 * spec.body[0] + Math.cos(ang) * 0.04),
        0.58 + Math.sin(ang) * 0.06,
        0.08,
        ang,
        side * 0.6,
        side * 0.4
      ));
    }
  }
  const arm = lathe(THREE, [[0.025, 0], [0.07, 0.04], [0.085, 0.16], [0.07, 0.3], [0.055, 0.42]], 10);
  const pawBoard = board(THREE, 0.16, 0.11, 0.045, 0.02);
  const claw = chip(THREE, 0.03, 0.055, 0.016);
  spec.paws.forEach((p, pi) => {
    const side = p[0] < 0 ? -1 : 1;
    const shoulder = [side * 0.28 * spec.body[0], 0.48, 0.02];
    const dir = [p[0] - shoulder[0], p[1] - shoulder[1], p[2] - shoulder[2]];
    const len = Math.hypot(dir[0], dir[1], dir[2]) || 1;
    const q = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(dir[0] / len, dir[1] / len, dir[2] / len)
    );
    const o = new THREE.Object3D();
    o.position.set(shoulder[0], shoulder[1], shoulder[2]);
    o.quaternion.copy(q);
    o.scale.set(1, len / 0.42, 1);
    o.updateMatrix();
    const ag = prep(THREE, arm, 0x6b4226, FUR);
    ag.applyMatrix4(o.matrix);
    ag.computeVertexNormals();
    bodyParts.push(ag);
    bodyParts.push(prep(THREE, pawBoard, 0x6b4226, FUR, p[0], p[1], p[2], Math.PI / 2, 0, side * 0.2));
    for (let c = 0; c < 4; c++) {
      bodyParts.push(prep(
        THREE,
        claw,
        0x2b1d14,
        FUR,
        p[0] + side * (c - 1.5) * 0.028,
        p[1] - 0.01,
        p[2] + 0.1,
        0.9,
        0,
        side * 0.15
      ));
    }
    if (spec.reins && !BUILD.lod) {
      const rein = tube(THREE, [
        [p[0], p[1] + 0.02, p[2] + 0.04],
        [side * 0.18, p[1] - 0.05, p[2] + 0.28],
        [side * 0.1, -0.05, 0.85],
      ], 0.012, 6, 4);
      bodyParts.push(prep(THREE, rein, 0xffffff, LEATHER));
    }
  });
  if (spec.harness && !BUILD.lod) {
    bodyParts.push(prep(THREE, board(THREE, 0.55, 0.06, 0.04, 0.02), 0xffffff, LEATHER, 0, 0.42, 0.22, 0.3, 0, 0));
    for (const side of [-1, 1]) {
      bodyParts.push(prep(THREE, board(THREE, 0.05, 0.42, 0.035, 0.02), 0xffffff, LEATHER, side * 0.16, 0.28, 0.12, 0.15, 0, side * -0.2));
    }
  }
  const tailStart = countVerts(bodyParts);
  const tailShape = rr(THREE, spec.tail.w, spec.tail.l, 0.04);
  const tailEx = new THREE.ExtrudeGeometry(tailShape, {
    depth: 0.035,
    bevelEnabled: true,
    bevelThickness: 0.008,
    bevelSize: 0.02,
    bevelSegments: 2,
    curveSegments: BUILD.curve,
    steps: 1,
  });
  tailEx.translate(0, -spec.tail.l * 0.35, -0.017);
  bendPaddle(tailEx, 0.65);
  const tailG = prep(THREE, tailEx, 0xffffff, SCALES, spec.tail.x, spec.tail.y, spec.tail.z, spec.tail.rx || -0.5, spec.tail.ry || 0.4, spec.tail.rz || 0);
  bodyParts.push(tailG);
  const bodyMesh = solidMesh(THREE, bodyParts, mats.fur, shadow, "body");
  driver.add(bodyMesh);

  const head = new THREE.Group();
  head.position.set(0, spec.neckY, spec.neckZ);
  const headParts = [];
  const hx = spec.head[0];
  const hy = spec.head[1];
  const hz = spec.head[2];
  headParts.push(prep(THREE, headGeo(THREE), spec.fur || 0x6b4226, FUR, 0, 0.02, -0.02, 0, 0, 0, hx, hy, hz));
  headParts.push(prep(THREE, muzzleGeo(THREE), 0x8b5a2b, FUR, 0, -0.04, hz * 0.18, Math.PI / 2, 0, 0, hx * 0.95, 1.15, hy * 0.85));
  const noseL = lathe(THREE, [[0.01, 0], [0.05, 0.012], [0.055, 0.04], [0.02, 0.07]], 8);
  const snoutZ = hz * 0.62;
  headParts.push(prep(THREE, noseL, 0x2a211c, NOSE, 0, -0.05, snoutZ, Math.PI / 2, 0, 0, 1.05, 0.7, 0.85));
  const nostril = lathe(THREE, [[0.004, 0], [0.018, 0.004], [0.016, 0.012], [0.004, 0.018]], 6);
  for (const side of [-1, 1]) {
    headParts.push(prep(THREE, nostril, 0x140e0c, NOSE, side * 0.028, -0.045, snoutZ + 0.04, Math.PI / 2, 0, side * 0.3, 1, 0.55, 0.8));
    headParts.push(prep(THREE, earGeo(THREE), 0x3a2618, FUR, side * hx * 0.42, hy * 0.28, -0.04, 0.15, 0, side * 0.7, 1.05, 1.15, 0.55));
    const cheek = lathe(THREE, [[0.02, 0], [0.11, 0.03], [0.13, 0.09], [0.04, 0.15]], BUILD.lod ? 6 : 8);
    headParts.push(prep(THREE, cheek, 0xa87a55, FUR, side * hx * 0.28, -0.06, hz * 0.34, 0, 0, side * 0.35, 1.25, 0.9, 1));
    const brow = lathe(THREE, [[0.015, 0], [0.07, 0.012], [0.05, 0.03], [0.012, 0.04]], 6);
    headParts.push(prep(THREE, brow, 0x4a301c, FUR, side * hx * 0.2, hy * 0.16, hz * 0.4, 0.5, 0, side * 0.5, 1.3, 0.45, 0.7));
  }
  const bead = lathe(THREE, [[0.012, 0], [0.055, 0.016], [0.06, 0.05], [0.02, 0.08]], spec.eyeBig ? 10 : 8);
  const irisL = lathe(THREE, [[0.004, 0], [0.028, 0.005], [0.026, 0.016], [0.005, 0.022]], 8);
  for (const side of [-1, 1]) {
    const ex = side * hx * (spec.eyeBig ? 0.2 : 0.22);
    const ey = hy * 0.06;
    const ez = hz * 0.42;
    if (spec.eyeBig) {
      headParts.push(prep(THREE, bead, 0xf7f4ee, EYE, ex, ey, ez, 0, 0, 0, 1.55, 1.7, 1.05));
      headParts.push(prep(THREE, irisL, 0x6b3a1a, EYE, ex, ey, ez + 0.055, Math.PI / 2, 0, 0, 1.25, 0.4, 1.25));
      headParts.push(prep(THREE, irisL, 0x14110f, EYE, ex, ey, ez + 0.068, Math.PI / 2, 0, 0, 0.55, 0.22, 0.55));
    } else {
      headParts.push(prep(THREE, bead, 0xf4efe6, EYE, ex, ey, ez, 0, 0, 0, 1.15, 1.25, 0.9));
      headParts.push(prep(THREE, irisL, 0x1a140f, EYE, ex, ey, ez + 0.05, Math.PI / 2, 0, 0, 0.85, 0.28, 0.85));
    }
    const glint = new THREE.PlaneGeometry(spec.eyeBig ? 0.028 : 0.02, spec.eyeBig ? 0.028 : 0.02);
    headParts.push(prep(THREE, glint, 0xffffff, EYE, ex + 0.016, ey + 0.02, ez + (spec.eyeBig ? 0.09 : 0.07)));
  }
  const tooth = chip(THREE, spec.toothW, spec.toothH, spec.toothD);
  const toothZ = snoutZ - 0.02;
  const toothY = -0.12;
  headParts.push(prep(THREE, tooth, spec.tooth, TEETH, -spec.toothW * 0.7, toothY, toothZ, 0.15, 0, 0));
  headParts.push(prep(THREE, tooth, spec.tooth, TEETH, spec.toothW * 0.7, toothY, toothZ, 0.15, 0, 0));
  if (spec.tongue) {
    const tongue = chip(THREE, 0.08, 0.05, 0.016);
    headParts.push(prep(THREE, tongue, 0xffffff, TONGUE, 0, toothY - 0.02, toothZ - 0.04, 0.9, 0, 0));
  }
  const furCard = new THREE.PlaneGeometry(0.1, 0.16);
  const tuftN = BUILD.lod ? 5 : 14;
  for (let i = 0; i < tuftN; i++) {
    const crown = i < tuftN * 0.45;
    const side = i % 2 ? 1 : -1;
    const ang = (i / tuftN) * 3.2 - 0.4;
    const x = crown ? Math.sin(ang) * hx * 0.16 : side * hx * 0.3;
    const y = crown ? hy * 0.34 : -0.02;
    const z = crown ? -0.02 : hz * 0.28;
    headParts.push(prep(THREE, furCard, i % 3 === 0 ? 0xc4926a : 0x8b5a2b, FUR, x, y, z, crown ? -0.6 : 0.2, ang, side * 0.5));
  }
  if (!BUILD.lod) {
    for (const side of [-1, 1]) {
      for (let i = 0; i < 5; i++) {
        const y = -0.06 + (i - 2) * 0.022;
        const whisk = tube(THREE, [
          [side * hx * 0.22, y, snoutZ * 0.72],
          [side * hx * 0.42, y + (i - 2) * 0.01, snoutZ * 0.9],
          [side * hx * 0.62, y + (i - 2.2) * 0.016, snoutZ * 0.7],
        ], 0.0045, 3, 4);
        headParts.push(prep(THREE, whisk, 0xe7d7c4, FUR));
      }
    }
  }
  const headMesh = solidMesh(THREE, headParts, mats.fur, shadow, "head");
  head.add(headMesh);
  driver.add(head);

  const scarfParts = [];
  const collar = tube(THREE, [
    [0.16, spec.neckY - 0.02, 0.02],
    [0, spec.neckY + 0.02, 0.12],
    [-0.16, spec.neckY - 0.02, 0.02],
    [0, spec.neckY - 0.06, -0.08],
    [0.16, spec.neckY - 0.02, 0.02],
  ], spec.scarfR, 10, 5);
  scarfParts.push(prep(THREE, collar, spec.scarfA, null));
  if (spec.knot) {
    const knot = lathe(THREE, [[0.02, 0], [0.07, 0.02], [0.06, 0.08], [0.02, 0.1]], 8);
    scarfParts.push(prep(THREE, knot, spec.scarfA, null, 0, spec.neckY - 0.08, 0.12, Math.PI / 2, 0, 0));
  }
  for (let t = 0; t < spec.tails; t++) {
    const spread = (t - (spec.tails - 1) / 2) * spec.tailGap;
    const len = spec.tailLen * (spec.tatter && t === 0 ? 0.62 : 1);
    const tailTube = tube(THREE, [
      [spread * 0.3, spec.neckY - 0.08, -0.02],
      [spread, spec.neckY - 0.16, -len * 0.45],
      [spread * 1.15, spec.neckY - 0.22, -len],
    ], spec.scarfR * (spec.chunky ? 1.25 : 0.85), 6, 5);
    const col = t % 2 ? spec.scarfB : spec.scarfA;
    scarfParts.push(prep(THREE, tailTube, col, null));
    const fringeN = BUILD.lod ? 2 : 4;
    for (let f = 0; f < fringeN; f++) {
      const fr = tube(THREE, [
        [spread * 1.15 + (f - 1.5) * 0.03, spec.neckY - 0.22, -len],
        [spread * 1.2 + (f - 1.5) * 0.04, spec.neckY - 0.3, -len - 0.12],
      ], spec.scarfR * 0.35, 2, 3);
      scarfParts.push(prep(THREE, fr, spec.scarfB, null));
    }
  }
  const scarfMesh = solidMesh(THREE, scarfParts, mats.knit, false, "scarf");
  driver.add(scarfMesh);
  const scarfTails = [new THREE.Object3D()];
  driver.add(scarfTails[0]);
  chassis.add(driver);
  return {
    driver,
    head,
    arms: [],
    scarfTails,
    tailFn: tailPose(bodyMesh.geometry, tailStart, [spec.tail.x, spec.tail.y, spec.tail.z]),
    scarfFn: scarfPose(scarfMesh.geometry),
  };
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
  const frontR = rearR * 0.35;
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
      x: 0.32, y: frontR, z: 0.92, half: 0, steer: true,
      wheel: frontWheel,
      fork: forkBits(THREE, { tube: frontR * 0.28, outer: frontR, strut: [-0.22, 0.42 - frontR, -0.55] }),
    }, mats, shadow),
  ];
  const crew = addCrew(THREE, chassis, {
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
  const frontR = rearR * 0.35;
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
      x: 0.34, y: frontR, z: 0.98, half: 0, steer: true,
      wheel: wheelOpt(frontR, frontR * 0.3, 8, "knob"),
      fork: forkBits(THREE, { tube: frontR * 0.3, outer: frontR, strut: [-0.24, 0.48 - frontR, -0.58] }),
    }, mats, shadow),
  ];
  const crew = addCrew(THREE, chassis, {
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
    const a = new THREE.PlaneGeometry(0.2, 0.46);
    const b = new THREE.PlaneGeometry(0.2, 0.46);
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
  wood.push(prep(THREE, board(THREE, 1.32, 0.08, 1.58, 0.024), 0xd1703f, WOOD, 0, 1.2, 0.02));
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
    new THREE.CircleGeometry(1.25, 16),
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
    if (!o.isMesh && !o.isInstancedMesh) return;
    draws += 1;
    const geo = o.geometry;
    const n = geo.index ? geo.index.count / 3 : geo.attributes.position.count / 3;
    tris += n * (o.isInstancedMesh ? o.count : 1);
    const banned = o.geometry && o.geometry.type;
    if (banned === "BoxGeometry" || banned === "SphereGeometry" || banned === "CylinderGeometry" || banned === "ConeGeometry") {
      throw new Error(kind + " bare " + banned);
    }
  });
  g.userData.draws = draws;
  g.userData.tris = Math.round(tris);
  return {
    group: g,
    wheels,
    blob,
    rear,
    chassis,
    driver: crew.driver,
    head: crew.head,
    arms: crew.arms,
    scarfTails: crew.scarfTails,
    flames: [],
    lanterns: [],
    pose,
  };
}

export function buildKart(THREE, def, _wood, opts) {
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
