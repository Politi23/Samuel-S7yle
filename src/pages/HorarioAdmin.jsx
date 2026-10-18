import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useApp } from '../context/AppContext'
import { useToast } from '../context/ToastContext'
import PageHeader from '../components/PageHeader'
import {
  ordenarDesdeHoy, etiquetaDia, etiquetaCorta, fechaDelDia, fmtHora,
  generarSlots, nuevoSlot, ordenarSlots, validarSlots, yaPaso,
  estaOcupado, marcarOcupado, aplicarCitas, libresDe, aMinutos,
} from '../lib/horario'
import {
  Share2, ExternalLink, Plus, Trash2, Pencil, Check, Copy, Wand2,
  CheckCircle2, AlertCircle, Loader2, CalendarCheck,
} from 'lucide-react'

const DIAS_DEFAULT = [
  { dia: 'Lunes',     orden: 0, abierto: true,  cupos: 0, slots: [] },
  { dia: 'Martes',    orden: 1, abierto: true,  cupos: 0, slots: [] },
  { dia: 'Miércoles', orden: 2, abierto: true,  cupos: 0, slots: [] },
  { dia: 'Jueves',    orden: 3, abierto: true,  cupos: 0, slots: [] },
  { dia: 'Viernes',   orden: 4, abierto: true,  cupos: 0, slots: [] },
  { dia: 'Sábado',    orden: 5, abierto: true,  cupos: 0, slots: [] },
  { dia: 'Domingo',   orden: 6, abierto: false, cupos: 0, slots: [] },
]
const DURACIONES = [30, 45, 60, 90]
const PREF_KEY = 'horario_generar'

function leerPreferencias() {
  try { return { desde: '09:00', hasta: '18:00', cada: 60, ...JSON.parse(localStorage.getItem(PREF_KEY) || '{}') } }
  catch { return { desde: '09:00', hasta: '18:00', cada: 60 } }
}

const cuandoDia = (dia) => dia.relativo === 0 ? 'hoy' : dia.relativo === 1 ? 'mañana' : `el ${dia.dia.toLowerCase()}`

const fechaCorta = (dia) => {
  const d = new Date(fechaDelDia(dia) + 'T12:00')
  return d.toLocaleDateString('es-VE', { weekday: 'long', day: 'numeric', month: 'short' }).replace('.', '')
}

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

/* ── Botón de acción del día ─────────────────────────────────── */
function AccionDia({ Icon, label, onClick }) {
  return (
    <button onClick={onClick}
            className="flex flex-col items-center justify-center gap-1 rounded-[12px] min-h-[58px] text-[12px] font-bold text-white/80 active:scale-[0.98] transition-transform"
            style={{ background: 'rgba(255,244,222,0.04)', border: '1px solid var(--line)' }}>
      <Icon size={16} className="text-amber-300" />
      {label}
    </button>
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

/* ── Página ──────────────────────────────────────────────────── */
export default function HorarioAdmin() {
  const toast = useToast()
  const navigate = useNavigate()
  const { citas } = useApp()
  const [dias, setDias]           = useState([])
  const [cargando, setCargando]   = useState(true)
  const [selId, setSelId]         = useState(null)
  const [estados, setEstados]     = useState({})
  const [editando, setEditando]   = useState(null)
  const [generando, setGenerando] = useState(false)
  const [copiando, setCopiando]   = useState(null) // Set de ids destino, o null
  const [pref, setPref]           = useState(leerPreferencias)

  const citasRef    = useRef(citas)
  const pendientes  = useRef({})
  useEffect(() => { citasRef.current = citas }, [citas])

  const urlPublica = `${window.location.origin}/horario`

  /* ── guardado automático ───────────────────────────────────── */
  const guardarDia = useCallback(async (dia) => {
    const conCitas = aplicarCitas(dia, citasRef.current) || dia
    const invalido = validarSlots(conCitas.slots)
    if (invalido) {
      setEstados(e => ({ ...e, [dia.id]: { tipo: 'invalido', msg: invalido } }))
      return
    }
    setEstados(e => ({ ...e, [dia.id]: { tipo: 'guardando' } }))
    const { error } = await supabase.from('disponibilidad').update({
      abierto:    conCitas.abierto,
      slots:      conCitas.slots,
      cupos:      libresDe(conCitas),
      updated_at: new Date().toISOString(),
    }).eq('id', dia.id)
    setEstados(e => ({ ...e, [dia.id]: { tipo: error ? 'error' : 'guardado' } }))
  }, [])

  const programar = useCallback((dia, ms = 0) => {
    clearTimeout(pendientes.current[dia.id]?.timer)
    const timer = setTimeout(() => { delete pendientes.current[dia.id]; guardarDia(dia) }, ms)
    pendientes.current[dia.id] = { timer, dia }
  }, [guardarDia])

  // Al salir de la pantalla, guardar lo que quedó en espera
  useEffect(() => () => {
    Object.values(pendientes.current).forEach(({ timer, dia }) => { clearTimeout(timer); guardarDia(dia) })
  }, [guardarDia])

  // Lo que se muestra: los días con las citas actuales aplicadas (si cambian con la pantalla abierta)
  const diasVista = useMemo(() => dias.map(d => aplicarCitas(d, citas) || d), [dias, citas])

  const cambiarDia = (id, fn, ms = 0) => {
    const actual = diasVista.find(d => d.id === id)
    if (!actual) return
    const nuevo = fn(actual)
    setDias(prev => prev.map(d => d.id === id ? nuevo : d))
    programar(nuevo, ms)
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

        let filas = data
        if (!filas?.length) {
          const { data: ins, error: insErr } = await supabase.from('disponibilidad')
            .insert(DIAS_DEFAULT.map(d => ({ ...d, user_id: session.user.id }))).select()
          if (insErr) throw insErr
          filas = ins || []
        }
        const ordenados = ordenarDesdeHoy(filas.map(d => ({ ...d, slots: ordenarSlots(Array.isArray(d.slots) ? d.slots : []) })))
        // Guardar los días que cambian al aplicar las citas (y migrar marcas viejas sin fecha)
        ordenados.forEach(d => { const c = aplicarCitas(d, citasRef.current); if (c) programar(c) })
        setDias(ordenados)
        setSelId(ordenados[0]?.id ?? null)
      } catch {
        toast('No se pudo cargar el horario', 'error')
      } finally {
        setCargando(false)
      }
    }
    cargar()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  /* ── acciones ──────────────────────────────────────────────── */
  const dia = diasVista.find(d => d.id === selId)

  const guardarPref = (p) => {
    setPref(p)
    try { localStorage.setItem(PREF_KEY, JSON.stringify(p)) } catch { /* sin almacenamiento local */ }
  }

  const toggleAbierto = () => cambiarDia(dia.id, d => ({ ...d, abierto: !d.abierto }))

  const toggleSlot = (slot) =>
    cambiarDia(dia.id, d => ({ ...d, slots: d.slots.map(s => s.id === slot.id ? marcarOcupado(d, s, !estaOcupado(d, s)) : s) }))

  const borrarSlot = (slot) => cambiarDia(dia.id, d => ({ ...d, slots: d.slots.filter(s => s.id !== slot.id) }))

  const editarHora = (slot, campo, valor) =>
    cambiarDia(dia.id, d => ({ ...d, slots: d.slots.map(s => s.id === slot.id ? { ...s, [campo]: valor } : s) }), 700)

  const terminarEdicion = () => {
    setEditando(null)
    cambiarDia(dia.id, d => ({ ...d, slots: ordenarSlots(d.slots) }))
  }

  const agregarSlot = () => {
    const ultimo = ordenarSlots(dia.slots).at(-1)
    const slot = nuevoSlot(ultimo ? ultimo.fin : pref.desde, pref.cada, fechaDelDia(dia))
    if (aMinutos(slot.fin) <= aMinutos(slot.inicio)) { toast('No caben más cupos hoy', 'error'); return }
    cambiarDia(dia.id, d => ({ ...d, slots: [...d.slots, slot] }))
  }

  const slotsGenerados = dia ? generarSlots(pref.desde, pref.hasta, pref.cada, fechaDelDia(dia)) : []
  const generar = () => {
    if (!slotsGenerados.length) return
    cambiarDia(dia.id, d => ({ ...d, abierto: true, slots: slotsGenerados }))
    setGenerando(false)
    toast(`${slotsGenerados.length} cupos creados`, 'success')
  }

  const copiar = () => {
    const destino = copiando
    if (!destino?.size) return
    const nuevos = diasVista.map(d => !destino.has(d.id) ? d : {
      ...d, abierto: true,
      slots: dia.slots.map(s => ({ id: crypto.randomUUID(), dia_fecha: fechaDelDia(d), inicio: s.inicio, fin: s.fin, ocupado: false })),
    })
    setDias(nuevos)
    nuevos.filter(d => destino.has(d.id)).forEach(d => programar(d))
    toast(`Copiado a ${destino.size} ${destino.size === 1 ? 'día' : 'días'}`, 'success')
    setCopiando(null)
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
  const estado = dia ? estados[dia.id] : null
  const slots  = dia ? ordenarSlots(dia.slots) : []
  const ocupados = dia ? slots.filter(s => estaOcupado(dia, s)).length : 0
  const libres   = dia ? libresDe(dia) : 0
  const citaDe   = (s) => s.cita && citas.find(c => c.id === s.cita)

  return (
    <div className="min-h-screen">
      <PageHeader
        title="Horario"
        action={
          <div className="flex gap-2">
            <a href="/horario" target="_blank" rel="noopener noreferrer" aria-label="Ver página pública"
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
          Pon los cupos de cada día cuando quieras; se guarda solo. Las citas ocupan su cupo automáticamente y los cupos de días que ya pasaron se borran solos.
        </p>

        {/* ── Días ── */}
        {cargando ? (
          <div className="glass-card h-[68px]" />
        ) : (
          <div className="grid grid-cols-7 gap-1.5" role="tablist" aria-label="Días de la semana">
            {diasVista.map(d => {
              const sel = d.id === selId
              const n = libresDe(d)
              return (
                <button key={d.id} role="tab" aria-selected={sel}
                        onClick={() => { setSelId(d.id); setEditando(null); setGenerando(false); setCopiando(null) }}
                        className="flex flex-col items-center justify-center gap-1 rounded-[12px] py-2.5 min-h-[60px] transition-colors duration-150"
                        style={{
                          background: sel ? 'rgba(201,162,74,0.16)' : 'rgba(255,244,222,0.035)',
                          border: `1px solid ${sel ? 'rgba(201,162,74,0.55)' : 'var(--line)'}`,
                        }}>
                  <span className="text-[11px] font-bold leading-none" style={{ color: sel ? '#e2c98a' : 'rgba(247,242,232,0.70)' }}>
                    {etiquetaCorta(d)}
                  </span>
                  <span className="text-[15px] font-extrabold leading-none"
                        style={{ color: !d.abierto || !d.slots.length ? 'rgba(247,242,232,0.35)' : n > 0 ? '#f7f2e8' : '#fca5a5' }}>
                    {!d.abierto ? '—' : n}
                  </span>
                </button>
              )
            })}
          </div>
        )}

        {/* ── Día seleccionado ── */}
        {dia && (
          <section className="glass-card" style={{ padding: 18 }}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-white text-xl font-extrabold leading-tight">{etiquetaDia(dia)}</h2>
                <p className="text-white/55 text-[13px] mt-0.5">{fechaCorta(dia)}</p>
              </div>
              <Interruptor activo={dia.abierto} onChange={toggleAbierto}
                           etiqueta={dia.abierto ? `Cerrar ${dia.dia}` : `Abrir ${dia.dia}`} />
            </div>

            <div className="flex items-center justify-between gap-2 mt-2 min-h-[20px]">
              <span className="text-white/60 text-xs">
                {dia.abierto && slots.length > 0 && `${libres} ${libres === 1 ? 'libre' : 'libres'} · ${ocupados} ${ocupados === 1 ? 'ocupado' : 'ocupados'}`}
              </span>
              <EstadoGuardado estado={estado} onReintentar={() => guardarDia(dia)} />
            </div>

            {estado?.tipo === 'invalido' && (
              <p className="mt-3 text-red-300 text-[13px] flex items-center gap-1.5" role="alert">
                <AlertCircle size={14} /> {estado.msg}. Corrígelo para que se guarde.
              </p>
            )}

            {!dia.abierto ? (
              <p className="text-white/55 text-sm mt-4 pt-4" style={{ borderTop: '1px solid var(--line)' }}>
                Los clientes ven este día como cerrado. Queda cerrado también las próximas semanas hasta que lo vuelvas a abrir.
              </p>
            ) : (slots.length === 0 || generando) ? (
              /* ── Generador ── */
              <div className="mt-4 pt-4 space-y-3" style={{ borderTop: '1px solid var(--line)' }}>
                <p className="text-white text-sm font-bold flex items-center gap-2">
                  <Wand2 size={15} className="text-amber-300" />
                  {slots.length ? 'Crear los cupos de nuevo' : `¿Atiendes ${cuandoDia(dia)}? Crea sus cupos`}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="glass-label" htmlFor="g-desde">Desde</label>
                    <input id="g-desde" type="time" className="glass-input" value={pref.desde}
                           onChange={e => guardarPref({ ...pref, desde: e.target.value })} />
                  </div>
                  <div>
                    <label className="glass-label" htmlFor="g-hasta">Hasta</label>
                    <input id="g-hasta" type="time" className="glass-input" value={pref.hasta}
                           onChange={e => guardarPref({ ...pref, hasta: e.target.value })} />
                  </div>
                </div>
                <div>
                  <span className="glass-label">Cada cupo dura</span>
                  <div className="grid grid-cols-4 gap-1.5">
                    {DURACIONES.map(m => (
                      <button key={m} onClick={() => guardarPref({ ...pref, cada: m })}
                              className="rounded-[10px] py-2.5 text-[13px] font-bold transition-colors duration-150"
                              style={{
                                background: pref.cada === m ? 'rgba(201,162,74,0.20)' : 'rgba(255,244,222,0.04)',
                                border: `1px solid ${pref.cada === m ? 'rgba(201,162,74,0.55)' : 'var(--line)'}`,
                                color: pref.cada === m ? '#e2c98a' : 'rgba(247,242,232,0.70)',
                              }}>
                        {m < 60 ? `${m} min` : m === 60 ? '1 h' : '1 h 30'}
                      </button>
                    ))}
                  </div>
                </div>
                {slots.some(s => estaOcupado(dia, s)) && generando && (
                  <p className="text-amber-200/80 text-xs">Esto reemplaza los cupos actuales. Los que tienen cita se vuelven a ocupar solos.</p>
                )}
                <div className="flex gap-2">
                  {generando && (
                    <button onClick={() => setGenerando(false)}
                            className="flex-1 rounded-[14px] min-h-[50px] text-sm font-bold text-white/75"
                            style={{ background: 'rgba(255,244,222,0.05)', border: '1px solid var(--line-strong)' }}>
                      Cancelar
                    </button>
                  )}
                  <button onClick={generar} disabled={!slotsGenerados.length} className="glass-btn-primary flex-[2]"
                          style={!slotsGenerados.length ? { opacity: 0.5 } : undefined}>
                    {slotsGenerados.length
                      ? `Crear ${slotsGenerados.length} cupos · ${fmtHora(pref.desde)} a ${fmtHora(pref.hasta)}`
                      : 'Revisa las horas'}
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* ── Cupos ── */}
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
                            <input type="time" aria-label="Inicio" className="glass-input text-center" style={{ padding: '9px 6px' }}
                                   value={s.inicio} onChange={e => editarHora(s, 'inicio', e.target.value)} />
                            <span className="text-white/40">–</span>
                            <input type="time" aria-label="Fin" className="glass-input text-center" style={{ padding: '9px 6px' }}
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
                              <button onClick={() => navigate(`/clientes/${cita.cliente_id}`)}
                                      className="flex items-center gap-1.5 rounded-full px-3 min-h-[36px] text-xs font-bold max-w-[150px]"
                                      style={{ background: 'rgba(201,162,74,0.14)', color: '#e2c98a', border: '1px solid rgba(201,162,74,0.30)' }}>
                                <CalendarCheck size={13} className="flex-shrink-0" />
                                <span className="truncate">{cita.cliente_nombre.split(' ')[0]}</span>
                              </button>
                            ) : (
                              <button onClick={() => toggleSlot(s)} aria-pressed={ocupado}
                                      className="rounded-full px-3.5 min-h-[36px] text-xs font-bold transition-colors duration-150"
                                      style={ocupado
                                        ? { background: 'rgba(248,113,113,0.14)', color: '#fca5a5', border: '1px solid rgba(248,113,113,0.30)' }
                                        : { background: 'rgba(124,192,147,0.12)', color: '#9fd3ae', border: '1px solid rgba(124,192,147,0.28)' }}>
                                {ocupado ? 'Ocupado' : 'Libre'}
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
                      </li>
                    )
                  })}
                </ul>

                <p className="text-white/45 text-xs mt-1">
                  Toca <span className="text-emerald-300 font-semibold">Libre</span> para marcarlo ocupado.
                </p>

                {/* ── Acciones del día ── */}
                <div className="grid grid-cols-3 gap-1.5 mt-4 pt-4" style={{ borderTop: '1px solid var(--line)' }}>
                  <AccionDia Icon={Plus}  label="Agregar"   onClick={agregarSlot} />
                  <AccionDia Icon={Wand2} label="Regenerar" onClick={() => setGenerando(true)} />
                  <AccionDia Icon={Copy}  label="Copiar a…" onClick={() => setCopiando(new Set())} />
                </div>

                {/* ── Copiar a otros días ── */}
                {copiando && (
                  <div className="mt-3 space-y-3">
                    <p className="text-white text-sm font-bold">¿A qué días copias estos {slots.length} cupos?</p>
                    <div className="flex flex-wrap gap-1.5">
                      {diasVista.filter(d => d.id !== dia.id).map(d => {
                        const on = copiando.has(d.id)
                        return (
                          <button key={d.id}
                                  onClick={() => setCopiando(prev => { const n = new Set(prev); on ? n.delete(d.id) : n.add(d.id); return n })}
                                  aria-pressed={on}
                                  className="rounded-full px-3.5 min-h-[38px] text-[13px] font-bold transition-colors duration-150"
                                  style={{
                                    background: on ? 'rgba(201,162,74,0.20)' : 'rgba(255,244,222,0.04)',
                                    border: `1px solid ${on ? 'rgba(201,162,74,0.55)' : 'var(--line)'}`,
                                    color: on ? '#e2c98a' : 'rgba(247,242,232,0.70)',
                                  }}>
                            {d.dia}
                          </button>
                        )
                      })}
                      <button onClick={() => setCopiando(new Set(diasVista.filter(d => d.id !== dia.id).map(d => d.id)))}
                              className="rounded-full px-3.5 min-h-[38px] text-[13px] font-bold text-amber-300 underline underline-offset-4">
                        Todos
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setCopiando(null)}
                              className="flex-1 rounded-[14px] min-h-[50px] text-sm font-bold text-white/75"
                              style={{ background: 'rgba(255,244,222,0.05)', border: '1px solid var(--line-strong)' }}>
                        Cancelar
                      </button>
                      <button onClick={copiar} disabled={!copiando.size} className="glass-btn-primary flex-[2]"
                              style={!copiando.size ? { opacity: 0.5 } : undefined}>
                        {copiando.size ? `Copiar a ${copiando.size} ${copiando.size === 1 ? 'día' : 'días'}` : 'Elige los días'}
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </section>
        )}
      </div>
    </div>
  )
}
