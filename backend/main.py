from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
import anthropic
import requests
import os

load_dotenv()

app = FastAPI(title="PreuSmart API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json"
}

claude = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

class ProgresoInput(BaseModel):
    usuario_id: str
    zona_id: int
    puntaje: int

class ComentarioInput(BaseModel):
    es_correcto: bool
    pregunta: str
    respuesta_usuario: str
    respuesta_correcta: str

@app.get("/")
def root():
    return {"mensaje": "PreuSmart API funcionando"}

@app.get("/zonas")
def get_zonas():
    return [
        {"id": 1, "nombre": "Norte Grande", "icono": "🌵"},
        {"id": 2, "nombre": "Norte Chico",  "icono": "🌺"},
        {"id": 3, "nombre": "Zona Central", "icono": "🏔️"},
        {"id": 4, "nombre": "Zona Sur",     "icono": "🌲"},
        {"id": 5, "nombre": "Zona Austral", "icono": "🧊"},
    ]

@app.get("/preguntas/{zona_id}")
def get_preguntas(zona_id: int):
    r = requests.get(
        f"{SUPABASE_URL}/rest/v1/preguntas?zona_id=eq.{zona_id}",
        headers=HEADERS
    )
    return r.json()

@app.post("/progreso")
def guardar_progreso(data: ProgresoInput):
    existente = requests.get(
        f"{SUPABASE_URL}/rest/v1/progreso_usuario?usuario_id=eq.{data.usuario_id}&zona_id=eq.{data.zona_id}",
        headers=HEADERS
    ).json()
    if existente:
        requests.patch(
            f"{SUPABASE_URL}/rest/v1/progreso_usuario?usuario_id=eq.{data.usuario_id}&zona_id=eq.{data.zona_id}",
            headers=HEADERS,
            json={"completada": True, "puntaje": data.puntaje}
        )
    else:
        requests.post(
            f"{SUPABASE_URL}/rest/v1/progreso_usuario",
            headers=HEADERS,
            json={"usuario_id": data.usuario_id, "zona_id": data.zona_id, "completada": True, "puntaje": data.puntaje}
        )
    return {"ok": True}

@app.post("/comentario")
def generar_comentario(data: ComentarioInput):
    if data.es_correcto:
        prompt = f"""El alumno respondio bien esta pregunta PAES: "{data.pregunta}"
Escribe UNA sola frase breve y genuina. Tono: amigo que te conoce bien, directo, sin exagerar.
Nada de frases de profe ni jerga forzada. Sin emojis. Solo la frase, sin comillas."""
    else:
        prompt = f"""El alumno se equivoco en esta pregunta PAES: "{data.pregunta}"
Respondio "{data.respuesta_usuario}", la correcta era "{data.respuesta_correcta}".
Escribe UNA sola frase corta de apoyo genuino. Tono: amigo calmado que no juzga, directo.
Nada de dramatismo ni frases de profe. Sin emojis. Solo la frase, sin comillas."""

    respuesta = claude.messages.create(
        model="claude-sonnet-4-5",
        max_tokens=80,
        messages=[{"role": "user", "content": prompt}]
    )
    return {"comentario": respuesta.content[0].text.strip()}