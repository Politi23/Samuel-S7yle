import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Clock, CheckCircle2, XCircle, AlertCircle, Scissors } from 'lucide-react'

function getEstado(dia) {
  if (!dia.abierto) return 'cerrado'
  if (dia.cupos === 0) return 'lleno'
  if (dia.cupos <= 2) return 'pocos'
  return 'disponible'
}

const ESTADO = {
  disponible: {
    label: 'Disponible',
    color: 'text-emerald-400',
    bg: 'bg-emerald-400/15 border-emerald-400/30',
    Icon: CheckCircle2,
  },
  pocos: {
    label: 'Pocos cupos',
    color: 'text-amber-400',
    bg: 'bg-amber-400/15 border-amber-400/30',
    Icon: AlertCircle,
  },
  lleno: {
    label: 'Sin cupos',
    color: 'text-red-400',
    bg: 'bg-red-400/15 border-red-400/30',
    Icon: XCircle,
  },
  cerrado: {
    label: 'Cerrado',
    color: 'text-white/35',
    bg: 'bg-white/5 border-white/10',
    Icon: XCircle,
  },
}

function tiempoDesde(ts) {
  if (!ts) return ''
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 60000)
  if (diff < 1) return 'justo ahora'
  if (diff < 60) return `hace ${diff} min`
  const h = Math.floor(diff / 60)
  return `hace ${h}h`
}

export default function HorarioPublico() {
  const [dias, setDias] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [ultimaActualizacion, setUltimaActualizacion] = useState(null)

  useEffect(() => {
    async function cargar() {
      const { data, error } = await supabase
        .from('disponibilidad')
        .select('*')
        .order('orden', { ascending: true })

      if (error) { setError(error.message); setCargando(false); return }

      setDias(data || [])
      const ultima = data?.reduce((max, d) =>
        d.updated_at > (max || '') ? d.updated_at : max, null)
      setUltimaActualizacion(ultima)
      setCargando(false)
    }
    cargar()
  }, [])

  const hoy = new Date().toLocaleDateString('es-VE', { weekday: 'long' })
  const hoyCapitalized = hoy.charAt(0).toUpperCase() + hoy.slice(1)

  return (
    <div className="min-h-screen flex flex-col items-center justify-start px-4 py-8"
         style={{ background: 'linear-gradient(135deg, #0f0f0f 0%, #1a1207 50%, #0f0f0f 100%)' }}>
      {/* Orbs decorativos */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div style={{
          position: 'absolute', top: '-10%', right: '-5%',
          width: 300, height: 300, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(217,119,6,0.18) 0%, transparent 70%)',
        }} />
        <div style={{
          position: 'absolute', bottom: '10%', left: '-10%',
          width: 250, height: 250, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(217,119,6,0.12) 0%, transparent 70%)',
        }} />
      </div>

      <div className="w-full max-w-sm space-y-5">
        {/* Header */}
        <div className="text-center space-y-3 pt-2">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto"
               style={{
                 background: 'rgba(217,119,6,0.22)',
                 border: '1px solid rgba(217,119,6,0.45)',
                 boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.3), 0 4px 20px rgba(217,119,6,0.2)',
               }}>
            <Scissors size={28} className="text-amber-400" />
          </div>
          <div>
            <h1 className="text-white text-2xl font-bold tracking-tight">Samuel S7tyle</h1>
            <p className="text-white/45 text-sm mt-0.5">Barbería · Caracas</p>
          </div>
        </div>

        {/* Card principal */}
        <div style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.10)',
          borderRadius: 20,
          backdropFilter: 'blur(20px)',
          overflow: 'hidden',
        }}>
          {/* Título */}
          <div className="px-5 py-4 border-b border-white/8">
            <div className="flex items-center justify-between">
              <span className="text-white font-semibold text-sm">Disponibilidad semanal</span>
              {ultimaActualizacion && (
                <span className="text-white/35 text-xs flex items-center gap-1">
                  <Clock size={11} />
                  {tiempoDesde(ultimaActualizacion)}
                </span>
              )}
            </div>
          </div>

          {/* Lista de días */}
          <div className="divide-y divide-white/6">
            {cargando ? (
              Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="px-5 py-3.5 flex items-center justify-between animate-pulse">
                  <div className="h-3.5 w-20 bg-white/10 rounded-full" />
                  <div className="h-6 w-24 bg-white/10 rounded-full" />
                </div>
              ))
            ) : error ? (
              <div className="px-5 py-8 text-center text-red-400 text-sm">
                Error al cargar. Intenta de nuevo.
              </div>
            ) : dias.length === 0 ? (
              <div className="px-5 py-8 text-center text-white/40 text-sm">
                Sin información disponible.
              </div>
            ) : (
              dias.map((dia) => {
                const estado = getEstado(dia)
                const cfg = ESTADO[estado]
                const esHoy = dia.dia.toLowerCase() === hoyCapitalized.toLowerCase()

                return (
                  <div key={dia.id}
                       className="px-5 py-3.5 flex items-center justify-between transition-colors"
                       style={esHoy ? { background: 'rgba(217,119,6,0.07)' } : {}}>
                    <div className="flex items-center gap-2.5">
                      {esHoy && (
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                      )}
                      <div>
                        <span className={`text-sm font-medium ${esHoy ? 'text-amber-300' : dia.abierto ? 'text-white' : 'text-white/35'}`}>
                          {dia.dia}
                          {esHoy && <span className="text-amber-400/70 text-xs font-normal ml-1.5">· hoy</span>}
                        </span>
                        {dia.abierto && (
                          <div className="text-white/35 text-xs mt-0.5">
                            {dia.hora_inicio} – {dia.hora_fin}
                          </div>
                        )}
                        {dia.nota && dia.abierto && (
                          <div className="text-white/40 text-xs mt-0.5 italic">{dia.nota}</div>
                        )}
                      </div>
                    </div>

                    <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-medium ${cfg.bg} ${cfg.color}`}>
                      <cfg.Icon size={11} strokeWidth={2.5} />
                      {estado === 'disponible' ? (
                        <span>{dia.cupos} cupo{dia.cupos !== 1 ? 's' : ''}</span>
                      ) : (
                        <span>{cfg.label}</span>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-white/25 text-xs pb-4">
          Actualizado por el barbero · Los cupos se asignan en orden de llegada
        </p>
      </div>
    </div>
  )
}
