import { useState, useRef, useEffect } from 'react'
import { useApp } from '../context/AppContext'
import { useBcv } from '../hooks/useBcv'
import { Sparkles, X, Send } from 'lucide-react'
import { hoyVE } from '../lib/fecha'

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

const SUGERENCIAS = [
  '¿Cuánto ingresé este mes?',
  '¿Cuántas citas tengo esta semana?',
  '¿Cuál es mi servicio más solicitado?',
  '¿Cuál es el balance del mes?',
]

function construirContexto({ clientes, ingresos, citas, egresos, tasaHoy }) {
  const hoyStr = hoyVE()
  const hoy = new Date(hoyStr + 'T12:00')
  const mesStr = hoyStr.slice(0, 7)
  const mes  = hoy.getMonth()
  const anio = hoy.getFullYear()

  const esMes = (x) => x.fecha && x.fecha.slice(0, 7) === mesStr

  const ingresosMes = ingresos.filter(esMes)
  const egresosMes  = egresos.filter(esMes)
  const citasMes    = citas.filter(esMes)

  const toUsd = (i) => {
    if (i.moneda === 'USD') return Number(i.monto)
    const t = Number(i.tasa_bcv)
    return t ? Number(i.monto) / t : 0
  }

  const totalMesUsd     = ingresosMes.reduce((a, i) => a + toUsd(i), 0)
  const totalEgresosUsd = egresosMes.reduce((a, e) => {
    if (e.moneda === 'USD') return a + Number(e.monto)
    return tasaHoy ? a + Number(e.monto) / tasaHoy : a
  }, 0)

  const dow = hoy.getDay()
  const dl  = dow === 0 ? 6 : dow - 1
  const lun = new Date(hoy); lun.setDate(hoy.getDate() - dl)
  const dom = new Date(lun); dom.setDate(lun.getDate() + 6)
  const fmt = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
  const lunesStr = fmt(lun), domingoStr = fmt(dom)

  const mesesMap = {}
  ingresos.forEach(i => {
    if (!i.fecha) return
    const k = i.fecha.slice(0, 7)
    if (!mesesMap[k]) mesesMap[k] = { ingresos: 0, pagos: 0 }
    mesesMap[k].ingresos += toUsd(i)
    mesesMap[k].pagos++
  })
  const resumenMensual = Object.entries(mesesMap).sort((a,b) => a[0].localeCompare(b[0]))
    .map(([k, v]) => {
      const citasK = citas.filter(c => c.fecha && c.fecha.startsWith(k))
      return `${k}: $${v.ingresos.toFixed(2)} USD | ${v.pagos} cobros | ${citasK.length} citas (${citasK.filter(c=>c.estado==='atendida').length} atendidas)`
    }).join('\n')

  return `Eres el asistente inteligente de BarberShop Samuel S7tyle, una barbería en Venezuela.
Responde siempre en español, de forma concisa, directa y amigable. Usa los datos exactos provistos.
Moneda principal: USD. Cobros en Bs se convierten con la tasa BCV EUR guardada en cada cobro.

=== HOY: ${hoyStr} (${MESES[mes]} ${anio}) ===
Tasa BCV EUR: ${tasaHoy ? parseFloat(tasaHoy.toFixed(4)) : 'no disponible'} Bs/€

=== RESUMEN ${MESES[mes].toUpperCase()} ${anio} ===
Ingresos: $${totalMesUsd.toFixed(2)} USD (${ingresosMes.length} cobros)
Egresos: $${totalEgresosUsd.toFixed(2)} USD (${egresosMes.length} gastos)
Balance: $${(totalMesUsd - totalEgresosUsd).toFixed(2)} USD
Citas: ${citasMes.length} | Atendidas: ${citasMes.filter(c=>c.estado==='atendida').length} | Canceladas: ${citasMes.filter(c=>c.estado==='cancelada').length} | No asistió: ${citasMes.filter(c=>c.estado==='no_asistio').length}

=== SEMANA ACTUAL (${lunesStr} al ${domingoStr}) ===
${citas.filter(c=>c.fecha>=lunesStr&&c.fecha<=domingoStr).length > 0
  ? citas.filter(c=>c.fecha>=lunesStr&&c.fecha<=domingoStr).sort((a,b)=>a.fecha.localeCompare(b.fecha)||(a.hora||'').localeCompare(b.hora||'')).map(c=>`- ${c.fecha} ${c.hora||'sin hora'}: ${c.cliente_nombre} | ${c.motivo} | ${c.estado||'pendiente'}`).join('\n')
  : 'Sin citas esta semana'}

=== RESUMEN HISTÓRICO POR MES ===
${resumenMensual || 'Sin datos'}

=== TODOS LOS CLIENTES (${clientes.length}) ===
${clientes.map(c=>`- ${c.nombre} ${c.apellido} | ${c.telefono||'sin teléfono'} | Registrado: ${c.created_at ? c.created_at.split('T')[0] : 'desconocido'}`).join('\n')}

=== TODOS LOS INGRESOS (${ingresos.length}) ===
${[...ingresos].sort((a,b)=>(b.fecha||'').localeCompare(a.fecha||'')).map(i=>`- ${i.fecha}: ${i.cliente_nombre} | ${i.concepto} | ${i.moneda==='USD'?'$':'Bs.'}${Number(i.monto).toFixed(2)} | ${i.metodo_pago}${i.tasa_bcv?' | Tasa:'+i.tasa_bcv:''}${i.notas?' | Nota:'+i.notas:''}`).join('\n')}

=== TODAS LAS CITAS (${citas.length}) ===
${[...citas].sort((a,b)=>(b.fecha||'').localeCompare(a.fecha||'')).map(c=>`- ${c.fecha} ${c.hora||'sin hora'}: ${c.cliente_nombre} | ${c.motivo} | ${c.estado||'pendiente'}${c.notas?' | '+c.notas:''}`).join('\n')}

=== TODOS LOS EGRESOS (${egresos.length}) ===
${[...egresos].sort((a,b)=>(b.fecha||'').localeCompare(a.fecha||'')).map(e=>`- ${e.fecha}: ${e.categoria||e.descripcion||'sin descripción'} | ${e.moneda==='USD'?'$':'Bs.'}${Number(e.monto).toFixed(2)}${e.descripcion?' | '+e.descripcion:''}`).join('\n')}`
}

export default function AsistenteIA() {
  const { clientes, ingresos, citas, egresos } = useApp()
  const { data: bcv } = useBcv()
  const tasaHoy = bcv?.eur ?? null

  const [abierto, setAbierto]   = useState(false)
  const [mensajes, setMensajes] = useState([])
  const [input, setInput]       = useState('')
  const [cargando, setCargando] = useState(false)
  const bottomRef = useRef(null)
  const inputRef  = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensajes, cargando])

  useEffect(() => {
    if (abierto) setTimeout(() => inputRef.current?.focus(), 300)
  }, [abierto])

  const enviar = async (textoOverride) => {
    const texto = (textoOverride || input).trim()
    if (!texto || cargando) return

    const nuevosMensajes = [...mensajes, { role: 'user', text: texto }]
    setMensajes(nuevosMensajes)
    setInput('')
    setCargando(true)

    try {
      const contexto = construirContexto({ clientes, ingresos, citas, egresos, tasaHoy })

      const messages = [
        { role: 'system', content: contexto },
        ...nuevosMensajes.map(m => ({
          role: m.role === 'user' ? 'user' : 'assistant',
          content: m.text
        }))
      ]

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages })
      })

      if (!res.ok) throw new Error('Error del servidor')
      const data = await res.json()
      const respuesta = data.respuesta || data.error || 'No pude generar una respuesta.'
      setMensajes(prev => [...prev, { role: 'model', text: respuesta }])
    } catch {
      setMensajes(prev => [...prev, { role: 'model', text: 'Error de conexión. Verifica tu internet e intenta de nuevo.' }])
    }

    setCargando(false)
  }

  return (
    <>
      {/* Botón flotante */}
      {!abierto && (
        <button
          onClick={() => setAbierto(true)}
          className="fixed bottom-24 right-4 z-40 w-13 h-13 rounded-full flex items-center justify-center"
          style={{
            width: '52px', height: '52px',
            background: 'linear-gradient(135deg, rgba(217,119,6,0.95), rgba(146,64,14,0.95))',
            border: '1px solid rgba(253,186,116,0.50)',
            boxShadow: '0 4px 24px rgba(217,119,6,0.50)'
          }}>
          <Sparkles size={21} className="text-white" />
        </button>
      )}

      {/* Chat */}
      {abierto && (
        <div className="fixed inset-0 z-[60] flex flex-col justify-end"
             style={{background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)'}}>
          <div onClick={() => setAbierto(false)} className="flex-1" />

          <div className="flex flex-col rounded-t-3xl w-full"
               style={{
                 background: 'rgba(20,10,0,0.98)',
                 border: '1px solid rgba(217,119,6,0.22)',
                 borderBottom: 'none',
                 height: '88vh',
                 backdropFilter: 'blur(32px)',
                 maxWidth: '448px',
                 marginLeft: 'auto',
                 marginRight: 'auto',
               }}>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 flex-shrink-0"
                 style={{borderBottom: '1px solid rgba(255,255,255,0.07)'}}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl flex items-center justify-center"
                     style={{background: 'linear-gradient(135deg, rgba(217,119,6,0.45), rgba(146,64,14,0.45))', border: '1px solid rgba(253,186,116,0.30)'}}>
                  <Sparkles size={16} className="text-amber-300" />
                </div>
                <div>
                  <p className="text-white font-bold text-sm">Asistente IA</p>
                  <p className="text-white/35 text-xs">Powered by Groq · Llama 3.3</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {mensajes.length > 0 && (
                  <button onClick={() => setMensajes([])} className="text-white/30 text-xs active:text-white/60">
                    Limpiar
                  </button>
                )}
                <button onClick={() => setAbierto(false)} className="text-white/35 active:text-white/70">
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Mensajes */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {mensajes.length === 0 && (
                <div className="space-y-5 pt-4">
                  <div className="text-center">
                    <Sparkles size={30} className="text-amber-400/30 mx-auto mb-3" />
                    <p className="text-white/55 text-sm font-semibold">Hola, Samuel 👋</p>
                    <p className="text-white/30 text-xs mt-1">Pregúntame sobre tus clientes, citas o ingresos</p>
                  </div>
                  <div className="space-y-2">
                    {SUGERENCIAS.map(s => (
                      <button key={s} onClick={() => enviar(s)}
                              className="w-full text-left px-4 py-2.5 rounded-2xl text-xs font-medium active:bg-white/5 transition-colors"
                              style={{background: 'rgba(217,119,6,0.10)', border: '1px solid rgba(217,119,6,0.22)', color: 'rgba(253,186,116,0.80)'}}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {mensajes.map((m, i) => (
                <div key={i} className={`flex gap-2 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {m.role === 'model' && (
                    <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-1"
                         style={{background: 'rgba(217,119,6,0.30)'}}>
                      <Sparkles size={11} className="text-amber-300" />
                    </div>
                  )}
                  <div className="max-w-[82%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed"
                       style={{
                         background: m.role === 'user' ? 'rgba(217,119,6,0.40)' : 'rgba(255,255,255,0.07)',
                         border: `1px solid ${m.role === 'user' ? 'rgba(217,119,6,0.55)' : 'rgba(255,255,255,0.09)'}`,
                         color: 'rgba(255,255,255,0.92)',
                         whiteSpace: 'pre-wrap'
                       }}>
                    {m.text}
                  </div>
                </div>
              ))}

              {cargando && (
                <div className="flex gap-2 justify-start">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                       style={{background: 'rgba(217,119,6,0.30)'}}>
                    <Sparkles size={11} className="text-amber-300" />
                  </div>
                  <div className="px-4 py-3 rounded-2xl flex items-center gap-1.5"
                       style={{background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.09)'}}>
                    {[0,1,2].map(i => (
                      <div key={i} className="w-1.5 h-1.5 rounded-full bg-amber-400/70 animate-bounce"
                           style={{animationDelay: `${i * 0.15}s`}} />
                    ))}
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="px-4 pb-5 pt-3 flex-shrink-0"
                 style={{borderTop: '1px solid rgba(255,255,255,0.07)'}}>
              <div className="flex gap-2 items-center">
                <input
                  ref={inputRef}
                  className="flex-1 glass-input"
                  placeholder="Pregunta algo..."
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar() } }}
                />
                <button
                  onClick={() => enviar()}
                  disabled={!input.trim() || cargando}
                  className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all"
                  style={{
                    background: input.trim() && !cargando ? 'rgba(217,119,6,0.55)' : 'rgba(255,255,255,0.07)',
                    border: `1px solid ${input.trim() && !cargando ? 'rgba(217,119,6,0.70)' : 'rgba(255,255,255,0.10)'}`,
                  }}>
                  <Send size={15} className={input.trim() && !cargando ? 'text-white' : 'text-white/25'} />
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </>
  )
}
