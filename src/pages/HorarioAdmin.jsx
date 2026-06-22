import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useToast } from '../context/ToastContext'
import PageHeader from '../components/PageHeader'
import { Copy, CheckCircle2, ToggleLeft, ToggleRight, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react'

const DIAS_DEFAULT = [
  { dia: 'Lunes',     orden: 0, abierto: true,  cupos: 8, hora_inicio: '09:00', hora_fin: '18:00', nota: '' },
  { dia: 'Martes',    orden: 1, abierto: true,  cupos: 8, hora_inicio: '09:00', hora_fin: '18:00', nota: '' },
  { dia: 'Miércoles', orden: 2, abierto: true,  cupos: 8, hora_inicio: '09:00', hora_fin: '18:00', nota: '' },
  { dia: 'Jueves',    orden: 3, abierto: true,  cupos: 8, hora_inicio: '09:00', hora_fin: '18:00', nota: '' },
  { dia: 'Viernes',   orden: 4, abierto: true,  cupos: 8, hora_inicio: '09:00', hora_fin: '18:00', nota: '' },
  { dia: 'Sábado',    orden: 5, abierto: true,  cupos: 6, hora_inicio: '09:00', hora_fin: '14:00', nota: '' },
  { dia: 'Domingo',   orden: 6, abierto: false, cupos: 0, hora_inicio: '09:00', hora_fin: '14:00', nota: '' },
]

function diaActualVE() {
  return new Date()
    .toLocaleDateString('es-VE', { weekday: 'long' })
    .replace(/^\w/, c => c.toUpperCase())
}

export default function HorarioAdmin() {
  const toast = useToast()
  const [dias, setDias] = useState([])
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(null)
  const [copiado, setCopiado] = useState(false)
  const [expandido, setExpandido] = useState(null)

  const urlPublica = `${window.location.origin}/horario`
  const hoy = diaActualVE()

  /* ── cargar datos ─────────────────────────────────────── */
  useEffect(() => {
    async function cargar() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const { data } = await supabase
        .from('disponibilidad')
        .select('*')
        .eq('user_id', session.user.id)
        .order('orden', { ascending: true })

      if (!data || data.length === 0) {
        const rows = DIAS_DEFAULT.map(d => ({ ...d, user_id: session.user.id }))
        const { data: ins } = await supabase.from('disponibilidad').insert(rows).select()
        setDias(ins || rows)
      } else {
        setDias(data)
      }
      setCargando(false)
    }
    cargar()
  }, [])

  /* ── mutación local ───────────────────────────────────── */
  const set = useCallback((idx, campo, valor) => {
    setDias(prev => prev.map((d, i) => i === idx ? { ...d, [campo]: valor } : d))
  }, [])

  /* ── guardar fila ─────────────────────────────────────── */
  const guardarDia = useCallback(async (idx) => {
    const dia = dias[idx]
    setGuardando(idx)
    const { error } = await supabase
      .from('disponibilidad')
      .update({
        abierto:     dia.abierto,
        cupos:       dia.cupos,
        hora_inicio: dia.hora_inicio,
        hora_fin:    dia.hora_fin,
        nota:        dia.nota || null,
        updated_at:  new Date().toISOString(),
      })
      .eq('id', dia.id)

    if (error) toast('Error al guardar', 'error')
    else toast(`${dia.dia} actualizado`, 'success')
    setGuardando(null)
  }, [dias, toast])

  /* ── copiar URL ───────────────────────────────────────── */
  const copiarUrl = () => {
    navigator.clipboard.writeText(urlPublica)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2200)
  }

  /* ── render ───────────────────────────────────────────── */
  return (
    <div className="min-h-screen">
      <PageHeader title="Horario" back={false} />

      <div style={{ padding: '12px 16px 32px', display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* URL pública */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Enlace público
            </span>
            <a
              href={urlPublica}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'rgba(255,255,255,0.30)', display: 'flex', alignItems: 'center', gap: 3 }}
              aria-label="Ver página pública">
              <ExternalLink size={13} />
            </a>
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{
              flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)',
              borderRadius: 12, padding: '9px 12px',
              color: 'rgba(255,255,255,0.45)', fontSize: 12, fontFamily: 'monospace',
            }}>
              {urlPublica}
            </div>
            <button
              onClick={copiarUrl}
              style={{
                flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6,
                padding: '9px 14px', borderRadius: 12, border: 'none', cursor: 'pointer',
                background: copiado ? 'rgba(52,211,153,0.18)' : 'rgba(217,119,6,0.22)',
                color: copiado ? '#34d399' : '#fbbf24',
                fontSize: 12, fontWeight: 600, transition: 'all 0.18s',
              }}
              aria-label="Copiar enlace">
              {copiado ? <CheckCircle2 size={14} /> : <Copy size={14} />}
              {copiado ? 'Copiado' : 'Copiar'}
            </button>
          </div>
          <p style={{ margin: 0, color: 'rgba(255,255,255,0.25)', fontSize: 11 }}>
            Comparte este enlace en tus stories y estados.
          </p>
        </div>

        {/* Días */}
        {cargando
          ? Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="glass-card" style={{ height: 88 }}>
                <div style={{ width: '40%', height: 14, borderRadius: 7, background: 'rgba(255,255,255,0.07)', marginBottom: 10 }} />
                <div style={{ width: '100%', height: 44, borderRadius: 14, background: 'rgba(255,255,255,0.06)' }} />
              </div>
            ))
          : dias.map((dia, idx) => {
              const esHoy = dia.dia.toLowerCase() === hoy.toLowerCase()
              const estaExpandido = expandido === idx

              return (
                <div key={dia.id || dia.dia}
                     className="glass-card"
                     style={{
                       padding: 16,
                       border: esHoy
                         ? '1px solid rgba(217,119,6,0.32)'
                         : '1px solid rgba(255,255,255,0.14)',
                       background: esHoy ? 'rgba(217,119,6,0.06)' : undefined,
                       display: 'flex', flexDirection: 'column', gap: 14,
                     }}>

                  {/* Fila superior: nombre + toggle */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {esHoy && (
                        <span style={{
                          width: 6, height: 6, borderRadius: '50%',
                          background: '#fbbf24',
                          boxShadow: '0 0 6px rgba(251,191,36,0.6)',
                          flexShrink: 0, display: 'inline-block',
                        }} />
                      )}
                      <span style={{
                        color: esHoy ? '#fde68a' : '#fff',
                        fontSize: 15, fontWeight: 700, letterSpacing: '-0.01em',
                      }}>
                        {dia.dia}
                      </span>
                      {esHoy && (
                        <span style={{
                          fontSize: 10, fontWeight: 600, letterSpacing: '0.05em',
                          textTransform: 'uppercase',
                          color: 'rgba(251,191,36,0.55)',
                        }}>
                          hoy
                        </span>
                      )}
                      {!dia.abierto && (
                        <span style={{
                          fontSize: 11, fontWeight: 500,
                          background: 'rgba(255,255,255,0.07)',
                          border: '1px solid rgba(255,255,255,0.10)',
                          borderRadius: 20, padding: '2px 8px',
                          color: 'rgba(255,255,255,0.30)',
                        }}>
                          Cerrado
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => set(idx, 'abierto', !dia.abierto)}
                      aria-label={dia.abierto ? 'Cerrar este día' : 'Abrir este día'}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex' }}>
                      {dia.abierto
                        ? <ToggleRight size={30} color="#fbbf24" />
                        : <ToggleLeft  size={30} color="rgba(255,255,255,0.22)" />}
                    </button>
                  </div>

                  {/* Cupos — solo cuando está abierto */}
                  {dia.abierto && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {/* Control de cupos */}
                      <div>
                        <label className="glass-label">Cupos disponibles</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <button
                            onClick={() => set(idx, 'cupos', Math.max(0, dia.cupos - 1))}
                            aria-label="Reducir cupos"
                            style={{
                              width: 44, height: 44, borderRadius: 14, flexShrink: 0,
                              background: 'rgba(255,255,255,0.07)',
                              border: '1px solid rgba(255,255,255,0.14)',
                              color: '#fff', fontSize: 22, fontWeight: 300,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              cursor: 'pointer', transition: 'background 0.15s',
                            }}>
                            −
                          </button>
                          <span style={{
                            flex: 1, textAlign: 'center',
                            color: dia.cupos === 0 ? '#f87171' : dia.cupos <= 2 ? '#fbbf24' : '#34d399',
                            fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em',
                            transition: 'color 0.2s',
                          }}>
                            {dia.cupos}
                          </span>
                          <button
                            onClick={() => set(idx, 'cupos', dia.cupos + 1)}
                            aria-label="Aumentar cupos"
                            style={{
                              width: 44, height: 44, borderRadius: 14, flexShrink: 0,
                              background: 'rgba(255,255,255,0.07)',
                              border: '1px solid rgba(255,255,255,0.14)',
                              color: '#fff', fontSize: 22, fontWeight: 300,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              cursor: 'pointer', transition: 'background 0.15s',
                            }}>
                            +
                          </button>
                        </div>
                      </div>

                      {/* Ajustes avanzados: horario + nota */}
                      <button
                        onClick={() => setExpandido(estaExpandido ? null : idx)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 5,
                          background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                          color: 'rgba(255,255,255,0.35)', fontSize: 12, textAlign: 'left',
                        }}
                        aria-expanded={estaExpandido}>
                        <span style={{ fontWeight: 500, flex: 1 }}>
                          {dia.hora_inicio
                            ? dia.hora_inicio + (dia.nota ? ` · ${dia.nota}` : '')
                            : dia.nota || 'Editar horario y nota…'}
                        </span>
                        {estaExpandido ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                      </button>

                      {estaExpandido && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 4, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                          <div>
                            <label className="glass-label">Horario del día</label>
                            <input className="glass-input"
                                   placeholder="Ej: 10am, 12pm, 3pm · o · 9am a 2pm"
                                   value={dia.hora_inicio || ''}
                                   onChange={e => set(idx, 'hora_inicio', e.target.value)}
                                   maxLength={60} />
                          </div>
                          <div>
                            <label className="glass-label">Nota <span style={{ color: 'rgba(255,255,255,0.25)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(opcional)</span></label>
                            <input className="glass-input"
                                   placeholder="Ej: Solo corte, sin barba"
                                   value={dia.nota || ''}
                                   onChange={e => set(idx, 'nota', e.target.value)}
                                   maxLength={60} />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Guardar */}
                  <button
                    className="glass-btn-primary"
                    onClick={() => guardarDia(idx)}
                    disabled={guardando === idx}
                    style={{ opacity: guardando === idx ? 0.55 : 1 }}>
                    {guardando === idx ? 'Guardando…' : 'Guardar'}
                  </button>
                </div>
              )
            })
        }
      </div>
    </div>
  )
}
