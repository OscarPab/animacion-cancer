// Escenario común: un canvas three.js + la cadena de post del skill cartoon-3d-short manejada a mano
// (tinta -> desenfoque de lente -> bloom -> tone mapping NEUTRAL -> etalonaje), fundidos y capas 2D opcionales.
import React, { useEffect, useMemo } from "react";
import * as THREE from "three";
import { AbsoluteFill, getInputProps, useCurrentFrame } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useFrame, useThree } from "@react-three/fiber";
import { BlendFunction, BloomEffect, EffectComposer, EffectPass, RenderPass, ToneMappingEffect, ToneMappingMode } from "postprocessing";
import { InkPass, InkOptions, noInkFallback } from "../videos/escena1/ink";
import { LensBlur } from "../videos/escena1/lensblur";
import { GradeEffect, GRADE_DAY2 } from "../videos/escena1/grade";
import { SceneWorld, V3, clamp01 } from "./kit";

export type SceneDef = {
  total: number;
  make: () => SceneWorld;
  dof: (f: number) => { cInf: number; focus?: V3 };
  /** velos de color a pantalla completa (destellos, fundidos entre lugares) */
  overlays?: (f: number) => { c: string; o: number }[];
  /** capa 2D sobre la imagen (solo donde el guion pide cifras o ecuaciones) */
  hud?: (f: number) => React.ReactNode;
  ink?: InkOptions | ((f: number) => InkOptions);
  bloom?: number;
};

const makeBloom = (intensity: number) => {
  const b = new BloomEffect({ blendFunction: BlendFunction.ADD, intensity, luminanceThreshold: 1.0, luminanceSmoothing: 0.2, mipmapBlur: true, levels: 6, radius: 0.65 });
  const mip = b.mipmapBlurPass, setSize = mip.setSize.bind(mip);
  mip.setSize = (w: number, h: number) => setSize(Math.round((1920 * w) / Math.max(h, 1)), 1920);
  return b;
};
const fwd = new THREE.Vector3(), fpt = new THREE.Vector3();

const Inner: React.FC<{ def: SceneDef }> = ({ def }) => {
  const f = useCurrentFrame();
  const { camera, scene, gl, size } = useThree();
  const world = useMemo(() => def.make(), [def]);
  const ink0 = typeof def.ink === "function" ? def.ink(0) : def.ink;
  const fx = useMemo(() => ({
    ink: new InkPass(scene, camera as THREE.PerspectiveCamera, { widthNear: 4.6, widthFar: 2.8, distNear: 8, distFar: 90, ...ink0 }),
    lens: new LensBlur({ maxCoC: 24, nearScale: 1.2 }),
    bloom: makeBloom(def.bloom ?? 0.7),
    tone: new ToneMappingEffect({ mode: ToneMappingMode.NEUTRAL }),
    grade: new GradeEffect(GRADE_DAY2, 1),
  }), [camera, scene, def]);
  useEffect(() => () => fx.ink.dispose(), [fx]);
  const composer = useMemo(() => {
    gl.toneMapping = THREE.NoToneMapping;
    const c = new EffectComposer(gl, { multisampling: 4, frameBufferType: THREE.HalfFloatType });
    c.addPass(new RenderPass(scene, camera));
    c.addPass(fx.ink);
    c.addPass(new EffectPass(camera, fx.lens.pre));
    c.addPass(new EffectPass(camera, fx.lens.main));
    c.addPass(new EffectPass(camera, fx.bloom, fx.tone, fx.grade));
    return c;
  }, [gl, scene, camera, fx]);
  useEffect(() => { composer.setSize(size.width, size.height); }, [composer, size]);
  useFrame(() => { composer.render(); }, 1);
  const cam = camera as THREE.PerspectiveCamera;
  const target = world.update(f, cam, scene);
  noInkFallback(world.root);
  if (typeof def.ink === "function") fx.ink.set(def.ink(f));
  const d = def.dof(f);
  cam.getWorldDirection(fwd);
  if (d.focus) fpt.set(...d.focus); else fpt.copy(target);
  fx.lens.focus = Math.max(0.3, fpt.sub(cam.position).dot(fwd));
  fx.lens.cInf = d.cInf;
  return <primitive object={world.root} dispose={null} />;
};

const dpr = () => (getInputProps() as { post?: { dpr?: number } }).post?.dpr;

export const makeStage = (def: SceneDef): React.FC => () => {
  const f = useCurrentFrame();
  const fade = Math.max(1 - clamp01(f / 14), clamp01((f - (def.total - 18)) / 16));
  const veils = [...(def.overlays?.(f) ?? []), { c: "#000", o: fade }].filter((v) => v.o > 0.003);
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <ThreeCanvas width={1080} height={1920} {...(dpr() ? { dpr: dpr() } : {})} gl={{ antialias: false, stencil: false, powerPreference: "high-performance", toneMappingExposure: 1.0 }}
        camera={{ fov: 40, near: 0.2, far: 900 }}>
        <Inner def={def} />
      </ThreeCanvas>
      {def.hud?.(f)}
      {veils.map((v, i) => <AbsoluteFill key={i} style={{ background: v.c, opacity: Math.min(1, v.o) }} />)}
    </AbsoluteFill>
  );
};
