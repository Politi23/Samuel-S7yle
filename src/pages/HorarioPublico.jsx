import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Scissors, Clock, CheckCircle2, XCircle, AlertCircle } from 'lucide-react'

/* ── helpers ─────────────────────────────────────────────── */
function getEstado(dia) {
  if (!dia.abierto) return 'cerrado'
  if (dia.cupos === 0) return 'lleno'
  if (dia.cupos <= 2) return 'pocos'
  return 'disponible'
}

const CFG = {
  disponible: { color: '#34d399', bg: 'rgba(52,211,153,0.12)', Icon: CheckCircle2 },
  pocos:      { color: '#fbbf24', bg: 'rgba(251,191,36,0.12)',  Icon: AlertCircle  },
  lleno:      { color: '#f87171', bg: 'rgba(248,113,113,0.12)', Icon: XCircle      },
  cerrado:    { color: 'rgba(255,255,255,0.22)', bg: 'transparent', Icon: XCircle  },
}

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

/* ── componente ──────────────────────────────────────────── */
export default function HorarioPublico() {
  const [dias, setDias] = useState([])
  const [cargando, setCargando] = useState(true)
  const [ultimaAct, setUltimaAct] = useState(null)

  useEffect(() => {
    supabase
      .from('disponibilidad')
      .select('*')
      .order('orden', { ascending: true })
      .then(({ data }) => {
        setDias(data || [])
        const ts = data?.reduce((m, d) => (d.updated_at > (m || '') ? d.updated_at : m), null)
        setUltimaAct(ts)
        setCargando(false)
      })
  }, [])

  const hoy = diaActualVE()

  return (
    <>
      <style>{`
        @media (prefers-reduced-motion: reduce) {
          .orb { animation: none !important; }
        }
      `}</style>

      {/* Atmósfera */}
      <div className="bg-mesh" style={{ position: 'fixed', inset: 0, zIndex: -2 }} />
      <div style={{ position: 'fixed', inset: 0, zIndex: -1, overflow: 'hidden', pointerEvents: 'none' }}>
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
        <div className="orb orb-4" />
      </div>

      {/* Contenido */}
      <main style={{ minHeight: '100svh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', padding: '40px 20px 32px' }}>
        <div style={{ width: '100%', maxWidth: 360, display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* Cabecera de marca */}
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
              <h1 style={{
                margin: 0, color: '#fff',
                fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.1,
                fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", sans-serif',
              }}>
                Samuel S7tyle
              </h1>
              <p style={{ margin: '5px 0 0', color: 'rgba(255,255,255,0.38)', fontSize: 13, letterSpacing: '0.01em' }}>
                Puerto Cabello, Venezuela
              </p>
            </div>
          </header>

          {/* Tarjeta de disponibilidad */}
          <section className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
            {/* Encabezado tarjeta */}
            <div style={{
              padding: '14px 18px',
              borderBottom: '1px solid rgba(255,255,255,0.08)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <span style={{ color: '#fff', fontWeight: 600, fontSize: 14 }}>
                Disponibilidad
              </span>
              {ultimaAct && (
                <span style={{ color: 'rgba(255,255,255,0.30)', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Clock size={11} />
                  {tiempoDesde(ultimaAct)}
                </span>
              )}
            </div>

            {/* Filas */}
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
                    const estado = getEstado(dia)
                    const cfg = CFG[estado]
                    const esHoy = dia.dia.toLowerCase() === hoy.toLowerCase()

                    return (
                      <div key={dia.id} style={{
                        padding: esHoy ? '16px 18px' : '13px 18px',
                        borderBottom: i < dias.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        background: esHoy ? 'rgba(217,119,6,0.09)' : 'transparent',
                        transition: 'background 0.2s',
                      }}>
                        {/* Día + horario */}
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                            {esHoy && (
                              <span style={{
                                width: 6, height: 6, borderRadius: '50%',
                                background: '#fbbf24',
                                boxShadow: '0 0 6px rgba(251,191,36,0.7)',
                                flexShrink: 0,
                                display: 'inline-block',
                              }} />
                            )}
                            <span style={{
                              color: esHoy ? '#fde68a' : dia.abierto ? '#fff' : 'rgba(255,255,255,0.28)',
                              fontSize: esHoy ? 15 : 14,
                              fontWeight: esHoy ? 700 : 500,
                              letterSpacing: esHoy ? '-0.01em' : 0,
                            }}>
                              {dia.dia}
                            </span>
                            {esHoy && (
                              <span style={{ color: 'rgba(251,191,36,0.55)', fontSize: 11, fontWeight: 500 }}>
                                · hoy
                              </span>
                            )}
                          </div>
                          {dia.abierto && (
                            <div style={{ color: 'rgba(255,255,255,0.30)', fontSize: 11, marginTop: 2 }}>
                              {dia.hora_inicio} – {dia.hora_fin}
                              {dia.nota ? ` · ${dia.nota}` : ''}
                            </div>
                          )}
                        </div>

                        {/* Badge de estado */}
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: 5,
                          padding: '5px 10px', borderRadius: 20,
                          background: cfg.bg,
                          border: `1px solid ${cfg.color}30`,
                          flexShrink: 0,
                        }}>
                          <cfg.Icon size={11} color={cfg.color} strokeWidth={2.5} />
                          <span style={{ color: cfg.color, fontSize: 12, fontWeight: 600, lineHeight: 1 }}>
                            {estado === 'disponible' ? `${dia.cupos} cupo${dia.cupos !== 1 ? 's' : ''}` :
                             estado === 'pocos'      ? `${dia.cupos} cupo${dia.cupos !== 1 ? 's' : ''}` :
                             estado === 'lleno'      ? 'Sin cupos' : 'Cerrado'}
                          </span>
                        </div>
                      </div>
                    )
                  })
              }
            </div>
          </section>

          {/* Footer */}
          <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.22)', fontSize: 11, margin: 0, lineHeight: 1.5 }}>
            Cupos por orden de llegada · Actualizado por el barbero
          </p>
        </div>
      </main>
    </>
  )
}
