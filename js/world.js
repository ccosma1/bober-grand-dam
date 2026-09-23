import { ROSTER, frameAt, forward } from "./sim.js?v=gd12";
import { buildKart } from "./racers.js?v=gd12";

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
    g.fillStyle = "#cbb892";
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
      const drop = Math.max(f[i].bridge ? 1.6 : 1.05, f[i].p.y - 0.08);
      skirtPos.push(pos[o * 3], pos[o * 3 + 1], pos[o * 3 + 2]);
      skirtPos.push(pos[o * 3], pos[o * 3 + 1] - drop, pos[o * 3 + 2]);
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
    if (fr.gap) continue;
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
        vec3 zenith = vec3(0.42, 0.66, 0.78);
        vec3 hor = vec3(0.98, 0.72, 0.42);
        vec3 low = vec3(0.55, 0.58, 0.52);
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
  renderer.setClearColor(0x87b4c4, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.96;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xe7c49a, 140, 560);

  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 900);
  camera.position.set(0, 18, -18);

  const sky = new THREE.Mesh(new THREE.SphereGeometry(720, 24, 16), skyMaterial(THREE));
  scene.add(sky);

  const hemi = new THREE.HemisphereLight(0xc5e4ef, 0x6d8a58, 0.72);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffe0b0, 1.55);
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
  const rim = new THREE.DirectionalLight(0x9fd4ff, 0.55);
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
  scene.add(wall);
  const damBits = [wall];
  for (const side of [-1, 1]) {
    const butt = new THREE.Mesh(new THREE.BoxGeometry(9, 22, 14), concMat);
    const off = (crest.width * 0.5 + 18) * side;
    butt.position.set(wall.position.x + crest.right.x * off, crest.p.y, wall.position.z + crest.right.z * off);
    butt.rotation.y = crestYaw;
    butt.castShadow = true;
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
      g.fillStyle = frost ? "#e7eef3" : "#3f6a3c";
      g.fillRect(0, 0, w, h);
      for (let i = 0; i < 80; i++) {
        g.fillStyle = frost ? "rgba(255,255,255,0.35)" : "rgba(30,70,28,0.35)";
        g.beginPath();
        g.ellipse((i * 97) % w, (i * 53) % h, 18 + (i % 5) * 4, 10, i, 0, 6.3);
        g.fill();
      }
      g.fillStyle = frost ? "rgba(120,150,160,0.25)" : "rgba(90,70,40,0.28)";
      for (let i = 0; i < 24; i++) g.fillRect((i * 61) % w, (i * 37) % h, 8, 22);
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
  const postMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.18, 1.15, 0.18), railMat, Math.max(1, railSpots.length));
  const railMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.12, 0.1, 3.4), railMat, Math.max(1, railSpots.length));
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
  const banner = new THREE.Mesh(
    new THREE.BoxGeometry(gate.width * 0.92, 0.55, 0.08),
    new THREE.MeshStandardMaterial({ color: 0xf0a024, roughness: 0.45, emissive: 0x5a3208, emissiveIntensity: 0.35 })
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

  const look = new THREE.Vector3(0, 12, -10);
  const camGoal = new THREE.Vector3();
  const lookGoal = new THREE.Vector3();
  const tmpF = new THREE.Vector3();

  function mountKart(def) {
    const view = buildKart(THREE, def, woodMap);
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

  function update(race, dt, portrait) {
    waterMat.uniforms.uTime.value += dt;
    spillMat.uniforms.uTime.value += dt;
    const you = race.karts.find((k) => !k.cpu) || race.karts[0];
    for (let i = 0; i < race.karts.length; i++) {
      const k = race.karts[i];
      const view = views[i];
      const fr = liveTrack.frames[k.hint] || frameAt(liveTrack, k.t);
      const visualYaw = k.yaw + k.slip * 0.35;
      const qYaw = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), visualYaw);
      const along = Math.sin(k.yaw) * fr.tangent.x + Math.cos(k.yaw) * fr.tangent.z;
      const pitch = k.grounded
        ? -Math.atan(fr.tangent.y) * Math.max(-1, Math.min(1, along))
        : -Math.atan2(k.vy || 0, Math.max(3, k.speed));
      const qPitch = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), pitch);
      const qBank = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), k.grounded ? -fr.bank : 0);
      view.group.quaternion.copy(qYaw).multiply(qPitch).multiply(qBank);
      const hop = k.boost > 0 ? Math.sin(race.time * 28) * 0.05 : 0;
      view.group.position.set(k.x, k.y + hop, k.z);
      view.blob.position.set(k.x, (k.grounded ? k.y : 0.08) + 0.04, k.z);
      view.blob.material.opacity = k.grounded ? 0.28 : 0.1;
      const spin = k.speed * dt * 1.6;
      for (const w of view.wheels) w.rotation.x += spin;
      const icy = liveTrack.theme === "frost";
      const hot = k.spark > 0.72 || k.boost > 0;
      const spraying = (k.drifting && k.spark > 0.05) || k.boost > 0 || k.speed > 16;
      if (spraying) {
        const f = forward(k.yaw);
        const rx = Math.cos(k.yaw);
        const rz = -Math.sin(k.yaw);
        const kind = hot ? false : icy ? "ice" : "foam";
        for (const side of [-0.7, 0.7]) {
          emitSpark(k.x - f.x * 1.05 + rx * side, k.y + 0.22, k.z - f.z * 1.05 + rz * side, hot, kind);
        }
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
    const back = portrait ? 5.7 : 7.2;
    const up = (portrait ? 2.15 : 2.35) + (air ? 0.45 : 0);
    const ahead = air ? 3.3 : portrait ? 5.5 : 6.0;
    const sideAmt = portrait ? 0 : 0.9;
    tmpF.set(Math.sin(you.yaw), 0, Math.cos(you.yaw));
    const side = new THREE.Vector3(Math.cos(you.yaw), 0, -Math.sin(you.yaw));
    camGoal.set(you.x, Math.max(1.4, you.y + up), you.z).addScaledVector(tmpF, -back).addScaledVector(side, sideAmt);
    lookGoal.set(you.x, you.y + 1.2, you.z).addScaledVector(tmpF, ahead);
    const blend = 1 - Math.exp(-Math.max(0.001, dt) * 9);
    if (race.phase === "splash") {
      camera.position.lerp(new THREE.Vector3(18, 16, -6), 0.02);
      look.lerp(new THREE.Vector3(0, 10, -28), 0.02);
    } else {
      camera.position.lerp(camGoal, Math.min(1, blend));
      look.lerp(lookGoal, Math.min(1, blend));
    }
    camera.lookAt(look);
    const boostFov = you.boost > 0 ? 5 : 0;
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
  const sapGeo = new THREE.SphereGeometry(0.42, 10, 8);
  const boxGeo = new THREE.BoxGeometry(0.7, 0.7, 0.7);
  const ringGeo = new THREE.TorusGeometry(0.55, 0.06, 6, 12);
  const stickGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.8, 5);
  const iceGeo = new THREE.BoxGeometry(0.7, 0.85, 0.7);
  const blastGeo = new THREE.SphereGeometry(1, 10, 8);
  const sapMat = new THREE.MeshStandardMaterial({ color: 0xd6e24a, emissive: 0x8aaa18, emissiveIntensity: 1.1, transparent: true, opacity: 0.92 });
  const rocketMat = new THREE.MeshStandardMaterial({ color: 0xf0a024, emissive: 0xff6a00, emissiveIntensity: 1.4 });
  const crateMat = new THREE.MeshStandardMaterial({ map: woodMap, emissive: 0x145e66, emissiveIntensity: 0.35 });
  const ringMat = new THREE.MeshStandardMaterial({ color: 0x7ee7e0, emissive: 0x14c8c0, emissiveIntensity: 1.2 });
  const stickMat = new THREE.MeshStandardMaterial({ color: 0x6b3d22, roughness: 0.8 });
  const iceMat = new THREE.MeshStandardMaterial({ color: 0xe7f4ff, emissive: 0x8ecfff, emissiveIntensity: 0.45, transparent: true, opacity: 0.88 });
  const emberMat = new THREE.MeshBasicMaterial({ color: 0xffb703 });
  const starMat = new THREE.MeshBasicMaterial({ color: 0xfff1c2 });
  const orbMat = new THREE.MeshStandardMaterial({ color: 0x2f6dff, emissive: 0x1a4dff, emissiveIntensity: 1.3 });
  const shockMat = new THREE.MeshBasicMaterial({ color: 0x8eb6ff, transparent: true, opacity: 0.7, side: THREE.DoubleSide });

  function addMesh(geo, mat, x, y, z, s) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    if (s) m.scale.setScalar(s);
    fx.add(m);
    return m;
  }

  function paintItems(race) {
    while (fx.children.length) fx.remove(fx.children[0]);
    if (!race.boxes) return;
    for (const box of race.boxes) {
      if (!box.alive) continue;
      const fr = frameAt(liveTrack, box.t);
      const bob = Math.sin(race.time * 3.2 + box.t * 12) * 0.12;
      const g = new THREE.Group();
      g.add(new THREE.Mesh(boxGeo, crateMat));
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = -0.15;
      g.add(ring);
      g.position.set(fr.p.x, fr.p.y + 1.05 + bob, fr.p.z);
      g.rotation.y = race.time * 1.4;
      fx.add(g);
    }
    for (const shot of race.shots || []) {
      if (shot.kind === "rocket") {
        const g = new THREE.Group();
        const body = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 1.15, 8), rocketMat);
        const nose = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.48, 8), rocketMat);
        nose.position.y = 0.75;
        g.add(body, nose);
        g.position.set(shot.x, shot.y, shot.z);
        g.lookAt(shot.x + shot.vx, shot.y, shot.z + shot.vz);
        g.rotateX(Math.PI / 2);
        fx.add(g);
      } else {
        addMesh(sapGeo, sapMat, shot.x, shot.y, shot.z, 1.7);
      }
      const trailMat = shot.kind === "rocket" ? emberMat : sapMat;
      shot.trail.forEach((p, i) => addMesh(sapGeo, trailMat, p.x, p.y, p.z, 0.45 + i * 0.04));
    }
    for (const trap of race.traps || []) {
      for (let i = 0; i < 5; i++) {
        const m = addMesh(stickGeo, stickMat, trap.x + Math.cos(i) * 0.7, trap.y + 0.55, trap.z + Math.sin(i) * 0.7, 1.8);
        m.rotation.z = i;
      }
    }
    for (const wall of race.walls || []) {
      for (const side of [-1, 0, 1]) {
        addMesh(iceGeo, iceMat, wall.x + side * 1.15, wall.y + 0.9, wall.z, 1.55);
      }
    }
    for (const b of race.bursts || []) {
      const k = 1 - b.life / b.max;
      const geo = b.kind === "shock" || b.kind === "blast" ? blastGeo : sapGeo;
      const mat = b.kind === "orb" || b.kind === "shock" ? orbMat : b.kind === "blast" || b.kind === "rocket" ? rocketMat : starMat;
      addMesh(geo, mat, b.x, b.y, b.z, 0.35 + k * (b.kind === "blast" ? 2.4 : 0.9));
    }
    for (const k of race.karts || []) {
      if (k.invuln > 0) {
        for (let i = 0; i < 8; i++) {
          const a = race.time * 6 + i;
          addMesh(sapGeo, starMat, k.x + Math.cos(a) * 1.6, k.y + 1.1 + Math.sin(a * 2) * 0.55, k.z + Math.sin(a) * 1.6, 0.38);
        }
      }
      if (k.orb > 0) addMesh(sapGeo, orbMat, k.x, k.y + 1.8, k.z, 1.15);
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
    road.mesh.material.roughness = next.theme === "frost" ? 0.22 : 0.34;
    road.mesh.material.metalness = next.theme === "frost" ? 0.18 : 0.12;
    road.mesh.material.clearcoat = next.theme === "frost" ? 0.88 : 0.72;
    if (next.theme === "frost") road.mesh.material.color.set(0xd7e8f4);
    scene.add(road.mesh, road.skirt, road.rivets, road.curb, road.line, road.chevrons);
    scene.remove(waterGroup);
    waterGroup.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
    });
    waterGroup = buildWaterGroup(next);
    scene.add(waterGroup);
    waterMat.uniforms.uIce.value = next.theme === "frost" ? 1 : 0;
    const frost = next.theme === "frost";
    for (const m of damBits) m.visible = !frost;
    for (const m of foliage) m.visible = !frost;
    for (const m of posts) m.visible = !frost;
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
    ground.material.map = frost ? snowMap : grassMap;
    ground.material.color.set(0xffffff);
    ground.material.needsUpdate = true;
    scene.fog.color.set(frost ? 0xc5d6e6 : 0xe7c49a);
    hangBackdrop(next);
    backdrop.visible = false;
    if (backdrop.userData.dam) {
      backdrop.material.map = frost ? backdrop.userData.frost : backdrop.userData.dam;
      backdrop.material.needsUpdate = true;
    }
    spray.visible = !frost;
    if (!frost) placeSpray(next);
  }

  function modelOf(id) {
    const i = ROSTER.findIndex((r) => r.id === id);
    const g = views[i] && views[i].group;
    if (!g) return { kind: "", sig: 0 };
    return { kind: g.userData.kind || "", sig: g.userData.sig || 0 };
  }

  return { renderer, scene, camera, resize, update, frameCheck, views, setTrack, ready, modelOf };
}
