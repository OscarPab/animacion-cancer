#!/bin/bash
# uso: scripts/finish.sh <n> [<n> ...]  -> une out/Escena<n>/video.mp4 con audio/escena<n>_mix.wav
mkdir -p out/final
for n in "$@"; do
  out="out/final/Cancer de Mama - Escena $n.mp4"
  ffmpeg -y -v error -i out/Escena$n/video.mp4 -i audio/escena${n}_mix.wav -map 0:v:0 -map 1:a:0 -c:v copy -af "loudnorm=I=-15:TP=-1.5:LRA=11" -ar 48000 -c:a aac -b:a 192k -shortest -movflags +faststart "$out"
  echo "== Escena $n -> $out"
done
