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

const MATERIAS_OPC = [
  { id:"matematicas", nombre:"Matemáticas", emoji:"📐", disponible:true  },
  { id:"lenguaje",    nombre:"Lenguaje",     emoji:"📖", disponible:false },
  { id:"historia",    nombre:"Historia",     emoji:"🏛️", disponible:false },
  { id:"ciencias",    nombre:"Ciencias",     emoji:"🔬", disponible:false },
]

const DIAS_OPC = [
  {id:"L",nombre:"Lun"},{id:"M",nombre:"Mar"},{id:"X",nombre:"Mié"},
  {id:"J",nombre:"Jue"},{id:"V",nombre:"Vie"},{id:"S",nombre:"Sáb"},{id:"D",nombre:"Dom"},
]

const ZONA_INFO = [
  { msg:"El desierto de Atacama es el mas arido del mundo. Hay zonas donde no ha llovido nunca." },
  { msg:"La NASA probo sus rovers en el Valle de la Luna porque se parece tanto a Marte." },
  { msg:"Santiago esta rodeada por los Andes. En dias despejados ves picos nevados desde cualquier parte de la ciudad." },
  { msg:"Los arboles de la Araucania tienen hasta 2.000 años de antiguedad." },
  { msg:"Animo ya queda poco" },
]

const POSICIONES = [
  {top:"12%",left:"52%"},{top:"29%",left:"47%"},{top:"47%",left:"49%"},
  {top:"64%",left:"44%"},{top:"83%",left:"40%"},
]

const shell = {
  maxWidth:420, margin:"0 auto", minHeight:"100vh",
  position:"relative", boxShadow:"0 0 40px rgba(0,0,0,0.12)", overflow:"hidden",
}

const greenBg = {
  background:"linear-gradient(180deg,#A8D5A2 0%,#4A8C3F 100%)",
  display:"flex", flexDirection:"column", alignItems:"center",
  justifyContent:"center", padding:"32px 24px", textAlign:"center", minHeight:"100vh",
}

export default function App() {
  const nombreGuardado = localStorage.getItem("preusmart_nombre")

  const [nombre,               setNombre]               = useState(nombreGuardado || "")
  const [paso,                 setPaso]                  = useState(0)
  const [inputNombre,          setInputNombre]           = useState("")
  const [materiasSelec,        setMateriasSelec]         = useState(["matematicas"])
  const [diasSelec,            setDiasSelec]             = useState([])

  const [pantalla,             setPantalla]              = useState("mapa")
  const [zonas,                setZonas]                 = useState([])
  const [preguntas,            setPreguntas]             = useState([])
  const [zonaActiva,           setZonaActiva]            = useState(null)
  const [indice,               setIndice]                = useState(0)
  const [seleccion,            setSeleccion]             = useState(null)
  const [feedback,             setFeedback]              = useState(false)
  const [correctas,            setCorrectas]             = useState(0)
  const [imgMascota,           setImgMascota]            = useState("mascota.png")
  const [comentario,           setComentario]            = useState("")
  const [cargandoComentario,   setCargandoComentario]    = useState(false)

  useEffect(() => {
    if (!nombre) return
    fetch(`${API}/zonas`)
      .then(r => r.json())
      .then(zonasData => {
        const progreso  = getProgreso()
        const completadas = progreso.filter(p => p.completada).map(p => p.zona_id)
        setZonas(zonasData.map((z, i) => ({
          ...z,
          completada:   completadas.includes(z.id),
          desbloqueada: i === 0 || completadas.includes(zonasData[i-1].id)
        })))
      })
  }, [nombre])

  function toggleMateria(id) {
    setMateriasSelec(prev => prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id])
  }
  function toggleDia(id) {
    setDiasSelec(prev => prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id])
  }

  function completarOnboarding() {
    const n = inputNombre.trim()
    localStorage.setItem("preusmart_nombre",  n)
    localStorage.setItem("preusmart_materias", JSON.stringify(materiasSelec))
    localStorage.setItem("preusmart_dias",     JSON.stringify(diasSelec))
    setNombre(n)
    fetch(`${API}/registro`, {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ usuario_id:USUARIO_ID, nombre:n, materias:materiasSelec, dias_estudio:diasSelec })
    }).catch(() => {})
  }

  function jugarZona(zona) {
    setZonaActiva(zona); setIndice(0); setSeleccion(null)
    setFeedback(false); setCorrectas(0); setImgMascota("mascota.png"); setComentario("")
    fetch(`${API}/preguntas/${zona.id}`).then(r=>r.json()).then(data=>{setPreguntas(data);setPantalla("quiz")})
  }

  function responder(opcion) {
    if (feedback) return
    setSeleccion(opcion); setFeedback(true); setComentario(""); setCargandoComentario(true)
    const esCorrecta = opcion === preguntas[indice].respuesta_correcta
    if (esCorrecta) { setCorrectas(c=>c+1); setImgMascota("mascota.png") }
    else setImgMascota("mascota-triste.png")
    fetch(`${API}/comentario`, {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ es_correcto:esCorrecta, pregunta:preguntas[indice].enunciado, respuesta_usuario:opcion, respuesta_correcta:preguntas[indice].respuesta_correcta })
    }).then(r=>r.json()).then(data=>{setComentario(data.comentario);setCargandoComentario(false)}).catch(()=>{setCargandoComentario(false)})
  }

  function siguiente() {
    const esUltima = indice+1 >= preguntas.length
    const total = correctas + (seleccion === preguntas[indice].respuesta_correcta ? 1 : 0)
    if (esUltima) {
      saveProgreso(zonaActiva.id, total)
      fetch(`${API}/progreso`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({usuario_id:USUARIO_ID,zona_id:zonaActiva.id,puntaje:total})}).catch(()=>{})
      setZonas(prev=>prev.map((z,i,arr)=>{
        if(z.id===zonaActiva.id) return{...z,completada:true}
        if(i>0&&arr[i-1].id===zonaActiva.id) return{...z,desbloqueada:true}
        return z
      }))
      setPantalla("completado")
    } else {
      setIndice(i=>i+1); setSeleccion(null); setFeedback(false); setImgMascota("mascota.png"); setComentario("")
    }
  }

  /* ── ONBOARDING ── */
  if (!nombre) {

    /* Paso 0 — Nombre */
    if (paso === 0) return (
      <div style={{background:"#4A8C3F",minHeight:"100vh",fontFamily:"system-ui,sans-serif"}}>
        <div style={{...shell,...greenBg}}>
          <h1 style={{fontSize:28,fontWeight:900,color:"#fff",margin:"0 0 4px",textShadow:"0 2px 8px rgba(0,0,0,0.2)"}}>PreuSmart</h1>
          <p style={{color:"rgba(255,255,255,0.8)",fontSize:13,marginBottom:24}}>Tu compañero hacia la universidad</p>
          <img src="/mascota.png" alt="Rufi" style={{width:130,height:130,objectFit:"contain",marginBottom:16}}/>
          <div style={{background:"#fff",borderRadius:"16px 16px 16px 4px",padding:"12px 16px",marginBottom:28,fontSize:14,fontWeight:500,color:"#2C3E50",maxWidth:260,lineHeight:1.6}}>
            Hola! Soy Rufi. Voy a acompañarte en tu camino hacia la universidad. ¿Cómo te llamas?
          </div>
          <div style={{width:"100%",maxWidth:300}}>
            <input
              type="text" placeholder="Tu nombre o apodo..."
              value={inputNombre} onChange={e=>setInputNombre(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&inputNombre.trim()&&setPaso(1)}
              style={{width:"100%",padding:"13px 16px",borderRadius:12,border:"none",fontSize:15,fontFamily:"system-ui,sans-serif",marginBottom:10,boxShadow:"0 2px 10px rgba(0,0,0,0.15)",outline:"none",boxSizing:"border-box"}}
            />
            <button onClick={()=>inputNombre.trim()&&setPaso(1)}
              style={{width:"100%",padding:13,background:inputNombre.trim()?"#fff":"rgba(255,255,255,0.3)",border:"none",borderRadius:12,color:inputNombre.trim()?"#2E7D32":"rgba(255,255,255,0.5)",fontSize:15,fontWeight:800,cursor:inputNombre.trim()?"pointer":"default",boxShadow:inputNombre.trim()?"0 4px 14px rgba(0,0,0,0.2)":"none",transition:"all 0.2s"}}>
              Continuar →
            </button>
          </div>
        </div>
      </div>
    )

    /* Paso 1 — Materias */
    if (paso === 1) return (
      <div style={{background:"#4A8C3F",minHeight:"100vh",fontFamily:"system-ui,sans-serif"}}>
        <div style={{...shell,...greenBg}}>
          <img src="/mascota.png" alt="Rufi" style={{width:110,height:110,objectFit:"contain",marginBottom:14}}/>
          <div style={{background:"#fff",borderRadius:"16px 16px 16px 4px",padding:"12px 16px",marginBottom:24,fontSize:14,fontWeight:500,color:"#2C3E50",maxWidth:260,lineHeight:1.6}}>
            {inputNombre.trim()}, que bueno tenerte aca. ¿Qué quieres explorar conmigo?
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,width:"100%",maxWidth:300,marginBottom:20}}>
            {MATERIAS_OPC.map(m=>{
              const sel = materiasSelec.includes(m.id)
              return (
                <div key={m.id} onClick={()=>toggleMateria(m.id)} style={{background:sel?"rgba(255,255,255,0.95)":"rgba(255,255,255,0.25)",border:`2px solid ${sel?"#FFD700":"rgba(255,255,255,0.35)"}`,borderRadius:14,padding:"14px 10px",cursor:"pointer",textAlign:"center",boxShadow:sel?"0 0 0 3px rgba(255,215,0,0.3)":"none",transition:"all 0.15s",position:"relative"}}>
                  <div style={{fontSize:28,marginBottom:4}}>{m.emoji}</div>
                  <div style={{fontSize:12,fontWeight:700,color:sel?"#2C3E50":"#fff"}}>{m.nombre}</div>
                  {!m.disponible&&<div style={{position:"absolute",top:5,right:5,background:"rgba(0,0,0,0.25)",color:"#fff",fontSize:8,fontWeight:700,padding:"1px 5px",borderRadius:10}}>pronto</div>}
                  {sel&&<div style={{position:"absolute",top:6,left:8,fontSize:12,color:"#2E7D32"}}>✓</div>}
                </div>
              )
            })}
          </div>
          <button onClick={()=>materiasSelec.length>0&&setPaso(2)}
            style={{width:"100%",maxWidth:300,padding:13,background:materiasSelec.length>0?"#fff":"rgba(255,255,255,0.3)",border:"none",borderRadius:12,color:materiasSelec.length>0?"#2E7D32":"rgba(255,255,255,0.5)",fontSize:15,fontWeight:800,cursor:materiasSelec.length>0?"pointer":"default",boxShadow:materiasSelec.length>0?"0 4px 14px rgba(0,0,0,0.2)":"none",transition:"all 0.2s"}}>
            Listo →
          </button>
        </div>
      </div>
    )

    /* Paso 2 — Días */
    return (
      <div style={{background:"#4A8C3F",minHeight:"100vh",fontFamily:"system-ui,sans-serif"}}>
        <div style={{...shell,...greenBg}}>
          <img src="/mascota.png" alt="Rufi" style={{width:110,height:110,objectFit:"contain",marginBottom:14}}/>
          <div style={{background:"#fff",borderRadius:"16px 16px 16px 4px",padding:"12px 16px",marginBottom:24,fontSize:14,fontWeight:500,color:"#2C3E50",maxWidth:260,lineHeight:1.6}}>
            ¿Qué días quieres que nos juntemos a explorar?
          </div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap",justifyContent:"center",marginBottom:24,maxWidth:300}}>
            {DIAS_OPC.map(d=>{
              const sel = diasSelec.includes(d.id)
              return (
                <div key={d.id} onClick={()=>toggleDia(d.id)} style={{width:56,height:56,borderRadius:14,background:sel?"#fff":"rgba(255,255,255,0.25)",border:`2px solid ${sel?"#FFD700":"rgba(255,255,255,0.35)"}`,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",cursor:"pointer",boxShadow:sel?"0 0 0 3px rgba(255,215,0,0.3)":"none",transition:"all 0.15s"}}>
                  <div style={{fontSize:14,fontWeight:800,color:sel?"#2E7D32":"#fff"}}>{d.id}</div>
                  <div style={{fontSize:9,color:sel?"#555":"rgba(255,255,255,0.8)"}}>{d.nombre}</div>
                </div>
              )
            })}
          </div>
          <button onClick={()=>diasSelec.length>0&&completarOnboarding()}
            style={{width:"100%",maxWidth:300,padding:13,background:diasSelec.length>0?"#fff":"rgba(255,255,255,0.3)",border:"none",borderRadius:12,color:diasSelec.length>0?"#2E7D32":"rgba(255,255,255,0.5)",fontSize:15,fontWeight:800,cursor:diasSelec.length>0?"pointer":"default",boxShadow:diasSelec.length>0?"0 4px 14px rgba(0,0,0,0.2)":"none",transition:"all 0.2s"}}>
            Empezar viaje →
          </button>
          <p style={{color:"rgba(255,255,255,0.55)",fontSize:11,marginTop:12}}>Puedes cambiarlo cuando quieras</p>
        </div>
      </div>
    )
  }

  /* ── MAPA ── */
  if (pantalla === "mapa") {
    const zonaActualIdx = zonas.findIndex(z=>z.desbloqueada&&!z.completada)
    const msg = zonaActualIdx>=0
      ? `${nombre}, ${ZONA_INFO[zonaActualIdx].msg.toLowerCase()}`
      : `${nombre}, completaste todo Chile. Eso no lo hace cualquiera.`

    return (
      <div style={{background:"#a8d4e6",minHeight:"100vh",fontFamily:"system-ui,sans-serif"}}>
        <div style={shell}>
          <div style={{position:"sticky",top:0,zIndex:50,background:"rgba(255,255,255,0.88)",backdropFilter:"blur(8px)",padding:"10px 18px",display:"flex",alignItems:"center",justifyContent:"space-between",boxShadow:"0 1px 6px rgba(0,0,0,0.08)"}}>
            <h1 style={{fontSize:20,fontWeight:900,color:"#1a3a1a",margin:0}}>PreuSmart</h1>
            <div style={{display:"flex",gap:3}}>
              {zonas.map((z,i)=><span key={i} style={{fontSize:16,filter:z.completada?"none":"grayscale(1) opacity(0.35)"}}>⭐</span>)}
            </div>
          </div>
          <div style={{position:"relative",background:"#a8d4e6"}}>
            <img src="/mapa-chile.png" alt="Mapa de Chile" style={{width:"100%",display:"block"}}/>
            {zonas.map((zona,i)=>{
              const esCurrent=zona.desbloqueada&&!zona.completada
              const pos=POSICIONES[i]
              return (
                <div key={zona.id} onClick={()=>esCurrent&&jugarZona(zona)} style={{position:"absolute",top:pos.top,left:pos.left,transform:"translate(-50%,-50%)",display:"flex",flexDirection:"column",alignItems:"center",gap:3,cursor:esCurrent?"pointer":"default",zIndex:10}}>
                  <div style={{width:esCurrent?48:38,height:esCurrent?48:38,borderRadius:"50%",background:zona.completada?"#4CAF50":zona.desbloqueada?"rgba(255,255,255,0.95)":"rgba(255,255,255,0.45)",border:`2.5px solid ${esCurrent?"#FFD700":zona.completada?"#2E7D32":"rgba(80,80,80,0.4)"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:esCurrent?20:17,boxShadow:esCurrent?"0 0 0 4px rgba(255,215,0,0.4),0 3px 10px rgba(0,0,0,0.25)":"0 2px 5px rgba(0,0,0,0.2)",transition:"all 0.2s"}}>
                    {zona.completada?"✅":zona.desbloqueada?zona.icono:"🔒"}
                  </div>
                  <div style={{background:"rgba(255,255,255,0.88)",borderRadius:20,padding:"1px 7px",fontSize:9,fontWeight:700,color:"#1a3a1a",boxShadow:"0 1px 3px rgba(0,0,0,0.12)",whiteSpace:"nowrap"}}>{zona.nombre}</div>
                  {esCurrent&&<div style={{background:"#4CAF50",color:"#fff",borderRadius:20,padding:"2px 8px",fontSize:9,fontWeight:700,boxShadow:"0 2px 5px rgba(76,175,80,0.5)"}}>Jugar →</div>}
                </div>
              )
            })}
            <div style={{position:"absolute",bottom:12,left:10,display:"flex",flexDirection:"column",alignItems:"flex-start",gap:5,zIndex:20}}>
              <div style={{background:"#fff",borderRadius:"14px 14px 14px 3px",padding:"7px 11px",boxShadow:"0 2px 12px rgba(0,0,0,0.15)",maxWidth:190,fontSize:11,fontWeight:500,color:"#2C3E50",lineHeight:1.5}}>{msg}</div>
              <img src="/mascota.png" alt="Rufi" style={{width:90,height:90,objectFit:"contain"}}/>
            </div>
          </div>
        </div>
      </div>
    )
  }

  /* ── QUIZ ── */
  if (pantalla === "quiz") {
    const pregunta = preguntas[indice]
    const opciones = [{letra:"A",texto:pregunta.opcion_a},{letra:"B",texto:pregunta.opcion_b},{letra:"C",texto:pregunta.opcion_c},{letra:"D",texto:pregunta.opcion_d}]
    return (
      <div style={{background:"#f0f7f0",minHeight:"100vh",fontFamily:"system-ui,sans-serif"}}>
        <div style={{...shell,background:"linear-gradient(180deg,#E8F5E9 0%,#F1F8E9 100%)",padding:"14px 14px 28px"}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:16}}>
            <button onClick={()=>setPantalla("mapa")} style={{background:"#fff",border:"none",borderRadius:9,padding:"7px 12px",cursor:"pointer",fontSize:16,boxShadow:"0 2px 5px rgba(0,0,0,0.1)"}}>←</button>
            <div style={{flex:1}}>
              <div style={{fontSize:12,fontWeight:700,color:"#2C3E50",marginBottom:5}}>{zonaActiva.icono} {zonaActiva.nombre} · {indice+1}/{preguntas.length}</div>
              <div style={{height:7,background:"#ddd",borderRadius:4,overflow:"hidden"}}>
                <div style={{height:"100%",width:`${(indice/preguntas.length)*100}%`,background:"linear-gradient(90deg,#4CAF50,#8BC34A)",borderRadius:4,transition:"width 0.4s"}}/>
              </div>
            </div>
          </div>
          <div style={{background:"#fff",borderRadius:16,padding:"16px",marginBottom:12,boxShadow:"0 3px 12px rgba(0,0,0,0.07)"}}>
            <div style={{fontSize:10,color:"#4CAF50",fontWeight:700,marginBottom:7,letterSpacing:1}}>PREGUNTA {indice+1}</div>
            <p style={{fontSize:14,lineHeight:1.7,color:"#2C3E50",margin:0}}>{pregunta.enunciado}</p>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:12}}>
            {opciones.map(op=>{
              const esCorrecta=op.letra===pregunta.respuesta_correcta, esSeleccionada=op.letra===seleccion
              let bg="#fff",border="#E0E0E0",labelBg="#F5F5F5",labelColor="#666",color="#2C3E50"
              if(feedback&&esCorrecta){bg="#E8F5E9";border="#4CAF50";color="#1B5E20";labelBg="#4CAF50";labelColor="#fff"}
              else if(feedback&&esSeleccionada){bg="#FFEBEE";border="#F44336";color="#B71C1C";labelBg="#F44336";labelColor="#fff"}
              else if(esSeleccionada){bg="#E8F5E9";border="#4CAF50";labelBg="#4CAF50";labelColor="#fff"}
              return (
                <div key={op.letra} onClick={()=>responder(op.letra)} style={{display:"flex",alignItems:"center",gap:10,padding:"12px 14px",borderRadius:12,border:`2px solid ${border}`,background:bg,cursor:feedback?"default":"pointer",transition:"all 0.15s"}}>
                  <span style={{width:28,height:28,borderRadius:"50%",background:labelBg,color:labelColor,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,flexShrink:0}}>
                    {feedback&&esCorrecta?"✓":feedback&&esSeleccionada&&!esCorrecta?"✗":op.letra}
                  </span>
                  <span style={{fontSize:13,color,fontWeight:esSeleccionada||(feedback&&esCorrecta)?600:400}}>{op.texto}</span>
                </div>
              )
            })}
          </div>
          {feedback&&(
            <div>
              <div style={{padding:"11px 14px",borderRadius:12,marginBottom:10,background:seleccion===pregunta.respuesta_correcta?"#E8F5E9":"#FFEBEE",border:`1px solid ${seleccion===pregunta.respuesta_correcta?"#4CAF50":"#F44336"}`}}>
                <div style={{fontWeight:700,fontSize:13,color:seleccion===pregunta.respuesta_correcta?"#2E7D32":"#C62828",marginBottom:3}}>{seleccion===pregunta.respuesta_correcta?"Correcto":"No era esa"}</div>
                <div style={{fontSize:12,color:"#555",lineHeight:1.5}}>{pregunta.explicacion}</div>
              </div>
              <div style={{display:"flex",alignItems:"flex-end",gap:8,marginBottom:12}}>
                <img src={`/${imgMascota}`} alt="Rufi" style={{width:70,height:70,objectFit:"contain",flexShrink:0}}/>
                <div style={{background:"#fff",borderRadius:"14px 14px 14px 3px",padding:"9px 12px",boxShadow:"0 2px 8px rgba(0,0,0,0.09)",fontSize:12,fontWeight:500,color:"#2C3E50",flex:1,lineHeight:1.5}}>
                  {cargandoComentario?"...":comentario||(seleccion===pregunta.respuesta_correcta?"Bien hecho.":"Sigue, la proxima es tuya.")}
                </div>
              </div>
              <button onClick={siguiente} style={{width:"100%",padding:13,background:"linear-gradient(135deg,#4CAF50,#2E7D32)",border:"none",borderRadius:12,color:"#fff",fontSize:14,fontWeight:700,cursor:"pointer",boxShadow:"0 3px 10px rgba(76,175,80,0.4)"}}>
                {indice+1>=preguntas.length?"Completar zona":"Siguiente →"}
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  /* ── COMPLETADO ── */
  const siguienteZona = zonas.find(z=>z.desbloqueada&&!z.completada)
  return (
    <div style={{background:"#5A9E52",minHeight:"100vh",fontFamily:"system-ui,sans-serif"}}>
      <div style={{...shell,background:"linear-gradient(180deg,#A8D5A2 0%,#5A9E52 100%)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24,textAlign:"center"}}>
        <div style={{fontSize:52,marginBottom:6}}>🎉</div>
        <img src="/mascota.png" alt="Rufi" style={{width:130,height:130,objectFit:"contain",marginBottom:12}}/>
        <h2 style={{fontSize:22,fontWeight:900,color:"#fff",textShadow:"0 2px 8px rgba(0,0,0,0.3)",margin:"0 0 6px"}}>{zonaActiva?.nombre} completada</h2>
        <p style={{color:"rgba(255,255,255,0.9)",marginBottom:16,fontSize:14}}>{correctas} de {preguntas.length} correctas</p>
        <div style={{display:"flex",gap:6,marginBottom:20}}>
          {preguntas.map((_,i)=><span key={i} style={{fontSize:28,filter:i<correctas?"none":"grayscale(1) opacity(0.4)"}}>⭐</span>)}
        </div>
        {siguienteZona&&(
          <div style={{background:"rgba(255,255,255,0.9)",borderRadius:12,padding:"10px 16px",marginBottom:16,fontSize:13,color:"#2C3E50",fontWeight:600}}>
            Desbloqueaste: {siguienteZona.icono} {siguienteZona.nombre}
          </div>
        )}
        <button onClick={()=>setPantalla("mapa")} style={{padding:"13px 28px",background:"#fff",border:"none",borderRadius:12,color:"#2E7D32",fontSize:15,fontWeight:800,cursor:"pointer",boxShadow:"0 4px 14px rgba(0,0,0,0.18)"}}>
          Volver al mapa
        </button>
      </div>
    </div>
  )
}