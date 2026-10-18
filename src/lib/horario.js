import { ahoraVE, hoyVE, toFechaVE } from './fecha'

// Lógica compartida del horario (admin /disponibilidad y público /horario).
// Cada fila de `disponibilidad` es un día de la semana; sus cupos pertenecen a
// una fecha concreta (Samuel no tiene horario fijo). Cuando esa fecha pasa, los
// cupos dejan de mostrarse y se borran solos en el siguiente guardado.
// slots: [{ id, dia_fecha: 'YYYY-MM-DD', inicio: 'HH:MM', fin: 'HH:MM',
//           ocupado: bool, fecha?: 'YYYY-MM-DD', cita?: id }]

export const DIAS_CORTOS = {
  'lunes': 'Lun', 'martes': 'Mar', 'miércoles': 'Mié', 'jueves': 'Jue',
  'viernes': 'Vie', 'sábado': 'Sáb', 'domingo': 'Dom',
}

export function diaActualVE() {
  return new Date().toLocaleDateString('es-VE', { weekday: 'long', timeZone: 'America/Caracas' }).toLowerCase()
}

/* Ordena los días empezando por hoy y les agrega `relativo` (0 = hoy, 1 = mañana, …) */
export function ordenarDesdeHoy(dias) {
  const ordenados = [...dias].sort((a, b) => a.orden - b.orden)
  const hoy = diaActualVE()
  const inicio = Math.max(0, ordenados.findIndex(d => d.dia.toLowerCase() === hoy))
  return ordenados.map((_, i) => {
    const d = ordenados[(inicio + i) % ordenados.length]
    return { ...d, relativo: i }
  })
}

export function etiquetaDia(dia) {
  if (dia.relativo === 0) return 'Hoy'
  if (dia.relativo === 1) return 'Mañana'
  return dia.dia
}

export function etiquetaCorta(dia) {
  if (dia.relativo === 0) return 'Hoy'
  if (dia.relativo === 1) return 'Mañana'
  return DIAS_CORTOS[dia.dia.toLowerCase()] || dia.dia.slice(0, 3)
}

export const aMinutos = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}
export const deMinutos = (min) =>
  `${String(Math.floor(min / 60) % 24).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`

/* 14:30 → "2:30pm", 09:00 → "9am" */
export function fmtHora(hhmm) {
  if (!hhmm) return ''
  const [h, m] = hhmm.split(':').map(Number)
  const periodo = h < 12 ? 'am' : 'pm'
  const h12 = h % 12 || 12
  return m === 0 ? `${h12}${periodo}` : `${h12}:${String(m).padStart(2, '0')}${periodo}`
}

export const ordenarSlots = (slots) => [...slots].sort((a, b) => a.inicio.localeCompare(b.inicio))

/* Devuelve un mensaje si la lista de cupos tiene algo inválido, o null */
export function validarSlots(slots) {
  const malo = slots.find(s => !s.inicio || !s.fin || s.inicio >= s.fin)
  if (malo) return `El cupo de ${fmtHora(malo.inicio) || '—'} termina antes de empezar`
  const ord = ordenarSlots(slots)
  for (let i = 0; i < ord.length - 1; i++) {
    if (ord[i].fin > ord[i + 1].inicio) return `Los cupos de ${fmtHora(ord[i].inicio)} y ${fmtHora(ord[i + 1].inicio)} se cruzan`
  }
  return null
}

/* Un cupo de hoy cuya hora de inicio ya pasó (hora de Caracas) */
export function yaPaso(dia, slot) {
  return dia.relativo === 0 && slot.inicio <= ahoraVE()
}

/* ── Fechas ──────────────────────────────────────────────────── */

/* Fecha (YYYY-MM-DD, hora de Caracas) que representa este día en los próximos 7 */
export function fechaDelDia(dia) {
  const d = new Date(hoyVE() + 'T12:00')
  d.setDate(d.getDate() + (dia.relativo || 0))
  return toFechaVE(d)
}

/* El cupo es de la fecha que este día representa ahora (los de semanas pasadas no) */
export const esVigente = (dia, slot) => !slot.dia_fecha || slot.dia_fecha === fechaDelDia(dia)

export const slotsVigentes = (dia) => (dia.slots || []).filter(s => esVigente(dia, s))

export function estaOcupado(dia, slot) {
  if (!slot.ocupado) return false
  return !slot.fecha || slot.fecha === fechaDelDia(dia)
}

export function marcarOcupado(dia, slot, ocupado) {
  return ocupado
    ? { ...slot, ocupado: true, fecha: fechaDelDia(dia), cita: null }
    : { ...slot, ocupado: false, fecha: null, cita: null }
}

const CITA_ACTIVA = (c) => c.hora && c.estado !== 'cancelada' && c.estado !== 'no_asistio'

/* Pone al día los cupos de un día y devuelve el día cambiado, o null si no cambió nada:
   - borra los cupos de fechas que ya pasaron,
   - fecha los cupos viejos que no tenían fecha (pasan a ser de esta semana),
   - ocupa los cupos que tienen cita y libera los que la perdieron (cancelada, borrada o movida).
   Las marcas manuales de ocupado no se tocan. */
export function aplicarCitas(dia, citas) {
  const fecha = fechaDelDia(dia)
  const delDia = citas.filter(c => c.fecha === fecha && CITA_ACTIVA(c))
  const antes = dia.slots || []
  let cambio = false
  const slots = antes.filter(s => esVigente(dia, s)).map(s => {
    let r = s
    if (!r.dia_fecha) r = { ...r, dia_fecha: fecha }
    const cita = delDia.find(c => c.hora.slice(0, 5) >= r.inicio && c.hora.slice(0, 5) < r.fin)
    if (cita) {
      if (!(r.ocupado && r.fecha === fecha && r.cita === cita.id)) r = { ...r, ocupado: true, fecha, cita: cita.id }
    } else if (r.cita) {
      r = { ...r, ocupado: false, fecha: null, cita: null }
    } else if (r.ocupado && !r.fecha) {
      r = { ...r, fecha }
    }
    if (r !== s) cambio = true
    return r
  })
  if (slots.length !== antes.length) cambio = true
  return cambio ? { ...dia, slots } : null
}

export const libresDe = (dia) =>
  dia.abierto ? slotsVigentes(dia).filter(s => !estaOcupado(dia, s) && !yaPaso(dia, s)).length : 0
