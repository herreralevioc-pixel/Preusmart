from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
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

class ProgresoInput(BaseModel):
    usuario_id: str
    zona_id: int
    puntaje: int

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