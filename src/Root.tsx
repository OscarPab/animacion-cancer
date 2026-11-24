import React from "react";
import { Composition } from "remotion";
import { Escena1, ESCENA1_FRAMES } from "./videos/escena1/Escena1";
import { makeStage } from "./shared/Stage";
import { escena2 } from "./videos/escena2";
import { escena3 } from "./videos/escena3";
import { escena4 } from "./videos/escena4";
import { escena5 } from "./videos/escena5";
import { escena6 } from "./videos/escena6";
import { escena7 } from "./videos/escena7";

const scenes = { Escena2: escena2, Escena3: escena3, Escena4: escena4, Escena5: escena5, Escena6: escena6, Escena7: escena7 };
export const Root: React.FC = () => (
  <>
    <Composition id="Escena1" component={Escena1} durationInFrames={ESCENA1_FRAMES} fps={30} width={1080} height={1920} />
    {Object.entries(scenes).map(([id, def]) => <Composition key={id} id={id} component={makeStage(def)} durationInFrames={def.total} fps={30} width={1080} height={1920} />)}
  </>
);
