import { ahoraVE, hoyVE, toFechaVE } from './fecha'

// Lógica compartida del horario semanal (admin /disponibilidad y público /horario).
// Cada fila de `disponibilidad` es un día de la semana con su lista de cupos:
// slots: [{ id, inicio: 'HH:MM', fin: 'HH:MM', ocupado: bool }]

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

export function nuevoSlot(inicio, duracion) {
  return { id: crypto.randomUUID(), inicio, fin: deMinutos(aMinutos(inicio) + duracion), ocupado: false }
}

/* Cupos seguidos de `duracion` minutos entre `desde` y `hasta` */
export function generarSlots(desde, hasta, duracion) {
  const slots = []
  const fin = aMinutos(hasta)
  for (let t = aMinutos(desde); t + duracion <= fin; t += duracion) {
    slots.push(nuevoSlot(deMinutos(t), duracion))
  }
  return slots
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

/* ── Ocupación por fecha ─────────────────────────────────────────
   Los cupos son una plantilla semanal. Un cupo "ocupado" guarda la fecha
   de esa ocupación, así la semana siguiente vuelve a salir libre solo.
   Los ocupados por una cita guardan además `cita` (su id).            */

/* Fecha (YYYY-MM-DD, hora de Caracas) que representa este día en los próximos 7 */
export function fechaDelDia(dia) {
  const d = new Date(hoyVE() + 'T12:00')
  d.setDate(d.getDate() + (dia.relativo || 0))
  return toFechaVE(d)
}

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

/* Aplica las citas a los cupos de un día: ocupa los que tienen cita, libera los
   que quedaron sin cita (cancelada, borrada o movida). Las marcas manuales no se tocan. */
export function aplicarCitas(dia, citas) {
  const fecha = fechaDelDia(dia)
  const delDia = citas.filter(c => c.fecha === fecha && CITA_ACTIVA(c))
  let cambio = false
  const slots = (dia.slots || []).map(s => {
    const cita = delDia.find(c => c.hora.slice(0, 5) >= s.inicio && c.hora.slice(0, 5) < s.fin)
    if (cita) {
      if (s.ocupado && s.fecha === fecha && s.cita === cita.id) return s
      cambio = true
      return { ...s, ocupado: true, fecha, cita: cita.id }
    }
    if (s.cita) {
      cambio = true
      return { ...s, ocupado: false, fecha: null, cita: null }
    }
    // Marca vieja sin fecha: se fija a la fecha de esta semana para que expire sola
    if (s.ocupado && !s.fecha) {
      cambio = true
      return { ...s, fecha }
    }
    return s
  })
  return cambio ? { ...dia, slots } : null
}

export const libresDe = (dia) =>
  dia.abierto ? (dia.slots || []).filter(s => !estaOcupado(dia, s) && !yaPaso(dia, s)).length : 0
