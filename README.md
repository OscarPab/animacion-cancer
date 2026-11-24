# Animación: El cáncer de mama — biología, detección y fronteras tecnológicas (2026)

Cortometraje documental animado en 3D (vertical 1440×2560, 30 fps) sobre el cáncer de mama: cómo nace y se disemina un tumor, cómo se detecta hoy, qué viene con la inteligencia artificial y los biosensores acústicos, y las terapias dirigidas (ADC). Narran cuatro voces: **Fernando, Santiago, Emiliano y Óscar**.

Todo se renderiza en código —three.js dentro de [Remotion](https://www.remotion.dev/)— y el sonido (música y efectos) se sintetiza con Python. No se usa ningún generador de video con IA. La técnica sigue el skill [`claude-animated-shorts`](https://github.com/mromidev/claude-animated-shorts) (licencia MIT): tinta de contorno, desenfoque de lente, cámaras que se deslizan y etalonaje. El mundo de cada escena es propio y procedural, sin modelos externos.

## Estado

| Pieza | Estado |
|---|---|
| Guion v1 (6 escenas) — [`guion/guion-v1-6-escenas.pdf`](guion/guion-v1-6-escenas.pdf) | **Animado** completo (≈3:44) |
| Guion v2 (7 escenas) — [`guion/guion-v2-7-escenas.pdf`](guion/guion-v2-7-escenas.pdf) | **Solo guion**, la animación aún no se actualiza |

El código de este repositorio corresponde a la animación del guion v1.

## Qué cambia en el guion v2

- **Tono:** de «científico, dinámico, esperanzador» a «científico, realista y de concientización».
- **Escena 3 (nueva) — La cruda realidad en México:** mapa de la República, contador, reloj de 24 horas y gráfica de mortalidad, con cifras atribuidas al INEGI.
- **Escena 4 (nueva) — Riesgos de la radiación y valor del ultrasonido:** la mastografía se presenta por su radiación ionizante, su compresión y su menor efectividad en mamas densas; el ultrasonido, como el método actual menos invasivo.
- **Escena 7 (nueva) — Una lucha que sigue abierta:** reemplaza la conclusión esperanzadora de la v1 por un cierre de concientización.
- Las escenas de IA/biosensor y de terapias dirigidas (ADC) se conservan.

Correspondencia aproximada con lo ya animado: v1 E1 y E2 → v2 E1 y E2 sin cambios de texto; v1 E3 a E6 (mastografía y ultrasonido, IA y biosensor, ADC, conclusión) → v2 E5 a E7 con cambios; las E3 y E4 de la v2 no existen todavía en la animación.

### Pendientes del documento v2 (a revisar antes de animar)

- La numeración se repite («Escena 5» aparece dos veces) y el bloque de IA/biosensor quedó rotulado como Escena 6.
- Se conserva el texto de la v1 sobre la mastografía («salva millones de vidas utilizando rayos X de baja dosis»), que contrasta con el enfoque de riesgo de la nueva Escena 4.
- El PDF se corta al final de la página 5: la tabla de la Escena 7 queda incompleta.
- Las cifras de la Escena 3 (8,451 y 8,384 defunciones, tasas de 15.7 y 18.7, 34,000 casos, 64–72 % en etapas avanzadas) están copiadas del guion y no se verificaron contra las fuentes; conviene citar la fuente exacta en pantalla antes de publicar.

## Estructura

```
guion/                 Guiones en PDF (v1 animado, v2 pendiente)
src/
  index.ts, Root.tsx   Registro de las composiciones (Escena1 … Escena6)
  shared/              Base común: cámara, lente, luces (kit.ts), escenario con postproceso (Stage.tsx), piezas biológicas (bio.ts)
  videos/escena1/      Escena 1 (primera versión: story.ts, world.ts, Escena1.tsx y los pases de tinta, lente y color)
  videos/escena2.ts … escena6.ts(x)   Una escena por archivo
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
python voice/gen_voice.py escena1 escena2 escena3 escena4 escena5 escena6

# 2. Sonido
python audio/make_audio.py                                   # escena 1
python audio/mix.py escena2 escena3 escena4 escena5 escena6  # escenas 2-6

# 3. Vista previa de fotogramas (hoja de contactos en out/chk/)
scripts/check.sh Escena2 1,5,10,20

# 4. Render 2K y unión con el audio (+ control de calidad automático)
scripts/render.sh Escena1 Escena2 Escena3 Escena4 Escena5 Escena6
scripts/finish.sh 1 2 3 4 5 6
```

`finish.sh` deja `Cancer de Mama - Escena N.mp4` en la carpeta superior. Para ver una composición en vivo: `npx remotion studio src/index.ts`.

## Qué no está en el repositorio

Los videos y los `.wav`/`.mp3` generados no se versionan (se regeneran con los pasos de arriba; el video completo pesa más de 300 MB y supera el límite de GitHub por archivo). Tampoco se incluyen `node_modules/` ni `out/`.

## Créditos

- Técnica y plantillas de referencia: [mromidev/claude-animated-shorts](https://github.com/mromidev/claude-animated-shorts) (código y documentos bajo MIT; sus fotogramas de referencia son solo para estudio y no se incluyen aquí).
- Voces sintéticas: Microsoft Edge TTS vía [`edge-tts`](https://github.com/rany2/edge-tts).
- Animación y sonido generados con Claude Code.
