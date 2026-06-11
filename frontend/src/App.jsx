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
        fetch(`${API}/progreso/${USUARIO_ID}`)
          .then(r => r.json())
          .then(progresoData => {
            const completadas = progresoData.filter(p => p.completada).map(p => p.zona_id)
            const zonasActualizadas = zonasData.map((z, i) => ({
              ...z,
              completada: completadas.includes(z.id),
              desbloqueada: i === 0 || completadas.includes(zonasData[i - 1].id)
            }))
            setZonas(zonasActualizadas)
          })
          .catch(() => {
            setZonas(zonasData.map((z, i) => ({
              ...z,
              completada: false,
              desbloqueada: i === 0
            })))
          })
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
    if (indice + 1 >= preguntas.length) {
      const puntaje = correctas + (seleccion === preguntas[indice].respuesta_correcta ? 1 : 0)
      fetch(`${API}/progreso`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuario_id: USUARIO_ID, zona_id: zonaActiva.id, puntaje })
      }).then(() => {
        setZonas(prev => prev.map((z, i, arr) =>