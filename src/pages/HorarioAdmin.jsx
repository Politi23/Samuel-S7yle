import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useToast } from '../context/ToastContext'
import PageHeader from '../components/PageHeader'
import { Copy, CheckCircle2, ToggleLeft, ToggleRight, Check } from 'lucide-react'

const DIAS_DEFAULT = [
  { dia: 'Lunes',     orden: 0, abierto: true,  cupos: 8 },
  { dia: 'Martes',    orden: 1, abierto: true,  cupos: 8 },
  { dia: 'Miércoles', orden: 2, abierto: true,  cupos: 8 },
  { dia: 'Jueves',    orden: 3, abierto: true,  cupos: 8 },
  { dia: 'Viernes',   orden: 4, abierto: true,  cupos: 8 },
  { dia: 'Sábado',    orden: 5, abierto: true,  cupos: 6 },
  { dia: 'Domingo',   orden: 6, abierto: false, cupos: 0 },
]

function diaActualVE() {
  return new Date()
    .toLocaleDateString('es-VE', { weekday: 'long' })
    .replace(/^\w/, c => c.toUpperCase())
}

export default function HorarioAdmin() {
  const toast = useToast()
  const [dias, setDias]       = useState([])
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(null)
  const [copiado, setCopiado] = useState(false)

  const urlPublica = `${window.location.origin}/horario`
  const hoy = diaActualVE()

  /* ── carga ──────────────────────────────────────────────── */
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
        const { data: ins } = await supabase
          .from('disponibilidad')
          .insert(DIAS_DEFAULT.map(d => ({ ...d, user_id: session.user.id })))
          .select()
        setDias(ins || [])
      } else {
        setDias(data)
      }
      setCargando(false)
    }
    cargar()
  }, [])

  /* ── mutación local ─────────────────────────────────────── */
  const set = useCallback((idx, campo, valor) => {
    setDias(prev => prev.map((d, i) => i === idx ? { ...d, [campo]: valor } : d))
  }, [])

  /* ── guardar fila ───────────────────────────────────────── */
  const guardar = useCallback(async (idx) => {
    const dia = dias[idx]
    setGuardando(idx)
    const { error } = await supabase
      .from('disponibilidad')
      .update({ abierto: dia.abierto, cupos: dia.cupos, updated_at: new Date().toISOString() })
      .eq('id', dia.id)
    if (error) toast('Error al guardar', 'error')
    else toast(`${dia.dia} guardado ✓`, 'success')
    setGuardando(null)
  }, [dias, toast])

  /* ── copiar URL ─────────────────────────────────────────── */
  const copiarUrl = () => {
    navigator.clipboard.writeText(urlPublica)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2200)
  }

  /* ── índice del día de hoy ──────────────────────────────── */
  const idxHoy = dias.findIndex(d => d.dia.toLowerCase() === hoy.toLowerCase())
  const diaHoy = idxHoy >= 0 ? dias[idxHoy] : null
  const otrosDias = dias.filter((_, i) => i !== idxHoy)

  /* ── render ─────────────────────────────────────────────── */
  return (
    <div className="min-h-screen">
      <PageHeader title="Horario" back={false} />

      <div style={{ padding: '12px 16px 40px', display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 480, margin: '0 auto' }}>

        {/* ── Copiar link ──────────────────────────────────── */}
        <button
          onClick={copiarUrl}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            padding: '13px 20px', borderRadius: 16, border: 'none', cursor: 'pointer', width: '100%',
            background: copiado ? 'rgba(52,211,153,0.18)' : 'rgba(217,119,6,0.18)',
            color: copiado ? '#34d399' : '#fbbf24',
            fontSize: 14, fontWeight: 600, transition: 'all 0.18s',
          }}>
          {copiado ? <CheckCircle2 size={17} /> : <Copy size={17} />}
          {copiado ? '¡Link copiado!' : 'Copiar link para compartir'}
        </button>

        {/* ── HOY ──────────────────────────────────────────── */}
        {cargando ? (
          <div className="glass-card" style={{ height: 180 }} />
        ) : diaHoy ? (
          <div className="glass-card" style={{
            border: '1px solid rgba(217,119,6,0.38)',
            background: 'rgba(217,119,6,0.07)',
            display: 'flex', flexDirection: 'column', gap: 16,
          }}>
            {/* Nombre del día */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  width: 7, height: 7, borderRadius: '50%',
                  background: '#fbbf24', boxShadow: '0 0 8px rgba(251,191,36,0.8)',
                  display: 'inline-block', flexShrink: 0,
                }} />
                <span style={{ color: '#fde68a', fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em' }}>
                  {diaHoy.dia}
                </span>
                <span style={{ color: 'rgba(251,191,36,0.50)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  hoy
                </span>
              </div>
              {/* Toggle abierto/cerrado */}
              <button
                onClick={() => set(idxHoy, 'abierto', !diaHoy.abierto)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex' }}
                aria-label={diaHoy.abierto ? 'Marcar como cerrado' : 'Marcar como abierto'}>
                {diaHoy.abierto
                  ? <ToggleRight size={34} color="#fbbf24" />
                  : <ToggleLeft  size={34} color="rgba(255,255,255,0.25)" />}
              </button>
            </div>

            {/* Cupos — solo cuando está abierto */}
            {diaHoy.abierto ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <button
                  onClick={() => set(idxHoy, 'cupos', Math.max(0, diaHoy.cupos - 1))}
                  aria-label="Restar cupo"
                  style={{
                    width: 56, height: 56, borderRadius: 16, flexShrink: 0,
                    background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
                    color: '#fff', fontSize: 28, fontWeight: 300,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer',
                  }}>−</button>
                <span style={{
                  flex: 1, textAlign: 'center', fontSize: 52, fontWeight: 800,
                  letterSpacing: '-0.04em', lineHeight: 1,
                  color: diaHoy.cupos === 0 ? '#f87171' : diaHoy.cupos <= 2 ? '#fbbf24' : '#34d399',
                  transition: 'color 0.2s',
                }}>
                  {diaHoy.cupos}
                </span>
                <button
                  onClick={() => set(idxHoy, 'cupos', diaHoy.cupos + 1)}
                  aria-label="Sumar cupo"
                  style={{
                    width: 56, height: 56, borderRadius: 16, flexShrink: 0,
                    background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
                    color: '#fff', fontSize: 28, fontWeight: 300,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer',
                  }}>+</button>
              </div>
            ) : (
              <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.30)', fontSize: 14, padding: '8px 0' }}>
                Cerrado hoy
              </div>
            )}

            <button
              className="glass-btn-primary"
              onClick={() => guardar(idxHoy)}
              disabled={guardando === idxHoy}
              style={{ opacity: guardando === idxHoy ? 0.55 : 1, fontSize: 15 }}>
              {guardando === idxHoy ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        ) : null}

        {/* ── Resto de la semana ───────────────────────────── */}
        {!cargando && otrosDias.length > 0 && (
          <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <span style={{ color: 'rgba(255,255,255,0.40)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Resto de la semana
              </span>
            </div>
            {otrosDias.map((dia) => {
              const idx = dias.indexOf(dia)
              return (
                <div key={dia.id || dia.dia} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '11px 14px',
                  borderBottom: otrosDias.indexOf(dia) < otrosDias.length - 1
                    ? '1px solid rgba(255,255,255,0.06)' : 'none',
                  opacity: dia.abierto ? 1 : 0.45,
                }}>
                  {/* Día */}
                  <span style={{ color: '#fff', fontSize: 14, fontWeight: 600, minWidth: 88 }}>
                    {dia.dia}
                  </span>

                  {/* Toggle */}
                  <button
                    onClick={() => set(idx, 'abierto', !dia.abierto)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, display: 'flex', flexShrink: 0 }}
                    aria-label={dia.abierto ? 'Cerrar' : 'Abrir'}>
                    {dia.abierto
                      ? <ToggleRight size={24} color="#fbbf24" />
                      : <ToggleLeft  size={24} color="rgba(255,255,255,0.22)" />}
                  </button>

                  {/* Cupos */}
                  {dia.abierto && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, justifyContent: 'center' }}>
                      <button
                        onClick={() => set(idx, 'cupos', Math.max(0, dia.cupos - 1))}
                        style={{
                          width: 32, height: 32, borderRadius: 10,
                          background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
                          color: '#fff', fontSize: 18, fontWeight: 300,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                        }}>−</button>
                      <span style={{
                        minWidth: 28, textAlign: 'center', fontSize: 18, fontWeight: 700,
                        color: dia.cupos === 0 ? '#f87171' : dia.cupos <= 2 ? '#fbbf24' : '#34d399',
                      }}>
                        {dia.cupos}
                      </span>
                      <button
                        onClick={() => set(idx, 'cupos', dia.cupos + 1)}
                        style={{
                          width: 32, height: 32, borderRadius: 10,
                          background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
                          color: '#fff', fontSize: 18, fontWeight: 300,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                        }}>+</button>
                    </div>
                  )}
                  {!dia.abierto && <div style={{ flex: 1 }} />}

                  {/* Guardar */}
                  <button
                    onClick={() => guardar(idx)}
                    disabled={guardando === idx}
                    aria-label="Guardar"
                    style={{
                      width: 36, height: 36, borderRadius: 11, flexShrink: 0,
                      background: guardando === idx ? 'rgba(52,211,153,0.15)' : 'rgba(255,255,255,0.08)',
                      border: '1px solid rgba(255,255,255,0.14)',
                      color: guardando === idx ? '#34d399' : 'rgba(255,255,255,0.50)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', transition: 'all 0.15s',
                    }}>
                    <Check size={15} strokeWidth={2.5} />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
