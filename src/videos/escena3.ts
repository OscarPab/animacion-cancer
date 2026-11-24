// Escena 3 "La defensa actual": estética de rayos X (fondo azul noche, líneas de tinta cian). Mastógrafo que
// comprime un busto esquemático y dispara rayos X, pantalla radiológica con una masa estelar y calcificaciones,
// y la sonda de ultrasonido cuyas ondas de arco iris distinguen un quiste líquido de un tumor sólido.
import * as THREE from "three";
import words from "../../voice/escena3/words.json";
import lines from "../../voice/escena3/lines.json";
import { SceneDef } from "../shared/Stage";
import { BALL, C, COL, Dust, FPS, Look, PI, Rig, SPHERE, V3, clamp01, cutIndex, flush, glow, hold, inst, lerp, makeCam, makeDof, mesh, pulse, ramp, rng, setM, toon, voice } from "../shared/kit";
import { NOINK } from "./escena1/ink";

const T = voice(words);
export const TOTAL3 = Math.ceil((lines.end + 2.2) * FPS);
const tMasto = T("mastografia"), tRay = T("rayos"), tScreen = T("para") - 0.05, tUS = T("y") - 0.1, tTouch = T("ultrasonido"), tWave = T("ondas"), tMap = T("dibujan"),
  tCyst = T("quiste"), tTum = T("tumor"), tBio = T("biopsia");
const FLASH = [tRay, tRay + 0.4, tRay + 0.8];
const CUTS = [0, tScreen, tUS];
const NIGHT: Look = { bg: "#06182e", fog: [40, 160], sky: "#a9d6ff", ground: "#0a1c36", sun: 0.9, hemi: 0.42 };
const MASS: V3 = [-2.6, 1.6, 0.6], CYST: V3 = [-5.6, -7, 0], TUM: V3 = [5.6, -8, 0], TIP: V3 = [0, 7.6, 0];

const camAt = makeCam([
  { t: 0, s: hold(0, [17, 2, 36], [0, -1, 0], { fov: 40, roll: -0.02 }, 0.0025) },
  { t: tMasto, s: hold(tMasto, [10, -0.5, 17], [0, -2.4, 1.5], { fov: 38, roll: 0.035 }) },
  { t: tRay, s: hold(tRay, [-9, -4, 19], [0, 1.2, 1], { fov: 42, roll: -0.045 }) },
  { t: tScreen, s: hold(tScreen, [1.5, 0.5, 36], [0, 0, 0], { fov: 40 }, 0.003) },
  { t: T("antes") + 0.2, dur: 34, s: hold(T("antes"), [-1.6, 1.2, 17], MASS, { fov: 38, roll: 0.04 }) },
  { t: tUS, s: hold(tUS, [3, 4, 42], [0, 2, 0], { fov: 40, roll: -0.02 }) },
  { t: tWave + 1.2, dur: 40, s: hold(tWave, [-1, -2, 40], [0, -2.5, 0], { fov: 40, roll: 0.02 }, 0.0015) },
  { t: tCyst, dur: 30, s: hold(tCyst, [-4.4, -5.5, 17], CYST, { fov: 38, roll: 0.04 }) },
  { t: tTum, dur: 28, s: hold(tTum, [4.6, -6.5, 17], TUM, { fov: 38, roll: -0.04 }) },
], [...FLASH.map((t) => [t, 0.8] as [number, number]), [tTouch, 0.5], [tTum + 0.2, 1.1]]);
const dof = makeDof([
  { t: 0, cInf: 6, focus: () => [0, -2, 1] }, { t: tMasto, cInf: 12, focus: () => [0, -2.4, 1.5] }, { t: tRay, cInf: 7 },
  { t: tScreen, cInf: 0 }, { t: T("antes") + 0.2, dur: 34, cInf: 10 }, { t: tUS, cInf: 0 }, { t: tCyst, dur: 30, cInf: 11 },
]);

export const escena3: SceneDef = {
  total: TOTAL3, dof, bloom: 0.9,
  ink: { color: "#bfeaff", strength: 0.95 },
  overlays: (f) => { const t = f / FPS; return [{ c: "#dff4ff", o: 0.55 * Math.max(...FLASH.map((x) => (t >= x ? clamp01(1 - (t - x) * 9) : 0))) }, { c: "#06182e", o: Math.max(pulse(t, tScreen, 0.1), pulse(t, tUS, 0.12)) }]; },
  make: () => {
    const root = new THREE.Group(), rig = new Rig(root), dust = new Dust(110, 47);
    const R = rng(13), steel = toon("#1d4f86"), steel2 = toon("#2c6aa6"), box = new THREE.BoxGeometry(1, 1, 1);
    // ---- 0: mastógrafo ----
    const A = new THREE.Group();
    A.add(mesh(box, steel, [0, -12.5, -2], [10, 1.2, 12]), mesh(box, steel, [0, -1, -6], [3.2, 23, 3.2]), mesh(box, steel2, [0, 9.5, -0.5], [5, 4, 8]),
      mesh(new THREE.CylinderGeometry(1.6, 2.2, 1.6, 20), steel2, [0, 7, 1.5]), mesh(box, steel2, [0, -4.4, 0.5], [9.5, 1.3, 9]), mesh(box, steel, [0, -4.4, -4.5], [3, 2.4, 2]));
    const paddle = mesh(box, toon("#8fd8ff", { transparent: true, opacity: 0.5 }), [0, 3, 1.2], [8.2, 0.4, 7.2]);
    const padArm = mesh(box, steel, [0, 3, -3.6], [2.4, 1.2, 2.6]);
    const bust = mesh(new THREE.SphereGeometry(1, 36, 20, 0, 2 * PI, 0, PI / 2), toon("#7fd0ff", { transparent: true, opacity: 0.42, side: THREE.DoubleSide }), [0, -3.75, 1.4]);
    const inner = inst(BALL, glow("#d6f1ff", 0.5), 10); // tejido que revela la radiografía
    const beam = mesh(new THREE.ConeGeometry(4.6, 10.4, 28, 1, true), new THREE.MeshBasicMaterial({ color: "#dff6ff", transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }), [0, 1.2, 1.5]);
    A.add(paddle, padArm, bust, inner, beam);
    // ---- 1: pantalla radiológica ----
    const B = new THREE.Group();
    B.add(mesh(box, toon("#0a1626"), [0, 0, -0.6], [17, 25, 1]), mesh(box, steel, [0, 0, -0.9], [19, 27, 1]), mesh(box, steel, [0, -17, -2], [4, 8, 2]), mesh(box, steel, [0, -21, -1], [12, 1, 7]));
    B.add(mesh(new THREE.SphereGeometry(1, 40, 24, PI / 2, PI), toon("#5f7d96"), [-8.3, 0, 0], [9.6, 10.5, 0.5])); // silueta en la mastografía
    const fib = inst(SPHERE, toon("#8ba6ba"), 14);
    for (let i = 0; i < 14; i++) setM(fib, i, -7 + R() * 6.5, -6.5 + R() * 13, 0.42, 0.7 + 1.5 * R(), 0.5 + 1.2 * R(), 0.12, 0, 0, R() * 3);
    const star = new THREE.Group(), white = glow("#ffffff", 0.45);
    star.add(mesh(SPHERE, white, [0, 0, 0], [0.75, 0.75, 0.3]));
    for (let i = 0; i < 13; i++) { const a = (i / 13) * 2 * PI + 0.3 * R(), L = 1.1 + 1.3 * R(); star.add(mesh(new THREE.ConeGeometry(0.16, L, 6).translate(0, L / 2 + 0.5, 0), white, [0, 0, 0], [1, 1, 0.5], [0, 0, a])); }
    star.position.set(...MASS);
    const calc = inst(BALL, white, 9);
    for (let i = 0; i < 9; i++) setM(calc, i, -4.6 + 1.4 * R(), -3.2 + 1.6 * R(), 0.6, 0.09 + 0.08 * R());
    const ring = mesh(new THREE.TorusGeometry(1, 0.05, 8, 60), new THREE.MeshBasicMaterial({ color: C("#4fe3ff").multiplyScalar(1.6) }), MASS);
    ring.layers.set(NOINK);
    B.add(fib, star, calc, ring);
    // ---- 2: ultrasonido ----
    const U = new THREE.Group();
    for (let i = 0; i < 4; i++) U.add(mesh(box, toon(["#0d2c52", "#0b2545", "#0e3058", "#0a2140"][i]), [0, 4.2 - i * 7.2, -4], [70, 7.2, 1])); // capas de tejido
    U.add(mesh(box, toon("#3f7fb8"), [0, 7.1, -1], [70, 0.7, 7])); // piel
    const probe = new THREE.Group();
    probe.add(mesh(box, toon("#dfeaf2"), [0, 4.2, 0], [5.2, 6.5, 2.6]), mesh(new THREE.CylinderGeometry(2.6, 2.6, 2.6, 24, 1, false, 0, PI).rotateX(PI / 2).rotateZ(PI), toon("#9fd2f5"), [0, 1, 0], [1, 0.45, 1]),
      mesh(new THREE.CylinderGeometry(0.5, 0.5, 30, 10), steel2, [0, 22, 0]));
    const cystMat = toon("#0b2a4d"), tumMat = toon("#0b2a4d");
    const cyst = mesh(new THREE.SphereGeometry(3.2, 36, 24), cystMat, CYST), cystIn = mesh(new THREE.SphereGeometry(2.5, 30, 20), toon("#06182e"), [CYST[0], CYST[1], 1.2], [1, 1, 0.4]);
    const tum = inst(BALL, tumMat, 11);
    for (let i = 0; i < 11; i++) { const a = R() * 6.28, d = i ? 1.3 + 1.2 * R() : 0; setM(tum, i, TUM[0] + d * Math.cos(a), TUM[1] + d * Math.sin(a) * 0.9, (R() - 0.5) * 1.5, i ? 1.0 + 0.9 * R() : 2.1); }
    const NA = 16, arcGeo = new THREE.TorusGeometry(1, 0.02, 6, 60, PI * 0.56).rotateZ(PI * 1.22);
    const arcs = Array.from({ length: NA }, () => { const m = mesh(arcGeo, new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false })); m.layers.set(NOINK); U.add(m); return m; });
    const echoGeo = new THREE.TorusGeometry(1, 0.03, 6, 40, PI * 0.5).rotateZ(PI * 0.25);
    const echoes = Array.from({ length: 6 }, () => { const m = mesh(echoGeo, new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false }), TUM); m.layers.set(NOINK); U.add(m); return m; });
    const needle = mesh(new THREE.CylinderGeometry(0.09, 0.09, 16, 8).translate(0, 8, 0), toon("#e8f2f8"), TUM, 1, [0, 0, -0.75]);
    U.add(probe, cyst, cystIn, tum, needle);
    root.add(A, B, U, dust.mesh);

    return {
      root,
      update: (f, cam, scene) => {
        const t = f / FPS, place = cutIndex(CUTS, t);
        A.visible = place === 0; B.visible = place === 1; U.visible = place === 2;
        const look = rig.apply(scene, cam, camAt(f), NIGHT);
        if (place === 0) {
          const k = ramp(t, tMasto + 0.2, 1.7), y = lerp(3, -1.75, k), h = lerp(2.7, 1.75, k), w = lerp(3.3, 4.0, k);
          paddle.position.y = y; padArm.position.y = y;
          bust.scale.set(w, h, w * 0.95);
          const fl = Math.max(...FLASH.map((x) => (t >= x ? clamp01(1 - (t - x) * 5) : 0)));
          (beam.material as THREE.MeshBasicMaterial).opacity = 0.5 * fl;
          (inner.material as THREE.MeshToonMaterial).emissiveIntensity = 0.15 + 1.3 * fl;
          for (let i = 0; i < 10; i++) { const a = i * 2.4, d = 0.25 + 0.5 * ((i * 37) % 10) / 10; setM(inner, i, w * d * Math.cos(a), -3.6 + h * (0.2 + 0.45 * ((i * 53) % 10) / 10), 1.4 + w * d * Math.sin(a) * 0.9, i === 3 ? 0.36 : 0.16 + 0.03 * (i % 4)); }
          flush(inner);
          dust.pose(t, [0, 0, 6], [40, 50, 14], 0.8, "#6fb6ff");
        } else if (place === 1) {
          const k = ramp(t, T("anomalias") - 0.1, 0.9);
          ring.scale.setScalar(lerp(9, 2.6, k) * (1 + 0.06 * Math.sin(t * 10) * k)); ring.rotation.z = t * 1.5;
          white.emissiveIntensity = 0.4 + 0.25 * Math.sin(t * 6) * k;
          star.scale.setScalar(1 + 0.05 * Math.sin(t * 6));
          dust.pose(t, [0, 0, 8], [30, 40, 8], 0.6, "#6fb6ff");
        } else {
          probe.position.y = lerp(22, 7.4, ramp(t, tUS + 0.3, tTouch - tUS - 0.3)) + 0.12 * Math.sin(t * 2.2) * ramp(t, tTouch, 0.5);
          probe.rotation.z = 0.06 * Math.sin(t * 0.9);
          // ondas de arco iris que bajan desde la sonda
          arcs.forEach((m, i) => {
            const age = t - tWave - i * 0.42 + 0.42 * NA * Math.floor(Math.max(0, t - tWave - i * 0.42) / (0.42 * NA)) * -1, r = 8.5 * Math.max(0, age);
            const on = t > tWave + i * 0.42 && r < 34 && t < tBio + 3;
            m.visible = on; if (!on) return;
            m.position.set(...TIP); m.scale.setScalar(Math.max(0.1, r));
            const mat = m.material as THREE.MeshBasicMaterial; mat.color.setHSL((i * 0.11) % 1, 1, 0.6).multiplyScalar(1.5); mat.opacity = clamp01(1.2 - r / 34) * clamp01(r / 2);
          });
          // la masa sólida devuelve ecos; el quiste líquido deja pasar el sonido
          const reveal = ramp(t, tWave + 1.5, 2.2), cy = pulse(t, tCyst + 0.5, 0.7), tu = pulse(t, tTum + 0.5, 0.7);
          echoes.forEach((m, i) => {
            const age = ((t - tWave - 2 - i * 0.5) % 3 + 3) % 3, on = t > tWave + 2 + i * 0.5;
            m.visible = on; m.scale.setScalar(2.5 + 6 * age);
            const mat = m.material as THREE.MeshBasicMaterial; mat.color.set("#ffffff").multiplyScalar(1.4); mat.opacity = on ? clamp01(1 - age / 2.2) * 0.9 : 0;
          });
          cystMat.color.set("#0b2a4d").lerp(COL.set("#2f7fd0"), reveal).lerp(COL.set("#39e6a5"), 0.7 * cy);
          cyst.scale.setScalar(1 + 0.05 * cy);
          tumMat.color.set("#0b2a4d").lerp(COL.set("#d5dee6"), reveal).lerp(COL.set("#ff5a48"), 0.75 * tu);
          needle.visible = t > tBio - 0.4;
          needle.position.set(TUM[0] + 1.0, TUM[1] + 1.0, 0.6).add(new THREE.Vector3(Math.sin(0.75), Math.cos(0.75), 0).multiplyScalar(14 * (1 - ramp(t, tBio - 0.4, 0.9))));
          dust.pose(t, [0, 0, 6], [44, 50, 8], 0.6, "#6fb6ff");
        }
        return look;
      },
    };
  },
};
