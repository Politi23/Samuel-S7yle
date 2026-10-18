import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { useBcv } from '../hooks/useBcv'
import { Plus, ArrowDownCircle, ChevronLeft, ChevronRight, Edit2, Trash2, FileText, Home, Scissors } from 'lucide-react'
import { useToast } from '../context/ToastContext'
import PageHeader from '../components/PageHeader'
import { esEgresoPersonal } from './NuevoEgreso'
import { hoyVE } from '../lib/fecha'

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

function formatFecha(isoStr) {
  if (!isoStr) return ''
  const [y, m, d] = isoStr.split('-')
  return `${d}/${m}/${y}`
}

function exportarPDF(filtrados, tab, mes, anio, totalUSD, totalBs) {
  const filas = filtrados.map(e => `
    <tr>
      <td>${e.fecha ? e.fecha.split('-').reverse().join('/') : ''}</td>
      <td>${e.categoria}${e.descripcion ? ' — ' + e.descripcion : ''}</td>
      <td style="text-align:right;font-weight:600;color:#dc2626">${e.moneda === 'USD' ? '$' : 'Bs.'}${Number(e.monto).toFixed(2)}</td>
    </tr>`).join('')

  const tabLabel = tab === 'barberia' ? 'Barbería' : tab === 'personal' ? 'Personal' : 'Todos'
  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
  <title>Egresos ${MESES[mes]} ${anio}</title>
  <style>
    body{font-family:Arial,sans-serif;font-size:12px;color:#111;margin:24px}
    h1{font-size:18px;margin-bottom:2px}p.sub{color:#6b7280;margin:0 0 16px}
    table{width:100%;border-collapse:collapse}
    th{background:#dc2626;color:white;padding:7px 10px;text-align:left;font-size:11px}
    td{padding:6px 10px;border-bottom:1px solid #e5e7eb}
    tr:nth-child(even){background:#fff5f5}
    .totales{margin-top:16px;display:flex;gap:24px}
    .tot{background:#f3f4f6;border-radius:8px;padding:10px 16px}
    .tot b{display:block;font-size:16px;margin-top:2px;color:#dc2626}
    @media print{body{margin:0}}
  </style></head><body>
  <h1>Egresos ${tabLabel} — ${MESES[mes]} ${anio}</h1>
  <p class="sub">BarberShop Samuel S7tyle · Generado el ${new Date().toLocaleDateString('es-VE')}</p>
  <table>
    <thead><tr><th>Fecha</th><th>Descripción</th><th style="text-align:right">Monto</th></tr></thead>
    <tbody>${filas}</tbody>
  </table>
  <div class="totales">
    <div class="tot"><span style="font-size:11px;color:#6b7280">Total USD</span><b>$${totalUSD.toFixed(2)}</b></div>
    <div class="tot"><span style="font-size:11px;color:#6b7280">Total Bs.</span><b>${totalBs.toFixed(2)}</b></div>
  </div>
  <script>window.onload=()=>window.print()</script></body></html>`

  const w = window.open('', '_blank')
  w.document.write(html)
  w.document.close()
}

export default function Egresos() {
  const { egresos, ingresos, eliminarEgreso } = useApp()
  const { data: bcv } = useBcv()
  const navigate = useNavigate()
  const toast = useToast()
  const hoyStr = hoyVE()
  const [mes, setMes] = useState(() => parseInt(hoyStr.split('-')[1]) - 1)
  const [anio, setAnio] = useState(() => parseInt(hoyStr.split('-')[0]))
  const [confirmar, setConfirmar] = useState(null)
  const [eliminando, setEliminando] = useState(false)
  const [tab, setTab] = useState('todo')

  const tasaHoy = bcv?.eur ?? null

  const irAnterior = () => { if (mes === 0) { setMes(11); setAnio(a => a-1) } else setMes(m => m-1) }
  const irSiguiente = () => { if (mes === 11) { setMes(0); setAnio(a => a+1) } else setMes(m => m+1) }

  const mesStr = `${anio}-${String(mes + 1).padStart(2, '0')}`
  const porMes = (x) => x.fecha && x.fecha.slice(0, 7) === mesStr

  const egresosMes = egresos.filter(porMes).sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
  const filtrados = tab === 'todo' ? egresosMes
    : tab === 'personal' ? egresosMes.filter(esEgresoPersonal)
    : egresosMes.filter(e => !esEgresoPersonal(e))

  const totalUSD = filtrados.filter(e => e.moneda === 'USD').reduce((a, e) => a + Number(e.monto), 0)
  const totalBs  = filtrados.filter(e => e.moneda === 'Bs').reduce((a, e) => a + Number(e.monto), 0)

  const ingresosMes = ingresos.filter(porMes)
  const totalIngresosMesUsd = ingresosMes.reduce((a, i) => {
    if (i.moneda === 'USD') return a + Number(i.monto)
    const t = Number(i.tasa_bcv)
    return t ? a + Number(i.monto) / t : a
  }, 0)
  const totalEgresosMesUsd = egresosMes.reduce((a, e) => {
    if (e.moneda === 'USD') return a + Number(e.monto)
    return tasaHoy ? a + Number(e.monto) / tasaHoy : a
  }, 0)
  const balance = totalIngresosMesUsd - totalEgresosMesUsd
  const balancePositivo = balance >= 0

  return (
    <div className="min-h-screen">
      <PageHeader
        title="Egresos"
        action={
          <div className="flex gap-2">
            <button onClick={() => exportarPDF(filtrados, tab, mes, anio, totalUSD, totalBs)}
                    className="glass-btn-icon w-10 h-10 flex items-center justify-center" title="Exportar PDF">
              <FileText size={17} className="text-white/70" />
            </button>
            <button onClick={() => navigate(`/egresos/nuevo${tab !== 'todo' ? `?tipo=${tab}` : ''}`)} className="glass-btn-icon w-10 h-10 flex items-center justify-center">
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

        {/* Balance del mes */}
        {ingresosMes.length > 0 || egresosMes.length > 0 ? (
          <section className="glass-card space-y-3" style={{ padding: 18 }}>
            <h2 className="text-white text-[15px] font-bold">Balance de {MESES[mes].toLowerCase()}</h2>
            <div className="grid grid-cols-3 text-center">
              {[
                ['Ingresos', `$${totalIngresosMesUsd.toFixed(0)}`, 'text-emerald-300'],
                ['Egresos', `$${totalEgresosMesUsd.toFixed(0)}`, 'text-red-300'],
                ['Disponible', `${balancePositivo ? '+' : '−'}$${Math.abs(balance).toFixed(0)}`, balancePositivo ? 'text-emerald-300' : 'text-red-300'],
              ].map(([label, valor, color], idx) => (
                <div key={label} style={idx ? { borderLeft: '1px solid var(--line)' } : undefined}>
                  <p className="text-white/55 text-[12px] font-semibold">{label}</p>
                  <p className={`${color} text-lg font-extrabold mt-0.5`}>{valor}</p>
                </div>
              ))}
            </div>
            <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,244,222,0.08)' }}
                 role="img" aria-label="Porción de los ingresos gastada">
              <div className="h-full rounded-full transition-all duration-300"
                   style={{
                     width: `${Math.min(100, totalIngresosMesUsd > 0 ? (totalEgresosMesUsd / totalIngresosMesUsd) * 100 : 100)}%`,
                     background: balancePositivo ? 'rgba(201,162,74,0.80)' : '#ef4444',
                   }} />
            </div>
            <p className="text-white/50 text-xs text-center">
              {totalIngresosMesUsd > 0 ? `Gastaste el ${Math.round((totalEgresosMesUsd / totalIngresosMesUsd) * 100)}% de lo que entró` : 'Sin ingresos este mes'}
            </p>
          </section>
        ) : null}

        {/* Tabs */}
        <div className="flex rounded-[12px] p-1" role="tablist" aria-label="Tipo de egreso"
             style={{ background: 'rgba(255,244,222,0.04)', border: '1px solid var(--line)' }}>
          {[['todo', 'Todo'], ['barberia', 'Barbería'], ['personal', 'Personal']].map(([v, l]) => (
            <button key={v} role="tab" aria-selected={tab === v} onClick={() => setTab(v)}
                    className="flex-1 py-2 rounded-[9px] text-sm font-bold transition-colors duration-150"
                    style={{
                      background: tab === v ? 'rgba(201,162,74,0.20)' : 'transparent',
                      color: tab === v ? '#e2c98a' : 'rgba(247,242,232,0.55)',
                    }}>
              {l}
            </button>
          ))}
        </div>

        {/* Lista */}
        {filtrados.length === 0 ? (
          <div className="glass-card text-center py-12">
            <ArrowDownCircle size={32} className="text-white/25 mx-auto mb-3" />
            <p className="text-white/55 text-sm mb-4">
              {tab === 'todo' ? `Sin egresos en ${MESES[mes]} ${anio}` : `Sin egresos ${tab === 'personal' ? 'personales' : 'de barbería'}`}
            </p>
            <div className="flex justify-center">
              <button onClick={() => navigate(`/egresos/nuevo${tab !== 'todo' ? `?tipo=${tab}` : ''}`)} className="glass-btn-primary" style={{width:'auto', padding:'10px 24px'}}>
                Registrar egreso
              </button>
            </div>
          </div>
        ) : (
          <section className="glass-card" style={{ paddingTop: 6, paddingBottom: 6 }}>
            <div className="grid grid-cols-2 py-3" style={{ borderBottom: '1px solid var(--line)' }}>
              <div>
                <p className="text-white/55 text-[12px] font-semibold">Gastado en USD</p>
                <p className="text-red-300 text-xl font-extrabold mt-0.5">${totalUSD.toFixed(2)}</p>
              </div>
              <div className="pl-4" style={{ borderLeft: '1px solid var(--line)' }}>
                <p className="text-white/55 text-[12px] font-semibold">Gastado en Bs.</p>
                <p className="text-red-300 text-xl font-extrabold mt-0.5">{totalBs.toFixed(2)}</p>
              </div>
            </div>
            <ul>
              {filtrados.map((e, idx) => {
                const personal = esEgresoPersonal(e)
                return (
                  <li key={e.id} className="flex items-start gap-3 py-3" style={idx ? { borderTop: '1px solid var(--line)' } : undefined}>
                    <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                         title={personal ? 'Personal' : 'Barbería'}
                         style={{ background: 'rgba(201,162,74,0.10)', border: '1px solid rgba(201,162,74,0.24)' }}>
                      {personal
                        ? <Home size={15} className="text-amber-300" aria-label="Personal" />
                        : <Scissors size={15} className="text-amber-300" aria-label="Barbería" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-semibold truncate">{e.categoria}</p>
                      {!personal && e.descripcion && <p className="text-white/60 text-sm truncate">{e.descripcion}</p>}
                      <p className="text-white/45 text-xs mt-0.5">{formatFecha(e.fecha)}</p>
                      {e.notas && <p className="text-white/45 text-xs truncate">{e.notas}</p>}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-base font-bold text-red-300">
                        {e.moneda === 'USD' ? '$' : 'Bs. '}{Number(e.monto).toFixed(2)}
                      </p>
                      {confirmar?.id === e.id ? (
                        <div className="flex gap-1 justify-end items-center mt-1">
                          <span className="text-white/60 text-xs mr-1">¿Eliminar?</span>
                          <button onClick={() => setConfirmar(null)} className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-white/75" style={{background:'rgba(255,244,222,0.08)'}}>
                            No
                          </button>
                          <button
                            disabled={eliminando}
                            onClick={async () => {
                              setEliminando(true)
                              try { await eliminarEgreso(e.id) } catch { toast('No se pudo eliminar el egreso', 'error') }
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
                          <button onClick={() => navigate(`/egresos/${e.id}/editar`)} aria-label="Editar egreso"
                                  className="w-9 h-9 flex items-center justify-center text-white/50 active:text-white/80">
                            <Edit2 size={15} />
                          </button>
                          <button onClick={() => setConfirmar(e)} aria-label="Eliminar egreso"
                                  className="w-9 h-9 flex items-center justify-center text-red-400/65 active:text-red-400">
                            <Trash2 size={15} />
                          </button>
                        </div>
                      )}
                    </div>
                  </li>
                )
              })}
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
