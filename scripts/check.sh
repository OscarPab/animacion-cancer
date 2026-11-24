#!/bin/bash
# uso: scripts/check.sh <Composición> <seg,seg,...>  -> out/chk/<Composición>.jpg (hoja de contactos)
id=$1; frames=$(python -c "print(','.join(str(round(float(x)*30)) for x in '$2'.split(',')))")
rm -rf out/chk/$id; mkdir -p out/chk/$id
CHROME="C:/Program Files/Google/Chrome/Application/chrome.exe" node scripts/stills.mjs out/chk/$id/x_ $frames 0.5 $id 2>&1 | grep -iv "clock\|^still" | head -8
python scripts/sheet.py out/chk/$id.jpg $(for f in ${frames//,/ }; do echo out/chk/$id/x_$f.jpg; done)
