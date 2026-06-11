from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from supabase import create_client
from pydantic import BaseModel
from dotenv import load_dotenv
import os

load_dotenv()

app = FastAPI(title="PreuSmart API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))

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
    resultado = supabase.table("preguntas").select("*").eq("zona_id", zona_id).execute()
    return resultado.data

@app.post("/progreso")
def guardar_progreso(data: ProgresoInput):
    existente = supabase.table("progreso_usuario").select("id").eq("usuario_id", data.usuario_id).eq("zona_id", data.zona_id).execute()
    if existente.data:
        supabase.table("progreso_usuario").update({
            "completada": True, "puntaje": data.puntaje
        }).eq("usuario_id", data.usuario_id).eq("zona_id", data.zona_id).execute()
    else:
        supabase.table("progreso_usuario").insert({
            "usuario_id": data.usuario_id,
            "zona_id": data.zona_id,
            "completada": True,
            "puntaje": data.puntaje
        }).execute()
    return {"ok": True}

@app.get("/progreso/{usuario_id}")
def get_progreso(usuario_id: str):
    resultado = supabase.table("progreso_usuario").select("*").eq("usuario_id", usuario_id).execute()
    return resultado.data