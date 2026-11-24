#!/bin/bash
# uso: scripts/check.sh <Composición> <seg,seg,...>  -> out/chk/<Composición>.jpg (hoja de contactos)
id=$1; frames=$(python3 -c "print(','.join(str(round(float(x)*30)) for x in '$2'.split(',')))")
rm -rf out/chk/$id; mkdir -p out/chk/$id
if [ -z "$CHROME" ]; then
  if [ -x "/opt/google/chrome/chrome" ]; then export CHROME="/opt/google/chrome/chrome"
  elif [ -x "/usr/bin/google-chrome" ]; then export CHROME="/usr/bin/google-chrome"
  else export CHROME="C:/Program Files/Google/Chrome/Application/chrome.exe"; fi
fi
node scripts/stills.mjs out/chk/$id/x_ $frames 0.45 $id 2>&1 | grep -iv "clock\|^still" | head -20
python3 scripts/sheet.py out/chk/$id.jpg $(for f in ${frames//,/ }; do echo out/chk/$id/x_$f.jpg; done)
echo "still" $id $frames
