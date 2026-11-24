// Escena 7 "Una lucha que sigue abierta": tres pisos en vertical (clínica saturada y mapa, físico con el biosensor
// de oro, médico con ultrasonido). El cierre del guion llega cortado a mitad de frase; la última línea de Óscar
// completa esa frase en el tono de concientización del documento, sin el final esperanzador de la versión anterior.
import React from "react";
import * as THREE from "three";
import { AbsoluteFill } from "remotion";
import words from "../../voice/escena7/words.json";
import lines from "../../voice/escena7/lines.json";
import { SceneDef } from "../shared/Stage";
import { BALL, C, Dust, FPS, Look, PI, Rig, SPHERE, V3, clamp01, hold, inst, makeCam, makeDof, mesh, pulse, ramp, setM, toon, glow, voice } from "../shared/kit";
import { NOINK } from "./escena1/ink";
import { outlineRibbon } from "../shared/mexico";

const T = voice(words);
export const TOTAL7 = Math.ceil((lines.end + 3.2) * FPS);
const tMuer = T("muriendo"), tTarde = T("tarde"), tAlc = T("alcance"), tFis = T("fisica"), tAcu = T("acustica"),
  tBiot = T("biotecnologia"), tClin = T("clinica"), tLucha = T("lucha"), tAb = T("abierta");
const Y = [13, 0, -13];
const INDOOR: Look = { bg: "#1b232c", fog: [70, 240], sky: "#d9dde2", ground: "#6d7580", sun: 0.7, hemi: 0.4 };
const room = (i: number, t0: number, x = 0.4, roll = 0.02) => hold(t0, [x, Y[i] - 0.4, 22], [0, Y[i] - 0.6, 0], { fov: 36, roll }, 0.002);

const camAt = makeCam([
  { t: 0, s: hold(0, [0, 0, 64], [0, 0, 0], { fov: 42 }, 0.0012) },
  { t: tMuer, dur: 28, s: room(0, tMuer, 0.8, 0.02) },
  { t: tTarde, dur: 24, s: hold(tTarde, [-2.2, 14.2, 14], [-1.5, 14.6, -1], { fov: 34, roll: -0.02 }) },
  { t: tAlc, dur: 26, s: hold(tAlc, [0, 2, 58], [0, 1, 0], { fov: 42 }) },
  { t: tFis, dur: 28, s: room(1, tFis, 1.2, -0.02) },
  { t: tAcu, dur: 20, s: hold(tAcu, [2.4, -1.7, 8.5], [0.4, -1.45, 1.3], { fov: 32, roll: 0.02 }) },
  { t: tClin, dur: 28, s: room(2, tClin, -0.6, 0.02) },
  { t: tLucha, dur: 36, s: hold(tLucha, [0, 0, 60], [0, 0, 0], { fov: 40 }, 0.0006) },
], [[tMuer + 0.4, 0.45], [tLucha + 0.3, 0.55]]);
const dof = makeDof([{ t: 0, cInf: 0 }, { t: tAcu, dur: 22, cInf: 9 }, { t: tBiot, dur: 24, cInf: 2 }, { t: tLucha, dur: 40, cInf: 0 }]);

type Fig = { g: THREE.Group; armL: THREE.Group; armR: THREE.Group; head: THREE.Group };
const figure = (o: { top: string; legs: string; skin: string; hair: string; coat?: boolean }): Fig => {
  const g = new THREE.Group(), skin = toon(o.skin), top = toon(o.top), dark = toon("#241726");
  const limb = (mat: THREE.Material, r: number, len: number, pivot: V3, hand?: THREE.Material) => {
    const p = new THREE.Group(); p.position.set(...pivot);
    p.add(mesh(new THREE.CylinderGeometry(r, r * 0.9, len, 10).translate(0, -len / 2, 0), mat));
    if (hand) p.add(mesh(SPHERE, hand, [0, -len - 0.08, 0], 0.26));
    g.add(p); return p;
  };
  limb(toon(o.legs), 0.28, 2.2, [-0.38, 2.2, 0]); limb(toon(o.legs), 0.28, 2.2, [0.38, 2.2, 0]);
  g.add(mesh(new THREE.CapsuleGeometry(0.85, o.coat ? 2 : 1.5, 5, 14), top, [0, o.coat ? 3.15 : 3.3, 0]));
  const armL = limb(top, 0.2, 1.8, [-1, 4.2, 0], skin), armR = limb(top, 0.2, 1.8, [1, 4.2, 0], skin);
  const head = new THREE.Group(); head.position.set(0, 5.2, 0);
  head.add(mesh(SPHERE, skin, [0, 0, 0], [0.9, 0.96, 0.9]), mesh(SPHERE, toon(o.hair), [0, 0.18, -0.05], [0.96, 0.72, 0.96]),
    mesh(SPHERE, dark, [-0.3, 0.02, 0.78], 0.09), mesh(SPHERE, dark, [0.3, 0.02, 0.78], 0.09));
  g.add(head);
  return { g, armL, armR, head };
};

const endCard: React.CSSProperties = { position: "absolute", left: 0, right: 0, top: 78, textAlign: "center", color: "#f4efe6", fontFamily: "Georgia, 'Times New Roman', serif", background: "rgba(7,8,12,0.78)", padding: "26px 36px" };

export const escena7: SceneDef = {
  total: TOTAL7, dof, bloom: 0.45,
  ink: { color: "#e7e1d8", strength: 0.8 },
  overlays: (f) => [{ c: "#0e1216", o: 0.35 * ramp(f / FPS, tAb + 1.1, 2.2) }],
  hud: (f) => {
    const t = f / FPS, a = clamp01((t - tLucha) * 2) * clamp01((lines.end + 2.4 - t) * 1.2);
    return a > 0.01 ? <AbsoluteFill><div style={{ ...endCard, opacity: a }}>
      <div style={{ fontFamily: "Consolas, monospace", letterSpacing: 7, fontSize: 28, color: "#c8b8a4" }}>MÉXICO · 2026</div>
      <div style={{ fontSize: 64, marginTop: 12, lineHeight: 1.05 }}>La lucha sigue abierta</div>
    </div></AbsoluteFill> : null;
  },
  make: () => {
    const root = new THREE.Group(), rig = new Rig(root), dust = new Dust(60, 17), box = new THREE.BoxGeometry(1, 1, 1);
    const A = new THREE.Group();
    const walls = ["#6a5a52", "#3d4652", "#2c4a58"], floors = ["#4e403c", "#2c333c", "#1e3642"];
    const lamps = Y.map((y, i) => {
      A.add(mesh(box, toon(walls[i]), [0, y, -4], [16, 12, 0.5]), mesh(box, toon(floors[i]), [0, y - 6, 0], [16, 0.45, 9]), mesh(box, toon("#2a3038"), [2.4, y - 3.6, 1.6], [4.4, 3.2, 2.2]));
      const l = mesh(box, glow("#f3efe4", 0.25), [0, y + 5.2, -3.2], [10, 0.28, 0.4]);
      A.add(l); return l;
    });
    A.add(mesh(box, toon("#14191f"), [-8.2, 0, 0], [0.6, 40, 9]), mesh(box, toon("#14191f"), [8.2, 0, 0], [0.6, 40, 9]));
    // clínica saturada + mapa
    const queue = [
      figure({ top: "#d8d2c8", legs: "#3d4654", skin: "#e0b08a", hair: "#4a3428" }),
      figure({ top: "#c46b62", legs: "#3a3f4a", skin: "#c48862", hair: "#1c1a18" }),
      figure({ top: "#8aa0b4", legs: "#2e3a48", skin: "#efc6a4", hair: "#6a4030" }),
      figure({ top: "#d2c4a4", legs: "#4a4038", skin: "#e8b48f", hair: "#2a2420" }),
      figure({ top: "#b7c4b0", legs: "#3e4a40", skin: "#d9a07a", hair: "#5a3218" }),
    ];
    queue.forEach((p, i) => { p.g.position.set(-5.2 + i * 1.85, Y[0] - 5.7, 1.7 + (i % 2) * 0.7); p.g.rotation.y = 0.4; p.g.scale.setScalar(0.86); A.add(p.g); });
    const poster = new THREE.Mesh(outlineRibbon(0.12, 0.64), new THREE.MeshBasicMaterial({ color: C("#f7f3ea").multiplyScalar(1.2) }));
    poster.scale.setScalar(0.105); poster.position.set(-2.4, Y[0] + 1.5, -3.6); poster.layers.set(NOINK); A.add(poster);
    // físico, biosensor de oro
    const phy = figure({ top: "#f4f1ea", legs: "#2c333c", skin: "#c99264", hair: "#1a1816", coat: true });
    phy.g.position.set(-3.2, Y[1] - 5.7, 1.5); phy.g.rotation.y = 0.7; A.add(phy.g);
    const gold = toon("#e6b423", { emissive: C("#ffb000"), emissiveIntensity: 0.2 });
    const ty = Y[1] - 2;
    A.add(mesh(new THREE.CylinderGeometry(0.85, 0.9, 0.22, 20), toon("#3a424c"), [0.4, ty + 0.1, 1.5]),
      mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.7, 8), toon("#c5d0d8"), [-0.35, ty + 0.5, 1.5]),
      mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.7, 8), toon("#c5d0d8"), [1.15, ty + 0.5, 1.5]),
      mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.08, 24).rotateX(PI / 2), toon("#d7eef8", { transparent: true, opacity: 0.85 }), [0.4, ty + 0.86, 1.5]),
      mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.045, 20).rotateX(PI / 2), gold, [0.4, ty + 0.92, 1.55]));
    const wave = inst(BALL, new THREE.MeshBasicMaterial({ color: C("#7dffa8").multiplyScalar(1.4) }), 18);
    wave.layers.set(NOINK); A.add(wave);
    // médico y ultrasonido, sin comprimir el tejido
    const doc = figure({ top: "#2f8f86", legs: "#1d6e68", skin: "#e8b48f", hair: "#8d9398" });
    doc.g.position.set(-3.4, Y[2] - 5.7, 1.6); doc.g.rotation.y = 0.85; A.add(doc.g);
    const breast = mesh(new THREE.SphereGeometry(1, 28, 16, 0, 2 * PI, 0, PI / 2), toon("#f0c2b4"), [1.5, Y[2] - 1.95, 1.9], [1.35, 0.55, 1.25]);
    const probe = mesh(new THREE.BoxGeometry(0.55, 0.28, 1.15), toon("#dfe7ee"), [1.5, Y[2] - 1.35, 2.15]);
    A.add(breast, probe, mesh(box, toon("#101820"), [4.3, Y[2] - 1.3, 1.1], [1.5, 1.15, 0.12]), mesh(box, toon("#163044"), [4.3, Y[2] - 1.3, 1.2], [1.2, 0.85, 0.04]));
    root.add(A, dust.mesh);

    return {
      root,
      update: (f, cam, scene) => {
        const t = f / FPS;
        const look = rig.apply(scene, cam, camAt(f), INDOOR);
        const hi = [Math.max(pulse(t, tMuer + 0.5, 0.8), pulse(t, tTarde + 0.4, 0.6)),
          Math.max(pulse(t, tFis + 0.4, 0.7), pulse(t, tAcu + 0.3, 0.6), pulse(t, tBiot + 0.2, 0.4)),
          Math.max(pulse(t, tClin + 0.35, 0.7), pulse(t, tLucha + 0.4, 0.5))];
        const together = t > tLucha ? 0.55 + 0.45 * Math.sin((t - tLucha) * 2.2) : 0;
        lamps.forEach((l, i) => { (l.material as THREE.MeshToonMaterial).emissiveIntensity = 0.22 + 0.9 * hi[i] + 0.7 * together; });
        queue.forEach((p, i) => { p.head.rotation.y = 0.08 * Math.sin(t * 0.7 + i); p.head.rotation.x = 0.12; });
        phy.armR.rotation.set(-1.15 + 0.08 * Math.sin(t * 3), 0, -0.25); phy.head.rotation.x = 0.22;
        doc.armR.rotation.set(-0.9, 0.2, -0.4); doc.head.rotation.x = 0.28;
        gold.emissiveIntensity = 0.18 + 0.7 * pulse(t, tAcu + 0.5, 0.45) + 0.35 * together;
        for (let i = 0; i < 18; i++) setM(wave, i, 2.15 + i * 0.1, ty + 0.95 + 0.22 * Math.sin(i * 0.55 - t * (t > tAcu ? 4.2 : 8)), 1.7, 0.045);
        wave.instanceMatrix.needsUpdate = true;
        probe.position.y = Y[2] - 1.35 + 0.04 * Math.sin(t * 2);
        dust.pose(t, [0, 0, 5], [18, 40, 4], 0.28, "#e7e1d8");
        return look;
      },
    };
  },
};
