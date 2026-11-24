import { ahoraVE, hoyVE } from './fecha'

// Lógica compartida del horario (admin /disponibilidad y público /horario).
//
// La tabla `disponibilidad` tiene una fila por día de la semana (orden 0 = lunes
// … 6 = domingo). Samuel no tiene horario fijo: cada cupo pertenece a una fecha
// concreta, y en la fila de un día de la semana conviven los cupos de todas sus
// fechas futuras (el lunes 1, el lunes 8, el lunes 15…). Así se puede planificar
// el mes completo sin cambiar la base de datos. Los cupos de fechas pasadas se
// borran solos.
//
// slots: [{ id, dia_fecha: 'YYYY-MM-DD', inicio: 'HH:MM', fin: 'HH:MM',
//           ocupado: bool, fecha?: 'YYYY-MM-DD', cita?: id }]
//
// Una "vista de día" es la fila de su día de la semana con `fecha`, `relativo`
// (0 = hoy, 1 = mañana…) y solo los cupos de esa fecha.

export const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
export const DIAS_CORTOS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
export const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

/* ── Fechas (texto YYYY-MM-DD, sumadas en UTC para no correrse por zona horaria) ── */

export const hoy = () => hoyVE()

export function sumarDias(iso, n) {
  const d = new Date(iso + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

export const diasEntre = (desde, hasta) =>
  Math.round((Date.parse(hasta + 'T00:00:00Z') - Date.parse(desde + 'T00:00:00Z')) / 86400000)

/* 0 = lunes … 6 = domingo */
export const ordenSemana = (iso) => (new Date(iso + 'T00:00:00Z').getUTCDay() + 6) % 7

/* Próxima fecha (desde hoy) que cae en el día de la semana de esta fila */
export const proximaFecha = (fila, desde = hoy()) =>
  sumarDias(desde, (fila.orden - ordenSemana(desde) + 7) % 7)

/* ── Vistas de día ───────────────────────────────────────────── */

export const filaDeFecha = (filas, fecha) => filas.find(f => f.orden === ordenSemana(fecha)) || null

/* Fecha a la que pertenece un cupo (los viejos sin fecha son de la próxima de su día) */
const fechaDeCupo = (fila, slot) => slot.dia_fecha || proximaFecha(fila)

export function vistaDia(filas, fecha) {
  const fila = filaDeFecha(filas, fecha)
  if (!fila) return null
  return {
    ...fila,
    fecha,
    relativo: diasEntre(hoy(), fecha),
    slots: ordenarSlots((fila.slots || []).filter(s => fechaDeCupo(fila, s) === fecha)),
  }
}

/* Vistas de los próximos `n` días, empezando hoy */
export const proximosDias = (filas, n = 7) =>
  Array.from({ length: n }, (_, i) => vistaDia(filas, sumarDias(hoy(), i))).filter(Boolean)

/* Fila con los cupos de `fecha` reemplazados por `slotsFecha` (el resto de fechas intacto) */
export function reemplazarFecha(fila, fecha, slotsFecha) {
  const otros = (fila.slots || []).filter(s => fechaDeCupo(fila, s) !== fecha)
  return { ...fila, slots: [...otros, ...slotsFecha.map(s => ({ ...s, dia_fecha: fecha }))] }
}

export function etiquetaDia(dia) {
  if (dia.relativo === 0) return 'Hoy'
  if (dia.relativo === 1) return 'Mañana'
  return DIAS[ordenSemana(dia.fecha)]
}

/* "lunes 1 de diciembre" */
export function fechaLarga(iso) {
  const [, m, d] = iso.split('-').map(Number)
  return `${DIAS[ordenSemana(iso)].toLowerCase()} ${d} de ${MESES[m - 1].toLowerCase()}`
}

/* ── Horas ───────────────────────────────────────────────────── */

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

/* Devuelve un mensaje si la lista de cupos de un día tiene algo inválido, o null */
export function validarSlots(slots) {
  const malo = slots.find(s => !s.inicio || !s.fin || s.inicio >= s.fin)
  if (malo) return `El cupo de ${fmtHora(malo.inicio) || '—'} termina antes de empezar`
  const ord = ordenarSlots(slots)
  for (let i = 0; i < ord.length - 1; i++) {
    if (ord[i].fin > ord[i + 1].inicio) return `Los cupos de ${fmtHora(ord[i].inicio)} y ${fmtHora(ord[i + 1].inicio)} se cruzan`
  }
  return null
}

/* Valida cada fecha de una fila por separado */
export function validarFila(fila) {
  const porFecha = {}
  for (const s of fila.slots || []) (porFecha[fechaDeCupo(fila, s)] ||= []).push(s)
  for (const [fecha, slots] of Object.entries(porFecha)) {
    const error = validarSlots(slots)
    if (error) return `${fechaLarga(fecha)}: ${error}`
  }
  return null
}

/* ── Estado de un cupo dentro de una vista de día ────────────── */

/* Un cupo de hoy cuya hora de inicio ya pasó (hora de Caracas) */
export const yaPaso = (dia, slot) => dia.fecha === hoy() && slot.inicio <= ahoraVE()

export function estaOcupado(dia, slot) {
  if (!slot.ocupado) return false
  return !slot.fecha || slot.fecha === dia.fecha
}

export function marcarOcupado(dia, slot, ocupado) {
  return ocupado
    ? { ...slot, ocupado: true, fecha: dia.fecha, cita: null }
    : { ...slot, ocupado: false, fecha: null, cita: null }
}

export const libresDe = (dia) =>
  dia.abierto ? (dia.slots || []).filter(s => !estaOcupado(dia, s) && !yaPaso(dia, s)).length : 0

/* ── Mantenimiento de una fila completa ──────────────────────── */

const CITA_ACTIVA = (c) => c.hora && c.estado !== 'cancelada' && c.estado !== 'no_asistio'

/* Pone al día los cupos de una fila (todas sus fechas) y devuelve la fila cambiada,
   o null si no cambió nada:
   - borra los cupos de fechas que ya pasaron,
   - fecha los cupos viejos que no tenían fecha (pasan a ser de la próxima de su día),
   - ocupa los cupos que tienen cita ese día y libera los que la perdieron
     (cancelada, borrada o movida). Las marcas manuales de ocupado no se tocan. */
export function aplicarCitas(fila, citas) {
  const hoyStr = hoy()
  const activas = citas.filter(CITA_ACTIVA)
  const antes = fila.slots || []
  let cambio = false
  const slots = []
  for (const s of antes) {
    const fecha = fechaDeCupo(fila, s)
    if (fecha < hoyStr) { cambio = true; continue }
    let r = s.dia_fecha ? s : { ...s, dia_fecha: fecha }
    const cita = activas.find(c => c.fecha === fecha && c.hora.slice(0, 5) >= r.inicio && c.hora.slice(0, 5) < r.fin)
    if (cita) {
      if (!(r.ocupado && r.fecha === fecha && r.cita === cita.id)) r = { ...r, ocupado: true, fecha, cita: cita.id }
    } else if (r.cita) {
      r = { ...r, ocupado: false, fecha: null, cita: null }
    } else if (r.ocupado && !r.fecha) {
      r = { ...r, fecha }
    }
    if (r !== s) cambio = true
    slots.push(r)
  }
  return cambio ? { ...fila, slots } : null
}

/* Cupos libres de una fila en todas sus fechas futuras (para la columna `cupos`) */
export function libresFila(fila) {
  if (!fila.abierto) return 0
  const hoyStr = hoy()
  return (fila.slots || []).filter(s => {
    const fecha = fechaDeCupo(fila, s)
    if (fecha < hoyStr) return false
    const vista = { fecha }
    return !estaOcupado(vista, s) && !yaPaso(vista, s)
  }).length
}
