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
  { msg: "El cielo del Atacama es tan despejado que ahi estan los telescopios mas potentes del planeta." },
  { msg: "El Valle del Elqui tiene mas de 300 noches despejadas al ano. Es literalmente el lugar con mejor vista de estrellas del mundo." },
  { msg: "En Santiago puedes esquiar y llegar a la playa el mismo dia. Pocas ciudades en el mundo pueden decir eso." },
  { msg: "Los mapuche nunca fueron conquistados por Espana. Son uno de los pocos pueblos de America que defendieron su territorio hasta el final." },
  { msg: "En la Patagonia hay viento tan fuerte que puede tirarte al suelo. Los locals lo llaman normal." },
]

const POSICIONES = [
  { top: "12%", left: "52%" },
  { top: "29%", left: "47%" },
  { top: "47%", left: "49%" },
  { top: "64%", left: "44%" },
  { top: "83%", left: "40%" },
]

// Contenedor central — funciona como "carcasa de app" en desktop
const shell = {
  maxWidth: 420,
  margin: "0 auto",
  minHeight: "100vh",
  position: "relative",
  boxShadow: "0 0 40px rgba(0,0,0,0.12)",
  overflow: "hidden",
}

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
    const msg = zonaActualIdx >= 0
      ? ZONA_INFO[zonaActualIdx].msg
      : "Completaste todo Chile. Eso no lo hace cualquiera."

    return (
      <div style={{ background:"#e8f0e0", minHeight:"100vh", fontFamily:"system-ui,sans-serif" }}>
        <div style={shell}>

          {/* Header sticky */}
          <div style={{ position:"sticky", top:0, zIndex:50, background:"rgba(255,255,255,0.88)", backdropFilter:"blur(8px)", padding:"10px 18px", display:"flex", alignItems:"center", justifyContent:"space-between", boxShadow:"0 1px 6px rgba(0,0,0,0.08)" }}>
            <h1 style={{ fontSize:20, fontWeight:900, color:"#1a3a1a", margin:0 }}>PreuSmart</h1>
            <div style={{ display:"flex", gap:3 }}>
              {zonas.map((z,i) => (
                <span key={i} style={{ fontSize:16, filter:z.completada?"none":"grayscale(1) opacity(0.35)" }}>⭐</span>
              ))}
            </div>
          </div>

          {/* Mapa + zonas */}
          <div style={{ position:"relative", background:"#a8d4e6" }}>
            <img src="/mapa-chile.png" alt="Mapa de Chile" style={{ width:"100%", display:"block" }}/>

            {zonas.map((zona, i) => {
              const esCurrent = zona.desbloqueada && !zona.completada
              const pos = POSICIONES[i]
              return (
                <div
                  key={zona.id}
                  onClick={() => esCurrent && jugarZona(zona)}
                  style={{ position:"absolute", top:pos.top, left:pos.left, transform:"translate(-50%,-50%)", display:"flex", flexDirection:"column", alignItems:"center", gap:3, cursor:esCurrent?"pointer":"default", zIndex:10 }}
                >
                  <div style={{
                    width: esCurrent ? 48 : 38,
                    height: esCurrent ? 48 : 38,
                    borderRadius:"50%",
                    background: zona.completada?"#4CAF50":zona.desbloqueada?"rgba(255,255,255,0.95)":"rgba(255,255,255,0.45)",
                    border:`2.5px solid ${esCurrent?"#FFD700":zona.completada?"#2E7D32":"rgba(80,80,80,0.4)"}`,
                    display:"flex", alignItems:"center", justifyContent:"center",
                    fontSize: esCurrent ? 20 : 17,
                    boxShadow: esCurrent ? "0 0 0 4px rgba(255,215,0,0.4),0 3px 10px rgba(0,0,0,0.25)" : "0 2px 5px rgba(0,0,0,0.2)",
                    transition:"all 0.2s",
                  }}>
                    {zona.completada?"✅":zona.desbloqueada?zona.icono:"🔒"}
                  </div>
                  <div style={{ background:"rgba(255,255,255,0.88)", borderRadius:20, padding:"1px 7px", fontSize:9, fontWeight:700, color:"#1a3a1a", boxShadow:"0 1px 3px rgba(0,0,0,0.12)", whiteSpace:"nowrap" }}>
                    {zona.nombre}
                  </div>
                  {esCurrent && (
                    <div style={{ background:"#4CAF50", color:"#fff", borderRadius:20, padding:"2px 8px", fontSize:9, fontWeight:700, boxShadow:"0 2px 5px rgba(76,175,80,0.5)" }}>
                      Jugar →
                    </div>
                  )}
                </div>
              )
            })}

            {/* Rufi + burbuja */}
            <div style={{ position:"absolute", bottom:12, left:10, display:"flex", flexDirection:"column", alignItems:"flex-start", gap:5, zIndex:20 }}>
              <div style={{ background:"#fff", borderRadius:"14px 14px 14px 3px", padding:"7px 11px", boxShadow:"0 2px 12px rgba(0,0,0,0.15)", maxWidth:170, fontSize:11, fontWeight:500, color:"#2C3E50", lineHeight:1.5 }}>
                {msg}
              </div>
              <img src="/mascota.png" alt="Rufi" style={{ width:90, height:90, objectFit:"contain" }}/>
            </div>
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
      <div style={{ background:"#f0f7f0", minHeight:"100vh", fontFamily:"system-ui,sans-serif" }}>
        <div style={{ ...shell, background:"linear-gradient(180deg,#E8F5E9 0%,#F1F8E9 100%)", padding:"14px 14px 28px" }}>

          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:16 }}>
            <button onClick={() => setPantalla("mapa")} style={{ background:"#fff", border:"none", borderRadius:9, padding:"7px 12px", cursor:"pointer", fontSize:16, boxShadow:"0 2px 5px rgba(0,0,0,0.1)" }}>←</button>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:12, fontWeight:700, color:"#2C3E50", marginBottom:5 }}>{zonaActiva.icono} {zonaActiva.nombre} · {indice+1}/{preguntas.length}</div>
              <div style={{ height:7, background:"#ddd", borderRadius:4, overflow:"hidden" }}>
                <div style={{ height:"100%", width:`${(indice/preguntas.length)*100}%`, background:"linear-gradient(90deg,#4CAF50,#8BC34A)", borderRadius:4, transition:"width 0.4s" }}/>
              </div>
            </div>
          </div>

          <div style={{ background:"#fff", borderRadius:16, padding:"16px", marginBottom:12, boxShadow:"0 3px 12px rgba(0,0,0,0.07)" }}>
            <div style={{ fontSize:10, color:"#4CAF50", fontWeight:700, marginBottom:7, letterSpacing:1 }}>PREGUNTA {indice+1}</div>
            <p style={{ fontSize:14, lineHeight:1.7, color:"#2C3E50", margin:0 }}>{pregunta.enunciado}</p>
          </div>

          <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:12 }}>
            {opciones.map(op => {
              const esCorrecta = op.letra === pregunta.respuesta_correcta
              const esSeleccionada = op.letra === seleccion
              let bg="#fff", border="#E0E0E0", labelBg="#F5F5F5", labelColor="#666", color="#2C3E50"
              if (feedback && esCorrecta) { bg="#E8F5E9"; border="#4CAF50"; color="#1B5E20"; labelBg="#4CAF50"; labelColor="#fff" }
              else if (feedback && esSeleccionada) { bg="#FFEBEE"; border="#F44336"; color="#B71C1C"; labelBg="#F44336"; labelColor="#fff" }
              else if (esSeleccionada) { bg="#E8F5E9"; border="#4CAF50"; labelBg="#4CAF50"; labelColor="#fff" }
              return (
                <div key={op.letra} onClick={() => responder(op.letra)} style={{ display:"flex", alignItems:"center", gap:10, padding:"12px 14px", borderRadius:12, border:`2px solid ${border}`, background:bg, cursor:feedback?"default":"pointer", transition:"all 0.15s", boxShadow:"0 1px 4px rgba(0,0,0,0.04)" }}>
                  <span style={{ width:28, height:28, borderRadius:"50%", background:labelBg, color:labelColor, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700, flexShrink:0 }}>
                    {feedback&&esCorrecta?"✓":feedback&&esSeleccionada&&!esCorrecta?"✗":op.letra}
                  </span>
                  <span style={{ fontSize:13, color, fontWeight:esSeleccionada||(feedback&&esCorrecta)?600:400 }}>{op.texto}</span>
                </div>
              )
            })}
          </div>

          {feedback && (
            <div>
              <div style={{ padding:"11px 14px", borderRadius:12, marginBottom:10, background:seleccion===pregunta.respuesta_correcta?"#E8F5E9":"#FFEBEE", border:`1px solid ${seleccion===pregunta.respuesta_correcta?"#4CAF50":"#F44336"}` }}>
                <div style={{ fontWeight:700, fontSize:13, color:seleccion===pregunta.respuesta_correcta?"#2E7D32":"#C62828", marginBottom:3 }}>
                  {seleccion===pregunta.respuesta_correcta?"Correcto":"No era esa"}
                </div>
                <div style={{ fontSize:12, color:"#555", lineHeight:1.5 }}>{pregunta.explicacion}</div>
              </div>

              <div style={{ display:"flex", alignItems:"flex-end", gap:8, marginBottom:12 }}>
                <img src={`/${imgMascota}`} alt="Rufi" style={{ width:70, height:70, objectFit:"contain", flexShrink:0 }}/>
                <div style={{ background:"#fff", borderRadius:"14px 14px 14px 3px", padding:"9px 12px", boxShadow:"0 2px 8px rgba(0,0,0,0.09)", fontSize:12, fontWeight:500, color:"#2C3E50", flex:1, lineHeight:1.5 }}>
                  {cargandoComentario ? "..." : comentario || (seleccion===pregunta.respuesta_correcta?"Bien hecho.":"Sigue, la proxima es tuya.")}
                </div>
              </div>

              <button onClick={siguiente} style={{ width:"100%", padding:13, background:"linear-gradient(135deg,#4CAF50,#2E7D32)", border:"none", borderRadius:12, color:"#fff", fontSize:14, fontWeight:700, cursor:"pointer", boxShadow:"0 3px 10px rgba(76,175,80,0.4)" }}>
                {indice+1>=preguntas.length?"Completar zona":"Siguiente →"}
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
    <div style={{ background:"#5A9E52", minHeight:"100vh", fontFamily:"system-ui,sans-serif" }}>
      <div style={{ ...shell, background:"linear-gradient(180deg,#A8D5A2 0%,#5A9E52 100%)", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:24, textAlign:"center" }}>
        <div style={{ fontSize:52, marginBottom:6 }}>🎉</div>
        <img src="/mascota.png" alt="Rufi" style={{ width:130, height:130, objectFit:"contain", marginBottom:12 }}/>
        <h2 style={{ fontSize:22, fontWeight:900, color:"#fff", textShadow:"0 2px 8px rgba(0,0,0,0.3)", margin:"0 0 6px" }}>
          {zonaActiva?.nombre} completada
        </h2>
        <p style={{ color:"rgba(255,255,255,0.9)", marginBottom:16, fontSize:14 }}>
          {correctas} de {preguntas.length} correctas
        </p>
        <div style={{ display:"flex", gap:6, marginBottom:20 }}>
          {preguntas.map((_,i) => <span key={i} style={{ fontSize:28, filter:i<correctas?"none":"grayscale(1) opacity(0.4)" }}>⭐</span>)}
        </div>
        {siguienteZona && (
          <div style={{ background:"rgba(255,255,255,0.9)", borderRadius:12, padding:"10px 16px", marginBottom:16, fontSize:13, color:"#2C3E50", fontWeight:600 }}>
            Desbloqueaste: {siguienteZona.icono} {siguienteZona.nombre}
          </div>
        )}
        <button onClick={() => setPantalla("mapa")} style={{ padding:"13px 28px", background:"#fff", border:"none", borderRadius:12, color:"#2E7D32", fontSize:15, fontWeight:800, cursor:"pointer", boxShadow:"0 4px 14px rgba(0,0,0,0.18)" }}>
          Volver al mapa
        </button>
      </div>
    </div>
  )
}