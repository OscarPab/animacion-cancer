// Escena 4 "Riesgos de la radiación y valor del ultrasonido": el mastógrafo comprime y dispara rayos X ámbar;
// la radiación llega al ADN; el tejido denso esconde la lesión; el ultrasonido, sin comprimir y sin radiación,
// distingue quiste, tejido denso y masa sólida.
import * as THREE from "three";
import { AbsoluteFill } from "remotion";
import React from "react";
import words from "../../voice/escena4/words.json";
import lines from "../../voice/escena4/lines.json";
import { SceneDef } from "../shared/Stage";
import { BALL, C, COL, Dust, FPS, Look, PI, Rig, SPHERE, V3, clamp01, cutIndex, flush, glow, hold, inst, lerp, makeCam, makeDof, mesh, pulse, ramp, rng, setM, toon, voice } from "../shared/kit";
import { NOINK } from "./escena1/ink";

const T = voice(words);
export const TOTAL4 = Math.ceil((lines.end + 2.4) * FPS);
const tMasto = T("mastografia"), tRay = T("rayos"), tIon = T("ionizante"), tDna = T("alteraciones"), tComp = T("compresion"),
  tDense = T("densas"), tUS = T("ultrasonido"), tWave = T("ondas"), tCyst = T("quiste"), tTum = T("tumor"), tBio = T("biopsia");
const FLASH = [tRay, tRay + 0.42, tIon];
const CUTS = [0, tDna, tComp, tDense, tUS];
const LOOKS: Look[] = [
  { bg: "#1a140f", fog: [28, 130], sky: "#ffd2a8", ground: "#2a1c14", sun: 0.72, hemi: 0.32 },
  { bg: "#120e0c", fog: [10, 55], sky: "#ffc48a", ground: "#1a100c", sun: 0.45, hemi: 0.28 },
  { bg: "#1a140f", fog: [22, 110], sky: "#ffd2a8", ground: "#2a1c14", sun: 0.7, hemi: 0.3 },
  { bg: "#10161c", fog: [36, 150], sky: "#d5dde6", ground: "#10161c", sun: 0.4, hemi: 0.28 },
  { bg: "#0c2434", fog: [40, 170], sky: "#c9eeff", ground: "#0a1c2a", sun: 0.8, hemi: 0.5 },
];
const CYST: V3 = [-6.2, -6.2, 0.4], TUM: V3 = [6.2, -7.2, 0.2], DENSE: V3 = [0.4, 2.4, 0.3], TIP: V3 = [0, 7.2, 0];

const camAt = makeCam([
  { t: 0, s: hold(0, [14, 1, 34], [0, -1, 0], { fov: 40, roll: -0.02 }, 0.0022) },
  { t: tMasto, s: hold(tMasto, [7, -1.2, 15], [0, -2.2, 1], { fov: 36, roll: 0.03 }) },
  { t: tRay, s: hold(tRay, [-7, -3, 17], [0, 0.4, 1], { fov: 40, roll: -0.04 }) },
  { t: tDna, s: hold(tDna, [8, 1, 32], [0, 0, 0], { fov: 40, roll: 0.03 }) },
  { t: tDna + 0.55, dur: 18, s: hold(tDna, [4.5, -1, 18], [0, -2, 0], { fov: 36, roll: -0.02 }) },
  { t: tComp, s: hold(tComp, [4.2, -2.4, 11], [0, -2.6, 1], { fov: 34, roll: 0.04 }) },
  { t: tDense, s: hold(tDense, [0.2, 0.2, 34], [0, 0, 0], { fov: 40 }) },
  { t: tDense + 0.8, dur: 22, s: hold(tDense, [-0.6, 0.4, 22], [0, 0.2, 0], { fov: 38 }) },
  { t: tUS, s: hold(tUS, [2, 3, 38], [0, 1, 0], { fov: 40, roll: -0.015 }) },
  { t: tWave + 0.8, dur: 34, s: hold(tWave, [0, -1, 32], [0, -1.5, 0], { fov: 40 }) },
  { t: tCyst, dur: 26, s: hold(tCyst, [-3.2, -3.4, 20], CYST, { fov: 38, roll: 0.02 }) },
  { t: tTum, dur: 26, s: hold(tTum, [2.8, -4.2, 20], TUM, { fov: 38, roll: -0.02 }) },
], [...FLASH.map((t) => [t, 0.7] as [number, number]), [tComp + 0.35, 1.1], [tDna + 0.9, 0.8]]);
const dof = makeDof([
  { t: 0, cInf: 6, focus: () => [0, -2, 1] }, { t: tMasto, cInf: 11 }, { t: tDna, cInf: 8 }, { t: tDna + 0.7, dur: 22, cInf: 12 },
  { t: tComp, cInf: 10 }, { t: tDense, cInf: 0 }, { t: tUS, cInf: 0 }, { t: tCyst, dur: 26, cInf: 11 },
]);

const tag: React.CSSProperties = { position: "absolute", left: 0, right: 0, top: 150, textAlign: "center", fontFamily: "Consolas, 'Courier New', monospace", letterSpacing: 6, fontSize: 34, color: "#ffe7c4" };

export const escena4: SceneDef = {
  total: TOTAL4, dof, bloom: 0.85,
  ink: (f) => (f / FPS < tUS ? { color: "#ffd7b0", strength: 0.9 } : { color: "#c9f3ff", strength: 0.9 }),
  overlays: (f) => {
    const t = f / FPS;
    return [
      { c: "#ffb03a", o: 0.45 * Math.max(...FLASH.map((x) => (t >= x ? clamp01(1 - (t - x) * 8) : 0))) },
      { c: "#120e0c", o: Math.max(pulse(t, tDna, 0.1), pulse(t, tComp, 0.08), pulse(t, tDense, 0.1)) },
      { c: "#e7f7ff", o: 0.55 * pulse(t, tUS, 0.12) },
    ];
  },
  hud: (f) => {
    const t = f / FPS;
    const a = (t0: number, t1: number) => clamp01((t - t0) * 4) * clamp01((t1 - t) * 3);
    const ray = a(tRay, tDna - 0.15), den = a(tDense + 0.3, tUS - 0.2), us = a(tUS + 0.4, tWave + 1.2), bio = a(tBio - 0.2, tBio + 2.4);
    return (
      <AbsoluteFill>
        {ray > 0 && <div style={{ ...tag, opacity: ray, color: "#ffc56a", textShadow: "0 0 18px #ff9a1a" }}>RAYOS X · RADIACIÓN IONIZANTE</div>}
        {den > 0 && <div style={{ ...tag, opacity: den, color: "#d5dde6" }}>MAMA DENSA · LESIÓN OCULTA</div>}
        {us > 0 && <div style={{ ...tag, opacity: us, color: "#d7f6ff", textShadow: "0 0 16px #39c4ff" }}>ULTRASONIDO · SIN RADIACIÓN</div>}
        {bio > 0 && <div style={{ ...tag, opacity: bio, top: 1500, color: "#ffd0c8" }}>AMERITA BIOPSIA</div>}
      </AbsoluteFill>
    );
  },
  make: () => {
    const root = new THREE.Group(), rig = new Rig(root), dust = new Dust(90, 44);
    const R = rng(19), box = new THREE.BoxGeometry(1, 1, 1);
    const steel = toon("#5c6770"), steel2 = toon("#3c444c");
    // ---- mastógrafo (lugares 0 y 2) ----
    const A = new THREE.Group();
    A.add(mesh(box, steel2, [0, -12.2, -2], [11, 1.1, 12]), mesh(box, steel, [0, -1, -6.2], [2.6, 22, 2.6]), mesh(box, steel, [0, 9.2, -0.6], [4.6, 3.4, 7.4]),
      mesh(new THREE.CylinderGeometry(1.5, 2, 1.4, 20), toon("#6a5428"), [0, 6.8, 1.4]), mesh(box, steel2, [0, -4.5, 0.4], [9.2, 1.1, 8.4]));
    const paddle = mesh(box, toon("#d5dde4"), [0, 3.2, 1.2], [7.6, 0.45, 6.6]);
    const padArm = mesh(box, steel, [0, 3.2, -3.2], [2.2, 1, 2.2]);
    const bustMat = toon("#f0b7a4");
    const bust = mesh(new THREE.SphereGeometry(1, 36, 20, 0, 2 * PI, 0, PI / 2), bustMat, [0, -3.9, 1.3]);
    const inner = inst(BALL, glow("#ffb15a", 0.35), 12);
    const beam = mesh(new THREE.ConeGeometry(3.8, 8.4, 24, 1, true).rotateX(PI), new THREE.MeshBasicMaterial({ color: C("#ffb03a").multiplyScalar(1.8), transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }), [0, 2.4, 1.4]);
    beam.layers.set(NOINK);
    A.add(paddle, padArm, bust, inner, beam);
    // ---- ADN ----
    const D = new THREE.Group(), NB = 36;
    const beadH = inst(BALL, toon("#d5e7f2"), NB * 2), beadD = inst(BALL, glow("#ff5a32", 0.55), NB * 2);
    const rungH = inst(new THREE.CylinderGeometry(0.08, 0.08, 1, 6), toon("#9ec4d6"), NB);
    const rungD = inst(new THREE.CylinderGeometry(0.08, 0.08, 1, 6), glow("#ff5a32", 0.4), NB);
    const bits = inst(BALL, glow("#ffb03a", 0.9), 16);
    bits.layers.set(NOINK);
    D.add(beadH, beadD, rungH, rungD, bits);
    const up = new THREE.Vector3(0, 1, 0), dir = new THREE.Vector3(), q = new THREE.Quaternion(), m4 = new THREE.Matrix4(), mid = new THREE.Vector3();
    // ---- pantalla: mama densa ----
    const Scr = new THREE.Group();
    Scr.add(mesh(box, toon("#0c1218"), [0, 0, -0.5], [16, 22, 0.8]), mesh(box, steel, [0, 0, -0.9], [18, 24, 0.7]), mesh(box, steel2, [0, -14.5, -1.4], [3.2, 6, 1.6]));
    Scr.add(mesh(new THREE.SphereGeometry(1, 32, 20, PI / 2, PI), toon("#c5ced6"), [-7.4, 0.2, 0.15], [8.4, 9.2, 0.35]));
    const fib = inst(SPHERE, toon("#e7edf2"), 28);
    for (let i = 0; i < 28; i++) setM(fib, i, -6.2 + R() * 7.2, -6 + R() * 12, 0.35, 0.55 + 1.3 * R(), 0.4 + 1.1 * R(), 0.16, 0, 0, R());
    const hide = mesh(new THREE.SphereGeometry(2.4, 24, 16), toon("#f7f9fb", { transparent: true, opacity: 0.92 }), DENSE);
    const lesion = mesh(SPHERE, toon("#b7c0c8"), DENSE, [0.7, 0.55, 0.2]);
    Scr.add(fib, hide, lesion);
    // ---- ultrasonido ----
    const U = new THREE.Group();
    for (let i = 0; i < 4; i++) U.add(mesh(box, toon(["#12324f", "#0e2944", "#143656", "#0c2238"][i]), [0, 3.6 - i * 6.4, -3.5], [64, 6.4, 0.8]));
    U.add(mesh(box, toon("#3d7eae"), [0, 6.6, -1], [64, 0.55, 6]));
    const probe = new THREE.Group();
    probe.add(mesh(box, toon("#e7eef3"), [0, 3.6, 0], [4.8, 5.6, 2.3]), mesh(new THREE.CylinderGeometry(2.3, 2.3, 1.1, 20), toon("#9fd0ea"), [0, 0.7, 0]), mesh(new THREE.CylinderGeometry(0.35, 0.35, 16, 8), steel, [0, 14, 0]));
    const cyst = mesh(new THREE.SphereGeometry(2.5, 32, 20), toon("#14385f"), CYST);
    const tum = inst(BALL, toon("#14385f"), 9);
    for (let i = 0; i < 9; i++) { const a = R() * 6.28, d = i ? 0.8 + R() : 0; setM(tum, i, TUM[0] + d * Math.cos(a), TUM[1] + d * 0.85 * Math.sin(a), 0.2, i ? 0.7 + 0.5 * R() : 1.5); }
    const densePatch = inst(SPHERE, toon("#d5e2ee"), 8);
    for (let i = 0; i < 8; i++) setM(densePatch, i, -0.4 + (R() - 0.5) * 3.2, 1.6 + (R() - 0.5) * 2.4, 0.3, 0.7 + 0.5 * R(), 0.45 + 0.3 * R(), 0.2);
    const arcGeo = new THREE.TorusGeometry(1, 0.045, 6, 48, PI * 0.7).rotateZ(PI * 1.15);
    const arcs = Array.from({ length: 12 }, () => { const m = mesh(arcGeo, new THREE.MeshBasicMaterial({ color: "#b9f3ff", transparent: true, depthWrite: false })); m.layers.set(NOINK); U.add(m); return m; });
    U.add(probe, cyst, tum, densePatch);
    root.add(A, D, Scr, U, dust.mesh);

    return {
      root,
      update: (f, cam, scene) => {
        const t = f / FPS, place = cutIndex(CUTS, t);
        A.visible = place === 0 || place === 2; D.visible = place === 1; Scr.visible = place === 3; U.visible = place === 4;
        const look = rig.apply(scene, cam, camAt(f), LOOKS[place]);
        if (A.visible) {
          const press = Math.max(ramp(t, 0.8, 2.2), ramp(t, tComp, 0.7));
          const y = lerp(3.4, -1.55, press), h = lerp(2.6, 1.35, press), w = lerp(3.2, 4.15, press);
          paddle.position.y = y; padArm.position.y = y; bust.scale.set(w, h, w * 0.92);
          bustMat.emissive.set("#000"); bustMat.emissiveIntensity = 0;
          if (place === 2) { bustMat.emissive.set("#ff6a4a"); bustMat.emissiveIntensity = 0.35 * press; }
          const flashes = Math.max(...FLASH.map((x) => (t >= x ? clamp01(1 - (t - x) * 3.2) : 0)));
          const fl = place === 0 ? Math.max(flashes, 0.55 * ramp(t, tRay - 0.1, 0.3) * (1 - ramp(t, tDna - 0.45, 0.35))) : 0;
          (beam.material as THREE.MeshBasicMaterial).opacity = 0.55 * fl;
          for (let i = 0; i < 12; i++) {
            const a = i * 1.9, rad = 0.2 + 0.55 * ((i * 5) % 8) / 8;
            setM(inner, i, w * rad * Math.cos(a), -3.7 + h * (0.25 + 0.4 * ((i * 3) % 7) / 7), 1.3 + 0.4 * Math.sin(a), i === 4 ? 0.42 : 0.16);
          }
          flush(inner);
          dust.pose(t, [0, 0, 6], [36, 40, 10], 0.55, "#ffc48a");
        } else if (place === 1) {
          const hit = ramp(t, tDna + 0.15, 1.7);
          for (let i = 0; i < NB; i++) {
            const y = (i / (NB - 1) - 0.5) * 28, a = i * 0.62 + t * 0.35, rad = 3.15;
            const ax = rad * Math.cos(a), az = rad * Math.sin(a);
            const dmg = clamp01((hit - 0.15) * 1.4) * (i > 12 && i < 24 ? 1 : 0.15);
            const br = i > 16 && i < 21 ? dmg : 0;
            const s = 0.32;
            setM(beadH, i, ax, y, az, s * (1 - dmg)); setM(beadH, i + NB, -ax, y, -az, s * (1 - dmg));
            setM(beadD, i, ax, y, az, s * dmg); setM(beadD, i + NB, -ax, y, -az, s * dmg);
            mid.set(0, y, 0); dir.set(-2 * ax, 0, -2 * az);
            const len = dir.length() * (1 - 0.92 * br); q.setFromUnitVectors(up, dir.normalize());
            rungH.setMatrixAt(i, m4.compose(mid, q, new THREE.Vector3(0.09, Math.max(0.05, len * (1 - dmg)), 0.09)));
            rungD.setMatrixAt(i, m4.compose(mid, q, new THREE.Vector3(0.1, Math.max(0.05, len * dmg), 0.1)));
          }
          flush(beadH, beadD); rungH.instanceMatrix.needsUpdate = true; rungD.instanceMatrix.needsUpdate = true;
          for (let i = 0; i < 16; i++) {
            const u = ((t - tDna) * 0.85 + i / 16) % 1;
            const y = -6 + (i - 8) * 0.7;
            setM(bits, i, lerp(16, 2.2 * Math.cos(i), u), lerp(y, -2 + (i % 5) - 2, u), lerp(4, 2 * Math.sin(i), u), 0.18 + 0.08 * (u > 0.82 ? 1 : 0));
          }
          flush(bits);
          dust.pose(t, [0, 0, 2], [16, 30, 8], 0.35, "#ffc48a");
        } else if (place === 3) {
          const k = ramp(t, tDense + 0.4, 1.4);
          lesion.scale.setScalar(0.55 + 0.08 * Math.sin(t * 3));
          (hide.material as THREE.MeshToonMaterial).opacity = lerp(0.97, 0.78, k);
          dust.pose(t, [0, 0, 6], [24, 30, 6], 0.4, "#d5dde6");
        } else {
          probe.position.y = lerp(16, 7.15, ramp(t, tUS + 0.2, 1.3)) + 0.08 * Math.sin(t * 1.6) * ramp(t, tUS + 1.2, 0.4);
          arcs.forEach((m, i) => {
            const period = 0.38 * 12;
            const age = ((t - tWave - i * 0.38) % period + period) % period;
            const on = t > tWave + i * 0.38;
            const r = 7.5 * age;
            m.visible = on && r < 30 && r > 0.2;
            if (!m.visible) return;
            m.position.set(...TIP); m.scale.setScalar(r);
            const mat = m.material as THREE.MeshBasicMaterial;
            mat.color.set("#c8f6ff").multiplyScalar(1.5);
            mat.opacity = clamp01(1.15 - r / 30) * clamp01(r / 1.5);
          });
          const reveal = ramp(t, tWave + 0.8, 1.6);
          (cyst.material as THREE.MeshToonMaterial).color.set("#14385f").lerp(COL.set("#3ecf9a"), reveal * (0.35 + 0.65 * pulse(t, tCyst + 0.4, 0.7)));
          const tumMat = tum.material as THREE.MeshToonMaterial;
          tumMat.color.set("#14385f").lerp(COL.set("#e8eef2"), reveal * 0.7).lerp(COL.set("#ff5a48"), reveal * pulse(t, tTum + 0.35, 0.55));
          (densePatch.material as THREE.MeshToonMaterial).color.set("#d5e2ee");
          densePatch.visible = t > tWave;
          tum.visible = true; cyst.visible = true;
          dust.pose(t, [0, 0, 6], [40, 36, 8], 0.45, "#9fd8ff");
        }
        return look;
      },
    };
  },
};
