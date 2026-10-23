import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { useBcv } from '../hooks/useBcv'
import { Plus, DollarSign, ChevronLeft, ChevronRight, Edit2, Trash2, FileText, BookOpen, ChevronDown, ChevronUp } from 'lucide-react'
import { useToast } from '../context/ToastContext'
import SemanaIngresos from '../components/SemanaIngresos'
import { aUsd } from '../lib/semana'
import PageHeader from '../components/PageHeader'
import { hoyVE } from '../lib/fecha'

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

function exportarPDF(filtrados, mes, anio, totalUSD, totalBs, totalEnUsd) {
  const filas = filtrados.map(i => {
    const t = Number(i.tasa_bcv)
    const usdEq = i.moneda === 'Bs' && t ? `≈€${(Number(i.monto)/t).toFixed(2)}` : ''
    return `
      <tr>
        <td>${i.fecha ? i.fecha.split('-').reverse().join('/') : ''}</td>
        <td>${i.cliente_nombre}</td>
        <td>${i.concepto}</td>
        <td>${i.metodo_pago}</td>
        <td style="text-align:right;font-weight:600">${i.moneda === 'USD' ? '$' : 'Bs.'}${Number(i.monto).toFixed(2)}</td>
        <td style="text-align:right;color:#6b7280">${usdEq}</td>
      </tr>`
  }).join('')

  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
  <title>Ingresos ${MESES[mes]} ${anio}</title>
  <style>
    body{font-family:Arial,sans-serif;font-size:12px;color:#111;margin:24px}
    h1{font-size:18px;margin-bottom:2px}p.sub{color:#6b7280;margin:0 0 16px}
    table{width:100%;border-collapse:collapse}
    th{background:#b45309;color:white;padding:7px 10px;text-align:left;font-size:11px}
    td{padding:6px 10px;border-bottom:1px solid #e5e7eb}
    tr:nth-child(even){background:#fffbeb}
    .totales{margin-top:16px;display:flex;gap:24px}
    .tot{background:#f3f4f6;border-radius:8px;padding:10px 16px}
    .tot b{display:block;font-size:16px;margin-top:2px}
    .tot.comb{background:#fef3c7}.tot.comb b{color:#b45309}
    @media print{body{margin:0}}
  </style></head><body>
  <h1>Reporte de Ingresos — ${MESES[mes]} ${anio}</h1>
  <p class="sub">BarberShop Samuel S7tyle · Generado el ${new Date().toLocaleDateString('es-VE')}</p>
  <table>
    <thead><tr><th>Fecha</th><th>Cliente</th><th>Servicio</th><th>Método</th><th style="text-align:right">Monto</th><th style="text-align:right">≈USD</th></tr></thead>
    <tbody>${filas}</tbody>
  </table>
  <div class="totales">
    <div class="tot comb"><span style="font-size:11px;color:#92400e">Total USD combinado</span><b>$${totalEnUsd.toFixed(2)}</b></div>
    <div class="tot"><span style="font-size:11px;color:#6b7280">USD directo</span><b style="color:#059669">$${totalUSD.toFixed(2)}</b></div>
    <div class="tot"><span style="font-size:11px;color:#6b7280">Total Bs.</span><b style="color:#0284c7">${totalBs.toFixed(2)}</b></div>
  </div>
  <script>window.onload=()=>window.print()</script></body></html>`

  const w = window.open('', '_blank')
  w.document.write(html)
  w.document.close()
}

function exportarPDFAnual(ingresosAnio, anio, tasaHoy) {
  let totalUSDAnio = 0, totalBsAnio = 0, totalCombAnio = 0
  let seccionesHTML = ''

  for (let m = 0; m < 12; m++) {
    const mesAnualStr = `${anio}-${String(m + 1).padStart(2, '0')}`
    const del_mes = ingresosAnio.filter(i => i.fecha && i.fecha.slice(0, 7) === mesAnualStr)
    if (del_mes.length === 0) continue
    const usd = del_mes.filter(i => i.moneda === 'USD').reduce((a, i) => a + Number(i.monto), 0)
    const bs  = del_mes.filter(i => i.moneda === 'Bs').reduce((a, i) => a + Number(i.monto), 0)
    const comb = del_mes.reduce((a, i) => {
      if (i.moneda === 'USD') return a + Number(i.monto)
      const t = Number(i.tasa_bcv)
      return t ? a + Number(i.monto) / t : a
    }, 0)
    totalUSDAnio += usd; totalBsAnio += bs; totalCombAnio += comb

    const filas = del_mes.sort((a, b) => a.fecha.localeCompare(b.fecha)).map(i => {
      const tRow = Number(i.tasa_bcv) || tasaHoy
      const eq = i.moneda === 'Bs' && tRow ? `≈€${(Number(i.monto)/tRow).toFixed(2)}` : ''
      return `<tr><td>${i.fecha.split('-').reverse().join('/')}</td><td>${i.cliente_nombre}</td><td>${i.concepto}</td><td>${i.metodo_pago}</td><td style="text-align:right;font-weight:600">${i.moneda==='USD'?'$':'Bs.'}${Number(i.monto).toFixed(2)}</td><td style="text-align:right;color:#6b7280">${eq}</td></tr>`
    }).join('')

    seccionesHTML += `
      <h3 style="margin:20px 0 6px;font-size:13px;color:#b45309;border-bottom:1px solid #fef3c7;padding-bottom:4px">${MESES[m]} ${anio} · ${del_mes.length} registros</h3>
      <table style="width:100%;border-collapse:collapse;margin-bottom:4px">
        <thead><tr style="background:#b45309;color:white"><th style="padding:5px 8px;text-align:left;font-size:10px">Fecha</th><th style="padding:5px 8px;text-align:left;font-size:10px">Cliente</th><th style="padding:5px 8px;text-align:left;font-size:10px">Servicio</th><th style="padding:5px 8px;text-align:left;font-size:10px">Método</th><th style="padding:5px 8px;text-align:right;font-size:10px">Monto</th><th style="padding:5px 8px;text-align:right;font-size:10px">≈USD</th></tr></thead>
        <tbody>${filas}</tbody>
      </table>
      <p style="text-align:right;font-size:11px;color:#374151;margin:0 0 4px">USD: <b>$${usd.toFixed(2)}</b> · Bs: <b>${bs.toFixed(2)}</b> · Total USD: <b style="color:#b45309">$${comb.toFixed(2)}</b></p>`
  }

  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Reporte Anual ${anio}</title>
  <style>body{font-family:Arial,sans-serif;font-size:11px;color:#111;margin:24px}h1{font-size:18px;margin-bottom:2px}p.sub{color:#6b7280;margin:0 0 8px}td{padding:5px 8px;border-bottom:1px solid #e5e7eb}tr:nth-child(even){background:#fffbeb}.resumen{background:#fef3c7;border-radius:8px;padding:14px 20px;margin-bottom:16px;display:flex;gap:32px}.res-item b{display:block;font-size:18px;margin-top:2px}@media print{body{margin:0}}</style>
  </head><body>
  <h1>Reporte Anual de Ingresos — ${anio}</h1>
  <p class="sub">BarberShop Samuel S7tyle · Generado el ${new Date().toLocaleDateString('es-VE')}</p>
  <div class="resumen">
    <div class="res-item"><span style="font-size:11px;color:#92400e">Total USD combinado</span><b style="color:#b45309">$${totalCombAnio.toFixed(2)}</b></div>
    <div class="res-item"><span style="font-size:11px;color:#6b7280">USD directo</span><b style="color:#059669">$${totalUSDAnio.toFixed(2)}</b></div>
    <div class="res-item"><span style="font-size:11px;color:#6b7280">Total Bs.</span><b style="color:#0284c7">${totalBsAnio.toFixed(2)}</b></div>
  </div>
  ${seccionesHTML}
  <script>window.onload=()=>window.print()</script></body></html>`

  const w = window.open('', '_blank')
  w.document.write(html)
  w.document.close()
}

function formatFecha(isoStr) {
  if (!isoStr) return ''
  const [y, m, d] = isoStr.split('-')
  return `${d}/${m}/${y}`
}

export default function Ingresos() {
  const { ingresos, eliminarIngreso } = useApp()
  const { data: bcv } = useBcv()
  const tasaHoy = bcv?.eur ?? null
  const navigate = useNavigate()
  const toast = useToast()
  const hoyStr = hoyVE()
  const [mes, setMes] = useState(() => parseInt(hoyStr.split('-')[1]) - 1)
  const [anio, setAnio] = useState(() => parseInt(hoyStr.split('-')[0]))
  const [filtroMoneda, setFiltroMoneda] = useState('todos')
  const [confirmar, setConfirmar] = useState(null)
  const [eliminando, setEliminando] = useState(false)
  const [vistaTotal, setVistaTotal] = useState('mes')
  const [verResumen, setVerResumen] = useState(false)
  const [verMetodos, setVerMetodos] = useState(false)
  const [verDias,    setVerDias]    = useState(false)

  const irAnterior = () => { setVistaTotal('mes'); if (mes === 0) { setMes(11); setAnio(a => a-1) } else setMes(m => m-1) }
  const irSiguiente = () => { setVistaTotal('mes'); if (mes === 11) { setMes(0); setAnio(a => a+1) } else setMes(m => m+1) }

  const mesStr = `${anio}-${String(mes + 1).padStart(2, '0')}`
  const porMes = (i) => i.fecha && i.fecha.slice(0, 7) === mesStr
  const ingresosAnio = ingresos.filter(i => i.fecha && i.fecha.slice(0, 4) === String(anio))
  const ingresosMes = ingresos.filter(i => porMes(i))
  // El listado y los resúmenes siguen el período elegido arriba (mes o año)
  const ingresosPeriodo = vistaTotal === 'anio' ? ingresosAnio : ingresosMes
  const periodoLabel = vistaTotal === 'anio' ? String(anio) : MESES[mes]
  const porMoneda = (i) => filtroMoneda === 'todos' || i.moneda === filtroMoneda
  const porFecha = (a, b) => (b.fecha || '').localeCompare(a.fecha || '')
  const filtrados = ingresosPeriodo.filter(porMoneda).sort(porFecha)
  const filtradosMes = ingresosMes.filter(porMoneda).sort(porFecha) // el PDF mensual siempre es del mes
  const totalUSD = ingresosMes.filter(i => i.moneda === 'USD').reduce((a, i) => a + Number(i.monto), 0)
  const totalBs  = ingresosMes.filter(i => i.moneda === 'Bs').reduce((a, i) => a + Number(i.monto), 0)
  const bsEnEur = ingresosMes.filter(i => i.moneda === 'Bs').reduce((a, i) => {
    const t = Number(i.tasa_bcv) || tasaHoy
    return t ? a + Number(i.monto) / t : a
  }, 0)
  const totalEnUsd = totalUSD + bsEnEur

  const totalUSDanio = ingresosAnio.filter(i => i.moneda === 'USD').reduce((a, i) => a + Number(i.monto), 0)
  const totalBsanio  = ingresosAnio.filter(i => i.moneda === 'Bs').reduce((a, i) => a + Number(i.monto), 0)
  const bsEnEurAnio  = ingresosAnio.filter(i => i.moneda === 'Bs').reduce((a, i) => {
    const t = Number(i.tasa_bcv) || tasaHoy
    return t ? a + Number(i.monto) / t : a
  }, 0)
  const totalEnUsdAnio = totalUSDanio + bsEnEurAnio

  const METODOS_USD = ['Efectivo USD', 'Zelle', 'PayPal', 'Binance / Cripto']
  const resumenMetodos = (() => {
    const map = {}
    ingresosPeriodo.forEach(i => {
      const key = i.metodo_pago || 'Sin método'
      if (!map[key]) map[key] = { count: 0, totalUsd: 0, esUsd: METODOS_USD.includes(i.metodo_pago) }
      map[key].count++
      const t = Number(i.tasa_bcv) || tasaHoy
      map[key].totalUsd += i.moneda === 'USD' ? Number(i.monto) : (t ? Number(i.monto) / t : 0)
    })
    return Object.entries(map).sort((a, b) => b[1].totalUsd - a[1].totalUsd)
  })()

  // Resumen por día del mes (ingresos diarios)
  const resumenDias = (() => {
    const map = {}
    ingresosPeriodo.forEach(i => {
      if (!i.fecha) return
      if (!map[i.fecha]) map[i.fecha] = { count: 0, totalUsd: 0 }
      map[i.fecha].count++
      const t = Number(i.tasa_bcv) || tasaHoy
      map[i.fecha].totalUsd += i.moneda === 'USD' ? Number(i.monto) : (t ? Number(i.monto) / t : 0)
    })
    return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0]))
  })()
  const promedioDia = resumenDias.length ? resumenDias.reduce((a, [, v]) => a + v.totalUsd, 0) / resumenDias.length : 0
  const mejorDia = resumenDias.reduce((mejor, actual) => (!mejor || actual[1].totalUsd > mejor[1].totalUsd) ? actual : mejor, null)

  const resumenServicios = (() => {
    const map = {}
    ingresosPeriodo.forEach(i => {
      const key = i.concepto || 'Sin servicio'
      if (!map[key]) map[key] = { count: 0, totalUsd: 0 }
      map[key].count++
      const t = Number(i.tasa_bcv) || tasaHoy
      map[key].totalUsd += i.moneda === 'USD' ? Number(i.monto) : (t ? Number(i.monto) / t : 0)
    })
    return Object.entries(map).sort((a, b) => b[1].totalUsd - a[1].totalUsd)
  })()

  const combinado  = vistaTotal === 'mes' ? totalEnUsd    : totalEnUsdAnio
  const usdDirecto = vistaTotal === 'mes' ? totalUSD      : totalUSDanio
  const bsTotal    = vistaTotal === 'mes' ? totalBs       : totalBsanio

  // Comparación con el período anterior: el mes previo, o el año pasado
  const mesPrevio = mes === 0 ? 11 : mes - 1
  const mesPrevioStr = `${mes === 0 ? anio - 1 : anio}-${String(mesPrevio + 1).padStart(2, '0')}`
  const totalPrevio = aUsd(vistaTotal === 'anio'
    ? ingresos.filter(i => i.fecha && i.fecha.slice(0, 4) === String(anio - 1))
    : ingresos.filter(i => i.fecha && i.fecha.slice(0, 7) === mesPrevioStr), tasaHoy)
  const etiquetaPrevia = vistaTotal === 'anio' ? String(anio - 1) : MESES[mesPrevio].toLowerCase()
  const pctPrevio = totalPrevio > 0 ? ((combinado - totalPrevio) / totalPrevio) * 100 : null

  return (
    <div className="min-h-screen">
      <PageHeader
        title="Ingresos"
        action={
          <div className="flex gap-2">
            <button onClick={() => exportarPDF(filtradosMes, mes, anio, totalUSD, totalBs, totalEnUsd)}
                    className="glass-btn-icon w-10 h-10 flex items-center justify-center" title="PDF mensual">
              <FileText size={17} className="text-white/70" />
            </button>
            <button onClick={() => exportarPDFAnual(ingresosAnio, anio, tasaHoy)}
                    className="glass-btn-icon w-10 h-10 flex items-center justify-center" title="PDF anual">
              <BookOpen size={17} className="text-white/70" />
            </button>
            <button onClick={() => navigate('/ingresos/nuevo')} className="glass-btn-icon w-10 h-10 flex items-center justify-center">
              <Plus size={19} className="text-white" />
            </button>
          </div>
        }
      />

      <div className="px-4 pt-4 pb-6 space-y-4">

        {/* Navegador mes */}
        <div className="glass-card flex items-center justify-between">
          <button onClick={irAnterior} className="p-2 rounded-xl active:bg-white/10">
            <ChevronLeft size={20} className="text-white/65" />
          </button>
          <span className="text-white font-semibold">{MESES[mes]} {anio}</span>
          <button onClick={irSiguiente} className="p-2 rounded-xl active:bg-white/10">
            <ChevronRight size={20} className="text-white/65" />
          </button>
        </div>

        {/* Totales: mismo estado de cuenta que en Inicio */}
        <section className="glass-card" style={{ padding: 18 }}>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-white text-[15px] font-bold">{vistaTotal === 'mes' ? `${MESES[mes]} ${anio}` : `Año ${anio}`}</h2>
            <div className="flex rounded-[10px] p-0.5" role="tablist"
                 style={{ background: 'rgba(255,244,222,0.05)', border: '1px solid var(--line)' }}>
              {[['mes', MESES[mes].slice(0,3)], ['anio', String(anio)]].map(([v, l]) => (
                <button key={v} role="tab" aria-selected={vistaTotal === v} onClick={() => setVistaTotal(v)}
                        className="px-3 py-1 rounded-[8px] text-xs font-bold transition-colors duration-150"
                        style={{
                          background: vistaTotal === v ? 'rgba(201,162,74,0.20)' : 'transparent',
                          color: vistaTotal === v ? '#e2c98a' : 'rgba(247,242,232,0.55)',
                        }}>
                  {l}
                </button>
              ))}
            </div>
          </div>
          <p className="text-white/55 text-[12px] font-semibold mt-4">Total combinado</p>
          <p className="text-amber-200 text-[32px] font-extrabold leading-none mt-1" style={{ letterSpacing: '-0.03em' }}>
            ${combinado.toFixed(2)}
          </p>
          {pctPrevio !== null ? (
            <p className="text-xs font-bold mt-2" style={{ color: pctPrevio >= 0 ? '#9fd3ae' : '#fca5a5' }}>
              {pctPrevio >= 0 ? '↑' : '↓'} {Math.abs(pctPrevio).toFixed(1)}% vs {etiquetaPrevia}
              <span className="text-white/45 font-medium"> (${totalPrevio.toFixed(2)})</span>
            </p>
          ) : (
            <p className="text-white/45 text-xs mt-2">Sin cobros en {etiquetaPrevia} para comparar</p>
          )}
          <p className="text-white/45 text-[11px] mt-1">USD + Bs a la tasa EUR del día de cada cobro</p>
          <dl className="mt-4 text-sm">
            {[
              ['Cobrado en USD', `$${usdDirecto.toFixed(2)}`, 'text-emerald-300'],
              ['Cobrado en Bs.', `Bs. ${bsTotal.toFixed(2)}`, 'text-sky-300'],
            ].map(([label, valor, color]) => (
              <div key={label} className="flex items-center justify-between py-2.5" style={{ borderTop: '1px solid var(--line)' }}>
                <dt className="text-white/65">{label}</dt>
                <dd className={`${color} font-bold`}>{valor}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* Esta semana: siempre la de hoy, no sigue al selector de mes */}
        <SemanaIngresos ingresos={ingresos} hoyStr={hoyStr} tasaRespaldo={tasaHoy} />

        {/* Ingresos por día */}
        {ingresosPeriodo.length > 0 && (
          <div className="glass-card space-y-3">
            <button onClick={() => setVerDias(v => !v)} className="w-full flex items-center justify-between">
              <span className="text-white font-semibold text-sm">Por día · {periodoLabel}</span>
              {verDias ? <ChevronUp size={16} className="text-white/40" /> : <ChevronDown size={16} className="text-white/40" />}
            </button>
            <div className="grid grid-cols-2 pt-3" style={{ borderTop: '1px solid var(--line)' }}>
              <div>
                <p className="text-white/55 text-[12px] font-semibold">Promedio por día</p>
                <p className="text-white text-lg font-extrabold mt-0.5">${promedioDia.toFixed(2)}</p>
              </div>
              <div className="pl-4" style={{ borderLeft: '1px solid var(--line)' }}>
                <p className="text-white/55 text-[12px] font-semibold">Mejor día</p>
                <p className="text-amber-200 text-lg font-extrabold mt-0.5">${mejorDia ? mejorDia[1].totalUsd.toFixed(2) : '0.00'}</p>
                {mejorDia && <p className="text-white/45 text-[11px]">{formatFecha(mejorDia[0])}</p>}
              </div>
            </div>
            {verDias && (
              <div className="space-y-2">
                {resumenDias.map(([fecha, { count, totalUsd }]) => (
                  <div key={fecha} className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-white/85 text-sm">{formatFecha(fecha)}</p>
                      <p className="text-white/35 text-xs">{count} {count === 1 ? 'cobro' : 'cobros'}</p>
                    </div>
                    <span className="text-emerald-300 text-sm font-bold flex-shrink-0">${totalUsd.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Resumen por servicio */}
        {ingresosPeriodo.length > 0 && (
          <div className="glass-card space-y-3">
            <button onClick={() => setVerResumen(v => !v)} className="w-full flex items-center justify-between">
              <span className="text-white font-semibold text-sm">Por servicio · {periodoLabel}</span>
              {verResumen ? <ChevronUp size={16} className="text-white/40" /> : <ChevronDown size={16} className="text-white/40" />}
            </button>
            {verResumen && (
              <div className="space-y-2">
                {resumenServicios.map(([servicio, { count, totalUsd }]) => (
                  <div key={servicio} className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-white/85 text-sm truncate">{servicio}</p>
                      <p className="text-white/35 text-xs">{count} {count === 1 ? 'registro' : 'registros'} · avg ${(totalUsd/count).toFixed(2)}</p>
                    </div>
                    <span className="text-emerald-300 text-sm font-bold flex-shrink-0">${totalUsd.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Resumen por método de pago */}
        {ingresosPeriodo.length > 0 && (
          <div className="glass-card space-y-3">
            <button onClick={() => setVerMetodos(v => !v)} className="w-full flex items-center justify-between">
              <span className="text-white font-semibold text-sm">Por método de pago · {periodoLabel}</span>
              {verMetodos ? <ChevronUp size={16} className="text-white/40" /> : <ChevronDown size={16} className="text-white/40" />}
            </button>
            {verMetodos && (
              <div className="space-y-3">
                {resumenMetodos.map(([metodo, { count, totalUsd, esUsd }]) => {
                  const pct = combinado > 0 ? (totalUsd / combinado) * 100 : 0
                  return (
                    <div key={metodo} className="space-y-1">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-2 h-2 rounded-full flex-shrink-0"
                                style={{background: esUsd ? 'rgba(124,192,147,0.9)' : 'rgba(134,174,198,0.9)'}} />
                          <span className="text-white/85 text-sm truncate">{metodo}</span>
                          <span className="text-white/30 text-xs flex-shrink-0">{count}×</span>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <span className="font-bold text-sm" style={{color: esUsd ? '#9fd3ae' : '#a9c7da'}}>
                            ${totalUsd.toFixed(2)}
                          </span>
                          <span className="text-white/30 text-xs ml-1">{pct.toFixed(0)}%</span>
                        </div>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{background:'rgba(255,255,255,0.08)'}}>
                        <div className="h-full rounded-full transition-all"
                             style={{
                               width: `${pct}%`,
                               background: esUsd
                                 ? 'linear-gradient(90deg, rgba(124,192,147,0.7), rgba(124,192,147,0.4))'
                                 : 'linear-gradient(90deg, rgba(134,174,198,0.7), rgba(134,174,198,0.4))'
                             }} />
                      </div>
                    </div>
                  )
                })}
                <div className="flex items-center justify-between pt-1 border-t" style={{borderColor:'rgba(255,255,255,0.08)'}}>
                  <span className="text-white/45 text-xs">{ingresosPeriodo.length} cobros en total</span>
                  <span className="text-amber-300 text-xs font-semibold">${combinado.toFixed(2)} USD</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Filtro moneda */}
        <div className="flex rounded-[12px] p-1" role="tablist" aria-label="Filtrar por moneda"
             style={{ background: 'rgba(255,244,222,0.04)', border: '1px solid var(--line)' }}>
          {['todos', 'USD', 'Bs'].map(m => (
            <button key={m} role="tab" aria-selected={filtroMoneda === m} onClick={() => setFiltroMoneda(m)}
                    className="flex-1 py-2 rounded-[9px] text-sm font-bold transition-colors duration-150"
                    style={{
                      background: filtroMoneda === m ? 'rgba(201,162,74,0.20)' : 'transparent',
                      color: filtroMoneda === m ? '#e2c98a' : 'rgba(247,242,232,0.55)',
                    }}>
              {m === 'todos' ? 'Todos' : m}
            </button>
          ))}
        </div>

        {/* Lista */}
        {filtrados.length === 0 ? (
          <div className="glass-card text-center py-12">
            <DollarSign size={32} className="text-white/20 mx-auto mb-3" />
            <p className="text-white/55 text-sm mb-4">Sin ingresos en {vistaTotal === 'anio' ? anio : `${MESES[mes]} ${anio}`}</p>
            <div className="flex justify-center">
              <button onClick={() => navigate('/ingresos/nuevo')} className="glass-btn-primary" style={{width:'auto', padding:'10px 24px'}}>
                Registrar ingreso
              </button>
            </div>
          </div>
        ) : (
          <section className="glass-card" style={{ paddingTop: 6, paddingBottom: 6 }}>
            <ul>
              {filtrados.map((i, idx) => (
                <li key={i.id} className="flex items-start gap-3 py-3" style={idx ? { borderTop: '1px solid var(--line)' } : undefined}>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold truncate">{i.cliente_nombre}</p>
                    <p className="text-white/60 text-sm truncate">{i.concepto}</p>
                    <p className="text-white/45 text-xs mt-0.5">{formatFecha(i.fecha)}{i.metodo_pago ? ` · ${i.metodo_pago}` : ''}</p>
                    {i.moneda === 'Bs' && (() => { const t = Number(i.tasa_bcv) || tasaHoy; return t ? <p className="text-amber-300/70 text-xs">Tasa EUR {parseFloat(t.toFixed(4))} · ≈€{(Number(i.monto)/t).toFixed(2)}</p> : null })()}
                    {i.notas ? <p className="text-white/45 text-xs truncate">{i.notas}</p> : null}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={`text-base font-bold ${i.moneda === 'USD' ? 'text-emerald-300' : 'text-sky-300'}`}>
                      {i.moneda === 'USD' ? '$' : 'Bs. '}{Number(i.monto).toFixed(2)}
                    </p>
                    {confirmar?.id === i.id ? (
                      <div className="flex gap-1 justify-end items-center mt-1">
                        <span className="text-white/60 text-xs mr-1">¿Eliminar?</span>
                        <button onClick={() => setConfirmar(null)} className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-white/75" style={{background:'rgba(255,244,222,0.08)'}}>
                          No
                        </button>
                        <button
                          disabled={eliminando}
                          onClick={async () => {
                            setEliminando(true)
                            try { await eliminarIngreso(i.id) } catch { toast('No se pudo eliminar el ingreso', 'error') }
                            setEliminando(false)
                            setConfirmar(null)
                          }}
                          className="px-2.5 py-1.5 rounded-lg text-xs text-white font-bold"
                          style={{background:'rgba(239,68,68,0.55)'}}>
                          {eliminando ? '…' : 'Sí'}
                        </button>
                      </div>
                    ) : (
                      <div className="flex justify-end -mr-1.5">
                        <button onClick={() => navigate(`/ingresos/${i.id}/editar`)} aria-label="Editar ingreso"
                                className="w-9 h-9 flex items-center justify-center text-white/50 active:text-white/80">
                          <Edit2 size={15} />
                        </button>
                        <button onClick={() => setConfirmar(i)} aria-label="Eliminar ingreso"
                                className="w-9 h-9 flex items-center justify-center text-red-400/65 active:text-red-400">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
            <p className="text-center text-white/45 text-xs pt-2 pb-1" style={{ borderTop: '1px solid var(--line)' }}>
              {filtrados.length} {filtrados.length === 1 ? 'registro' : 'registros'}
            </p>
          </section>
        )}
      </div>

    </div>
  )
}
