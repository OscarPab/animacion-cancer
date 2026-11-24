// Piezas biológicas reutilizadas entre escenas: racimo tumoral, túnel sanguíneo con glóbulos, anticuerpo en "Y".
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { BALL, C, COL, PI, SPHERE, V3, flush, inst, rng, setM, toon } from "./kit";

/** n puntos repartidos sin solaparse dentro de un elipsoide, ordenados de dentro hacia fuera; parent = vecina anterior más cercana */
export const cluster = (n: number, r: V3, seed: number, minD = 1.62) => {
  const R = rng(seed), p: V3[] = [[0, 0, 0]];
  while (p.length < n) { const x = R() * 2 - 1, y = R() * 2 - 1, z = R() * 2 - 1; if (x * x + y * y + z * z <= 1) p.push([x * r[0], y * r[1], z * r[2]]); }
  for (let it = 0; it < 80; it++) {
    for (let i = 1; i < n; i++) for (let j = 0; j < i; j++) {
      const dx = p[i][0] - p[j][0], dy = p[i][1] - p[j][1], dz = p[i][2] - p[j][2], d = Math.hypot(dx, dy, dz) || 1e-3;
      if (d < minD) { const k = (minD - d) / d / (j === 0 ? 1 : 2); p[i][0] += dx * k; p[i][1] += dy * k; p[i][2] += dz * k; if (j) { p[j][0] -= dx * k; p[j][1] -= dy * k; p[j][2] -= dz * k; } }
    }
    for (let i = 1; i < n; i++) { const q = Math.hypot(p[i][0] / (r[0] * 1.1), p[i][1] / (r[1] * 1.1), p[i][2] / (r[2] * 1.15)); if (q > 1) p[i] = [p[i][0] / q, p[i][1] / q, p[i][2] / q]; }
  }
  const nd = (v: V3) => Math.hypot(v[0] / r[0], v[1] / r[1], v[2] / r[2]);
  const pos: V3[] = [p[0], ...p.slice(1).sort((a, b) => nd(a) - nd(b))];
  const parent = pos.map((v, i) => { let b = 0, bd = 1e9; for (let j = 0; j < i; j++) { const d = Math.hypot(v[0] - pos[j][0], v[1] - pos[j][1], v[2] - pos[j][2]); if (d < bd) { bd = d; b = j; } } return b; });
  const look = pos.map(() => ({ sx: 0.95 + 0.3 * R(), sy: 0.9 + 0.3 * R(), rz: R() * PI, ph: R() * 6.28, tone: R() }));
  return { pos, parent, look };
};

export const TUM_COL = C("#4b2256"), TUM_COL2 = C("#6a2a5c"), NUC_RED = C("#ff2a22");
/** racimo de células tumorales (cuerpo púrpura + núcleo rojo). pose(t, fn): fn(i, sitioFinal) -> [x, y, z, escala] o null si no existe */
export class Tumour {
  g = new THREE.Group();
  data: ReturnType<typeof cluster>;
  bodies: THREE.InstancedMesh; nuclei: THREE.InstancedMesh; nucMat: THREE.MeshToonMaterial;
  constructor(public n: number, r: V3, seed = 23, private flat = 0.7) {
    this.data = cluster(n, r, seed);
    this.bodies = inst(new THREE.SphereGeometry(1.1, 28, 18), toon("#ffffff"), n);
    this.nucMat = toon("#d61f1f", { emissive: NUC_RED.clone(), emissiveIntensity: 0.6 });
    this.nuclei = inst(new THREE.SphereGeometry(0.42, 18, 12), this.nucMat, n);
    this.data.look.forEach((l, i) => this.bodies.setColorAt(i, COL.copy(TUM_COL).lerp(TUM_COL2, l.tone)));
    this.g.add(this.bodies, this.nuclei);
  }
  pose(t: number, fn: (i: number, fin: V3) => [number, number, number, number] | null, tint?: (i: number) => THREE.Color | null) {
    for (let i = 0; i < this.n; i++) {
      const r = fn(i, this.data.pos[i]), lk = this.data.look[i];
      if (!r || r[3] <= 0.001) { setM(this.bodies, i, 0, 0, -999, 0); setM(this.nuclei, i, 0, 0, -999, 0); continue; }
      const [x, y, z, s] = r, wob = 0.06 * Math.sin(t * 5 + lk.ph);
      setM(this.bodies, i, x, y, z, s * (lk.sx + wob), s * (lk.sy - wob), s * this.flat, 0, 0, lk.rz + 0.25 * Math.sin(t * 1.7 + lk.ph));
      setM(this.nuclei, i, x, y, z + 1.1 * this.flat * 0.75 * s, s * (1 + 0.1 * Math.sin(t * 8 + lk.ph)));
      const c = tint?.(i);
      this.bodies.setColorAt(i, c ?? COL.copy(TUM_COL).lerp(TUM_COL2, lk.tone));
    }
    this.nucMat.emissiveIntensity = 0.55 + 0.2 * Math.sin(t * 8);
    flush(this.bodies, this.nuclei);
  }
}

/** interior de un vaso sanguíneo a lo largo de -z, con anillos y glóbulos que fluyen alrededor de la cámara */
export class Tunnel {
  g = new THREE.Group();
  private wall: THREE.Group; private rbc: THREE.InstancedMesh; private wbc: THREE.InstancedMesh;
  private cells: { a: number; r: number; z: number; v: number; ph: number }[];
  constructor(private radius = 7, nRed = 70, private nWhite = 0, seed = 51) {
    this.wall = new THREE.Group();
    this.wall.add(new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, 360, 28, 1, true).rotateX(PI / 2), toon("#c9323d", { side: THREE.BackSide })));
    const ring = new THREE.TorusGeometry(radius - 0.15, 0.32, 8, 40), rm = toon("#a3212f");
    for (let i = -15; i <= 15; i++) { const m = new THREE.Mesh(ring, rm); m.position.z = i * 12; this.wall.add(m); }
    const R = rng(seed);
    this.cells = Array.from({ length: nRed + nWhite }, () => ({ a: R() * 2 * PI, r: 2.4 + R() * (radius - 3.6), z: R() * 110, v: 0.6 + 0.8 * R(), ph: R() * 6.28 }));
    this.rbc = inst(new THREE.SphereGeometry(1, 20, 12), toon("#ee4a42"), nRed);
    this.wbc = inst(BALL, toon("#f6f1e6"), Math.max(1, nWhite));
    this.g.add(this.wall, this.rbc, this.wbc);
  }
  /** zCam = posición de la cámara; flow = metros recorridos por los glóbulos respecto al túnel */
  pose(t: number, zCam: number, flow: number) {
    this.wall.position.z = Math.round(zCam / 12) * 12;
    const nR = this.rbc.count;
    this.cells.forEach((c, i) => {
      const z = zCam + 14 - ((((c.z + flow * c.v) % 110) + 110) % 110), a = c.a + 0.15 * Math.sin(t * 0.8 + c.ph);
      const x = c.r * Math.cos(a), y = c.r * Math.sin(a);
      if (i < nR) setM(this.rbc, i, x, y, z, 1.15, 1.15, 0.38, t * c.v + c.ph, c.ph + t * 0.6 * c.v, 0);
      else setM(this.wbc, i - nR, x, y, z, 1.5);
    });
    if (!this.nWhite) setM(this.wbc, 0, 0, 0, -9999, 0);
    flush(this.rbc, this.wbc);
  }
}

const cyl = (r: number, len: number, x: number, y: number, rz: number) => {
  const g = new THREE.CylinderGeometry(r, r, len, 10).translate(0, len / 2, 0); // crece hacia +y desde su base
  return g.rotateZ(rz).translate(x, y, 0);
};
/** anticuerpo en "Y": tallo de 0 a 1.1 y dos brazos; el punto de unión de cada brazo queda en (±0.62, 1.95) */
export const Y_GEO = (() => mergeGeometries([
  cyl(0.16, 1.15, 0, 0, 0), cyl(0.15, 1.05, 0, 1.08, -0.62), cyl(0.15, 1.05, 0, 1.08, 0.62),
  new THREE.SphereGeometry(0.2, 10, 8).translate(0, 1.1, 0), new THREE.SphereGeometry(0.2, 10, 8).translate(0.62, 1.95, 0), new THREE.SphereGeometry(0.2, 10, 8).translate(-0.62, 1.95, 0),
])!)();
export const HEALTHY_COL = C("#8fd1ff"), NUC_BLUE = C("#2c6fe0");
export { SPHERE };
