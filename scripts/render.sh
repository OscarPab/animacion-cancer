#!/bin/bash
# uso: scripts/render.sh <Composición> [<Composición> ...]  -> out/<Composición>/video.mp4 (1440x2560, sin audio)
for id in "$@"; do
  mkdir -p out/$id
  npx remotion render src/index.ts $id out/$id/video.mp4 --codec h264 --crf 16 --scale 1.3333333333333333 --gl=angle --browser-executable "C:/Program Files/Google/Chrome/Application/chrome.exe" --timeout 180000 --log=error > out/$id/render.log 2>&1
  echo "$id exit $? $(ls -la out/$id/video.mp4 2>/dev/null | awk '{print $5}')"
done
