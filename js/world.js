import { ROSTER, frameAt, forward } from "./sim.js?v=gd40";
import { buildKart } from "./racers.js?v=gd40";

function canvasTex(THREE, draw, w, h, repeat) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d"), w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  if (repeat) {
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
  }
  return tex;
}

function roadTexture(THREE) {
  return canvasTex(THREE, (g, w, h) => {
    g.fillStyle = "#e6d4a6";
    g.fillRect(0, 0, w, h);
    const img = g.getImageData(0, 0, w, h);
    for (let i = 0; i < img.data.length; i += 4) {
      const n = (Math.random() - 0.5) * 22;
      img.data[i] = Math.max(0, Math.min(255, img.data[i] + n));
      img.data[i + 1] = Math.max(0, Math.min(255, img.data[i + 1] + n));
      img.data[i + 2] = Math.max(0, Math.min(255, img.data[i + 2] + n * 0.5));
    }
    g.putImageData(img, 0, 0);
    g.fillStyle = "rgba(70,58,46,0.16)";
    for (let i = 0; i < 10; i++) {
      g.beginPath();
      g.ellipse((i * 97) % w, h * 0.5, 36, 70, 0.5, 0, 6.3);
      g.fill();
    }
    g.fillStyle = "#6b3d22";
    g.fillRect(0, 0, w, 16);
    g.fillRect(0, h - 16, w, 16);
    g.fillStyle = "#f0e2c4";
    g.fillRect(0, 16, w, 7);
    g.fillRect(0, h - 23, w, 7);
    g.fillStyle = "#e39a1e";
    const period = 92;
    for (let x = 0; x < w + period; x += period) {
      g.beginPath();
      g.moveTo(x + 8, 36);
      g.lineTo(x + 48, h / 2);
      g.lineTo(x + 8, h - 36);
      g.lineTo(x + 26, h - 36);
      g.lineTo(x + 66, h / 2);
      g.lineTo(x + 26, 36);
      g.closePath();
      g.fill();
    }
  }, 512, 256, false);
}

function concreteTexture(THREE) {
  return canvasTex(THREE, (g, w, h) => {
    g.fillStyle = "#d5cbb8";
    g.fillRect(0, 0, w, h);
    const img = g.getImageData(0, 0, w, h);
    for (let i = 0; i < img.data.length; i += 4) {
      const n = (Math.random() - 0.5) * 16;
      img.data[i] += n;
      img.data[i + 1] += n;
      img.data[i + 2] += n * 0.4;
    }
    g.putImageData(img, 0, 0);
    g.strokeStyle = "rgba(80,70,58,0.4)";
    g.lineWidth = 3;
    for (let y = 20; y < h; y += 40) {
      g.beginPath();
      g.moveTo(0, y);
      g.lineTo(w, y + 2);
      g.stroke();
    }
    g.fillStyle = "rgba(60,52,44,0.55)";
    for (let y = 40; y < h; y += 40) {
      for (let x = 28; x < w; x += 52) {
        g.beginPath();
        g.arc(x, y, 3.4, 0, 6.3);
        g.fill();
      }
    }
    g.fillStyle = "rgba(110,80,50,0.13)";
    for (let i = 0; i < 18; i++) {
      g.fillRect(Math.random() * w, Math.random() * h, 10, 30 + Math.random() * 90);
    }
  }, 512, 512, true);
}

function crateTexture(THREE) {
  return canvasTex(THREE, (g, w, h) => {
    g.fillStyle = "#8d4e2a";
    g.fillRect(0, 0, w, h);
    g.strokeStyle = "rgba(74,36,16,0.4)";
    g.lineWidth = 5;
    for (let y = 16; y < h; y += 26) {
      g.beginPath();
      g.moveTo(0, y);
      g.bezierCurveTo(w * 0.35, y + 7, w * 0.65, y - 6, w, y + 3);
      g.stroke();
    }
    g.strokeStyle = "#4e2a14";
    g.lineWidth = 16;
    g.strokeRect(20, 20, w - 40, h - 40);
    g.beginPath();
    g.moveTo(20, 20);
    g.lineTo(w - 20, h - 20);
    g.moveTo(w - 20, 20);
    g.lineTo(20, h - 20);
    g.stroke();
    g.fillStyle = "#f0a024";
    g.beginPath();
    g.moveTo(w * 0.5, h * 0.3);
    g.lineTo(w * 0.68, h * 0.5);
    g.lineTo(w * 0.5, h * 0.7);
    g.lineTo(w * 0.32, h * 0.5);
    g.closePath();
    g.fill();
    g.fillStyle = "#12b3ab";
    g.beginPath();
    g.arc(w * 0.5, h * 0.5, 22, 0, 6.28);
    g.fill();
    g.fillStyle = "#e7fff8";
    g.beginPath();
    g.arc(w * 0.46, h * 0.46, 7, 0, 6.28);
    g.fill();
  }, 256, 256, false);
}

function woodTexture(THREE) {
  return canvasTex(THREE, (g, w, h) => {
    g.fillStyle = "#a15c32";
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 28; i++) {
      g.strokeStyle = `rgba(${50 + i}, ${24}, ${10}, 0.35)`;
      g.lineWidth = 2 + (i % 3);
      g.beginPath();
      const y = (i * h) / 28;
      g.moveTo(0, y);
      g.bezierCurveTo(w * 0.3, y + 8, w * 0.6, y - 6, w, y + 3);
      g.stroke();
    }
  }, 256, 256, true);
}

function mistTexture(THREE) {
  return canvasTex(THREE, (g, w, h) => {
    const grd = g.createRadialGradient(w / 2, h / 2, 8, w / 2, h / 2, w / 2);
    grd.addColorStop(0, "rgba(255,236,210,0.9)");
    grd.addColorStop(1, "rgba(255,236,210,0)");
    g.fillStyle = grd;
    g.fillRect(0, 0, w, h);
  }, 128, 128, false);
}

function buildRoad(THREE, track, map) {
  const f = track.frames;
  const n = f.length;
  const pos = new Float32Array(n * 2 * 3);
  const uv = new Float32Array(n * 2 * 2);
  let dist = 0;
  for (let i = 0; i < n; i++) {
    if (i) dist += f[i - 1].ds;
    const half = f[i].width * 0.5;
    const lift = Math.sin(f[i].bank) * half;
    const y = f[i].p.y + 0.02;
    const lx = f[i].p.x - f[i].right.x * half;
    const lz = f[i].p.z - f[i].right.z * half;
    const rx = f[i].p.x + f[i].right.x * half;
    const rz = f[i].p.z + f[i].right.z * half;
    const u = dist / 7.2;
    pos[i * 6] = lx;
    pos[i * 6 + 1] = y - lift;
    pos[i * 6 + 2] = lz;
    pos[i * 6 + 3] = rx;
    pos[i * 6 + 4] = y + lift;
    pos[i * 6 + 5] = rz;
    uv[i * 4] = u;
    uv[i * 4 + 1] = 0;
    uv[i * 4 + 2] = u;
    uv[i * 4 + 3] = 1;
  }
  const idx = [];
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    if (f[i].gap || f[j].gap) continue;
    const l0 = i * 2;
    const r0 = l0 + 1;
    const l1 = j * 2;
    const r1 = l1 + 1;
    idx.push(l0, l1, r0, r0, l1, r1);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const ny = geo.getAttribute("normal").getY(0);
  if (ny < 0) {
    for (let k = 0; k < idx.length; k += 3) {
      const tmp = idx[k];
      idx[k] = idx[k + 1];
      idx[k + 1] = tmp;
    }
    geo.setIndex(idx);
    geo.computeVertexNormals();
  }
  map.wrapS = THREE.RepeatWrapping;
  const mat = new THREE.MeshPhysicalMaterial({
    map,
    roughness: 0.34,
    metalness: 0.12,
    clearcoat: 0.72,
    clearcoatRoughness: 0.22,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  mesh.castShadow = true;

  const skirtPos = [];
  const skirtIdx = [];
  function pushSkirt(side) {
    const base = skirtPos.length / 3;
    for (let i = 0; i < n; i++) {
      const o = i * 2 + side;
      const px = pos[o * 3];
      const py = pos[o * 3 + 1];
      const pz = pos[o * 3 + 2];
      skirtPos.push(px, py, pz);
      if (f[i].loop && f[i].up) {
        const drop = 0.5;
        skirtPos.push(px - f[i].up.x * drop, py - f[i].up.y * drop, pz - f[i].up.z * drop);
      } else {
        const drop = Math.max(f[i].bridge ? 1.6 : 1.05, f[i].p.y - 0.08);
        skirtPos.push(px, py - drop, pz);
      }
    }
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      if (f[i].gap || f[j].gap) continue;
      const a = base + i * 2;
      const b = a + 1;
      const c = base + j * 2;
      const d = c + 1;
      skirtIdx.push(a, b, c, c, b, d);
    }
  }
  pushSkirt(0);
  pushSkirt(1);
  const sg = new THREE.BufferGeometry();
  sg.setAttribute("position", new THREE.Float32BufferAttribute(skirtPos, 3));
  sg.setIndex(skirtIdx);
  sg.computeVertexNormals();
  const skirt = new THREE.Mesh(
    sg,
    new THREE.MeshPhysicalMaterial({ color: 0x8d8170, roughness: 0.62, metalness: 0.08, clearcoat: 0.25 })
  );
  skirt.receiveShadow = true;
  skirt.castShadow = true;
  const icy = track.theme === "frost";
  const rivetGeo = new THREE.SphereGeometry(0.16, 8, 6);
  const rivetMat = new THREE.MeshStandardMaterial({
    color: icy ? 0xd5e4ee : 0xd7a441,
    metalness: 0.86,
    roughness: 0.24,
  });
  let rivetCount = 0;
  for (let i = 0; i < n; i += 3) if (!f[i].gap) rivetCount += 2;
  const rivets = new THREE.InstancedMesh(rivetGeo, rivetMat, Math.max(1, rivetCount));
  const dummy = new THREE.Object3D();
  let ri = 0;
  for (let i = 0; i < n; i += 3) {
    const fr = f[i];
    if (fr.gap || fr.loop) continue;
    for (const side of [-1, 1]) {
      dummy.position.set(
        fr.p.x + fr.right.x * (fr.width * 0.5 + 0.42) * side,
        fr.p.y + 0.4,
        fr.p.z + fr.right.z * (fr.width * 0.5 + 0.42) * side
      );
      dummy.scale.set(1.15, 0.62, 1.15);
      dummy.updateMatrix();
      rivets.setMatrixAt(ri++, dummy.matrix);
    }
  }
  rivets.count = Math.max(1, ri);
  rivets.castShadow = true;

  const curbPos = [];
  const curbIdx = [];
  function curbPoint(fr, side, extra, yAdd) {
    curbPos.push(
      fr.p.x + fr.right.x * (fr.width * 0.5 + extra) * side,
      fr.p.y + yAdd,
      fr.p.z + fr.right.z * (fr.width * 0.5 + extra) * side
    );
  }
  for (let i = 0; i < n; i++) {
    for (const side of [-1, 1]) {
      curbPoint(f[i], side, 0.0, 0.06);
      curbPoint(f[i], side, 0.24, 0.34);
      curbPoint(f[i], side, 0.66, 0.4);
      curbPoint(f[i], side, 0.78, -0.08);
    }
  }
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    if (f[i].gap || f[j].gap) continue;
    for (const baseSide of [0, 4]) {
      const a = i * 8 + baseSide;
      const b = j * 8 + baseSide;
      for (let k = 0; k < 3; k++) {
        curbIdx.push(a + k, b + k, a + k + 1, a + k + 1, b + k, b + k + 1);
      }
    }
  }
  const curbGeo = new THREE.BufferGeometry();
  curbGeo.setAttribute("position", new THREE.Float32BufferAttribute(curbPos, 3));
  curbGeo.setIndex(curbIdx);
  curbGeo.computeVertexNormals();
  const curb = new THREE.Mesh(
    curbGeo,
    new THREE.MeshPhysicalMaterial({
      color: icy ? 0xd7eef8 : 0x6b3a24,
      roughness: icy ? 0.16 : 0.42,
      metalness: icy ? 0.2 : 0.14,
      clearcoat: icy ? 0.9 : 0.48,
      clearcoatRoughness: 0.14,
      side: THREE.DoubleSide,
    })
  );
  curb.castShadow = true;
  curb.receiveShadow = true;

  const linePos = [];
  const lineIdx = [];
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    if (f[i].gap || f[j].gap) continue;
    if (Math.floor(i / 5) % 2 === 0) continue;
    const base = linePos.length / 3;
    for (const fr of [f[i], f[j]]) {
      for (const side of [-1, 1]) {
        linePos.push(
          fr.p.x + fr.right.x * 0.34 * side,
          fr.p.y + 0.08,
          fr.p.z + fr.right.z * 0.34 * side
        );
      }
    }
    lineIdx.push(base, base + 2, base + 1, base + 1, base + 2, base + 3);
  }
  const lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute("position", new THREE.Float32BufferAttribute(linePos, 3));
  lineGeo.setIndex(lineIdx);
  lineGeo.computeVertexNormals();
  const line = new THREE.Mesh(
    lineGeo,
    new THREE.MeshStandardMaterial({
      color: icy ? 0xe7f6ff : 0xf0a024,
      emissive: icy ? 0x8ecfff : 0xc98416,
      emissiveIntensity: 0.55,
      roughness: 0.32,
      metalness: 0.08,
    })
  );
  line.receiveShadow = true;

  let chevCount = 0;
  for (const fr of f) if (fr.lip) chevCount += 1;
  const chevrons = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1, 0.07, 0.42),
    new THREE.MeshStandardMaterial({ color: icy ? 0xe7f6ff : 0xf0a024, emissive: icy ? 0x8ecfff : 0xc98416, emissiveIntensity: 0.45 }),
    Math.max(1, chevCount)
  );
  let ci = 0;
  for (const fr of f) {
    if (!fr.lip) continue;
    dummy.position.set(fr.p.x, fr.p.y + 0.12, fr.p.z);
    dummy.rotation.set(0, Math.atan2(fr.tangent.x, fr.tangent.z), 0);
    dummy.scale.set(Math.max(2.2, fr.width * 0.72), 1, 1);
    dummy.updateMatrix();
    chevrons.setMatrixAt(ci++, dummy.matrix);
  }
  chevrons.count = Math.max(1, ci);
  if (!ci) chevrons.visible = false;
  return { mesh, skirt, rivets, curb, line, chevrons };
}

function skyMaterial(THREE) {
  return new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {},
    vertexShader: `
      varying vec3 vPos;
      void main() {
        vec4 w = modelMatrix * vec4(position, 1.0);
        vPos = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }
    `,
    fragmentShader: `
      varying vec3 vPos;
      void main() {
        vec3 dir = normalize(vPos);
        float h = dir.y;
        vec3 zenith = vec3(0.56, 0.8, 0.94);
        vec3 hor = vec3(1.0, 0.84, 0.58);
        vec3 low = vec3(0.74, 0.82, 0.7);
        vec3 col = mix(hor, zenith, smoothstep(0.02, 0.55, h));
        col = mix(low, col, smoothstep(-0.2, 0.08, h));
        vec3 sun = normalize(vec3(0.55, 0.42, 0.45));
        float disc = pow(max(dot(dir, sun), 0.0), 90.0);
        float glow = pow(max(dot(dir, sun), 0.0), 5.0);
        col += vec3(1.0, 0.86, 0.55) * disc * 1.3;
        col += vec3(1.0, 0.7, 0.35) * glow * 0.28;
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
}

function waterMaterial(THREE) {
  return new THREE.ShaderMaterial({
    transparent: true,
    uniforms: { uTime: { value: 0 }, uIce: { value: 0 } },
    vertexShader: `
      varying vec2 vUv;
      uniform float uTime;
      void main() {
        vUv = uv;
        vec3 p = position;
        p.z += sin(position.x * 0.35 + uTime) * 0.08;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }
    `,
    fragmentShader: `
      varying vec2 vUv;
      uniform float uTime;
      uniform float uIce;
      void main() {
        float w = sin(vUv.x * 46.0 + uTime * 1.4) * sin(vUv.y * 28.0 - uTime);
        vec3 deep = mix(vec3(0.05, 0.28, 0.34), vec3(0.62, 0.78, 0.84), uIce);
        vec3 mid = mix(vec3(0.12, 0.52, 0.56), vec3(0.82, 0.9, 0.94), uIce);
        vec3 foam = vec3(0.9, 0.95, 0.93);
        vec3 col = mix(deep, mid, 0.5 + 0.5 * w);
        col = mix(col, foam, smoothstep(0.72, 1.0, w));
        gl_FragColor = vec4(col, 0.9);
      }
    `,
  });
}

function spillMaterial(THREE) {
  return new THREE.ShaderMaterial({
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
    uniforms: { uTime: { value: 0 } },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec2 vUv;
      uniform float uTime;
      void main() {
        float fall = fract(vUv.y * 2.4 - uTime * 0.85);
        float streak = sin(vUv.x * 55.0 + sin(vUv.y * 6.0) * 2.0);
        float foam = smoothstep(0.78, 1.0, fall) + smoothstep(0.55, 1.0, streak) * 0.35;
        vec3 deep = vec3(0.2, 0.62, 0.66);
        vec3 white = vec3(0.95, 0.97, 0.96);
        vec3 col = mix(deep, white, clamp(foam, 0.0, 1.0));
        gl_FragColor = vec4(col, 0.72);
      }
    `,
  });
}

export function createWorld(THREE, track) {
  let liveTrack = track;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
  renderer.setClearColor(0xb7d7ee, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.18;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xf6e6c4, 200, 720);

  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 900);
  camera.position.set(0, 18, -18);
  const raycaster = new THREE.Raycaster();
  let raceCam = false;

  const sky = new THREE.Mesh(new THREE.SphereGeometry(720, 24, 16), skyMaterial(THREE));
  scene.add(sky);

  const hemi = new THREE.HemisphereLight(0xe7f6ff, 0x8fbf6a, 1.05);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff1cc, 1.9);
  sun.position.set(48, 62, 36);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.near = 10;
  sun.shadow.camera.far = 420;
  sun.shadow.camera.left = -380;
  sun.shadow.camera.right = 380;
  sun.shadow.camera.top = 380;
  sun.shadow.camera.bottom = -380;
  sun.shadow.bias = -0.0004;
  scene.add(sun);
  const rim = new THREE.DirectionalLight(0xd2efff, 0.72);
  rim.position.set(-60, 28, -40);
  scene.add(rim);

  const woodMap = woodTexture(THREE);
  const concrete = concreteTexture(THREE);
  concrete.repeat.set(3.5, 1.6);
  const roadMap = roadTexture(THREE);
  roadMap.wrapS = THREE.RepeatWrapping;
  const iceMap = roadTexture(THREE);
  iceMap.wrapS = THREE.RepeatWrapping;

  let road = buildRoad(THREE, track, roadMap);
  scene.add(road.mesh, road.skirt, road.rivets, road.curb, road.line, road.chevrons);

  function crestOf(tr) {
    let best = tr.frames.find((fr) => !fr.gap && !fr.lip && !fr.deck) || tr.frames[0];
    for (const fr of tr.frames) {
      if (fr.gap || fr.lip || fr.deck) continue;
      if (fr.p.y > best.p.y) best = fr;
    }
    return best;
  }
  function bridgeOf(tr) {
    const list = tr.frames.filter((fr) => fr.bridge);
    return list.length ? list[Math.floor(list.length / 2)] : tr.frames[Math.floor(tr.frames.length / 2)];
  }

  const concMat = new THREE.MeshStandardMaterial({ map: concrete, roughness: 0.58, metalness: 0.06 });
  const crest = crestOf(track);
  const outX = crest.p.x - track.cx;
  const outZ = crest.p.z - track.cz;
  const outL = Math.hypot(outX, outZ) || 1;
  const crestYaw = Math.atan2(crest.tangent.x, crest.tangent.z);
  const wall = new THREE.Mesh(new THREE.BoxGeometry(crest.width + 28, 14, 4.2), concMat);
  wall.position.set(crest.p.x + (outX / outL) * 16, crest.p.y - 3.2, crest.p.z + (outZ / outL) * 16);
  wall.rotation.y = crestYaw;
  wall.castShadow = true;
  wall.receiveShadow = true;
  wall.userData.damWall = true;
  scene.add(wall);
  const damBits = [wall];
  for (const side of [-1, 1]) {
    const butt = new THREE.Mesh(new THREE.BoxGeometry(9, 22, 14), concMat);
    const off = (crest.width * 0.5 + 18) * side;
    butt.position.set(wall.position.x + crest.right.x * off, crest.p.y, wall.position.z + crest.right.z * off);
    butt.rotation.y = crestYaw;
    butt.castShadow = true;
    butt.userData.damWall = true;
    scene.add(butt);
    damBits.push(butt);
  }

  const waterMat = waterMaterial(THREE);
  function buildWaterGroup(tr) {
    const group = new THREE.Group();
    group.name = "waters";
    for (const w of tr.waters || []) {
      const mesh =
        w.kind === "circle"
          ? new THREE.Mesh(new THREE.CircleGeometry(w.r, 28), waterMat)
          : new THREE.Mesh(new THREE.PlaneGeometry(w.hx * 2, w.hz * 2, 8, 5), waterMat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(w.x, w.y, w.z);
      mesh.renderOrder = 1;
      group.add(mesh);
    }
    return group;
  }
  let waterGroup = buildWaterGroup(track);
  scene.add(waterGroup);

  const br = bridgeOf(track);
  const spillMat = spillMaterial(THREE);
  const reservoir = (track.waters || []).find((w) => w.id === "reservoir");
  const spill = new THREE.Mesh(new THREE.PlaneGeometry(18, 16, 1, 10), spillMat);
  if (reservoir) {
    spill.position.set(
      (wall.position.x + reservoir.x) * 0.5,
      (wall.position.y + reservoir.y) * 0.5,
      (wall.position.z + reservoir.z) * 0.5
    );
    spill.lookAt(reservoir.x, reservoir.y - 4, reservoir.z);
  }
  scene.add(spill);
  damBits.push(spill);

  function landTexture(THREE, frost) {
    return canvasTex(THREE, (g, w, h) => {
      g.fillStyle = frost ? "#e7f3f8" : "#4f8f46";
      g.fillRect(0, 0, w, h);
      for (let i = 0; i < 160; i++) {
        const x = (i * 67) % w;
        const y = (i * 43) % h;
        g.fillStyle = frost
          ? `rgba(${210 + (i % 40)},${226 + (i % 24)},${236},0.45)`
          : `rgba(${28 + (i % 36)},${92 + (i % 50)},${32},0.4)`;
        g.beginPath();
        g.ellipse(x, y, 10 + (i % 9) * 3, 6 + (i % 5) * 2, i * 0.7, 0, 6.28);
        g.fill();
      }
    }, 256, 256, true);
  }
  const grassMap = landTexture(THREE, false);
  grassMap.repeat.set(18, 18);
  const snowMap = landTexture(THREE, true);
  snowMap.repeat.set(18, 18);
  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(420, 48),
    new THREE.MeshStandardMaterial({ map: grassMap, color: 0xffffff, roughness: 1 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = 0;
  ground.receiveShadow = true;
  scene.add(ground);

  const rockMat = new THREE.MeshStandardMaterial({ color: 0x6e6558, roughness: 0.92 });
  for (const rk of track.rocks || []) {
    const boulder = new THREE.Mesh(new THREE.DodecahedronGeometry(rk.s || 1.3, 0), rockMat);
    boulder.position.set(rk.x, 0.7 * (rk.s || 1.3), rk.z);
    boulder.castShadow = true;
    boulder.receiveShadow = true;
    scene.add(boulder);
    damBits.push(boulder);
  }

  const foliage = [];
  const treeSpots = track.trees || [];
  const trunkG = new THREE.CylinderGeometry(0.22, 0.34, 1.6, 6);
  const leafG = new THREE.ConeGeometry(1.15, 1.7, 7);
  const crownG = new THREE.ConeGeometry(0.72, 1.35, 7);
  const trunkM = new THREE.MeshStandardMaterial({ color: 0x5c3a22, roughness: 0.9 });
  const leafM = new THREE.MeshStandardMaterial({ color: 0x2f6a34, roughness: 0.85 });
  const crownM = new THREE.MeshStandardMaterial({ color: 0x3e8a44, roughness: 0.7 });
  const trunks = new THREE.InstancedMesh(trunkG, trunkM, Math.max(1, treeSpots.length));
  const leaves = new THREE.InstancedMesh(leafG, leafM, Math.max(1, treeSpots.length));
  const crowns = new THREE.InstancedMesh(crownG, crownM, Math.max(1, treeSpots.length));
  const dummy = new THREE.Object3D();
  treeSpots.forEach((s, idx) => {
    dummy.position.set(s.x, 0.85 * s.s, s.z);
    dummy.scale.setScalar(s.s);
    dummy.rotation.set(0, 0, 0);
    dummy.updateMatrix();
    trunks.setMatrixAt(idx, dummy.matrix);
    dummy.position.y = 2.15 * s.s;
    dummy.updateMatrix();
    leaves.setMatrixAt(idx, dummy.matrix);
    dummy.position.y = 3.15 * s.s;
    dummy.scale.setScalar(s.s * 0.85);
    dummy.updateMatrix();
    crowns.setMatrixAt(idx, dummy.matrix);
  });
  trunks.count = treeSpots.length;
  leaves.count = treeSpots.length;
  crowns.count = treeSpots.length;
  trunks.castShadow = true;
  leaves.castShadow = true;
  crowns.castShadow = true;
  scene.add(trunks, leaves, crowns);
  foliage.push(trunks, leaves, crowns);

  const lodgeMat = new THREE.MeshPhysicalMaterial({ map: woodMap, roughness: 0.55, metalness: 0.06, clearcoat: 0.28 });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x6a3a28, roughness: 0.75 });
  const chimneyMat = new THREE.MeshStandardMaterial({ color: 0x8a8074, roughness: 0.7 });
  const windowMat = new THREE.MeshStandardMaterial({ color: 0xf0a024, emissive: 0xc98416, emissiveIntensity: 0.7 });
  for (const lodge of track.lodges || []) {
    const hut = new THREE.Mesh(new THREE.BoxGeometry(6.2, 3.6, 5.2), lodgeMat);
    hut.position.set(lodge.x, 1.8, lodge.z);
    hut.rotation.y = lodge.yaw;
    hut.castShadow = true;
    const roof = new THREE.Mesh(new THREE.ConeGeometry(4.4, 2.2, 4), roofMat);
    roof.position.set(lodge.x, 4.4, lodge.z);
    roof.rotation.y = lodge.yaw;
    const fx = Math.sin(lodge.yaw);
    const fz = Math.cos(lodge.yaw);
    const door = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.8, 0.14), new THREE.MeshStandardMaterial({ color: 0xf4e6c8 }));
    door.position.set(lodge.x + fx * 2.6, 1.0, lodge.z + fz * 2.6);
    door.rotation.y = lodge.yaw;
    const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.3, 1.3, 6), chimneyMat);
    stack.position.set(lodge.x - fx * 1.4, 4.6, lodge.z - fz * 1.4);
    const glow = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.55, 0.1), windowMat);
    glow.position.set(lodge.x + fx * 2.62, 2.2, lodge.z + fz * 2.62);
    glow.rotation.y = lodge.yaw;
    scene.add(hut, roof, door, stack, glow);
    foliage.push(hut, roof, door, stack, glow);
  }

  const crowdScarf = new THREE.MeshStandardMaterial({ color: 0xe6a322, roughness: 0.5 });
  const crowdFur = new THREE.MeshStandardMaterial({ color: 0x8d5a32, roughness: 0.75 });
  const crowdHead = new THREE.MeshStandardMaterial({ color: 0xc47a3a, roughness: 0.6 });
  const crowdSpots = [];
  for (let i = 0; i < track.frames.length; i += 5) {
    const fr = track.frames[i];
    if (!fr.rail || fr.bridge || fr.p.y < 9) continue;
    for (const side of [-1, 1]) {
      crowdSpots.push({
        x: fr.p.x + fr.right.x * (fr.width * 0.5 + 1.85) * side,
        y: fr.p.y,
        z: fr.p.z + fr.right.z * (fr.width * 0.5 + 1.85) * side,
      });
    }
  }
  const bodies = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.22, 0.28, 0.7, 7), crowdFur, Math.max(1, crowdSpots.length));
  const scarves = new THREE.InstancedMesh(new THREE.BoxGeometry(0.55, 0.16, 0.42), crowdScarf, Math.max(1, crowdSpots.length));
  const heads = new THREE.InstancedMesh(new THREE.BoxGeometry(0.36, 0.32, 0.32), crowdHead, Math.max(1, crowdSpots.length));
  crowdSpots.forEach((s, idx) => {
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1, 1, 1);
    dummy.position.set(s.x, s.y + 0.5, s.z);
    dummy.updateMatrix();
    bodies.setMatrixAt(idx, dummy.matrix);
    dummy.position.y = s.y + 0.72;
    dummy.updateMatrix();
    scarves.setMatrixAt(idx, dummy.matrix);
    dummy.position.y = s.y + 1.05;
    dummy.updateMatrix();
    heads.setMatrixAt(idx, dummy.matrix);
  });
  bodies.count = crowdSpots.length;
  scarves.count = crowdSpots.length;
  heads.count = crowdSpots.length;
  scene.add(bodies, scarves, heads);
  foliage.push(bodies, scarves, heads);

  const railMat = new THREE.MeshStandardMaterial({ map: woodMap, roughness: 0.62, metalness: 0.08 });
  const railSpots = [];
  for (let i = 0; i < track.frames.length; i += 4) {
    const fr = track.frames[i];
    if (!fr.rail) continue;
    for (const side of [-1, 1]) {
      railSpots.push({ fr, side });
    }
  }
  const postMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.48, 1.25, 0.72), railMat, Math.max(1, railSpots.length));
  const railMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.22, 0.18, 3.6), railMat, Math.max(1, railSpots.length));
  railSpots.forEach((s, idx) => {
    const half = s.fr.width * 0.5 + 0.2;
    dummy.scale.set(1, 1, 1);
    dummy.rotation.set(0, Math.atan2(s.fr.tangent.x, s.fr.tangent.z), 0);
    dummy.position.set(
      s.fr.p.x + s.fr.right.x * half * s.side,
      s.fr.p.y + 0.7,
      s.fr.p.z + s.fr.right.z * half * s.side
    );
    dummy.updateMatrix();
    postMesh.setMatrixAt(idx, dummy.matrix);
    dummy.position.y = s.fr.p.y + 1.15;
    dummy.updateMatrix();
    railMesh.setMatrixAt(idx, dummy.matrix);
  });
  postMesh.count = railSpots.length;
  railMesh.count = railSpots.length;
  postMesh.castShadow = true;
  railMesh.castShadow = true;
  scene.add(postMesh, railMesh);
  const posts = [postMesh, railMesh];
  for (let i = 0; i < track.frames.length; i += 8) {
    const fr = track.frames[i];
    if (!fr.bridge) continue;
    const pier = new THREE.Mesh(
      new THREE.CylinderGeometry(0.42, 0.7, Math.max(2.2, fr.p.y + 0.5), 7),
      concMat
    );
    pier.position.set(fr.p.x, Math.max(0, fr.p.y) * 0.45, fr.p.z);
    pier.castShadow = true;
    scene.add(pier);
    posts.push(pier);
  }

  const gate = frameAt(track, 0.0);
  const woodPost = new THREE.MeshStandardMaterial({ map: woodMap, color: 0xc47a3a, roughness: 0.7 });
  for (const side of [-1, 1]) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.32, 3.1, 0.32), woodPost);
    const half = gate.width * 0.5;
    p.position.set(
      gate.p.x + gate.right.x * half * side,
      gate.p.y + 1.55,
      gate.p.z + gate.right.z * half * side
    );
    p.castShadow = true;
    scene.add(p);
    posts.push(p);
  }
  const bannerMap = canvasTex(THREE, (g, w, h) => {
    g.fillStyle = "#e09018";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#f4c56a";
    for (let x = 0; x < w; x += 48) {
      g.beginPath();
      g.moveTo(x, 8);
      g.lineTo(x + 22, h / 2);
      g.lineTo(x, h - 8);
      g.lineTo(x + 10, h - 8);
      g.lineTo(x + 32, h / 2);
      g.lineTo(x + 10, 8);
      g.closePath();
      g.fill();
    }
    g.fillStyle = "#14998a";
    g.fillRect(0, 0, w, 8);
    g.fillRect(0, h - 8, w, 8);
  }, 256, 64, false);
  const bannerMat = new THREE.MeshStandardMaterial({ map: bannerMap, roughness: 0.42, emissive: 0x5a3208, emissiveIntensity: 0.2 });
  const banner = new THREE.Mesh(
    new THREE.BoxGeometry(gate.width * 0.92, 0.55, 0.08),
    bannerMat
  );
  banner.position.set(gate.p.x, gate.p.y + 2.55, gate.p.z);
  const face = Math.atan2(gate.right.x, gate.right.z);
  banner.rotation.y = face;
  scene.add(banner);
  const line = new THREE.Mesh(
    new THREE.BoxGeometry(gate.width * 0.9, 0.05, 0.45),
    new THREE.MeshStandardMaterial({ color: 0xf4e6c8, roughness: 0.4 })
  );
  line.position.set(gate.p.x, gate.p.y + 0.06, gate.p.z);
  line.rotation.y = face;
  line.receiveShadow = true;
  scene.add(line);
  posts.push(banner, line);

  const mistMap = mistTexture(THREE);
  const mists = [];
  for (let i = 0; i < 9; i++) {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(10 + (i % 4) * 2, 7),
      new THREE.MeshBasicMaterial({ map: mistMap, transparent: true, depthWrite: false, opacity: 0.4 })
    );
    const side = (i - 4) * 3.2;
    m.position.set(br.p.x + br.right.x * side, br.p.y + 2.2, br.p.z + br.right.z * side);
    m.userData.baseY = br.p.y + 2.2;
    scene.add(m);
    mists.push(m);
    damBits.push(m);
  }

  const views = [];
  const sparkN = 320;
  const sparkPos = new Float32Array(sparkN * 3);
  const sparkCol = new Float32Array(sparkN * 3);
  const sparkGeo = new THREE.BufferGeometry();
  sparkGeo.setAttribute("position", new THREE.BufferAttribute(sparkPos, 3));
  sparkGeo.setAttribute("color", new THREE.BufferAttribute(sparkCol, 3));
  const sparks = new THREE.Points(
    sparkGeo,
    new THREE.PointsMaterial({
      size: 0.22,
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );
  scene.add(sparks);
  const sparkLife = new Float32Array(sparkN);
  let sparkCursor = 0;

  let aimLock = null;
  const look = new THREE.Vector3(0, 12, -10);
  const camGoal = new THREE.Vector3();
  const lookGoal = new THREE.Vector3();
  const tmpF = new THREE.Vector3();

  const flameMap = canvasTex(THREE, (g, w, h) => {
    const grd = g.createLinearGradient(0, h, 0, 0);
    grd.addColorStop(0, "rgba(255,70,8,0)");
    grd.addColorStop(0.32, "rgba(255,96,16,0.95)");
    grd.addColorStop(0.7, "rgba(255,186,48,0.95)");
    grd.addColorStop(1, "rgba(255,246,214,0.15)");
    g.fillStyle = grd;
    g.beginPath();
    g.moveTo(w * 0.5, h * 0.06);
    g.bezierCurveTo(w * 0.94, h * 0.42, w * 0.76, h * 0.78, w * 0.5, h * 0.96);
    g.bezierCurveTo(w * 0.24, h * 0.78, w * 0.06, h * 0.42, w * 0.5, h * 0.06);
    g.fill();
  }, 64, 128, false);
  const flameMat = new THREE.MeshBasicMaterial({
    map: flameMap,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  const ribMap = canvasTex(THREE, (g, w, h) => {
    const grd = g.createLinearGradient(0, h, 0, 0);
    grd.addColorStop(0, "rgba(255,244,210,0.98)");
    grd.addColorStop(0.18, "rgba(255,176,32,0.95)");
    grd.addColorStop(0.55, "rgba(255,120,16,0.72)");
    grd.addColorStop(1, "rgba(255,80,0,0)");
    g.fillStyle = grd;
    g.fillRect(0, 0, w, h);
    g.fillStyle = "rgba(255,236,170,0.85)";
    g.fillRect(w * 0.38, 0, w * 0.24, h * 0.72);
  }, 64, 256, false);
  function activateKart(view, src) {
    const spin = view.wheels && view.wheels[0] ? view.wheels[0].spin : 0;
    view.wheels = src.wheels;
    view.chassis = src.chassis;
    view.driver = src.driver;
    view.head = src.head;
    view.arms = src.arms || [];
    view.scarfTails = src.scarfTails || [];
    view.flames = src.flames || [];
    view.lanterns = src.lanterns || [];
    view.rear = src.rear;
    view.pose = src.pose;
    for (const w of view.wheels || []) w.spin = spin;
  }

  function mountKart(def) {
    const hi = buildKart(THREE, def, woodMap, { lod: false });
    const lo = buildKart(THREE, def, woodMap, { lod: true });
    const root = new THREE.Group();
    root.name = def.id;
    root.userData.kind = hi.group.userData.kind;
    root.userData.sig = hi.group.userData.sig;
    root.userData.draws = hi.group.userData.draws;
    root.userData.tris = hi.group.userData.tris;
    root.userData.lodTris = lo.group.userData.tris;
    root.scale.copy(hi.group.scale);
    hi.group.scale.setScalar(1);
    lo.group.scale.setScalar(1);
    root.add(hi.group, lo.group);
    const hero = def.id === "bober";
    hi.group.visible = hero;
    lo.group.visible = !hero;
    const view = { group: root, hi, lo, hiOn: hero, blob: hi.blob };
    activateKart(view, hero ? hi : lo);
    const trail = new THREE.Group();
    trail.position.set(0, 0.18, -3.8);
    const ribMat = new THREE.MeshBasicMaterial({
      map: ribMap,
      color: 0xffc24a,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const ribbon = new THREE.Mesh(new THREE.PlaneGeometry(1.85, 6.1), ribMat);
    ribbon.rotation.x = -Math.PI / 2;
    ribbon.renderOrder = 4;
    const coreMat = ribMat.clone();
    coreMat.color.setHex(0xfff1b0);
    const core = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 6.1), coreMat);
    core.rotation.x = -Math.PI / 2;
    core.position.y = 0.05;
    core.renderOrder = 5;
    trail.add(ribbon, core);
    trail.visible = false;
    view.group.add(trail);
    view.ribbon = trail;
    view.ribbonCore = core;
    view.ribbonSheet = ribbon;
    const flareMat = new THREE.MeshBasicMaterial({
      color: 0xfff0a8,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const flare = new THREE.Group();
    flare.position.set(0, 0.36, -1.15);
    flare.visible = false;
    const flareCard = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.55), flameMat);
    flareCard.position.set(0, 0.08, 0);
    const flareCross = flareCard.clone();
    flareCross.rotation.y = Math.PI / 2;
    flare.add(flareCard, flareCross);
    view.group.add(flare);
    view.flare = flare;
    scene.add(view.group);
    scene.add(view.blob);
    views.push(view);
    return view;
  }

  function emitSpark(x, y, z, hot, ice) {
    const i = sparkCursor % sparkN;
    sparkCursor++;
    sparkLife[i] = 1;
    sparkPos[i * 3] = x + (Math.random() - 0.5) * 0.3;
    sparkPos[i * 3 + 1] = y + Math.random() * 0.2;
    sparkPos[i * 3 + 2] = z + (Math.random() - 0.5) * 0.3;
    if (ice === "ice") {
      sparkCol[i * 3] = 0.86;
      sparkCol[i * 3 + 1] = 0.94;
      sparkCol[i * 3 + 2] = 1;
      return;
    }
    if (ice === "foam") {
      sparkCol[i * 3] = 0.75;
      sparkCol[i * 3 + 1] = 0.9;
      sparkCol[i * 3 + 2] = 0.88;
      return;
    }
    if (ice === "flame") {
      sparkLife[i] = hot ? 0.9 : 0.62;
      sparkCol[i * 3] = 1;
      sparkCol[i * 3 + 1] = hot ? 0.78 : 0.26 + Math.random() * 0.28;
      sparkCol[i * 3 + 2] = hot ? 0.28 : 0.04;
      return;
    }
    if (ice === "boost") {
      sparkLife[i] = 1.35;
      sparkCol[i * 3] = 1;
      sparkCol[i * 3 + 1] = 0.62;
      sparkCol[i * 3 + 2] = 0.08;
      return;
    }
    if (ice === "hit") {
      sparkLife[i] = 0.7;
      sparkCol[i * 3] = 1;
      sparkCol[i * 3 + 1] = 0.95;
      sparkCol[i * 3 + 2] = 0.7;
      return;
    }
    if (ice === "dust") {
      sparkLife[i] = 0.55;
      sparkCol[i * 3] = 0.55;
      sparkCol[i * 3 + 1] = 0.4;
      sparkCol[i * 3 + 2] = 0.22;
      return;
    }
    const heat = hot ? 1 : 0.55 + Math.random() * 0.4;
    sparkCol[i * 3] = 1;
    sparkCol[i * 3 + 1] = 0.55 + heat * 0.4;
    sparkCol[i * 3 + 2] = 0.15 * heat;
  }

  for (const r of ROSTER) mountKart(r);

  function resize(w, h, dprCap) {
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, dprCap));
    renderer.setSize(w, h, false);
    camera.aspect = Math.max(0.2, w / Math.max(1, h));
    camera.updateProjectionMatrix();
    const phone = w < 700;
    const size = phone ? 1024 : 2048;
    if (sun.shadow.mapSize.x !== size) {
      sun.shadow.mapSize.set(size, size);
      if (sun.shadow.map) sun.shadow.map.dispose();
    }
  }

  function frameCheck() {
    const view = views[0];
    if (!view) return { ok: false, reason: "no kart" };
    const rear = view.rear;
    view.group.rotation.set(0, 0, 0);
    view.group.position.set(0, 0, 0);
    view.group.updateMatrixWorld(true);
    const nose = new THREE.Vector3(0, 0, 1);
    const head = new THREE.Vector3();
    view.group.localToWorld(head.copy(new THREE.Vector3(0, 1.4, 0.4)));
    const tail = new THREE.Vector3();
    rear.getWorldPosition(tail);
    const facing = head.clone().sub(tail);
    facing.y = 0;
    facing.normalize();
    view.group.rotation.y = 0;
    view.group.updateMatrixWorld(true);
    rear.getWorldPosition(tail);
    view.group.localToWorld(head.set(0, 1.4, 0.4));
    const f0 = head.clone().sub(tail);
    f0.y = 0;
    f0.normalize();
    const fwd = new THREE.Vector3(0, 0, 1);
    if (f0.dot(fwd) < 0.8) return { ok: false, reason: "yaw0 " + f0.x.toFixed(2) + "," + f0.z.toFixed(2) };
    view.group.rotation.y = Math.PI / 2;
    view.group.updateMatrixWorld(true);
    rear.getWorldPosition(tail);
    view.group.localToWorld(head.set(0, 1.4, 0.4));
    const f1 = head.clone().sub(tail);
    f1.y = 0;
    f1.normalize();
    if (f1.dot(new THREE.Vector3(1, 0, 0)) < 0.8) {
      return { ok: false, reason: "yaw90 " + f1.x.toFixed(2) + "," + f1.z.toFixed(2) };
    }
    nose.applyQuaternion(view.group.quaternion);
    return { ok: true, nose: { x: nose.x, z: nose.z } };
  }

  function poseCart(view, k, dt, race) {
    const speed = k.speed || 0;
    const nose = forward(k.yaw);
    const fwdSp = (k.vx || 0) * nose.x + (k.vz || 0) * nose.z;
    const steer = Math.max(-1, Math.min(1, k.steerSm || 0));
    const stunned = (k.stun || 0) > 0;
    const scale = view.group.scale.x || 1;
    const kind = view.group.userData.kind;
    const steerMax = kind === "nib" || kind === "tall" ? (25 * Math.PI) / 180 : (32 * Math.PI) / 180;
    const steerAng = stunned ? Math.sin(race.time * 18) * 0.4 : steer * steerMax;
    for (const w of view.wheels || []) {
      const worldR = Math.max(0.12, w.radius * scale);
      w.spin += (fwdSp / worldR) * dt;
      w.spinPivot.rotation.x = w.spin;
      if (w.steer && w.yawPivot) {
        const cur = w.yawPivot.rotation.y;
        w.yawPivot.rotation.y = cur + (steerAng - cur) * Math.min(1, dt * 12);
      }
    }
    const sus = view.sus || (view.sus = { y: 0, pitch: 0, roll: 0, land: 0 });
    const rate = 1 - Math.exp(-Math.max(0.001, dt) * 8);
    const bump = Math.sin((k.x + k.z) * 0.85) * Math.min(0.03, speed * 0.0014);
    if ((view.airWas || 0) > 0.12 && (k.air || 0) === 0 && k.grounded) sus.land = 1;
    view.airWas = k.air || 0;
    sus.land = Math.max(0, sus.land - dt * 2.4);
    const landY = -Math.sin(sus.land * Math.PI) * 0.11;
    const landPitch = Math.sin(sus.land * Math.PI * 2) * 0.14 * sus.land;
    const targetY = bump - (k.throttle || 0) * 0.045 + landY;
    sus.y += (targetY - sus.y) * rate;
    const noseDip = (k.braking || 0) * 0.18 - (k.throttle || 0) * 0.1 + landPitch;
    sus.pitch += (noseDip - sus.pitch) * rate;
    const rollTarget = -steer * ((6 * Math.PI) / 180) + (stunned ? Math.sin(race.time * 22) * 0.1 : 0);
    sus.roll += (rollTarget - sus.roll) * rate;
    const squash = Math.sin(sus.land * Math.PI);
    if (view.chassis) {
      view.chassis.position.y = sus.y;
      view.chassis.rotation.x = sus.pitch;
      view.chassis.rotation.z = sus.roll;
      view.chassis.rotation.y = Math.sin(race.time * (3.2 + speed * 0.08)) * Math.min(0.04, speed * 0.0012);
      view.chassis.scale.set(1 + squash * 0.02, 1 - squash * 0.07, 1 + squash * 0.03);
    }
    if (view.driver) {
      const baseY = view.driver.userData.baseY || 0;
      view.driver.rotation.z = stunned ? Math.sin(race.time * 16) * 0.28 : steer * ((12 * Math.PI) / 180);
      view.driver.rotation.y = stunned ? Math.sin(race.time * 8) * 0.2 : steer * ((4 * Math.PI) / 180);
      view.driver.position.y = baseY + Math.sin(race.time * 10 + speed) * Math.min(0.02, speed * 0.0008);
    }
    if (view.head) {
      view.head.rotation.y = stunned ? Math.sin(race.time * 11) * 0.4 : steer * ((15 * Math.PI) / 180);
      view.head.rotation.z = stunned ? Math.sin(race.time * 14) * 0.2 : 0;
      view.head.rotation.x = stunned ? Math.sin(race.time * 9) * 0.1 : 0;
    }
    const brace = Math.min(1, Math.abs(steer) * 1.5 + (k.braking || 0));
    for (const arm of view.arms || []) {
      const wob = stunned ? Math.sin(race.time * 20 + arm.userData.side) * 0.28 : 0;
      arm.rotation.z = (arm.userData.baseZ || 0) + arm.userData.side * brace * 0.32;
      arm.rotation.x = (arm.userData.baseX || 0) + wob;
    }
    const wind = Math.min(1.5, speed / 15);
    (view.scarfTails || []).forEach((t, i) => {
      const wave = Math.sin(race.time * (6 + wind * 13) + i * 0.75);
      t.rotation.x = -0.3 - wind * 0.7 + wave * (0.2 + wind * 0.38);
      t.rotation.y = wave * (0.24 + wind * 0.58);
      t.scale.z = 1 + wind * 0.75;
    });
    (view.lanterns || []).forEach((lan, i) => {
      const sway = (8 * Math.PI) / 180;
      lan.rotation.z = Math.sin(race.time * 3.4 + i * 1.3) * sway;
      lan.rotation.x = Math.cos(race.time * 2.7 + i) * sway * 0.65;
      if (lan.userData.glow) lan.userData.glow.emissiveIntensity = 0.85 + Math.sin(race.time * 8 + i * 2) * 0.35;
    });
    const boosting = (k.boost || 0) > 0.05;
    (view.flames || []).forEach((fl, i) => {
      if (fl.userData && fl.userData.manual) return;
      const flick = 0.7 + Math.abs(Math.sin(race.time * 29 + i * 2.2)) * 0.55;
      const kick = boosting ? 1.7 : 1;
      fl.scale.set(0.8 * kick * flick, (0.75 + (boosting ? 1.2 : 0)) * flick, 1);
      if (fl.material) fl.material.opacity = boosting ? 1 : 0.88;
    });
    if (view.pose) view.pose(race.time, speed, boosting);
    if (view.ribbon) {
      view.ribbon.visible = boosting;
      if (view.ribbonSheet) view.ribbonSheet.material.opacity = boosting ? 0.96 : 0;
      if (view.ribbonCore) view.ribbonCore.material.opacity = boosting ? 1 : 0;
    }
    if (view.flare) {
      view.flare.visible = boosting;
      if (boosting) {
        const flick = 0.9 + Math.sin(race.time * 42) * 0.18;
        view.flare.scale.setScalar(flick);
      }
    }
  }

  function update(race, dt, portrait) {
    waterMat.uniforms.uTime.value += dt;
    spillMat.uniforms.uTime.value += dt;
    const you = race.karts.find((k) => !k.cpu) || race.karts[0];
    for (let i = 0; i < race.karts.length; i++) {
      const k = race.karts[i];
      const view = views[i];
      if (view.hi && view.lo) {
        const want = !k.cpu;
        if (view.hiOn !== want) {
          view.hi.group.visible = want;
          view.lo.group.visible = !want;
          activateKart(view, want ? view.hi : view.lo);
          view.hiOn = want;
          view.group.userData.draws = (want ? view.hi : view.lo).group.userData.draws;
          view.group.userData.tris = (want ? view.hi : view.lo).group.userData.tris;
        }
      }
      const fr = liveTrack.frames[k.hint] || frameAt(liveTrack, k.t);
      if (k.grounded && fr.loop && fr.up) {
        const dir = k.loopDir || 1;
        const fwd = new THREE.Vector3(fr.tangent.x * dir, fr.tangent.y * dir, fr.tangent.z * dir);
        if (fwd.lengthSq() < 1e-6) fwd.set(0, 0, 1);
        fwd.normalize();
        const roof = new THREE.Vector3(fr.up.x, fr.up.y, fr.up.z);
        if (Math.abs(roof.dot(fwd)) > 0.96) roof.set(0, 1, 0);
        roof.addScaledVector(fwd, -roof.dot(fwd)).normalize();
        const right = new THREE.Vector3().crossVectors(roof, fwd);
        if (right.lengthSq() < 1e-6) right.set(1, 0, 0);
        right.normalize();
        view.group.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(right, roof, fwd));
      } else {
        const visualYaw = k.yaw + k.slip * 0.35;
        const qYaw = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), visualYaw);
        const along = Math.sin(k.yaw) * fr.tangent.x + Math.cos(k.yaw) * fr.tangent.z;
        const pitch = k.grounded
          ? -Math.atan(fr.tangent.y) * Math.max(-1, Math.min(1, along))
          : -Math.atan2(k.vy || 0, Math.max(3, k.speed));
        const qPitch = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), pitch);
        const qBank = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), k.grounded ? -fr.bank : 0);
        view.group.quaternion.copy(qYaw).multiply(qPitch).multiply(qBank);
      }
      const hop = k.boost > 0 ? Math.sin(race.time * 28) * 0.05 : 0;
      view.group.position.set(k.x, k.y + hop, k.z);
      view.blob.position.set(k.x, (k.grounded ? k.y : 0.08) + 0.04, k.z);
      view.blob.material.opacity = k.grounded ? 0.28 : 0.1;
      poseCart(view, k, dt, race);
      const noseF = forward(k.yaw);
      const fwdSp = k.vx * noseF.x + k.vz * noseF.z;
      const moving = Math.abs(fwdSp) > 4;
      if (moving) {
        const icy = liveTrack.theme === "frost";
        const wet = (k.wet || 0) > 0.02 || (k.splash || 0) > 0.05;
        const kind = icy ? "ice" : wet ? "foam" : "dust";
        const rx = Math.cos(k.yaw);
        const rz = -Math.sin(k.yaw);
        for (const side of [-0.75, 0.75]) {
          emitSpark(k.x - noseF.x * 0.85 + rx * side, k.y + 0.12, k.z - noseF.z * 0.85 + rz * side, false, kind);
        }
      }
      if (k.boost > 0.15) {
        const bf = forward(k.yaw);
        const brx = Math.cos(k.yaw);
        const brz = -Math.sin(k.yaw);
        emitSpark(k.x - bf.x * 1.6, k.y + 0.36, k.z - bf.z * 1.6, true, "boost");
        emitSpark(k.x - bf.x * 2.4 + brx * 0.35, k.y + 0.28, k.z - bf.z * 2.4 + brz * 0.35, true, "boost");
        emitSpark(k.x - bf.x * 2.4 - brx * 0.35, k.y + 0.28, k.z - bf.z * 2.4 - brz * 0.35, true, "boost");
        emitSpark(k.x - bf.x * 3.4, k.y + 0.2, k.z - bf.z * 3.4, false, "boost");
        emitSpark(k.x - bf.x * 4.2, k.y + 0.16, k.z - bf.z * 4.2, false, "boost");
      }
      if (!view.hitShell) {
        view.hitShell = new THREE.Mesh(
          new THREE.SphereGeometry(1.45, 10, 8),
          new THREE.MeshBasicMaterial({ color: 0xfff6d0, transparent: true, opacity: 0.62, depthWrite: false })
        );
        view.hitShell.position.y = 0.75;
        view.hitShell.visible = false;
        view.group.add(view.hitShell);
      }
      const flashing = (k.hitFlash || 0) > 0;
      view.hitShell.visible = flashing;
      if (flashing) {
        view.hitShell.material.opacity = Math.min(0.78, k.hitFlash * 1.7);
        emitSpark(k.x, k.y + 1.35, k.z, true, "hit");
        emitSpark(k.x, k.y + 0.7, k.z, true, "hit");
      }
      if ((k.splash || 0) > 0.4) {
        for (let n = 0; n < 3; n++) emitSpark(k.x + (n - 1) * 0.4, k.y + 0.15, k.z, false, "foam");
      }
    }
    for (let i = 0; i < sparkN; i++) {
      if (sparkLife[i] <= 0) {
        sparkPos[i * 3 + 1] = -10;
        continue;
      }
      sparkLife[i] -= dt * 1.8;
      sparkPos[i * 3 + 1] += dt * 1.4;
      sparkCol[i * 3 + 1] *= 0.98;
    }
    sparkGeo.attributes.position.needsUpdate = true;
    sparkGeo.attributes.color.needsUpdate = true;

    for (let i = 0; i < mists.length; i++) {
      mists[i].position.y = (mists[i].userData.baseY || 2) + Math.sin(race.time * 0.8 + i) * 0.45;
      mists[i].lookAt(camera.position);
    }

    const air = !you.grounded;
    const frYou = liveTrack.frames[you.hint] || frameAt(liveTrack, you.t);
    const onLoop = you.grounded && frYou.loop && frYou.up;
    const opening = liveTrack.id === "dam" && (race.phase === "countdown" || (race.phase === "race" && race.time < 1));
    let back = (portrait ? 9.4 : 11.6) + (onLoop ? 4.2 : 0);
    let up = (portrait ? 3.9 : 4.2) + (air ? 0.5 : 0);
    if (opening) {
      back *= 1.2;
      up *= 1.2;
      up += 1.15;
    }
    const ahead = air ? 4.6 : portrait ? 7.0 : 7.6;
    const sideAmt = portrait ? 0 : 0.9;
    const nose = forward(you.yaw);
    tmpF.set(nose.x, 0, nose.z);
    const side = new THREE.Vector3(Math.cos(you.yaw), 0, -Math.sin(you.yaw));
    camGoal.set(you.x, Math.max(1.4, you.y + up), you.z).addScaledVector(tmpF, -back).addScaledVector(side, sideAmt);
    if (opening) {
      const wx = wall.position.x - you.x;
      const wz = wall.position.z - you.z;
      const wl = Math.hypot(wx, wz) || 1;
      camGoal.x -= (wx / wl) * 4.5;
      camGoal.z -= (wz / wl) * 4.5;
      camGoal.y += 0.8;
    }
    lookGoal.set(you.x, you.y + 1.15, you.z).addScaledVector(tmpF, (opening ? 6.5 : ahead) * (onLoop ? 0.4 : 1));
    if (onLoop) {
      const inward = frYou.up.y < 0.2 ? 1.7 : 0.45;
      camGoal.x += frYou.up.x * inward;
      camGoal.y += frYou.up.y * inward;
      camGoal.z += frYou.up.z * inward;
    }
    const blend = 1 - Math.exp(-Math.max(0.001, dt) * 9);
    if (race.phase === "splash") {
      raceCam = false;
      camera.position.lerp(new THREE.Vector3(18, 16, -6), 0.02);
      look.lerp(new THREE.Vector3(0, 10, -28), 0.02);
    } else if (!raceCam) {
      camera.position.copy(camGoal);
      look.copy(lookGoal);
      raceCam = true;
    } else {
      camera.position.lerp(camGoal, Math.min(1, blend));
      look.lerp(lookGoal, Math.min(1, blend));
    }
    if (race.shake > 0) {
      const kick = race.shake * 0.55;
      camera.position.x += Math.sin(race.time * 54) * kick;
      camera.position.y += Math.cos(race.time * 47) * kick * 0.45;
      camera.position.z += Math.sin(race.time * 41) * kick * 0.35;
    }
    camera.lookAt(look);
    if (aimLock) {
      const ai = ROSTER.findIndex((r) => r.id === aimLock.id);
      const vg = views[ai] && views[ai].group;
      if (vg) {
        const p = new THREE.Vector3();
        vg.getWorldPosition(p);
        const fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(vg.quaternion);
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(vg.quaternion);
        const side = aimLock.side || 3.4;
        const front = aimLock.front == null ? -1.1 : aimLock.front;
        camera.position.copy(p).addScaledVector(right, side).addScaledVector(fwd, front);
        camera.position.y = p.y + 1.55;
        camera.lookAt(p.x, p.y + 1.05, p.z);
        if (Math.abs(camera.fov - 40) > 0.2) {
          camera.fov = 40;
          camera.updateProjectionMatrix();
        }
      }
    }
    const boostFov = you.boost > 0 ? 9 : 0;
    const fov = (portrait ? 74 : 52) + boostFov;
    if (Math.abs(camera.fov - fov) > 0.2) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
    paintItems(race, dt);
    spray.children.forEach((card, i) => {
      const base = card.userData.baseY || 4;
      card.position.y = base + ((race.time * 1.7 + i * 0.37) % 11);
      card.lookAt(camera.position);
    });
    renderer.render(scene, camera);
  }

  const fx = new THREE.Group();
  scene.add(fx);
  const sapGeo = new THREE.SphereGeometry(0.55, 12, 10);
  const boxGeo = new THREE.BoxGeometry(1.05, 1.05, 1.05);
  const ringGeo = new THREE.TorusGeometry(0.85, 0.08, 8, 18);
  const stickGeo = new THREE.CylinderGeometry(0.09, 0.09, 1.35, 6);
  const iceGeo = new THREE.BoxGeometry(0.85, 1.7, 0.55);
  const blastGeo = new THREE.SphereGeometry(1.2, 12, 10);
  const boltGeo = new THREE.BoxGeometry(0.42, 0.42, 1);
  const boltCoreGeo = new THREE.BoxGeometry(0.16, 0.16, 1);
  const logGeo = new THREE.CylinderGeometry(1.2, 1.2, 7.2, 14);
  const starArm = new THREE.BoxGeometry(0.72, 0.16, 0.16);
  const coneGeo = new THREE.ConeGeometry(0.28, 0.7, 8);
  const diskGeo = new THREE.CircleGeometry(0.9, 14);
  const sapMat = new THREE.MeshStandardMaterial({ color: 0xd6e24a, emissive: 0x8aaa18, emissiveIntensity: 1.2, transparent: true, opacity: 0.94 });
  const rocketMat = new THREE.MeshStandardMaterial({ color: 0xf0a024, emissive: 0xff6a00, emissiveIntensity: 1.5 });
  const crateMap = crateTexture(THREE);
  const crateMat = new THREE.MeshStandardMaterial({ map: crateMap, roughness: 0.48, emissive: 0x145e66, emissiveIntensity: 0.35 });
  const ringMat = new THREE.MeshStandardMaterial({ color: 0x7ee7e0, emissive: 0x14c8c0, emissiveIntensity: 1.3 });
  const stickMat = new THREE.MeshStandardMaterial({ map: woodMap, color: 0x8a4b28, roughness: 0.8 });
  const iceMat = new THREE.MeshStandardMaterial({ color: 0xe7f4ff, emissive: 0x8ecfff, emissiveIntensity: 0.55, transparent: true, opacity: 0.9 });
  const emberMat = new THREE.MeshBasicMaterial({ color: 0xffb703 });
  const starMat = new THREE.MeshStandardMaterial({ color: 0xfff1c2, emissive: 0xffc94a, emissiveIntensity: 1.1 });
  const orbMat = new THREE.MeshStandardMaterial({ color: 0x2f6dff, emissive: 0x1a4dff, emissiveIntensity: 1.4 });
  const boltMat = new THREE.MeshBasicMaterial({ color: 0x9af6ff });
  const boltCoreMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const logMat = new THREE.MeshStandardMaterial({ map: woodMap, color: 0xc47a3a, roughness: 0.72 });
  const logEnd = new THREE.MeshStandardMaterial({ color: 0xd7b48a, roughness: 0.7 });
  const mistMat = new THREE.MeshStandardMaterial({ color: 0xd5e4ee, emissive: 0x9fb4c4, emissiveIntensity: 0.4, transparent: true, opacity: 0.42 });
  const bombMat = new THREE.MeshStandardMaterial({ color: 0x2a2420, roughness: 0.45, emissive: 0xf0a024, emissiveIntensity: 0.35 });
  const craterMat = new THREE.MeshStandardMaterial({ color: 0xf0a024, emissive: 0xff6a00, emissiveIntensity: 1.2, transparent: true, opacity: 0.85, side: THREE.DoubleSide });
  const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28, depthWrite: false });

  function addMesh(geo, mat, x, y, z, s) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    if (s) m.scale.setScalar(s);
    m.castShadow = true;
    fx.add(m);
    return m;
  }

  function groundBlob(x, y, z, s) {
    const blob = addMesh(diskGeo, shadowMat, x, y + 0.06, z, s || 1);
    blob.rotation.x = -Math.PI / 2;
    blob.castShadow = false;
    return blob;
  }

  function starShape(x, y, z, s) {
    const g = new THREE.Group();
    const a = new THREE.Mesh(starArm, starMat);
    const b = new THREE.Mesh(starArm, starMat);
    b.rotation.z = Math.PI / 2;
    const c = new THREE.Mesh(starArm, starMat);
    c.rotation.y = Math.PI / 2;
    g.add(a, b, c);
    g.position.set(x, y, z);
    g.scale.setScalar(s || 1);
    fx.add(g);
    return g;
  }

  function boltBetween(a, b, phase) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dz = b.z - a.z;
    const steps = 9;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const jag = Math.sin(phase * 22 + i * 1.35) * 0.85;
      const x = a.x + dx * t + jag;
      const y = a.y + dy * t + Math.sin(phase * 17 + i) * 0.4;
      const z = a.z + dz * t - jag * 0.55;
      addMesh(sapGeo, boltMat, x, y, z, i % 2 ? 0.46 : 0.34);
      addMesh(sapGeo, boltCoreMat, x, y, z, 0.2);
    }
  }

  function paintItems(race) {
    while (fx.children.length) fx.remove(fx.children[0]);
    if (!race.boxes) return;
    for (const box of race.boxes) {
      if (!box.alive) continue;
      const fr = frameAt(liveTrack, box.t);
      const bob = Math.sin(race.time * 3.2 + box.t * 12) * 0.16;
      const lat = (box.lane || 0) * fr.width * 0.5;
      const g = new THREE.Group();
      const crate = new THREE.Mesh(boxGeo, crateMat);
      crate.castShadow = true;
      g.add(crate);
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = -0.35;
      g.add(ring);
      const beam = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.22, 1.6, 8),
        new THREE.MeshBasicMaterial({ color: 0x7ee7e0, transparent: true, opacity: 0.45 })
      );
      beam.position.y = 1.15;
      g.add(beam);
      g.position.set(fr.p.x + fr.right.x * lat, fr.p.y + 1.2 + bob, fr.p.z + fr.right.z * lat);
      g.rotation.y = race.time * 1.3 + box.t * 8;
      fx.add(g);
      groundBlob(g.position.x, fr.p.y, g.position.z, 1.3);
    }
    for (const shot of race.shots || []) {
      groundBlob(shot.x, shot.y - 0.7, shot.z, shot.kind === "rocket" ? 1.1 : 1.4);
      if (shot.kind === "pine") {
        const g = new THREE.Group();
        const body = new THREE.Mesh(new THREE.ConeGeometry(1.35, 2.05, 8), rocketMat);
        body.rotation.x = Math.PI / 2;
        const band = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.1, 6, 10), emberMat);
        band.rotation.x = Math.PI / 2;
        g.add(body, band);
        g.position.set(shot.x, shot.y, shot.z);
        g.lookAt(shot.x + shot.vx, shot.y, shot.z + shot.vz);
        fx.add(g);
      } else if (shot.kind === "rocket" || shot.kind === "orb") {
        const g = new THREE.Group();
        const bodyMat = shot.kind === "orb" ? orbMat : rocketMat;
        const body = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.5, 2.1, 10), bodyMat);
        const nose = new THREE.Mesh(new THREE.ConeGeometry(0.52, 0.8, 10), bodyMat);
        nose.position.y = 1.35;
        const fin = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.36, 0.12), bodyMat);
        fin.position.y = -0.45;
        g.add(body, nose, fin);
        g.position.set(shot.x, shot.y, shot.z);
        g.lookAt(shot.x + shot.vx, shot.y, shot.z + shot.vz);
        g.rotateX(Math.PI / 2);
        fx.add(g);
      } else {
        const blob = addMesh(sapGeo, sapMat, shot.x, shot.y, shot.z, 2.15);
        blob.scale.set(1.8, 2.1, 1.8);
      }
      shot.trail.forEach((p, i) => {
        const geo = shot.kind === "rocket" ? coneGeo : sapGeo;
        const mat = shot.kind === "rocket" ? emberMat : sapMat;
        const m = addMesh(geo, mat, p.x, p.y, p.z, 0.55 + i * 0.06);
        if (shot.kind === "rocket") m.rotation.x = Math.PI / 2;
      });
    }
    for (const trap of race.traps || []) {
      const g = new THREE.Group();
      g.position.set(trap.x, trap.y + 0.08, trap.z);
      g.rotation.y = trap.yaw || 0;
      const plate = new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.1, 5.6), new THREE.MeshStandardMaterial({
        color: 0xc4522a, emissive: 0x8a3018, emissiveIntensity: 0.75,
      }));
      g.add(plate);
      for (let i = 0; i < 6; i++) {
        const m = new THREE.Mesh(stickGeo, stickMat);
        m.position.set((i % 2 ? -1.5 : 1.5), 0.45, -2.0 + i * 0.72);
        m.rotation.z = (i - 2.5) * 0.4;
        m.rotation.x = 0.55;
        g.add(m);
      }
      fx.add(g);
    }
    for (const wall of race.surges || []) {
      const g = new THREE.Group();
      g.position.set(wall.x, wall.y + 1.1, wall.z);
      g.rotation.y = wall.yaw || 0;
      const slab = new THREE.Mesh(new THREE.BoxGeometry(5.5, 2.5, 4), new THREE.MeshStandardMaterial({
        color: 0x3ec6e0, emissive: 0x1468c8, emissiveIntensity: 0.8, transparent: true, opacity: 0.55,
      }));
      const lip = new THREE.Mesh(new THREE.BoxGeometry(5.7, 0.28, 4.1), starMat);
      lip.position.y = 1.2;
      g.add(slab, lip);
      fx.add(g);
    }
    for (const link of race.tethers || []) {
      if (link.ax == null) continue;
      const dx = link.bx - link.ax;
      const dz = link.bz - link.az;
      const len = Math.hypot(dx, dz) || 0.2;
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, len, 6), boltMat);
      beam.position.set((link.ax + link.bx) * 0.5, link.y || 1, (link.az + link.bz) * 0.5);
      beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(dx / len, 0.15, dz / len).normalize());
      fx.add(beam);
      const steps = 5;
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        addMesh(sapGeo, boltCoreMat, link.ax + dx * t, (link.y || 1) + Math.sin(t * Math.PI) * 0.45, link.az + dz * t, 0.34);
      }
    }
    for (const patch of race.slicks || []) {
      const puddle = addMesh(diskGeo, new THREE.MeshBasicMaterial({ color: 0xf0a024, transparent: true, opacity: 0.82, side: THREE.DoubleSide }), patch.x, patch.y + 0.08, patch.z, 1);
      puddle.rotation.x = -Math.PI / 2;
      puddle.rotation.z = patch.yaw || 0;
      puddle.scale.set(1.78, 2.34, 1);
    }
    for (const chip of race.meteors || []) {
      const rock = addMesh(new THREE.DodecahedronGeometry(0.7, 0), rocketMat, chip.x, chip.y, chip.z, 1.3);
      rock.rotation.y = chip.age * 6;
      addMesh(sapGeo, emberMat, chip.x, chip.y - 0.8, chip.z, 0.45);
    }
    for (const k of race.karts || []) {
      if ((k.buckler || 0) <= 0) continue;
      const aura = addMesh(ringGeo, starMat, k.x, k.y + 0.9, k.z, 5.9);
      aura.rotation.x = -Math.PI / 2;
    }
    for (const wall of race.walls || []) {
      const g = new THREE.Group();
      g.position.set(wall.x, wall.y, wall.z);
      g.rotation.y = wall.yaw || 0;
      for (const side of [-1.35, 0, 1.35]) {
        const slab = new THREE.Mesh(iceGeo, iceMat);
        slab.position.set(side, 1.15, 0);
        slab.castShadow = true;
        const cap = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.22, 0.7), starMat);
        cap.position.y = 0.95;
        slab.add(cap);
        g.add(slab);
      }
      fx.add(g);
      groundBlob(wall.x, wall.y, wall.z, 2.2);
    }
    for (const bolt of race.bolts || []) {
      const links = bolt.links || [];
      const phase = race.time * 3 + (bolt.max - bolt.life) * 9;
      for (let i = 0; i < links.length - 1; i++) boltBetween(links[i], links[i + 1], phase + i);
    }
    for (const log of race.logs || []) {
      const g = new THREE.Group();
      g.position.set(log.x || 0, (log.y || 0) + 1.45, log.z || 0);
      g.rotation.y = log.yaw || 0;
      const roller = new THREE.Group();
      roller.rotation.z = log.spin || 0;
      const body = new THREE.Mesh(logGeo, logMat);
      body.rotation.x = Math.PI / 2;
      body.castShadow = true;
      const capA = new THREE.Mesh(new THREE.CircleGeometry(1.28, 14), logEnd);
      capA.position.z = 3.6;
      const capB = capA.clone();
      capB.position.z = -3.6;
      const band = new THREE.Mesh(new THREE.TorusGeometry(1.25, 0.1, 6, 14), logEnd);
      band.rotation.x = Math.PI / 2;
      roller.add(body, capA, capB, band);
      g.add(roller);
      fx.add(g);
      groundBlob(log.x || 0, log.y || 0, log.z || 0, 3.4);
      const backX = -Math.sin(log.yaw || 0);
      const backZ = -Math.cos(log.yaw || 0);
      for (let i = 0; i < 8; i++) {
        const chunk = addMesh(logGeo, logMat, (log.x || 0) - backX * (1.4 + i * 1.15), (log.y || 0) + 0.55 + (i % 2) * 0.2, (log.z || 0) - backZ * (1.4 + i * 1.15), 0.16);
        chunk.rotation.z = (log.spin || 0) + i;
        chunk.rotation.y = (log.yaw || 0) + 0.4;
        addMesh(sapGeo, emberMat, (log.x || 0) - backX * (1.1 + i * 1.2), (log.y || 0) + 0.35, (log.z || 0) - backZ * (1.1 + i * 1.2), 0.45 + (i % 3) * 0.08);
      }
    }
    for (const d of race.decoys || []) {
      const g = new THREE.Group();
      g.position.set(d.x, d.y + 0.4, d.z);
      g.rotation.y = d.yaw || 0;
      g.scale.setScalar(0.82);
      const hull = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.36, 1.55), mistMat);
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.42, 10, 8), mistMat);
      body.position.set(0, 0.62, 0.12);
      body.scale.set(1.15, 0.8, 0.9);
      const tail = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.08, 0.4), mistMat);
      tail.position.set(0, 0.4, -0.85);
      g.add(hull, body, tail);
      fx.add(g);
    }
    for (const bomb of race.bombs || []) {
      const g = new THREE.Group();
      g.position.set(bomb.x, bomb.y, bomb.z);
      const shell = new THREE.Mesh(new THREE.SphereGeometry(0.82, 14, 12), bombMat);
      shell.castShadow = true;
      const band = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.08, 6, 14), craterMat);
      band.rotation.x = Math.PI / 2;
      const spark = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), emberMat);
      spark.position.y = 0.55;
      g.add(shell, band, spark);
      g.rotation.y = race.time * 4;
      fx.add(g);
      groundBlob(bomb.x, bomb.y - 1.2, bomb.z, 1.2);
    }
    for (const c of race.craters || []) {
      const k = 1 - c.life / c.max;
      const ring = addMesh(ringGeo, craterMat, c.x, c.y + 0.16, c.z, 4.8 + k * 8);
      ring.rotation.x = -Math.PI / 2;
      const disk = addMesh(diskGeo, craterMat, c.x, c.y + 0.08, c.z, 1.8 + k * 2.4);
      disk.rotation.x = -Math.PI / 2;
      disk.castShadow = false;
      for (let i = 0; i < 6; i++) {
        const a = i + race.time * 3;
        addMesh(sapGeo, emberMat, c.x + Math.cos(a) * (1 + k * 2), c.y + 0.6 + k, c.z + Math.sin(a) * (1 + k * 2), 0.35);
      }
    }
    for (const b of race.bursts || []) {
      const k = 1 - b.life / b.max;
      const kind = b.kind;
      const big = kind === "bomb" || kind === "blast" || kind === "shock";
      const mat = kind === "orb" || kind === "shock" ? orbMat : kind === "twig" ? boltMat : big || kind === "rocket" ? rocketMat : kind === "mist" ? mistMat : kind === "log" ? logMat : starMat;
      const geo = big ? blastGeo : sapGeo;
      addMesh(geo, mat, b.x, b.y + 0.4, b.z, big ? 0.7 + k * 1.6 : 0.4 + k * 0.55);
      if (big || kind === "meteor") {
        const span = kind === "blast" || kind === "meteor" ? 5.2 + k * 3.2 : 1.1 + k * 1.8;
        const ring = addMesh(ringGeo, mat, b.x, b.y + 0.1, b.z, span);
        ring.rotation.x = -Math.PI / 2;
      }
    }
    for (const k of race.karts || []) {
      if (k.invuln > 0) {
        for (let i = 0; i < 6; i++) {
          const a = race.time * 6 + i;
          starShape(k.x + Math.cos(a) * 1.7, k.y + 1.15 + Math.sin(a * 2) * 0.45, k.z + Math.sin(a) * 1.7, 0.7);
        }
      }
      if (k.orb > 0) {
        addMesh(sapGeo, orbMat, k.x, k.y + 1.7, k.z, 0.95);
        const ring = addMesh(ringGeo, orbMat, k.x, k.y + 0.3, k.z, 2.1);
        ring.rotation.x = -Math.PI / 2;
      }
    }
  }

  const backdrop = new THREE.Mesh(
    new THREE.PlaneGeometry(920, 340),
    new THREE.MeshBasicMaterial({ color: 0xd7c4a8, depthWrite: false })
  );
  scene.add(backdrop);
  backdrop.visible = false;
  function hangBackdrop(tr) {
    const c = crestOf(tr);
    backdrop.position.set(c.p.x - c.tangent.x * 110, c.p.y + 42, c.p.z - c.tangent.z * 110);
    backdrop.lookAt(c.p.x, c.p.y + 6, c.p.z);
  }
  hangBackdrop(track);
  const spray = new THREE.Group();
  scene.add(spray);
  for (let i = 0; i < 22; i++) {
    const card = new THREE.Mesh(
      new THREE.PlaneGeometry(3.2 + (i % 3) * 0.6, 8),
      new THREE.MeshBasicMaterial({ map: mistMap, transparent: true, depthWrite: false, opacity: 0.5, side: THREE.DoubleSide })
    );
    spray.add(card);
  }
  function placeSpray(tr) {
    const b = bridgeOf(tr);
    spray.children.forEach((card, i) => {
      const side = (i - 11) * 1.55;
      card.position.set(
        b.p.x + b.right.x * side + b.tangent.x * 7,
        b.p.y - 1.2,
        b.p.z + b.right.z * side + b.tangent.z * 7
      );
      card.userData.baseY = b.p.y - 1.2;
    });
  }
  placeSpray(track);
  const loader = new THREE.TextureLoader();
  const ready = new Promise((resolve) => {
    let left = 2;
    const done = () => { if (--left === 0) resolve(); };
    const take = (url, key) => {
      loader.load(url, (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = 8;
        backdrop.userData[key] = tex;
        if (key === "dam") {
          backdrop.material.map = tex;
          backdrop.material.color.set(0xffffff);
          backdrop.material.needsUpdate = true;
        }
        done();
      }, undefined, done);
    };
    take("assets/history/dam-loop.jpg?v=gd11", "dam");
    take("assets/history/frost-ridge.jpg?v=gd11", "frost");
  });

  let frostDress = null;
  let extraDress = null;
  const cloverLeaf = new THREE.MeshStandardMaterial({ color: 0x3e8a44, roughness: 0.75 });
  const cloverGold = new THREE.MeshStandardMaterial({ color: 0xe2c15a, roughness: 0.45, metalness: 0.2 });
  const palmTrunk = new THREE.MeshStandardMaterial({ color: 0x8a5a32, roughness: 0.85 });
  const palmLeaf = new THREE.MeshStandardMaterial({ color: 0x2f8f62, roughness: 0.7 });
  const duneMat = new THREE.MeshStandardMaterial({ color: 0xe6c98a, roughness: 0.92 });
  const pylonMat = new THREE.MeshStandardMaterial({ color: 0xd7c4a8, roughness: 0.55, metalness: 0.08 });
  const skyRail = new THREE.MeshStandardMaterial({ color: 0xf0a024, roughness: 0.4, metalness: 0.2 });
  function clearGroup(group) {
    while (group.children.length) {
      const child = group.children.pop();
      child.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
      });
    }
  }
  function fillExtra(next) {
    if (!extraDress) {
      extraDress = new THREE.Group();
      scene.add(extraDress);
    }
    clearGroup(extraDress);
    const theme = next.theme;
    extraDress.visible = theme === "clover" || theme === "oasis" || theme === "sky";
    if (!extraDress.visible) return;
    const railMatGuide = skyRail;
    const bermMat = new THREE.MeshStandardMaterial({ map: woodMap, color: 0xe8b15a, roughness: 0.55 });
    for (let i = 0; i < next.frames.length; i += 3) {
      const fr = next.frames[i];
      if (!fr.rail || fr.gap) continue;
      const up = fr.up || { x: 0, y: 1, z: 0 };
      const upV = new THREE.Vector3(up.x, up.y, up.z);
      if (upV.lengthSq() < 1e-6) upV.set(0, 1, 0);
      upV.normalize();
      const fwd = new THREE.Vector3(fr.tangent.x, fr.tangent.y, fr.tangent.z);
      if (fwd.lengthSq() < 1e-6) fwd.set(0, 0, 1);
      fwd.addScaledVector(upV, -fwd.dot(upV));
      if (fwd.lengthSq() < 1e-6) fwd.set(1, 0, 0);
      fwd.normalize();
      const across = new THREE.Vector3().crossVectors(upV, fwd).normalize();
      const basis = new THREE.Matrix4().makeBasis(across, upV, fwd);
      for (const side of [-1, 1]) {
        const berm = new THREE.Mesh(new THREE.BoxGeometry(0.95, 1.2, 2.7), bermMat);
        berm.position.set(
          fr.p.x + fr.right.x * (fr.width * 0.5 + 0.2) * side + upV.x * 0.48,
          fr.p.y + upV.y * 0.48,
          fr.p.z + fr.right.z * (fr.width * 0.5 + 0.2) * side + upV.z * 0.48
        );
        berm.quaternion.setFromRotationMatrix(basis);
        berm.castShadow = true;
        extraDress.add(berm);
      }
    }
    if (theme === "clover") {
      for (const tr of next.trees || []) {
        const bush = new THREE.Mesh(new THREE.SphereGeometry(0.9 * (tr.s || 1), 8, 6), cloverLeaf);
        bush.position.set(tr.x, 0.7 * (tr.s || 1), tr.z);
        bush.scale.set(1, 0.7, 1);
        const bud = new THREE.Mesh(new THREE.SphereGeometry(0.28 * (tr.s || 1), 6, 5), cloverGold);
        bud.position.set(tr.x, 1.35 * (tr.s || 1), tr.z);
        extraDress.add(bush, bud);
      }
    }
    if (theme === "oasis") {
      for (const tr of next.trees || []) {
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.28, 3.2, 6), palmTrunk);
        trunk.position.set(tr.x, 1.6, tr.z);
        const fan = new THREE.Mesh(new THREE.ConeGeometry(1.3, 0.7, 6), palmLeaf);
        fan.position.set(tr.x, 3.3, tr.z);
        extraDress.add(trunk, fan);
      }
      for (const rk of next.rocks || []) {
        const dune = new THREE.Mesh(new THREE.SphereGeometry(rk.s || 2, 8, 6), duneMat);
        dune.scale.set(1.4, 0.45, 1.1);
        dune.position.set(rk.x, 0.45 * (rk.s || 2), rk.z);
        extraDress.add(dune);
      }
    }
    if (theme === "sky") {
      for (const rk of next.rocks || []) {
        const hgt = rk.h || 12;
        const mast = new THREE.Mesh(new THREE.BoxGeometry(1.1, hgt, 1.1), pylonMat);
        mast.position.set(rk.x, hgt * 0.5, rk.z);
        const cap = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.35, 2.4), skyRail);
        cap.position.y = hgt * 0.48;
        mast.add(cap);
        extraDress.add(mast);
      }
    }
    const gate = next.frames.find((f) => !f.loop && !f.gap && !f.ceiling) || next.frames[0];
    for (const side of [-1, 1]) {
      const pole = new THREE.Mesh(new THREE.BoxGeometry(0.28, 2.6, 0.28), railMatGuide);
      pole.position.set(
        gate.p.x + gate.right.x * gate.width * 0.46 * side,
        gate.p.y + 1.3,
        gate.p.z + gate.right.z * gate.width * 0.46 * side
      );
      extraDress.add(pole);
    }
    const banner = new THREE.Mesh(new THREE.BoxGeometry(Math.min(14, gate.width * 0.86), 0.42, 0.08), bannerMat);
    banner.position.set(gate.p.x, gate.p.y + 2.35, gate.p.z);
    banner.rotation.y = Math.atan2(gate.right.x, gate.right.z);
    extraDress.add(banner);
    for (let i = 0; i < next.frames.length; i += 8) {
      const fr = next.frames[i];
      if (!fr.bridge) continue;
      let overRoad = false;
      for (const other of next.frames) {
        if (other === fr || other.bridge) continue;
        if (Math.hypot(other.p.x - fr.p.x, other.p.z - fr.p.z) < 7 && other.p.y < fr.p.y - 2) {
          overRoad = true;
          break;
        }
      }
      if (overRoad) continue;
      const h = Math.max(2.2, fr.p.y - 0.2);
      const pier = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.65, h, 7), pylonMat);
      pier.position.set(fr.p.x, h * 0.5, fr.p.z);
      extraDress.add(pier);
    }
  }
  function setTrack(next) {
    liveTrack = next;
    scene.remove(road.mesh, road.skirt, road.rivets, road.curb, road.line, road.chevrons);
    road.mesh.geometry.dispose();
    road.skirt.geometry.dispose();
    road.rivets.geometry.dispose();
    road.curb.geometry.dispose();
    road.line.geometry.dispose();
    road.chevrons.geometry.dispose();
    road = buildRoad(THREE, next, next.theme === "frost" ? iceMap : roadMap);
    const roadLook = {
      frost: { color: 0xd7e8f4, rough: 0.22, metal: 0.18, coat: 0.88, curb: 0xd7eef8 },
      clover: { color: 0xe2c15a, rough: 0.42, metal: 0.08, coat: 0.4, curb: 0x2f6a34 },
      oasis: { color: 0xd7b07a, rough: 0.55, metal: 0.06, coat: 0.25, curb: 0xc47a3a },
      sky: { color: 0xf4e6c8, rough: 0.32, metal: 0.14, coat: 0.66, curb: 0x8aa4b8 },
      dam: { color: 0xffffff, rough: 0.34, metal: 0.12, coat: 0.72, curb: 0x6b3a24 },
    };
    const look = roadLook[next.theme] || roadLook.dam;
    road.mesh.material.roughness = look.rough;
    road.mesh.material.metalness = look.metal;
    road.mesh.material.clearcoat = look.coat;
    road.mesh.material.color.set(look.color);
    road.mesh.material.emissive.set(next.theme === "sky" ? 0x6a5030 : 0x000000);
    road.mesh.material.emissiveIntensity = next.theme === "sky" ? 0.28 : 0;
    road.curb.material.color.set(look.curb);
    scene.add(road.mesh, road.skirt, road.rivets, road.curb, road.line, road.chevrons);
    scene.remove(waterGroup);
    waterGroup.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
    });
    waterGroup = buildWaterGroup(next);
    scene.add(waterGroup);
    waterMat.uniforms.uIce.value = next.theme === "frost" ? 1 : 0;
    const theme = next.theme;
    const frost = theme === "frost";
    const damOn = theme === "dam";
    for (const m of damBits) m.visible = damOn;
    for (const m of foliage) m.visible = damOn;
    for (const m of posts) m.visible = damOn;
    if (!frostDress) {
      frostDress = new THREE.Group();
      scene.add(frostDress);
    }
    frostDress.visible = frost;
    if (frost && frostDress.children.length === 0) {
      const iceCliff = new THREE.MeshPhysicalMaterial({
        color: 0xd5eef8,
        roughness: 0.14,
        metalness: 0.16,
        clearcoat: 0.94,
        clearcoatRoughness: 0.08,
      });
      const snowCap = new THREE.MeshStandardMaterial({ color: 0xf7fbff, roughness: 0.4 });
      for (const rk of next.rocks || []) {
        const hgt = rk.h || 8;
        const cliff = new THREE.Mesh(new THREE.BoxGeometry(6.5, hgt, 4.4), iceCliff);
        cliff.position.set(rk.x, rk.y * 0.45 + hgt * 0.15, rk.z);
        cliff.rotation.y = rk.yaw || 0;
        cliff.castShadow = true;
        const cap = new THREE.Mesh(new THREE.BoxGeometry(6.8, 1.1, 4.8), snowCap);
        cap.position.y = hgt * 0.42;
        cliff.add(cap);
        frostDress.add(cliff);
      }
      for (let i = 0; i < next.frames.length; i += 4) {
        const fr = next.frames[i];
        if (!fr.rail) continue;
        for (const side of [-1, 1]) {
          const post = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.2, 0.16), railMat);
          post.position.set(
            fr.p.x + fr.right.x * (fr.width * 0.5 + 0.2) * side,
            fr.p.y + 0.7,
            fr.p.z + fr.right.z * (fr.width * 0.5 + 0.2) * side
          );
          frostDress.add(post);
        }
      }
    }
    const groundTint = { dam: 0xffffff, frost: 0xffffff, clover: 0xc6e07a, oasis: 0xe7c98a, sky: 0xd7e6f2 };
    const fogTint = { dam: 0xf6e6c4, frost: 0xd7e8f4, clover: 0xcfe7a4, oasis: 0xf8e0b4, sky: 0xd7eefc };
    ground.material.map = frost || theme === "sky" ? snowMap : grassMap;
    ground.material.color.set(groundTint[theme] || 0xffffff);
    ground.material.needsUpdate = true;
    scene.fog.color.set(fogTint[theme] || fogTint.dam);
    hangBackdrop(next);
    backdrop.visible = false;
    if (backdrop.userData.dam) {
      backdrop.material.map = frost ? backdrop.userData.frost : backdrop.userData.dam;
      backdrop.material.needsUpdate = true;
    }
    spray.visible = damOn;
    if (damOn) placeSpray(next);
    fillExtra(next);
  }

  function modelOf(id) {
    const i = ROSTER.findIndex((r) => r.id === id);
    const g = views[i] && views[i].group;
    if (!g) return { kind: "", sig: 0 };
    return { kind: g.userData.kind || "", sig: g.userData.sig || 0 };
  }

  function sightClear(x, y, z) {
    const dx = x - camera.position.x;
    const dy = y - camera.position.y;
    const dz = z - camera.position.z;
    const dist = Math.hypot(dx, dy, dz);
    if (dist < 0.8) return true;
    raycaster.set(camera.position, new THREE.Vector3(dx / dist, dy / dist, dz / dist));
    raycaster.near = 0.15;
    raycaster.far = Math.max(0.2, dist - 0.8);
    const walls = damBits.filter((m) => m.visible && m.userData && m.userData.damWall);
    return raycaster.intersectObjects(walls, false).length === 0;
  }

  function motion() {
    return views.map((v) => {
      const drive = (v.wheels || [])[0];
      const steer = (v.wheels || []).find((w) => w.steer);
      const tail = v.scarfTails && v.scarfTails[0];
      return {
        kind: v.group.userData.kind,
        spin: drive ? drive.spin : 0,
        steer: steer ? steer.yawPivot.rotation.y : 0,
        roll: v.chassis ? v.chassis.rotation.z : 0,
        pitch: v.chassis ? v.chassis.rotation.x : 0,
        scarf: tail ? tail.rotation.x : 0,
        scarfLen: tail ? tail.scale.z : 1,
        flames: (v.flames || []).length,
        lanterns: (v.lanterns || []).length,
      };
    });
  }

  function stats() {
    const info = renderer.info.render;
    return { calls: info.calls, tris: info.triangles };
  }

  function aim(id, side, front) {
    aimLock = id ? { id, side: side == null ? 3.4 : side, front: front == null ? -1.1 : front } : null;
  }

  function ribbonSpan() {
    const v = views[0];
    if (!v || !v.ribbon) return null;
    v.group.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(v.ribbon);
    const size = box.getSize(new THREE.Vector3());
    return { x: size.x, y: size.y, z: size.z, max: Math.max(size.x, size.y, size.z) };
  }

  return { renderer, scene, camera, resize, update, frameCheck, views, setTrack, ready, modelOf, sightClear, motion, stats, aim, ribbonSpan };
}
