# hoja de contactos: python scripts/sheet.py salida.jpg img1 img2 ... (4 por fila)
import sys, os
from PIL import Image, ImageDraw
out, files = sys.argv[1], sys.argv[2:]
w, h, cols = 405, 720, 4
S = Image.new("RGB", (w * cols, h * ((len(files) + cols - 1) // cols)), "black"); d = ImageDraw.Draw(S)
for i, f in enumerate(files):
    x, y = (i % cols) * w, (i // cols) * h
    S.paste(Image.open(f).convert("RGB").resize((w, h)), (x, y))
    d.rectangle([x, y, x + 60, y + 14], fill="black"); d.text((x + 3, y + 2), os.path.basename(f).split("_")[-1].split(".")[0], fill="yellow")
S.save(out, quality=88)
