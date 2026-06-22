import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Scissors, Clock, CheckCircle2, XCircle, AlertCircle } from 'lucide-react'

function tiempoDesde(ts) {
  if (!ts) return null
  const min = Math.floor((Date.now() - new Date(ts).getTime()) / 60000)
  if (min < 1) return 'ahora mismo'
  if (min < 60) return `hace ${min} min`
  return `hace ${Math.floor(min / 60)}h`
}

function diaActualVE() {
  return new Date()
    .toLocaleDateString('es-VE', { weekday: 'long' })
    .replace(/^\w/, c => c.toUpperCase())
}

function fmt(hora) {
  if (!hora) return ''
  const [h, m] = hora.split(':').map(Number)
  const periodo = h < 12 ? 'am' : 'pm'
  const h12 = h % 12 || 12
  return m === 0 ? `${h12}${periodo}` : `${h12}:${String(m).padStart(2, '0')}${periodo}`
}

function waLink(dia, slot) {
  const msg = `Hola Samuel! Quiero confirmar mi turno el ${dia} de ${fmt(slot.inicio)} a ${fmt(slot.fin)} 🙏`
  return `https://wa.me/584121381501?text=${encodeURIComponent(msg)}`
}

const WaIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
)

export default function HorarioPublico() {
  const [dias, setDias]           = useState([])
  const [cargando, setCargando]   = useState(true)
  const [ultimaAct, setUltimaAct] = useState(null)

  useEffect(() => {
    const cargar = () =>
      supabase
        .from('disponibilidad')
        .select('*')
        .order('updated_at', { ascending: false })
        .then(({ data }) => {
          if (!data || data.length === 0) { setCargando(false); return }

          // Usar el user_id con la actualización más reciente (el barbero activo)
          const barberId = data[0].user_id
          const filas = data
            .filter(d => d.user_id === barberId)
            .sort((a, b) => a.orden - b.orden)
            .map(d => ({ ...d, slots: Array.isArray(d.slots) ? d.slots : [] }))

          setDias(filas)
          const ts = filas.reduce((m, d) => (d.updated_at > (m || '') ? d.updated_at : m), null)
          setUltimaAct(ts)
          setCargando(false)
        })

    cargar()

    // Realtime: actualiza al instante cuando el barbero guarda
    const channel = supabase
      .channel('horario_publico')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'disponibilidad' }, cargar)
      .subscribe()

    // Fallback: refresca cada 20s por si el realtime no dispara
    const intervalo = setInterval(cargar, 20000)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(intervalo)
    }
  }, [])

  const hoy = diaActualVE()

  return (
    <>
      <style>{`
        @media (prefers-reduced-motion: reduce) { .orb { animation: none !important; } }
      `}</style>

      <div className="bg-mesh" style={{ position: 'fixed', inset: 0, zIndex: -2 }} />
      <div style={{ position: 'fixed', inset: 0, zIndex: -1, overflow: 'hidden', pointerEvents: 'none' }}>
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
        <div className="orb orb-4" />
      </div>

      <main style={{ minHeight: '100svh', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 20px 32px' }}>
        <div style={{ width: '100%', maxWidth: 360, display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* Marca */}
          <header style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 64, height: 64, borderRadius: 18,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(217,119,6,0.20)',
              border: '1px solid rgba(217,119,6,0.42)',
              boxShadow: '0 0 32px rgba(217,119,6,0.18), inset 0 1px 0 rgba(255,255,255,0.28)',
            }}>
              <Scissors size={26} color="#fbbf24" strokeWidth={1.8} />
            </div>
            <div>
              <h1 style={{ margin: 0, color: '#fff', fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                Samuel S7yle
              </h1>
              <p style={{ margin: '5px 0 0', color: 'rgba(255,255,255,0.38)', fontSize: 13 }}>
                Puerto Cabello, Venezuela
              </p>
            </div>
          </header>

          {/* Tarjeta de disponibilidad */}
          <section className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{
              padding: '14px 18px',
              borderBottom: '1px solid rgba(255,255,255,0.08)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <span style={{ color: '#fff', fontWeight: 600, fontSize: 14 }}>Disponibilidad</span>
              {ultimaAct && (
                <span style={{ color: 'rgba(255,255,255,0.30)', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Clock size={11} /> {tiempoDesde(ultimaAct)}
                </span>
              )}
            </div>

            <div>
              {cargando
                ? Array.from({ length: 7 }).map((_, i) => (
                  <div key={i} style={{
                    padding: '14px 18px',
                    borderBottom: i < 6 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}>
                    <div style={{ width: 72, height: 14, borderRadius: 7, background: 'rgba(255,255,255,0.07)' }} />
                    <div style={{ width: 80, height: 26, borderRadius: 20, background: 'rgba(255,255,255,0.07)' }} />
                  </div>
                ))
                : dias.map((dia, i) => {
                  const esHoy  = dia.dia.toLowerCase() === hoy.toLowerCase()
                  const slots  = dia.slots || []
                  const libres = slots.filter(s => !s.ocupado)

                  /* ── badge ── */
                  let badge
                  if (!dia.abierto) {
                    badge = { color: 'rgba(255,255,255,0.25)', bg: 'transparent', border: 'rgba(255,255,255,0.10)', Icon: XCircle, label: 'Cerrado' }
                  } else if (slots.length > 0) {
                    if (libres.length === 0)      badge = { color: '#f87171', bg: 'rgba(248,113,113,0.12)', border: 'rgba(248,113,113,0.20)', Icon: XCircle,       label: 'Sin turnos' }
                    else if (libres.length <= 2)  badge = { color: '#fbbf24', bg: 'rgba(251,191,36,0.12)',  border: 'rgba(251,191,36,0.20)',  Icon: AlertCircle,   label: `${libres.length} libre${libres.length !== 1 ? 's' : ''}` }
                    else                          badge = { color: '#34d399', bg: 'rgba(52,211,153,0.12)',  border: 'rgba(52,211,153,0.20)',  Icon: CheckCircle2,  label: `${libres.length} libres` }
                  } else {
                    /* legacy cupos */
                    if (dia.cupos === 0)          badge = { color: '#f87171', bg: 'rgba(248,113,113,0.12)', border: 'rgba(248,113,113,0.20)', Icon: XCircle,       label: 'Sin cupos' }
                    else if (dia.cupos <= 2)      badge = { color: '#fbbf24', bg: 'rgba(251,191,36,0.12)',  border: 'rgba(251,191,36,0.20)',  Icon: AlertCircle,   label: `${dia.cupos} cupo${dia.cupos !== 1 ? 's' : ''}` }
                    else                          badge = { color: '#34d399', bg: 'rgba(52,211,153,0.12)',  border: 'rgba(52,211,153,0.20)',  Icon: CheckCircle2,  label: `${dia.cupos} cupos` }
                  }

                  return (
                    <div key={dia.id} style={{
                      padding: esHoy ? '14px 18px' : '12px 18px',
                      borderBottom: i < dias.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                      background: esHoy ? 'rgba(217,119,6,0.09)' : 'transparent',
                    }}>
                      {/* Fila nombre + badge */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                          {esHoy && (
                            <span style={{
                              width: 6, height: 6, borderRadius: '50%',
                              background: '#fbbf24', boxShadow: '0 0 6px rgba(251,191,36,0.7)',
                              flexShrink: 0, display: 'inline-block',
                            }} />
                          )}
                          <span style={{
                            color: esHoy ? '#fde68a' : dia.abierto ? '#fff' : 'rgba(255,255,255,0.28)',
                            fontSize: esHoy ? 15 : 14,
                            fontWeight: esHoy ? 700 : 500,
                          }}>
                            {dia.dia}
                          </span>
                          {esHoy && (
                            <span style={{ color: 'rgba(251,191,36,0.55)', fontSize: 11, fontWeight: 500 }}>
                              · hoy
                            </span>
                          )}
                        </div>

                        {/* Badge */}
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: 5,
                          padding: '5px 10px', borderRadius: 20, flexShrink: 0,
                          background: badge.bg,
                          border: `1px solid ${badge.border}`,
                        }}>
                          <badge.Icon size={11} color={badge.color} strokeWidth={2.5} />
                          <span style={{ color: badge.color, fontSize: 12, fontWeight: 600, lineHeight: 1 }}>
                            {badge.label}
                          </span>
                        </div>
                      </div>

                      {/* Turnos — visibles directamente */}
                      {dia.abierto && slots.length > 0 && (
                        <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {slots.map(slot => slot.ocupado ? (
                            <div key={slot.id} style={{
                              padding: '6px 10px', borderRadius: 8,
                              background: 'rgba(255,255,255,0.03)',
                              border: '1px solid rgba(255,255,255,0.07)',
                              fontSize: 12, fontWeight: 600,
                              color: 'rgba(255,255,255,0.20)',
                              textDecoration: 'line-through',
                            }}>
                              {fmt(slot.inicio)} — {fmt(slot.fin)}
                            </div>
                          ) : (
                            <a
                              key={slot.id}
                              href={waLink(dia.dia, slot)}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                padding: '6px 12px', borderRadius: 8,
                                background: 'rgba(37,211,102,0.12)',
                                border: '1px solid rgba(37,211,102,0.30)',
                                fontSize: 12, fontWeight: 700,
                                color: '#fff',
                                textDecoration: 'none',
                                display: 'flex', alignItems: 'center', gap: 5,
                                cursor: 'pointer',
                              }}>
                              <WaIcon />
                              {fmt(slot.inicio)} — {fmt(slot.fin)}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })
              }
            </div>
          </section>

        </div>
      </main>
    </>
  )
}
