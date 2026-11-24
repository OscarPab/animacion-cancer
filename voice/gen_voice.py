# Genera la narración de una escena con edge-tts (una voz por narrador) y sus tiempos por palabra.
# uso: python voice/gen_voice.py <escena>   ->  voice/<escena>/voice.wav + words.json + lines.json
import asyncio, json, os, subprocess, sys, wave
import edge_tts

FFMPEG = os.environ.get("FFMPEG", "ffmpeg")
VOICES = {  # una voz masculina distinta por narrador
    "FERNANDO": ("es-MX-JorgeNeural", "+0%"),
    "SANTIAGO": ("es-US-AlonsoNeural", "+0%"),
    "EMILIANO": ("es-CO-GonzaloNeural", "+0%"),
    "OSCAR": ("es-AR-TomasNeural", "+0%"),
}
SCENES = {
    "escena1": {
        "start": 2.2,  # s de imagen antes de la primera palabra (fade in + latido)
        "gap": 0.7,    # s entre narradores
        "lines": [
            ("FERNANDO", "El cuerpo humano es una máquina perfecta, gobernada por reglas estrictas. Pero, ¿qué sucede cuando una sola célula decide ignorar las reglas?"),
            ("SANTIAGO", "Eso es el cáncer de mama. No es un invasor externo; es una rebelión interna. Comienza silenciosamente, generalmente en los conductos que transportan la leche, o en los lobulillos. Por una mutación genética, las células desactivan su autodestrucción, y comienzan a multiplicarse sin control."),
        ],
    },
    "escena2": {"start": 1.2, "gap": 0.6, "lines": [
        ("SANTIAGO", "Para sostener este crecimiento explosivo, el tumor piratea el sistema circulatorio. A esto le llamamos angiogénesis: obliga al cuerpo a crear nuevos vasos sanguíneos, exclusivos para alimentarlo."),
        ("FERNANDO", "Si no se detiene a tiempo, estas células rompen las barreras del tejido original, viajando por la sangre o el sistema linfático, para colonizar otros órganos. A este proceso invasivo lo conocemos como metástasis."),
    ]},
    "escena3": {"start": 1.6, "gap": 0.75, "lines": [
        ("FERNANDO", "Esto no es una estadística lejana ni un problema resuelto. Hoy, en México, el cáncer de mama sigue siendo la primera causa de muerte por tumores malignos en mujeres."),
        ("EMILIANO", "Las cifras oficiales del INEGI son contundentes: tan solo en dos mil veinticuatro fallecieron ocho mil cuatrocientas cincuenta y una personas por esta enfermedad en el país, de las cuales ocho mil trescientas ochenta y cuatro fueron mujeres. En dos mil veinticinco la cifra se mantuvo por encima de las ocho mil cien muertes. Eso significa que, en promedio, casi veintitrés mujeres mueren cada día en México por cáncer de mama."),
        ("SANTIAGO", "Y lejos de bajar, el problema ha crecido: en la última década la tasa de mortalidad pasó de quince punto siete a dieciocho punto siete defunciones por cada cien mil mujeres. Se estiman más de treinta y cuatro mil casos nuevos al año, y entre el sesenta y cuatro y el setenta y dos por ciento se diagnostican cuando la enfermedad ya está en etapas avanzadas."),
    ]},
    "escena4": {"start": 1.1, "gap": 0.65, "lines": [
        ("EMILIANO", "¿Por qué seguimos llegando tarde? Parte del problema radica en las limitaciones de los métodos tradicionales. Aunque la mastografía sigue siendo el estudio más difundido, emplea rayos X: radiación ionizante que, al acumularse con exposiciones repetidas, conlleva el riesgo de provocar alteraciones celulares en el tejido sano. Además, implica compresión dolorosa y pierde efectividad en mamas densas, muy comunes en mujeres jóvenes."),
        ("OSCAR", "Por eso hoy destacamos al ultrasonido mamario como el mejor método actual menos invasivo. A diferencia de la mastografía, no utiliza radiación ionizante ni aplasta el tejido; opera únicamente con ondas mecánicas de sonido de alta frecuencia. Permite revisar tejido denso con seguridad, repetirse sin riesgo acumulativo por radiación y distinguir con claridad entre un quiste líquido y un tumor sólido que amerite biopsia."),
    ]},
    # Escenas 5 y 6: el PDF repite el número «Escena 5» y pega el bloque de mastografía de la v1 bajo el título de IA.
    # El relato que se anima empareja cada título con su diálogo: IA y biosensor, luego ADC.
    "escena5": {"start": 1.0, "gap": 0.6, "lines": [
        ("OSCAR", "Pero estamos en 2026, y la tecnología ha evolucionado drásticamente. Primero, la Inteligencia Artificial ya actúa como triage en nuestros hospitales, analizando miles de mastografías en segundos, e identificando patrones invisibles al ojo humano."),
        ("OSCAR", "Aún más fascinante es el desarrollo de sensores interdisciplinarios, tecnología impulsada por instituciones como la UNAM. Imaginen esto: un biosensor acústico."),
        ("OSCAR", "Utilizamos un cristal piezoeléctrico, recubierto con una lámina microscópica de oro puro. El oro permite anclar anticuerpos de manera perfecta. Al hacer vibrar la placa con ultrasonido, cualquier biomarcador de cáncer en la sangre que choque contra ella se adhiere, aumentando la masa del sistema. Ese micro-cambio de peso frena la onda acústica, revelando la presencia de un tumor, ¡con precisión nanométrica!"),
    ]},
    "escena6": {"start": 1.0, "gap": 0.6, "lines": [
        ("FERNANDO", "La detección es solo la mitad de la batalla. Las curas también han dado un salto cuántico, alejándose de la quimioterapia tradicional, que dañaba todo el cuerpo."),
        ("SANTIAGO", "El avance más poderoso de nuestra era son los A D C, o Conjugados Anticuerpo-Fármaco. Son, literalmente, un caballo de Troya molecular."),
        ("SANTIAGO", "Diseñamos anticuerpos en laboratorio que rastrean únicamente las proteínas que cubren al tumor, como la HER dos o la TROP dos, en el agresivo cáncer Triple Negativo. El anticuerpo se ancla a la célula enferma, penetra sus defensas, y libera la toxina quimioterapéutica solo en su interior. Destrucción total del cáncer, con mínimo daño colateral."),
    ]},
    # El PDF se corta en «la biotecnología tienen». La segunda línea cierra esa frase con el título de la escena.
    "escena7": {"start": 1.3, "gap": 0.7, "lines": [
        ("FERNANDO", "Sería irresponsable decir que la batalla está ganada. Los avances existen, pero miles de mujeres mexicanas siguen muriendo cada año porque el diagnóstico llega tarde, o porque las tecnologías de punta aún no están al alcance de todas."),
        ("OSCAR", "Ahí es donde la física, la acústica y la biotecnología tienen que salir del laboratorio y llegar a cada clínica. Mientras el diagnóstico llegue tarde, esta lucha sigue abierta."),
    ]},
}
SR = 48000


async def tts(voice, rate, text, mp3):
    com = edge_tts.Communicate(text, voice, rate=rate, boundary="WordBoundary")
    words = []
    with open(mp3, "wb") as f:
        async for ch in com.stream():
            if ch["type"] == "audio":
                f.write(ch["data"])
            elif ch["type"] == "WordBoundary":
                words.append({"w": ch["text"], "t": ch["offset"] / 1e7, "d": ch["duration"] / 1e7})
    return words


def main(name):
    sc = SCENES[name]
    out = os.path.join(os.path.dirname(__file__), name)
    os.makedirs(out, exist_ok=True)
    t = sc["start"]
    pcm = bytearray(b"\0\0" * int(t * SR))
    words, lines = [], []
    for i, (who, text) in enumerate(sc["lines"]):
        voice, rate = VOICES[who]
        mp3, wav = os.path.join(out, f"l{i}.mp3"), os.path.join(out, f"l{i}.wav")
        w = asyncio.run(tts(voice, rate, text, mp3))
        subprocess.run([FFMPEG, "-y", "-v", "error", "-i", mp3, "-ar", str(SR), "-ac", "1",
                        "-af", "silenceremove=start_periods=1:start_threshold=-50dB,areverse,silenceremove=start_periods=1:start_threshold=-50dB,areverse,loudnorm=I=-16:TP=-1.5:LRA=11",
                        wav], check=True)
        lead = w[0]["t"] if w else 0  # el recorte de silencio inicial desplaza los tiempos
        # mide cuánto silencio inicial tenía el mp3 para corregir los offsets
        r = subprocess.run([FFMPEG, "-v", "info", "-i", mp3, "-af", "silencedetect=n=-50dB:d=0.01", "-f", "null", "-"], capture_output=True, text=True).stderr
        trim = 0.0
        for ln in r.splitlines():
            if "silence_end" in ln:
                e = float(ln.split("silence_end:")[1].split("|")[0])
                d = float(ln.split("silence_duration:")[1])
                if abs(e - d) < 0.02:
                    trim = e
                break
        with wave.open(wav) as f:
            data = f.readframes(f.getnframes())
        dur = len(data) / 2 / SR
        lines.append({"who": who, "text": text, "t0": round(t, 3), "t1": round(t + dur, 3)})
        for x in w:
            words.append({"w": x["w"], "who": who, "t": round(t + max(0, x["t"] - trim), 3), "d": round(x["d"], 3)})
        pcm += data
        t += dur
        gap = sc["gap"] if i + 1 < len(sc["lines"]) else 0
        pcm += b"\0\0" * int(gap * SR)
        t += gap
    with wave.open(os.path.join(out, "voice.wav"), "wb") as f:
        f.setnchannels(1); f.setsampwidth(2); f.setframerate(SR); f.writeframes(bytes(pcm))
    json.dump(words, open(os.path.join(out, "words.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=0)
    json.dump({"end": round(t, 3), "lines": lines}, open(os.path.join(out, "lines.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print("voz", name, "termina en", round(t, 2), "s;", len(words), "palabras")
    print(" ".join(f'{x["w"]}@{x["t"]:.1f}' for x in words))


if __name__ == "__main__":
    for n in sys.argv[1:] or ["escena1"]:
        main(n)
