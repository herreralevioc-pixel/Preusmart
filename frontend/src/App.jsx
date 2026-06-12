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

const ZONA_INFO = [
  { msg: "El norte te espera, vamos!" },
  { msg: "Norte Chico, tu siguiente parada!" },
  { msg: "Zona Central, el corazon de Chile!" },
  { msg: "El sur es tuyo, dale!" },
  { msg: "Ultimo nivel, lo tienes!" },
]

const POSICIONES = [
  { top: "12%", left: "52%" },
  { top: "29%", left: "47%" },
  { top: "47%", left: "49%" },
  { top: "64%", left: "44%" },
  { top: "83%", left: "40%" },
]

export default function App() {
  const [pantalla, setPantalla] = useState("mapa")
  const [zonas, setZonas] = useState([])
  const [preguntas, setPreguntas] = useState([])
  const [zonaActiva, setZonaActiva] = useState(null)
  const [indice, setIndice] = useState(0)
  const [seleccion, setSeleccion] = useState(null)
  const [feedback, setFeedback] = useState(false)
  const [correctas, setCorrectas] = useState(0)
  const [imgMascota, setImgMascota] = useState("mascota.png")
  const [comentario, setComentario] = useState("")
  const [cargandoComentario, setCargandoComentario] = useState(false)

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
    setFeedback(false)
    setCorrectas(0)
    setImgMascota("mascota.png")
    setComentario("")
    fetch(`${API}/preguntas/${zona.id}`)
      .then(r => r.json())
      .then(data => { setPreguntas(data); setPantalla("quiz") })
  }

  function responder(opcion) {
    if (feedback) return
    setSeleccion(opcion)
    setFeedback(true)
    setComentario("")
    setCargandoComentario(true)
    const esCorrecta = opcion === preguntas[indice].respuesta_correcta
    if (esCorrecta) {
      setCorrectas(c => c + 1)
      setImgMascota("mascota.png")
    } else {
      setImgMascota("mascota-triste.png")
    }
    fetch(`${API}/comentario`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        es_correcto: esCorrecta,
        pregunta: preguntas[indice].enunciado,
        respuesta_usuario: opcion,
        respuesta_correcta: preguntas[indice].respuesta_correcta
      })
    })
      .then(r => r.json())
      .then(data => { setComentario(data.comentario); setCargandoComentario(false) })
      .catch(() => { setCargandoComentario(false) })
  }

  function siguiente() {
    const esUltima = indice + 1 >= preguntas.length
    const total = correctas + (seleccion === preguntas[indice].respuesta_correcta ? 1 : 0)
    if (esUltima) {
      saveProgreso(zonaActiva.id, total)
      fetch(`${API}/progreso`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuario_id: USUARIO_ID, zona_id: zonaActiva.id, puntaje: total })
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
      setFeedback(false)
      setImgMascota("mascota.png")
      setComentario("")
    }
  }

  /* ── MAPA ── */
  if (pantalla === "mapa") {
    const zonaActualIdx = zonas.findIndex(z => z.desbloqueada && !z.completada)
    const msg = zonaActualIdx >= 0 ? ZONA_INFO[zonaActualIdx].msg : "Completaste todo Chile!"

    return (
      <div style={{ fontFamily:"system-ui,sans-serif", background:"#a8d4e6", minHeight:"100vh" }}>

        {/* Header fijo encima */}
        <div style={{ position:"fixed", top:0, left:0, right:0, zIndex:50, background:"rgba(255,255,255,0.85)", backdropFilter:"blur(6px)", padding:"10px 20px", display:"flex", alignItems:"center", justifyContent:"space-between", boxShadow:"0 1px 8px rgba(0,0,0,0.1)" }}>
          <h1 style={{ fontSize:22, fontWeight:900, color:"#1a3a1a", margin:0 }}>PreuSmart</h1>
          <div style={{ display:"flex", gap:4 }}>
            {zonas.map((z,i) => (
              <span key={i} style={{ fontSize:18, filter:z.completada?"none":"grayscale(1) opacity(0.35)" }}>⭐</span>
            ))}
          </div>
        </div>

        {/* Mapa como imagen real — zonas posicionadas encima */}
        <div style={{ position:"relative", marginTop:52 }}>
          <img
            src="/mapa-chile.png"
            alt="Mapa de Chile"
            style={{ width:"100%", display:"block" }}
          />

          {/* Zona markers sobre el mapa */}
          {zonas.map((zona, i) => {
            const esCurrent = zona.desbloqueada && !zona.completada
            const pos = POSICIONES[i]
            return (
              <div
                key={zona.id}
                onClick={() => esCurrent && jugarZona(zona)}
                style={{
                  position:"absolute",
                  top: pos.top,
                  left: pos.left,
                  transform:"translate(-50%, -50%)",
                  display:"flex",
                  flexDirection:"column",
                  alignItems:"center",
                  gap:3,
                  cursor: esCurrent ? "pointer" : "default",
                  zIndex:10,
                }}
              >
                <div style={{
                  width: esCurrent ? 54 : 44,
                  height: esCurrent ? 54 : 44,
                  borderRadius:"50%",
                  background: zona.completada ? "#4CAF50" : zona.desbloqueada ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.45)",
                  border: `3px solid ${esCurrent ? "#FFD700" : zona.completada ? "#2E7D32" : "rgba(80,80,80,0.4)"}`,
                  display:"flex", alignItems:"center", justifyContent:"center",
                  fontSize: esCurrent ? 24 : 20,
                  boxShadow: esCurrent
                    ? "0 0 0 5px rgba(255,215,0,0.4), 0 4px 12px rgba(0,0,0,0.3)"
                    : "0 2px 6px rgba(0,0,0,0.25)",
                  transition:"all 0.2s",
                }}>
                  {zona.completada ? "✅" : zona.desbloqueada ? zona.icono : "🔒"}
                </div>

                <div style={{
                  background:"rgba(255,255,255,0.9)",
                  borderRadius:20,
                  padding:"2px 8px",
                  fontSize:10,
                  fontWeight:700,
                  color:"#1a3a1a",
                  boxShadow:"0 1px 4px rgba(0,0,0,0.15)",
                  whiteSpace:"nowrap",
                }}>
                  {zona.nombre}
                </div>

                {esCurrent && (
                  <div style={{
                    background:"#4CAF50",
                    color:"#fff",
                    borderRadius:20,
                    padding:"2px 10px",
                    fontSize:10,
                    fontWeight:700,
                    boxShadow:"0 2px 6px rgba(76,175,80,0.5)",
                  }}>
                    Jugar →
                  </div>
                )}
              </div>
            )
          })}

          {/* Rufi + burbuja sobre el mapa abajo */}
          <div style={{
            position:"absolute",
            bottom:16,
            left:12,
            display:"flex",
            flexDirection:"column",
            alignItems:"flex-start",
            gap:6,
            zIndex:20,
          }}>
            <div style={{
              background:"#fff",
              borderRadius:"16px 16px 16px 4px",
              padding:"8px 12px",
              boxShadow:"0 2px 14px rgba(0,0,0,0.18)",
              maxWidth:180,
              fontSize:12,
              fontWeight:600,
              color:"#2C3E50",
              lineHeight:1.4,
            }}>
              {msg}
            </div>
            <img src="/mascota.png" alt="Rufi" style={{ width:120, height:120, objectFit:"contain" }}/>
          </div>
        </div>
      </div>
    )
  }

  /* ── QUIZ ── */
  if (pantalla === "quiz") {
    const pregunta = preguntas[indice]
    const opciones = [
      { letra:"A", texto:pregunta.opcion_a },
      { letra:"B", texto:pregunta.opcion_b },
      { letra:"C", texto:pregunta.opcion_c },
      { letra:"D", texto:pregunta.opcion_d },
    ]
    return (
      <div style={{ minHeight:"100vh", background:"linear-gradient(180deg,#E8F5E9 0%,#F1F8E9 100%)", fontFamily:"system-ui,sans-serif", padding:"16px 16px 32px" }}>
        <div style={{ maxWidth:440, margin:"0 auto" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:20 }}>
            <button onClick={() => setPantalla("mapa")} style={{ background:"#fff", border:"none", borderRadius:10, padding:"8px 14px", cursor:"pointer", fontSize:18, boxShadow:"0 2px 6px rgba(0,0,0,0.1)" }}>←</button>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:13, fontWeight:700, color:"#2C3E50", marginBottom:6 }}>{zonaActiva.icono} {zonaActiva.nombre} · {indice+1}/{preguntas.length}</div>
              <div style={{ height:8, background:"#ddd", borderRadius:4, overflow:"hidden" }}>
                <div style={{ height:"100%", width:`${(indice/preguntas.length)*100}%`, background:"linear-gradient(90deg,#4CAF50,#8BC34A)", borderRadius:4, transition:"width 0.4s" }}/>
              </div>
            </div>
          </div>

          <div style={{ background:"#fff", borderRadius:20, padding:"20px", marginBottom:16, boxShadow:"0 4px 16px rgba(0,0,0,0.08)" }}>
            <div style={{ fontSize:11, color:"#4CAF50", fontWeight:700, marginBottom:8, letterSpacing:1 }}>PREGUNTA {indice+1}</div>
            <p style={{ fontSize:15, lineHeight:1.7, color:"#2C3E50", margin:0 }}>{pregunta.enunciado}</p>
          </div>

          <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:16 }}>
            {opciones.map(op => {
              const esCorrecta = op.letra === pregunta.respuesta_correcta
              const esSeleccionada = op.letra === seleccion
              let bg="#fff", border="#E0E0E0", labelBg="#F5F5F5", labelColor="#666", color="#2C3E50"
              if (feedback && esCorrecta) { bg="#E8F5E9"; border="#4CAF50"; color="#1B5E20"; labelBg="#4CAF50"; labelColor="#fff" }
              else if (feedback && esSeleccionada) { bg="#FFEBEE"; border="#F44336"; color="#B71C1C"; labelBg="#F44336"; labelColor="#fff" }
              else if (esSeleccionada) { bg="#E8F5E9"; border="#4CAF50"; labelBg="#4CAF50"; labelColor="#fff" }
              return (
                <div key={op.letra} onClick={() => responder(op.letra)} style={{ display:"flex", alignItems:"center", gap:12, padding:"14px 16px", borderRadius:14, border:`2px solid ${border}`, background:bg, cursor:feedback?"default":"pointer", transition:"all 0.15s", boxShadow:"0 2px 6px rgba(0,0,0,0.05)" }}>
                  <span style={{ width:32, height:32, borderRadius:"50%", background:labelBg, color:labelColor, display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:700, flexShrink:0 }}>
                    {feedback&&esCorrecta?"✓":feedback&&esSeleccionada&&!esCorrecta?"✗":op.letra}
                  </span>
                  <span style={{ fontSize:14, color, fontWeight:esSeleccionada||(feedback&&esCorrecta)?600:400 }}>{op.texto}</span>
                </div>
              )
            })}
          </div>

          {feedback && (
            <div>
              <div style={{ padding:"12px 16px", borderRadius:14, marginBottom:12, background:seleccion===pregunta.respuesta_correcta?"#E8F5E9":"#FFEBEE", border:`1px solid ${seleccion===pregunta.respuesta_correcta?"#4CAF50":"#F44336"}` }}>
                <div style={{ fontWeight:700, fontSize:14, color:seleccion===pregunta.respuesta_correcta?"#2E7D32":"#C62828", marginBottom:4 }}>
                  {seleccion===pregunta.respuesta_correcta?"Correcto!":"No era esa"}
                </div>
                <div style={{ fontSize:13, color:"#555", lineHeight:1.5 }}>{pregunta.explicacion}</div>
              </div>

              <div style={{ display:"flex", alignItems:"flex-end", gap:10, marginBottom:14 }}>
                <img src={`/${imgMascota}`} alt="Rufi" style={{ width:85, height:85, objectFit:"contain", flexShrink:0 }}/>
                <div style={{ background:"#fff", borderRadius:"16px 16px 16px 4px", padding:"10px 14px", boxShadow:"0 2px 10px rgba(0,0,0,0.1)", fontSize:13, fontWeight:600, color:"#2C3E50", flex:1, lineHeight:1.4 }}>
                  {cargandoComentario ? "..." : comentario || (seleccion===pregunta.respuesta_correcta?"Bien hecho!":"Vamos, tu puedes!")}
                </div>
              </div>

              <button onClick={siguiente} style={{ width:"100%", padding:15, background:"linear-gradient(135deg,#4CAF50,#2E7D32)", border:"none", borderRadius:14, color:"#fff", fontSize:15, fontWeight:700, cursor:"pointer", boxShadow:"0 4px 12px rgba(76,175,80,0.4)" }}>
                {indice+1>=preguntas.length?"Completar zona!":"Siguiente →"}
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  /* ── COMPLETADO ── */
  const siguienteZona = zonas.find(z => z.desbloqueada && !z.completada)
  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(180deg,#A8D5A2 0%,#5A9E52 100%)", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:24, fontFamily:"system-ui,sans-serif", textAlign:"center" }}>
      <div style={{ fontSize:60, marginBottom:8 }}>🎉</div>
      <img src="/mascota.png" alt="Rufi" style={{ width:160, height:160, objectFit:"contain", marginBottom:16 }}/>
      <h2 style={{ fontSize:26, fontWeight:900, color:"#fff", textShadow:"0 2px 8px rgba(0,0,0,0.3)", margin:"0 0 8px" }}>
        {zonaActiva?.nombre} completada!
      </h2>
      <p style={{ color:"rgba(255,255,255,0.9)", marginBottom:20, fontSize:15 }}>
        Respondiste {correctas} de {preguntas.length} correctamente
      </p>
      <div style={{ display:"flex", gap:8, marginBottom:24 }}>
        {preguntas.map((_,i) => <span key={i} style={{ fontSize:32, filter:i<correctas?"none":"grayscale(1) opacity(0.4)" }}>⭐</span>)}
      </div>
      {siguienteZona && (
        <div style={{ background:"rgba(255,255,255,0.9)", borderRadius:14, padding:"12px 18px", marginBottom:20, fontSize:14, color:"#2C3E50", fontWeight:600 }}>
          Desbloqueaste: {siguienteZona.icono} {siguienteZona.nombre}
        </div>
      )}
      <button onClick={() => setPantalla("mapa")} style={{ padding:"15px 32px", background:"#fff", border:"none", borderRadius:14, color:"#2E7D32", fontSize:16, fontWeight:800, cursor:"pointer", boxShadow:"0 4px 16px rgba(0,0,0,0.2)" }}>
        Volver al mapa →
      </button>
    </div>
  )
}