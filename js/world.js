import { ROSTER, frameAt, forward } from "./sim.js?v=gd2";

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
  const mat = new THREE.MeshStandardMaterial({
    map,
    roughness: 0.78,
    metalness: 0.02,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  mesh.castShadow = true;

  const skirtPos = [];
  const skirtIdx = [];
  const drop = 1.5;
  function pushSkirt(side) {
    const base = skirtPos.length / 3;
    for (let i = 0; i < n; i++) {
      const o = i * 2 + side;
      skirtPos.push(pos[o * 3], pos[o * 3 + 1], pos[o * 3 + 2]);
      skirtPos.push(pos[o * 3], pos[o * 3 + 1] - drop, pos[o * 3 + 2]);
    }
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
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
    new THREE.MeshStandardMaterial({ color: 0xb7aa96, roughness: 0.9 })
  );
  skirt.receiveShadow = true;
  skirt.castShadow = true;
  return { mesh, skirt };
}

function buildKart(THREE, scarfHex, woodMap) {
  const g = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ map: woodMap, roughness: 0.7 });
  const woodDark = new THREE.MeshStandardMaterial({ map: woodMap, color: 0x7a4a2c, roughness: 0.78 });
  const fur = new THREE.MeshStandardMaterial({ color: 0x8d5a32, roughness: 0.8 });
  const cream = new THREE.MeshStandardMaterial({ color: 0xf3e2c4, roughness: 0.4 });
  const scarf = new THREE.MeshStandardMaterial({ color: scarfHex, roughness: 0.52 });
  const rubber = new THREE.MeshStandardMaterial({ color: 0x242424, roughness: 0.92 });
  const hub = new THREE.MeshStandardMaterial({ color: 0x9aa0a6, metalness: 0.55, roughness: 0.35 });
  const bandMat = new THREE.MeshStandardMaterial({ color: 0x2a1c14, roughness: 0.55 });

  const bowl = new THREE.Mesh(
    new THREE.SphereGeometry(0.78, 20, 12, 0, Math.PI * 2, Math.PI * 0.48, Math.PI * 0.52),
    wood
  );
  bowl.scale.set(1.02, 0.9, 1.28);
  bowl.position.y = 0.62;
  g.add(bowl);

  const lip = new THREE.Mesh(new THREE.TorusGeometry(0.74, 0.055, 6, 16), woodDark);
  lip.rotation.x = Math.PI / 2;
  lip.scale.set(1.02, 1.28, 1);
  lip.position.y = 0.86;
  g.add(lip);

  const wheels = [];
  const wgeo = new THREE.CylinderGeometry(0.28, 0.28, 0.22, 12);
  const spots = [
    [-0.62, 0.42],
    [0.62, 0.42],
    [-0.66, -0.5],
    [0.66, -0.5],
  ];
  for (const [x, z] of spots) {
    const pivot = new THREE.Group();
    pivot.position.set(x, 0.34, z);
    const m = new THREE.Mesh(wgeo, rubber);
    m.rotation.z = Math.PI / 2;
    pivot.add(m);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.28, 8), hub);
    cap.rotation.z = Math.PI / 2;
    pivot.add(cap);
    g.add(pivot);
    wheels.push(pivot);
  }

  const body = new THREE.Mesh(new THREE.SphereGeometry(0.34, 12, 10), fur);
  body.scale.set(0.9, 0.85, 1.05);
  body.position.set(0, 0.98, 0.05);
  g.add(body);

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.42, 0.46), woodDark);
  head.position.set(0, 1.38, 0.16);
  g.add(head);
  const earG = new THREE.BoxGeometry(0.12, 0.12, 0.08);
  const earL = new THREE.Mesh(earG, woodDark);
  earL.position.set(-0.22, 1.62, 0.1);
  const earR = earL.clone();
  earR.position.x = 0.22;
  g.add(earL, earR);

  const eyeM = new THREE.MeshStandardMaterial({ color: 0x140e0a, roughness: 0.3 });
  const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), eyeM);
  eyeL.position.set(-0.12, 1.4, 0.4);
  const eyeR = eyeL.clone();
  eyeR.position.x = 0.12;
  g.add(eyeL, eyeR);
  const tooth = new THREE.BoxGeometry(0.07, 0.12, 0.05);
  const t1 = new THREE.Mesh(tooth, cream);
  t1.position.set(-0.045, 1.22, 0.4);
  const t2 = t1.clone();
  t2.position.x = 0.045;
  g.add(t1, t2);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), eyeM);
  nose.position.set(0, 1.32, 0.4);
  g.add(nose);

  const collar = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.12, 0.42), scarf);
  collar.position.set(0, 1.12, 0.14);
  g.add(collar);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.36, 0.06), scarf);
  tail.position.set(0.22, 0.92, 0.22);
  tail.rotation.z = 0.4;
  g.add(tail);

  const postG = new THREE.CylinderGeometry(0.05, 0.06, 0.55, 7);
  const postL = new THREE.Mesh(postG, woodDark);
  postL.position.set(-0.42, 1.05, -0.62);
  const postR = postL.clone();
  postR.position.x = 0.42;
  g.add(postL, postR);
  const rear = new THREE.Object3D();
  rear.name = "rearPost";
  rear.position.set(0, 1.0, -0.7);
  g.add(rear);
  for (const hy of [0.98, 1.18]) {
    const band = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.045, 0.045), bandMat);
    band.position.set(0, hy, -0.62);
    g.add(band);
  }
  const paddle = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), fur);
  paddle.scale.set(1.6, 0.32, 0.9);
  paddle.position.set(0, 0.78, -0.28);
  g.add(paddle);

  const blob = new THREE.Mesh(
    new THREE.CircleGeometry(1.15, 14),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28, depthWrite: false })
  );
  blob.rotation.x = -Math.PI / 2;
  blob.position.y = 0.04;

  g.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  blob.castShadow = false;
  g.scale.setScalar(1.2);
  return { group: g, wheels, blob, rear };
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
    uniforms: { uTime: { value: 0 } },
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
      void main() {
        float w = sin(vUv.x * 46.0 + uTime * 1.4) * sin(vUv.y * 28.0 - uTime);
        vec3 deep = vec3(0.05, 0.28, 0.34);
        vec3 mid = vec3(0.16, 0.55, 0.58);
        vec3 foam = vec3(0.86, 0.93, 0.9);
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
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
  renderer.setClearColor(0x87b4c4, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.96;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xe7c49a, 55, 175);

  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 400);
  camera.position.set(0, 18, -18);

  const sky = new THREE.Mesh(new THREE.SphereGeometry(220, 20, 14), skyMaterial(THREE));
  scene.add(sky);

  const hemi = new THREE.HemisphereLight(0xc5e4ef, 0x6d8a58, 0.72);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffe0b0, 1.55);
  sun.position.set(48, 62, 36);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.near = 8;
  sun.shadow.camera.far = 180;
  sun.shadow.camera.left = -80;
  sun.shadow.camera.right = 80;
  sun.shadow.camera.top = 80;
  sun.shadow.camera.bottom = -80;
  sun.shadow.bias = -0.0004;
  scene.add(sun);

  const woodMap = woodTexture(THREE);
  const concrete = concreteTexture(THREE);
  concrete.repeat.set(3.5, 1.6);
  const roadMap = roadTexture(THREE);
  roadMap.wrapS = THREE.RepeatWrapping;

  const road = buildRoad(THREE, track, roadMap);
  scene.add(road.mesh, road.skirt);

  const concMat = new THREE.MeshStandardMaterial({ map: concrete, roughness: 0.88 });
  const damL = new THREE.Mesh(new THREE.BoxGeometry(74, 11.2, 14), concMat);
  damL.position.set(-52, 5.5, -46);
  damL.castShadow = true;
  damL.receiveShadow = true;
  const damR = new THREE.Mesh(new THREE.BoxGeometry(74, 11.2, 14), concMat);
  damR.position.set(52, 5.5, -46);
  damR.castShadow = true;
  damR.receiveShadow = true;
  const sill = new THREE.Mesh(new THREE.BoxGeometry(30, 7.2, 14), concMat);
  sill.position.set(0, 3.6, -46);
  sill.castShadow = true;
  sill.receiveShadow = true;
  scene.add(damL, damR, sill);

  const waterMat = waterMaterial(THREE);
  const reservoir = new THREE.Mesh(new THREE.PlaneGeometry(220, 80, 8, 4), waterMat);
  reservoir.rotation.x = -Math.PI / 2;
  reservoir.position.set(0, 9.6, -78);
  scene.add(reservoir);
  const pool = new THREE.Mesh(new THREE.CircleGeometry(18, 24), waterMat);
  pool.rotation.x = -Math.PI / 2;
  pool.position.set(0, 0.35, 6);
  scene.add(pool);
  const river = new THREE.Mesh(new THREE.PlaneGeometry(220, 70, 6, 3), waterMat);
  river.rotation.x = -Math.PI / 2;
  river.position.set(0, 0.12, 62);
  scene.add(river);

  const spillMat = spillMaterial(THREE);
  const spill = new THREE.Mesh(new THREE.PlaneGeometry(26, 18, 1, 8), spillMat);
  spill.position.set(0, 6.2, -30);
  spill.rotation.x = -0.85;
  scene.add(spill);

  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(150, 28),
    new THREE.MeshStandardMaterial({ color: 0x4e7a48, roughness: 1 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.05;
  ground.receiveShadow = true;
  scene.add(ground);

  const moss = new THREE.MeshStandardMaterial({ color: 0x3f6b40, roughness: 0.95 });
  const rock = new THREE.MeshStandardMaterial({ color: 0x6d6458, roughness: 0.9 });
  const hills = [
    [-120, -20, 34],
    [120, 10, 30],
    [-90, 70, 22],
    [100, 78, 26],
    [0, 110, 28],
    [-130, 40, 18],
  ];
  for (const [x, z, r] of hills) {
    const h = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), moss);
    h.scale.y = 0.42;
    h.position.set(x, r * 0.12, z);
    scene.add(h);
  }
  const rocks = [
    [78, 0.8, 18, 3.2],
    [-82, 1, -8, 2.8],
    [40, 0.6, 48, 2.2],
    [-36, 0.5, 50, 2.4],
  ];
  for (const [x, y, z, r] of rocks) {
    const m = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 0), rock);
    m.position.set(x, y, z);
    m.castShadow = true;
    scene.add(m);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(r * 0.72, 8, 6), moss);
    cap.position.set(x, y + r * 0.45, z);
    cap.scale.y = 0.45;
    scene.add(cap);
  }

  const trunkG = new THREE.CylinderGeometry(0.18, 0.26, 1.3, 5);
  const leafG = new THREE.ConeGeometry(0.9, 2.1, 6);
  const trunkM = new THREE.MeshStandardMaterial({ color: 0x5c3a22, roughness: 0.9 });
  const leafM = new THREE.MeshStandardMaterial({ color: 0x2f6a34, roughness: 0.85 });
  for (let i = 0; i < track.frames.length; i += 9) {
    const fr = track.frames[i];
    if (fr.p.y > 5) continue;
    const awayX = fr.p.x;
    const awayZ = fr.p.z - 2;
    const al = Math.hypot(awayX, awayZ) || 1;
    const ox = fr.p.x + (awayX / al) * (fr.width * 0.5 + 3.2);
    const oz = fr.p.z + (awayZ / al) * (fr.width * 0.5 + 3.2);
    const trunk = new THREE.Mesh(trunkG, trunkM);
    trunk.position.set(ox, 0.7, oz);
    const leaf = new THREE.Mesh(leafG, leafM);
    leaf.position.set(ox, 2.1, oz);
    scene.add(trunk, leaf);
  }

  const railMat = new THREE.MeshStandardMaterial({ map: woodMap, roughness: 0.75 });
  const postG = new THREE.BoxGeometry(0.16, 0.9, 0.16);
  const posts = [];
  for (let i = 0; i < track.frames.length; i += 3) {
    const fr = track.frames[i];
    if (fr.p.y < 8) continue;
    for (const side of [-1, 1]) {
      const m = new THREE.Mesh(postG, railMat);
      const half = fr.width * 0.5 + 0.15;
      m.position.set(
        fr.p.x + fr.right.x * half * side,
        fr.p.y + 0.5,
        fr.p.z + fr.right.z * half * side
      );
      m.castShadow = true;
      scene.add(m);
      posts.push(m);
    }
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

  const mistMap = mistTexture(THREE);
  const mists = [];
  for (let i = 0; i < 7; i++) {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(8 + i, 5 + i * 0.3),
      new THREE.MeshBasicMaterial({ map: mistMap, transparent: true, depthWrite: false, opacity: 0.35 })
    );
    m.position.set(-6 + i * 2.2, 1.4 + (i % 3) * 0.4, -8 + (i % 4));
    scene.add(m);
    mists.push(m);
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

  function mountKart(scarf) {
    const view = buildKart(THREE, scarf, woodMap);
    scene.add(view.group);
    scene.add(view.blob);
    views.push(view);
    return view;
  }

  function emitSpark(x, y, z, hot) {
    const i = sparkCursor % sparkN;
    sparkCursor++;
    sparkLife[i] = 1;
    sparkPos[i * 3] = x + (Math.random() - 0.5) * 0.3;
    sparkPos[i * 3 + 1] = y + Math.random() * 0.2;
    sparkPos[i * 3 + 2] = z + (Math.random() - 0.5) * 0.3;
    const heat = hot ? 1 : 0.55 + Math.random() * 0.4;
    sparkCol[i * 3] = 1;
    sparkCol[i * 3 + 1] = 0.55 + heat * 0.4;
    sparkCol[i * 3 + 2] = 0.15 * heat;
  }

  for (const r of ROSTER) mountKart(r.scarf);

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
    const you = race.karts[0];
    for (let i = 0; i < race.karts.length; i++) {
      const k = race.karts[i];
      const view = views[i];
      const fr = track.frames[k.hint] || frameAt(track, k.t);
      const visualYaw = k.yaw + k.slip * 0.35;
      const qYaw = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), visualYaw);
      const along = Math.sin(k.yaw) * fr.tangent.x + Math.cos(k.yaw) * fr.tangent.z;
      const pitch = -Math.atan(fr.tangent.y) * Math.max(-1, Math.min(1, along));
      const qPitch = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), pitch);
      const qBank = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -fr.bank);
      view.group.quaternion.copy(qYaw).multiply(qPitch).multiply(qBank);
      const hop = k.boost > 0 ? Math.sin(race.time * 28) * 0.05 : 0;
      view.group.position.set(k.x, k.y + hop, k.z);
      view.blob.position.set(k.x, k.y + 0.05, k.z);
      const spin = k.speed * dt * 1.6;
      for (const w of view.wheels) w.rotation.x += spin;
      if ((k.drifting && k.spark > 0.05) || k.boost > 0) {
        const f = forward(k.yaw);
        const rx = Math.cos(k.yaw);
        const rz = -Math.sin(k.yaw);
        for (const side of [-0.7, 0.7]) {
          emitSpark(
            k.x - f.x * 0.9 + rx * side,
            k.y + 0.25,
            k.z - f.z * 0.9 + rz * side,
            k.spark > 0.72 || k.boost > 0
          );
        }
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
      mists[i].position.y = 1.3 + Math.sin(race.time * 0.8 + i) * 0.25;
      mists[i].lookAt(camera.position);
    }

    const back = portrait ? 8.4 : 8.6;
    const up = portrait ? 4.3 : 3.2;
    const ahead = portrait ? 6.5 : 6.2;
    const sideAmt = portrait ? 0 : 0.9;
    tmpF.set(Math.sin(you.yaw), 0, Math.cos(you.yaw));
    const side = new THREE.Vector3(Math.cos(you.yaw), 0, -Math.sin(you.yaw));
    camGoal.set(you.x, you.y + up, you.z).addScaledVector(tmpF, -back).addScaledVector(side, sideAmt);
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
    renderer.render(scene, camera);
  }

  return { renderer, scene, camera, resize, update, frameCheck, views };
}
