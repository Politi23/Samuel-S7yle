import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import Logo from '../components/Logo'
import { cuentaDelLink } from '../lib/cuenta'
import { DIAS, DIAS_CORTOS, MESES, hoy, sumarDias, ordenSemana, proximosDias, vistaDia, etiquetaDia, fechaLarga, estaOcupado, yaPaso, fmtHora as fmt } from '../lib/horario'
import { Clock, CheckCircle2, XCircle, AlertCircle, WifiOff, ChevronDown, ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react'

function tiempoDesde(ts) {
  if (!ts) return null
  const min = Math.floor((Date.now() - new Date(ts).getTime()) / 60000)
  if (min < 1) return 'ahora mismo'
  if (min < 60) return `hace ${min} min`
  return `hace ${Math.floor(min / 60)}h`
}

const MESES_ADELANTE = 6 // hasta cuántos meses se pueden ver
const claveMes = ({ anio, mes }) => `${anio}-${String(mes + 1).padStart(2, '0')}`
/* Cupos que el cliente todavía puede reservar ese día */
const libresParaCliente = (d) => d && d.abierto ? d.slots.filter(s => !yaPaso(d, s) && !estaOcupado(d, s)).length : 0

function waLink(dia, slot) {
  const [, mm, dd] = dia.fecha.split('-')
  const cuando = dia.relativo === 0 ? 'hoy' : dia.relativo === 1 ? 'mañana' : `el ${DIAS[ordenSemana(dia.fecha)].toLowerCase()}`
  const msg = `Hola Samuel! Quiero confirmar mi cupo ${cuando} ${dd}/${mm} de ${fmt(slot.inicio)} a ${fmt(slot.fin)} 🙏`
  return `https://wa.me/584121381501?text=${encodeURIComponent(msg)}`
}

const WaIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
)

/* ── Calendario del mes para los clientes ── */
function CalendarioMes({ filas, mesVista, onMes, puedeAtras, puedeAdelante, fechaSel, onElegir }) {
  const hoyStr = hoy()
  const primero = `${claveMes(mesVista)}-01`
  const huecos = ordenSemana(primero)
  const diasDelMes = new Date(Date.UTC(mesVista.anio, mesVista.mes + 1, 0)).getUTCDate()
  return (
    <section className="glass-card" style={{ padding: 14 }} aria-label="Calendario de cupos">
      <div className="flex items-center justify-between">
        <button onClick={() => onMes(-1)} disabled={!puedeAtras} aria-label="Mes anterior"
                className="w-10 h-10 flex items-center justify-center rounded-xl active:bg-white/10 disabled:opacity-25">
          <ChevronLeft size={20} className="text-white/75" />
        </button>
        <h2 className="text-white text-[15px] font-bold">{MESES[mesVista.mes]} {mesVista.anio}</h2>
        <button onClick={() => onMes(1)} disabled={!puedeAdelante} aria-label="Mes siguiente"
                className="w-10 h-10 flex items-center justify-center rounded-xl active:bg-white/10 disabled:opacity-25">
          <ChevronRight size={20} className="text-white/75" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 mt-2">
        {DIAS_CORTOS.map(d => <span key={d} className="text-center text-[11px] font-bold text-white/45 pb-1">{d}</span>)}
        {Array.from({ length: huecos }, (_, i) => <span key={`h${i}`} />)}
        {Array.from({ length: diasDelMes }, (_, i) => {
          const fecha = `${claveMes(mesVista)}-${String(i + 1).padStart(2, '0')}`
          const pasado = fecha < hoyStr
          const vista = pasado ? null : vistaDia(filas, fecha)
          const libres = libresParaCliente(vista)
          const sel = fecha === fechaSel
          const esHoy = fecha === hoyStr
          const disponible = !pasado && libres > 0
          return (
            <button key={fecha} onClick={() => !pasado && onElegir(fecha)} disabled={pasado}
                    aria-pressed={sel}
                    aria-label={`${fechaLarga(fecha)}${pasado ? '' : libres ? `, ${libres} cupos libres` : ', sin cupos'}`}
                    className="flex flex-col items-center justify-center rounded-[10px] min-h-[46px] transition-colors duration-150"
                    style={{
                      background: sel ? 'rgba(201,162,74,0.20)' : disponible ? 'rgba(124,192,147,0.10)' : 'transparent',
                      border: `1px solid ${sel ? 'rgba(201,162,74,0.60)' : esHoy ? 'rgba(201,162,74,0.35)' : 'transparent'}`,
                      opacity: pasado ? 0.25 : disponible || sel ? 1 : 0.5,
                    }}>
              <span className="text-[14px] font-bold leading-none" style={{ color: sel || esHoy ? '#e2c98a' : '#f7f2e8' }}>{i + 1}</span>
              <span className="text-[10px] font-bold leading-none mt-1 h-[10px]" style={{ color: '#9fd3ae' }}>
                {disponible ? libres : ''}
              </span>
            </button>
          )
        })}
      </div>
      <p className="text-white/45 text-[11px] mt-2 px-1">Los días en verde tienen cupos libres. Toca uno para ver sus horarios.</p>
    </section>
  )
}

/* Un día con su estado y sus cupos */
function DiaFila({ dia, ultimo, plegable = false, abierto = true, onToggle }) {
  const esHoy  = dia.relativo === 0
  // Los cupos de hoy que ya empezaron no se muestran
  const slots  = dia.slots.filter(s => !yaPaso(dia, s))
  const libres = slots.filter(s => !estaOcupado(dia, s))
  const [, mm, dd] = dia.fecha.split('-')

  /* badge — el día cerrado manda; luego lo que queda libre */
  let badge
  if (!dia.abierto) {
    badge = { color: 'rgba(255,255,255,0.25)', bg: 'transparent', border: 'rgba(255,255,255,0.10)', Icon: XCircle, label: 'Cerrado' }
  } else if (esHoy && slots.length === 0 && dia.slots.length > 0) {
    badge = { color: 'rgba(255,255,255,0.55)', bg: 'rgba(255,255,255,0.05)', border: 'rgba(255,255,255,0.12)', Icon: Clock, label: 'Terminó por hoy' }
  } else if (libres.length === 0) {
    badge = { color: '#f87171', bg: 'rgba(248,113,113,0.12)', border: 'rgba(248,113,113,0.20)', Icon: XCircle,      label: slots.length ? 'Lleno' : 'Sin cupos' }
  } else if (libres.length <= 2) {
    badge = { color: '#d6b468', bg: 'rgba(226,201,138,0.12)',  border: 'rgba(226,201,138,0.20)',  Icon: AlertCircle,  label: `${libres.length} libre${libres.length !== 1 ? 's' : ''}` }
  } else {
    badge = { color: '#7cc093', bg: 'rgba(124,192,147,0.12)',  border: 'rgba(124,192,147,0.20)',  Icon: CheckCircle2, label: `${libres.length} libres` }
  }

  const Cabecera = plegable ? 'button' : 'div'
  return (
    <div style={{
      padding: esHoy ? '15px 18px 16px' : '12px 18px',
      borderBottom: ultimo ? 'none' : '1px solid rgba(255,255,255,0.06)',
      background: esHoy ? 'rgba(201,162,74,0.09)' : 'transparent',
      opacity: !dia.abierto ? 0.55 : 1,
    }}>
      {/* Nombre + badge */}
      <Cabecera {...(plegable ? { type: 'button', onClick: onToggle, 'aria-expanded': abierto } : {})}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%',
                         background: 'none', border: 'none', padding: 0, cursor: plegable ? 'pointer' : 'default', minHeight: plegable ? 36 : undefined }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          {esHoy && (
            <span style={{
              width: 6, height: 6, borderRadius: '50%',
              background: '#d6b468',
              boxShadow: '0 0 6px rgba(226,201,138,0.8)',
              flexShrink: 0, display: 'inline-block',
            }} />
          )}
          <span style={{
            color: esHoy ? '#ecdcae' : dia.abierto ? '#fff' : 'rgba(255,255,255,0.50)',
            fontSize: esHoy ? 15 : 14,
            fontWeight: esHoy ? 700 : 500,
          }}>
            {etiquetaDia(dia)}
          </span>
          <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12, fontWeight: 500 }}>
            {dia.relativo <= 1 ? `${DIAS[ordenSemana(dia.fecha)].toLowerCase()} ${dd}/${mm}` : `${dd}/${mm}`}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '5px 10px', borderRadius: 20, flexShrink: 0,
            background: badge.bg,
            border: `1px solid ${badge.border}`,
          }}>
            <badge.Icon size={11} color={badge.color} strokeWidth={2.5} />
            <span style={{ color: badge.color, fontSize: 12, fontWeight: 600, lineHeight: 1 }}>
              {badge.label}
            </span>
          </div>
          {plegable && (
            <ChevronDown size={16} color="rgba(255,255,255,0.45)"
                         style={{ transform: abierto ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
          )}
        </div>
      </Cabecera>

      {/* Cupos bookables */}
      {dia.abierto && slots.length > 0 && abierto && (
        <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {slots.map(slot => estaOcupado(dia, slot) ? (
            <div key={slot.id} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 12px', borderRadius: 10,
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}>
              <span style={{
                color: 'rgba(255,255,255,0.22)', fontSize: 13, fontWeight: 600,
                textDecoration: 'line-through',
              }}>
                {fmt(slot.inicio)} — {fmt(slot.fin)}
              </span>
              <span style={{ color: 'rgba(255,255,255,0.20)', fontSize: 11, fontWeight: 600 }}>
                Ocupado
              </span>
            </div>
          ) : (
            <a
              key={slot.id}
              href={waLink(dia, slot)}
              target="_blank"
              rel="noopener noreferrer"
              className="slot-wa"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 14px', borderRadius: 10, textDecoration: 'none',
                background: 'rgba(37,211,102,0.09)',
                border: '1px solid rgba(37,211,102,0.28)',
                transition: 'opacity 0.15s, transform 0.15s',
              }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <WaIcon />
                <span style={{ color: '#fff', fontSize: 14, fontWeight: 700 }}>
                  {fmt(slot.inicio)} — {fmt(slot.fin)}
                </span>
              </div>
              <span style={{ color: 'rgba(124,192,147,0.75)', fontSize: 12, fontWeight: 700 }}>
                Reservar →
              </span>
            </a>
          ))}
        </div>
      )}
    </div>
  )
}

/* Horario de la cuenta del link: un link de prueba (?b=) lee esa cuenta; sin marca,
   la función de Supabase devuelve siempre el de Samuel. Si esa función todavía no
   existe, se usa la forma anterior (la cuenta modificada más recientemente). */
async function leerDisponibilidad() {
  const cuenta = cuentaDelLink()
  if (cuenta) {
    const { data, error } = await supabase.from('disponibilidad').select('*').eq('user_id', cuenta)
    if (error) throw error
    return data
  }
  const { data, error } = await supabase.rpc('horario_publico')
  if (!error) return data
  const { data: todas, error: err } = await supabase
    .from('disponibilidad').select('*').order('updated_at', { ascending: false })
  if (err) throw err
  return (todas || []).filter(d => d.user_id === todas[0]?.user_id)
}

export default function HorarioPublico() {
  const [filas, setFilas]         = useState([])
  // ?vista=mes abre directo el calendario (para compartir el mes completo)
  const [modo, setModo]           = useState(() => new URLSearchParams(window.location.search).get('vista') === 'mes' ? 'mes' : 'semana')
  const [mesVista, setMesVista]   = useState(() => { const [a, m] = hoy().split('-').map(Number); return { anio: a, mes: m - 1 } })
  const [fechaSel, setFechaSel]   = useState(null)
  const [cargando, setCargando]   = useState(true)
  const [error, setError]         = useState(false)
  const [ultimaAct, setUltimaAct] = useState(null)

  useEffect(() => {
    const cargar = async () => {
      try {
        const data = await leerDisponibilidad()
        if (!data || data.length === 0) { setCargando(false); return }

        const lista = data.map(d => ({ ...d, slots: Array.isArray(d.slots) ? d.slots : [] }))
        setFilas(lista)
        const ts = lista.reduce((m, d) => (d.updated_at > (m || '') ? d.updated_at : m), null)
        setUltimaAct(ts)
        setError(false)
      } catch {
        setError(true)
      } finally {
        setCargando(false)
      }
    }

    cargar()

    const channel = supabase
      .channel('horario_publico')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'disponibilidad' }, cargar)
      .subscribe()

    const intervalo = setInterval(cargar, 20000)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(intervalo)
    }
  }, [])

  // La semana empieza hoy: Hoy, Mañana, …
  const semana = proximosDias(filas, 7)
  // ¿Hay cupos libres después de esta semana? (para invitar a ver el mes)
  const hayMasAdelante = filas.length > 0 && Array.from({ length: 56 }, (_, i) => vistaDia(filas, sumarDias(hoy(), i + 7)))
    .some(d => libresParaCliente(d) > 0)

  const [anioHoy, mesHoy] = hoy().split('-').map(Number)
  const indiceMes = (m) => (m.anio - anioHoy) * 12 + (m.mes - (mesHoy - 1))
  const moverMes = (paso) => {
    setMesVista(m => {
      const total = m.anio * 12 + m.mes + paso
      return { anio: Math.floor(total / 12), mes: total % 12 }
    })
    setFechaSel(null)
  }
  // En el mes, si no han elegido un día: el primero de ese mes con cupos libres
  const primeroConCupos = (() => {
    const prefijo = claveMes(mesVista)
    const dias = new Date(Date.UTC(mesVista.anio, mesVista.mes + 1, 0)).getUTCDate()
    for (let d = 1; d <= dias; d++) {
      const fecha = `${prefijo}-${String(d).padStart(2, '0')}`
      if (fecha >= hoy() && libresParaCliente(vistaDia(filas, fecha)) > 0) return fecha
    }
    return null
  })()
  const fechaMes = fechaSel || primeroConCupos
  const diaMes = fechaMes && filas.length ? vistaDia(filas, fechaMes) : null
  const verMes = () => { setModo('mes'); window.scrollTo({ top: 0, behavior: 'smooth' }) }

  return (
    <>
      <style>{`
        @media (prefers-reduced-motion: reduce) { .orb { animation: none !important; } }
        .slot-wa:active { opacity: 0.78; transform: scale(0.98); }
      `}</style>

      <div className="bg-mesh" style={{ position: 'fixed', inset: 0, zIndex: -2 }} />
      <div style={{ position: 'fixed', inset: 0, zIndex: -1, overflow: 'hidden', pointerEvents: 'none' }}>
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
        <div className="orb orb-4" />
      </div>

      <main style={{ minHeight: '100svh', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 20px 40px' }}>
        <div style={{ width: '100%', maxWidth: 360, display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* Marca */}
          <header style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            {/* El escudo ya dice "Samuel S7yle" */}
            <h1 style={{ margin: 0, lineHeight: 0 }}>
              <Logo size={200} />
            </h1>
            <div>
              <p style={{ margin: '6px 0 0', color: 'rgba(255,255,255,0.52)', fontSize: 13 }}>
                Puerto Cabello, Venezuela
              </p>
            </div>
          </header>

          {/* Semana | Mes */}
          <div className="flex rounded-[12px] p-1" role="tablist" aria-label="Ver por semana o por mes"
               style={{ background: 'rgba(255,244,222,0.04)', border: '1px solid var(--line)' }}>
            {[['semana', 'Esta semana'], ['mes', 'Por mes']].map(([v, l]) => (
              <button key={v} role="tab" aria-selected={modo === v} onClick={() => setModo(v)}
                      className="flex-1 py-2 rounded-[9px] text-sm font-bold transition-colors duration-150"
                      style={{
                        background: modo === v ? 'rgba(201,162,74,0.20)' : 'transparent',
                        color: modo === v ? '#e2c98a' : 'rgba(247,242,232,0.55)',
                      }}>
                {l}
              </button>
            ))}
          </div>

          {modo === 'semana' ? (<>
          {/* Tarjeta de disponibilidad */}
          <section className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{
              padding: '14px 18px',
              borderBottom: '1px solid rgba(255,255,255,0.08)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <span style={{ color: '#fff', fontWeight: 600, fontSize: 14 }}>Disponibilidad</span>
              {ultimaAct && (
                <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Clock size={11} /> {tiempoDesde(ultimaAct)}
                </span>
              )}
            </div>

            <div>
              {error ? (
                <div style={{
                  padding: '32px 20px', display: 'flex', flexDirection: 'column',
                  alignItems: 'center', gap: 10, textAlign: 'center',
                }}>
                  <WifiOff size={28} color="rgba(255,255,255,0.22)" />
                  <p style={{ margin: 0, color: 'rgba(255,255,255,0.40)', fontSize: 14 }}>
                    No se pudo cargar el horario
                  </p>
                </div>
              ) : cargando
                ? Array.from({ length: 7 }).map((_, i) => (
                  <div key={i} style={{
                    padding: '14px 18px',
                    borderBottom: i < 6 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}>
                    <div style={{ width: 72, height: 14, borderRadius: 7, background: 'rgba(255,255,255,0.07)' }} />
                    <div style={{ width: 80, height: 26, borderRadius: 20, background: 'rgba(255,255,255,0.07)' }} />
                  </div>
                ))
                : semana.map((dia, i) => (
                  <DiaFila key={dia.fecha} dia={dia} ultimo={i === semana.length - 1} />
                ))
              }
            </div>
          </section>

          {/* Más fechas: invitar a ver el mes */}
          {!cargando && !error && hayMasAdelante && (
            <button onClick={verMes}
                    className="w-full flex items-center justify-center gap-2 rounded-[14px] min-h-[50px] text-sm font-bold text-amber-300 active:scale-[0.99] transition-transform"
                    style={{ background: 'rgba(201,162,74,0.10)', border: '1px solid rgba(201,162,74,0.32)' }}>
              <CalendarDays size={17} /> Ver más fechas
            </button>
          )}
          </>) : (<>
          {/* Vista por mes */}
          {error ? (
            <section className="glass-card text-center" style={{ padding: '32px 20px' }}>
              <WifiOff size={28} color="rgba(255,255,255,0.22)" className="mx-auto" />
              <p className="text-white/50 text-sm mt-2">No se pudo cargar el horario</p>
            </section>
          ) : cargando ? (
            <div className="glass-card" style={{ height: 340 }} />
          ) : (
            <>
              <CalendarioMes filas={filas} mesVista={mesVista} onMes={moverMes}
                             puedeAtras={indiceMes(mesVista) > 0} puedeAdelante={indiceMes(mesVista) < MESES_ADELANTE}
                             fechaSel={fechaMes} onElegir={setFechaSel} />
              {diaMes ? (
                <section className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                  <DiaFila dia={diaMes} ultimo />
                </section>
              ) : (
                <p className="text-white/55 text-sm text-center px-4">
                  Todavía no hay cupos en {MESES[mesVista.mes].toLowerCase()}. Vuelve a revisar pronto.
                </p>
              )}
            </>
          )}
          </>)}

        </div>
      </main>
    </>
  )
}
