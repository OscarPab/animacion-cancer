// Escena 6 "Una alianza multidisciplinaria": pantalla dividida en tres pisos (bióloga al microscopio, físico con el
// oscilador de cristal de oro, radiólogo con IA) que se funden en una imagen cálida: la paciente sale de la clínica
// y abraza a su familia a la luz del sol.
import * as THREE from "three";
import words from "../../voice/escena6/words.json";
import lines from "../../voice/escena6/lines.json";
import { SceneDef } from "../shared/Stage";
import { BALL, C, Dust, FPS, Look, PI, Rig, SPHERE, V3, clamp01, cutIndex, hold, inst, lerp, makeCam, makeDof, mesh, pulse, ramp, setM, smooth, toon, glow, voice } from "../shared/kit";
import { NOINK } from "./escena1/ink";

const T = voice(words);
export const TOTAL6 = Math.ceil((lines.end + 3.6) * FPS);
const tFis = T("fisica"), tAcu = T("acustica"), tIA = T("inteligencia"), tBio = T("biotecnologia"), tSync = T("trabajan"), tOut = T("la", 5) - 0.15, tDet = T("detectable"),
  tCur = T("curable"), tInv = T("investigacion"), tFut = T("futuro"), tFav = T("favor");
const CUTS = [0, tOut];
const ROOMS = [13, 0, -13]; // bióloga, físico, radiólogo
const INDOOR: Look = { bg: "#243447", fog: [80, 260], sky: "#ffffff", ground: "#8a9099", hemi: 0.55 };
const OUT: Look = { bg: "#ffd596", fog: [70, 330], sky: "#fff0cf", ground: "#c9a860", sun: 1.05, hemi: 0.5 };
const HUG: V3 = [0, 4, 10.4], tArr = tCur - 0.5;
const room = (i: number, t0: number, x = 1.5, roll = 0.03) => hold(t0, [x, ROOMS[i] - 1.2, 25], [0, ROOMS[i] - 1.8, 0], { fov: 38, roll }, 0.0025);

const camAt = makeCam([
  { t: 0, s: hold(0, [0, 0, 66], [0, 0, 0], { fov: 40 }, 0.0016) },
  { t: tFis, dur: 30, s: room(1, tFis) },
  { t: tAcu + 0.3, dur: 26, s: hold(tAcu, [3.4, -3.2, 13], [2.6, -3.1, 1], { fov: 36, roll: -0.03 }) },
  { t: tIA + 0.2, dur: 30, s: room(2, tIA, -1.5, -0.03) },
  { t: tBio + 0.1, dur: 30, s: room(0, tBio, 1.5, 0.03) },
  { t: tSync + 0.5, dur: 44, s: hold(tSync, [0, 0, 60], [0, 0, 0], { fov: 40 }, 0.001) },
  { t: tOut, s: hold(tOut, [26, 6, 17], [0, 4.6, 4], { fov: 42, roll: -0.02 }, 0.0012) },
  { t: tDet + 0.6, dur: 50, s: hold(tDet, [18, 5, 13.5], [0, 3.9, 9.6], { fov: 38, roll: 0.02 }, 0.001) },
  { t: tInv, dur: 36, s: hold(tInv, [11, 4.8, 12], HUG, { fov: 36, roll: 0.03 }, 0.0015) },
  { t: tFut + 0.8, dur: 90, s: (f) => { const u = smooth((f / FPS - tFut) / 5); return { pos: [lerp(11, 6, u), lerp(4.8, 15, u), lerp(12, 40, u)], look: [lerp(0, -8, u), lerp(4, 20, u), lerp(10, -30, u)], fov: 42 }; } },
], [[tSync + 1.0, 0.7], [tArr + 0.55, 0.6]]);
const dof = makeDof([{ t: 0, cInf: 0 }, { t: tAcu + 0.3, dur: 26, cInf: 10 }, { t: tIA + 0.2, dur: 30, cInf: 3 }, { t: tOut, cInf: 7, focus: () => HUG }, { t: tInv, dur: 36, cInf: 13, focus: () => HUG }, { t: tFut + 0.8, dur: 90, cInf: 3 }]);

type Fig = { g: THREE.Group; armL: THREE.Group; armR: THREE.Group; legL: THREE.Group; legR: THREE.Group; head: THREE.Group };
/** personaje sencillo: de pie mide ~6.3 de alto y mira hacia +z */
const figure = (o: { top: string; legs: string; skin: string; hair: string; scarf?: boolean; coat?: boolean }): Fig => {
  const g = new THREE.Group(), skin = toon(o.skin), top = toon(o.top), dark = toon("#241726");
  const limb = (mat: THREE.Material, r: number, len: number, pivot: V3, hand?: THREE.Material) => {
    const p = new THREE.Group(); p.position.set(...pivot);
    p.add(mesh(new THREE.CylinderGeometry(r, r * 0.9, len, 10).translate(0, -len / 2, 0), mat));
    if (hand) p.add(mesh(SPHERE, hand, [0, -len - 0.1, 0], 0.27));
    g.add(p); return p;
  };
  const legL = limb(toon(o.legs), 0.3, 2.3, [-0.4, 2.3, 0]), legR = limb(toon(o.legs), 0.3, 2.3, [0.4, 2.3, 0]);
  g.add(mesh(new THREE.CapsuleGeometry(0.9, o.coat ? 2.1 : 1.6, 6, 18), top, [0, o.coat ? 3.2 : 3.4, 0]));
  const armL = limb(top, 0.22, 1.9, [-1.05, 4.35, 0], skin), armR = limb(top, 0.22, 1.9, [1.05, 4.35, 0], skin);
  const head = new THREE.Group(); head.position.set(0, 5.35, 0);
  head.add(mesh(SPHERE, skin, [0, 0, 0], [0.95, 1.0, 0.95]), mesh(new THREE.SphereGeometry(1.02, 24, 14, 0, 2 * PI, 0, o.scarf ? 1.75 : 1.45), toon(o.hair), [0, 0.06, -0.08], 1, [-0.35, 0, 0]),
    mesh(SPHERE, dark, [-0.33, 0.05, 0.86], 0.105), mesh(SPHERE, dark, [0.33, 0.05, 0.86], 0.105), mesh(new THREE.TorusGeometry(0.24, 0.045, 6, 14, PI), dark, [0, -0.28, 0.87], 1, [0, 0, PI]));
  g.add(head);
  return { g, armL, armR, legL, legR, head };
};
const walk = (p: Fig, ph: number, k: number) => { const s = Math.sin(ph) * k; p.legL.rotation.x = 0.55 * s; p.legR.rotation.x = -0.55 * s; p.armL.rotation.x = -0.45 * s; p.armR.rotation.x = 0.45 * s; };

export const escena6: SceneDef = {
  total: TOTAL6, dof,
  overlays: (f) => { const t = f / FPS; return [{ c: "#fff1d0", o: Math.max(pulse(t, tOut, 0.22), 0.85 * ramp(t, tFav + 1.4, 2.4)) }]; },
  make: () => {
    const root = new THREE.Group(), rig = new Rig(root), dust = new Dust(90, 59), box = new THREE.BoxGeometry(1, 1, 1);
    const hdr = (c: string, k = 1.6) => new THREE.MeshBasicMaterial({ color: C(c).multiplyScalar(k) });
    // ---- 0: tres pisos ----
    const A = new THREE.Group(), walls = ["#3fb8a6", "#f0b35a", "#3e6fb8"], floors = ["#2a8a7c", "#c98a35", "#27508f"];
    const lamps = ROOMS.map((y, i) => {
      A.add(mesh(box, toon(walls[i]), [0, y, -4], [15, 12.2, 0.6]), mesh(box, toon(floors[i]), [0, y - 6, 0], [15, 0.6, 8.6]), mesh(box, toon("#55616e"), [0, y - 3.9, 1.2], [5.2, 3.6, 2.6], [0, 0, 0]));
      const l = mesh(box, glow("#fff6d8", 0.3), [0, y + 5.3, -3], [9, 0.35, 0.5]); A.add(l); return l;
    });
    A.add(mesh(box, toon("#1c2733"), [-7.9, 0, 0], [0.8, 39.6, 8.6]), mesh(box, toon("#1c2733"), [7.9, 0, 0], [0.8, 39.6, 8.6]), mesh(box, toon("#1c2733"), [0, 19.8, 0], [16.6, 0.8, 8.6]));
    const bio = figure({ top: "#ffffff", legs: "#3b4a63", skin: "#e8b48f", hair: "#5a3220", coat: true });
    const phy = figure({ top: "#ffffff", legs: "#2d3748", skin: "#c98d62", hair: "#1d1a22", coat: true });
    const rad = figure({ top: "#2fb7a3", legs: "#1f8f80", skin: "#f0c6a4", hair: "#9aa0a8" });
    [bio, phy, rad].forEach((p, i) => { p.g.position.set(i === 2 ? 3.2 : -3.4, ROOMS[i] - 5.7, 1.4); p.g.rotation.y = i === 2 ? -0.75 : 0.75; A.add(p.g); });
    // microscopio
    const ty = (i: number) => ROOMS[i] - 2.1;
    A.add(mesh(box, toon("#e8eef2"), [0.6, ty(0) + 0.15, 1.4], [1.9, 0.3, 1.4]), mesh(box, toon("#e8eef2"), [1.2, ty(0) + 1.3, 1.4], [0.35, 2.3, 0.4], [0, 0, 0.25]),
      mesh(new THREE.CylinderGeometry(0.26, 0.2, 1.7, 14), toon("#3a4652"), [0.45, ty(0) + 1.7, 1.4], 1, [0, 0, 0.55]), mesh(box, toon("#3a4652"), [0.5, ty(0) + 0.75, 1.4], [1.3, 0.12, 1.1]),
      mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.08, 20), glow("#7fe0ff", 0.5), [0.5, ty(0) + 0.84, 1.4]));
    // oscilador de cristal de oro + osciloscopio
    const gold = toon("#f3c33a", { emissive: C("#ffb000"), emissiveIntensity: 0.15 });
    A.add(mesh(new THREE.CylinderGeometry(0.9, 0.95, 0.3, 24), toon("#3a4652"), [0.2, ty(1) + 0.15, 1.6]), mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.5, 6), toon("#cfd8de"), [-0.4, ty(1) + 1, 1.6]), mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.5, 6), toon("#cfd8de"), [0.8, ty(1) + 1, 1.6]),
      mesh(new THREE.CylinderGeometry(0.85, 0.85, 0.08, 30).rotateX(PI / 2), toon("#dff3ff", { transparent: true, opacity: 0.75 }), [0.2, ty(1) + 1.55, 1.6]), mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.05, 24).rotateX(PI / 2), gold, [0.2, ty(1) + 1.55, 1.68]),
      mesh(box, toon("#2b3440"), [2.6, ty(1) + 1.0, 1.2], [2.3, 1.9, 1.3]), mesh(box, toon("#0c2a1c"), [2.6, ty(1) + 1.05, 1.87], [1.9, 1.4, 0.05]));
    const wave = inst(BALL, hdr("#5cff9a", 1.5), 22); wave.layers.set(NOINK); A.add(wave);
    // monitor con mastografía + IA
    A.add(mesh(box, toon("#2b3440"), [-0.6, ty(2) + 1.7, 1.3], [3.6, 2.7, 0.3]), mesh(box, toon("#0a1626"), [-0.6, ty(2) + 1.7, 1.47], [3.2, 2.3, 0.05]), mesh(box, toon("#2b3440"), [-0.6, ty(2) + 0.25, 1.3], [0.5, 0.6, 0.3]),
      mesh(new THREE.SphereGeometry(1, 24, 14, PI / 2, PI), toon("#8ba6ba"), [-2.15, ty(2) + 1.7, 1.5], [1.7, 1.05, 0.06]));
    const aiMat = hdr("#35d6ff"), ai = new THREE.Group();
    for (const [x, y, w, h] of [[0, 0.33, 0.7, 0.06], [0, -0.33, 0.7, 0.06], [0.33, 0, 0.06, 0.7], [-0.33, 0, 0.06, 0.7]]) { const m = mesh(box, aiMat, [x, y, 0], [w, h, 0.03]); m.layers.set(NOINK); ai.add(m); }
    ai.position.set(-1.3, ty(2) + 1.85, 1.56); A.add(ai);
    // ---- 1: salida de la clínica ----
    const O = new THREE.Group(), leaf = toon("#6fbf5a"), cream = toon("#fff3e0");
    O.add(mesh(box, toon("#93d06c"), [0, -0.5, 0], [600, 1, 600]), mesh(box, toon("#f3e3c2"), [0, 0.03, 14], [7, 0.1, 40]),
      mesh(box, cream, [0, 9, -9], [30, 18, 10]), mesh(box, toon("#e2c9a0"), [0, 18.4, -9], [32, 0.9, 11.5]), mesh(box, toon("#2a8a7c"), [0, 3.6, -3.9], [4.6, 7.2, 0.3]),
      mesh(box, toon("#2fb7a3"), [0, 11.6, -3.85], [1.1, 3.6, 0.3]), mesh(box, toon("#2fb7a3"), [0, 11.6, -3.85], [3.6, 1.1, 0.3]), mesh(box, toon("#e2c9a0"), [0, 7.9, -3.2], [7, 0.5, 2.2]));
    for (const x of [-10.5, -6, 6, 10.5]) for (const y of [4.5, 12.5]) O.add(mesh(box, toon("#a9dcf2"), [x, y, -3.9], [3, 3.6, 0.2]));
    for (const [x, z, s] of [[-16, 6, 1.2], [-21, -2, 1.5], [-13, 20, 1], [19, 2, 1.4], [15, 16, 1.1], [26, 12, 1.3], [-30, 14, 1.6]]) {
      O.add(mesh(new THREE.CylinderGeometry(0.5 * s, 0.65 * s, 5 * s, 10), toon("#8a5a3a"), [x, 2.5 * s, z]), mesh(BALL, leaf, [x, 7 * s, z], 3.3 * s), mesh(BALL, leaf, [x + 1.6 * s, 5.6 * s, z + 0.8], 2.2 * s));
    }
    const sun = mesh(BALL, new THREE.MeshBasicMaterial({ color: new THREE.Color(3.2, 2.3, 1.2) }), [-38, 46, -150], 11); sun.layers.set(NOINK); O.add(sun);
    const pat = figure({ top: "#ff8fb1", legs: "#5a6b8c", skin: "#e8b48f", hair: "#ff5c93", scarf: true });
    const par = figure({ top: "#4f8fe0", legs: "#3b4252", skin: "#c98d62", hair: "#2a2026" });
    const kid = figure({ top: "#ffd24a", legs: "#3f7fd0", skin: "#dba17a", hair: "#3a2a22" });
    kid.g.scale.setScalar(0.62); par.g.rotation.y = PI; kid.g.rotation.y = PI - 0.3;
    O.add(pat.g, par.g, kid.g);
    root.add(A, O, dust.mesh);

    return {
      root,
      update: (f, cam, scene) => {
        const t = f / FPS, place = cutIndex(CUTS, t);
        A.visible = place === 0; O.visible = place === 1;
        rig.sun.color.set(place ? "#ffd9a0" : "#fff6ea");
        const look = rig.apply(scene, cam, camAt(f), place ? OUT : INDOOR);
        if (place === 0) {
          const sync = t > tSync + 1.0 ? 0.6 + 0.4 * Math.sin((t - tSync - 1.0) * 9) : 0, hi = [pulse(t, tBio + 0.6, 0.6), Math.max(pulse(t, tFis + 0.6, 0.6), pulse(t, tAcu + 0.6, 0.6)), pulse(t, tIA + 0.6, 0.6)];
          lamps.forEach((l, i) => { (l.material as THREE.MeshToonMaterial).emissiveIntensity = 0.3 + 1.1 * hi[i] + 1.0 * sync; });
          // bióloga inclinada sobre el microscopio; físico ajustando el cristal; radiólogo señalando la pantalla
          bio.g.rotation.x = 0; bio.head.rotation.x = 0.35 + 0.05 * Math.sin(t * 1.4); bio.armR.rotation.set(-1.15, 0, -0.25); bio.armL.rotation.set(-0.9 + 0.08 * Math.sin(t * 3), 0, 0.2);
          phy.armR.rotation.set(-1.2 + 0.12 * Math.sin(t * 4), 0, -0.3); phy.armL.rotation.set(-0.5, 0, 0.15); phy.head.rotation.x = 0.2; phy.head.rotation.y = 0.1 * Math.sin(t * 0.8);
          rad.armL.rotation.set(-1.35 + 0.06 * Math.sin(t * 2.5), 0, 0.45); rad.armR.rotation.set(-0.2, 0, -0.1); rad.head.rotation.y = 0.15 * Math.sin(t * 0.7);
          gold.emissiveIntensity = 0.15 + 0.8 * pulse(t, tAcu + 0.7, 0.4) + 0.5 * sync;
          for (let i = 0; i < 22; i++) setM(wave, i, 1.75 + i * 0.081, ty(1) + 1.05 + 0.42 * Math.sin(i * 0.42 - t * 9), 1.93, 0.05);
          wave.instanceMatrix.needsUpdate = true;
          ai.scale.setScalar(1 + 0.25 * Math.abs(Math.sin(t * 3))); aiMat.color.set("#35d6ff").multiplyScalar(1.4 + 0.8 * hi[2] + 0.6 * sync);
          dust.pose(t, [0, 0, 6], [20, 44, 4], 0.4, "#ffffff");
        } else {
          const u = smooth((t - tOut - 0.2) / (tArr - tOut - 0.2)), moving = u > 0.001 && u < 0.999 ? 1 : 0, hug = ramp(t, tArr, 0.6), z = lerp(-2.6, 9.6, u);
          pat.g.position.set(0, 0.12 * Math.abs(Math.sin(t * 6.5)) * moving, z);
          walk(pat, t * 6.5, moving); pat.head.rotation.x = -0.05;
          if (hug > 0) { pat.armL.rotation.set(lerp(pat.armL.rotation.x, -1.25, hug), 0, 0.45 * hug); pat.armR.rotation.set(lerp(pat.armR.rotation.x, -1.25, hug), 0, -0.45 * hug); pat.legL.rotation.x *= 1 - hug; pat.legR.rotation.x *= 1 - hug; }
          // la pareja saluda y espera con los brazos abiertos; la niña corre hacia ella
          const wave2 = (1 - hug) * ramp(t, tOut + 1.2, 0.6), open = ramp(t, tDet, 1.2) * (1 - hug);
          par.g.position.set(-0.3, 0, 11.6 - 0.35 * hug);
          par.armR.rotation.set(-1.25 * hug - 0.9 * open - 2.7 * wave2 * (1 - open), 0, -0.3 * Math.sin(t * 9) * wave2 * (1 - open) - 0.7 * open + 0.45 * hug);
          par.armL.rotation.set(-1.25 * hug - 0.9 * open, 0, 0.7 * open - 0.45 * hug);
          const run = smooth((t - tDet) / (tArr - tDet)), kr = run > 0.001 && run < 0.999 ? 1 : 0, jump = (1 - hug) * (0.25 * Math.abs(Math.sin(t * 7))) * (1 - kr) + 0.5 * pulse(t, tArr + 0.35, 0.22);
          kid.g.position.set(lerp(2.0, 1.5, run), jump + 0.15 * kr * Math.abs(Math.sin(t * 11)), lerp(12.2, z + 1.25, run * (u > 0.9 ? 1 : 0.999)));
          walk(kid, t * 11, kr);
          if (!kr) { const up2 = hug > 0 ? -1.5 : -2.6 * (0.6 + 0.4 * Math.sin(t * 7)); kid.armL.rotation.set(up2, 0, 0.35); kid.armR.rotation.set(up2, 0, -0.35); kid.legL.rotation.x = kid.legR.rotation.x = 0; }
          dust.pose(t, [0, 8, 14], [50, 18, 30], 0.7, "#fff3c4");
        }
        return look;
      },
    };
  },
};
