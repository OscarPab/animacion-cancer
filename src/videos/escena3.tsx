// Escena 3 "La cruda realidad en México": mapa en líneas blancas, puntos que se encienden, contador hasta
// 8,384, reloj de 24 horas (23 siluetas) y la gráfica de mortalidad 15.7 → 18.7 con la barra de diagnóstico tardío.
import React from "react";
import * as THREE from "three";
import { AbsoluteFill } from "remotion";
import words from "../../voice/escena3/words.json";
import lines from "../../voice/escena3/lines.json";
import { SceneDef } from "../shared/Stage";
import { C, Dust, FPS, Look, Rig, clamp01, hold, inst, makeCam, makeDof, ramp, setM, smooth, voice } from "../shared/kit";
import { NOINK } from "./escena1/ink";
import { MX_CITIES, mxXY, outlineRibbon } from "../shared/mexico";

const T = voice(words);
export const TOTAL3 = Math.ceil((lines.end + 2.6) * FPS);
const tMx = T("mexico"), tCount = T("fallecieron"), tWomen = T("mujeres", 1), tClock = T("promedio"),
  tGraph = T("decada"), tRate = T("quince"), tBar = T("sesenta");
const NIGHT: Look = { bg: "#07080c", fog: [90, 260], sky: "#c5ccd6", ground: "#07080c", sun: 0.22, hemi: 0.18 };
const MAP_S = 0.64;

const camAt = makeCam([
  { t: 0, s: hold(0, [0, 0.2, 54], [0, 2.8, 0], { fov: 40 }, 0.00025) },
  { t: tMx, dur: 40, s: hold(tMx, [0, 0.6, 52], [0, 3.2, 0], { fov: 39 }, 0.00025) },
  { t: tCount, dur: 40, s: hold(tCount, [0, 0.8, 54], [0, 3.4, 0], { fov: 40 }, 0.00022) },
  { t: tGraph, dur: 40, s: hold(tGraph, [0, 1.4, 56], [0, 4.2, 0], { fov: 40 }, 0.0002) },
]);
const dof = makeDof([{ t: 0, cInf: 0 }, { t: tCount, dur: 32, cInf: 2 }, { t: tGraph, dur: 36, cInf: 0 }]);

const comma = (n: number) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
const panel: React.CSSProperties = { position: "absolute", left: 64, right: 64, bottom: 96, color: "#f4efe6", fontFamily: "Georgia, 'Times New Roman', serif" };
const kicker: React.CSSProperties = { fontFamily: "Consolas, 'Courier New', monospace", letterSpacing: 8, fontSize: 28, color: "#c8b8a4" };

const Silhouette: React.FC<{ o: number }> = ({ o }) => (
  <svg viewBox="0 0 40 78" style={{ width: 42, height: 82, opacity: o }}>
    <circle cx="20" cy="12" r="8" fill="#f4efe6" />
    <path d="M7 32c2-8 24-8 26 0l-3 28c-1 6-4 8-10 8s-9-2-10-8z" fill="#f4efe6" />
  </svg>
);

export const escena3: SceneDef = {
  total: TOTAL3, dof, bloom: 0.55,
  ink: { color: "#f7f1e8", strength: 0.35 },
  overlays: () => [],
  hud: (f) => {
    const t = f / FPS;
    const countA = clamp01((t - tCount + 0.15) * 3) * clamp01((tClock - 0.35 - t) * 3);
    const clockA = clamp01((t - tClock) * 3) * clamp01((tGraph - 0.25 - t) * 3);
    const graphA = clamp01((t - tGraph) * 2.2);
    const n = 8384 * smooth((t - tCount) / Math.max(0.9, tWomen + 0.4 - tCount));
    const sweep = smooth((t - tClock) / Math.max(1.2, (tGraph - tClock) * 0.72));
    const gone = Math.min(23, Math.floor(sweep * 23 + 1e-4));
    const lineU = smooth((t - tRate) / 2.6);
    const barU = smooth((t - tBar) / 1.8);
    const yOf = (v: number) => 248 - ((v - 15) / 4.6) * 210;
    const x0 = 70, x1 = 860;
    const xAt = (u: number) => x0 + (x1 - x0) * u;
    const y0 = yOf(15.7), y1 = yOf(15.7 + (18.7 - 15.7) * lineU);
    return (
      <AbsoluteFill>
        <div style={{ position: "absolute", top: 86, left: 0, right: 0, textAlign: "center", opacity: clamp01(t * 2) * clamp01((lines.end - t) * 2), ...kicker }}>MÉXICO</div>
        {countA > 0.01 && <div style={{ ...panel, opacity: countA }}>
          <div style={kicker}>INEGI · 2024</div>
          <div style={{ fontSize: 168, lineHeight: 0.95, fontWeight: 600, letterSpacing: -2, marginTop: 8 }}>{comma(n)}</div>
          <div style={{ fontSize: 36, marginTop: 8, color: "#e7d7c4" }}>mujeres fallecidas</div>
          <div style={{ fontSize: 28, marginTop: 18, color: "#b7a894", fontFamily: "Consolas, monospace" }}>8,451 defunciones en el país · 2025: más de 8,100</div>
        </div>}
        {clockA > 0.01 && <div style={{ ...panel, opacity: clockA }}>
          <div style={kicker}>CASI CADA HORA</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 22, marginTop: 10 }}>
            <div style={{ fontSize: 132, fontWeight: 600, lineHeight: 0.9 }}>{Math.min(23, gone)}</div>
            <div style={{ fontSize: 34, color: "#e7d7c4" }}>mujeres al día</div>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 22, maxWidth: 920 }}>
            {Array.from({ length: 23 }, (_, i) => <Silhouette key={i} o={i < gone ? 0.16 : 0.95} />)}
          </div>
        </div>}
        {graphA > 0.01 && <div style={{ ...panel, opacity: graphA }}>
          <div style={kicker}>DEFUNCIONES POR CADA 100 MIL MUJERES</div>
          <svg viewBox="0 0 980 300" style={{ width: "100%", marginTop: 8 }}>
            <line x1={x0} y1={yOf(14.5)} x2={x0} y2={yOf(20.5)} stroke="#8d8072" strokeWidth="2" />
            <line x1={x0} y1={yOf(14.5)} x2={x1} y2={yOf(14.5)} stroke="#8d8072" strokeWidth="2" />
            <line x1={x0} y1={y0} x2={xAt(lineU)} y2={y1} stroke="#f4efe6" strokeWidth="6" />
            <circle cx={x0} cy={y0} r="8" fill="#f4efe6" />
            <circle cx={xAt(lineU)} cy={y1} r="8" fill="#e25b4a" />
            <text x={x0} y={286} fill="#c8b8a4" fontSize="26" fontFamily="Consolas, monospace">2015 · 15.7</text>
            <text x={x1 - 210} y={286} fill="#c8b8a4" fontSize="26" fontFamily="Consolas, monospace">2024 · 18.7</text>
          </svg>
          <div style={{ marginTop: 6, opacity: barU }}>
            <div style={{ ...kicker, letterSpacing: 4 }}>DIAGNÓSTICO EN ETAPA AVANZADA</div>
            <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
              {Array.from({ length: 10 }, (_, i) => <div key={i} style={{ flex: 1, height: 28, background: i < Math.round(7 * barU) ? "#e25b4a" : "#2a2724" }} />)}
            </div>
            <div style={{ fontSize: 32, marginTop: 12 }}>cerca de 7 de cada 10</div>
          </div>
        </div>}
      </AbsoluteFill>
    );
  },
  make: () => {
    const root = new THREE.Group(), rig = new Rig(root), dust = new Dust(70, 31);
    const g = new THREE.Group();
    g.position.set(0, 10.6, 0);
    const ribbon = new THREE.Mesh(outlineRibbon(0.1, MAP_S), new THREE.MeshBasicMaterial({ color: C("#fff8ee").multiplyScalar(1.25) }));
    ribbon.layers.set(NOINK);
    const dots = inst(new THREE.SphereGeometry(1, 14, 10), new THREE.MeshBasicMaterial({ color: C("#ffb0a2").multiplyScalar(1.4) }), MX_CITIES.length);
    dots.layers.set(NOINK);
    MX_CITIES.forEach(([lon, lat], i) => { const [x, y] = mxXY(lon, lat, MAP_S); setM(dots, i, x, y, 0.15, 0.07); });
    g.add(ribbon, dots);
    root.add(g, dust.mesh);
    const segs = ribbon.geometry.index!.count / 6;
    return {
      root,
      update: (f, cam, scene) => {
        const t = f / FPS;
        const look = rig.apply(scene, cam, camAt(f), NIGHT);
        const shown = ramp(t, 0.35, 2.6);
        ribbon.geometry.setDrawRange(0, Math.floor(shown * (shown > 0.985 ? segs : segs - 1)) * 6);
        MX_CITIES.forEach((_, i) => {
          const [x, y] = mxXY(MX_CITIES[i][0], MX_CITIES[i][1], MAP_S);
          const appear = ramp(t, 1.1 + (i % 9) * 0.07, 0.55);
          const blink = 0.55 + 0.45 * (0.5 + 0.5 * Math.sin(t * (1.3 + (i % 4) * 0.55) + i * 1.7));
          setM(dots, i, x, y, 0.2, 0.055 + 0.05 * appear * blink);
        });
        dots.instanceMatrix.needsUpdate = true;
        dust.pose(t, [0, 8, 4], [28, 24, 8], 0.35, "#d9cfc3");
        return look;
      },
    };
  },
};
