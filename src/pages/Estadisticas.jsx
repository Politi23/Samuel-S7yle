import { useApp } from '../context/AppContext'
import { useBcv } from '../hooks/useBcv'
import { TrendingUp, Users, CalendarDays, DollarSign, Award, Star } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import { hoyVE } from '../lib/fecha'

const MESES  = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
const DIAS   = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']

export default function Estadisticas() {
  const { clientes, ingresos, citas } = useApp()
  const navigate = useNavigate()
  const { data: bcv } = useBcv()
  const tasaHoy = bcv?.eur ?? null

  const hoyStr = hoyVE()
  const [anioActualNum, mesActualNum] = hoyStr.split('-').map(Number)

  // ── Últimos 6 meses ──
  const ultimos6 = Array.from({ length: 6 }, (_, i) => {
    const mOffset = mesActualNum - 1 - (5 - i)
    const mesReal = ((mOffset % 12) + 12) % 12
    const anio = anioActualNum + Math.floor(mOffset / 12)
    const mesStr = `${anio}-${String(mesReal + 1).padStart(2, '0')}`
    return { mes: mesReal, anio, label: MESES[mesReal], mesStr }
  })

  const datosMes = ultimos6.map(({ label, mesStr }) => {
    const del = ingresos.filter(i => i.fecha && i.fecha.slice(0, 7) === mesStr)
    const total = del.reduce((a, i) => {
      if (i.moneda === 'USD') return a + Number(i.monto)
      const t = Number(i.tasa_bcv)
      return t ? a + Number(i.monto) / t : a
    }, 0)
    const citasDelMes = citas.filter(c => c.fecha && c.fecha.slice(0, 7) === mesStr).length
    return { label, total, citas: citasDelMes }
  })

  const maxIngreso = Math.max(...datosMes.map(m => m.total), 1)
  const maxCitas   = Math.max(...datosMes.map(m => m.citas), 1)

  // ── Clientes más frecuentes ──
  const clienteMap = {}
  ingresos.forEach(i => {
    if (!i.cliente_id) return
    if (!clienteMap[i.cliente_id]) clienteMap[i.cliente_id] = { nombre: i.cliente_nombre || '', visitas: 0, total: 0 }
    clienteMap[i.cliente_id].visitas++
    const t = Number(i.tasa_bcv)
    clienteMap[i.cliente_id].total += i.moneda === 'USD' ? Number(i.monto) : (t ? Number(i.monto) / t : 0)
  })
  const topClientes = Object.entries(clienteMap).sort((a, b) => b[1].visitas - a[1].visitas).slice(0, 5)
  const maxVisitas = topClientes[0]?.[1].visitas || 1

  // ── Servicios top ──
  const servMap = {}
  ingresos.forEach(i => {
    const partes = (i.concepto || 'Sin especificar').split(' + ')
    partes.forEach(s => {
      if (!servMap[s]) servMap[s] = { count: 0, total: 0 }
      servMap[s].count++
      const t = Number(i.tasa_bcv)
      servMap[s].total += i.moneda === 'USD' ? Number(i.monto) : (t ? Number(i.monto) / t : 0)
    })
  })
  const topServ = Object.entries(servMap).sort((a, b) => b[1].count - a[1].count).slice(0, 6)
  const maxServ = topServ[0]?.[1].count || 1

  // ── Días de semana ──
  const citasPorDia = Array(7).fill(0)
  citas.forEach(c => { const d = new Date(c.fecha + 'T12:00'); citasPorDia[d.getDay()]++ })
  const maxDia = Math.max(...citasPorDia, 1)

  // ── Horas pico ──
  const horasMap = {}
  citas.filter(c => c.hora).forEach(c => {
    const h = parseInt(c.hora.split(':')[0])
    horasMap[h] = (horasMap[h] || 0) + 1
  })
  const topHoras = Object.entries(horasMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([h, n]) => ({ h: `${parseInt(h) % 12 || 12}:00 ${parseInt(h) >= 12 ? 'PM' : 'AM'}`, n }))
  const maxHora = topHoras[0]?.n || 1

  // ── KPIs ──
  const mesActualStr = hoyStr.slice(0, 7)
  const ingresosMes = ingresos.filter(i => i.fecha && i.fecha.slice(0, 7) === mesActualStr)
  const citasMes    = citas.filter(c => c.fecha && c.fecha.slice(0, 7) === mesActualStr)
  const citasAtend  = citasMes.filter(c => c.estado === 'atendida').length
  const totalMesUsd = ingresosMes.reduce((a, i) => {
    if (i.moneda === 'USD') return a + Number(i.monto)
    const t = Number(i.tasa_bcv)
    return t ? a + Number(i.monto) / t : a
  }, 0)
  const promPorCita = citasAtend > 0 ? totalMesUsd / citasAtend : 0
  const citasFuturas = citas.filter(c => c.fecha > hoyStr).length

  return (
    <div className="min-h-screen">
      <PageHeader title="Estadísticas" />

      <div className="px-4 pt-4 pb-6 space-y-4">

        {/* KPIs del mes */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: Users,        val: clientes.length,              label: 'Total clientes',    color: 'rgba(217,119,6,0.20)',   border: 'rgba(217,119,6,0.35)',  textColor: '#fcd34d' },
            { icon: CalendarDays, val: citasFuturas,                  label: 'Citas futuras',     color: 'rgba(125,211,252,0.15)', border: 'rgba(125,211,252,0.30)', textColor: '#7dd3fc' },
            { icon: DollarSign,   val: `$${totalMesUsd.toFixed(0)}`,  label: 'Ingresos este mes', color: 'rgba(52,211,153,0.15)',  border: 'rgba(52,211,153,0.30)', textColor: '#6ee7b7' },
            { icon: Award,        val: `$${promPorCita.toFixed(0)}`,  label: 'Promedio por cita', color: 'rgba(251,191,36,0.15)',  border: 'rgba(251,191,36,0.30)', textColor: '#fde68a' },
          ].map(({ icon: Icon, val, label, color, border, textColor }) => (
            <div key={label} className="glass-card flex flex-col items-center gap-1 py-4 text-center"
                 style={{background: color, border: `1px solid ${border}`}}>
              <Icon size={17} style={{color: textColor, opacity: 0.7}} />
              <p className="text-xl font-bold" style={{color: textColor}}>{val}</p>
              <p className="text-xs font-semibold" style={{color: textColor, opacity: 0.6}}>{label}</p>
            </div>
          ))}
        </div>

        {/* Clientes más frecuentes */}
        {topClientes.length > 0 && (
          <div className="glass-card space-y-3">
            <div className="flex items-center gap-2">
              <Star size={14} className="text-amber-300" />
              <span className="text-white font-semibold text-sm">Clientes más frecuentes</span>
            </div>
            <div className="space-y-2.5">
              {topClientes.map(([clienteId, { nombre, visitas, total }], i) => (
                <button key={clienteId} onClick={() => navigate(`/clientes/${clienteId}`)}
                        className="w-full space-y-1 text-left active:opacity-70">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-white/25 text-xs w-4 text-right flex-shrink-0">#{i+1}</span>
                      <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                           style={{background: i === 0 ? 'rgba(217,119,6,0.30)' : 'rgba(255,255,255,0.10)'}}>
                        <span className="text-xs font-bold" style={{color: i === 0 ? '#fcd34d' : 'rgba(255,255,255,0.60)'}}>
                          {(nombre.split(' ')[0]||' ')[0].toUpperCase()}{(nombre.split(' ')[1]||' ')[0].toUpperCase()}
                        </span>
                      </div>
                      <span className="text-white/85 text-sm truncate">{nombre}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-white/40 text-xs">{visitas} visitas</span>
                      <span className="text-emerald-300 text-xs font-semibold">${total.toFixed(0)}</span>
                    </div>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden ml-6" style={{background:'rgba(255,255,255,0.08)'}}>
                    <div className="h-full rounded-full"
                         style={{
                           width:`${(visitas/maxVisitas)*100}%`,
                           background: i === 0
                             ? 'linear-gradient(90deg, rgba(217,119,6,0.9), rgba(217,119,6,0.4))'
                             : 'linear-gradient(90deg, rgba(255,255,255,0.30), rgba(255,255,255,0.12))'
                         }} />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Ingresos últimos 6 meses */}
        <div className="glass-card space-y-3">
          <div className="flex items-center gap-2">
            <TrendingUp size={14} className="text-amber-300" />
            <span className="text-white font-semibold text-sm">Ingresos · últimos 6 meses</span>
          </div>
          <div className="flex items-end justify-between gap-1.5" style={{height:'100px'}}>
            {datosMes.map(({ label, total }, i) => {
              const pct = total > 0 ? (total / maxIngreso) * 100 : 0
              const esMesActual = i === 5
              return (
                <div key={label} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-white/40 text-[9px] font-semibold">
                    {total > 0 ? `$${total >= 1000 ? `${(total/1000).toFixed(1)}k` : total.toFixed(0)}` : ''}
                  </span>
                  <div className="w-full rounded-t-lg transition-all"
                       style={{
                         height: `${Math.max(pct, total > 0 ? 4 : 0)}%`,
                         minHeight: total > 0 ? '4px' : '0',
                         background: esMesActual
                           ? 'linear-gradient(180deg, rgba(217,119,6,0.9), rgba(180,83,9,0.6))'
                           : 'linear-gradient(180deg, rgba(255,255,255,0.25), rgba(255,255,255,0.10))',
                       }} />
                  <span className="text-[9px] font-semibold" style={{color: esMesActual ? '#fcd34d' : 'rgba(255,255,255,0.35)'}}>{label}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Citas por mes */}
        <div className="glass-card space-y-3">
          <div className="flex items-center gap-2">
            <CalendarDays size={14} className="text-sky-300" />
            <span className="text-white font-semibold text-sm">Citas · últimos 6 meses</span>
          </div>
          <div className="flex items-end justify-between gap-1.5" style={{height:'80px'}}>
            {datosMes.map(({ label, citas: n }, i) => {
              const pct = n > 0 ? (n / maxCitas) * 100 : 0
              const esMesActual = i === 5
              return (
                <div key={label} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-white/40 text-[9px] font-semibold">{n > 0 ? n : ''}</span>
                  <div className="w-full rounded-t-lg"
                       style={{
                         height: `${Math.max(pct, n > 0 ? 5 : 0)}%`,
                         minHeight: n > 0 ? '4px' : '0',
                         background: esMesActual
                           ? 'linear-gradient(180deg, rgba(125,211,252,0.9), rgba(56,189,248,0.5))'
                           : 'linear-gradient(180deg, rgba(255,255,255,0.22), rgba(255,255,255,0.08))',
                       }} />
                  <span className="text-[9px] font-semibold" style={{color: esMesActual ? '#7dd3fc' : 'rgba(255,255,255,0.35)'}}>{label}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Servicios más frecuentes */}
        {topServ.length > 0 && (
          <div className="glass-card space-y-3">
            <div className="flex items-center gap-2">
              <Award size={14} className="text-amber-300" />
              <span className="text-white font-semibold text-sm">Servicios más frecuentes</span>
            </div>
            <div className="space-y-2.5">
              {topServ.map(([nombre, { count, total }], i) => (
                <div key={nombre} className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-white/25 text-xs w-4 text-right flex-shrink-0">#{i+1}</span>
                      <span className="text-white/85 text-sm truncate">{nombre}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-white/40 text-xs">{count}×</span>
                      <span className="text-emerald-300 text-xs font-semibold">${total.toFixed(0)}</span>
                    </div>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{background:'rgba(255,255,255,0.08)'}}>
                    <div className="h-full rounded-full"
                         style={{
                           width:`${(count/maxServ)*100}%`,
                           background: i === 0
                             ? 'linear-gradient(90deg, rgba(217,119,6,0.8), rgba(217,119,6,0.4))'
                             : 'linear-gradient(90deg, rgba(255,255,255,0.30), rgba(255,255,255,0.12))'
                         }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Días de semana */}
        <div className="glass-card space-y-3">
          <span className="text-white font-semibold text-sm">Días con más citas</span>
          <div className="space-y-2">
            {DIAS.map((dia, i) => {
              const n = citasPorDia[i]
              const pct = (n / maxDia) * 100
              return (
                <div key={dia} className="flex items-center gap-3">
                  <span className="text-white/45 text-xs w-7 flex-shrink-0">{dia}</span>
                  <div className="flex-1 h-2 rounded-full overflow-hidden" style={{background:'rgba(255,255,255,0.08)'}}>
                    <div className="h-full rounded-full transition-all"
                         style={{
                           width: `${pct}%`,
                           background: pct === 100
                             ? 'linear-gradient(90deg, rgba(217,119,6,0.9), rgba(180,83,9,0.5))'
                             : 'linear-gradient(90deg, rgba(255,255,255,0.30), rgba(255,255,255,0.12))'
                         }} />
                  </div>
                  <span className="text-white/35 text-xs w-5 text-right flex-shrink-0">{n}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Horas pico */}
        {topHoras.length > 0 && (
          <div className="glass-card space-y-3">
            <span className="text-white font-semibold text-sm">Horas pico</span>
            <div className="space-y-2">
              {topHoras.map(({ h, n }) => (
                <div key={h} className="flex items-center gap-3">
                  <span className="text-white/45 text-xs w-16 flex-shrink-0">{h}</span>
                  <div className="flex-1 h-2 rounded-full overflow-hidden" style={{background:'rgba(255,255,255,0.08)'}}>
                    <div className="h-full rounded-full"
                         style={{
                           width:`${(n/maxHora)*100}%`,
                           background:'linear-gradient(90deg, rgba(125,211,252,0.8), rgba(56,189,248,0.4))'
                         }} />
                  </div>
                  <span className="text-white/35 text-xs w-5 text-right flex-shrink-0">{n}</span>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
