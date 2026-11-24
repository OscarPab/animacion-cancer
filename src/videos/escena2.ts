// Escena 2 "La mecánica del tumor y la metástasis": el tumor crece y secuestra vasos (angiogénesis); una célula
// rompe la barrera, viaja por la sangre como un asteroide y coloniza el hueso.
import * as THREE from "three";
import words from "../../voice/escena2/words.json";
import lines from "../../voice/escena2/lines.json";
import { SceneDef } from "../shared/Stage";
import { BALL, C, COL, Dust, FPS, Look, PI, Rig, V3, clamp01, cutIndex, easeOutBack, flush, glow, growTube, hold, inst, lerp, makeCam, makeDof, mesh, mix3, pulse, ramp, rng, setM, smooth, toon, tube, voice } from "../shared/kit";
import { HEALTHY_COL, NUC_BLUE, Tumour, Tunnel, cluster } from "../shared/bio";

const T = voice(words);
export const TOTAL2 = Math.ceil((lines.end + 2.2) * FPS);
const tAng = T("angiog"), tFeed = T("alimentarlo"), tSi = T("si"), tBreak = T("rompen"), tFly = T("viajando"), tBone = T("colonizar"), tInv = T("invasivo"), tMeta = T("metastasis");
const CUTS = [0, tFly, tBone]; // 0 tumor, 1 túnel, 2 hueso
const LOOKS: Look[] = [
  { bg: "#f39a9c", fog: [50, 220], sky: "#ffd9d2", ground: "#c9607a" },
  { bg: "#7a1626", fog: [18, 120], sky: "#ffc2b8", ground: "#7a1626", sun: 0.85, hemi: 0.55 },
  { bg: "#d9b98a", fog: [30, 120], sky: "#fff3d6", ground: "#a8804f" },
];
const VESSEL: V3[] = [[-21, -34, -5], [-16, -12, -6], [-17, 10, -5], [-23, 34, -4]];
const ESC_END: V3 = [24, 9, -1]; // hacia el segundo vaso
const LAND: V3 = [0, 0.6, -3.2];
const TUM_R: V3 = [5.6, 6.6, 4.2];
const ESC_I = (() => { const d = cluster(64, TUM_R, 29).pos; return d.reduce((b, p, i) => (p[0] + 0.7 * p[1] + 0.5 * p[2] > d[b][0] + 0.7 * d[b][1] + 0.5 * d[b][2] ? i : b), 0); })();
const ESC: V3 = cluster(64, TUM_R, 29).pos[ESC_I]; // la célula que escapará

// ---------------- cámara ----------------
const cellFlyZ = (t: number) => -12 - 42 * (t - tFly);
const camAt = makeCam([
  { t: 0, s: hold(0, [4, -3, 36], [0, 0, 0], { fov: 40 }, 0.0022) },
  { t: T("piratea") + 0.3, dur: 34, s: hold(T("piratea"), [-5, -4, 68], [-8, 0, -2], { fov: 44, roll: -0.03 }, 0.0015) },
  { t: tAng, s: hold(tAng, [-3, -3, 21], [-9.5, 1, -2], { fov: 38, roll: 0.04 }, 0.0025) },
  { t: T("vasos"), dur: 38, s: hold(T("vasos"), [-3, -6, 27], [-6, 0, 0], { roll: -0.03 }) },
  { t: tFeed, s: hold(tFeed, [4, 5, 40], [-3, 0, 0], { fov: 42 }, 0.003) },
  { t: tSi, s: hold(tSi, [ESC[0] + 5, ESC[1] + 3, ESC[2] + 13], ESC, { fov: 38, roll: 0.04 }) },
  { t: tBreak + 0.5, dur: 30, s: hold(tBreak, [15, 6, 22], [14, 6, 0], { roll: -0.035 }) },
  { t: tFly, s: (f) => { const t = f / FPS, z = cellFlyZ(t); return { pos: [1.2 * Math.sin(t * 2.1), 0.8 * Math.cos(t * 1.7) - 0.6, z + 13 - 3 * ramp(t, tFly + 1.2, 1.5)], look: [0, 0, z], fov: 48, roll: 0.12 * Math.sin(t * 1.3) }; } },
  { t: tBone, s: hold(tBone, [0, 4, 31], [0, 0, -4], { fov: 42 }) },
  { t: T("proceso"), dur: 34, s: hold(T("proceso"), [2.5, -1, 14], LAND, { fov: 38, roll: 0.04 }) },
  { t: tMeta + 0.5, dur: 44, s: hold(tMeta, [-2.5, 2, 25], LAND, { fov: 40, roll: -0.03 }, -0.001) },
], [[tAng, 0.8], [tFeed, 1.1], [tBreak + 0.55, 1.2], [tBone + 1.55, 1.0], [tMeta, 1.4]]);
const dof = makeDof([
  { t: 0, cInf: 8, focus: () => [0, 0, 0] }, { t: tAng, cInf: 13 }, { t: T("vasos"), dur: 38, cInf: 8 }, { t: tFeed, cInf: 5 },
  { t: tSi, cInf: 13 }, { t: tFly, cInf: 7 }, { t: tBone, cInf: 6, focus: () => LAND }, { t: T("proceso"), dur: 34, cInf: 12, focus: () => LAND },
]);

export const escena2: SceneDef = {
  total: TOTAL2, dof,
  overlays: (f) => { const t = f / FPS; return [{ c: "#ff3b30", o: 0.7 * clamp01(1 - (t - tMeta) * 7) * (t >= tMeta ? 1 : 0) }, { c: "#7a1626", o: pulse(t, tFly, 0.09) }, { c: "#f3dcb2", o: pulse(t, tBone, 0.09) }]; },
  make: () => {
    const root = new THREE.Group(), rig = new Rig(root), dust = new Dust(140, 43);
    // ---- lugar 0: tumor + vasos ----
    const A = new THREE.Group();
    const tum = new Tumour(64, TUM_R, 29, 0.85), esc = ESC_I;
    const vesselMat = toon("#e23b3f"), sproutMat = glow("#e8343a", 0.12);
    A.add(tube(VESSEL, 3.3, vesselMat, 60), tube([[30, -34, -4], [25, -10, -2], [26, 12, -3], [31, 34, -5]], 2.6, vesselMat, 50));
    const R = rng(9);
    const sprouts = Array.from({ length: 7 }, (_, i) => {
      const y0 = -14 + i * 4.6, from: V3 = [-13.4 - 0.25 * Math.abs(y0) * 0.1, y0, -4.5], a = -1.9 + i * 0.63;
      const to: V3 = [5.2 * Math.cos(a) * -1 * Math.sign(Math.cos(a) || 1) * 0.9, 6 * Math.sin(a), 1.5 * (R() - 0.5)];
      const m = tube([from, mix3(from, to, 0.35).map((v, k) => v + (R() - 0.5) * (k === 1 ? 5 : 2)) as V3, mix3(from, to, 0.7).map((v, k) => v + (R() - 0.5) * (k === 1 ? 4 : 2)) as V3, to], 0.55 - 0.02 * i, sproutMat, 48);
      A.add(m); return m;
    });
    const barrier = inst(new THREE.SphereGeometry(1.1, 24, 16), toon(HEALTHY_COL), 44), barNuc = inst(new THREE.SphereGeometry(0.42, 16, 10), toon(NUC_BLUE), 44);
    const fat = inst(BALL, toon("#f8d674"), 60);
    for (let i = 0; i < 60; i++) { let x = 0, y = 0; do { x = (R() - 0.5) * 150; y = (R() - 0.5) * 170; } while (Math.abs(x) < 34 && Math.abs(y) < 44); setM(fat, i, x, y, -30 - 30 * R(), 5 + 5 * R()); }
    A.add(tum.g, barrier, barNuc, fat);
    // ---- lugar 1: túnel ----
    const tun = new Tunnel(7, 70, 0);
    const hero = new THREE.Group();
    hero.add(mesh(new THREE.SphereGeometry(1.1, 28, 18), toon("#5a2560"), [0, 0, 0], [1.15, 0.95, 0.85]), mesh(new THREE.SphereGeometry(0.42, 18, 12), toon("#d61f1f", { emissive: C("#ff2a22"), emissiveIntensity: 0.7 }), [0, 0, 0.7]));
    for (let k = 0; k < 3; k++) hero.add(mesh(BALL, toon("#5a2560"), [0.9 * Math.cos(0.6 + k * 2.2), 0.9 * Math.sin(0.6 + k * 2.2), 0.05], 0.5 + 0.1 * k));
    // ---- lugar 2: hueso esponjoso ----
    const D = new THREE.Group(), boneMat = toon("#f6e9c8");
    const nodes: V3[] = [];
    for (let i = -3; i <= 3; i++) for (let j = -4; j <= 4; j++) for (let k = 0; k < 3; k++) nodes.push([i * 9 + (R() - 0.5) * 5, j * 9 + (R() - 0.5) * 5 - 4, -8 - k * 9 + (R() - 0.5) * 4]);
    nodes.push([0, -1.4, -5]);
    const strutGeo = new THREE.CylinderGeometry(1, 1, 1, 10).translate(0, 0.5, 0), struts: [V3, V3][] = [];
    nodes.forEach((a, i) => nodes.forEach((b, j) => { if (j > i && Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) < 12.5) struts.push([a, b]); }));
    const st = inst(strutGeo, boneMat, struts.length), nd = inst(BALL, boneMat, nodes.length), up = new THREE.Vector3(0, 1, 0), dir = new THREE.Vector3(), q = new THREE.Quaternion(), m4 = new THREE.Matrix4();
    struts.forEach(([a, b], i) => { dir.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]); const L = dir.length(); q.setFromUnitVectors(up, dir.normalize()); st.setMatrixAt(i, m4.compose(new THREE.Vector3(...a), q, new THREE.Vector3(1.3, L, 1.3))); });
    nodes.forEach((p, i) => setM(nd, i, p[0], p[1], p[2], i === nodes.length - 1 ? 3 : 2.1 + 0.8 * R()));
    const col = new Tumour(14, [2.6, 2.4, 1.2], 77, 0.8);
    col.g.position.set(...LAND);
    D.add(st, nd, col.g, mesh(new THREE.PlaneGeometry(300, 300), toon("#c9a676"), [0, 0, -40]));
    root.add(A, tun.g, hero, D, dust.mesh);

    return {
      root,
      update: (f, cam, scene) => {
        const t = f / FPS, place = cutIndex(CUTS, t);
        A.visible = place === 0; tun.g.visible = place === 1; D.visible = place === 2; hero.visible = place > 0;
        const look = rig.apply(scene, cam, camAt(f), LOOKS[place]);
        if (place === 0) {
          const g = lerp(0.72, 1, ramp(t, 1.2, 3.2)) * (1 + 0.16 * ramp(t, tFeed, 1.2) + 0.025 * Math.sin(t * 6) * ramp(t, tFeed, 0.5));
          const eu = ramp(t, tBreak - 0.2, 2.2), wr = ramp(t, tSi, 1.5) * (1 - eu);
          tum.pose(t, (i, p) => {
            if (i !== esc) return [p[0] * g, p[1] * g, p[2] * g, g];
            const s0: V3 = [p[0] * g + 0.5 * wr + 0.25 * wr * Math.sin(t * 9), p[1] * g + 0.3 * wr, p[2] * g + 0.8 * wr];
            const e = mix3(s0, ESC_END, eu);
            return [e[0], e[1] + 2.2 * Math.sin(eu * PI), e[2], g * (1 + 0.15 * wr)];
          });
          sprouts.forEach((m, i) => growTube(m, ramp(t, tAng + 0.05 + 0.2 * i, 1.9)));
          sproutMat.emissiveIntensity = 0.1 + 0.35 * ramp(t, tFeed - 0.4, 0.6) * (0.6 + 0.4 * Math.sin(t * 7));
          // barrera de células sanas: se apartan cuando la célula las atraviesa
          const hit = pulse(t, tBreak + 0.75, 0.55);
          for (let i = 0; i < 44; i++) {
            const y = -22 + i * 1.0, dy = y - 7.6, open = hit * 1.5 * Math.exp(-dy * dy / 9) * Math.sign(dy || 1);
            const x = 13.2 + 0.02 * y * y - 0.3 + (i % 2) * 1.9, s = 1 + 0.03 * Math.sin(t * 2.2 + i);
            setM(barrier, i, x, y + open, 0, s, s, 0.7 * s); setM(barNuc, i, x, y + open, 0.55, s);
          }
          flush(barrier, barNuc);
          dust.pose(t, [0, 0, 6], [70, 90, 14], 1.6, "#ffe3de");
        } else if (place === 1) {
          const z = cellFlyZ(t);
          tun.pose(t, cam.position.z, 22 * (t - tFly));
          hero.position.set(0.5 * Math.sin(t * 3.1), 0.4 * Math.cos(t * 2.3), z);
          hero.rotation.set(t * 1.3, t * 0.9, t * 2.2); hero.scale.setScalar(1.25);
          dust.pose(t, [0, 0, cam.position.z - 30], [10, 10, 70], 0.7, "#ffb3a8");
        } else {
          const u = clamp01((t - tBone) / 1.55), e = 1 - (1 - u) ** 3, sq = pulse(t, tBone + 1.6, 0.14);
          const p = mix3([-14, 20, 2], [LAND[0], LAND[1] + 0.4, LAND[2] + 0.4], e);
          hero.position.set(...p); hero.rotation.set(0, 0, (1 - e) * 5); hero.scale.set(1.2 * (1 + 0.3 * sq), 1.2 * (1 - 0.3 * sq), 1.2);
          hero.visible = t < tInv;
          const n = t < tInv ? 0 : t < tInv + 0.55 ? 2 : t < tInv + 1.0 ? 4 : t < tMeta ? 7 : Math.min(14, 7 + Math.floor((t - tMeta) * 9));
          const born = (i: number) => (i < 1 ? tInv : i < 2 ? tInv : i < 4 ? tInv + 0.55 : i < 7 ? tInv + 1.0 : tMeta + (i - 7) / 9);
          const cur: V3[] = [];
          col.pose(t, (i, fin) => {
            if (i >= n) { cur.push(cur[col.data.parent[i]] ?? [0, 0, 0]); return null; }
            const e2 = i === 0 ? 1 : easeOutBack((t - born(i)) / 0.45), par = i === 0 ? fin : cur[col.data.parent[i]], q2 = mix3(par, fin, e2);
            cur.push(q2); return [q2[0], q2[1], q2[2] + 0.5, i === 0 ? 1.05 : 0.45 + 0.6 * e2];
          });
          dust.pose(t, [0, 0, 4], [50, 70, 16], 1.1, "#fff6e0");
        }
        return look;
      },
    };
  },
};
