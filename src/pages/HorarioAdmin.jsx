import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useToast } from '../context/ToastContext'
import PageHeader from '../components/PageHeader'
import { Copy, CheckCircle2, ToggleLeft, ToggleRight, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react'

const DIAS_DEFAULT = [
  { dia: 'Lunes',     orden: 0, abierto: true,  cupos: 0, slots: [] },
  { dia: 'Martes',    orden: 1, abierto: true,  cupos: 0, slots: [] },
  { dia: 'Miércoles', orden: 2, abierto: true,  cupos: 0, slots: [] },
  { dia: 'Jueves',    orden: 3, abierto: true,  cupos: 0, slots: [] },
  { dia: 'Viernes',   orden: 4, abierto: true,  cupos: 0, slots: [] },
  { dia: 'Sábado',    orden: 5, abierto: true,  cupos: 0, slots: [] },
  { dia: 'Domingo',   orden: 6, abierto: false, cupos: 0, slots: [] },
]

function diaActualVE() {
  return new Date()
    .toLocaleDateString('es-VE', { weekday: 'long' })
    .replace(/^\w/, c => c.toUpperCase())
}

function crearSlot(ultimoFin = '09:00') {
  const [h, m] = ultimoFin.split(':').map(Number)
  const finMin = h * 60 + m + 60
  const fin = `${String(Math.floor(finMin / 60) % 24).padStart(2, '0')}:${String(finMin % 60).padStart(2, '0')}`
  return { id: crypto.randomUUID(), inicio: ultimoFin, fin, ocupado: false }
}

const T = {
  input: {
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.14)',
    borderRadius: 10,
    padding: '9px 8px',
    color: '#fff',
    fontSize: 15,
    fontWeight: 600,
    outline: 'none',
    flex: 1,
    minWidth: 0,
    fontFamily: 'inherit',
    colorScheme: 'dark',
    textAlign: 'center',
  },
}

/* ── Fila de un turno ────────────────────────────────────── */
function SlotRow({ slot, onChange, onDelete }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6,
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 12, padding: '8px 10px',
    }}>
      <input
        type="time"
        value={slot.inicio}
        onChange={e => onChange('inicio', e.target.value)}
        style={T.input}
      />
      <span style={{ color: 'rgba(255,255,255,0.30)', fontSize: 13, flexShrink: 0 }}>→</span>
      <input
        type="time"
        value={slot.fin}
        onChange={e => onChange('fin', e.target.value)}
        style={T.input}
      />
      <button
        onClick={() => onChange('ocupado', !slot.ocupado)}
        style={{
          padding: '7px 10px', borderRadius: 9, border: 'none', cursor: 'pointer',
          fontSize: 11, fontWeight: 700, flexShrink: 0, lineHeight: 1,
          background: slot.ocupado ? 'rgba(248,113,113,0.15)' : 'rgba(52,211,153,0.12)',
          color: slot.ocupado ? '#f87171' : '#34d399',
          whiteSpace: 'nowrap',
        }}>
        {slot.ocupado ? 'Ocupado' : 'Libre'}
      </button>
      <button
        onClick={onDelete}
        aria-label="Eliminar turno"
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'rgba(255,255,255,0.22)', padding: 4, flexShrink: 0,
          display: 'flex', alignItems: 'center',
        }}>
        <Trash2 size={15} />
      </button>
    </div>
  )
}

/* ── Lista de turnos + botón agregar ─────────────────────── */
function SlotsList({ dia, idx, addSlot, updateSlot, deleteSlot }) {
  const slots = dia.slots || []
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
      {slots.length === 0 && (
        <div style={{ color: 'rgba(255,255,255,0.28)', fontSize: 13, textAlign: 'center', padding: '6px 0' }}>
          Sin turnos — agrega el primero
        </div>
      )}
      {slots.map(slot => (
        <SlotRow
          key={slot.id}
          slot={slot}
          onChange={(campo, valor) => updateSlot(idx, slot.id, campo, valor)}
          onDelete={() => deleteSlot(idx, slot.id)}
        />
      ))}
      <button
        onClick={() => addSlot(idx)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          padding: '9px 14px', borderRadius: 11,
          border: '1px dashed rgba(255,255,255,0.18)',
          background: 'none', cursor: 'pointer',
          color: 'rgba(255,255,255,0.40)', fontSize: 13, fontWeight: 600,
          marginTop: 2,
        }}>
        <Plus size={14} />
        Agregar turno
      </button>
    </div>
  )
}

/* ── Página ──────────────────────────────────────────────── */
export default function HorarioAdmin() {
  const toast = useToast()
  const [dias, setDias]           = useState([])
  const [cargando, setCargando]   = useState(true)
  const [guardando, setGuardando] = useState(null)
  const [copiado, setCopiado]     = useState(false)
  const [expandido, setExpandido] = useState({})

  const urlPublica = `${window.location.origin}/horario`
  const hoy = diaActualVE()

  /* ── carga ──────────────────────────────────────────────── */
  useEffect(() => {
    async function cargar() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const { data } = await supabase
        .from('disponibilidad')
        .select('*')
        .eq('user_id', session.user.id)
        .order('orden', { ascending: true })

      const normalizar = d => ({ ...d, slots: Array.isArray(d.slots) ? d.slots : [] })

      if (!data || data.length === 0) {
        const { data: ins } = await supabase
          .from('disponibilidad')
          .insert(DIAS_DEFAULT.map(d => ({ ...d, user_id: session.user.id })))
          .select()
        setDias((ins || []).map(normalizar))
      } else {
        setDias(data.map(normalizar))
      }
      setCargando(false)
    }
    cargar()
  }, [])

  /* ── mutaciones ─────────────────────────────────────────── */
  const set = useCallback((idx, campo, valor) => {
    setDias(prev => prev.map((d, i) => i === idx ? { ...d, [campo]: valor } : d))
  }, [])

  const addSlot = useCallback((idx) => {
    setDias(prev => prev.map((d, i) => {
      if (i !== idx) return d
      const slots = d.slots || []
      const ultimo = slots[slots.length - 1]
      return { ...d, slots: [...slots, crearSlot(ultimo?.fin)] }
    }))
  }, [])

  const updateSlot = useCallback((idx, slotId, campo, valor) => {
    setDias(prev => prev.map((d, i) => {
      if (i !== idx) return d
      return { ...d, slots: d.slots.map(s => s.id === slotId ? { ...s, [campo]: valor } : s) }
    }))
  }, [])

  const deleteSlot = useCallback((idx, slotId) => {
    setDias(prev => prev.map((d, i) => {
      if (i !== idx) return d
      return { ...d, slots: d.slots.filter(s => s.id !== slotId) }
    }))
  }, [])

  /* ── guardar ────────────────────────────────────────────── */
  const guardar = useCallback(async (idx) => {
    const dia = dias[idx]
    setGuardando(idx)
    const libres = (dia.slots || []).filter(s => !s.ocupado).length
    const { data: updated, error } = await supabase
      .from('disponibilidad')
      .update({
        abierto:     dia.abierto,
        cupos:       libres,
        slots:       dia.slots || [],
        hora_inicio: null,
        updated_at:  new Date().toISOString(),
      })
      .eq('id', dia.id)
      .select('id, slots, cupos')

    if (error) {
      toast(`Error: ${error.message}`, 'error')
    } else if (!updated || updated.length === 0) {
      toast('No se guardó — sin filas actualizadas', 'error')
    } else {
      const enDB = Array.isArray(updated[0].slots) ? updated[0].slots.length : '?'
      toast(`${dia.dia} guardado ✓ — ${enDB} turno(s) en DB`, 'success')
      // Sincronizar local state con lo que devuelve la DB
      setDias(prev => prev.map((d, i) => i === idx
        ? { ...d, ...updated[0], slots: Array.isArray(updated[0].slots) ? updated[0].slots : [] }
        : d
      ))
    }
    setGuardando(null)
  }, [dias, toast])

  /* ── copiar URL ─────────────────────────────────────────── */
  const copiarUrl = () => {
    navigator.clipboard.writeText(urlPublica)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2200)
  }

  const idxHoy  = dias.findIndex(d => d.dia.toLowerCase() === hoy.toLowerCase())
  const diaHoy  = idxHoy >= 0 ? dias[idxHoy] : null
  const otrosDias = dias.filter((_, i) => i !== idxHoy)

  /* ── render ─────────────────────────────────────────────── */
  return (
    <div className="min-h-screen">
      <PageHeader title="Horario" back={false} />

      <div style={{ padding: '12px 16px 40px', display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 480, margin: '0 auto' }}>

        {/* Copiar link */}
        <button
          onClick={copiarUrl}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            padding: '13px 20px', borderRadius: 16, border: 'none', cursor: 'pointer', width: '100%',
            background: copiado ? 'rgba(52,211,153,0.18)' : 'rgba(217,119,6,0.18)',
            color: copiado ? '#34d399' : '#fbbf24',
            fontSize: 14, fontWeight: 600, transition: 'all 0.18s',
          }}>
          {copiado ? <CheckCircle2 size={17} /> : <Copy size={17} />}
          {copiado ? '¡Link copiado!' : 'Copiar link para compartir'}
        </button>

        {/* HOY */}
        {cargando ? (
          <div className="glass-card" style={{ height: 240 }} />
        ) : diaHoy ? (
          <div className="glass-card" style={{
            border: '1px solid rgba(217,119,6,0.38)',
            background: 'rgba(217,119,6,0.07)',
            display: 'flex', flexDirection: 'column', gap: 16,
          }}>
            {/* Encabezado día */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  width: 7, height: 7, borderRadius: '50%',
                  background: '#fbbf24', boxShadow: '0 0 8px rgba(251,191,36,0.8)',
                  display: 'inline-block', flexShrink: 0,
                }} />
                <span style={{ color: '#fde68a', fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em' }}>
                  {diaHoy.dia}
                </span>
                <span style={{ color: 'rgba(251,191,36,0.50)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  hoy
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: 12, color: diaHoy.abierto ? '#fbbf24' : 'rgba(255,255,255,0.30)', fontWeight: 600 }}>
                  {diaHoy.abierto ? 'Abierto' : 'Cerrado'}
                </span>
                <button
                  onClick={() => set(idxHoy, 'abierto', !diaHoy.abierto)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex' }}
                  aria-label={diaHoy.abierto ? 'Marcar como cerrado' : 'Marcar como abierto'}>
                  {diaHoy.abierto
                    ? <ToggleRight size={34} color="#fbbf24" />
                    : <ToggleLeft  size={34} color="rgba(255,255,255,0.25)" />}
                </button>
              </div>
            </div>

            {/* Turnos */}
            {diaHoy.abierto ? (
              <SlotsList
                dia={diaHoy} idx={idxHoy}
                addSlot={addSlot} updateSlot={updateSlot} deleteSlot={deleteSlot}
              />
            ) : (
              <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.28)', fontSize: 14, padding: '8px 0' }}>
                Cerrado hoy
              </div>
            )}

            <button
              className="glass-btn-primary"
              onClick={() => guardar(idxHoy)}
              disabled={guardando === idxHoy}
              style={{ opacity: guardando === idxHoy ? 0.55 : 1, fontSize: 15 }}>
              {guardando === idxHoy ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        ) : null}

        {/* Resto de la semana */}
        {!cargando && otrosDias.length > 0 && (
          <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <span style={{ color: 'rgba(255,255,255,0.40)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Resto de la semana
              </span>
            </div>

            {otrosDias.map((dia) => {
              const idx     = dias.indexOf(dia)
              const isExp   = !!expandido[idx]
              const slots   = dia.slots || []
              const libres  = slots.filter(s => !s.ocupado).length
              const toggleExp = () => setExpandido(prev => ({ ...prev, [idx]: !isExp }))

              return (
                <div key={dia.id || dia.dia} style={{
                  borderBottom: otrosDias.indexOf(dia) < otrosDias.length - 1
                    ? '1px solid rgba(255,255,255,0.06)' : 'none',
                }}>
                  {/* Fila resumen */}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '12px 14px',
                    opacity: dia.abierto ? 1 : 0.45,
                  }}>
                    <span style={{ color: '#fff', fontSize: 14, fontWeight: 600, minWidth: 88 }}>
                      {dia.dia}
                    </span>

                    <button
                      onClick={() => set(idx, 'abierto', !dia.abierto)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, display: 'flex', flexShrink: 0 }}
                      aria-label={dia.abierto ? 'Cerrar' : 'Abrir'}>
                      {dia.abierto
                        ? <ToggleRight size={24} color="#fbbf24" />
                        : <ToggleLeft  size={24} color="rgba(255,255,255,0.22)" />}
                    </button>

                    <span style={{ flex: 1, color: 'rgba(255,255,255,0.35)', fontSize: 12 }}>
                      {!dia.abierto
                        ? 'Cerrado'
                        : slots.length === 0
                          ? 'Sin turnos'
                          : `${libres} libre${libres !== 1 ? 's' : ''} · ${slots.length} turno${slots.length !== 1 ? 's' : ''}`}
                    </span>

                    <button
                      onClick={toggleExp}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.40)', padding: 4, display: 'flex' }}>
                      {isExp ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </button>
                  </div>

                  {/* Turnos expandidos */}
                  {isExp && (
                    <div style={{ padding: '0 14px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {dia.abierto ? (
                        <SlotsList
                          dia={dia} idx={idx}
                          addSlot={addSlot} updateSlot={updateSlot} deleteSlot={deleteSlot}
                        />
                      ) : (
                        <div style={{ color: 'rgba(255,255,255,0.28)', fontSize: 13, textAlign: 'center', padding: '4px 0' }}>
                          Activa el día primero con el interruptor
                        </div>
                      )}
                      <button
                        onClick={() => guardar(idx)}
                        disabled={guardando === idx}
                        style={{
                          padding: '10px', borderRadius: 12, border: 'none', cursor: 'pointer',
                          background: guardando === idx ? 'rgba(52,211,153,0.15)' : 'rgba(255,255,255,0.08)',
                          color: guardando === idx ? '#34d399' : '#fff',
                          fontSize: 13, fontWeight: 600, opacity: guardando === idx ? 0.7 : 1,
                        }}>
                        {guardando === idx ? 'Guardando…' : 'Guardar'}
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
