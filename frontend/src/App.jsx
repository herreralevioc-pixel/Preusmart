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
  { deco: "🌵🏜️", msg: "El desierto te espera, preparate!" },
  { deco: "🌊🌺", msg: "Norte Chico, costa y flores!" },
  { deco: "🏔️🌆", msg: "La capital te desafia!" },
  { deco: "🌲🌧️", msg: "El sur es tuyo, vamos!" },
  { deco: "🧊🐧", msg: "Ultimo desafio, tu puedes!" },
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
    fetch(`${API}/preguntas/${zona.id}`)
      .then(r => r.json())
      .then(data => { setPreguntas(data); setPantalla("quiz") })
  }

  function responder(opcion) {
    if (feedback) return
    setSeleccion(opcion)
    setFeedback(true)
    if (opcion === preguntas[indice].respuesta_correcta) {
      setCorrectas(c => c + 1)
      setImgMascota("mascota.png")
    } else {
      setImgMascota("mascota-triste.png")
    }
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
    }
  }

  /* ── MAPA ── */
  if (pantalla === "mapa") {
    const zonaActualIdx = zonas.findIndex(z => z.desbloqueada && !z.completada)
    const msg = zonaActualIdx >= 0 ? ZONA_INFO[zonaActualIdx].msg : "Completaste todo Chile!"

    return (
      <div style={{ minHeight:"100vh", background:"linear-gradient(180deg,#A8D5A2 0%,#5A9E52 60%,#2D6A27 100%)", fontFamily:"system-ui,sans-serif", paddingBottom:120 }}>

        {/* Header */}
        <div style={{ textAlign:"center", padding:"28px 20px 8px" }}>
          <h1 style={{ fontSize:34, fontWeight:900, color:"#fff", margin:0, textShadow:"0 2px 10px rgba(0,0,0,0.3)" }}>PreuSmart</h1>
          <p style={{ color:"rgba(255,255,255,0.85)", margin:"4px 0 0", fontSize:14 }}>Recorre Chile respondiendo la PAES</p>
        </div>

        {/* Estrellas */}
        <div style={{ display:"flex", justifyContent:"center", gap:6, padding:"10px 0 20px" }}>
          {zonas.map((z,i) => (
            <span key={i} style={{ fontSize:22, filter:z.completada?"none":"grayscale(1) opacity(0.35)" }}>⭐</span>
          ))}
        </div>

        {/* Zonas */}
        <div style={{ maxWidth:360, margin:"0 auto", padding:"0 20px", position:"relative" }}>
          <div style={{ position:"absolute", left:"50%", top:0, bottom:0, width:2, background:"rgba(255,255,255,0.35)", transform:"translateX(-50%)", backgroundImage:"repeating-linear-gradient(to bottom,rgba(255,255,255,0.5) 0,rgba(255,255,255,0.5) 8px,transparent 8px,transparent 18px)" }}/>

          <div style={{ display:"flex", flexDirection:"column", gap:18 }}>
            {zonas.map((zona, i) => {
              const esCurrent = zona.desbloqueada && !zona.completada
              const info = ZONA_INFO[i]
              return (
                <div key={zona.id} style={{ display:"flex", alignItems:"center", gap:12, flexDirection: i%2===0?"row":"row-reverse" }}>
                  <div
                    onClick={() => esCurrent && jugarZona(zona)}
                    style={{
                      width:64, height:64, borderRadius:"50%", flexShrink:0,
                      background: zona.completada?"#4CAF50": zona.desbloqueada?"#fff":"rgba(255,255,255,0.25)",
                      border:`3px solid ${esCurrent?"#FFD700":zona.completada?"#2E7D32":"rgba(255,255,255,0.4)"}`,
                      display:"flex", alignItems:"center", justifyContent:"center", fontSize:26,
                      cursor: esCurrent?"pointer":"default",
                      boxShadow: esCurrent?"0 0 0 5px rgba(255,215,0,0.4),0 4px 12px rgba(0,0,0,0.2)":"0 2px 8px rgba(0,0,0,0.15)",
                    }}>
                    {zona.completada?"✅": zona.desbloqueada? zona.icono:"🔒"}
                  </div>

                  <div style={{
                    flex:1, borderRadius:14, padding:"10px 14px",
                    background: zona.completada?"rgba(76,175,80,0.88)": zona.desbloqueada?"rgba(255,255,255,0.88)":"rgba(255,255,255,0.22)",
                    boxShadow:"0 2px 8px rgba(0,0,0,0.1)"
                  }}>
                    <div style={{ fontWeight:700, fontSize:15, color: zona.completada?"#fff": zona.desbloqueada?"#2C3E50":"rgba(255,255,255,0.75)" }}>{zona.nombre}</div>
                    <div style={{ fontSize:13, marginTop:2, color: zona.desbloqueada && !zona.completada?"#555":"rgba(255,255,255,0.7)" }}>{info.deco}</div>
                    {esCurrent && (
                      <div onClick={() => jugarZona(zona)} style={{ marginTop:7, display:"inline-block", background:"#4CAF50", color:"#fff", borderRadius:20, padding:"3px 12px", fontSize:12, fontWeight:700, cursor:"pointer" }}>
                        Jugar →
                      </div>
                    )}
                    {zona.completada && <div style={{ fontSize:12, color:"rgba(255,255,255,0.9)", marginTop:4, fontWeight:600 }}>✓ Completada</div>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Mascota + burbuja */}
        <div style={{ position:"fixed", bottom:0, left:0, right:0, padding:"0 20px 12px", display:"flex", alignItems:"flex-end", pointerEvents:"none" }}>
          <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-start", gap:8 }}>
            <div style={{ background:"#fff", borderRadius:"16px 16px 16px 4px", padding:"10px 14px", boxShadow:"0 2px 12px rgba(0,0,0,0.15)", maxWidth:200, fontSize:13, fontWeight:600, color:"#2C3E50", lineHeight:1.4 }}>
              {msg}
            </div>
            <img src="/mascota.png" alt="mascota" style={{ width:88, height:88, objectFit:"contain" }}/>
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
      <div style={{ minHeight:"100vh", background:"linear-gradient(180deg,#E8F5E9 0%,#F1F8E9 100%)", fontFamily:"system-ui,sans-serif", padding:"16px 16px 100px" }}>
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
                  {seleccion===pregunta.respuesta_correcta?"✓ Correcto!":"✗ No era esa"}
                </div>
                <div style={{ fontSize:13, color:"#555", lineHeight:1.5 }}>{pregunta.explicacion}</div>
              </div>
              <button onClick={siguiente} style={{ width:"100%", padding:15, background:"linear-gradient(135deg,#4CAF50,#2E7D32)", border:"none", borderRadius:14, color:"#fff", fontSize:15, fontWeight:700, cursor:"pointer", boxShadow:"0 4px 12px rgba(76,175,80,0.4)" }}>
                {indice+1>=preguntas.length?"Completar zona! 🎉":"Siguiente →"}
              </button>
            </div>
          )}
        </div>

        <div style={{ position:"fixed", bottom:12, right:16 }}>
          <img src={`/${imgMascota}`} alt="mascota" style={{ width:80, height:80, objectFit:"contain" }}/>
        </div>
      </div>
    )
  }

  /* ── COMPLETADO ── */
  const siguienteZona = zonas.find(z => z.desbloqueada && !z.completada)
  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(180deg,#A8D5A2 0%,#5A9E52 100%)", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:24, fontFamily:"system-ui,sans-serif", textAlign:"center" }}>
      <div style={{ fontSize:60, marginBottom:8 }}>🎉</div>
      <img src="/mascota.png" alt="mascota" style={{ width:120, height:120, objectFit:"contain", marginBottom:16 }}/>
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