import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import { useBcv } from '../hooks/useBcv'
import { useNavigate } from 'react-router-dom'
import { Users, DollarSign, TrendingUp, Clock, Plus, ChevronRight, LogOut, UserPlus, CalendarDays, ArrowDownCircle, AlertTriangle, Search, X, BarChart2, CheckCircle2 } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import { hoyVE, toFechaVE } from '../lib/fecha'

const MOTIVOS_RAPIDOS = ['Corte de cabello','Afeitado','Diseño de barba','Corte + Barba','Coloración','Otro']

function formatHora(hora) {
  if (!hora) return ''
  const [h, m] = hora.split(':')
  const hNum = parseInt(h)
  return `${hNum % 12 || 12}:${m} ${hNum >= 12 ? 'PM' : 'AM'}`
}

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

export default function Dashboard() {
  const { clientes, ingresos, citas, egresos, agregarCita } = useApp()
  const { logout } = useAuth()
  const { data: bcv } = useBcv()
  const navigate = useNavigate()

  const hoyStr = hoyVE()
  const [anio, mes0] = hoyStr.split('-').map(Number)
  const mes = mes0 - 1
  const mesStr = hoyStr.slice(0, 7)
  const anioStr = hoyStr.slice(0, 4)
  const tasaHoy = bcv?.eur ?? null
  const hoyDate = new Date(hoyStr + 'T12:00')

  const [vistaIngresos, setVistaIngresos] = useState('mes')

  // ── Cita rápida ──
  const [citaRapida, setCitaRapida] = useState(false)
  const [qForm, setQForm] = useState({ cliente_id: '', cliente_nombre: '', fecha: hoyStr, hora: '', motivo: 'Corte de cabello' })
  const [qBusqueda, setQBusqueda] = useState('')
  const [qMostrarBuscador, setQMostrarBuscador] = useState(true)
  const [qGuardando, setQGuardando] = useState(false)
  const [qError, setQError] = useState('')

  const qFiltrados = clientes.filter(c => {
    const q = qBusqueda.toLowerCase()
    return (c.nombre||'').toLowerCase().includes(q) || (c.apellido||'').toLowerCase().includes(q) || (c.telefono||'').includes(q)
  }).slice(0, 5)

  const abrirCitaRapida = () => {
    setQForm({ cliente_id: '', cliente_nombre: '', fecha: hoyStr, hora: '', motivo: 'Corte de cabello' })
    setQBusqueda('')
    setQMostrarBuscador(true)
    setQError('')
    setCitaRapida(true)
  }

  const guardarCitaRapida = async () => {
    if (!qForm.cliente_id) { setQError('Selecciona un cliente'); return }
    if (!qForm.hora) { setQError('Ingresa la hora'); return }
    setQGuardando(true)
    try {
      await agregarCita({ cliente_id: qForm.cliente_id, cliente_nombre: qForm.cliente_nombre, fecha: qForm.fecha, hora: qForm.hora, motivo: qForm.motivo, notas: '' })
      setCitaRapida(false)
    } catch (err) {
      setQError(err.message || 'Error al agendar')
    } finally {
      setQGuardando(false)
    }
  }

  // ── Resumen semanal ──
  const diaSemana = hoyDate.getDay()
  const diasDesdeElLunes = diaSemana === 0 ? 6 : diaSemana - 1
  const lunesEstaSemana = new Date(hoyDate); lunesEstaSemana.setDate(hoyDate.getDate() - diasDesdeElLunes)
  const lunesPasado = new Date(lunesEstaSemana); lunesPasado.setDate(lunesEstaSemana.getDate() - 7)
  const domingosPasado = new Date(lunesEstaSemana); domingosPasado.setDate(lunesEstaSemana.getDate() - 1)
  const lunesPasadoStr = toFechaVE(lunesPasado)
  const domingosPasadoStr = toFechaVE(domingosPasado)
  const lunesEstaSemanaStr = toFechaVE(lunesEstaSemana)
  const domingoEstaSemana = new Date(lunesEstaSemana); domingoEstaSemana.setDate(lunesEstaSemana.getDate() + 6)
  const domingoEstaSemanaStr = toFechaVE(domingoEstaSemana)

  const claveResumen = `resumen_${lunesPasadoStr}`
  const [resumenDismissed, setResumenDismissed] = useState(() => localStorage.getItem(claveResumen) === '1')
  const dismissResumen = () => { localStorage.setItem(claveResumen, '1'); setResumenDismissed(true) }

  const citasSemPasada = citas.filter(c => c.fecha >= lunesPasadoStr && c.fecha <= domingosPasadoStr)
  const semAtendidas   = citasSemPasada.filter(c => c.estado === 'atendida').length
  const semCanceladas  = citasSemPasada.filter(c => c.estado === 'cancelada').length
  const semNoAsistio   = citasSemPasada.filter(c => c.estado === 'no_asistio').length
  const semIngresoUsd  = ingresos.filter(i => i.fecha >= lunesPasadoStr && i.fecha <= domingosPasadoStr).reduce((a, i) => {
    if (i.moneda === 'USD') return a + Number(i.monto)
    const t = Number(i.tasa_bcv)
    return t ? a + Number(i.monto) / t : a
  }, 0)
  const citasEstaSem = citas.filter(c => c.fecha >= lunesEstaSemanaStr && c.fecha <= domingoEstaSemanaStr && (c.estado === 'pendiente' || !c.estado)).length
  const mostrarResumenSemanal = !resumenDismissed && citasSemPasada.length > 0

  // ── Cálculos ──
  const esMes  = (i) => i.fecha && i.fecha.slice(0, 7) === mesStr
  const esAnio = (i) => i.fecha && i.fecha.slice(0, 4) === anioStr

  const ingresosMes  = ingresos.filter(esMes)
  const ingresosAnio = ingresos.filter(esAnio)

  const totalUSDmes  = ingresosMes.filter(i => i.moneda === 'USD').reduce((a, i) => a + Number(i.monto), 0)
  const totalBsmes   = ingresosMes.filter(i => i.moneda === 'Bs').reduce((a, i) => a + Number(i.monto), 0)
  const totalUSDanio = ingresosAnio.filter(i => i.moneda === 'USD').reduce((a, i) => a + Number(i.monto), 0)
  const totalBsanio  = ingresosAnio.filter(i => i.moneda === 'Bs').reduce((a, i) => a + Number(i.monto), 0)

  const egresosMes = egresos.filter(esMes)
  const totalEgresosUSD    = egresosMes.filter(e => e.moneda === 'USD').reduce((a, e) => a + Number(e.monto), 0)
  const totalEgresosBs     = egresosMes.filter(e => e.moneda === 'Bs').reduce((a, e) => a + Number(e.monto), 0)
  const totalEgresosEnUsd  = totalEgresosUSD + (tasaHoy ? totalEgresosBs / tasaHoy : 0)

  const totalMesUsd = ingresosMes.reduce((a, i) => {
    if (i.moneda === 'USD') return a + Number(i.monto)
    const t = Number(i.tasa_bcv)
    return t ? a + Number(i.monto) / t : a
  }, 0)

  const clientesNuevosMes = clientes.filter(c => {
    if (!c.created_at) return false
    const fechaVE = new Date(c.created_at).toLocaleDateString('en-CA', { timeZone: 'America/Caracas' })
    return fechaVE.slice(0, 7) === mesStr
  }).length

  const mesPasado = mes === 0 ? 11 : mes - 1
  const anioPasado = mes === 0 ? anio - 1 : anio
  const mesPasadoStr = `${anioPasado}-${String(mesPasado + 1).padStart(2, '0')}`
  const ingresosMesPasado = ingresos.filter(i => i.fecha && i.fecha.slice(0, 7) === mesPasadoStr)
  const totalMesPasadoUsd = ingresosMesPasado.reduce((a, i) => {
    if (i.moneda === 'USD') return a + Number(i.monto)
    const t = Number(i.tasa_bcv)
    return t ? a + Number(i.monto) / t : a
  }, 0)
  const citasMesPasado = citas.filter(c => c.fecha && c.fecha.slice(0, 7) === mesPasadoStr).length
  const citasMesActual = citas.filter(c => c.fecha && c.fecha.slice(0, 7) === mesStr).length
  const pctIngresos = totalMesPasadoUsd > 0 ? ((totalMesUsd - totalMesPasadoUsd) / totalMesPasadoUsd) * 100 : null
  const pctCitas    = citasMesPasado > 0 ? ((citasMesActual - citasMesPasado) / citasMesPasado) * 100 : null

  const citasHoy = citas.filter(c => c.fecha === hoyStr).sort((a, b) => (a.hora||'').localeCompare(b.hora||''))
  const citasSinHora = citasHoy.filter(c => !c.hora)

  const en7DiasDate = new Date(hoyDate); en7DiasDate.setDate(hoyDate.getDate() + 7)
  const en7DiasStr = toFechaVE(en7DiasDate)
  const citasProximas7 = citas
    .filter(c => c.fecha > hoyStr && c.fecha <= en7DiasStr)
    .sort((a, b) => a.fecha.localeCompare(b.fecha) || (a.hora||'').localeCompare(b.hora||''))

  const ultimosPagos    = [...ingresos].sort((a, b) => (b.fecha || '').localeCompare(a.fecha || '')).slice(0, 3)
  const ultimosClientes = [...clientes].slice(0, 3)
  const fechaLabel = hoyDate.toLocaleDateString('es-VE', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="min-h-screen">
      <PageHeader
        title="S7tyle"
        action={
          <div className="flex gap-2">
            <button onClick={() => navigate('/estadisticas')} className="glass-btn-icon w-10 h-10 flex items-center justify-center">
              <BarChart2 size={17} className="text-white/70" />
            </button>
            <button onClick={logout} className="glass-btn-icon w-10 h-10 flex items-center justify-center">
              <LogOut size={18} className="text-white/70" />
            </button>
          </div>
        }
      />

      <div className="px-4 pt-4 pb-6 space-y-4">

        {/* Saludo */}
        <div className="glass-card text-center py-5">
          <p className="text-white/50 text-sm">Bienvenido</p>
          <h2 className="text-white text-2xl font-bold mt-0.5">Samuel</h2>
          <p className="text-white/40 text-xs mt-1 capitalize">{fechaLabel}</p>
          {tasaHoy && (
            <button onClick={() => navigate('/tasa')}
                    className="inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 rounded-2xl"
                    style={{background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.14)'}}>
              <TrendingUp size={11} className="text-amber-300" />
              <span className="text-amber-300 text-xs font-semibold">BCV €</span>
              <span className="text-white text-xs font-bold">{parseFloat(tasaHoy.toFixed(4))} Bs</span>
            </button>
          )}
        </div>

        {/* Resumen semanal */}
        {mostrarResumenSemanal && (
          <div className="glass-card space-y-3" style={{background:'rgba(217,119,6,0.12)', border:'1px solid rgba(217,119,6,0.30)'}}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart2 size={15} className="text-amber-300" />
                <span className="text-amber-200 text-sm font-semibold">Semana pasada</span>
                <span className="text-white/30 text-xs">
                  {lunesPasado.getDate()}/{lunesPasado.getMonth()+1} – {domingosPasado.getDate()}/{domingosPasado.getMonth()+1}
                </span>
              </div>
              <button onClick={dismissResumen} className="text-white/30 active:text-white/60 p-1">
                <X size={14} />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-2xl p-2.5 text-center" style={{background:'rgba(52,211,153,0.15)', border:'1px solid rgba(52,211,153,0.25)'}}>
                <p className="text-emerald-300 text-xl font-bold">{semAtendidas}</p>
                <p className="text-emerald-300/60 text-[10px] font-semibold mt-0.5">Atendidas</p>
              </div>
              <div className="rounded-2xl p-2.5 text-center" style={{background:'rgba(239,68,68,0.12)', border:'1px solid rgba(239,68,68,0.22)'}}>
                <p className="text-red-300 text-xl font-bold">{semCanceladas + semNoAsistio}</p>
                <p className="text-red-300/60 text-[10px] font-semibold mt-0.5">Canceladas</p>
              </div>
              <div className="rounded-2xl p-2.5 text-center" style={{background:'rgba(52,211,153,0.10)', border:'1px solid rgba(52,211,153,0.18)'}}>
                <p className="text-emerald-200 text-xl font-bold">${semIngresoUsd.toFixed(0)}</p>
                <p className="text-emerald-200/60 text-[10px] font-semibold mt-0.5">USD</p>
              </div>
            </div>

            {citasEstaSem > 0 && (
              <div className="flex items-center gap-2 rounded-2xl px-3 py-2"
                   style={{background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.10)'}}>
                <CalendarDays size={13} className="text-amber-300 flex-shrink-0" />
                <p className="text-white/65 text-xs">
                  Esta semana tienes <span className="text-white font-semibold">{citasEstaSem} {citasEstaSem === 1 ? 'cita' : 'citas'}</span> pendientes
                </p>
              </div>
            )}
          </div>
        )}

        {/* Stats — 2x2 */}
        <div className="grid grid-cols-2 gap-3">
          <div className="glass-card flex flex-col items-center gap-1 py-5">
            <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center mb-1">
              <Users size={19} className="text-white" />
            </div>
            <p className="text-2xl font-bold text-white">{clientes.length}</p>
            <p className="text-xs text-white/50">Clientes</p>
          </div>
          <div className="glass-card flex flex-col items-center gap-1 py-5">
            <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center mb-1">
              <Clock size={19} className="text-white" />
            </div>
            <p className="text-2xl font-bold text-white">{citasHoy.length}</p>
            <p className="text-xs text-white/50">Citas hoy</p>
          </div>
          <div className="glass-card flex flex-col items-center gap-1 py-5">
            <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center mb-1">
              <UserPlus size={19} className="text-white" />
            </div>
            <p className="text-2xl font-bold text-white">{clientesNuevosMes}</p>
            <p className="text-xs text-white/50">Nuevos {MESES[mes].slice(0,3)}</p>
          </div>
          <div className="glass-card flex flex-col items-center gap-1 py-5">
            <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center mb-1">
              <CalendarDays size={19} className="text-white" />
            </div>
            <p className="text-2xl font-bold text-white">{citasMesActual}</p>
            <p className="text-xs text-white/50">Citas {MESES[mes].slice(0,3)}</p>
            {pctCitas !== null && (
              <p className="text-[10px] font-semibold mt-0.5" style={{color: pctCitas >= 0 ? '#6ee7b7' : '#fca5a5'}}>
                {pctCitas >= 0 ? '↑' : '↓'} {Math.abs(pctCitas).toFixed(0)}% vs {MESES[mesPasado].slice(0,3)}
              </p>
            )}
          </div>
        </div>

        {/* Ingresos — card con toggle mes/año */}
        <div className="glass-card space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp size={15} className="text-white/60" />
              <span className="text-white/60 text-sm font-semibold">
                {vistaIngresos === 'mes' ? MESES[mes] : anio}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex rounded-xl overflow-hidden" style={{border:'1px solid rgba(255,255,255,0.15)'}}>
                {[['mes', MESES[mes].slice(0,3)], ['anio', String(anio)]].map(([v, l]) => (
                  <button key={v} onClick={() => setVistaIngresos(v)}
                          className="px-3 py-1 text-xs font-semibold transition-all"
                          style={{
                            background: vistaIngresos === v ? 'rgba(255,255,255,0.22)' : 'transparent',
                            color: vistaIngresos === v ? 'white' : 'rgba(255,255,255,0.38)',
                          }}>
                    {l}
                  </button>
                ))}
              </div>
              <button onClick={() => navigate('/ingresos')} className="text-white/40 text-xs">Ver todo →</button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl p-4 text-center" style={{background:'rgba(52,211,153,0.10)', border:'1px solid rgba(52,211,153,0.20)'}}>
              <p className="text-xs text-emerald-300/70 font-semibold mb-1">USD</p>
              <p className="text-xl font-bold text-emerald-300">
                ${(vistaIngresos === 'mes' ? totalUSDmes : totalUSDanio).toFixed(2)}
              </p>
            </div>
            <div className="rounded-2xl p-4 text-center" style={{background:'rgba(125,211,252,0.10)', border:'1px solid rgba(125,211,252,0.20)'}}>
              <p className="text-xs text-sky-300/70 font-semibold mb-1">Bs.</p>
              <p className="text-xl font-bold text-sky-300">
                {(vistaIngresos === 'mes' ? totalBsmes : totalBsanio).toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        {/* Total mes + Balance */}
        <div className="space-y-2">
          <div className="glass-card py-4 text-center" style={{background:'rgba(217,119,6,0.15)', border:'1px solid rgba(217,119,6,0.30)'}}>
            <p className="text-xs text-amber-300/70 font-semibold mb-1">Total {MESES[mes]} en USD</p>
            <p className="text-3xl font-bold text-amber-200">${totalMesUsd.toFixed(2)}</p>
            {pctIngresos !== null && (
              <p className="text-xs font-semibold mt-1" style={{color: pctIngresos >= 0 ? '#6ee7b7' : '#fca5a5'}}>
                {pctIngresos >= 0 ? '↑' : '↓'} {Math.abs(pctIngresos).toFixed(1)}% vs {MESES[mesPasado]}
              </p>
            )}
            <p className="text-white/30 text-xs mt-1">USD + Bs a tasa EUR del día de cada cobro</p>
          </div>
          {egresosMes.length > 0 && (() => {
            const balance = totalMesUsd - totalEgresosEnUsd
            const positivo = balance >= 0
            return (
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => navigate('/egresos')} className="glass-card text-center py-3 active:bg-white/5"
                        style={{background:'rgba(239,68,68,0.10)', border:'1px solid rgba(239,68,68,0.20)'}}>
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <ArrowDownCircle size={12} className="text-red-300/70" />
                    <p className="text-xs text-red-300/70 font-semibold">Egresos {MESES[mes].slice(0,3)}</p>
                  </div>
                  <p className="text-lg font-bold text-red-300">${totalEgresosEnUsd.toFixed(2)}</p>
                </button>
                <div className="glass-card text-center py-3"
                     style={{
                       background: positivo ? 'rgba(52,211,153,0.10)' : 'rgba(239,68,68,0.10)',
                       border: `1px solid ${positivo ? 'rgba(52,211,153,0.20)' : 'rgba(239,68,68,0.20)'}`
                     }}>
                  <p className="text-xs font-semibold mb-1" style={{color: positivo ? 'rgba(110,231,183,0.70)' : 'rgba(252,165,165,0.70)'}}>Balance neto</p>
                  <p className="text-lg font-bold" style={{color: positivo ? '#6ee7b7' : '#fca5a5'}}>
                    {positivo ? '+' : ''}${balance.toFixed(2)}
                  </p>
                </div>
              </div>
            )
          })()}
        </div>

        {/* Citas de hoy */}
        <div className="glass-card space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-white font-semibold text-sm">Citas de hoy</span>
              {citasSinHora.length > 0 && (
                <span className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-xl"
                      style={{background:'rgba(251,146,60,0.22)', color:'#fdba74'}}>
                  <AlertTriangle size={10} />
                  {citasSinHora.length} sin hora
                </span>
              )}
            </div>
            <button onClick={abrirCitaRapida} className="glass-btn-icon" style={{padding:'6px'}}>
              <Plus size={15} className="text-white" />
            </button>
          </div>
          {citasHoy.length === 0 ? (
            <p className="text-white/35 text-sm text-center py-2">Sin citas programadas</p>
          ) : (
            <div className="space-y-2">
              {citasHoy.map(c => (
                <button key={c.id} onClick={() => navigate(`/clientes/${c.cliente_id}`)}
                        className="w-full flex items-center gap-3 rounded-2xl px-3 py-3 active:bg-white/10 text-left"
                        style={{background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.10)'}}>
                  <div className="w-1 h-10 rounded-full flex-shrink-0" style={{background:'rgba(217,119,6,0.70)'}} />
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-semibold truncate">{c.cliente_nombre}</p>
                    <p className="text-white/50 text-xs truncate">{c.motivo}</p>
                  </div>
                  <span className="text-amber-300 text-xs font-semibold flex-shrink-0">{formatHora(c.hora)}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Próximas citas 7 días */}
        {citasProximas7.length > 0 && (
          <div className="glass-card space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-white font-semibold text-sm">Próximos 7 días</span>
              <button onClick={() => navigate('/citas')} className="text-white/40 text-xs">Ver citas →</button>
            </div>
            <div className="space-y-2">
              {citasProximas7.map(c => (
                <button key={c.id} onClick={() => navigate(`/clientes/${c.cliente_id}`)}
                        className="w-full flex items-center gap-3 rounded-2xl px-3 py-2.5 active:bg-white/10 text-left"
                        style={{background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.10)'}}>
                  <div className="rounded-2xl px-2.5 py-1.5 text-center flex-shrink-0"
                       style={{background:'rgba(217,119,6,0.15)', border:'1px solid rgba(217,119,6,0.25)', minWidth:'40px'}}>
                    <p className="text-[9px] text-amber-300 font-bold leading-none uppercase">
                      {['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'][new Date(c.fecha+'T12:00').getMonth()]}
                    </p>
                    <p className="text-base font-bold text-amber-200 leading-tight">
                      {new Date(c.fecha+'T12:00').getDate()}
                    </p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-semibold truncate">{c.cliente_nombre}</p>
                    <p className="text-white/45 text-xs truncate">{c.motivo}</p>
                  </div>
                  {c.hora && <span className="text-amber-300 text-xs font-semibold flex-shrink-0">{formatHora(c.hora)}</span>}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Últimos clientes */}
        {ultimosClientes.length > 0 && (
          <div className="glass-card space-y-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-white font-semibold text-sm">Clientes recientes</span>
              <button onClick={() => navigate('/clientes')} className="text-white/40 text-xs">Ver todos →</button>
            </div>
            {ultimosClientes.map(c => (
              <button key={c.id} onClick={() => navigate(`/clientes/${c.id}`)}
                      className="w-full flex items-center gap-3 rounded-2xl px-3 py-3 active:bg-white/10 transition-colors"
                      style={{background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.09)'}}>
                <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                     style={{background:'rgba(217,119,6,0.20)'}}>
                  <span className="text-amber-300 text-xs font-bold">{(c.nombre||' ')[0].toUpperCase()}{(c.apellido||' ')[0].toUpperCase()}</span>
                </div>
                <div className="flex-1 text-left">
                  <p className="text-white text-sm font-semibold">{c.nombre} {c.apellido}</p>
                  <p className="text-white/45 text-xs">{c.telefono || ''}</p>
                </div>
                <ChevronRight size={15} className="text-white/25" />
              </button>
            ))}
          </div>
        )}

        {/* Últimos ingresos */}
        {ultimosPagos.length > 0 && (
          <div className="glass-card space-y-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-white font-semibold text-sm">Últimos ingresos</span>
              <button onClick={() => navigate('/ingresos')} className="text-white/40 text-xs">Ver todos →</button>
            </div>
            {ultimosPagos.map(i => (
              <div key={i.id} className="flex items-center gap-3 rounded-2xl px-3 py-3"
                   style={{background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.09)'}}>
                <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                     style={{background:'rgba(52,211,153,0.15)'}}>
                  <DollarSign size={16} className="text-emerald-300" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-semibold truncate">{i.cliente_nombre}</p>
                  <p className="text-white/45 text-xs truncate">{i.concepto}</p>
                </div>
                <span className="text-emerald-300 text-sm font-bold flex-shrink-0">
                  {i.moneda === 'USD' ? '$' : 'Bs.'}{Number(i.monto).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        )}

      </div>

      {/* ── Bottom sheet: Cita rápida ── */}
      {citaRapida && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end" style={{background:'rgba(0,0,0,0.60)'}}>
          <div className="rounded-t-3xl px-4 pt-5 pb-8 space-y-4"
               style={{background:'rgba(20,10,0,0.97)', border:'1px solid rgba(255,255,255,0.12)', borderBottom:'none', backdropFilter:'blur(24px)'}}>

            <div className="flex items-center justify-between">
              <h3 className="text-white font-bold text-base">Cita rápida</h3>
              <div className="flex items-center gap-3">
                <button onClick={() => { setCitaRapida(false); navigate('/citas/nueva') }}
                        className="text-amber-300 text-xs font-medium">
                  Formulario completo →
                </button>
                <button onClick={() => setCitaRapida(false)} className="text-white/40 active:text-white/70">
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Cliente */}
            {qForm.cliente_id && !qMostrarBuscador ? (
              <div className="flex items-center justify-between rounded-2xl px-3 py-3"
                   style={{background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.15)'}}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{background:'rgba(217,119,6,0.20)'}}>
                    <span className="text-amber-300 font-bold text-xs">
                      {qForm.cliente_nombre.split(' ').filter(n => n).map(n => n[0]).slice(0,2).join('')}
                    </span>
                  </div>
                  <span className="text-white text-sm font-semibold">{qForm.cliente_nombre}</span>
                </div>
                <button onClick={() => { setQForm(f => ({...f, cliente_id:'', cliente_nombre:''})); setQMostrarBuscador(true) }}
                        className="text-white/40 text-xs">
                  Cambiar
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
                  <input className="glass-input" style={{paddingLeft:'38px'}}
                         placeholder="Buscar cliente..."
                         value={qBusqueda}
                         onChange={e => setQBusqueda(e.target.value)}
                         autoFocus />
                </div>
                {qFiltrados.length > 0 && (
                  <div className="space-y-1 max-h-36 overflow-y-auto">
                    {qFiltrados.map(c => (
                      <button key={c.id}
                              onClick={() => { setQForm(f => ({...f, cliente_id: c.id, cliente_nombre: `${c.nombre} ${c.apellido}`})); setQMostrarBuscador(false); setQBusqueda(''); setQError('') }}
                              className="w-full flex items-center gap-3 rounded-2xl px-3 py-2 active:bg-white/10 text-left"
                              style={{background:'rgba(255,255,255,0.06)'}}>
                        <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{background:'rgba(217,119,6,0.20)'}}>
                          <span className="text-amber-300 font-bold text-xs">{(c.nombre||' ')[0].toUpperCase()}{(c.apellido||' ')[0].toUpperCase()}</span>
                        </div>
                        <span className="text-white text-sm">{c.nombre} {c.apellido}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Fecha y hora */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="glass-label">Fecha</label>
                <input type="date" className="glass-input"
                       value={qForm.fecha}
                       onChange={e => setQForm(f => ({...f, fecha: e.target.value}))} />
              </div>
              <div>
                <label className="glass-label">Hora *</label>
                <input type="time" className="glass-input"
                       value={qForm.hora}
                       onChange={e => { setQForm(f => ({...f, hora: e.target.value})); setQError('') }} />
              </div>
            </div>

            {/* Motivo */}
            <div>
              <label className="glass-label">Servicio</label>
              <div className="flex flex-wrap gap-2 mt-1">
                {MOTIVOS_RAPIDOS.map(m => {
                  const activo = qForm.motivo === m
                  return (
                    <button key={m} type="button"
                            onClick={() => setQForm(f => ({...f, motivo: m}))}
                            className="px-3 py-1.5 rounded-2xl text-xs font-semibold transition-all"
                            style={{
                              background: activo ? 'rgba(217,119,6,0.45)' : 'rgba(255,255,255,0.08)',
                              border: `1px solid ${activo ? 'rgba(217,119,6,0.70)' : 'rgba(255,255,255,0.15)'}`,
                              color: activo ? 'white' : 'rgba(255,255,255,0.50)',
                            }}>
                      {m}
                    </button>
                  )
                })}
              </div>
            </div>

            {qError && <p className="text-red-400 text-xs">{qError}</p>}

            <button onClick={guardarCitaRapida} disabled={qGuardando}
                    className="glass-btn-primary"
                    style={{opacity: qGuardando ? 0.6 : 1}}>
              <CheckCircle2 size={17} />
              {qGuardando ? 'Agendando...' : 'Agendar cita'}
            </button>
          </div>
        </div>
      )}

    </div>
  )
}
