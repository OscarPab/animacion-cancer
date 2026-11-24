// Escena 4 "El futuro de la detección": la IA escanea mastografías (cuadrícula digital, 99.9 %), macro al
// laboratorio (cristal de cuarzo con electrodo de oro) y la superficie del biosensor acústico: anticuerpos anclados
// al oro atrapan biomarcadores, la masa aumenta y la onda acústica se frena (ecuación de Sauerbrey).
import React from "react";
import * as THREE from "three";
import { AbsoluteFill } from "remotion";
import words from "../../voice/escena4/words.json";
import lines from "../../voice/escena4/lines.json";
import { SceneDef } from "../shared/Stage";
import { BALL, C, COL, Dust, FPS, Look, PI, Rig, SPHERE, V3, clamp01, cutIndex, easeOutBack, flush, glow, hold, inst, lerp, makeCam, makeDof, mesh, pulse, ramp, rng, setM, smooth, toon, voice } from "../shared/kit";
import { Y_GEO } from "../shared/bio";
import { NOINK } from "./escena1/ink";

const T = voice(words);
export const TOTAL4 = Math.ceil((lines.end + 2.2) * FPS);
const tAI = T("primero"), tRun = T("actua"), tCount = T("analizando"), tFind = T("identificando"), tLab = T("aun") - 0.1, tSens = T("sensores"), tImag = T("imaginen"),
  tBio = T("biosensor"), tCrys = T("utilizamos"), tGold = T("lamina"), tOro = T("oro"), tSurf = T("oro", 1) - 0.25, tAnc = T("anclar"), tVib = T("vibrar"), tMark = T("biomarcador"),
  tHit = T("choque"), tMass = T("aumentando"), tMicro = T("ese"), tSlow = T("frena"), tRev = T("revelando"), tNano = T("precision");
const CUTS = [0, tAI, tFind, tLab, tSurf]; // 0 cuadrícula, 1 desfile de placas, 2 detección, 3 laboratorio, 4 superficie de oro
const NIGHT: Look = { bg: "#06182e", fog: [40, 170], sky: "#a9d6ff", ground: "#0a1c36", sun: 0.9, hemi: 0.42 };
const LAB: Look = { bg: "#cfe8ef", fog: [60, 220], sky: "#ffffff", ground: "#9fb8c4" };
const GOLD: Look = { bg: "#f6dc8c", fog: [30, 110], sky: "#fff7d6", ground: "#c9962a" };
const SPOT: V3 = [-2.4, 1.5, 0.5], CRY: V3 = [0, 7, 0.3];

// anticuerpos sobre el oro y los que atraparán un biomarcador
const AB = (() => { const R = rng(61), a: { x: number; z: number; ry: number; s: number }[] = []; for (let i = -6; i <= 6; i++) for (let j = -5; j <= 3; j++) a.push({ x: i * 2.5 + (R() - 0.5) * 1.1, z: j * 2.5 + (R() - 0.5) * 1.1, ry: (R() - 0.5) * 1.2, s: 1.25 + 0.3 * R() }); return a; })();
const CATCH = [58, 49, 67, 40, 76, 59, 31, 85, 50, 68].map((i, k) => ({ i, t: tHit + 0.33 * k }));
const HERO = AB[CATCH[0].i];
const massAt = (t: number) => clamp01((t - tHit) / 3.2);
const shearPhase = (t: number) => { const x = Math.max(0, t - tHit), M = x < 3.2 ? (x * x) / 6.4 : 1.6 + (x - 3.2); return 2 * PI * 4 * ((t - tVib) - 0.5 * M); };

const camAt = makeCam([
  { t: 0, s: hold(0, [5, -2, 36], [0, 0, 0], { roll: 0.03 }, 0.0022) },
  { t: tAI, s: hold(tAI, [0, 0, 42], [0, 0, 0], { fov: 44 }, 0.001) },
  { t: tFind, s: hold(tFind, [-3.4, 0.8, 17], SPOT, { fov: 38, roll: -0.04 }, 0.003) },
  { t: tLab, s: hold(tLab, [11, 11, 46], [0, 6, 0], { fov: 40 }, 0.0025) },
  { t: tSens + 0.6, dur: 50, s: hold(tSens, [6, 8.5, 27], [0, 6.5, 0], { roll: -0.02 }) },
  { t: tImag + 0.5, dur: 40, s: hold(tImag, [2.6, 7.6, 13.5], CRY, { fov: 38, roll: 0.03 }) },
  { t: tCrys, s: hold(tCrys, [-9.5, 8.2, 9.5], [0, 7, 0], { fov: 36, roll: -0.035 }) },
  { t: tGold + 0.4, dur: 36, s: hold(tGold, [1.6, 7.4, 11.5], CRY, { fov: 36, roll: 0.03 }, 0.003) },
  { t: tSurf, s: hold(tSurf, [6.5, 5, 17], [0, 1.6, 0], { fov: 40, roll: 0.03 }) },
  { t: tVib + 0.2, dur: 32, s: hold(tVib, [0, 9.5, 27], [0, 4.2, 0], { fov: 42 }, 0.001) },
  { t: tMark, s: hold(tMark, [-9, 12, 21], [0, 2.5, 0], { fov: 42, roll: -0.03 }) },
  { t: tHit + 0.5, dur: 28, s: hold(tHit, [HERO.x + 3.4, 3.8, HERO.z + 8.5], [HERO.x, 2.3, HERO.z], { fov: 38, roll: 0.04 }) },
  { t: tMicro + 0.3, dur: 44, s: hold(tMicro, [0, 8.5, 29], [0, 5, 0], { fov: 42 }, 0.0012) },
  { t: tNano + 0.2, dur: 28, s: hold(tNano, [HERO.x + 2.6, 3.4, HERO.z + 7], [HERO.x, 2.4, HERO.z], { fov: 36, roll: -0.04 }, 0.003) },
], [[tFind + 1.1, 1.0], [tBio, 0.9], [tOro, 0.6], [tVib, 0.7], [tHit, 0.7], [tSlow, 0.9], [tNano + 0.4, 1.3]]);
const dof = makeDof([
  { t: 0, cInf: 0 }, { t: tFind, cInf: 11 }, { t: tLab, cInf: 9, focus: () => [0, 7, 0] }, { t: tCrys, cInf: 13 }, { t: tSurf, cInf: 12, focus: () => [0, 1.6, 0] },
  { t: tVib + 0.2, dur: 32, cInf: 4, focus: () => [0, 3, 0] }, { t: tMark, cInf: 5 }, { t: tHit + 0.5, dur: 28, cInf: 13 }, { t: tMicro + 0.3, dur: 44, cInf: 4, focus: () => [0, 3, 0] }, { t: tNano + 0.2, dur: 28, cInf: 14 },
]);

const hudText: React.CSSProperties = { position: "absolute", left: 0, right: 0, textAlign: "center", color: "#dff6ff", fontFamily: "Consolas, 'Courier New', monospace", textShadow: "0 0 24px #35d6ff, 0 0 6px #35d6ff" };
export const escena4: SceneDef = {
  total: TOTAL4, dof, bloom: 0.8,
  ink: (f) => (f / FPS < tLab ? { color: "#bfeaff", strength: 0.95 } : { color: "#030303", strength: 1 }),
  overlays: (f) => { const t = f / FPS; return [{ c: "#06182e", o: pulse(t, tAI, 0.08) }, { c: "#ffffff", o: 0.9 * pulse(t, tLab, 0.12) }, { c: "#ffd75a", o: pulse(t, tSurf, 0.13) }]; },
  hud: (f) => {
    const t = f / FPS, pct = 99.9 * smooth((t - tCount) / 2.4), aP = clamp01((t - tCount + 0.2) * 4) * clamp01((tFind + 2.6 - t) * 3) * (t < tLab ? 1 : 0);
    const aE = clamp01((t - tMicro) * 1.6) * clamp01((tNano + 0.2 - t) * 2);
    return (
      <AbsoluteFill>
        {aP > 0 && <div style={{ ...hudText, top: 1390, opacity: aP }}>
          <div style={{ fontSize: 168, fontWeight: 700, letterSpacing: 2 }}>{pct.toFixed(1)}%</div>
          <div style={{ fontSize: 46, letterSpacing: 14, marginTop: 6 }}>DE PRECISIÓN</div>
        </div>}
        {aE > 0 && <div style={{ ...hudText, top: 250 + 14 * Math.sin(t * 1.3), opacity: aE, fontFamily: "'Cambria Math', Cambria, Georgia, serif", fontStyle: "italic", fontSize: 76, color: "#3a2a00", textShadow: "0 0 18px #fff6c8, 0 0 40px #fff6c8", transform: `rotate(${-2 + 1.2 * Math.sin(t * 0.9)}deg)` }}>
          Δf = −&nbsp;<span style={{ display: "inline-block", verticalAlign: "middle", textAlign: "center", fontSize: 60 }}><span style={{ display: "block", borderBottom: "4px solid #3a2a00", padding: "0 14px" }}>2 f₀² Δm</span><span style={{ display: "block" }}>A √(ρ μ)</span></span>
        </div>}
      </AbsoluteFill>
    );
  },
  make: () => {
    const root = new THREE.Group(), rig = new Rig(root), dust = new Dust(120, 49);
    const R = rng(17), box = new THREE.BoxGeometry(1, 1, 1), steel = toon("#1d4f86");
    const hdr = (c: string, k = 1.6) => new THREE.MeshBasicMaterial({ color: C(c).multiplyScalar(k) });
    const nn = <M extends THREE.Object3D>(m: M) => { m.layers.set(NOINK); return m; };
    // ---- 0-2: mastografías e IA ----
    const A = new THREE.Group();
    const plate = (withMass: boolean) => {
      const g = new THREE.Group();
      g.add(mesh(box, toon("#0a1626"), [0, 0, -0.3], [15, 21, 0.5]), mesh(box, steel, [0, 0, -0.6], [16.4, 22.4, 0.5]), mesh(new THREE.SphereGeometry(1, 36, 20, PI / 2, PI), toon("#5f7d96"), [-7.3, 0, 0], [8.6, 9.2, 0.45]));
      for (let i = 0; i < 9; i++) g.add(mesh(SPHERE, toon("#8ba6ba"), [-6.4 + R() * 5.6, -6 + R() * 12, 0.4], [0.6 + 1.3 * R(), 0.5 + 1.1 * R(), 0.1], [0, 0, R() * 3]));
      if (withMass) g.add(mesh(SPHERE, toon("#b9cddb"), SPOT, [0.36, 0.3, 0.12]));
      return g;
    };
    const plates = Array.from({ length: 7 }, (_, i) => { const p = plate(i === 0); A.add(p); return p; });
    const cyan = hdr("#35d6ff"), lineGeo = box;
    const gridV = Array.from({ length: 9 }, (_, i) => nn(mesh(lineGeo, cyan, [-7 + i * 1.75, 0, 0.9], [0.07, 1, 0.05])));
    const gridH = Array.from({ length: 13 }, (_, i) => nn(mesh(lineGeo, cyan, [0, 10 - i * 1.667, 0.9], [14, 0.07, 0.05])));
    const bar = nn(mesh(lineGeo, hdr("#bff4ff", 2.2), [0, 0, 1], [15, 0.28, 0.08]));
    const frameMat = hdr("#35d6ff"), frame = new THREE.Group();
    for (let i = 0; i < 4; i++) frame.add(nn(mesh(lineGeo, frameMat)));
    /** marco de semiancho sx, semialto sy y grosor th */
    const setFrame = (sx: number, sy: number, th: number) => frame.children.forEach((c, i) => {
      if (i < 2) { c.position.set(0, i ? -sy : sy, 0); c.scale.set(2 * sx + th, th, 0.06); } else { c.position.set(i === 2 ? sx : -sx, 0, 0); c.scale.set(th, 2 * sy + th, 0.06); }
    });
    A.add(...gridV, ...gridH, bar, frame);
    // ---- 3: laboratorio, cristal de cuarzo con electrodo de oro ----
    const L = new THREE.Group(), gold = toon("#f3c33a", { emissive: C("#ffb000"), emissiveIntensity: 0.12 }), glass = (c: string, o: number) => toon(c, { transparent: true, opacity: o });
    L.add(mesh(box, toon("#eef3f6"), [0, -0.5, -10], [160, 1, 90]), mesh(box, toon("#b9d6e0"), [0, 30, -52], [200, 80, 1]));
    L.add(mesh(new THREE.CylinderGeometry(5, 5.4, 1.4, 36), toon("#3a4652"), [0, 0.7, 0]), mesh(new THREE.CylinderGeometry(0.2, 0.2, 6.4, 10), toon("#cfd8de"), [-3.3, 4.4, 0]), mesh(new THREE.CylinderGeometry(0.2, 0.2, 6.4, 10), toon("#cfd8de"), [3.3, 4.4, 0]));
    L.add(mesh(new THREE.CylinderGeometry(4.3, 4.3, 0.36, 48).rotateX(PI / 2), glass("#dff3ff", 0.72), [0, 7, 0]));
    const elec = mesh(new THREE.CylinderGeometry(2.5, 2.5, 0.12, 40).rotateX(PI / 2), gold, [0, 7, 0.24]);
    L.add(elec, mesh(box, gold, [1.9, 5.4, 0.24], [0.7, 3.6, 0.1], [0, 0, 0.75]), mesh(new THREE.CylinderGeometry(2.5, 2.5, 0.12, 40).rotateX(PI / 2), gold, [0, 7, -0.24]));
    for (const [x, z, c] of [[-17, -12, "#39c6b3"], [19, -16, "#6fb1ff"], [-27, -24, "#ffb35a"]] as [number, number, string][]) {
      L.add(mesh(SPHERE, glass("#e8f7ff", 0.55), [x, 4.4, z], 4.6), mesh(SPHERE, toon(c), [x, 3.2, z], [4.1, 2.9, 4.1]), mesh(new THREE.CylinderGeometry(1.2, 1.4, 6, 20), glass("#e8f7ff", 0.55), [x, 10.6, z]));
    }
    for (let i = 0; i < 5; i++) L.add(mesh(new THREE.CylinderGeometry(0.9, 0.9, 8, 14), glass(["#ff8fa3", "#8fd1ff", "#b5f2a6", "#ffd98f", "#c9a6ff"][i], 0.8), [14 + i * 2.6, 4, 3 - i * 0.4]));
    L.add(mesh(box, toon("#8fa3b0"), [19.2, 1, 2.2], [15, 2, 4]));
    // ---- 4: superficie de oro con anticuerpos ----
    const G = new THREE.Group(), plateG = new THREE.Group();
    plateG.add(mesh(box, gold, [0, -0.5, 0], [260, 1, 260]));
    const abs = inst(Y_GEO, toon("#1f9fc4"), AB.length), marks = inst(new THREE.IcosahedronGeometry(0.62, 0), toon("#5a2560"), CATCH.length), cores = inst(BALL, glow("#ff3b30", 0.8), CATCH.length);
    plateG.add(abs);
    const rbc = inst(new THREE.SphereGeometry(1, 20, 12), toon("#ee4a42"), 16);
    const NW = 96, wave = nn(inst(BALL, new THREE.MeshBasicMaterial({ color: "#ffffff" }), NW));
    G.add(plateG, marks, cores, rbc, wave);
    root.add(A, L, G, dust.mesh);

    return {
      root,
      update: (f, cam, scene) => {
        const t = f / FPS, place = cutIndex(CUTS, t);
        A.visible = place < 3; L.visible = place === 3; G.visible = place === 4;
        const look = rig.apply(scene, cam, camAt(f), place < 3 ? NIGHT : place === 3 ? LAB : GOLD);
        if (place < 3) {
          // desfile de placas: aceleran mientras la IA las analiza; en el plano de detección la placa 0 queda centrada
          const run = place === 1 ? 46 * Math.max(0, t - tRun) ** 1.6 : 0, span = 7 * 19;
          plates.forEach((p, i) => { const x = place === 1 ? ((((i * 19 - run) % span) + span * 1.5) % span) - span / 2 : i * 60; p.position.set(x, 0, 0); p.visible = place === 1 ? Math.abs(x) < 60 : i === 0; });
          const by = lerp(10.4, -10.4, ramp(t, 1.4, 3.6)), g0 = place === 0;
          bar.visible = g0 && t > 1.3 && t < 5.2; bar.position.y = by;
          gridH.forEach((m) => { m.visible = g0 && m.position.y > by; });
          gridV.forEach((m) => { const len = 10 - by; m.visible = g0 && len > 0.2; m.scale.y = len; m.position.y = 10 - len / 2; });
          cyan.color.set("#35d6ff").multiplyScalar(1.1 + 0.5 * pulse(t, 5.2, 0.5));
          frame.visible = place > 0;
          if (place === 1) { frame.position.set(0, 0, 1); setFrame(7.9, 10.9, 0.22); frameMat.color.set("#35d6ff").multiplyScalar(1.3 + 0.7 * Math.abs(Math.sin(run * 0.165))); }
          if (place === 2) {
            const k = ramp(t, tFind + 0.15, 0.8), alert = ramp(t, tFind + 1.1, 0.25);
            frame.position.set(...SPOT).setZ(0.9); const fs = lerp(7, 0.85, k) * (1 + 0.08 * alert * Math.sin(t * 12)); setFrame(fs, fs, 0.09); frame.rotation.z = (1 - k) * 0.8;
            frameMat.color.set("#35d6ff").lerp(COL.set("#ff6a2a"), alert).multiplyScalar(1.7);
          } else frame.rotation.z = 0;
          dust.pose(t, [0, 0, 8], [34, 44, 8], 0.6, "#6fb6ff");
        } else if (place === 3) {
          gold.emissiveIntensity = 0.12 + 0.9 * pulse(t, tBio + 0.15, 0.3) + 0.9 * pulse(t, tOro + 0.2, 0.35);
          dust.pose(t, [0, 8, 6], [40, 30, 16], 0.5, "#ffffff");
        } else {
          gold.emissiveIntensity = 0.12;
          const sh = t > tVib ? 0.32 * ramp(t, tVib, 0.5) * Math.sin(shearPhase(t)) : 0, m = massAt(t);
          plateG.position.x = sh;
          const bend: Record<number, number> = {};
          CATCH.forEach((c) => { bend[c.i] = pulse(t, c.t + 0.05, 0.16); });
          AB.forEach((a, i) => {
            const e = easeOutBack((t - tAnc - 0.012 * ((i * 37) % 100)) / 0.45);
            setM(abs, i, a.x, 0, a.z, a.s * e, a.s * e * (1 - 0.18 * (bend[i] ?? 0)), a.s * e, 0, a.ry, 0.06 * Math.sin(t * 2 + i));
          });
          CATCH.forEach((c, k) => {
            const a = AB[c.i], u = clamp01((t - (c.t - 1.9)) / 1.9), on = t > tMark - 0.2;
            const tip: V3 = [a.x + sh, 1.78 * a.s, a.z], y = lerp(17 + 1.5 * k, tip[1], u * u), x = tip[0] + (1 - u) * (3 * Math.sin(k * 2.3) + 0.8 * Math.sin(t * 2 + k)), z = tip[2] + (1 - u) * 2.5 * Math.cos(k * 1.7);
            const s = on ? 1 + 0.25 * pulse(t, c.t + 0.08, 0.15) : 0;
            setM(marks, k, x, y, z, s, s, s, t * (1 - u) * 2, k, t * (1 - u) * 1.3); setM(cores, k, x, y, z, 0.3 * s * (1 + 0.15 * Math.sin(t * 9 + k)));
          });
          for (let i = 0; i < 16; i++) {
            const u = ramp(t, tMark + 0.1 * i, 3), y = lerp(22 + (i % 5) * 2, 6.5 + (i % 4) * 1.6, u) + 0.4 * Math.sin(t * 1.3 + i);
            setM(rbc, i, -14 + ((i * 7.3) % 28) + Math.sin(t * 0.6 + i), t > tMark ? y - 2.2 : 60, -15 + ((i * 4.7) % 10), 0.9, 0.9, 0.3, t * 0.5 + i, i, 0);
          }
          // la onda acústica: se alarga y se frena al aumentar la masa
          const ph = shearPhase(t), k = lerp(1.7, 0.75, m), amp = 1.25 * ramp(t, tVib, 0.6), al = t > tRev ? 0.5 + 0.5 * Math.sin(t * 10) : 0;
          for (let i = 0; i < NW; i++) { const x = -13.5 + i * 0.285; setM(wave, i, x, 10 + amp * Math.sin(k * x - ph), -6, t > tVib ? 0.22 : 0); }
          (wave.material as THREE.MeshBasicMaterial).color.set("#35d6ff").lerp(COL.set("#ff8a2a"), m).lerp(COL.set("#ff3b30"), 0.6 * al).multiplyScalar(1.7);
          flush(abs, marks, cores, rbc, wave);
          dust.pose(t, [0, 7, 0], [40, 16, 30], 0.5, "#fff7d6");
        }
        return look;
      },
    };
  },
};
