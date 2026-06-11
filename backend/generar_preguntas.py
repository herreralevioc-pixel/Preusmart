import anthropic
import json
from supabase import create_client
from dotenv import load_dotenv
import os

load_dotenv()

supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))
claude = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

zonas = [
    {"id": 1, "nombre": "Norte Grande", "tema": "operaciones basicas y fracciones"},
    {"id": 2, "nombre": "Norte Chico",  "tema": "porcentajes y proporciones"},
    {"id": 3, "nombre": "Zona Central", "tema": "algebra y ecuaciones"},
    {"id": 4, "nombre": "Zona Sur",     "tema": "geometria y areas"},
    {"id": 5, "nombre": "Zona Austral", "tema": "estadistica y probabilidad"},
]

for zona in zonas:
    print(f"Generando preguntas para {zona['nombre']}...")

    respuesta = claude.messages.create(
        model="claude-sonnet-4-5",
        max_tokens=2000,
        messages=[{
            "role": "user",
            "content": f"""Genera 5 preguntas de Matematica estilo PAES sobre {zona['tema']}
para alumnos preuniversitarios chilenos.
Responde SOLO con un JSON valido, sin texto adicional, sin bloques de codigo, con esta estructura:
[
  {{
    "enunciado": "texto de la pregunta",
    "opcion_a": "primera opcion",
    "opcion_b": "segunda opcion",
    "opcion_c": "tercera opcion",
    "opcion_d": "cuarta opcion",
    "respuesta_correcta": "A",
    "explicacion": "explicacion paso a paso"
  }}
]"""
        }]
    )

    raw = respuesta.content[0].text.strip()
    if raw.startswith("```"):
        raw = "\n".join(raw.split("\n")[1:-1])

    preguntas = json.loads(raw)

    for p in preguntas:
        p["zona_id"] = zona["id"]

    supabase.table("preguntas").insert(preguntas).execute()
    print(f"OK - {len(preguntas)} preguntas guardadas para {zona['nombre']}")

print("\nBanco de preguntas listo!")