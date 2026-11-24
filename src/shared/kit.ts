// Base común de las escenas 2-6: matemáticas, tiempos de la voz, cámara (gramática del skill cartoon-3d-short),
// lente, luces y utilidades de three.js.
import * as THREE from "three";

export const FPS = 30;
export type V3 = [number, number, number];
export const PI = Math.PI;
export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const glide = (u: number) => { const x = clamp01(u); return x * x * x * (x * (6 * x - 15) + 10); };
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
export const mix3 = (a: V3, b: V3, k: number): V3 => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
export const easeOutBack = (u: number) => { const x = clamp01(u) - 1; return 1 + 2.2 * x * x * x + 1.2 * x * x; };
/** rampa 0..1 que empieza en t0 y dura d segundos */
export const ramp = (t: number, t0: number, d: number) => smooth((t - t0) / d);
/** pulso gaussiano centrado en t0 */
export const pulse = (t: number, t0: number, w = 0.3) => Math.exp(-(((t - t0) / w) ** 2));
export const rng = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

// ---------------- tiempos de la voz ----------------
type Word = { w: string; t: number };
const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
/** T("angiogenesis") = segundo en que empieza la primera palabra con ese prefijo (nth = n-ésima aparición) */
export const voice = (words: Word[]) => (prefix: string, nth = 0) => {
  const exact = words.filter((x) => norm(x.w) === norm(prefix));
  const hits = exact.length ? exact : words.filter((x) => norm(x.w).startsWith(norm(prefix))); // coincidencia exacta primero
  if (!hits[nth]) throw new Error("palabra no encontrada en la voz: " + prefix);
  return hits[nth].t;
};

// ---------------- cámara ----------------
export type Cam = { pos: V3; look: V3; fov: number; roll: number };
export type Shot = Partial<Cam> & { pos: V3; look: V3 };
/** t = segundo del corte, o centro del deslizamiento si lleva dur (frames) */
export type Key = { t: number; dur?: number; s: (f: number) => Shot };
const mixCam = (a: Cam, b: Cam, k: number): Cam => ({ pos: mix3(a.pos, b.pos, k), look: mix3(a.look, b.look, k), fov: lerp(a.fov, b.fov, k), roll: lerp(a.roll, b.roll, k) });
const full = (c: Shot): Cam => ({ fov: 40, roll: 0, ...c });
/** empuje continuo: el sujeto crece ~rate por frame desde el segundo t0 */
export const push = (f: number, t0: number, rate = 0.002) => Math.exp(-rate * Math.max(0, f - t0 * FPS));
export const dolly = (pos: V3, look: V3, k: number, rest: Partial<Cam> = {}): Shot => ({ pos: mix3(look, pos, k), look, ...rest });
/** plano fijo que empuja lentamente desde su propio corte */
export const hold = (t0: number, pos: V3, look: V3, rest: Partial<Cam> = {}, rate = 0.002) => (f: number) => dolly(pos, look, push(f, t0, rate), rest);
export const makeCam = (keys: Key[], kicks: [number, number][] = []) => (f: number): Cam => {
  let cur = full(keys[0].s(f));
  for (let i = 1; i < keys.length; i++) {
    const k = keys[i], f0 = k.t * FPS - (k.dur ?? 0) / 2;
    if (f < f0) break;
    cur = k.dur ? mixCam(cur, full(k.s(f)), glide((f - f0) / k.dur)) : full(k.s(f));
  }
  let a = 0;
  for (const [t0, g] of kicks) { const n = Math.floor((f / FPS - t0) * FPS + 1e-6); if (n >= 0 && n < 7) a += g * (n % 2 ? -1 : 1) * (1 - n / 7) ** 1.5; }
  if (!a) return cur;
  const d: V3 = [cur.look[0] - cur.pos[0], cur.look[1] - cur.pos[1], cur.look[2] - cur.pos[2]];
  const L = Math.hypot(...d), h = Math.hypot(d[0], d[2]) || 1, m = (3 / 640) * Math.tan((cur.fov * PI) / 360) * L * a;
  return { ...cur, look: [cur.look[0] - (d[2] / h) * m, cur.look[1] + 0.6 * m, cur.look[2] + (d[0] / h) * m], roll: cur.roll + a * 0.004 };
};
/** índice del plano (corte) vigente: para decidir qué lugar se ve */
export const cutIndex = (cuts: number[], t: number) => { let i = 0; while (i + 1 < cuts.length && t >= cuts[i + 1]) i++; return i; };

// ---------------- lente ----------------
export type Dof = { t: number; dur?: number; cInf: number; focus?: (f: number) => V3 };
export const makeDof = (list: Dof[]) => (f: number) => {
  let i = 0; while (i + 1 < list.length && f >= list[i + 1].t * FPS - (list[i + 1].dur ?? 0) / 2) i++;
  const d = list[i], p = list[Math.max(0, i - 1)];
  const k = d.dur ? clamp01((f - (d.t * FPS - d.dur / 2)) / d.dur) : 1;
  return { cInf: p.cInf + (d.cInf - p.cInf) * k, focus: d.focus?.(f) };
};

// ---------------- three ----------------
const grad = (() => {
  const t = new THREE.DataTexture(new Uint8Array([118, 118, 255, 255]), 4, 1, THREE.RedFormat);
  t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true;
  return t;
})();
export const toon = (color: THREE.ColorRepresentation, extra: THREE.MeshToonMaterialParameters = {}) => new THREE.MeshToonMaterial({ color, gradientMap: grad, ...extra });
/** material toon con brillo propio (para bloom) */
export const glow = (color: THREE.ColorRepresentation, k = 0.6) => toon(color, { emissive: new THREE.Color(color), emissiveIntensity: k });
export const C = (h: THREE.ColorRepresentation) => new THREE.Color(h);
const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), P = new THREE.Vector3(), S = new THREE.Vector3(), E = new THREE.Euler();
export const COL = new THREE.Color();
export const setM = (im: THREE.InstancedMesh, i: number, x: number, y: number, z: number, sx: number, sy = sx, sz = sx, rx = 0, ry = 0, rz = 0) => {
  im.setMatrixAt(i, M4.compose(P.set(x, y, z), Q.setFromEuler(E.set(rx, ry, rz)), S.set(Math.abs(sx) < 1e-4 ? 1e-4 : sx, Math.abs(sy) < 1e-4 ? 1e-4 : sy, Math.abs(sz) < 1e-4 ? 1e-4 : sz)));
};
export const inst = (geo: THREE.BufferGeometry, mat: THREE.Material, n: number) => { const m = new THREE.InstancedMesh(geo, mat, n); m.frustumCulled = false; return m; };
export const flush = (...ms: THREE.InstancedMesh[]) => { for (const m of ms) { m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; } };
export const mesh = (geo: THREE.BufferGeometry, mat: THREE.Material, pos: V3 = [0, 0, 0], scale: V3 | number = 1, rot: V3 = [0, 0, 0]) => {
  const m = new THREE.Mesh(geo, mat); m.position.set(...pos); m.rotation.set(...rot);
  if (typeof scale === "number") m.scale.setScalar(scale); else m.scale.set(...scale);
  return m;
};
export const tube = (pts: V3[], r: number, mat: THREE.Material, seg = 40) => new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p))), seg, r, 10, false), mat);
/** muestra solo la fracción u (0..1) de un tubo, desde su inicio: para vasos o líneas que crecen */
export const growTube = (m: THREE.Mesh, u: number) => { const n = m.geometry.index!.count; m.geometry.setDrawRange(0, Math.floor((clamp01(u) * n) / 60) * 60); m.visible = u > 0.01; };
export const BALL = new THREE.IcosahedronGeometry(1, 3);
export const SPHERE = new THREE.SphereGeometry(1, 28, 18);

// ---------------- ambiente ----------------
export type Look = { bg: string; fog: [number, number]; sun?: number; hemi?: number; sky?: string; ground?: string };
/** luces + niebla + fondo; el sol va relativo a la cámara (arriba a la izquierda, detrás) */
export class Rig {
  sun = new THREE.DirectionalLight("#fff6ea", 1);
  hemi = new THREE.HemisphereLight("#ffffff", "#888888", 1);
  fog = new THREE.Fog("#ffffff", 10, 100);
  bg = new THREE.Color();
  look = new THREE.Vector3();
  constructor(root: THREE.Object3D) { root.add(this.sun, this.sun.target, this.hemi); }
  /** coloca la cámara y el ambiente; devuelve el punto de mira */
  apply(scene: THREE.Scene, cam: THREE.PerspectiveCamera, c: Cam, L: Look, bg?: THREE.Color) {
    cam.position.set(...c.pos); cam.up.set(0, 1, 0); this.look.set(...c.look); cam.lookAt(this.look); cam.rotateZ(c.roll);
    if (cam.fov !== c.fov) { cam.fov = c.fov; cam.updateProjectionMatrix(); }
    cam.updateMatrixWorld();
    if (bg) this.bg.copy(bg); else this.bg.set(L.bg);
    this.fog.color.copy(this.bg); this.fog.near = L.fog[0]; this.fog.far = L.fog[1];
    scene.fog = this.fog; scene.background = this.bg;
    this.sun.intensity = PI * (L.sun ?? 0.95); this.hemi.intensity = PI * (L.hemi ?? 0.5);
    this.hemi.color.set(L.sky ?? "#ffffff"); this.hemi.groundColor.set(L.ground ?? "#888888");
    this.sun.position.set(-0.55, 0.8, 0.6).applyQuaternion(cam.quaternion).multiplyScalar(60).add(this.look);
    this.sun.target.position.copy(this.look);
    return this.look;
  }
}
/** polvo flotante (capa sin tinta) alrededor de un centro */
export class Dust {
  mesh: THREE.InstancedMesh;
  private p: { x: number; y: number; z: number; s: number; v: number; ph: number }[];
  constructor(n = 150, seed = 41, layer = 3) {
    const R = rng(seed);
    this.p = Array.from({ length: n }, () => ({ x: R() - 0.5, y: R(), z: R() - 0.5, s: 0.5 + R(), v: 0.3 + R(), ph: R() * 6.28 }));
    this.mesh = inst(new THREE.IcosahedronGeometry(0.16, 1), new THREE.MeshBasicMaterial({ color: "#ffffff" }), n);
    this.mesh.layers.set(layer);
  }
  pose(t: number, centre: V3, box: V3, size = 1, color = "#ffffff") {
    (this.mesh.material as THREE.MeshBasicMaterial).color.set(color);
    this.p.forEach((p, i) => {
      const y = ((((p.y + t * 0.012 * p.v) % 1) + 1) % 1) - 0.5;
      setM(this.mesh, i, centre[0] + p.x * box[0] + 0.6 * Math.sin(t * 0.7 + p.ph), centre[1] + y * box[1], centre[2] + p.z * box[2] + 0.6 * Math.cos(t * 0.5 + p.ph), size * p.s);
    });
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}
export type SceneWorld = { root: THREE.Object3D; update: (f: number, cam: THREE.PerspectiveCamera, scene: THREE.Scene) => THREE.Vector3 };
