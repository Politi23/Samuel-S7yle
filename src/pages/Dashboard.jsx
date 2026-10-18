import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import { useBcv } from '../hooks/useBcv'
import { useNavigate } from 'react-router-dom'
import { Users, Clock, Plus, ChevronRight, LogOut, UserPlus, CalendarDays, AlertTriangle, Search, X, BarChart2, CheckCircle2, Gift } from 'lucide-react'
import { hoyVE, toFechaVE, ahoraVE } from '../lib/fecha'
import Logo from '../components/Logo'

const MOTIVOS_RAPIDOS = ['Corte de cabello','Corte + Barba','Cejas','Colorimetría','Pigmentación','Lavado','Otro']

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
  const [qForm, setQForm] = useState({ cliente_id: '', cliente_nombre: '', fecha: hoyStr, hora: '', motivos: ['Corte de cabello'] })
  const [qBusqueda, setQBusqueda] = useState('')
  const [qMostrarBuscador, setQMostrarBuscador] = useState(true)
  const [qGuardando, setQGuardando] = useState(false)
  const [qError, setQError] = useState('')

  const qFiltrados = clientes.filter(c => {
    const q = qBusqueda.toLowerCase()
    return (c.nombre||'').toLowerCase().includes(q) || (c.apellido||'').toLowerCase().includes(q) || (c.telefono||'').includes(q)
  }).slice(0, 5)

  const abrirCitaRapida = () => {
    setQForm({ cliente_id: '', cliente_nombre: '', fecha: hoyStr, hora: '', motivos: ['Corte de cabello'] })
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
      await agregarCita({ cliente_id: qForm.cliente_id, cliente_nombre: qForm.cliente_nombre, fecha: qForm.fecha, hora: qForm.hora, motivo: qForm.motivos.join(' + ') || 'Sin especificar', notas: '' })
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

  // ── Ingresos de hoy ──
  const ingresosHoy   = ingresos.filter(i => i.fecha === hoyStr)
  const hoyUsdDirecto = ingresosHoy.filter(i => i.moneda === 'USD').reduce((a, i) => a + Number(i.monto), 0)
  const hoyBs         = ingresosHoy.filter(i => i.moneda === 'Bs').reduce((a, i) => a + Number(i.monto), 0)
  const totalHoyUsd   = ingresosHoy.reduce((a, i) => {
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
  const fechaLargo = hoyDate.toLocaleDateString('es-VE', { weekday: 'long', day: 'numeric', month: 'long' })
  const fechaLabel = fechaLargo.charAt(0).toUpperCase() + fechaLargo.slice(1)

  // ── Cumpleaños próximos 7 días ──
  const hoyMMDD = hoyStr.slice(5)
  const cumpleHoy = clientes.filter(c => c.fecha_nacimiento && c.fecha_nacimiento.slice(5) === hoyMMDD)
  const cumpleProximos = clientes.filter(c => {
    if (!c.fecha_nacimiento) return false
    const mmdd = c.fecha_nacimiento.slice(5)
    if (mmdd === hoyMMDD) return false
    for (let i = 1; i <= 7; i++) {
      const d = new Date(hoyDate); d.setDate(hoyDate.getDate() + i)
      const dStr = toFechaVE(d).slice(5)
      if (mmdd === dStr) return true
    }
    return false
  })

  const saludo = (() => {
    const h = parseInt(ahoraVE().slice(0, 2))
    return h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches'
  })()
  const totalAnioUsd = ingresosAnio.reduce((a, i) => {
    if (i.moneda === 'USD') return a + Number(i.monto)
    const t = Number(i.tasa_bcv)
    return t ? a + Number(i.monto) / t : a
  }, 0)
  const verMes = vistaIngresos === 'mes'
  const balance = totalMesUsd - totalEgresosEnUsd
  const linea = { borderTop: '1px solid var(--line)' }

  return (
    <div className="min-h-screen">

      {/* ── Marca ── */}
      <header className="relative px-4 pt-5 pb-2 text-center">
        <div className="absolute top-4 left-4">
          <button onClick={() => navigate('/estadisticas')} aria-label="Estadísticas"
                  className="glass-btn-icon w-10 h-10 flex items-center justify-center">
            <BarChart2 size={17} className="text-white/75" />
          </button>
        </div>
        <div className="absolute top-4 right-4">
          <button onClick={logout} aria-label="Cerrar sesión"
                  className="glass-btn-icon w-10 h-10 flex items-center justify-center">
            <LogOut size={17} className="text-white/75" />
          </button>
        </div>
        <Logo size={124} />
        <h1 className="text-white text-[22px] font-extrabold mt-3">{saludo}, Samuel</h1>
        <div className="flex items-center justify-center gap-2 mt-1.5 text-[13px]">
          <span className="text-white/55">{fechaLabel}</span>
          {tasaHoy && (
            <>
              <span className="text-white/25" aria-hidden="true">·</span>
              <button onClick={() => navigate('/tasa')} className="inline-flex items-center gap-1 font-semibold">
                <span className="text-amber-300">BCV €</span>
                <span className="text-white/85">{parseFloat(tasaHoy.toFixed(2))} Bs</span>
              </button>
            </>
          )}
        </div>
      </header>

      <div className="px-4 pt-4 pb-6 space-y-4">

        {/* ── Hoy ── */}
        <section className="glass-card" style={{ padding: 18 }}>
          <div className="flex items-center justify-between">
            <h2 className="text-white/60 text-[13px] font-bold">Ingresos de hoy</h2>
            <button onClick={() => navigate('/ingresos')} className="text-amber-300 text-xs font-semibold">Ver ingresos</button>
          </div>
          <p className="text-white text-[40px] font-extrabold leading-none mt-3" style={{ letterSpacing: '-0.03em' }}>
            <span className="text-amber-300 text-[26px] align-top mr-0.5" style={{ lineHeight: '34px' }}>$</span>
            {totalHoyUsd.toFixed(2)}
          </p>
          <p className="text-white/55 text-[13px] mt-2">
            {ingresosHoy.length > 0 ? (
              <>
                {ingresosHoy.length} {ingresosHoy.length === 1 ? 'cobro' : 'cobros'}
                {hoyUsdDirecto > 0 && ` · $${hoyUsdDirecto.toFixed(2)} en USD`}
                {hoyBs > 0 && ` · Bs. ${hoyBs.toFixed(2)}`}
              </>
            ) : 'Todavía no hay cobros hoy'}
          </p>
          <div className="grid grid-cols-2 gap-2 mt-4">
            <button onClick={() => navigate('/ingresos/nuevo')} className="glass-btn-primary" style={{ minHeight: 46, padding: '11px 14px' }}>
              <Plus size={17} strokeWidth={2.5} /> Cobro
            </button>
            <button onClick={abrirCitaRapida}
                    className="flex items-center justify-center gap-2 rounded-[14px] font-bold text-white min-h-[46px] active:scale-[0.985] transition-transform"
                    style={{ background: 'rgba(255,244,222,0.05)', border: '1px solid rgba(255,236,200,0.16)' }}>
              <CalendarDays size={16} className="text-amber-300" /> Cita
            </button>
          </div>
        </section>

        {/* ── Resumen semanal ── */}
        {mostrarResumenSemanal && (
          <section className="glass-card space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-baseline gap-2">
                <h2 className="text-white text-[15px] font-bold">Semana pasada</h2>
                <span className="text-white/45 text-xs">
                  {lunesPasado.getDate()}/{lunesPasado.getMonth()+1} – {domingosPasado.getDate()}/{domingosPasado.getMonth()+1}
                </span>
              </div>
              <button onClick={dismissResumen} aria-label="Ocultar resumen" className="text-white/45 active:text-white/70 p-2 -m-2">
                <X size={16} />
              </button>
            </div>
            <div className="grid grid-cols-3">
              {[
                [semAtendidas, 'Atendidas', 'text-white'],
                [semCanceladas + semNoAsistio, 'Canceladas', 'text-red-300'],
                [`$${semIngresoUsd.toFixed(0)}`, 'Ingresos', 'text-amber-200'],
              ].map(([v, l, c], idx) => (
                <div key={l} className="text-center px-1" style={idx ? { borderLeft: '1px solid var(--line)' } : undefined}>
                  <p className={`${c} text-xl font-extrabold`}>{v}</p>
                  <p className="text-white/50 text-[11px] font-semibold mt-0.5">{l}</p>
                </div>
              ))}
            </div>
            {citasEstaSem > 0 && (
              <p className="text-white/60 text-xs pt-3" style={linea}>
                Esta semana tienes <span className="text-white font-semibold">{citasEstaSem} {citasEstaSem === 1 ? 'cita pendiente' : 'citas pendientes'}</span>
              </p>
            )}
          </section>
        )}

        {/* ── Cumpleaños ── */}
        {cumpleHoy.map(c => (
          <button key={c.id} onClick={() => navigate(`/clientes/${c.id}`)}
                  className="glass-card w-full flex items-center gap-3 text-left active:opacity-80"
                  style={{ background: 'linear-gradient(180deg, rgba(201,162,74,0.16), rgba(201,162,74,0.07))', borderColor: 'rgba(201,162,74,0.35)' }}>
            <div className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0"
                 style={{ background: 'rgba(201,162,74,0.18)', border: '1px solid rgba(201,162,74,0.40)' }}>
              <Gift size={19} className="text-amber-300" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-amber-300 text-xs font-bold">Cumpleaños hoy · servicio gratis</p>
              <p className="text-white font-bold truncate">{c.nombre} {c.apellido}</p>
            </div>
            <ChevronRight size={17} className="text-white/35" />
          </button>
        ))}
        {cumpleProximos.length > 0 && (
          <section className="glass-card">
            <div className="flex items-center gap-2 mb-1">
              <Gift size={15} className="text-amber-300" />
              <h2 className="text-white text-[15px] font-bold">Cumpleaños esta semana</h2>
            </div>
            <ul>
              {cumpleProximos.map((c, idx) => {
                const [, mm, dd] = c.fecha_nacimiento.split('-')
                return (
                  <li key={c.id} style={idx ? linea : undefined}>
                    <button onClick={() => navigate(`/clientes/${c.id}`)} className="w-full flex items-center gap-3 py-2.5 text-left active:opacity-70">
                      <span className="text-white text-sm flex-1 truncate">{c.nombre} {c.apellido}</span>
                      <span className="text-amber-300 text-xs font-bold">{dd}/{mm}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>
        )}

        {/* ── Indicadores ── */}
        <section className="glass-card grid grid-cols-2" style={{ padding: 0 }} aria-label="Indicadores">
          {[
            { Icon: Users,        val: clientes.length,   label: 'Clientes' },
            { Icon: Clock,        val: citasHoy.length,   label: 'Citas hoy' },
            { Icon: UserPlus,     val: clientesNuevosMes, label: `Nuevos en ${MESES[mes].slice(0,3).toLowerCase()}` },
            { Icon: CalendarDays, val: citasMesActual,    label: `Citas en ${MESES[mes].slice(0,3).toLowerCase()}`, pct: pctCitas },
          ].map(({ Icon, val, label, pct }, idx) => (
            <div key={label} className="px-4 py-4"
                 style={{
                   borderLeft: idx % 2 ? '1px solid var(--line)' : undefined,
                   borderTop:  idx > 1 ? '1px solid var(--line)' : undefined,
                 }}>
              <div className="flex items-center gap-1.5 text-white/55">
                <Icon size={13} />
                <span className="text-[12px] font-semibold">{label}</span>
              </div>
              <div className="flex items-baseline gap-2 mt-1.5">
                <p className="text-white text-[26px] font-extrabold leading-none">{val}</p>
                {pct != null && (
                  <span className="text-[11px] font-bold" style={{ color: pct >= 0 ? '#9fd3ae' : '#fca5a5' }}>
                    {pct >= 0 ? '↑' : '↓'}{Math.abs(pct).toFixed(0)}%
                  </span>
                )}
              </div>
            </div>
          ))}
        </section>

        {/* ── Finanzas ── */}
        <section className="glass-card" style={{ padding: 18 }}>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-white text-[15px] font-bold">{verMes ? MESES[mes] : `Año ${anio}`}</h2>
            <div className="flex items-center gap-3">
              <div className="flex rounded-[10px] p-0.5" role="tablist"
                   style={{ background: 'rgba(255,244,222,0.05)', border: '1px solid var(--line)' }}>
                {[['mes', MESES[mes].slice(0,3)], ['anio', String(anio)]].map(([v, l]) => (
                  <button key={v} role="tab" aria-selected={vistaIngresos === v} onClick={() => setVistaIngresos(v)}
                          className="px-3 py-1 rounded-[8px] text-xs font-bold transition-colors duration-150"
                          style={{
                            background: vistaIngresos === v ? 'rgba(201,162,74,0.20)' : 'transparent',
                            color: vistaIngresos === v ? '#e2c98a' : 'rgba(247,242,232,0.55)',
                          }}>
                    {l}
                  </button>
                ))}
              </div>
              <button onClick={() => navigate('/ingresos')} className="text-amber-300 text-xs font-semibold">Ver todo</button>
            </div>
          </div>

          <p className="text-white/55 text-[12px] font-semibold mt-4">Total combinado</p>
          <div className="flex items-baseline flex-wrap gap-x-2 mt-1">
            <p className="text-amber-200 text-[32px] font-extrabold leading-none" style={{ letterSpacing: '-0.03em' }}>
              ${(verMes ? totalMesUsd : totalAnioUsd).toFixed(2)}
            </p>
            {verMes && pctIngresos !== null && (
              <span className="text-xs font-bold" style={{ color: pctIngresos >= 0 ? '#9fd3ae' : '#fca5a5' }}>
                {pctIngresos >= 0 ? '↑' : '↓'} {Math.abs(pctIngresos).toFixed(1)}% vs {MESES[mesPasado].slice(0,3).toLowerCase()}
              </span>
            )}
          </div>
          <p className="text-white/45 text-[11px] mt-1.5">USD + Bs a la tasa EUR del día de cada cobro</p>

          <dl className="mt-4 text-sm">
            {[
              ['Cobrado en USD', `$${(verMes ? totalUSDmes : totalUSDanio).toFixed(2)}`, 'text-emerald-300'],
              ['Cobrado en Bs.', `Bs. ${(verMes ? totalBsmes : totalBsanio).toFixed(2)}`, 'text-sky-300'],
              ...(verMes && egresosMes.length > 0 ? [
                ['Egresos', `−$${totalEgresosEnUsd.toFixed(2)}`, 'text-red-300', '/egresos'],
                ['Balance neto', `${balance >= 0 ? '+' : '−'}$${Math.abs(balance).toFixed(2)}`, balance >= 0 ? 'text-emerald-300' : 'text-red-300'],
              ] : []),
            ].map(([label, valor, color, ruta]) => (
              <div key={label} className="flex items-center justify-between py-2.5" style={linea}>
                <dt className="text-white/65">
                  {ruta
                    ? <button onClick={() => navigate(ruta)} className="underline decoration-white/25 underline-offset-4">{label}</button>
                    : label}
                </dt>
                <dd className={`${color} font-bold`}>{valor}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* ── Citas de hoy ── */}
        <section className="glass-card">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-white text-[15px] font-bold">Citas de hoy</h2>
              {citasSinHora.length > 0 && (
                <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full"
                      style={{ background: 'rgba(251,146,60,0.16)', color: '#fdba74' }}>
                  <AlertTriangle size={10} /> {citasSinHora.length} sin hora
                </span>
              )}
            </div>
            <button onClick={abrirCitaRapida} aria-label="Agendar cita"
                    className="glass-btn-icon w-10 h-10 flex items-center justify-center" style={{ padding: 0 }}>
              <Plus size={17} className="text-amber-300" />
            </button>
          </div>
          {citasHoy.length === 0 ? (
            <p className="text-white/50 text-sm pt-2 pb-1">No hay citas para hoy. Toca + para agendar una.</p>
          ) : (
            <ul className="mt-2">
              {citasHoy.map((c, idx) => (
                <li key={c.id} style={idx ? linea : undefined}>
                  <button onClick={() => navigate(`/clientes/${c.cliente_id}`)} className="w-full flex items-center gap-3 py-3 text-left active:opacity-70">
                    <span className="w-[68px] flex-shrink-0 text-amber-300 text-[13px] font-bold">{c.hora ? formatHora(c.hora) : '—'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-semibold truncate">{c.cliente_nombre}</p>
                      <p className="text-white/50 text-xs truncate">{c.motivo}</p>
                    </div>
                    <ChevronRight size={15} className="text-white/30" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ── Próximos 7 días ── */}
        {citasProximas7.length > 0 && (
          <section className="glass-card">
            <div className="flex items-center justify-between">
              <h2 className="text-white text-[15px] font-bold">Próximos 7 días</h2>
              <button onClick={() => navigate('/citas')} className="text-amber-300 text-xs font-semibold">Ver citas</button>
            </div>
            <ul className="mt-2">
              {citasProximas7.map((c, idx) => {
                const d = new Date(c.fecha + 'T12:00')
                return (
                  <li key={c.id} style={idx ? linea : undefined}>
                    <button onClick={() => navigate(`/clientes/${c.cliente_id}`)} className="w-full flex items-center gap-3 py-3 text-left active:opacity-70">
                      <div className="w-11 flex-shrink-0 text-center rounded-[10px] py-1"
                           style={{ background: 'rgba(201,162,74,0.10)', border: '1px solid rgba(201,162,74,0.22)' }}>
                        <p className="text-[9px] text-amber-300 font-bold leading-none uppercase tracking-wide">
                          {d.toLocaleDateString('es-VE', { weekday: 'short' }).replace('.', '')}
                        </p>
                        <p className="text-[17px] font-extrabold text-amber-200 leading-tight">{d.getDate()}</p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-semibold truncate">{c.cliente_nombre}</p>
                        <p className="text-white/50 text-xs truncate">{c.motivo}</p>
                      </div>
                      {c.hora && <span className="text-white/70 text-xs font-semibold flex-shrink-0">{formatHora(c.hora)}</span>}
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>
        )}

        {/* ── Clientes recientes ── */}
        {ultimosClientes.length > 0 && (
          <section className="glass-card">
            <div className="flex items-center justify-between">
              <h2 className="text-white text-[15px] font-bold">Clientes recientes</h2>
              <button onClick={() => navigate('/clientes')} className="text-amber-300 text-xs font-semibold">Ver todos</button>
            </div>
            <ul className="mt-2">
              {ultimosClientes.map((c, idx) => (
                <li key={c.id} style={idx ? linea : undefined}>
                  <button onClick={() => navigate(`/clientes/${c.id}`)} className="w-full flex items-center gap-3 py-2.5 text-left active:opacity-70">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                         style={{ background: 'rgba(201,162,74,0.12)', border: '1px solid rgba(201,162,74,0.28)' }}>
                      <span className="text-amber-300 text-xs font-bold">{(c.nombre||' ')[0].toUpperCase()}{(c.apellido||' ')[0].toUpperCase()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-semibold truncate">{c.nombre} {c.apellido}</p>
                      {c.telefono && <p className="text-white/50 text-xs">{c.telefono}</p>}
                    </div>
                    <ChevronRight size={15} className="text-white/30" />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* ── Últimos ingresos ── */}
        {ultimosPagos.length > 0 && (
          <section className="glass-card">
            <div className="flex items-center justify-between">
              <h2 className="text-white text-[15px] font-bold">Últimos ingresos</h2>
              <button onClick={() => navigate('/ingresos')} className="text-amber-300 text-xs font-semibold">Ver todos</button>
            </div>
            <ul className="mt-2">
              {ultimosPagos.map((i, idx) => (
                <li key={i.id} className="flex items-center gap-3 py-2.5" style={idx ? linea : undefined}>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-semibold truncate">{i.cliente_nombre}</p>
                    <p className="text-white/50 text-xs truncate">{i.concepto}</p>
                  </div>
                  <span className={`${i.moneda === 'USD' ? 'text-emerald-300' : 'text-sky-300'} text-sm font-bold flex-shrink-0`}>
                    {i.moneda === 'USD' ? '$' : 'Bs. '}{Number(i.monto).toFixed(2)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

      </div>

      {/* ── Bottom sheet: Cita rápida ── */}
      {citaRapida && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end" style={{background:'rgba(0,0,0,0.65)'}}
             onClick={e => { if (e.target === e.currentTarget) setCitaRapida(false) }}>
          <div className="rounded-t-[26px] px-4 pt-3 space-y-4 max-w-md w-full mx-auto"
               style={{background:'var(--surface)', border:'1px solid var(--line-strong)', borderBottom:'none', paddingBottom:'calc(2rem + env(safe-area-inset-bottom))'}}>
            <div className="mx-auto h-1 w-10 rounded-full" style={{background:'rgba(247,242,232,0.18)'}} aria-hidden="true" />

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
                  <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{background:'rgba(201,162,74,0.20)'}}>
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
                        <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{background:'rgba(201,162,74,0.20)'}}>
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
                  const activo = qForm.motivos.includes(m)
                  return (
                    <button key={m} type="button"
                            onClick={() => setQForm(f => {
                              const ya = f.motivos.includes(m)
                              return { ...f, motivos: ya ? f.motivos.filter(x => x !== m) : [...f.motivos, m] }
                            })}
                            className="px-3 py-1.5 rounded-2xl text-xs font-semibold transition-all"
                            style={{
                              background: activo ? 'rgba(201,162,74,0.45)' : 'rgba(255,255,255,0.08)',
                              border: `1px solid ${activo ? 'rgba(201,162,74,0.70)' : 'rgba(255,255,255,0.15)'}`,
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
