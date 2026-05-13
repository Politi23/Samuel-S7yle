import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { Plus, Calendar, Clock, ChevronLeft, ChevronRight, Trash2, Edit2, CheckCircle2, DollarSign, CalendarPlus } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import { hoyVE, toFechaVE, ahoraVE } from '../lib/fecha'

const DIAS  = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']
const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

const ESTADOS = ['pendiente', 'atendida', 'cancelada', 'no_asistio']
const ESTADO_CFG = {
  pendiente:  { label: 'Pendiente',      bg: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.60)' },
  atendida:   { label: 'Atendida',       bg: 'rgba(52,211,153,0.20)',  color: '#6ee7b7' },
  cancelada:  { label: 'Cancelada',      bg: 'rgba(239,68,68,0.22)',   color: '#fca5a5' },
  no_asistio: { label: 'No se presentó', bg: 'rgba(251,146,60,0.22)',  color: '#fdba74' },
}

function formatHora(hora) {
  if (!hora) return ''
  const [h, m] = hora.split(':')
  const hNum = parseInt(h)
  return `${hNum % 12 || 12}:${m} ${hNum >= 12 ? 'PM' : 'AM'}`
}

function esPassada(fecha, hora) {
  const hoy = hoyVE()
  if (fecha < hoy) return true
  if (fecha > hoy) return false
  return (hora || '23:59') < ahoraVE()
}

function EstadoBadge({ cita, onCambiar }) {
  const [abierto, setAbierto] = useState(false)
  const [cargando, setCargando] = useState(false)
  const cfg = ESTADO_CFG[cita.estado || 'pendiente'] || ESTADO_CFG.pendiente
  const cambiar = async (e) => {
    setAbierto(false); setCargando(true)
    try { await onCambiar(e) } finally { setCargando(false) }
  }
  return (
    <div className="relative">
      <button onClick={() => !cargando && setAbierto(v => !v)}
              className="text-xs font-semibold px-2 py-1 rounded-xl transition-opacity"
              style={{background: cfg.bg, color: cfg.color, opacity: cargando ? 0.5 : 1}}>
        {cargando ? '…' : cfg.label}
      </button>
      {abierto && (
        <div className="absolute right-0 bottom-8 z-30 rounded-2xl overflow-hidden shadow-xl"
             style={{background:'rgba(20,12,0,0.97)', border:'1px solid rgba(255,255,255,0.18)', minWidth:'150px'}}>
          {ESTADOS.map(e => {
            const c = ESTADO_CFG[e]
            return (
              <button key={e} onClick={() => cambiar(e)}
                      className="w-full text-left px-4 py-2.5 text-xs font-semibold flex items-center gap-2 active:bg-white/10"
                      style={{color: c.color}}>
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{background: c.color}} />
                {c.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function Citas() {
  const { citas, eliminarCita, actualizarCita } = useApp()
  const navigate = useNavigate()
  const hoyStr = hoyVE()
  const hoyDate = new Date(hoyStr + 'T12:00')

  const [vista, setVista] = useState('semana')
  const [semanaOffset, setSemanaOffset] = useState(0)
  const [diaSeleccionado, setDiaSeleccionado] = useState(hoyStr)
  const [mesCitas, setMesCitas] = useState(() => parseInt(hoyStr.split('-')[1]) - 1)
  const [anioCitas, setAnioCitas] = useState(() => parseInt(hoyStr.split('-')[0]))
  const [confirmar, setConfirmar] = useState(null)
  const [eliminando, setEliminando] = useState(false)
  const [cobrarCita, setCobrarCita] = useState(null)
  const [reagendarCita, setReagendarCita] = useState(null)
  const [fechaReagendar, setFechaReagendar] = useState('')

  const inicioSemana = new Date(hoyDate)
  inicioSemana.setDate(hoyDate.getDate() - hoyDate.getDay() + semanaOffset * 7)

  const diasSemana = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(inicioSemana)
    d.setDate(inicioSemana.getDate() + i)
    return d
  })

  const citasDelDia = citas
    .filter(c => c.fecha === diaSeleccionado)
    .sort((a, b) => (a.hora || '').localeCompare(b.hora || ''))

  const citasProximas = citas
    .filter(c => c.fecha > hoyStr)
    .sort((a, b) => a.fecha.localeCompare(b.fecha) || (a.hora||'').localeCompare(b.hora||''))
    .slice(0, 4)

  const mesLabel = `${MESES[inicioSemana.getMonth()]} ${inicioSemana.getFullYear()}`
  const labelDia = diaSeleccionado === hoyStr
    ? 'Hoy'
    : new Date(diaSeleccionado + 'T12:00').toLocaleDateString('es-VE', { weekday: 'long', day: 'numeric', month: 'long' })

  const irAnteriorMes = () => { if (mesCitas === 0) { setMesCitas(11); setAnioCitas(a => a-1) } else setMesCitas(m => m-1) }
  const irSiguienteMes = () => { if (mesCitas === 11) { setMesCitas(0); setAnioCitas(a => a+1) } else setMesCitas(m => m+1) }

  const mesCitasStr = `${anioCitas}-${String(mesCitas + 1).padStart(2, '0')}`
  const citasMes = citas
    .filter(c => c.fecha && c.fecha.slice(0, 7) === mesCitasStr)
    .sort((a, b) => a.fecha.localeCompare(b.fecha) || (a.hora||'').localeCompare(b.hora||''))

  const cambiarEstado = async (cita, nuevoEstado) => {
    try {
      await actualizarCita(cita.id, { estado: nuevoEstado })
      if (nuevoEstado === 'atendida') setCobrarCita(cita)
    } catch {}
  }

  const abrirReagendar = (cita) => {
    const base = new Date(cita.fecha + 'T12:00')
    base.setDate(base.getDate() + 28)
    const yyyy = base.getFullYear()
    const mm = String(base.getMonth() + 1).padStart(2, '0')
    const dd = String(base.getDate()).padStart(2, '0')
    setFechaReagendar(`${yyyy}-${mm}-${dd}`)
    setReagendarCita(cita)
    setCobrarCita(null)
  }

  const confirmarReagendar = () => {
    navigate(`/citas/nueva?cliente=${reagendarCita.cliente_id}&fecha=${fechaReagendar}`)
    setReagendarCita(null)
  }

  const CardCita = ({ c, mostrarFecha = false }) => {
    const pasada = esPassada(c.fecha, c.hora)
    return (
      <div className="glass-card flex items-center gap-3" style={{opacity: pasada && (c.estado === 'pendiente' || !c.estado) ? 0.55 : 1}}>
        <div className="w-1 self-stretch rounded-full flex-shrink-0"
             style={{background: pasada ? 'rgba(255,255,255,0.18)' : 'rgba(217,119,6,0.80)'}} />
        <button className="flex-1 min-w-0 text-left" onClick={() => navigate(`/clientes/${c.cliente_id}`)}>
          <p className="text-white font-semibold truncate">{c.cliente_nombre}</p>
          <p className="text-white/50 text-sm truncate">{c.motivo}</p>
          {mostrarFecha && <p className="text-white/30 text-xs">{c.fecha ? c.fecha.split('-').reverse().join('/') : ''}</p>}
          {c.notas && <p className="text-white/30 text-xs italic truncate">{c.notas}</p>}
        </button>
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <div className="flex items-center gap-1">
            <Clock size={13} className="text-amber-300" />
            <span className="text-amber-300 text-sm font-semibold">{formatHora(c.hora)}</span>
          </div>
          <EstadoBadge cita={c} onCambiar={e => cambiarEstado(c, e)} />
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(`/citas/${c.id}/editar`)} className="text-white/35 active:text-white/70">
              <Edit2 size={14} />
            </button>
            <button onClick={() => setConfirmar(c)} className="text-red-400/45 active:text-red-400">
              <Trash2 size={15} />
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <PageHeader
        title="Citas"
        action={
          <button onClick={() => navigate('/citas/nueva')} className="glass-btn-icon w-10 h-10 flex items-center justify-center">
            <Plus size={19} className="text-white" />
          </button>
        }
      />

      <div className="px-4 pt-4 pb-6 space-y-4">

        <div className="grid grid-cols-2 gap-2">
          {[['semana', 'Semana'], ['mes', 'Mes']].map(([v, l]) => (
            <button key={v} onClick={() => setVista(v)}
                    className="py-2.5 rounded-2xl text-sm font-semibold transition-all"
                    style={{
                      background: vista === v ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.07)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      color: vista === v ? 'white' : 'rgba(255,255,255,0.40)'
                    }}>
              {l}
            </button>
          ))}
        </div>

        {vista === 'semana' && (
          <>
            <div className="glass-card space-y-3">
              <div className="flex items-center justify-between">
                <button onClick={() => setSemanaOffset(s => s-1)} className="p-2 rounded-xl active:bg-white/10">
                  <ChevronLeft size={18} className="text-white/55" />
                </button>
                <span className="text-white/65 text-sm font-semibold">{mesLabel}</span>
                <button onClick={() => setSemanaOffset(s => s+1)} className="p-2 rounded-xl active:bg-white/10">
                  <ChevronRight size={18} className="text-white/55" />
                </button>
              </div>
              <div className="grid grid-cols-7 gap-1">
                {diasSemana.map(d => {
                  const str = toFechaVE(d)
                  const activo = str === diaSeleccionado
                  const esHoy  = str === hoyStr
                  const tieneCitas = citas.some(c => c.fecha === str)
                  return (
                    <button key={str} onClick={() => setDiaSeleccionado(str)}
                            className="flex flex-col items-center py-2 rounded-2xl transition-all"
                            style={{
                              background: activo ? 'rgba(255,255,255,0.22)' : esHoy ? 'rgba(255,255,255,0.09)' : 'transparent',
                              border: activo ? '1px solid rgba(255,255,255,0.35)' : '1px solid transparent',
                            }}>
                      <span className="text-[10px] font-medium" style={{color: activo ? 'rgba(255,255,255,0.70)' : 'rgba(255,255,255,0.38)'}}>{DIAS[d.getDay()]}</span>
                      <span className="text-sm font-bold mt-0.5" style={{color: activo ? 'white' : esHoy ? 'rgba(255,255,255,0.90)' : 'rgba(255,255,255,0.60)'}}>{d.getDate()}</span>
                      {tieneCitas && <span className="w-1.5 h-1.5 rounded-full mt-0.5" style={{background: activo ? 'white' : 'rgba(217,119,6,0.80)'}} />}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <h2 className="text-white/65 text-sm font-semibold capitalize">
                  {labelDia}
                  {citasDelDia.length > 0 && <span className="text-amber-300 ml-1">· {citasDelDia.length}</span>}
                </h2>
                <button onClick={() => navigate(`/citas/nueva?fecha=${diaSeleccionado}`)} className="text-amber-300 text-xs font-medium">
                  + Agendar
                </button>
              </div>
              {citasDelDia.length === 0 ? (
                <div className="glass-card text-center py-8">
                  <Calendar size={26} className="text-white/20 mx-auto mb-2" />
                  <p className="text-white/30 text-sm">Sin citas este día</p>
                </div>
              ) : (
                citasDelDia.map(c => <CardCita key={c.id} c={c} />)
              )}
            </div>

            {citasProximas.length > 0 && diaSeleccionado === hoyStr && (
              <div className="space-y-2">
                <h2 className="text-white/65 text-sm font-semibold px-1">Próximas citas</h2>
                {citasProximas.map(c => (
                  <div key={c.id} className="glass-card flex items-center gap-3">
                    <div className="rounded-2xl px-3 py-2 text-center flex-shrink-0"
                         style={{background:'rgba(217,119,6,0.15)', border:'1px solid rgba(217,119,6,0.25)', minWidth:'46px'}}>
                      <p className="text-[10px] text-amber-300 font-bold leading-none">
                        {MESES[new Date(c.fecha+'T12:00').getMonth()].slice(0,3).toUpperCase()}
                      </p>
                      <p className="text-lg font-bold text-amber-200 leading-tight">
                        {new Date(c.fecha+'T12:00').getDate()}
                      </p>
                    </div>
                    <button className="flex-1 min-w-0 text-left" onClick={() => navigate(`/clientes/${c.cliente_id}`)}>
                      <p className="text-white font-semibold truncate">{c.cliente_nombre}</p>
                      <p className="text-white/50 text-sm truncate">{c.motivo}</p>
                    </button>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-white/45 text-sm">{formatHora(c.hora)}</span>
                      <button onClick={() => navigate(`/citas/${c.id}/editar`)} className="text-white/35 active:text-white/70">
                        <Edit2 size={14} />
                      </button>
                      <button onClick={() => setConfirmar(c)} className="text-red-400/45 active:text-red-400">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {vista === 'mes' && (
          <>
            <div className="glass-card flex items-center justify-between">
              <button onClick={irAnteriorMes} className="p-2 rounded-xl active:bg-white/10">
                <ChevronLeft size={20} className="text-white/65" />
              </button>
              <span className="text-white font-semibold">{MESES[mesCitas]} {anioCitas}</span>
              <button onClick={irSiguienteMes} className="p-2 rounded-xl active:bg-white/10">
                <ChevronRight size={20} className="text-white/65" />
              </button>
            </div>
            {citasMes.length === 0 ? (
              <div className="glass-card text-center py-10">
                <Calendar size={30} className="text-white/20 mx-auto mb-2" />
                <p className="text-white/30 text-sm">Sin citas en {MESES[mesCitas]} {anioCitas}</p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-white/40 text-xs px-1">{citasMes.length} citas</p>
                {citasMes.map(c => <CardCita key={c.id} c={c} mostrarFecha />)}
              </div>
            )}
          </>
        )}

      </div>

      {/* Modal cobrar */}
      {cobrarCita && (
        <div className="fixed inset-0 z-50 flex items-start justify-center px-6 pt-16" style={{background:'rgba(0,0,0,0.55)'}}>
          <div className="glass-strong w-full max-w-sm rounded-3xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
                   style={{background:'rgba(52,211,153,0.20)', border:'1px solid rgba(52,211,153,0.30)'}}>
                <CheckCircle2 size={20} className="text-emerald-400" />
              </div>
              <div>
                <p className="text-white font-bold">Cita atendida</p>
                <p className="text-white/55 text-sm">{cobrarCita.cliente_nombre}</p>
              </div>
            </div>
            <p className="text-white/60 text-sm">¿Qué deseas hacer ahora?</p>
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setCobrarCita(null)} className="py-3 rounded-2xl text-white/80 font-semibold text-sm"
                        style={{background:'rgba(255,255,255,0.10)', border:'1px solid rgba(255,255,255,0.18)'}}>
                  Ahora no
                </button>
                <button onClick={() => { navigate(`/ingresos/nuevo?cliente=${cobrarCita.cliente_id}`); setCobrarCita(null) }}
                        className="py-3 rounded-2xl text-white font-semibold text-sm flex items-center justify-center gap-2"
                        style={{background:'rgba(52,211,153,0.40)', border:'1px solid rgba(52,211,153,0.50)'}}>
                  <DollarSign size={15} /> Cobrar ahora
                </button>
              </div>
              <button onClick={() => abrirReagendar(cobrarCita)}
                      className="w-full py-3 rounded-2xl text-white font-semibold text-sm flex items-center justify-center gap-2"
                      style={{background:'rgba(217,119,6,0.25)', border:'1px solid rgba(217,119,6,0.40)'}}>
                <CalendarPlus size={15} /> Reagendar próxima cita
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal reagendar */}
      {reagendarCita && (
        <div className="fixed inset-0 z-50 flex items-start justify-center px-6 pt-16" style={{background:'rgba(0,0,0,0.55)'}}>
          <div className="glass-strong w-full max-w-sm rounded-3xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
                   style={{background:'rgba(217,119,6,0.20)', border:'1px solid rgba(217,119,6,0.30)'}}>
                <CalendarPlus size={20} className="text-amber-400" />
              </div>
              <div>
                <p className="text-white font-bold">Próxima cita</p>
                <p className="text-white/55 text-sm">{reagendarCita.cliente_nombre}</p>
              </div>
            </div>
            <div>
              <label className="glass-label">Fecha <span className="text-amber-300 font-normal">· sugerida: 4 semanas</span></label>
              <input type="date" className="glass-input" value={fechaReagendar} onChange={e => setFechaReagendar(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setReagendarCita(null)} className="py-3 rounded-2xl text-white/80 font-semibold text-sm"
                      style={{background:'rgba(255,255,255,0.10)', border:'1px solid rgba(255,255,255,0.18)'}}>
                Cancelar
              </button>
              <button onClick={confirmarReagendar}
                      className="py-3 rounded-2xl text-white font-semibold text-sm flex items-center justify-center gap-2"
                      style={{background:'rgba(217,119,6,0.45)', border:'1px solid rgba(217,119,6,0.55)'}}>
                <CalendarPlus size={15} /> Continuar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal confirmar eliminación */}
      {confirmar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6" style={{background:'rgba(0,0,0,0.65)'}}>
          <div className="glass-strong w-full max-w-sm rounded-3xl p-6 space-y-4">
            <h3 className="text-white font-bold text-lg text-center">¿Eliminar cita?</h3>
            <p className="text-white/60 text-sm text-center">
              Se eliminará la cita de <strong className="text-white">{confirmar.cliente_nombre}</strong> del{' '}
              <strong className="text-white">{confirmar.fecha}</strong>. Esta acción no se puede deshacer.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setConfirmar(null)} className="py-3 rounded-2xl text-white/80 font-semibold text-sm"
                      style={{background:'rgba(255,255,255,0.10)', border:'1px solid rgba(255,255,255,0.18)'}}>
                Cancelar
              </button>
              <button disabled={eliminando}
                      onClick={async () => {
                        setEliminando(true)
                        try { await eliminarCita(confirmar.id) } catch {}
                        setEliminando(false)
                        setConfirmar(null)
                      }}
                      className="py-3 rounded-2xl text-white font-semibold text-sm transition-opacity"
                      style={{background:'rgba(239,68,68,0.55)', border:'1px solid rgba(239,68,68,0.50)', opacity: eliminando ? 0.6 : 1}}>
                {eliminando ? 'Eliminando…' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
