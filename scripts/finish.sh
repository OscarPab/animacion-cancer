#!/bin/bash
# uso: scripts/finish.sh <n> [<n> ...]  -> une out/Escena<n>/video.mp4 con audio/escena<n>_mix.wav y pasa el control de calidad
export PATH="$LOCALAPPDATA/Microsoft/WinGet/Packages/Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-9.0.2-full_build/bin:$PATH"
for n in "$@"; do
  out="../Cancer de Mama - Escena $n.mp4"
  ffmpeg -y -v error -i out/Escena$n/video.mp4 -i audio/escena${n}_mix.wav -map 0:v:0 -map 1:a:0 -c:v copy -af "loudnorm=I=-15:TP=-1.5:LRA=11" -ar 48000 -c:a aac -b:a 256k -shortest -movflags +faststart "$out"
  echo "== Escena $n"; PYTHONIOENCODING=utf-8 python scripts/short_qa.py "$out" out/Escena$n/qa 2>&1 | grep -E "SPECS|LOUDNESS|SILENCES|FRAMES|MOTION"
done
