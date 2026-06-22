import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useToast } from '../context/ToastContext'
import PageHeader from '../components/PageHeader'
import { Clock, Copy, CheckCircle2, ToggleLeft, ToggleRight } from 'lucide-react'

const DIAS_DEFAULT = [
  { dia: 'Lunes',     orden: 0, abierto: true,  cupos: 8, hora_inicio: '09:00', hora_fin: '18:00', nota: '' },
  { dia: 'Martes',    orden: 1, abierto: true,  cupos: 8, hora_inicio: '09:00', hora_fin: '18:00', nota: '' },
  { dia: 'Miércoles', orden: 2, abierto: true,  cupos: 8, hora_inicio: '09:00', hora_fin: '18:00', nota: '' },
  { dia: 'Jueves',    orden: 3, abierto: true,  cupos: 8, hora_inicio: '09:00', hora_fin: '18:00', nota: '' },
  { dia: 'Viernes',   orden: 4, abierto: true,  cupos: 8, hora_inicio: '09:00', hora_fin: '18:00', nota: '' },
  { dia: 'Sábado',    orden: 5, abierto: true,  cupos: 6, hora_inicio: '09:00', hora_fin: '14:00', nota: '' },
  { dia: 'Domingo',   orden: 6, abierto: false, cupos: 0, hora_inicio: '09:00', hora_fin: '14:00', nota: '' },
]

export default function HorarioAdmin() {
  const toast = useToast()
  const [dias, setDias] = useState([])
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(null)
  const [copiado, setCopiado] = useState(false)
  const [expandido, setExpandido] = useState(null)

  const urlPublica = `${window.location.origin}/horario`

  useEffect(() => {
    async function cargar() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const { data, error } = await supabase
        .from('disponibilidad')
        .select('*')
        .eq('user_id', session.user.id)
        .order('orden', { ascending: true })

      if (error) { setCargando(false); return }

      if (!data || data.length === 0) {
        // Inicializar con valores por defecto si no existen filas
        const rows = DIAS_DEFAULT.map(d => ({ ...d, user_id: session.user.id }))
        const { data: insertados } = await supabase.from('disponibilidad').insert(rows).select()
        setDias(insertados || rows)
      } else {
        setDias(data)
      }
      setCargando(false)
    }
    cargar()
  }, [])

  const set = (idx, campo, valor) => {
    setDias(prev => prev.map((d, i) => i === idx ? { ...d, [campo]: valor } : d))
  }

  const guardarDia = async (idx) => {
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
  }

  const copiarUrl = () => {
    navigator.clipboard.writeText(urlPublica)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  return (
    <div className="min-h-screen">
      <PageHeader title="Disponibilidad" back={false} />

      <div className="px-4 pt-3 pb-6 space-y-4">

        {/* URL pública */}
        <div className="glass-card space-y-2">
          <p className="text-white/50 text-xs font-medium uppercase tracking-wider">URL pública</p>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white/60 text-xs font-mono truncate">
              {urlPublica}
            </div>
            <button
              onClick={copiarUrl}
              className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-medium transition-all"
              style={{
                background: copiado ? 'rgba(52,211,153,0.15)' : 'rgba(217,119,6,0.15)',
                border: `1px solid ${copiado ? 'rgba(52,211,153,0.35)' : 'rgba(217,119,6,0.35)'}`,
                color: copiado ? '#34d399' : '#fbbf24',
              }}>
              {copiado ? <CheckCircle2 size={14} /> : <Copy size={14} />}
              {copiado ? 'Copiado' : 'Copiar'}
            </button>
          </div>
          <p className="text-white/30 text-xs">Comparte este link en tus historias y estados.</p>
        </div>

        {/* Lista de días */}
        {cargando ? (
          <div className="space-y-3">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="glass-card animate-pulse">
                <div className="h-5 w-24 bg-white/10 rounded-full mb-3" />
                <div className="h-8 w-full bg-white/10 rounded-xl" />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {dias.map((dia, idx) => {
              const abierto = expandido === idx
              return (
                <div key={dia.id || dia.dia} className="glass-card space-y-3">
                  {/* Fila principal */}
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => setExpandido(abierto ? null : idx)}
                      className="flex items-center gap-2 text-left flex-1">
                      <span className="text-white font-semibold text-sm">{dia.dia}</span>
                      {!dia.abierto && (
                        <span className="text-white/30 text-xs bg-white/8 px-2 py-0.5 rounded-full">Cerrado</span>
                      )}
                      {dia.abierto && (
                        <span className="text-white/40 text-xs">{dia.hora_inicio}–{dia.hora_fin} · {dia.cupos} cupos</span>
                      )}
                    </button>

                    {/* Toggle abierto/cerrado */}
                    <button
                      onClick={() => set(idx, 'abierto', !dia.abierto)}
                      className="ml-2 transition-colors">
                      {dia.abierto
                        ? <ToggleRight size={28} className="text-amber-400" />
                        : <ToggleLeft size={28} className="text-white/25" />
                      }
                    </button>
                  </div>

                  {/* Expandido */}
                  {(abierto || !dia.abierto) && dia.abierto && (
                    <div className="space-y-3 pt-1 border-t border-white/8">
                      {/* Cupos */}
                      <div>
                        <label className="glass-label">Cupos disponibles</label>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => set(idx, 'cupos', Math.max(0, dia.cupos - 1))}
                            className="w-9 h-9 rounded-xl bg-white/8 border border-white/10 text-white flex items-center justify-center text-lg font-bold">
                            −
                          </button>
                          <span className="flex-1 text-center text-white text-xl font-bold">{dia.cupos}</span>
                          <button
                            onClick={() => set(idx, 'cupos', dia.cupos + 1)}
                            className="w-9 h-9 rounded-xl bg-white/8 border border-white/10 text-white flex items-center justify-center text-lg font-bold">
                            +
                          </button>
                        </div>
                      </div>

                      {/* Horario */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="glass-label flex items-center gap-1">
                            <Clock size={11} /> Apertura
                          </label>
                          <input
                            type="time"
                            className="glass-input"
                            value={dia.hora_inicio}
                            onChange={e => set(idx, 'hora_inicio', e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="glass-label flex items-center gap-1">
                            <Clock size={11} /> Cierre
                          </label>
                          <input
                            type="time"
                            className="glass-input"
                            value={dia.hora_fin}
                            onChange={e => set(idx, 'hora_fin', e.target.value)}
                          />
                        </div>
                      </div>

                      {/* Nota */}
                      <div>
                        <label className="glass-label">Nota del día <span className="text-white/30 font-normal">(opcional)</span></label>
                        <input
                          className="glass-input"
                          placeholder="Ej: Solo corte hoy, sin barba"
                          value={dia.nota || ''}
                          onChange={e => set(idx, 'nota', e.target.value)}
                          maxLength={80}
                        />
                      </div>
                    </div>
                  )}

                  {/* Botón guardar */}
                  <button
                    onClick={() => guardarDia(idx)}
                    disabled={guardando === idx}
                    className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all"
                    style={{
                      background: 'rgba(217,119,6,0.18)',
                      border: '1px solid rgba(217,119,6,0.35)',
                      color: guardando === idx ? 'rgba(251,191,36,0.5)' : '#fbbf24',
                    }}>
                    {guardando === idx ? 'Guardando…' : 'Guardar'}
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
