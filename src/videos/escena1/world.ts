// Mundo 3D de la Escena 1, todo procedural (sin modelos externos): piel, tejido mamario con el árbol de conductos
// azules y lobulillos, pared de células del conducto (con la célula rebelde y el tumor) y la hélice de ADN.
// Se posa una vez por frame a partir de story.ts. Sombreado toon de dos tonos; lo que no debe llevar línea de tinta
// (partículas) va en la capa NOINK de ink.ts.
import * as THREE from "three";
import { NOINK } from "./ink";
import { FPS, NT, SHOTS, SPOT, V3, W, birth, camAt, clamp01, countAt, darkAt, lerp, redAt, rng, smooth, warpAt, Place } from "./story";

const PI = Math.PI;
const grad = (() => {
  const t = new THREE.DataTexture(new Uint8Array([118, 118, 255, 255]), 4, 1, THREE.RedFormat);
  t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true;
  return t;
})();
const toon = (color: THREE.ColorRepresentation, extra: THREE.MeshToonMaterialParameters = {}) => new THREE.MeshToonMaterial({ color, gradientMap: grad, ...extra });
const C = (h: THREE.ColorRepresentation) => new THREE.Color(h);
const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), P = new THREE.Vector3(), S = new THREE.Vector3(), E = new THREE.Euler(), COL = new THREE.Color();
const setM = (im: THREE.InstancedMesh, i: number, x: number, y: number, z: number, sx: number, sy = sx, sz = sx, rx = 0, ry = 0, rz = 0) => {
  im.setMatrixAt(i, M4.compose(P.set(x, y, z), Q.setFromEuler(E.set(rx, ry, rz)), S.set(sx, sy, sz)));
};
const easeOutBack = (u: number) => { const x = clamp01(u) - 1; return 1 + 2.2 * x * x * x + 1.2 * x * x; };

// ---------------- ambiente por lugar ----------------
const LOOK: Record<Place, { bg: string; fog: [number, number]; sun: number; hemi: number; sky: string; ground: string; dust: string }> = {
  skin: { bg: "#ffe9d6", fog: [70, 260], sun: 0.95, hemi: 0.5, sky: "#fff4ea", ground: "#e9a58a", dust: "#ffffff" },
  tissue: { bg: "#f39a9c", fog: [50, 250], sun: 0.95, hemi: 0.5, sky: "#ffd9d2", ground: "#c9607a", dust: "#ffe3de" },
  wall: { bg: "#2a61c8", fog: [30, 130], sun: 0.95, hemi: 0.48, sky: "#cfe6ff", ground: "#3a57b8", dust: "#bfe0ff" },
  dna: { bg: "#1c1848", fog: [22, 80], sun: 0.9, hemi: 0.5, sky: "#b9c4ff", ground: "#3a2a7a", dust: "#8fa2ff" },
};
const TUMOUR_BG = C("#3a2466");

// ---------------- piel ----------------
const PORES: [number, number][] = (() => { const R = rng(3); return Array.from({ length: 90 }, () => [(R() - 0.5) * 150, (R() - 0.5) * 150] as [number, number]); })();
const skinH = (x: number, z: number) => {
  let h = 0.5 * Math.sin(x * 0.9) * Math.sin(z * 0.8) + 0.22 * Math.sin(x * 2.3 + z * 1.7) + 0.6 * Math.sin(x * 0.07) * Math.cos(z * 0.06);
  h -= 4.6 * Math.exp(-(x * x + z * z) / (2 * 2.2 * 2.2)); // el poro por el que entra la cámara
  for (const [px, pz] of PORES) { const d2 = (x - px) ** 2 + (z - pz) ** 2; if (d2 < 9 && px * px + pz * pz > 60) h -= 0.55 * Math.exp(-d2 / 0.9); }
  return h;
};
const buildSkin = () => {
  const g = new THREE.Group();
  const geo = new THREE.PlaneGeometry(520, 520, 400, 400).rotateX(-PI / 2);
  const p = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) p.setY(i, skinH(p.getX(i), p.getZ(i)));
  geo.computeVertexNormals();
  g.add(new THREE.Mesh(geo, toon("#f4b796")));
  const R = rng(7), N = 340;
  const hair = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.035, 0.16, 1, 6).translate(0, 0.5, 0), toon("#5b3a2c"), N);
  for (let i = 0; i < N; i++) {
    let x = 0, z = 0;
    do { x = (R() - 0.5) * 170; z = (R() - 0.5) * 170; } while (x * x + z * z < 40);
    setM(hair, i, x, skinH(x, z) - 0.1, z, 1, 3.5 + 4 * R(), 1, 0.35 + 0.25 * (R() - 0.5), 0, -0.45 + 0.3 * (R() - 0.5));
  }
  g.add(hair);
  const disc = new THREE.SphereGeometry(1, 14, 8), NP = 420;
  const pores = new THREE.InstancedMesh(disc, toon("#d98469"), NP);
  for (let i = 0; i < NP; i++) {
    let x = 0, z = 0;
    do { x = (R() - 0.5) * 190; z = (R() - 0.5) * 190; } while (x * x + z * z < 30);
    const r = 0.45 + 0.5 * R();
    setM(pores, i, x, skinH(x, z) - 0.02, z, r, 0.12, r);
  }
  const hole = new THREE.Mesh(disc, toon("#c9785e"));
  hole.position.set(0, -5.6, 0); hole.scale.set(3.1, 2.2, 3.1);
  g.add(pores, hole);
  return g;
};

// ---------------- árbol de conductos ----------------
type Tube = { pts: V3[]; r: number };
const TREE = (() => {
  const R = rng(11), tubes: Tube[] = [], lobes: V3[] = [], joints: [V3, number][] = [];
  const root: V3 = [0, -15, 0];
  let marker: V3 = [0, 0, 0];
  const grow = (p: V3, ang: number, len: number, r: number, depth: number, main: number) => {
    const a = ang + (R() - 0.5) * 0.2;
    const e: V3 = [p[0] + Math.sin(a) * len, p[1] + Math.cos(a) * len, p[2] + (R() - 0.5) * 5];
    const m: V3 = [(p[0] + e[0]) / 2 + (R() - 0.5) * len * 0.22, (p[1] + e[1]) / 2 + (R() - 0.5) * len * 0.15, (p[2] + e[2]) / 2 + (R() - 0.5) * 2];
    tubes.push({ pts: [p, m, e], r });
    joints.push([e, r]);
    if (depth === 1 && main === 3 && marker[2] === 0) marker = [m[0], m[1], m[2] + r + 0.25];
    if (depth >= 2) { lobes.push(e); return; }
    const spread = depth === 0 ? 0.36 : 0.46;
    for (const k of [-1, 1]) grow(e, ang + k * spread * (0.75 + 0.5 * R()), len * 0.72, r * 0.74, depth + 1, main);
  };
  for (let i = 0; i < 5; i++) grow(root, -0.62 + i * 0.31, 13, 1.45, 0, i);
  return { tubes, lobes, joints, root, marker };
})();
SPOT.marker = TREE.marker;
SPOT.lobe = TREE.lobes.reduce((a, b) => (b[1] + Math.abs(b[0]) * 0.2 > a[1] + Math.abs(a[0]) * 0.2 ? b : a));

const buildTissue = () => {
  const g = new THREE.Group();
  const duct = toon("#4aa6ff", { emissive: C("#1f7bff"), emissiveIntensity: 0.5 });
  const lobe = toon("#7fc6ff", { emissive: C("#2f8cff"), emissiveIntensity: 0.5 });
  for (const t of TREE.tubes) g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(t.pts.map((p) => new THREE.Vector3(...p))), 18, t.r, 12, false), duct));
  const ball = new THREE.IcosahedronGeometry(1, 3);
  const joints = new THREE.InstancedMesh(ball, duct, TREE.joints.length + 1);
  TREE.joints.forEach(([p, r], i) => setM(joints, i, p[0], p[1], p[2], r * 1.02));
  setM(joints, TREE.joints.length, TREE.root[0], TREE.root[1], TREE.root[2], 2.5);
  g.add(joints);
  const R = rng(19), per = 11;
  const lobs = new THREE.InstancedMesh(ball, lobe, TREE.lobes.length * per);
  TREE.lobes.forEach((c, i) => {
    for (let k = 0; k < per; k++) {
      const a = R() * 2 * PI, b = Math.acos(2 * R() - 1), d = k === 0 ? 0 : 1.2 + 1.3 * R();
      setM(lobs, i * per + k, c[0] + d * Math.sin(b) * Math.cos(a), c[1] + d * Math.cos(b) * 0.9 + 0.6, c[2] + d * Math.sin(b) * Math.sin(a), 1.0 + 0.7 * R());
    }
  });
  g.add(lobs);
  // el punto donde empieza todo (plano 5)
  const marker = new THREE.Mesh(new THREE.IcosahedronGeometry(0.55, 2), new THREE.MeshBasicMaterial({ color: "#ff3b30" }));
  marker.position.set(...TREE.marker);
  g.add(marker);
  // grasa: lóbulos amarillos a los lados y detrás; algunos cerca del recorrido de la cámara para el paralaje
  const F = rng(5), NF = 150, NG = 14;
  const fat = new THREE.InstancedMesh(ball, toon("#ffffff"), NF + NG);
  for (let i = 0; i < NF; i++) {
    let x = 0, y = 0, z = 0;
    do { x = (F() - 0.5) * 170; y = -55 + F() * 180; z = -75 + F() * 120; } while (Math.abs(x) < 22 && z > -16);
    setM(fat, i, x, y, z, 4.5 + 5 * F(), 4.5 + 5 * F(), 4.5 + 5 * F());
    fat.setColorAt(i, COL.setHSL(0.125 + 0.02 * F(), 0.9, 0.66 + 0.06 * F()));
  }
  for (let i = 0; i < NG; i++) {
    const sgn = i % 2 ? 1 : -1;
    setM(fat, NF + i, sgn * (4.2 + 4 * F()), 24 + (i / NG) * 62, 46 + 12 * F(), 2 + 1.6 * F());
    fat.setColorAt(NF + i, COL.setHSL(0.13, 0.9, 0.68));
  }
  g.add(fat);
  // fibras de tejido conectivo
  const fib = toon("#e8748f");
  for (let i = 0; i < 7; i++) {
    const x0 = -60 + F() * 40, y0 = -40 + F() * 120, z0 = -18 - F() * 14;
    const pts = [0, 1, 2, 3].map((k) => new THREE.Vector3(x0 + k * 35, y0 + (F() - 0.5) * 30 + k * (i % 2 ? 9 : -9), z0 + (F() - 0.5) * 8));
    g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 30, 0.5 + 0.4 * F(), 8, false), fib));
  }
  return { g, duct, lobe, marker };
};

// ---------------- pared de células + tumor ----------------
const HEALTHY: [number, number][] = [];
for (let j = -13; j <= 13; j++) for (let i = -7; i <= 7; i++) { if (i === 0 && j === 0) continue; HEALTHY.push([i * 2.2 + (j & 1 ? 1.1 : 0), j * 1.9]); }
const wallZ = (x: number) => (x * x) / 52;
const TUM = (() => {
  const R = rng(23), p: V3[] = [[0, 0, 0]];
  while (p.length < NT) { const x = R() * 2 - 1, y = R() * 2 - 1, z = R() * 2 - 1; if (x * x + y * y + z * z <= 1) p.push([x * 6, y * 7.5, z * 1.8]); }
  for (let it = 0; it < 80; it++) {
    for (let i = 1; i < NT; i++) for (let j = 0; j < i; j++) {
      const dx = p[i][0] - p[j][0], dy = p[i][1] - p[j][1], dz = p[i][2] - p[j][2], d = Math.hypot(dx, dy, dz) || 1e-3;
      if (d < 1.62) { const k = (1.62 - d) / d / (j === 0 ? 1 : 2); p[i][0] += dx * k; p[i][1] += dy * k; p[i][2] += dz * k; if (j) { p[j][0] -= dx * k; p[j][1] -= dy * k; p[j][2] -= dz * k; } }
    }
    for (let i = 1; i < NT; i++) { const q = Math.sqrt((p[i][0] / 6.6) ** 2 + (p[i][1] / 8.2) ** 2 + (p[i][2] / 2.1) ** 2); if (q > 1) p[i] = [p[i][0] / q, p[i][1] / q, p[i][2] / q]; }
  }
  const nd = (v: V3) => Math.hypot(v[0] / 6, v[1] / 7.5, v[2] / 4);
  const rest = p.slice(1).sort((a, b) => nd(a) - nd(b));
  const pos: V3[] = [[0, 0, 0], ...rest].map((v) => [v[0], v[1], v[2] * 0.8 + 0.9 * Math.min(1, Math.hypot(v[0], v[1]) / 2.5)] as V3);
  const parent = pos.map((v, i) => { let b = 0, bd = 1e9; for (let j = 0; j < i; j++) { const d = Math.hypot(v[0] - pos[j][0], v[1] - pos[j][1], v[2] - pos[j][2]); if (d < bd) { bd = d; b = j; } } return b; });
  const look = pos.map(() => ({ sx: 0.9 + 0.3 * R(), sy: 0.9 + 0.3 * R(), rz: R() * PI, ph: R() * 6.28, tone: R() }));
  return { pos, parent, look };
})();

const HEALTHY_COL = C("#8fd1ff"), STRESS_COL = C("#7f93d6"), TUM_COL = C("#4b2256"), TUM_COL2 = C("#6a2a5c"), NUC_BLUE = C("#2c6fe0"), NUC_RED = C("#ff2a22");
const buildWall = () => {
  const g = new THREE.Group();
  const body = new THREE.SphereGeometry(1.1, 28, 18), nuc = new THREE.SphereGeometry(0.42, 18, 12);
  const cells = new THREE.InstancedMesh(body, toon("#ffffff"), HEALTHY.length);
  const nuclei = new THREE.InstancedMesh(nuc, toon(NUC_BLUE), HEALTHY.length);
  cells.instanceMatrix.setUsage(THREE.DynamicDrawUsage); nuclei.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const tum = new THREE.InstancedMesh(body, toon("#ffffff"), NT + 3); // + 3 bultos de la célula rebelde
  const tnucMat = toon("#d61f1f", { emissive: NUC_RED.clone(), emissiveIntensity: 0.6 });
  const tnuc = new THREE.InstancedMesh(nuc, tnucMat, NT);
  const n0Mat = toon(NUC_BLUE.clone(), { emissive: NUC_RED.clone(), emissiveIntensity: 0 });
  const n0 = new THREE.Mesh(nuc, n0Mat);
  for (const m of [cells, nuclei, tum, tnuc]) m.frustumCulled = false;
  const backGeo = new THREE.PlaneGeometry(60, 80, 30, 1);
  const bp = backGeo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < bp.count; i++) bp.setZ(i, wallZ(bp.getX(i)) - 0.75);
  backGeo.computeVertexNormals();
  g.add(new THREE.Mesh(backGeo, toon("#3f86e8")), cells, nuclei, tum, tnuc, n0);
  return { g, cells, nuclei, tum, tnuc, tnucMat, n0, n0Mat };
};

// ---------------- ADN ----------------
const RUNG_COLS: [string, string][] = [["#ffd166", "#7ae582"], ["#7ae582", "#ffd166"], ["#ff9f6e", "#c79bff"], ["#c79bff", "#ff9f6e"]];
const buildDna = () => {
  const g = new THREE.Group(), R0 = 3, PITCH = 12, STEP = 1.0, HALF = 24;
  const ang = (s: number) => (s * 2 * PI) / PITCH;
  const strand = (sign: number, col: string) => {
    const pts: THREE.Vector3[] = [];
    for (let s = -HALF; s <= HALF; s += 0.5) pts.push(new THREE.Vector3(sign * R0 * Math.cos(ang(s)), s, -sign * R0 * Math.sin(ang(s))));
    return new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 320, 0.45, 10, false), toon(col, { emissive: C(col), emissiveIntensity: 0.25 }));
  };
  g.add(strand(1, "#58d6ff"), strand(-1, "#8b93ff"));
  const cyl = new THREE.CylinderGeometry(0.2, 0.2, 1, 10).rotateZ(PI / 2); // a lo largo de x
  const ss: number[] = [];
  for (let s = -HALF + 0.5; s <= HALF; s += STEP) if (Math.abs(s) > 0.01) ss.push(s);
  const a = new THREE.InstancedMesh(cyl, toon("#ffffff"), ss.length), b = new THREE.InstancedMesh(cyl, toon("#ffffff"), ss.length);
  const R = rng(31);
  ss.forEach((s, i) => {
    const [ca, cb] = RUNG_COLS[Math.floor(R() * 4)], t = ang(s), h = R0 / 2;
    setM(a, i, h * Math.cos(t), s, -h * Math.sin(t), R0 - 0.2, 1, 1, 0, t, 0); a.setColorAt(i, COL.set(ca));
    setM(b, i, -h * Math.cos(t), s, h * Math.sin(t), R0 - 0.2, 1, 1, 0, t, 0); b.setColorAt(i, COL.set(cb));
  });
  // el peldaño que muta (s = 0): dos mitades propias
  const mutMat = toon("#ffd166", { emissive: NUC_RED.clone(), emissiveIntensity: 0 });
  const mA = new THREE.Mesh(cyl, mutMat), hinge = new THREE.Group(), mB = new THREE.Mesh(cyl, mutMat);
  mA.scale.x = R0 - 0.2; mA.position.x = R0 / 2;
  hinge.position.x = -R0; mB.scale.x = R0 - 0.2; mB.position.x = R0 / 2; hinge.add(mB);
  g.add(a, b, mA, hinge);
  g.rotation.z = 0.35;
  return { g, mutMat, hinge };
};

// ---------------- partículas flotantes ----------------
const DUST = (() => { const R = rng(41); return Array.from({ length: 170 }, () => ({ x: R() - 0.5, y: R(), z: R() - 0.5, s: 0.5 + R(), v: 0.3 + R(), ph: R() * 6.28 })); })();

export class World {
  root = new THREE.Group();
  private sun = new THREE.DirectionalLight("#fff6ea", 1);
  private hemi = new THREE.HemisphereLight("#ffffff", "#888888", 1);
  private skin = buildSkin();
  private tissue = buildTissue();
  private wall = buildWall();
  private dna = buildDna();
  private dust = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.16, 1), new THREE.MeshBasicMaterial({ color: "#ffffff" }), DUST.length);
  private fog = new THREE.Fog("#ffffff", 10, 100);
  private bg = new THREE.Color();
  private look = new THREE.Vector3();

  constructor() {
    this.dust.layers.set(NOINK); this.dust.frustumCulled = false;
    this.root.add(this.sun, this.sun.target, this.hemi, this.skin, this.tissue.g, this.wall.g, this.dna.g, this.dust);
  }

  /** posa el mundo y la cámara para el frame f; devuelve el punto al que mira la cámara */
  update(id: number, f: number, cam: THREE.PerspectiveCamera, scene: THREE.Scene) {
    const t = f / FPS, place = SHOTS[id - 1].place, L = LOOK[place];
    this.skin.visible = place === "skin"; this.tissue.g.visible = place === "tissue";
    this.wall.g.visible = place === "wall"; this.dna.g.visible = place === "dna";
    this.dust.visible = place !== "skin";

    // cámara
    const c = camAt(id, f);
    cam.position.set(...c.pos); cam.up.set(0, 1, 0); this.look.set(...c.look); cam.lookAt(this.look); cam.rotateZ(c.roll);
    if (cam.fov !== c.fov) { cam.fov = c.fov; cam.updateProjectionMatrix(); }
    cam.updateMatrixWorld();

    // ambiente: fondo = color de la niebla; sol relativo a la cámara (arriba a la izquierda, detrás)
    const n = countAt(t), grow = Math.sqrt(n / NT);
    this.bg.set(L.bg);
    if (place === "wall") this.bg.lerp(TUMOUR_BG, Math.max(0.25 * darkAt(t), 0.8 * (n > 1 ? grow : 0)));
    this.fog.color.copy(this.bg); this.fog.near = L.fog[0]; this.fog.far = L.fog[1];
    scene.fog = this.fog; scene.background = this.bg;
    this.sun.intensity = PI * L.sun; this.hemi.intensity = PI * L.hemi;
    this.hemi.color.set(L.sky); this.hemi.groundColor.set(L.ground);
    this.sun.position.set(-0.55, 0.8, 0.6).applyQuaternion(cam.quaternion).multiplyScalar(60).add(this.look);
    this.sun.target.position.copy(this.look);

    if (place === "tissue") this.poseTissue(f, t);
    if (place === "wall") this.poseWall(t, n, grow);
    if (place === "dna") this.poseDna(t);
    if (this.dust.visible) this.poseDust(t, place, cam);
    return this.look;
  }

  private poseTissue(f: number, t: number) {
    const pulse = (t0: number) => Math.exp(-(((t - t0 - 0.12) / 0.45) ** 2));
    const breathe = 0.5 + 0.12 * Math.sin(t * 2.4);
    this.tissue.duct.emissiveIntensity = breathe + 1.5 * pulse(W.conductos);
    this.tissue.lobe.emissiveIntensity = breathe + 1.7 * pulse(W.lobulillos);
    const m = this.tissue.marker;
    m.visible = t > W.comienza - 0.1;
    m.scale.setScalar(1 + 0.35 * Math.sin(t * 9));
    (m.material as THREE.MeshBasicMaterial).color.setRGB(1.5, 0.1, 0.08);
  }

  private poseWall(t: number, n: number, grow: number) {
    const w = this.wall, warp = warpAt(t), dark = darkAt(t);
    // células sanas: respiran; el tumor las empuja y las aprieta
    const Rx = (n > 1 ? 6.2 * grow : 0.72) + 0.9 * warp, Ry = (n > 1 ? 7.7 * grow : 0.72) + 0.9 * warp;
    HEALTHY.forEach(([x0, y0], i) => {
      let x = x0, y = y0, sq = 0;
      const d = Math.max(0.05, Math.hypot(x / Rx, y / Ry));
      if (d < 1.5) { sq = 1 - d / 1.5; const k = (d + 0.2 * sq) / d; x *= k; y *= k; }
      const gone = n > 1 ? 1 - smooth((d - 0.45) / 0.4) : 0;
      const z = wallZ(x) - 0.45 * sq, s = Math.max(0.0001, (1 + 0.025 * Math.sin(t * 2.2 + x0 * 0.7 + y0 * 0.5)) * (1 - 0.15 * sq) * (1 - gone));
      setM(w.cells, i, x, y, z, s, s, 0.6 * s);
      setM(w.nuclei, i, x, y, z + 0.5 * s, s);
      w.cells.setColorAt(i, COL.copy(HEALTHY_COL).lerp(STRESS_COL, sq));
    });
    // tumor: cada célula nace en su madre y se abre paso hasta su sitio
    const cur: V3[] = [];
    for (let i = 0; i < NT; i++) {
      const b = birth(i), lk = TUM.look[i], fin = TUM.pos[i];
      if (t < b) { cur.push(cur[TUM.parent[i]] ?? [0, 0, 0]); setM(w.tum, i, 0, 0, -50, 0.0001); setM(w.tnuc, i, 0, 0, -50, 0.0001); continue; }
      const e = i === 0 ? 1 : easeOutBack((t - b) / 0.5), par = i === 0 ? fin : cur[TUM.parent[i]];
      const p: V3 = [lerp(par[0], fin[0], e), lerp(par[1], fin[1], e), lerp(par[2], fin[2], e)];
      cur.push(p);
      const k = i === 0 ? warp : 1; // la célula 0 pierde su simetría poco a poco
      const wob = 0.07 * Math.sin(t * 5 + lk.ph), s = i === 0 ? 1 + 0.12 * warp : 0.4 + 0.6 * e;
      const sx = s * lerp(1, lk.sx + 0.1 + wob, k), sy = s * lerp(1, lk.sy - 0.05 - wob, k);
      setM(w.tum, i, p[0], p[1], p[2] + wallZ(p[0]), sx, sy, 0.62 * s, 0, 0, k * (lk.rz + 0.25 * Math.sin(t * 1.7 + lk.ph)));
      w.tum.setColorAt(i, i === 0 ? COL.copy(HEALTHY_COL).lerp(TUM_COL, dark) : COL.copy(TUM_COL).lerp(TUM_COL2, lk.tone));
      const ns = i === 0 ? 0.0001 : s * (1 + 0.1 * Math.sin(t * 8 + lk.ph));
      setM(w.tnuc, i, p[0], p[1], p[2] + wallZ(p[0]) + 0.52 * s, ns);
    }
    // bultos irregulares de la célula rebelde
    for (let k = 0; k < 3; k++) {
      const a = 0.6 + k * 2.2 + 0.25 * Math.sin(t * 1.7), g = warp * (0.5 + 0.12 * k) * (1 + 0.1 * Math.sin(t * 6 + k));
      setM(w.tum, NT + k, 0.95 * Math.cos(a), 0.95 * Math.sin(a), 0.1, g || 0.0001, g || 0.0001, 0.6 * g || 0.0001);
      w.tum.setColorAt(NT + k, COL.copy(HEALTHY_COL).lerp(TUM_COL, dark));
    }
    // núcleo de la célula rebelde: azul -> parpadeo rojo -> rojo
    const red = redAt(t);
    w.n0.position.set(0, 0, 0.5 + 0.06 * warp);
    w.n0.scale.setScalar((1 + 0.25 * red) * (1 + 0.08 * Math.sin(t * 8)));
    w.n0Mat.color.copy(NUC_BLUE).lerp(COL.set("#d61f1f"), red);
    w.n0Mat.emissiveIntensity = 0.75 * red;
    w.tnucMat.emissiveIntensity = 0.55 + 0.2 * Math.sin(t * 8);
    for (const m of [w.cells, w.nuclei, w.tum, w.tnuc]) { m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; }
  }

  private poseDna(t: number) {
    const d = this.dna, x = t - W.mutacion;
    d.g.rotation.y = 0.45 * (t - W.mutacion - 0.3);
    const on = x >= 0 ? 1 : 0, flick = x >= 0 && x < 0.9 ? (Math.floor(x * 12) % 2 ? 0.35 : 1) : 1;
    d.mutMat.color.set(on ? "#c21d1d" : "#ffd166");
    d.mutMat.emissiveIntensity = on * 1.8 * flick;
    const u = smooth(x / 0.35);
    d.hinge.rotation.set(0, 0.5 * u, -0.75 * u + (on ? 0.08 * Math.sin(x * 30) * Math.exp(-x * 3) : 0)); // la mitad rota se descuelga
  }

  private poseDust(t: number, place: Place, cam: THREE.PerspectiveCamera) {
    const box = place === "tissue" ? 110 : place === "wall" ? 34 : 30, sz = place === "tissue" ? 2.2 : place === "wall" ? 0.6 : 1;
    (this.dust.material as THREE.MeshBasicMaterial).color.set(LOOK[place].dust);
    const cy = place === "tissue" ? cam.position.y : 0, zc = place === "wall" ? 5 : 0, zr = place === "wall" ? 8 : box;
    DUST.forEach((p, i) => {
      const y = ((((p.y + t * 0.012 * p.v) % 1) + 1) % 1) - 0.5;
      setM(this.dust, i, p.x * box + 0.6 * Math.sin(t * 0.7 + p.ph), cy + y * box, zc + p.z * zr + 0.6 * Math.cos(t * 0.5 + p.ph), sz * p.s);
    });
    this.dust.instanceMatrix.needsUpdate = true;
  }
}
