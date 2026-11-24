# Sonido de la Escena 1, todo sintetizado (numpy): latido, zumbido/pulso de suspenso tecnológico, barridos en los
# cortes, alarma del núcleo, falla del ADN, reloj que se acelera con las divisiones y golpe final. La música se
# atenúa bajo la voz. Los tiempos salen de las mismas palabras que la imagen (src/videos/escena1/story.ts).
# uso: python audio/make_audio.py  ->  audio/escena1_mix.wav (48 kHz estéreo, 34.5 s) + pistas sueltas
import json, math, os, wave
import numpy as np

SR, DUR = 48000, 34.5
N = int(SR * DUR)
HERE = os.path.dirname(os.path.abspath(__file__))
rs = np.random.RandomState(7)
W = dict(pero=7.32, sola=8.73, ignorar=10.11, eso=11.96, noEs=14.35, rebelion=16.52, comienza=18.48, conductos=21.39,
         lobulillos=23.99, por=25.65, mutacion=26.02, lasCelulas=27.49, desactivan=28.1, comienzan=30.12, control=31.85)
NT = 70
K = math.log(NT / 7) / 2.15
def birth(i):
    if i == 1: return W["desactivan"]
    if i <= 3: return 28.9 + 0.06 * (i - 2)
    if i <= 6: return 29.6 + 0.06 * (i - 4)
    return W["comienzan"] + math.log((i + 1) / 7) / K

def tt(d): return np.arange(int(SR * d)) / SR
def put(buf, x, t0, g=1.0, pan=0.0):
    i = int(t0 * SR)
    if i >= N: return
    x = x[: N - i]
    buf[i:i + len(x), 0] += x * g * math.cos((pan + 1) * math.pi / 4)
    buf[i:i + len(x), 1] += x * g * math.sin((pan + 1) * math.pi / 4)
def lp(x, fc):  # paso bajo de un polo
    a = math.exp(-2 * math.pi * fc / SR); y = np.empty_like(x); s = 0.0
    for i, v in enumerate(x): s = a * s + (1 - a) * v; y[i] = s
    return y
def lpf(x, fc):  # paso bajo rápido (FFT)
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR)
    return np.fft.irfft(X / (1 + (f / fc) ** 4), len(x))
def hpf(x, fc):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR)
    return np.fft.irfft(X * (f / fc) ** 4 / (1 + (f / fc) ** 4), len(x))

def thump(f0=62, d=0.32, drop=0.5):
    t = tt(d); f = f0 * (drop + (1 - drop) * np.exp(-t * 18))
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 11) * np.minimum(1, t * 400)
def whoosh(d=0.9, f1=300, f2=3500):
    n = rs.randn(int(SR * d)); t = tt(d); u = t / d
    env = np.sin(np.pi * u) ** 2
    lo, hi = lpf(n, f1), lpf(n, f2)
    return (lo * (1 - u) + hi * u) * env * 0.5
def boom(d=2.2):
    t = tt(d)
    return (np.sin(2 * np.pi * np.cumsum(38 + 50 * np.exp(-t * 9)) / SR) * np.exp(-t * 2.2) + 0.35 * lpf(rs.randn(len(t)), 900) * np.exp(-t * 7)) * np.minimum(1, t * 300)
def beep(f=1320, d=0.09):
    t = tt(d); return np.sin(2 * np.pi * f * t) * np.minimum(1, t * 600) * np.exp(-t * 28)
def pop(f=520, d=0.16):
    t = tt(d); return np.sin(2 * np.pi * np.cumsum(f * (0.5 + 1.2 * np.exp(-t * 30))) / SR) * np.exp(-t * 26) * np.minimum(1, t * 800)
def tick(d=0.035):
    t = tt(d); return (hpf(rs.randn(len(t)), 2500) * 0.6 + np.sin(2 * np.pi * 2900 * t)) * np.exp(-t * 160)
def pluck(f, d=0.35):
    t = tt(d); x = sum(np.sin(2 * np.pi * f * k * t) / k ** 1.6 for k in (1, 2, 3, 4))
    return x * np.exp(-t * 9) * np.minimum(1, t * 500) * 0.3
def bell(f, d=1.6):
    t = tt(d); return (np.sin(2 * np.pi * f * t) + 0.5 * np.sin(2 * np.pi * f * 2.76 * t) * np.exp(-t * 4) + 0.25 * np.sin(2 * np.pi * f * 5.4 * t) * np.exp(-t * 7)) * np.exp(-t * 2.6) * np.minimum(1, t * 800) * 0.3

music = np.zeros((N, 2)); sfx = np.zeros((N, 2))
t = np.arange(N) / SR

# ---- música: zumbido grave en re menor + pulso de semicorcheas que crece con la tensión ----
D2 = 73.42
def env_pts(pts):
    return np.interp(t, [p[0] for p in pts], [p[1] for p in pts])
drone = np.zeros(N)
for f, g in ((D2 / 2, 0.9), (D2, 0.7), (D2 * 1.5, 0.35), (D2 * 2, 0.25), (D2 * 2.378, 0.2)):  # re, la, re, fa
    drone += g * np.sin(2 * np.pi * f * t + 0.6 * np.sin(2 * np.pi * 0.11 * t + f)) * (1 + 0.25 * np.sin(2 * np.pi * (0.07 + f / 3000) * t))
saw = sum(np.sin(2 * np.pi * D2 * k * t) / k for k in range(1, 9))
drone += 0.22 * lpf(saw, 500) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.19 * t))
drone *= env_pts([(0, 0), (1.5, 0.5), (7.3, 0.6), (11.9, 0.95), (12.0, 0.75), (18.4, 0.8), (18.9, 0.5), (25.6, 0.55), (27.4, 0.8), (31.9, 1.0), (33.2, 0.8), (34.5, 0)])
music[:, 0] += 0.2 * drone; music[:, 1] += 0.2 * drone
BPM = 108; STEP = 60 / BPM / 4
SCALE = [146.83, 174.61, 220.0, 164.81, 146.83, 233.08, 220.0, 174.61]  # re fa la mi re sib la fa
k, tp = 0, W["pero"]
while tp < 33.0:
    sec = "calm" if tp < W["eso"] else "dark" if tp < W["comienza"] else "tree" if tp < W["por"] else "dna" if tp < W["lasCelulas"] else "grow"
    g = {"calm": 0.35, "dark": 0.6, "tree": 0.45, "dna": 0.3, "grow": 0.8}[sec]
    if sec == "grow": g *= 0.6 + 0.4 * (tp - W["lasCelulas"]) / 5
    f = SCALE[k % 8] * (2 if sec == "tree" and k % 4 == 2 else 1) * (0.5 if sec in ("dark", "grow") and k % 2 else 1)
    if not (sec == "calm" and k % 2): put(music, pluck(f), tp, g * 0.5, pan=0.5 * math.sin(k * 0.9))
    if sec in ("dark", "grow") and k % 4 == 0: put(music, thump(52, 0.3, 0.6), tp, 0.35 if sec == "dark" else 0.5)
    k += 1; tp += STEP
for i, (tb, f) in enumerate([(W["comienza"] + 0.1, 587.33), (W["conductos"], 880.0), (W["lobulillos"], 1174.66)]): put(music, bell(f), tb, 0.5, pan=-0.3 + 0.3 * i)
# subida de tensión hasta "Eso es el cáncer de mama"
d = W["eso"] - W["ignorar"]; tr = tt(d); u = tr / d
riser = np.sin(2 * np.pi * np.cumsum(180 * 2 ** (1.6 * u)) / SR) * u ** 2 * 0.22 + lpf(rs.randn(len(tr)), 2500) * u ** 3 * 0.25
put(music, riser, W["ignorar"], 0.7)

# ---- efectos ----
for i, tb in enumerate(np.arange(0.25, 7.2, 0.86)):  # latido profundo (lub-dub), se va apagando bajo la voz
    g = 1.0 if tb < 2.1 else 0.42
    put(sfx, thump(60), tb, g); put(sfx, thump(50, 0.26), tb + 0.2, g * 0.75)
put(sfx, whoosh(1.5, 250, 5000), 1.1, 0.9)  # caída hacia la piel
put(sfx, lpf(whoosh(2.2, 400, 1800), 1400), 2.3, 0.5)  # descenso por el tejido
for tc, g in ((W["pero"], 0.5), (W["sola"] - 0.35, 0.45), (W["noEs"] - 0.3, 0.4), (W["rebelion"] - 0.4, 0.5), (W["comienza"] - 0.15, 0.6), (W["lobulillos"] - 0.5, 0.45), (W["por"] - 0.1, 0.6), (W["lasCelulas"] - 0.2, 0.5)):
    put(sfx, whoosh(0.6, 300, 4000), tc - 0.1, g, pan=0.3 if int(tc * 10) % 2 else -0.3)
for j in range(8):  # alarma: el núcleo parpadea en rojo
    if j % 2 == 0: put(sfx, beep(1320 if j < 6 else 1568), W["ignorar"] + j * 0.2, 0.35)
put(sfx, boom(2.6), W["eso"], 1.0)  # destello rojo
put(sfx, lpf(rs.randn(int(SR * 1.6)), 300) * np.linspace(0, 1, int(SR * 1.6)) ** 2 * 0.5, W["rebelion"] - 0.3, 0.6)  # la célula se deforma
g = tt(0.5); glitch = np.sign(np.sin(2 * np.pi * 90 * g)) * (rs.rand(len(g)) > 0.45) * np.exp(-g * 6) * 0.3  # falla del ADN
put(sfx, hpf(glitch, 300), W["mutacion"], 0.8); put(sfx, beep(220, 0.3), W["mutacion"], 0.6); put(sfx, thump(70, 0.25), W["mutacion"], 0.8)
tk, iv, j = W["lasCelulas"], 0.5, 0  # reloj que avanza cada vez más rápido
while tk < 32.6:
    put(sfx, tick() * (1.0 if j % 2 == 0 else 0.7), tk, 0.5 + 0.3 * (tk - W["lasCelulas"]) / 5, pan=-0.4 if j % 2 else 0.4)
    tk += iv; iv = max(0.055, iv * 0.9); j += 1
for i in range(1, NT):  # cada división
    put(sfx, pop(380 + 40 * (i % 7)), birth(i), 0.7 if i < 7 else 0.28, pan=math.sin(i * 1.7) * 0.6)
for tb in (W["desactivan"], 28.9, 29.6): put(sfx, thump(58, 0.3), tb, 0.8)
put(sfx, boom(2.6), W["control"], 1.1)

# ---- voz y mezcla ----
with wave.open(os.path.join(HERE, "..", "voice", "escena1", "voice.wav")) as f:
    v = np.frombuffer(f.readframes(f.getnframes()), np.int16).astype(np.float64) / 32768
voice = np.zeros(N); voice[: min(N, len(v))] = v[:N]
envv = lpf(np.abs(voice), 6)
envv = np.maximum(envv, np.roll(envv, int(0.15 * SR)))  # se sostiene un poco tras cada palabra
duck = 1 - 0.6 * np.clip(envv / 0.05, 0, 1)
duck = lpf(duck, 8)
mix = music * (0.85 * duck)[:, None] + sfx * (0.42 * (0.55 + 0.45 * duck))[:, None] + voice[:, None] * 1.0
fade = np.minimum(1, np.minimum(t / 0.05, (DUR - t) / 0.6)); mix *= fade[:, None]
mix = np.tanh(mix * 1.1) / 1.1  # limitador suave
peak = np.abs(mix).max(); mix *= 0.84 / max(peak, 1e-9)
def save(name, x):
    with wave.open(os.path.join(HERE, name), "wb") as f:
        f.setnchannels(2); f.setsampwidth(2); f.setframerate(SR); f.writeframes((np.clip(x, -1, 1) * 32767).astype(np.int16).tobytes())
save("escena1_mix.wav", mix); save("escena1_music.wav", music * 0.85); save("escena1_sfx.wav", sfx * 0.42)
print("mezcla lista:", round(len(mix) / SR, 2), "s; pico", round(20 * math.log10(np.abs(mix).max()), 1), "dBFS")
