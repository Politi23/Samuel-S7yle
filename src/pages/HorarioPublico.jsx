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

export default function HorarioPublico() {
  const [dias, setDias]           = useState([])
  const [cargando, setCargando]   = useState(true)
  const [ultimaAct, setUltimaAct] = useState(null)

  useEffect(() => {
    supabase
      .from('disponibilidad')
      .select('*')
      .eq('user_id', 'c2e70010-2fe5-44d7-b14f-56488ed17a8f')
      .order('orden', { ascending: true })
      .then(({ data }) => {
        setDias((data || []).map(d => ({ ...d, slots: Array.isArray(d.slots) ? d.slots : [] })))
        const ts = data?.reduce((m, d) => (d.updated_at > (m || '') ? d.updated_at : m), null)
        setUltimaAct(ts)
        setCargando(false)
      })
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
                          {slots.map(slot => (
                            <div key={slot.id} style={{
                              padding: '4px 10px', borderRadius: 8,
                              background: slot.ocupado ? 'rgba(255,255,255,0.04)' : 'rgba(52,211,153,0.08)',
                              border: `1px solid ${slot.ocupado ? 'rgba(255,255,255,0.08)' : 'rgba(52,211,153,0.18)'}`,
                              fontSize: 12, fontWeight: 600,
                              color: slot.ocupado ? 'rgba(255,255,255,0.25)' : '#fff',
                              textDecoration: slot.ocupado ? 'line-through' : 'none',
                            }}>
                              {fmt(slot.inicio)} — {fmt(slot.fin)}
                            </div>
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
