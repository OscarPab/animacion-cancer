// Escena 1 "El universo microscópico y la amenaza invisible": planos sincronizados con las palabras de la voz
// (voice/escena1/words.json) y gramática de cámara del skill cartoon-3d-short (cortes en saltos grandes,
// deslizamientos smootherstep de 18-40 f, cada plano fijo empuja lentamente, sacudidas de 7 f en los impactos).
export const FPS = 30;
export const TOTAL = 1035; // 34.5 s
export type V3 = [number, number, number];

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const glide = (u: number) => { const x = clamp01(u); return x * x * x * (x * (6 * x - 15) + 10); };
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
export const mix3 = (a: V3, b: V3, k: number): V3 => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
/** generador determinista (cada frame se renderiza en un proceso distinto: nada de Math.random) */
export const rng = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

// ---------------- palabras clave de la voz (segundos) ----------------
export const W = {
  cuerpo: 2.2, pero: 7.32, sola: 8.73, ignorar: 10.11, eso: 11.96, noEs: 14.35, rebelion: 16.52,
  comienza: 18.48, conductos: 21.39, lobulillos: 23.99, por: 25.65, mutacion: 26.02,
  lasCelulas: 27.49, desactivan: 28.1, comienzan: 30.12, control: 31.85, fin: 32.4,
};
const F = (s: number) => Math.round(s * FPS);

// ---------------- planos ----------------
export type Place = "skin" | "tissue" | "wall" | "dna";
export type ShotDef = { id: number; a: number; b: number; place: Place };
export const DIVE = 66; // la cámara atraviesa la piel
export const SHOTS: ShotDef[] = [
  { id: 1, a: 0, b: DIVE, place: "skin" }, // descenso hacia la piel
  { id: 2, a: DIVE, b: F(W.pero), place: "tissue" }, // descenso entre el tejido hasta los conductos azules
  { id: 3, a: F(W.pero), b: F(W.eso), place: "wall" }, // pared de células sanas -> "una sola célula"
  { id: 4, a: F(W.eso), b: F(W.comienza), place: "wall" }, // la célula rebelde
  { id: 5, a: F(W.comienza), b: F(W.por), place: "tissue" }, // conductos y lobulillos
  { id: 6, a: F(W.por), b: F(W.lasCelulas) - 2, place: "dna" }, // mutación en el ADN
  { id: 7, a: F(W.lasCelulas) - 2, b: TOTAL, place: "wall" }, // división sin control -> tumor
];
export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
export const FLASH_AT = F(W.eso); // destello rojo en "Eso es el cáncer de mama"

// ---------------- física de la historia ----------------
/** parpadeo rojo del núcleo rebelde: 0 = azul sano, 1 = rojo */
export const redAt = (t: number) => {
  if (t < W.ignorar) return 0;
  const x = t - W.ignorar;
  if (x < 1.6) return Math.floor(x * 5) % 2 === 0 ? 1 : 0.15; // parpadeo
  return 0.85 + 0.15 * Math.sin(x * 7);
};
/** pérdida de la forma simétrica (0..1) */
export const warpAt = (t: number) => smooth((t - (W.rebelion - 0.3)) / 1.6);
/** oscurecimiento del cuerpo de la célula (0 azul .. 1 púrpura oscuro) */
export const darkAt = (t: number) => smooth((t - W.noEs) / 3.2);
export const NT = 70; // células del tumor
const K = Math.log(NT / 7) / 2.15;
/** instante en que nace la célula i (la 0 es la célula original) */
export const birth = (i: number) => {
  if (i === 0) return -1;
  if (i === 1) return W.desactivan;
  if (i <= 3) return 28.9 + 0.06 * (i - 2);
  if (i <= 6) return 29.6 + 0.06 * (i - 4);
  return W.comienzan + Math.log((i + 1) / 7) / K;
};
export const countAt = (t: number) => { let n = 1; while (n < NT && birth(n) <= t) n++; return n; };

// ---------------- cámara ----------------
export type Cam = { pos: V3; look: V3; fov: number; roll: number };
type Shot = Partial<Cam> & { pos: V3; look: V3 };
type Key = { f: number; dur?: number; cut?: boolean; s: (f: number) => Shot };
const mix = (a: Cam, b: Cam, k: number): Cam => ({ pos: mix3(a.pos, b.pos, k), look: mix3(a.look, b.look, k), fov: lerp(a.fov, b.fov, k), roll: lerp(a.roll, b.roll, k) });
const full = (c: Shot): Cam => ({ fov: 40, roll: 0, ...c });
const run = (keys: Key[], f: number) => {
  let cur = full(keys[0].s(f));
  for (let i = 1; i < keys.length; i++) {
    const k = keys[i];
    if (f < k.f) break;
    cur = k.cut ? full(k.s(f)) : mix(cur, full(k.s(f)), glide((f - k.f) / (k.dur ?? 24)));
  }
  return cur;
};
/** factor de empuje desde f0: el sujeto crece ~rate por frame; `punch` lo sube durante los primeros n frames */
const pushK = (f: number, f0: number, rate: number, punch = 0, n = 35) => {
  const x = Math.max(0, f - f0);
  let s = rate * x;
  if (punch > rate) for (let i = 0; i < Math.min(x, n); i++) s += (punch - rate) * Math.max(0, Math.min(1, (i + 0.5) / 8, (n - i - 0.5) / 8));
  return Math.exp(-s);
};
const dolly = (pos: V3, look: V3, k: number, rest: Partial<Cam> = {}): Shot => ({ pos: mix3(look, pos, k), look, ...rest });

// lugares clave (los rellena tree.ts al construir el árbol de conductos; valores por defecto seguros)
export const SPOT = { marker: [6, 2, 2] as V3, lobe: [10, 16, 0] as V3 };

// 1: de lejos sobre la piel hasta entrar por un poro (aceleración continua)
const S1 = (f: number): Shot => {
  const u = clamp01(f / DIVE) ** 2.4;
  return { pos: mix3([12, 52, 34], [0.2, -1.6, 0.6], u), look: mix3([0, 0, 0], [0, -6, 0], u), fov: 42, roll: lerp(-0.06, 0.03, u) };
};
// 2: descenso por el tejido; los conductos azules aparecen desde abajo
const S2 = (f: number): Shot => {
  const u = glide((f - DIVE) / (F(W.pero) - DIVE + 20));
  return { pos: [lerp(-5, 2, u), lerp(88, 5, u), lerp(78, 74, u)], look: [0, lerp(60, 2, u), 0], fov: 42, roll: lerp(0.05, -0.02, u) };
};
// 3: pared de células dentro del conducto
const S3a = (f: number) => dolly([3, -6, 32], [0, 1, 0], pushK(f, F(W.pero), 0.0022), { fov: 40 });
const S3b = (f: number) => dolly([0.8, -1.2, 12.5], [0, 0, 0.3], pushK(f, F(W.sola), 0.002, 0.005, 30), { fov: 38, roll: 0.03 });
// 4: la célula rebelde
const S4a = (f: number) => dolly([-1.2, 0.6, 7.6], [0, 0, 0.4], pushK(f, F(W.eso), 0.0018, 0.006, 30), { fov: 36, roll: 0.045 });
const S4b = (f: number) => dolly([2.6, -2.2, 16], [0, 0, 0.3], pushK(f, F(W.noEs), 0.002), { fov: 40, roll: -0.03 });
const S4c = (f: number) => dolly([-0.7, -0.9, 8.6], [0, 0, 0.4], pushK(f, F(W.rebelion), 0.002, 0.006, 32), { fov: 37, roll: 0.045 });
// 5: árbol de conductos: sale del punto donde empezó todo, plano general, y sube a un lobulillo
const S5a = (f: number): Shot => {
  const m = SPOT.marker, u = glide((f - F(W.comienza)) / 78), o = (f - F(W.comienza)) / 220;
  return { pos: mix3([m[0] + 2, m[1] - 1, m[2] + 13], [-13 + 14 * o, 3, 74], u), look: mix3(m, [0, 1.5, 0], u), fov: lerp(36, 42, u), roll: lerp(0.04, 0, u) };
};
const S5b = (f: number) => { const l = SPOT.lobe; return dolly([l[0] * 0.75 + 3, l[1] - 2, l[2] + 17], l, pushK(f, F(W.lobulillos), 0.0025), { fov: 38, roll: -0.035 }); };
// 6: ADN dentro del núcleo
const S6a = (f: number) => dolly([8, -5, 34], [0, 0.5, 0], pushK(f, F(W.por), 0.004), { fov: 40, roll: -0.05 });
const S6b = (f: number) => dolly([3.5, -1.2, 17], [0, 0, 0], pushK(f, F(W.mutacion), 0.003), { fov: 38, roll: 0.04 });
// 7: división: la cámara se aleja a medida que el tumor crece
const S7a = (f: number) => dolly([1, -1, 11], [0, 0, 0.6], pushK(f, F(W.lasCelulas), 0.002), { fov: 38 });
const S7b = (f: number) => dolly([-1.6, -2, 17], [0, 0, 0.6], pushK(f, F(28.9), 0.0015), { fov: 40, roll: 0.03 });
const S7c = (f: number) => dolly([2.2, -3, 26], [0, 0, 0.6], pushK(f, F(W.comienzan), 0.001), { fov: 40, roll: -0.03 });
const S7d = (f: number) => dolly([0, -5, 38], [0, 0, 0.5], Math.exp(0.0012 * Math.max(0, f - F(W.control))), { fov: 42 }); // sigue alejándose hasta el final

const CAMS: Record<number, Key[]> = {
  1: [{ f: 0, s: S1 }],
  2: [{ f: DIVE, s: S2 }],
  3: [
    { f: F(W.pero), s: S3a },
    { f: F(W.sola) - 16, dur: 34, s: S3b }, // centrado en "una sola célula"
  ],
  4: [
    { f: F(W.eso), s: S4a }, // corte en "Eso"
    { f: F(W.noEs) - 4, dur: 30, s: S4b }, // "No es un invasor externo": se abre a las vecinas tranquilas
    { f: F(W.rebelion) - 14, dur: 30, s: S4c }, // "rebelión"
  ],
  5: [
    { f: F(W.comienza), s: S5a },
    { f: F(W.lobulillos) - 18, dur: 34, s: S5b },
  ],
  6: [
    { f: F(W.por), s: S6a },
    { f: F(W.mutacion) - 4, dur: 22, s: S6b },
  ],
  7: [
    { f: F(W.lasCelulas) - 2, s: S7a },
    { f: F(28.9) - 6, dur: 24, s: S7b },
    { f: F(W.comienzan) - 10, dur: 40, s: S7c },
    { f: F(31.3), dur: 48, s: S7d },
  ],
};

// sacudidas de impacto: cambian de signo cada frame y decaen en 7 f
export const KICKS: [number, number][] = [[W.ignorar, 0.6], [W.eso, 1.2], [W.mutacion, 1.0], [W.desactivan, 0.8], [28.9, 0.8], [29.6, 0.8], [W.control, 1.4]];
export const kickAt = (t: number) => {
  let a = 0;
  for (const [t0, g] of KICKS) {
    const n = Math.floor((t - t0) * FPS + 1e-6);
    if (n >= 0 && n < 7) a += g * (n % 2 ? -1 : 1) * (1 - n / 7) ** 1.5;
  }
  return a;
};
export const camAt = (id: number, f: number): Cam => {
  const c = run(CAMS[id], f), a = kickAt(f / FPS);
  if (!a) return c;
  const d: V3 = [c.look[0] - c.pos[0], c.look[1] - c.pos[1], c.look[2] - c.pos[2]];
  const L = Math.hypot(...d), h = Math.hypot(d[0], d[2]) || 1;
  const m = (3 / 640) * Math.tan((c.fov * Math.PI) / 360) * L * a;
  return { ...c, look: [c.look[0] - (d[2] / h) * m, c.look[1] + 0.6 * m, c.look[2] + (d[0] / h) * m], roll: c.roll + a * 0.004 };
};

// ---------------- lente ----------------
/** cInf = radio del disco de desenfoque (px a 1080x1920) de lo que está en el infinito; 0 = todo nítido */
export type Dof = { f: number; dur?: number; cInf: number; focus?: (f: number) => V3 };
export const DOF: Dof[] = [
  { f: 0, cInf: 6 }, // piel
  { f: DIVE, cInf: 9, focus: () => [0, 2, 0] }, // descenso: foco en los conductos, la grasa cercana pasa borrosa
  { f: F(W.pero), cInf: 0 }, // pared general
  { f: F(W.sola) - 16, dur: 34, cInf: 13, focus: () => [0, 0, 0.5] },
  { f: F(W.eso), cInf: 15, focus: () => [0, 0, 0.5] },
  { f: F(W.comienza), cInf: 12 },
  { f: F(W.comienza) + 30, dur: 40, cInf: 0 }, // plano general del árbol
  { f: F(W.lobulillos) - 18, dur: 34, cInf: 11 },
  { f: F(W.por), cInf: 14 },
  { f: F(W.lasCelulas) - 2, cInf: 12, focus: () => [0, 0, 0.6] },
  { f: F(W.comienzan) - 10, dur: 40, cInf: 5, focus: () => [0, 0, 0.6] },
];
export const dofAt = (f: number) => {
  let i = 0; while (i + 1 < DOF.length && f >= DOF[i + 1].f) i++;
  const d = DOF[i], p = DOF[Math.max(0, i - 1)];
  const k = d.dur ? Math.min(1, (f - d.f) / d.dur) : 1;
  return { cInf: p.cInf + (d.cInf - p.cInf) * k, focus: d.focus };
};
