import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useApp } from '../context/AppContext'
import { useToast } from '../context/ToastContext'
import PageHeader from '../components/PageHeader'
import {
  DIAS, DIAS_CORTOS, MESES, hoy, sumarDias, ordenSemana, filaDeFecha, vistaDia, proximosDias,
  reemplazarFecha, etiquetaDia, fechaLarga, fmtHora, ordenarSlots, validarSlots, validarFila,
  yaPaso, estaOcupado, marcarOcupado, aplicarCitas, libresDe, libresFila, aMinutos, deMinutos,
} from '../lib/horario'
import { ahoraVE } from '../lib/fecha'
import { useMarcaCuenta } from '../lib/cuenta'
import {
  Share2, ExternalLink, Plus, Trash2, Pencil, Check, ChevronLeft, ChevronRight, Search, UserRound,
  CheckCircle2, AlertCircle, Loader2, CalendarCheck,
} from 'lucide-react'

const DIAS_DEFAULT = DIAS.map((dia, orden) => ({ dia, orden, abierto: orden !== 6, cupos: 0, slots: [] }))
const MESES_ADELANTE = 6 // hasta cuántos meses se puede planificar

/* Próxima media hora desde ahora (hora de Caracas), para sugerir el primer cupo de hoy */
function proximaMediaHora() {
  const min = aMinutos(ahoraVE())
  return deMinutos(Math.min(Math.ceil((min + 1) / 30) * 30, 23 * 60))
}

const sumarMinutos = (hhmm, min) => deMinutos(Math.min(aMinutos(hhmm) + min, 23 * 60 + 59))
const claveMes = ({ anio, mes }) => `${anio}-${String(mes + 1).padStart(2, '0')}`

/* ── Interruptor abierto / cerrado ───────────────────────────── */
function Interruptor({ activo, onChange, etiqueta }) {
  return (
    <button role="switch" aria-checked={activo} aria-label={etiqueta} onClick={onChange}
            className="flex items-center gap-2.5 min-h-[44px] pl-2">
      <span className="text-[13px] font-bold" style={{ color: activo ? '#e2c98a' : 'rgba(247,242,232,0.50)' }}>
        {activo ? 'Abierto' : 'Cerrado'}
      </span>
      <span className="relative w-11 h-[26px] rounded-full transition-colors duration-200"
            style={{ background: activo ? 'rgba(201,162,74,0.85)' : 'rgba(247,242,232,0.14)' }}>
        <span className="absolute top-[3px] w-5 h-5 rounded-full transition-all duration-200"
              style={{ left: activo ? 21 : 3, background: activo ? '#17120a' : 'rgba(247,242,232,0.75)' }} />
      </span>
    </button>
  )
}

/* ── Confirmación de borrado en línea ────────────────────────── */
function ConfirmarBorrado({ texto, onCancelar, onBorrar }) {
  return (
    <div className="mt-3 rounded-[14px] p-3 space-y-3" role="alertdialog" aria-label={texto}
         style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.25)' }}>
      <div>
        <p className="text-white text-sm font-bold">{texto}</p>
        <p className="text-white/55 text-xs mt-0.5">Las citas agendadas no se borran.</p>
      </div>
      <div className="flex gap-2">
        <button onClick={onCancelar}
                className="flex-1 rounded-[12px] min-h-[44px] text-sm font-bold text-white/80"
                style={{ background: 'rgba(255,244,222,0.05)', border: '1px solid var(--line-strong)' }}>
          Cancelar
        </button>
        <button onClick={onBorrar}
                className="flex-1 rounded-[12px] min-h-[44px] text-sm font-bold text-white"
                style={{ background: 'rgba(239,68,68,0.55)', border: '1px solid rgba(239,68,68,0.65)' }}>
          Sí, borrar
        </button>
      </div>
    </div>
  )
}

/* ── Estado de guardado ──────────────────────────────────────── */
function EstadoGuardado({ estado, onReintentar }) {
  if (!estado) return null
  if (estado.tipo === 'guardando') return (
    <span className="flex items-center gap-1 text-white/50 text-xs"><Loader2 size={12} className="animate-spin" /> Guardando…</span>
  )
  if (estado.tipo === 'guardado') return (
    <span className="flex items-center gap-1 text-emerald-300 text-xs"><CheckCircle2 size={12} /> Guardado</span>
  )
  if (estado.tipo === 'error') return (
    <button onClick={onReintentar} className="flex items-center gap-1 text-red-300 text-xs font-semibold underline underline-offset-2">
      <AlertCircle size={12} /> No se guardó · reintentar
    </button>
  )
  return null
}

/* ── Calendario del mes ──────────────────────────────────────── */
function Calendario({ mesVista, onMes, filas, fechaSel, onElegir, puedeAtras, puedeAdelante }) {
  const hoyStr = hoy()
  const primero = `${claveMes(mesVista)}-01`
  const huecos = ordenSemana(primero)
  const diasDelMes = new Date(Date.UTC(mesVista.anio, mesVista.mes + 1, 0)).getUTCDate()

  return (
    <section className="glass-card" style={{ padding: 14 }} aria-label="Calendario">
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

      <div className="grid grid-cols-7 gap-1 mt-2" role="grid">
        {DIAS_CORTOS.map(d => (
          <span key={d} className="text-center text-[11px] font-bold text-white/45 pb-1">{d}</span>
        ))}
        {Array.from({ length: huecos }, (_, i) => <span key={`h${i}`} />)}
        {Array.from({ length: diasDelMes }, (_, i) => {
          const fecha = `${claveMes(mesVista)}-${String(i + 1).padStart(2, '0')}`
          const pasado = fecha < hoyStr
          const vista = pasado ? null : vistaDia(filas, fecha)
          const cerrado = vista && !vista.abierto
          // Cupos que todavía no pasaron (hoy, los de horas ya pasadas no cuentan)
          const total = vista ? vista.slots.filter(s => !yaPaso(vista, s)).length : 0
          const libres = vista ? libresDe(vista) : 0
          const sel = fecha === fechaSel
          const esHoy = fecha === hoyStr
          return (
            <button key={fecha} onClick={() => !pasado && onElegir(fecha)} disabled={pasado}
                    aria-label={`${fechaLarga(fecha)}${cerrado ? ', cerrado' : total ? `, ${libres} libres de ${total}` : ', sin cupos'}`}
                    aria-pressed={sel}
                    className="flex flex-col items-center justify-center rounded-[10px] min-h-[46px] transition-colors duration-150"
                    style={{
                      background: sel ? 'rgba(201,162,74,0.20)' : total && !cerrado ? 'rgba(255,244,222,0.05)' : 'transparent',
                      border: `1px solid ${sel ? 'rgba(201,162,74,0.60)' : esHoy ? 'rgba(201,162,74,0.35)' : 'transparent'}`,
                      opacity: pasado ? 0.25 : 1,
                    }}>
              <span className="text-[14px] font-bold leading-none"
                    style={{ color: sel || esHoy ? '#e2c98a' : cerrado ? 'rgba(247,242,232,0.35)' : '#f7f2e8' }}>
                {i + 1}
              </span>
              <span className="text-[10px] font-bold leading-none mt-1 h-[10px]"
                    style={{ color: libres > 0 ? '#9fd3ae' : '#fca5a5' }}>
                {!pasado && !cerrado && total > 0 ? (libres > 0 ? libres : 'lleno') : ''}
              </span>
            </button>
          )
        })}
      </div>
      <p className="text-white/45 text-[11px] mt-2 px-1">El número verde son los cupos libres de ese día.</p>
    </section>
  )
}

/* "José  Pérez" y "jose perez" son el mismo texto para buscar */
const normal = (t) => (t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim()

/* ── Reservar un cupo: cliente de la app, nombre escrito o sin nombre ── */
function PanelReservar({ clientes, onCliente, onNombre, onCerrar, guardando, inicial = '' }) {
  const [texto, setTexto] = useState(inicial)
  const q = normal(texto)
  const digitos = texto.replace(/\D/g, '')
  const encontrados = q.length >= 2
    ? clientes.filter(c => normal(`${c.nombre} ${c.apellido}`).includes(q) || (digitos.length >= 3 && (c.telefono || '').replace(/\D/g, '').includes(digitos))).slice(0, 5)
    : []
  const nombreLibre = texto.replace(/[0-9]/g, '').replace(/\s+/g, ' ').trim()
  const hayNombre = /[a-zA-ZáéíóúÁÉÍÓÚñÑ]{2}/.test(nombreLibre)
  // Enter o el botón principal guardan lo escrito
  const guardarEscrito = (e) => { e?.preventDefault(); if (hayNombre) onNombre(nombreLibre) }

  return (
    <form onSubmit={guardarEscrito} className="mt-2 rounded-[12px] p-3 space-y-2"
          style={{ background: 'rgba(255,244,222,0.04)', border: '1px solid var(--line-strong)' }}>
      <p className="text-white text-sm font-bold">¿Quién reservó?</p>
      <div className="relative">
        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/45 pointer-events-none" />
        <input autoFocus className="glass-input" style={{ paddingLeft: 38 }} value={texto} maxLength={60}
               onChange={e => setTexto(e.target.value)} placeholder="Busca un cliente o escribe un nombre"
               aria-label="Buscar cliente o escribir un nombre" enterKeyHint="done" />
      </div>

      {encontrados.length > 0 && (
        <>
          <p className="text-white/50 text-[11px] font-semibold pt-1">Clientes de la app</p>
          <ul>
            {encontrados.map((c, idx) => (
              <li key={c.id} style={idx ? { borderTop: '1px solid var(--line)' } : undefined}>
                <button type="button" disabled={guardando} onClick={() => onCliente(c)}
                        className="w-full flex items-center gap-3 px-1 py-2.5 text-left active:opacity-70 disabled:opacity-50">
                  <span className="flex-1 min-w-0">
                    <span className="block text-white text-sm font-semibold truncate">{c.nombre} {c.apellido}</span>
                    <span className="block text-white/50 text-xs">{c.telefono || 'Sin teléfono'}</span>
                  </span>
                  <span className="text-amber-300 text-xs font-bold">Elegir</span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      <div className="flex gap-2 pt-1">
        {hayNombre ? (
          <button type="submit" className="glass-btn-primary flex-[2]" style={{ minHeight: 44, padding: '10px 12px', fontSize: 14 }}>
            <span className="truncate">Guardar «{nombreLibre}»</span>
          </button>
        ) : (
          <button type="button" onClick={() => onNombre(null)}
                  className="flex-[2] rounded-[10px] min-h-[44px] text-[13px] font-bold text-white/80"
                  style={{ background: 'rgba(255,244,222,0.05)', border: '1px solid var(--line-strong)' }}>
            Ocupado sin nombre
          </button>
        )}
        <button type="button" onClick={onCerrar}
                className="flex-1 rounded-[10px] min-h-[44px] text-[13px] font-bold text-white/60">
          Cancelar
        </button>
      </div>
      {hayNombre && (
        <p className="text-white/45 text-[11px]">
          {encontrados.length ? 'Si es uno de los clientes de arriba, elígelo para que quede su cita. ' : ''}
          El nombre escrito solo lo ves tú.
        </p>
      )}
    </form>
  )
}

/* ── Tira de la semana: los próximos 7 días ──────────────────── */
function SemanaTira({ filas, fechaSel, onElegir }) {
  const dias = proximosDias(filas, 7)
  return (
    <div className="grid grid-cols-7 gap-1.5" role="tablist" aria-label="Próximos 7 días">
      {dias.map(d => {
        const sel = d.fecha === fechaSel
        const total = d.slots.filter(s => !yaPaso(d, s)).length
        const n = libresDe(d)
        const etiqueta = d.relativo === 0 ? 'Hoy' : d.relativo === 1 ? 'Mañana' : DIAS_CORTOS[ordenSemana(d.fecha)]
        return (
          <button key={d.fecha} role="tab" aria-selected={sel} onClick={() => onElegir(d.fecha)}
                  aria-label={`${fechaLarga(d.fecha)}${!d.abierto ? ', cerrado' : total ? `, ${n} libres` : ', sin cupos'}`}
                  className="flex flex-col items-center justify-center gap-1 rounded-[12px] py-2.5 min-h-[64px] transition-colors duration-150"
                  style={{
                    background: sel ? 'rgba(201,162,74,0.16)' : 'rgba(255,244,222,0.035)',
                    border: `1px solid ${sel ? 'rgba(201,162,74,0.55)' : 'var(--line)'}`,
                  }}>
            <span className="text-[11px] font-bold leading-none" style={{ color: sel ? '#e2c98a' : 'rgba(247,242,232,0.70)' }}>
              {etiqueta}
            </span>
            <span className="text-[11px] leading-none" style={{ color: 'rgba(247,242,232,0.45)' }}>
              {Number(d.fecha.slice(8))}
            </span>
            <span className="text-[14px] font-extrabold leading-none"
                  style={{ color: !d.abierto || !total ? 'rgba(247,242,232,0.35)' : n > 0 ? '#f7f2e8' : '#fca5a5' }}>
              {!d.abierto ? '—' : n}
            </span>
          </button>
        )
      })}
    </div>
  )
}

/* ── Página ──────────────────────────────────────────────────── */
export default function HorarioAdmin() {
  const toast = useToast()
  const navigate = useNavigate()
  const { citas, clientes, agregarCita, actualizarCita } = useApp()
  const [filas, setFilas]         = useState([])
  const [cargando, setCargando]   = useState(true)
  const [fechaSel, setFechaSel]   = useState(hoy)
  const [mesVista, setMesVista]   = useState(() => { const [a, m] = hoy().split('-').map(Number); return { anio: a, mes: m - 1 } })
  const [estados, setEstados]     = useState({})
  const [editando, setEditando]   = useState(null)
  const [nuevo, setNuevo]         = useState(null) // { inicio, fin, error } mientras agrega un cupo
  const [confirmar, setConfirmar] = useState(null) // 'dia' | 'periodo' mientras pide confirmación
  const [panel, setPanel]         = useState(null) // { id, modo: 'reservar' | 'reservado' } del cupo abierto
  const [reservando, setReservando] = useState(false)
  const [modo, setModo] = useState(() => {
    try { return localStorage.getItem('horario_modo') === 'mes' ? 'mes' : 'semana' } catch { return 'semana' }
  })
  const cambiarModo = (m) => {
    setModo(m)
    setConfirmar(null)
    try { localStorage.setItem('horario_modo', m) } catch { /* sin almacenamiento local */ }
    // En la semana solo se ven los próximos 7 días: si la fecha elegida está más lejos, volver a hoy
    if (m === 'semana' && fechaSel > sumarDias(hoy(), 6)) setFechaSel(hoy())
  }

  const citasRef    = useRef(citas)
  const pendientes  = useRef({})
  useEffect(() => { citasRef.current = citas }, [citas])

  const marca = useMarcaCuenta()
  const urlPublica = `${window.location.origin}/horario${marca || ''}`

  /* ── guardado automático (por fila = día de la semana, con todas sus fechas) ── */
  const guardarFila = useCallback(async (fila) => {
    const conCitas = aplicarCitas(fila, citasRef.current) || fila
    const invalido = validarFila(conCitas)
    if (invalido) {
      setEstados(e => ({ ...e, [fila.id]: { tipo: 'invalido', msg: invalido } }))
      return
    }
    setEstados(e => ({ ...e, [fila.id]: { tipo: 'guardando' } }))
    const { error } = await supabase.from('disponibilidad').update({
      abierto:    conCitas.abierto,
      slots:      conCitas.slots,
      cupos:      libresFila(conCitas),
      updated_at: new Date().toISOString(),
    }).eq('id', fila.id)
    setEstados(e => ({ ...e, [fila.id]: { tipo: error ? 'error' : 'guardado' } }))
  }, [])

  const programar = useCallback((fila, ms = 0) => {
    clearTimeout(pendientes.current[fila.id]?.timer)
    const timer = setTimeout(() => { delete pendientes.current[fila.id]; guardarFila(fila) }, ms)
    pendientes.current[fila.id] = { timer, fila }
  }, [guardarFila])

  // Al salir de la pantalla, guardar lo que quedó en espera
  useEffect(() => () => {
    Object.values(pendientes.current).forEach(({ timer, fila }) => { clearTimeout(timer); guardarFila(fila) })
  }, [guardarFila])

  // Lo que se muestra: las filas con las citas actuales aplicadas
  const filasVista = useMemo(() => filas.map(f => aplicarCitas(f, citas) || f), [filas, citas])

  const guardarCambio = (filaNueva, ms = 0) => {
    setFilas(prev => prev.map(f => f.id === filaNueva.id ? filaNueva : f))
    programar(filaNueva, ms)
  }

  /* Cambia la vista de la fecha elegida y guarda su fila (las demás fechas no se tocan) */
  const cambiarFecha = (fn, ms = 0) => {
    const fila = filaDeFecha(filasVista, fechaSel)
    const vista = vistaDia(filasVista, fechaSel)
    if (!fila || !vista) return
    const nuevaVista = fn(vista)
    guardarCambio({ ...reemplazarFecha(fila, fechaSel, nuevaVista.slots), abierto: nuevaVista.abierto }, ms)
  }

  /* ── carga ─────────────────────────────────────────────────── */
  useEffect(() => {
    async function cargar() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return
        const { data, error } = await supabase
          .from('disponibilidad').select('*').eq('user_id', session.user.id)
        if (error) throw error

        let lista = data
        if (!lista?.length) {
          const { data: ins, error: insErr } = await supabase.from('disponibilidad')
            .insert(DIAS_DEFAULT.map(d => ({ ...d, user_id: session.user.id }))).select()
          if (insErr) throw insErr
          lista = ins || []
        }
        const normal = lista
          .map(f => ({ ...f, slots: Array.isArray(f.slots) ? f.slots : [] }))
          .sort((a, b) => a.orden - b.orden)
        // Guardar las filas que cambian al aplicar las citas (y borrar lo pasado)
        normal.forEach(f => { const c = aplicarCitas(f, citasRef.current); if (c) programar(c) })
        setFilas(normal)
      } catch {
        toast('No se pudo cargar el horario', 'error')
      } finally {
        setCargando(false)
      }
    }
    cargar()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  /* ── navegación ────────────────────────────────────────────── */
  const [anioHoy, mesHoy] = hoy().split('-').map(Number)
  const indiceMes = (m) => (m.anio - anioHoy) * 12 + (m.mes - (mesHoy - 1))
  const moverMes = (paso) => setMesVista(m => {
    const total = m.anio * 12 + m.mes + paso
    return { anio: Math.floor(total / 12), mes: total % 12 }
  })
  const elegirFecha = (fecha) => {
    setFechaSel(fecha); setEditando(null); setNuevo(null); setConfirmar(null); setPanel(null)
  }

  /* ── acciones sobre la fecha elegida ───────────────────────── */
  const dia = filasVista.length ? vistaDia(filasVista, fechaSel) : null

  const toggleAbierto = () => {
    const fila = filaDeFecha(filasVista, fechaSel)
    guardarCambio({ ...fila, abierto: !fila.abierto })
  }

  // Reservar para un cliente de la app: se crea su cita y el cupo se ocupa solo con su nombre
  const reservarCliente = async (slot, c) => {
    setReservando(true)
    try {
      await agregarCita({
        cliente_id: c.id, cliente_nombre: `${c.nombre} ${c.apellido}`.trim(),
        fecha: fechaSel, hora: slot.inicio, motivo: 'Sin especificar', notas: '',
      })
      toast(`Cupo de las ${fmtHora(slot.inicio)} reservado para ${c.nombre}`, 'success')
      setPanel(null)
    } catch {
      toast('No se pudo crear la cita. Revisa la conexión.', 'error')
    } finally {
      setReservando(false)
    }
  }

  // Reservar con un nombre escrito (no es cliente) o sin nombre
  const reservarNombre = (slot, nombre) => {
    cambiarFecha(d => ({ ...d, slots: d.slots.map(s => s.id === slot.id ? marcarOcupado(d, s, true, nombre) : s) }))
    setPanel(null)
  }

  // Quitar la reserva: si era una cita, se cancela; si era a mano, el cupo se libera
  const quitarReserva = async (slot, cita) => {
    if (cita) {
      try {
        await actualizarCita(cita.id, { estado: 'cancelada' })
        toast(`Cita de ${cita.cliente_nombre.split(' ')[0]} cancelada; el cupo quedó libre`, 'success')
      } catch {
        toast('No se pudo cancelar la cita. Revisa la conexión.', 'error')
        return
      }
    } else {
      cambiarFecha(d => ({ ...d, slots: d.slots.map(s => s.id === slot.id ? marcarOcupado(d, s, false) : s) }))
    }
    setPanel(null)
  }

  const borrarSlot = (slot) => cambiarFecha(d => ({ ...d, slots: d.slots.filter(s => s.id !== slot.id) }))

  const editarHora = (slot, campo, valor) =>
    cambiarFecha(d => ({ ...d, slots: d.slots.map(s => s.id === slot.id ? { ...s, [campo]: valor } : s) }), 700)

  const terminarEdicion = () => {
    setEditando(null)
    cambiarFecha(d => ({ ...d, slots: ordenarSlots(d.slots) }))
  }

  // Sugiere el siguiente cupo: empieza donde terminó el último y dura lo mismo
  const abrirNuevo = () => {
    const ultimo = ordenarSlots(dia.slots).at(-1)
    const dur = ultimo ? aMinutos(ultimo.fin) - aMinutos(ultimo.inicio) : 60
    const inicio = ultimo ? ultimo.fin : dia.relativo === 0 ? proximaMediaHora() : '09:00'
    setNuevo({ inicio, fin: sumarMinutos(inicio, dur), error: '' })
  }

  const agregarSlot = () => {
    if (!nuevo.inicio || !nuevo.fin) { setNuevo(n => ({ ...n, error: 'Pon la hora en que empieza y en la que termina' })); return }
    const slot = { id: crypto.randomUUID(), dia_fecha: fechaSel, inicio: nuevo.inicio, fin: nuevo.fin, ocupado: false }
    const error = validarSlots([...dia.slots, slot])
    if (error) { setNuevo(n => ({ ...n, error })); return }
    cambiarFecha(d => ({ ...d, slots: ordenarSlots([...d.slots, slot]) }))
    // Dejar listo el siguiente para agregar varios seguidos
    const dur = aMinutos(slot.fin) - aMinutos(slot.inicio)
    setNuevo({ inicio: slot.fin, fin: sumarMinutos(slot.fin, dur), error: '' })
  }

  const borrarDia = () => {
    cambiarFecha(d => ({ ...d, slots: [] }))
    setConfirmar(null)
    setNuevo(null)
    toast(`Cupos del ${fechaLarga(fechaSel)} borrados`, 'success')
  }

  // Todos los cupos del período que se está viendo: los próximos 7 días o el mes
  const prefijoMes = claveMes(mesVista)
  const finSemana = sumarDias(hoy(), 6)
  const enPeriodo = (s) => {
    const f = s.dia_fecha || ''
    if (f < hoy()) return false
    return modo === 'semana' ? f <= finSemana : f.startsWith(prefijoMes)
  }
  const nombrePeriodo = modo === 'semana' ? 'la semana' : MESES[mesVista.mes].toLowerCase()
  const totalPeriodo = filasVista.reduce((n, f) => n + f.slots.filter(enPeriodo).length, 0)
  const borrarPeriodo = () => {
    filasVista.forEach(f => {
      const quedan = f.slots.filter(s => !enPeriodo(s))
      if (quedan.length !== f.slots.length) guardarCambio({ ...f, slots: quedan })
    })
    setConfirmar(null)
    setNuevo(null)
    toast(`Cupos de ${nombrePeriodo} borrados`, 'success')
  }

  const compartir = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: 'Samuel S7yle', text: '💈 Cupos disponibles de Samuel S7yle', url: urlPublica }); return }
      catch (e) { if (e.name === 'AbortError') return }
    }
    try { await navigator.clipboard.writeText(urlPublica); toast('Link copiado', 'success') }
    catch { toast('No se pudo copiar el link', 'error') }
  }

  /* ── render ────────────────────────────────────────────────── */
  const filaSel  = dia ? filaDeFecha(filasVista, fechaSel) : null
  const estado   = filaSel ? estados[filaSel.id] : null
  const slots    = dia ? dia.slots : []
  const ocupados = dia ? slots.filter(s => estaOcupado(dia, s)).length : 0
  const libres   = dia ? libresDe(dia) : 0
  const citaDe   = (s) => s.cita && citas.find(c => c.id === s.cita)
  const nombreDiaPlural = dia ? `${DIAS[ordenSemana(fechaSel)].toLowerCase()}s` : ''

  return (
    <div className="min-h-screen">
      <PageHeader
        title="Horario"
        action={
          <div className="flex gap-2">
            <a href={`/horario${marca || ''}`} target="_blank" rel="noopener noreferrer" aria-label="Ver página pública"
               className="glass-btn-icon w-10 h-10 flex items-center justify-center">
              <ExternalLink size={17} className="text-white/80" />
            </a>
            <button onClick={compartir} aria-label="Compartir horario"
                    className="glass-btn-icon w-10 h-10 flex items-center justify-center">
              <Share2 size={17} className="text-amber-300" />
            </button>
          </div>
        }
      />

      <div className="px-4 pt-4 pb-8 space-y-4">

        <p className="text-white/55 text-[13px] leading-relaxed">
          Elige un día y agrega sus cupos. En <span className="text-white/80 font-semibold">Mes</span> puedes planificar el mes completo. Se guarda solo, las citas ocupan su cupo y los días que ya pasaron se borran solos.
        </p>

        {/* ── Semana | Mes ── */}
        <div className="flex rounded-[12px] p-1" role="tablist" aria-label="Ver por semana o por mes"
             style={{ background: 'rgba(255,244,222,0.04)', border: '1px solid var(--line)' }}>
          {[['semana', 'Semana'], ['mes', 'Mes']].map(([v, l]) => (
            <button key={v} role="tab" aria-selected={modo === v} onClick={() => cambiarModo(v)}
                    className="flex-1 py-2 rounded-[9px] text-sm font-bold transition-colors duration-150"
                    style={{
                      background: modo === v ? 'rgba(201,162,74,0.20)' : 'transparent',
                      color: modo === v ? '#e2c98a' : 'rgba(247,242,232,0.55)',
                    }}>
              {l}
            </button>
          ))}
        </div>

        {cargando ? (
          <div className="glass-card" style={{ height: modo === 'mes' ? 340 : 72 }} />
        ) : modo === 'semana' ? (
          <SemanaTira filas={filasVista} fechaSel={fechaSel} onElegir={elegirFecha} />
        ) : (
          <Calendario mesVista={mesVista} onMes={moverMes} filas={filasVista}
                      fechaSel={fechaSel} onElegir={elegirFecha}
                      puedeAtras={indiceMes(mesVista) > 0} puedeAdelante={indiceMes(mesVista) < MESES_ADELANTE} />
        )}

        {/* ── Día elegido ── */}
        {dia && (
          <section className="glass-card" style={{ padding: 18 }}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-white text-xl font-extrabold leading-tight">{etiquetaDia(dia)}</h2>
                <p className="text-white/55 text-[13px] mt-0.5">{fechaLarga(fechaSel)}</p>
              </div>
              <Interruptor activo={dia.abierto} onChange={toggleAbierto}
                           etiqueta={dia.abierto ? `Cerrar todos los ${nombreDiaPlural}` : `Abrir los ${nombreDiaPlural}`} />
            </div>

            <div className="flex items-center justify-between gap-2 mt-2 min-h-[20px]">
              <span className="text-white/60 text-xs">
                {dia.abierto && slots.length > 0 && `${libres} ${libres === 1 ? 'libre' : 'libres'} · ${ocupados} ${ocupados === 1 ? 'ocupado' : 'ocupados'}`}
              </span>
              <EstadoGuardado estado={estado} onReintentar={() => guardarFila(filaSel)} />
            </div>

            {estado?.tipo === 'invalido' && (
              <p className="mt-3 text-red-300 text-[13px] flex items-center gap-1.5" role="alert">
                <AlertCircle size={14} /> {estado.msg}. Corrígelo para que se guarde.
              </p>
            )}

            {!dia.abierto ? (
              <p className="text-white/55 text-sm mt-4 pt-4" style={{ borderTop: '1px solid var(--line)' }}>
                Los {nombreDiaPlural} están cerrados: los clientes los ven como cerrados todas las semanas hasta que los vuelvas a abrir.
                Si solo este día no vas a atender, ábrelo y déjalo sin cupos.
              </p>
            ) : (
              <>
                {slots.length === 0 && !nuevo && (
                  <p className="text-white/55 text-sm mt-4 pt-4" style={{ borderTop: '1px solid var(--line)' }}>
                    Todavía no hay cupos para este día. Agrégalos cuando sepas a qué hora vas a atender.
                  </p>
                )}

                {/* ── Cupos ── */}
                {slots.length > 0 && (
                  <ul className="mt-3">
                    {slots.map((s, idx) => {
                      const ocupado = estaOcupado(dia, s)
                      const paso = yaPaso(dia, s)
                      const cita = ocupado && citaDe(s)
                      const editandoEste = editando === s.id
                      return (
                        <li key={s.id} className="py-2" style={idx ? { borderTop: '1px solid var(--line)' } : undefined}>
                          {editandoEste ? (
                            <div className="flex items-center gap-2">
                              <input type="time" aria-label="Empieza" className="glass-input text-center" style={{ padding: '9px 6px' }}
                                     value={s.inicio} onChange={e => editarHora(s, 'inicio', e.target.value)} />
                              <span className="text-white/40">–</span>
                              <input type="time" aria-label="Termina" className="glass-input text-center" style={{ padding: '9px 6px' }}
                                     value={s.fin} onChange={e => editarHora(s, 'fin', e.target.value)} />
                              <button onClick={terminarEdicion} aria-label="Listo"
                                      className="glass-btn-icon w-11 h-11 flex-shrink-0 flex items-center justify-center" style={{ padding: 0 }}>
                                <Check size={17} className="text-amber-300" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2" style={{ opacity: paso ? 0.45 : 1 }}>
                              <span className="flex-1 min-w-0 text-white text-[15px] font-bold">
                                {fmtHora(s.inicio)} – {fmtHora(s.fin)}
                                {paso && <span className="ml-2 text-white/50 text-xs font-semibold">pasó</span>}
                              </span>
                              {cita ? (
                                <button onClick={() => setPanel(p => p?.id === s.id ? null : { id: s.id, modo: 'reservado' })}
                                        aria-expanded={panel?.id === s.id}
                                        className="flex items-center gap-1.5 rounded-full px-3 min-h-[36px] text-xs font-bold max-w-[150px]"
                                        style={{ background: 'rgba(201,162,74,0.14)', color: '#e2c98a', border: '1px solid rgba(201,162,74,0.30)' }}>
                                  <CalendarCheck size={13} className="flex-shrink-0" />
                                  <span className="truncate">{cita.cliente_nombre.split(' ')[0]}</span>
                                </button>
                              ) : ocupado ? (
                                <button onClick={() => setPanel(p => p?.id === s.id ? null : { id: s.id, modo: 'reservado' })}
                                        aria-expanded={panel?.id === s.id}
                                        className="flex items-center gap-1.5 rounded-full px-3 min-h-[36px] text-xs font-bold max-w-[150px] transition-colors duration-150"
                                        style={{ background: 'rgba(248,113,113,0.14)', color: '#fca5a5', border: '1px solid rgba(248,113,113,0.30)' }}>
                                  {s.reservo && <UserRound size={13} className="flex-shrink-0" />}
                                  <span className="truncate">{s.reservo ? s.reservo.split(' ')[0] : 'Ocupado'}</span>
                                </button>
                              ) : (
                                <button onClick={() => !paso && setPanel(p => p?.id === s.id ? null : { id: s.id, modo: 'reservar' })}
                                        disabled={paso} aria-expanded={panel?.id === s.id}
                                        className="rounded-full px-3.5 min-h-[36px] text-xs font-bold transition-colors duration-150"
                                        style={{ background: 'rgba(124,192,147,0.12)', color: '#9fd3ae', border: '1px solid rgba(124,192,147,0.28)' }}>
                                  Libre
                                </button>
                              )}
                              <button onClick={() => setEditando(s.id)} aria-label="Cambiar horas"
                                      className="w-9 h-9 flex items-center justify-center text-white/45 active:text-white/80">
                                <Pencil size={15} />
                              </button>
                              <button onClick={() => borrarSlot(s)} aria-label="Eliminar cupo"
                                      className="w-9 h-9 flex items-center justify-center text-red-400/60 active:text-red-400">
                                <Trash2 size={15} />
                              </button>
                            </div>
                          )}

                          {panel?.id === s.id && panel.modo === 'reservar' && (
                            <PanelReservar clientes={clientes} guardando={reservando} inicial={s.reservo || ''}
                                           onCliente={(c) => reservarCliente(s, c)}
                                           onNombre={(nombre) => reservarNombre(s, nombre)}
                                           onCerrar={() => setPanel(null)} />
                          )}
                          {panel?.id === s.id && panel.modo === 'reservado' && (
                            <div className="mt-2 rounded-[12px] p-3 space-y-2" style={{ background: 'rgba(255,244,222,0.04)', border: '1px solid var(--line-strong)' }}>
                              <p className="text-white text-sm">
                                {cita
                                  ? <>Reservado por <span className="font-bold">{cita.cliente_nombre}</span> (tiene cita)</>
                                  : s.reservo
                                    ? <>Reservado por <span className="font-bold">{s.reservo}</span> (no está registrado)</>
                                    : 'Ocupado, sin nombre'}
                              </p>
                              <div className="flex gap-2">
                                {!cita && (
                                  <button onClick={() => setPanel({ id: s.id, modo: 'reservar' })}
                                          className="flex-1 rounded-[10px] min-h-[42px] text-[13px] font-bold text-amber-300"
                                          style={{ background: 'rgba(201,162,74,0.10)', border: '1px solid rgba(201,162,74,0.30)' }}>
                                    {s.reservo ? 'Cambiar nombre' : 'Poner nombre'}
                                  </button>
                                )}
                                {cita && (
                                  <button onClick={() => navigate(`/clientes/${cita.cliente_id}`)}
                                          className="flex-1 rounded-[10px] min-h-[42px] text-[13px] font-bold text-white/85"
                                          style={{ background: 'rgba(255,244,222,0.05)', border: '1px solid var(--line-strong)' }}>
                                    Ver cliente
                                  </button>
                                )}
                                <button onClick={() => quitarReserva(s, cita)}
                                        className="flex-1 rounded-[10px] min-h-[42px] text-[13px] font-bold text-red-300"
                                        style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.28)' }}>
                                  {cita ? 'Quitar reserva (cancela la cita)' : 'Quitar reserva'}
                                </button>
                              </div>
                            </div>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                )}

                {slots.length > 0 && (
                  <p className="text-white/45 text-xs mt-1">
                    Toca <span className="text-emerald-300 font-semibold">Libre</span> para anotar quién reservó.
                  </p>
                )}

                {/* ── Agregar cupo a mano ── */}
                {nuevo ? (
                  <div className="mt-4 pt-4 space-y-3" style={{ borderTop: '1px solid var(--line)' }}>
                    <p className="text-white text-sm font-bold">Nuevo cupo</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="glass-label" htmlFor="n-inicio">Empieza</label>
                        <input id="n-inicio" type="time" className={`glass-input${nuevo.error ? ' error' : ''}`} value={nuevo.inicio}
                               onChange={e => setNuevo(n => ({ ...n, inicio: e.target.value, error: '' }))} />
                      </div>
                      <div>
                        <label className="glass-label" htmlFor="n-fin">Termina</label>
                        <input id="n-fin" type="time" className={`glass-input${nuevo.error ? ' error' : ''}`} value={nuevo.fin}
                               onChange={e => setNuevo(n => ({ ...n, fin: e.target.value, error: '' }))} />
                      </div>
                    </div>
                    {nuevo.error && (
                      <p className="text-red-300 text-[13px] flex items-center gap-1.5" role="alert">
                        <AlertCircle size={14} /> {nuevo.error}
                      </p>
                    )}
                    <div className="flex gap-2">
                      <button onClick={() => setNuevo(null)}
                              className="flex-1 rounded-[14px] min-h-[50px] text-sm font-bold text-white/75"
                              style={{ background: 'rgba(255,244,222,0.05)', border: '1px solid var(--line-strong)' }}>
                        Listo
                      </button>
                      <button onClick={agregarSlot} className="glass-btn-primary flex-[2]">
                        <Plus size={17} strokeWidth={2.5} /> Agregar cupo
                      </button>
                    </div>
                  </div>
                ) : (
                  <button onClick={abrirNuevo}
                          className="mt-4 w-full flex items-center justify-center gap-2 rounded-[14px] min-h-[50px] text-sm font-bold text-white/85 active:scale-[0.99] transition-transform"
                          style={{ background: 'rgba(255,244,222,0.04)', border: '1px dashed rgba(201,162,74,0.45)' }}>
                    <Plus size={17} className="text-amber-300" /> Agregar cupo
                  </button>
                )}

                {slots.length > 0 && !nuevo && (
                  confirmar === 'dia' ? (
                    <ConfirmarBorrado
                      texto={`¿Borrar los ${slots.length} ${slots.length === 1 ? 'cupo' : 'cupos'} del ${fechaLarga(fechaSel)}?`}
                      onCancelar={() => setConfirmar(null)} onBorrar={borrarDia} />
                  ) : (
                    <button onClick={() => setConfirmar('dia')}
                            className="mt-2 w-full flex items-center justify-center gap-2 min-h-[44px] text-[13px] font-semibold text-red-300/80 active:text-red-300">
                      <Trash2 size={14} /> Borrar los cupos de este día
                    </button>
                  )
                )}
              </>
            )}
          </section>
        )}

        {/* ── Borrar toda la semana o todo el mes ── */}
        {!cargando && totalPeriodo > 0 && (
          confirmar === 'periodo' ? (
            <div className="glass-card">
              <ConfirmarBorrado
                texto={`¿Borrar los ${totalPeriodo} cupos de ${nombrePeriodo}?`}
                onCancelar={() => setConfirmar(null)} onBorrar={borrarPeriodo} />
            </div>
          ) : (
            <button onClick={() => setConfirmar('periodo')}
                    className="w-full flex items-center justify-center gap-2 rounded-[14px] min-h-[48px] text-[13px] font-semibold text-red-300/85 active:scale-[0.99] transition-transform"
                    style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.22)' }}>
              <Trash2 size={15} /> Borrar todos los cupos de {nombrePeriodo}
            </button>
          )
        )}
      </div>
    </div>
  )
}
