# Animación: El cáncer de mama — biología, detección y fronteras tecnológicas (2026)

Cortometraje documental animado en 3D (vertical 1440×2560, 30 fps) sobre el cáncer de mama: cómo nace y se disemina un tumor, qué ocurre hoy en México, los límites de la mastografía frente al ultrasonido, la inteligencia artificial y los biosensores acústicos, las terapias dirigidas (ADC), y un cierre en el que la lucha sigue abierta. Narran cuatro voces: **Fernando, Santiago, Emiliano y Óscar**.

Todo se renderiza en código —three.js dentro de [Remotion](https://www.remotion.dev/)— y el sonido (música y efectos) se sintetiza con Python. No se usa ningún generador de video con IA. La técnica sigue el skill [`claude-animated-shorts`](https://github.com/mromidev/claude-animated-shorts) (licencia MIT): tinta de contorno, desenfoque de lente, cámaras que se deslizan y etalonaje. El mundo de cada escena es propio y procedural, sin modelos externos.

## Estado

| Pieza | Estado |
|---|---|
| Guion v1 (6 escenas) — [`guion/guion-v1-6-escenas.pdf`](guion/guion-v1-6-escenas.pdf) | Versión anterior. Su conclusión esperanzadora ya no se anima. |
| Guion v2 (7 escenas) — [`guion/guion-v2-7-escenas.pdf`](guion/guion-v2-7-escenas.pdf) | **Animado.** Es el guion de este repositorio. |

## Qué cuenta el guion v2

1. El universo microscópico y la mutación.
2. Angiogénesis y metástasis.
3. **La cruda realidad en México:** mapa, contador (8,384 mujeres en 2024), 23 al día y la tasa 15.7 → 18.7.
4. **Riesgos de la radiación y valor del ultrasonido:** compresión, rayos X, daño al ADN, mama densa; luego el ultrasonido sin radiación.
5. Inteligencia artificial y biosensor acústico (UNAM, ecuación de Sauerbrey).
6. Terapias dirigidas, ADC (HER2 / TROP2).
7. **Una lucha que sigue abierta.**

El PDF repite el número «Escena 5» y, bajo el título de inteligencia artificial, vuelve a pegar el texto de la v1 en el que la mastografía «salva millones de vidas». Ese bloque contradice la escena 4 y no se anima. Cada título queda emparejado con su diálogo: la 5 es la IA y el biosensor, la 6 son los ADC.

La última página se corta en «la física, la acústica y la biotecnología tienen». La frase de Óscar se cierra en voz con el propio título de la escena: salir del laboratorio, llegar a la clínica, y que la lucha sigue abierta. Las cifras de la escena 3 se muestran como las trae el guion (atribuidas al INEGI) y no se contrastaron con la publicación original.

## Estructura

```
guion/                 Guiones en PDF (v1 animado, v2 pendiente)
src/
  index.ts, Root.tsx   Registro de las composiciones (Escena1 … Escena7)
  shared/              Base común: cámara, lente, luces (kit.ts), escenario con postproceso (Stage.tsx), piezas biológicas (bio.ts), contorno de México (mexico.ts)
  videos/escena1/      Escena 1 (story.ts, world.ts, Escena1.tsx y los pases de tinta, lente y color)
  videos/escena2.ts … escena7.tsx   Una escena por archivo
voice/                 gen_voice.py y, por escena, words.json (tiempos por palabra) y lines.json
audio/                 make_audio.py (escena 1) y mix.py (escenas 2-6): música y efectos sintetizados y mezcla
scripts/               render.sh, finish.sh, check.sh, stills.mjs, sheet.py, short_qa.py
```

Cada plano de cámara y cada efecto de sonido se coloca sobre las palabras de la voz (`T("palabra")` lee `words.json`), así que si cambia el texto hay que regenerar la voz antes que la imagen.

## Cómo reproducirlo

Requisitos: Node 22+, Python 3.12+ (`pip install edge-tts numpy scipy pillow`), ffmpeg y Google Chrome. Los scripts `.sh` están pensados para Windows con Git Bash: `finish.sh` busca ffmpeg en la ruta de winget y `render.sh` usa Chrome en `C:/Program Files/Google/Chrome`; ajusta esas rutas en otro sistema.

```bash
npm install

# 1. Voces (edge-tts, una voz por narrador) y tiempos por palabra
python voice/gen_voice.py escena1 escena2 escena3 escena4 escena5 escena6 escena7

# 2. Sonido
python audio/make_audio.py                                             # escena 1
python audio/mix.py escena2 escena3 escena4 escena5 escena6 escena7    # escenas 2-7

# 3. Vista previa de fotogramas (hoja de contactos en out/chk/)
scripts/check.sh Escena3 2,12,28,48

# 4. Render y unión con el audio
scripts/render.sh Escena1 Escena2 Escena3 Escena4 Escena5 Escena6 Escena7
scripts/finish.sh 1 2 3 4 5 6 7
```

`finish.sh` deja `out/final/Cancer de Mama - Escena N.mp4`. Para ver una composición en vivo: `npx remotion studio src/index.ts`.

## Qué no está en el repositorio

Los videos y los `.wav`/`.mp3` generados no se versionan (se regeneran con los pasos de arriba; el video completo pesa más de 300 MB y supera el límite de GitHub por archivo). Tampoco se incluyen `node_modules/` ni `out/`.

## Créditos

- Técnica y plantillas de referencia: [mromidev/claude-animated-shorts](https://github.com/mromidev/claude-animated-shorts) (código y documentos bajo MIT; sus fotogramas de referencia son solo para estudio y no se incluyen aquí).
- Voces sintéticas: Microsoft Edge TTS vía [`edge-tts`](https://github.com/rany2/edge-tts).
- Animación y sonido generados con Claude Code.
