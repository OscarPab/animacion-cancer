// Escena 1 del corto "El cáncer de mama": un mundo three.js (world.ts) posado por frame desde story.ts.
// Cadena de post del skill cartoon-3d-short: InkPass (líneas de tinta) -> desenfoque de lente (pre + main) ->
// bloom (solo emisivos) -> tone mapping NEUTRAL -> etalonaje. Sin texto en pantalla.
import React, { useEffect, useMemo } from "react";
import * as THREE from "three";
import { AbsoluteFill, getInputProps, useCurrentFrame } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useFrame, useThree } from "@react-three/fiber";
import { BlendFunction, BloomEffect, EffectComposer, EffectPass, RenderPass, ToneMappingEffect, ToneMappingMode } from "postprocessing";
import { World } from "./world";
import { InkPass, noInkFallback } from "./ink";
import { LensBlur } from "./lensblur";
import { GradeEffect, GRADE_DAY2 } from "./grade";
import { DIVE, FLASH_AT, TOTAL, clamp01, dofAt, shotAt } from "./story";

export const ESCENA1_FRAMES = TOTAL;

const makeBloom = () => {
  const b = new BloomEffect({ blendFunction: BlendFunction.ADD, intensity: 0.7, luminanceThreshold: 1.0, luminanceSmoothing: 0.2, mipmapBlur: true, levels: 6, radius: 0.65 });
  const mip = b.mipmapBlurPass, setSize = mip.setSize.bind(mip);
  mip.setSize = (w: number, h: number) => setSize(Math.round((1920 * w) / Math.max(h, 1)), 1920);
  return b;
};
/** interruptores solo para fotogramas de prueba: PROPS='{"post":{"ink":false}}' */
type Toggles = { off: boolean; ink: boolean; lens: boolean; bloom: boolean; grade: boolean };
const toggles = (): Toggles => ({ off: false, ink: true, lens: true, bloom: true, grade: true, ...((getInputProps() as { post?: Partial<Toggles> }).post ?? {}) });
const fwd = new THREE.Vector3(), fpt = new THREE.Vector3();

const Inner: React.FC = () => {
  const f = useCurrentFrame();
  const { camera, scene, gl, size } = useThree();
  const world = useMemo(() => new World(), []);
  const fx = useMemo(() => ({
    ink: new InkPass(scene, camera as THREE.PerspectiveCamera, { widthNear: 4.6, widthFar: 2.8, distNear: 8, distFar: 90 }),
    lens: new LensBlur({ maxCoC: 24, nearScale: 1.2 }),
    bloom: makeBloom(),
    tone: new ToneMappingEffect({ mode: ToneMappingMode.NEUTRAL }),
    grade: new GradeEffect(GRADE_DAY2, 1),
  }), [camera, scene]);
  useEffect(() => () => fx.ink.dispose(), [fx]);
  const on = useMemo(toggles, []);
  // compositor de postprocessing manejado a mano (prioridad 1 = sustituye al render propio de R3F)
  const composer = useMemo(() => {
    if (on.off) return null;
    gl.toneMapping = THREE.NoToneMapping;
    const c = new EffectComposer(gl, { multisampling: 4, frameBufferType: THREE.HalfFloatType });
    c.addPass(new RenderPass(scene, camera));
    if (on.ink) c.addPass(fx.ink);
    if (on.lens) { c.addPass(new EffectPass(camera, fx.lens.pre)); c.addPass(new EffectPass(camera, fx.lens.main)); }
    const last = [...(on.bloom ? [fx.bloom] : []), fx.tone, ...(on.grade ? [fx.grade] : [])];
    c.addPass(new EffectPass(camera, ...last));
    return c;
  }, [gl, scene, camera, fx, on]);
  useEffect(() => { composer?.setSize(size.width, size.height); }, [composer, size]);
  useFrame(() => { composer?.render(); }, on.off ? 0 : 1);
  const cam = camera as THREE.PerspectiveCamera;
  const target = world.update(shotAt(f).id, f, cam, scene);
  noInkFallback(world.root);
  const d = dofAt(f);
  cam.getWorldDirection(fwd);
  if (d.focus) fpt.set(...d.focus(f)); else fpt.copy(target);
  fx.lens.focus = Math.max(0.3, fpt.sub(cam.position).dot(fwd));
  fx.lens.cInf = d.cInf;
  return (
    <>
      <primitive object={world.root} dispose={null} />
    </>
  );
};

const dpr = () => (getInputProps() as { post?: { dpr?: number } }).post?.dpr;

export const Escena1: React.FC = () => {
  const f = useCurrentFrame();
  const fadeIn = 1 - clamp01(f / 20);
  const fadeOut = clamp01((f - (TOTAL - 16)) / 14);
  const dip = clamp01(1 - Math.abs(f - DIVE) / 9); // atravesar la piel
  const flash = f >= FLASH_AT && f < FLASH_AT + 4 ? [0.75, 0.5, 0.28, 0.1][f - FLASH_AT] : 0;
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <ThreeCanvas width={1080} height={1920} {...(dpr() ? { dpr: dpr() } : {})} gl={{ antialias: false, stencil: false, powerPreference: "high-performance", toneMappingExposure: 1.0 }}
        camera={{ fov: 40, near: 0.2, far: 900 }}>
        <Inner />
      </ThreeCanvas>
      {dip > 0 && <AbsoluteFill style={{ background: "#f6a9a0", opacity: dip }} />}
      {flash > 0 && <AbsoluteFill style={{ background: "#ff3b30", opacity: flash }} />}
      {(fadeIn > 0 || fadeOut > 0) && <AbsoluteFill style={{ background: "#000", opacity: Math.max(fadeIn, fadeOut) }} />}
    </AbsoluteFill>
  );
};
