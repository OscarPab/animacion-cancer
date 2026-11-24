#!/bin/bash
# uso: scripts/render.sh <Composición> [<Composición> ...]  -> out/<Composición>/video.mp4 (1440x2560, sin audio)
CHROME="${CHROME:-}"
if [ -z "$CHROME" ]; then
  if [ -x "/opt/google/chrome/chrome" ]; then CHROME="/opt/google/chrome/chrome"
  elif [ -x "/usr/bin/google-chrome" ]; then CHROME="/usr/bin/google-chrome"
  else CHROME="C:/Program Files/Google/Chrome/Application/chrome.exe"; fi
fi
for id in "$@"; do
  mkdir -p out/$id
  npx remotion render src/index.ts $id out/$id/video.mp4 --codec h264 --crf 18 --scale 1.3333333333333333 --gl=angle --browser-executable "$CHROME" --timeout 180000 --concurrency=1 --log=error > out/$id/render.log 2>&1
  echo "$id exit $? $(ls -la out/$id/video.mp4 2>/dev/null | awk '{print $5}')"
done
