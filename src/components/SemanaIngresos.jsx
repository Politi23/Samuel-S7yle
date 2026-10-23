import { resumenSemana, fechaCorta } from '../lib/semana'

/* Ingresos de esta semana: total, comparación con la semana pasada a esta
   altura y una barra por día de lunes a domingo. */
export default function SemanaIngresos({ ingresos, hoyStr, tasaRespaldo = null, onVer }) {
  const s = resumenSemana(ingresos, hoyStr, tasaRespaldo)
  const ALTO = 48

  return (
    <section className="glass-card" style={{ padding: 18 }} aria-label="Ingresos de esta semana">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-white text-[15px] font-bold">Esta semana</h2>
        {onVer
          ? <button onClick={onVer} className="text-amber-300 text-xs font-semibold">{fechaCorta(s.lunes)} – {fechaCorta(s.domingo)}</button>
          : <span className="text-white/50 text-xs">{fechaCorta(s.lunes)} – {fechaCorta(s.domingo)}</span>}
      </div>

      <div className="flex items-end justify-between gap-3 mt-3">
        <p className="text-white text-[30px] font-extrabold leading-none" style={{ letterSpacing: '-0.03em' }}>
          <span className="text-amber-300 text-[20px] align-top mr-0.5" style={{ lineHeight: '26px' }}>$</span>
          {s.total.toFixed(2)}
        </p>
        {s.pct !== null ? (
          <div className="text-right">
            <p className="text-sm font-bold" style={{ color: s.pct >= 0 ? '#9fd3ae' : '#fca5a5' }}>
              {s.pct >= 0 ? '↑' : '↓'} {Math.abs(s.pct).toFixed(0)}%
            </p>
            <p className="text-white/45 text-[11px]">vs. semana pasada a esta altura</p>
          </div>
        ) : (
          <p className="text-white/45 text-[11px] text-right">{s.cantidad} {s.cantidad === 1 ? 'cobro' : 'cobros'}</p>
        )}
      </div>

      {/* Una barra por día */}
      <div className="grid grid-cols-7 gap-1.5 mt-4" role="list">
        {s.dias.map(d => (
          <div key={d.fecha} role="listitem" className="flex flex-col items-center gap-1.5"
               aria-label={`${d.etiqueta}: ${d.total > 0 ? `$${d.total.toFixed(2)}` : 'sin cobros'}`}>
            <div className="w-full flex items-end justify-center" style={{ height: ALTO }}>
              <div className="w-full rounded-[5px] transition-[height] duration-300"
                   style={{
                     height: s.tope > 0 && d.total > 0 ? `${Math.max(4, (d.total / s.tope) * ALTO)}px` : '3px',
                     background: d.total > 0
                       ? (d.esHoy ? 'linear-gradient(180deg, #e2c98a, #c9a24a)' : 'rgba(201,162,74,0.45)')
                       : 'rgba(247,242,232,0.08)',
                   }} />
            </div>
            <span className="text-[11px] leading-none font-semibold"
                  style={{ color: d.esHoy ? '#e2c98a' : d.esFuturo ? 'rgba(247,242,232,0.30)' : 'rgba(247,242,232,0.60)' }}>
              {d.etiqueta}
            </span>
            <span className="text-[10px] leading-none"
                  style={{ color: d.total > 0 ? 'rgba(247,242,232,0.80)' : 'rgba(247,242,232,0.30)' }}>
              {d.total > 0 ? `$${d.total.toFixed(0)}` : '—'}
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}
