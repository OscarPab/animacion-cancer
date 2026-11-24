// Escena 5 "La revolución en las curas": la quimioterapia tradicional daña todo; los ADC (anticuerpo en "Y" con
// su carga de fármaco) viajan por la sangre, se acoplan a los receptores HER2 / TROP2 de la célula tumoral, entran,
// liberan la toxina en el núcleo y la célula se deshace en polvo, con las células sanas intactas.
import React from "react";
import * as THREE from "three";
import { AbsoluteFill } from "remotion";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import words from "../../voice/escena5/words.json";
import lines from "../../voice/escena5/lines.json";
import { SceneDef } from "../shared/Stage";
import { BALL, C, COL, Dust, FPS, Look, PI, Rig, V3, clamp01, cutIndex, flush, glow, hold, inst, lerp, makeCam, makeDof, mesh, pulse, ramp, rng, setM, smooth, toon, voice } from "../shared/kit";
import { HEALTHY_COL, NUC_BLUE, Tumour, Tunnel, Y_GEO } from "../shared/bio";
import { NOINK } from "./escena1/ink";

const T = voice(words);
export const TOTAL5 = Math.ceil((lines.end + 2.2) * FPS);
const tQuim = T("quimioterapia"), tDan = T("danaba"), tAdc = T("el", 1) - 0.1, tConj = T("conjugados"), tFar = T("anticuerpo-") + 0.7, tTroya = T("caballo"), tDis = T("disenamos"),
  tRas = T("rastrean"), tProt = T("proteinas"), tHer = T("her"), tTrop = T("trop"), tAgr = T("agresivo"), tAb = T("anticuerpo") - 0.2, tAnc = T("ancla"), tPen = T("penetra"),
  tLib = T("libera"), tSolo = T("solo", 1), tDes = T("destruccion"), tMin = T("minimo");
const CUTS = [0, tAdc, tRas]; // 0 campo (quimio), 1 torrente sanguíneo, 2 célula tumoral
const LOOKS: Look[] = [
  { bg: "#f39a9c", fog: [50, 200], sky: "#ffd9d2", ground: "#c9607a" },
  { bg: "#7a1626", fog: [18, 120], sky: "#ffc2b8", ground: "#7a1626", sun: 0.85, hemi: 0.55 },
  { bg: "#f2a0a6", fog: [45, 190], sky: "#ffe0da", ground: "#c9607a" },
];
const RC = 7, NADC = 5, YS = 1.5;
const up = new THREE.Vector3(0, 1, 0);
const dirs: V3[] = [[-0.18, 0.3, 1], [0.75, 0.55, 0.65], [-0.85, 0.35, 0.55], [0.4, -0.6, 0.8], [-0.5, -0.55, 0.75]].map(([x, y, z]) => { const l = Math.hypot(x, y, z); return [x / l, y / l, z / l] as V3; });
const fib = (n: number): V3[] => Array.from({ length: n }, (_, i) => { const y = 1 - (2 * (i + 0.5)) / n, r = Math.sqrt(1 - y * y), a = i * 2.39996; return [r * Math.cos(a), y, r * Math.sin(a)] as V3; });
const REC = [...dirs, ...fib(46).filter((d) => dirs.every((e) => Math.hypot(d[0] - e[0], d[1] - e[1], d[2] - e[2]) > 0.42))];
const P0: V3 = [dirs[0][0] * RC, dirs[0][1] * RC, dirs[0][2] * RC];
const heroZ = (t: number) => -28 * (t - tAdc);

const camAt = makeCam([
  { t: 0, s: hold(0, [0, 2, 46], [0, 0, 0], { fov: 40 }, 0.002) },
  { t: tQuim, dur: 36, s: hold(tQuim, [7, -4, 36], [0, 0, 0], { roll: 0.03 }) },
  { t: tAdc, s: (f) => { const t = f / FPS, a = 0.5 + 0.22 * (t - tAdc), z = heroZ(t), k = Math.exp(-0.0016 * (f - tAdc * FPS)); return { pos: [11.5 * k * Math.sin(a), 2.2, z + 11.5 * k * Math.cos(a)], look: [0, 1.7, z], fov: 38, roll: 0.03 }; } },
  { t: tTroya, s: (f) => { const t = f / FPS, z = heroZ(t); return { pos: [1.6 * Math.sin(t * 1.9), 1.6 + 0.6 * Math.cos(t * 1.4), z + 12], look: [0, 0.4, z - 6], fov: 48, roll: 0.1 * Math.sin(t * 1.2) }; } },
  { t: tRas, s: hold(tRas, [-6, 5, 38], [0, 0, 0], { fov: 40 }, 0.0015) },
  { t: tProt + 0.2, dur: 32, s: hold(tProt, [8, 8, 21], [2.6, 4, 5.4], { fov: 38, roll: 0.04 }) },
  { t: tAgr + 0.3, dur: 40, s: hold(tAgr, [9, 3, 34], [0, 0, 0], { fov: 42, roll: -0.03 }) },
  { t: tAb, s: hold(tAb, [P0[0] + 5.5, P0[1] + 2.5, P0[2] + 9], [P0[0] * 1.25, P0[1] * 1.25, P0[2] * 1.25], { fov: 38, roll: 0.04 }, 0.003) },
  { t: tPen + 0.4, dur: 32, s: hold(tPen, [1, 2.5, 25], [0, 0, 0], { fov: 40, roll: -0.02 }) },
  { t: tSolo, dur: 28, s: hold(tSolo, [2.5, 1.2, 14.5], [0, 0, 0], { fov: 38, roll: 0.035 }, 0.003) },
  { t: tDes, s: hold(tDes, [-4, 4, 40], [0, 0, 0], { fov: 42 }, 0.001) },
  { t: tMin + 0.4, dur: 44, s: hold(tMin, [5, 6, 50], [0, 0, 0], { fov: 42 }, -0.0008) },
], [[tDan, 1.0], [tConj, 0.6], [tAnc, 1.1], [tSolo + 0.6, 0.8], [tDes + 0.25, 1.5]]);
const dof = makeDof([
  { t: 0, cInf: 5 }, { t: tAdc, cInf: 13 }, { t: tTroya, cInf: 6, focus: (f) => [0, 0, heroZ(f / FPS)] }, { t: tRas, cInf: 5 }, { t: tProt + 0.2, dur: 32, cInf: 12 },
  { t: tAgr + 0.3, dur: 40, cInf: 4 }, { t: tAb, cInf: 12 }, { t: tPen + 0.4, dur: 32, cInf: 5 }, { t: tSolo, dur: 28, cInf: 10 }, { t: tDes, cInf: 3 },
]);
const label: React.CSSProperties = { position: "absolute", left: 0, right: 0, top: 230, textAlign: "center", fontFamily: "'Segoe UI', Arial, sans-serif", fontWeight: 800, fontSize: 120, letterSpacing: 6, color: "#fff", WebkitTextStroke: "5px #241726", paintOrder: "stroke fill" };

export const escena5: SceneDef = {
  total: TOTAL5, dof,
  overlays: (f) => { const t = f / FPS; return [{ c: "#7a1626", o: Math.max(pulse(t, tAdc, 0.1), pulse(t, tRas, 0.1)) }, { c: "#ffffff", o: 0.75 * (t >= tDes + 0.25 ? clamp01(1 - (t - tDes - 0.25) * 6) : 0) }]; },
  hud: (f) => {
    const t = f / FPS, a = (t0: number, t1: number) => clamp01((t - t0) * 6) * clamp01((t1 - t) * 6);
    const h = a(tHer, tTrop - 0.05), r = a(tTrop, tAgr - 0.1);
    return <AbsoluteFill>{h > 0 && <div style={{ ...label, opacity: h, color: "#ffb45e" }}>HER2</div>}{r > 0 && <div style={{ ...label, opacity: r, color: "#58e6b4" }}>TROP2</div>}</AbsoluteFill>;
  },
  make: () => {
    const root = new THREE.Group(), rig = new Rig(root), dust = new Dust(130, 53), R = rng(71);
    const cellGeo = new THREE.SphereGeometry(1, 32, 22), nucGeo = new THREE.SphereGeometry(0.4, 18, 12);
    const M = new THREE.Matrix4(), Qa = new THREE.Quaternion(), Qb = new THREE.Quaternion(), Va = new THREE.Vector3(), Vb = new THREE.Vector3(), Vs = new THREE.Vector3();
    const frame = (p: V3, yDir: V3, s: number, spin = 0) => M.compose(Va.set(...p), Qa.setFromUnitVectors(up, Vb.set(...yDir).normalize()).multiply(Qb.setFromAxisAngle(up, spin)), Vs.setScalar(Math.max(1e-4, s)));
    // ---- anticuerpos conjugados (compartidos por los lugares 1 y 2) ----
    const adc = inst(Y_GEO, toon("#22b7d9"), NADC), payMat = glow("#ffcf3a", 0.7), pay = inst(BALL, payMat, NADC * 4);
    const PAY: V3[] = [[0.36, 0.28, 0], [-0.36, 0.5, 0], [0.36, 0.74, 0], [-0.36, 0.96, 0]];
    /** coloca el ADC k; free(j) devuelve la posición de una carga ya liberada (o null si sigue unida) */
    const poseAdc = (k: number, p: V3, yDir: V3, s: number, spin: number, free?: (j: number, from: THREE.Vector3) => [V3, number] | null) => {
      frame(p, yDir, s, spin); adc.setMatrixAt(k, M);
      const m = M.clone();
      PAY.forEach((o, j) => { const w = new THREE.Vector3(...o).applyMatrix4(m), fr = free?.(j, w); if (fr) setM(pay, k * 4 + j, fr[0][0], fr[0][1], fr[0][2], fr[1]); else setM(pay, k * 4 + j, w.x, w.y, w.z, 0.27 * s / YS * (s > 0.01 ? 1 : 0)); });
    };
    // ---- 0: campo de células + quimioterapia ----
    const A = new THREE.Group(), NH = 24;
    const hp = Array.from({ length: NH }, () => { let x = 0, y = 0; do { x = (R() - 0.5) * 22; y = (R() - 0.5) * 46; } while (Math.hypot(x, y) < 7.5); return { x, y, z: -6 + R() * 9, s: 1.9 + 1.2 * R(), ph: R() * 6.28 }; });
    const hb = inst(cellGeo, toon("#ffffff"), NH), hn = inst(nucGeo, toon("#ffffff"), NH), tum0 = new Tumour(18, [3.6, 3.9, 2.2], 31, 0.85);
    const ND = 60, drops = inst(BALL, glow("#c6f23a", 0.7), ND);
    A.add(hb, hn, tum0.g, drops);
    // ---- 1: torrente sanguíneo ----
    const tun = new Tunnel(8, 64, 9, 57);
    // ---- 2: célula tumoral con receptores ----
    const G = new THREE.Group(), tg = new THREE.Group();
    const bodyMat = toon("#5a2560", { transparent: true }), body = mesh(new THREE.SphereGeometry(RC, 56, 36), bodyMat);
    const nucMat = toon("#d61f1f", { emissive: C("#ff2a22"), emissiveIntensity: 0.6 }), nuc = mesh(new THREE.SphereGeometry(2.3, 32, 22), nucMat);
    const recGeo = mergeGeometries([new THREE.CylinderGeometry(0.16, 0.2, 1, 8).translate(0, 0.5, 0), new THREE.SphereGeometry(0.34, 12, 8).translate(0, 1.1, 0)])!;
    const rec = inst(recGeo, toon("#ffffff"), REC.length);
    REC.forEach((d, i) => { rec.setMatrixAt(i, frame([d[0] * (RC - 0.1), d[1] * (RC - 0.1), d[2] * (RC - 0.1)], d, 1)); });
    tg.add(body, nuc, rec);
    const HP2: V3[] = [[-7, 12, -4], [6.5, 14, -6], [8, -10, -4], [-7.5, -11, -5], [0.5, -17, -6], [-1, 19.5, -8], [13, 2, -12]];
    const h2 = inst(cellGeo, toon(HEALTHY_COL), HP2.length), h2n = inst(nucGeo, toon(NUC_BLUE), HP2.length);
    const NP = 170, ash = inst(BALL, new THREE.MeshBasicMaterial({ color: "#ffffff" }), NP), ashD = fib(NP), ashV = ashD.map(() => 5 + 9 * R());
    ash.layers.set(NOINK);
    G.add(tg, h2, h2n, ash);
    root.add(A, tun.g, G, adc, pay, dust.mesh);

    return {
      root,
      update: (f, cam, scene) => {
        const t = f / FPS, place = cutIndex(CUTS, t);
        A.visible = place === 0; tun.g.visible = place === 1; G.visible = place === 2; adc.visible = pay.visible = place > 0;
        const look = rig.apply(scene, cam, camAt(f), LOOKS[place]);
        if (place === 0) {
          const dmg = ramp(t, tDan - 0.7, 1.8);
          hp.forEach((c, i) => {
            const s = c.s * (1 + 0.03 * Math.sin(t * 2 + c.ph)) * (1 - 0.22 * dmg), sh = 0.12 * dmg * Math.sin(t * 30 + i);
            setM(hb, i, c.x + sh, c.y, c.z, s, s, 0.75 * s); setM(hn, i, c.x + sh, c.y, c.z + 0.72 * s, s);
            hb.setColorAt(i, COL.copy(HEALTHY_COL).lerp(C("#9aa3ad"), dmg)); hn.setColorAt(i, COL.copy(NUC_BLUE).lerp(C("#5d6670"), dmg));
          });
          tum0.pose(t, (_i, p) => { const g = 1 - 0.14 * dmg; return [p[0] * g, p[1] * g, p[2] * g, g]; });
          for (let i = 0; i < ND; i++) {
            const x0 = -22 + ((i * 7.9) % 44), ph = ((i * 0.37) % 1), u = (((t - tQuim) * 0.55 + ph) % 1 + 1) % 1, on = t > tQuim - 0.2 + ph * 0.8;
            setM(drops, i, x0 + 6 * u, 30 - 62 * u, -4 + ((i * 3.1) % 9), on ? 0.34 : 0, on ? 0.75 : 0, on ? 0.34 : 0, 0, 0, 0.1);
          }
          flush(hb, hn, drops);
          dust.pose(t, [0, 0, 6], [50, 60, 12], 1.2, "#ffe3de");
        } else if (place === 1) {
          const z = heroZ(t), fly = ramp(t, tTroya - 0.3, 0.8);
          tun.pose(t, cam.position.z, 14 * (t - tAdc));
          const glowA = pulse(t, tConj + 0.75, 0.35), glowF = pulse(t, tFar + 0.25, 0.35);
          (adc.material as THREE.MeshToonMaterial).emissive.set("#22b7d9"); (adc.material as THREE.MeshToonMaterial).emissiveIntensity = 0.9 * glowA;
          payMat.emissiveIntensity = 0.6 + 1.4 * glowF;
          for (let k = 0; k < NADC; k++) {
            const o: V3 = k === 0 ? [0, 0, 0] : [[-2.6, 1.4, 5], [2.8, -0.6, 7], [-1.6, -2.2, 10], [2, 2.2, 12]][k - 1] as V3, show = k === 0 || t > tTroya - 0.2;
            const dodge = fly * (1.1 * Math.sin(t * 2.3 + k * 1.7)), bob = 0.35 * Math.sin(t * 1.6 + k);
            const yDir: V3 = [0.25 * Math.sin(t * 2.3 + k * 1.7) * fly, 1 - fly, -fly - 0.001];
            poseAdc(k, [o[0] + dodge, o[1] + bob + (1 - fly) * 0.2, z + o[2]], yDir, show ? YS * (k ? 0.9 : 1.15) : 0, (1 - fly) * (0.9 * (t - tAdc)) + 0.4);
          }
          flush(adc, pay);
          dust.pose(t, [0, 0, cam.position.z - 30], [12, 12, 70], 0.7, "#ffb3a8");
        } else {
          (adc.material as THREE.MeshToonMaterial).emissiveIntensity = 0; payMat.emissiveIntensity = 0.7 + 0.5 * pulse(t, tLib + 0.4, 0.5);
          const pen = ramp(t, tPen, 1.3), dead = ramp(t, tSolo + 0.6, 1.6), gone = ramp(t, tDes, 0.85);
          bodyMat.opacity = lerp(1, 0.42, ramp(t, tPen + 0.2, 1.2));
          bodyMat.color.set("#5a2560").lerp(COL.set("#6d6471"), 0.8 * dead);
          nucMat.color.set("#d61f1f").lerp(COL.set("#4a4550"), dead); nucMat.emissiveIntensity = 0.6 * (1 - dead) * (t > tSolo + 0.6 && t < tSolo + 1.6 ? (Math.floor(t * 14) % 2 ? 0.2 : 1.6) : 1);
          nuc.scale.setScalar((1 - 0.35 * dead) * (1 + 0.04 * Math.sin(t * 7)));
          const wob = gone > 0 ? 1 + 0.12 * Math.sin(t * 40) * (1 - gone) : 1 + 0.012 * Math.sin(t * 2.2);
          tg.scale.setScalar(Math.max(1e-3, (1 - gone ** 2) * wob)); tg.visible = gone < 0.999;
          tg.rotation.y = 0.05 * Math.sin(t * 0.6);
          const pr = pulse(t, tProt + 0.6, 0.5), ph = pulse(t, tHer + 0.3, 0.3), ptr = pulse(t, tTrop + 0.3, 0.3);
          REC.forEach((_d, i) => { const her = i % 2 === 0, k = 1 + 0.9 * pr + 1.6 * (her ? ph : ptr); rec.setColorAt(i, COL.set(her ? "#ff9a3c" : "#37d6a0").multiplyScalar(k).lerp(C("#77707c"), 0.85 * dead)); });
          for (let k = 0; k < NADC; k++) {
            const n = dirs[k], hov = ramp(t, tRas + 0.3 + 0.45 * k, 6), dock = smooth((t - (tAnc - 0.3 + 0.28 * k)) / 0.3), fade = ramp(t, tLib + 0.3 + 0.1 * k, 0.9);
            const rad = lerp(lerp(15.5, RC + 1.25 + 1.95 * YS, dock), RC - 2.2, pen), sw = (1 - dock) * (1 - hov * 0.6);
            const far: V3 = [-26 + 5 * k, 22 - 3 * k, 26], near: V3 = [n[0] * rad + sw * 2 * Math.sin(t * 1.7 + k), n[1] * rad + sw * 2 * Math.cos(t * 1.3 + k), n[2] * rad];
            const p: V3 = [lerp(far[0], near[0], hov), lerp(far[1], near[1], hov), lerp(far[2], near[2], hov)];
            poseAdc(k, p, [-p[0], -p[1], -p[2]], YS * (1 - fade) * (1 - gone), 0.3 * k, (j, from) => {
              const u = ramp(t, tLib + 0.25 * k + 0.12 * j, 1.5); if (u <= 0) return null;
              const a = k * 1.3 + j * 1.6, tgt: V3 = [2.2 * Math.cos(a) * Math.sin(1 + j * 0.5), 2.2 * Math.cos(1 + j * 0.5), 2.2 * Math.sin(a) * Math.sin(1 + j * 0.5) + 0.4];
              return [[lerp(from.x, tgt[0], u), lerp(from.y, tgt[1], u), lerp(from.z, tgt[2], u)], 0.3 * (1 - gone) * (1 - 0.6 * dead)];
            });
          }
          HP2.forEach((p, i) => { const s = 3.0 * (1 + 0.03 * Math.sin(t * 2 + i) + 0.08 * pulse(t, tMin + 0.9 + 0.08 * i, 0.3)); setM(h2, i, p[0], p[1], p[2], s, s, 0.8 * s); setM(h2n, i, p[0], p[1], p[2] + 0.78 * s, s); });
          const x = t - tDes - 0.25;
          ashD.forEach((d, i) => {
            const e = (1 - Math.exp(-2.2 * Math.max(0, x))) / 2.2, v = ashV[i], s = x > 0 ? 0.42 * clamp01(1 - x / 3.4) * (0.6 + 0.4 * ((i * 13) % 7) / 7) : 0;
            setM(ash, i, d[0] * (5.5 + v * e), d[1] * (5.5 + v * e) - 0.9 * Math.max(0, x) ** 2, d[2] * (5.5 + v * e), s);
          });
          (ash.material as THREE.MeshBasicMaterial).color.set("#6d4a78").lerp(COL.set("#efe6f2"), clamp01(x / 1.5));
          flush(adc, pay, rec, h2, h2n, ash);
          dust.pose(t, [0, 0, 8], [50, 60, 12], 1.2, "#ffe3de");
        }
        return look;
      },
    };
  },
};
