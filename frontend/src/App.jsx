import { useState, useEffect } from "react"

const API = "https://preusmart-production.up.railway.app"

function getUserId() {
  let id = localStorage.getItem("preusmart_id")
  if (!id) {
    id = Math.random().toString(36).substring(2) + Date.now().toString(36)
    localStorage.setItem("preusmart_id", id)
  }
  return id
}

function getProgreso() {
  const saved = localStorage.getItem("preusmart_progreso")
  return saved ? JSON.parse(saved) : []
}

function saveProgreso(zonaId, puntaje) {
  const progreso = getProgreso()
  const idx = progreso.findIndex(p => p.zona_id === zonaId)
  if (idx >= 0) progreso[idx] = { zona_id: zonaId, completada: true, puntaje }
  else progreso.push({ zona_id: zonaId, completada: true, puntaje })
  localStorage.setItem("preusmart_progreso", JSON.stringify(progreso))
}

const USUARIO_ID = getUserId()

export default function App() {
  const [pantalla, setPantalla] = useState("mapa")
  const [zonas, setZonas] = useState([])
  const [preguntas, setPreguntas] = useState([])
  const [zonaActiva, setZonaActiva] = useState(null)
  const [indice, setIndice] = useState(0)
  const [seleccion, setSeleccion] = useState(null)
  const [mostrarFeedback, setMostrarFeedback] = useState(false)
  const [correctas, setCorrectas] = useState(0)

  useEffect(() => {
    fetch(`${API}/zonas`)
      .then(r => r.json())
      .then(zonasData => {
        const progreso = getProgreso()
        const completadas = progreso.filter(p => p.completada).map(p => p.zona_id)
        setZonas(zonasData.map((z, i) => ({
          ...z,
          completada: completadas.includes(z.id),
          desbloqueada: i === 0 || completadas.includes(zonasData[i - 1].id)
        })))
      })
  }, [])

  function jugarZona(zona) {
    setZonaActiva(zona)
    setIndice(0)
    setSeleccion(null)
    setMostrarFeedback(false)
    setCorrectas(0)
    fetch(`${API}/preguntas/${zona.id}`)
      .then(r => r.json())
      .then(data => {
        setPreguntas(data)
        setPantalla("quiz")
      })
  }

  function responder(opcion) {
    if (mostrarFeedback) return
    setSeleccion(opcion)
    setMostrarFeedback(true)
    if (opcion === preguntas[indice].respuesta_correcta) {
      setCorrectas(c => c + 1)
    }
  }

  function siguiente() {
    const esUltima = indice + 1 >= preguntas.length
    const nuevasCorrectas = correctas + (seleccion === preguntas[indice].respuesta_correcta ? 1 : 0)
    if (esUltima) {
      saveProgreso(zonaActiva.id, nuevasCorrectas)
      fetch(`${API}/progreso`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuario_id: USUARIO_ID, zona_id: zonaActiva.id, puntaje: nuevasCorrectas })
      }).catch(() => {})
      setZonas(prev => prev.map((z, i, arr) => {
        if (z.id === zonaActiva.id) return { ...z, completada: true }
        if (i > 0 && arr[i - 1].id === zonaActiva.id) return { ...z, desbloqueada: true }
        return z
      }))
      setPantalla("completado")
    } else {
      setIndice(i => i + 1)
      setSeleccion(null)
      setMostrarFeedback(false)
    }
  }

  if (pantalla === "mapa") return (
    <div style={{maxWidth: 400, margin: "0 auto", padding: 20}}>
      <h1>PreuSmart 🎓</h1>
      <p>Recorre Chile respondiendo la PAES</p>
      {zonas.length === 0 && <p style={{color: "#888"}}>Cargando...</p>}
      {zonas.map(zona => (
        <div key={zona.id} style={{
          border: "1px solid #444", borderRadius: 12,
          padding: 16, marginBottom: 12,
          opacity: zona.desbloqueada ? 1 : 0.5
        }}>
          <span style={{fontSize: 24}}>{zona.icono}</span>
          <strong style={{marginLeft: 8}}>{zona.nombre}</strong>
          {zona.completada
            ? <span style={{marginLeft: 8, color: "#4caf50"}}>✓ Completada</span>
            : zona.desbloqueada
            ? <button onClick={() => jugarZona(zona)} style={{marginLeft: 12, padding: "4px 12px", cursor: "pointer"}}>Jugar →</button>
            : <span style={{marginLeft: 8}}>🔒</span>
          }
        </div>
      ))}
    </div>
  )

  if (pantalla === "quiz") {
    const pregunta = preguntas[indice]
    const opciones = [
      { letra: "A", texto: pregunta.opcion_a },
      { letra: "B", texto: pregunta.opcion_b },
      { letra: "C", texto: pregunta.opcion_c },
      { letra: "D", texto: pregunta.opcion_d },
    ]
    return (
      <div style={{maxWidth: 420, margin: "0 auto", padding: 20}}>
        <button onClick={() => setPantalla("mapa")} style={{marginBottom: 16, cursor: "pointer"}}>← Volver</button>
        <p style={{color: "#aaa"}}>{zonaActiva.icono} {zonaActiva.nombre} · {indice + 1}/{preguntas.length}</p>
        <div style={{background: "#1e1e1e", borderRadius: 12, padding: 20, marginBottom: 16}}>
          <p style={{fontSize: 15, lineHeight: 1.6}}>{pregunta.enunciado}</p>
        </div>
        {opciones.map(op => {
          const esCorrecta = op.letra === pregunta.respuesta_correcta
          const esSeleccionada = op.letra === seleccion
          let bg = "#2a2a2a"
          if (mostrarFeedback && esCorrecta) bg = "#1a4a1a"
          else if (mostrarFeedback && esSeleccionada) bg = "#4a1a1a"
          return (
            <div key={op.letra} onClick={() => responder(op.letra)} style={{
              background: bg, border: "1px solid #444", borderRadius: 10,
              padding: "12px 16px", marginBottom: 8,
              cursor: mostrarFeedback ? "default" : "pointer",
              display: "flex", gap: 12
            }}>
              <strong>{op.letra}</strong> {op.texto}
            </div>
          )
        })}
        {mostrarFeedback && (
          <div>
            <p style={{color: seleccion === pregunta.respuesta_correcta ? "#4caf50" : "#f44336"}}>
              {seleccion === pregunta.respuesta_correcta ? "✓ ¡Correcto!" : "✗ Incorrecto"}
            </p>
            <p style={{color: "#aaa", fontSize: 13}}>{pregunta.explicacion}</p>
            <button onClick={siguiente} style={{width: "100%", padding: 12, marginTop: 8, cursor: "pointer", fontSize: 15}}>
              {indice + 1 >= preguntas.length ? "Terminar zona" : "Siguiente →"}
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={{maxWidth: 400, margin: "0 auto", padding: 40, textAlign: "center"}}>
      <div style={{fontSize: 60}}>🎉</div>
      <h2>¡{zonaActiva.nombre} completada!</h2>
      <p>Respondiste {correctas} de {preguntas.length} correctamente</p>
      <div style={{fontSize: 32, margin: "16px 0"}}>
        {preguntas.map((_, i) => i < correctas ? "⭐" : "☆")}
      </div>
      <button onClick={() => setPantalla("mapa")} style={{padding: "12px 24px", cursor: "pointer", fontSize: 15}}>
        Volver al mapa →
      </button>
    </div>
  )
}