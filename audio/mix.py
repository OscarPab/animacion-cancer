# Sonido de las escenas 2-6, todo sintetizado (numpy): música (zumbido + pulso) por secciones, efectos colocados
# sobre las mismas palabras de la voz que usa la imagen, y mezcla con la música atenuada bajo la voz.
# uso: python audio/mix.py escena2 [escena3 ...]  ->  audio/<escena>_mix.wav (48 kHz estéreo)
import json, math, os, sys, unicodedata, wave
import numpy as np

SR = 48000
HERE = os.path.dirname(os.path.abspath(__file__))
rs = np.random.RandomState(7)

def tt(d): return np.arange(int(SR * d)) / SR
def lpf(x, fc):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR); return np.fft.irfft(X / (1 + (f / fc) ** 4), len(x))
def hpf(x, fc):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR); return np.fft.irfft(X * (f / fc) ** 4 / (1 + (f / fc) ** 4), len(x))
def thump(f0=60, d=0.32, drop=0.5):
    t = tt(d); f = f0 * (drop + (1 - drop) * np.exp(-t * 18)); return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 11) * np.minimum(1, t * 400)
def whoosh(d=0.6, f1=300, f2=4000):
    n = rs.randn(int(SR * d)); u = tt(d) / d; return (lpf(n, f1) * (1 - u) + lpf(n, f2) * u) * np.sin(np.pi * u) ** 2 * 0.5
def boom(d=2.4):
    t = tt(d); return (np.sin(2 * np.pi * np.cumsum(38 + 50 * np.exp(-t * 9)) / SR) * np.exp(-t * 2.2) + 0.35 * lpf(rs.randn(len(t)), 900) * np.exp(-t * 7)) * np.minimum(1, t * 300)
def beep(f=1320, d=0.09):
    t = tt(d); return np.sin(2 * np.pi * f * t) * np.minimum(1, t * 600) * np.exp(-t * 28)
def pop(f=520, d=0.16):
    t = tt(d); return np.sin(2 * np.pi * np.cumsum(f * (0.5 + 1.2 * np.exp(-t * 30))) / SR) * np.exp(-t * 26) * np.minimum(1, t * 800)
def tick(d=0.035):
    t = tt(d); return (hpf(rs.randn(len(t)), 2500) * 0.6 + np.sin(2 * np.pi * 2900 * t)) * np.exp(-t * 160)
def pluck(f, d=0.35):
    t = tt(d); return sum(np.sin(2 * np.pi * f * k * t) / k ** 1.6 for k in (1, 2, 3, 4)) * np.exp(-t * 9) * np.minimum(1, t * 500) * 0.3
def bell(f=880, d=1.8):
    t = tt(d); return (np.sin(2 * np.pi * f * t) + 0.5 * np.sin(2 * np.pi * f * 2.76 * t) * np.exp(-t * 4) + 0.25 * np.sin(2 * np.pi * f * 5.4 * t) * np.exp(-t * 7)) * np.exp(-t * 2.6) * np.minimum(1, t * 800) * 0.3
def riser(d=1.6):
    u = tt(d) / d; return np.sin(2 * np.pi * np.cumsum(180 * 2 ** (1.6 * u)) / SR) * u ** 2 * 0.22 + lpf(rs.randn(len(u)), 2500) * u ** 3 * 0.25
def glitch(d=0.5):
    g = tt(d); return hpf(np.sign(np.sin(2 * np.pi * 90 * g)) * (rs.rand(len(g)) > 0.45) * np.exp(-g * 6) * 0.3, 300)
def hum(d, f0, f1, tdrop, ddrop=3.2):  # zumbido del cristal: baja de f0 a f1 a partir de tdrop
    t = tt(d); f = f0 + (f1 - f0) * np.clip((t - tdrop) / ddrop, 0, 1); ph = 2 * np.pi * np.cumsum(f) / SR
    return (np.sin(ph) + 0.4 * np.sin(2 * ph) + 0.2 * np.sin(3 * ph)) * np.minimum(1, t * 2) * np.minimum(1, (d - t) * 2) * 0.25 * (1 + 0.3 * np.sin(2 * np.pi * 6 * t))
FX = dict(thump=thump, whoosh=whoosh, boom=boom, beep=beep, pop=pop, tick=tick, bell=bell, riser=riser, glitch=glitch, hum=hum)

# modo: (ganancia del pulso, octava grave en notas impares, bombo cada 4)
MOODS = dict(calm=(0.35, False, 0), dark=(0.6, True, 0.35), light=(0.45, False, 0), data=(0.4, False, 0), grow=(0.8, True, 0.5), hope=(0.6, False, 0.25), none=(0, False, 0))
MINOR = [146.83, 174.61, 220.0, 164.81, 146.83, 233.08, 220.0, 174.61]
MAJOR = [146.83, 185.0, 220.0, 293.66, 220.0, 185.0, 164.81, 220.0]

def build(name, spec):
    words = json.load(open(os.path.join(HERE, "..", "voice", name, "words.json"), encoding="utf-8"))
    end = json.load(open(os.path.join(HERE, "..", "voice", name, "lines.json"), encoding="utf-8"))["end"]
    norm = lambda s: "".join(c for c in unicodedata.normalize("NFD", s.lower()) if unicodedata.category(c) != "Mn")
    def T(w, nth=0):
        ex = [x for x in words if norm(x["w"]) == norm(w)]; h = ex or [x for x in words if norm(x["w"]).startswith(norm(w))]; return h[nth]["t"]
    DUR = math.ceil((end + spec.get("tail", 2.2)) * 30) / 30; N = int(SR * DUR); t = np.arange(N) / SR
    music = np.zeros((N, 2)); sfx = np.zeros((N, 2))
    def put(buf, x, t0, g=1.0, pan=0.0):
        i = int(max(0, t0) * SR)
        if i >= N: return
        x = x[: N - i]; buf[i:i + len(x), 0] += x * g * math.cos((pan + 1) * math.pi / 4); buf[i:i + len(x), 1] += x * g * math.sin((pan + 1) * math.pi / 4)
    major = spec.get("major", False); D2 = 73.42
    drone = np.zeros(N)
    for f, g in ((D2 / 2, 0.9), (D2, 0.7), (D2 * 1.5, 0.35), (D2 * 2, 0.25), (D2 * (2.52 if major else 2.378), 0.2)):
        drone += g * np.sin(2 * np.pi * f * t + 0.6 * np.sin(2 * np.pi * 0.11 * t + f)) * (1 + 0.25 * np.sin(2 * np.pi * (0.07 + f / 3000) * t))
    drone += 0.22 * lpf(sum(np.sin(2 * np.pi * D2 * k * t) / k for k in range(1, 9)), 500) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.19 * t))
    secs = [(a if isinstance(a, (int, float)) else T(*a) if isinstance(a, tuple) else T(a), m) for a, m in spec["sections"]]
    lvl = dict(calm=0.55, dark=0.85, light=0.5, data=0.6, grow=0.95, hope=0.8, none=0.4)
    pts = [(0, 0), (1.2, lvl[secs[0][1]])] + [(a, lvl[m]) for a, m in secs[1:]] + [(DUR - 1.2, 0.6), (DUR, 0)]
    drone *= np.interp(t, [p[0] for p in pts], [p[1] for p in pts])
    music[:, 0] += 0.2 * drone; music[:, 1] += 0.2 * drone
    STEP = 60 / 108 / 4; k = 0; tp = 1.0
    while tp < DUR - 1.5:
        mood = [m for a, m in secs if a <= tp][-1]; g, low, kick = MOODS[mood]
        sc = MAJOR if (major or mood == "hope") else MINOR
        f = sc[k % 8] * (2 if mood in ("light", "hope") and k % 4 == 2 else 1) * (0.5 if low and k % 2 else 1)
        if g and not (mood in ("calm", "data") and k % 2): put(music, pluck(f), tp, g * 0.5, pan=0.5 * math.sin(k * 0.9))
        if kick and k % 4 == 0: put(music, thump(52, 0.3, 0.6), tp, kick)
        k += 1; tp += STEP
    for ev in spec["events"](T):
        kind, t0, g = ev[0], ev[1], ev[2]; args = ev[3] if len(ev) > 3 else ()
        put(music if kind in ("bell", "riser") else sfx, FX[kind](*args), t0, g, pan=0.35 * math.sin(t0 * 3.7))
    with wave.open(os.path.join(HERE, "..", "voice", name, "voice.wav")) as f:
        v = np.frombuffer(f.readframes(f.getnframes()), np.int16).astype(np.float64) / 32768
    voice = np.zeros(N); voice[: min(N, len(v))] = v[:N]
    envv = lpf(np.abs(voice), 6); envv = np.maximum(envv, np.roll(envv, int(0.15 * SR)))
    duck = lpf(1 - 0.6 * np.clip(envv / 0.05, 0, 1), 8)
    mix = music * (0.85 * duck)[:, None] + sfx * (0.42 * (0.55 + 0.45 * duck))[:, None] + voice[:, None]
    mix *= np.minimum(1, np.minimum(t / 0.05, (DUR - t) / 0.7))[:, None]
    mix = np.tanh(mix * 1.1) / 1.1; mix *= 0.84 / max(np.abs(mix).max(), 1e-9)
    with wave.open(os.path.join(HERE, name + "_mix.wav"), "wb") as f:
        f.setnchannels(2); f.setsampwidth(2); f.setframerate(SR); f.writeframes((np.clip(mix, -1, 1) * 32767).astype(np.int16).tobytes())
    print(name, "mezcla", round(DUR, 2), "s")

def s2(T):
    a, fe, br, fl, bo, inv, me = T("angiog"), T("alimentarlo"), T("rompen"), T("viajando"), T("colonizar"), T("invasivo"), T("metastasis")
    return ([("riser", a - 1.6, 0.6), ("whoosh", a - 0.1, 0.5), ("boom", fe, 0.8), ("whoosh", T("si") - 0.1, 0.5), ("boom", br + 0.55, 0.9), ("whoosh", fl - 0.3, 1.0, (1.6, 250, 5000)),
             ("whoosh", bo - 0.2, 0.7), ("thump", bo + 1.55, 1.0), ("boom", me, 1.1)]
            + [("pop", a + 0.1 + 0.2 * i, 0.4, (300 + 40 * i,)) for i in range(7)] + [("thump", fe + 0.8 * i, 0.6) for i in range(1, 3)]
            + [("pop", x, 0.6) for x in (inv, inv + 0.55, inv + 1.0)] + [("pop", me + i / 9, 0.3, (420 + 30 * i,)) for i in range(7)])
def s3(T):
    ma, ra, sc, us, to, wa, cy, tu, bi = T("mastografia"), T("rayos"), T("para") - 0.05, T("y") - 0.1, T("ultrasonido"), T("ondas"), T("quiste"), T("tumor"), T("biopsia")
    return ([("whoosh", ma - 0.1, 0.5), ("thump", ma + 1.7, 0.8), ("whoosh", sc - 0.1, 0.5), ("bell", T("anomalias"), 0.6, (1174.66,)), ("whoosh", us - 0.1, 0.6), ("thump", to, 0.7),
             ("bell", cy + 0.3, 0.6, (1318.5,)), ("boom", tu + 0.2, 0.8), ("beep", bi, 0.4, (880, 0.2))]
            + [x for i in range(3) for x in (("beep", ra + 0.4 * i, 0.5, (1760, 0.12)), ("thump", ra + 0.4 * i, 0.7, (80, 0.2)))]
            + [("bell", wa + 0.42 * i, 0.22, (660 * 2 ** ((i % 6) / 12), 0.7)) for i in range(18)])
def s4(T):
    ai, co, fi, la, bio, oro, anc, vib, hit, slow, rev, na = T("primero"), T("analizando"), T("identificando"), T("aun") - 0.1, T("biosensor"), T("oro"), T("anclar"), T("vibrar"), T("choque"), T("frena"), T("revelando"), T("precision")
    end = T("nanometrica") + 2.0
    return ([("whoosh", 1.3, 0.7, (2.4, 400, 6000)), ("whoosh", ai - 0.1, 0.5), ("beep", fi + 1.1, 0.5, (1568, 0.12)), ("beep", fi + 1.3, 0.5, (1568, 0.12)), ("whoosh", la - 0.2, 0.8, (0.9, 300, 5000)),
             ("bell", bio + 0.1, 0.7, (1174.66,)), ("bell", oro + 0.2, 0.6, (1567.98,)), ("whoosh", T("oro", 1) - 0.4, 0.6), ("hum", vib, 0.55, (end - vib, 330, 196, hit - vib)),
             ("boom", slow, 0.7), ("bell", rev, 0.6, (587.33,)), ("boom", na + 0.4, 1.0)]
            + [("tick", co + 0.07 * i, 0.4) for i in range(34)] + [("pop", anc + 0.05 * i, 0.16, (700 + 25 * (i % 9),)) for i in range(24)] + [("pop", hit + 0.33 * i, 0.6, (420 - 12 * i,)) for i in range(10)])
def s5(T):
    q, d, adc, cj, tr, ra, he, tp, ab, an, pe, li, so, de, mi = (T("quimioterapia"), T("danaba"), T("el", 1) - 0.1, T("conjugados"), T("caballo"), T("rastrean"), T("her"), T("trop"), T("anticuerpo") - 0.2,
        T("ancla"), T("penetra"), T("libera"), T("solo", 1), T("destruccion"), T("minimo"))
    return ([("boom", d, 0.8), ("whoosh", adc - 0.2, 0.7), ("bell", cj + 0.75, 0.6, (880,)), ("bell", cj + 1.45, 0.6, (1174.66,)), ("whoosh", tr - 0.3, 0.8, (1.2, 250, 5000)), ("whoosh", ra - 0.2, 0.7),
             ("bell", he + 0.1, 0.5, (987.77,)), ("bell", tp + 0.1, 0.5, (1318.5,)), ("whoosh", ab - 0.1, 0.5), ("thump", an, 1.0), ("whoosh", pe, 0.6, (1.2, 200, 1500)), ("glitch", so + 0.6, 0.7), ("boom", de + 0.25, 1.1),
             ("bell", mi + 0.9, 0.6, (1174.66,)), ("bell", mi + 1.2, 0.5, (1479.98,))]
            + [("tick", q + 0.11 * i, 0.3) for i in range(24)] + [("pop", an + 0.28 * i, 0.5, (500 + 40 * i,)) for i in range(1, 5)] + [("bell", li + 0.3 * i, 0.3, (1318.5 * 2 ** (i / 12), 0.8)) for i in range(5)])
def s6(T):
    return ([("bell", T("fisica"), 0.5, (587.33,)), ("bell", T("acustica"), 0.5, (739.99,)), ("bell", T("inteligencia"), 0.5, (880,)), ("bell", T("biotecnologia"), 0.5, (1174.66,)), ("boom", T("trabajan") + 1.0, 0.5),
             ("whoosh", T("la", 5) - 0.4, 0.7, (1.0, 300, 5000)), ("bell", T("detectable"), 0.5, (880,)), ("bell", T("tratable"), 0.5, (987.77,)), ("bell", T("curable"), 0.6, (1174.66,)), ("thump", T("curable") + 0.05, 0.5),
             ("bell", T("investigacion"), 0.5, (739.99,)), ("riser", T("futuro") - 0.4, 0.35, (3.2,))] + [("bell", T("favor") + 0.25 * i, 0.5, (f, 3.0)) for i, f in enumerate((587.33, 739.99, 880, 1174.66, 1479.98))])
SPECS = dict(
    escena2=dict(sections=[(0, "dark"), ("viajando", "grow"), ("colonizar", "dark"), ("invasivo", "grow")], events=s2),
    escena3=dict(sections=[(0, "calm"), ("mastografia", "data"), ("y", "calm"), ("ondas", "light")], events=s3),
    escena4=dict(sections=[(0, "data"), ("primero", "grow"), ("identificando", "data"), ("aun", "light"), ("utilizamos", "calm"), ("vibrar", "data"), ("choque", "grow")], events=s4),
    escena5=dict(sections=[(0, "calm"), ("quimioterapia", "dark"), (("el", 1), "light"), ("caballo", "grow"), ("rastrean", "data"), (("anticuerpo", 0), "grow"), ("destruccion", "hope")], events=s5),
    escena6=dict(sections=[(0, "hope")], events=s6, major=True, tail=3.6),
)
if __name__ == "__main__":
    for n in sys.argv[1:]: build(n, SPECS[n])
