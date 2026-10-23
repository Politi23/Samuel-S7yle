// Cumpleaños de clientes de hoy a `dias` días, ordenados del más cercano al más lejano.
// Las fechas son 'YYYY-MM-DD' (hoy en hora de Caracas). Los nacidos un 29 de febrero
// cumplen el 28 en los años que no son bisiestos.

const DIA_MS = 86400000
const esBisiesto = (a) => (a % 4 === 0 && a % 100 !== 0) || a % 400 === 0

function fechaCumple(anio, mes, dia) {
  if (mes === 2 && dia === 29 && !esBisiesto(anio)) return Date.UTC(anio, 1, 28)
  return Date.UTC(anio, mes - 1, dia)
}

export function cumpleanosProximos(clientes, hoyStr, dias = 7) {
  const [ah, mh, dh] = hoyStr.split('-').map(Number)
  const hoy = Date.UTC(ah, mh - 1, dh)
  const lista = []
  for (const c of clientes) {
    if (!c.fecha_nacimiento) continue
    const [an, mn, dn] = c.fecha_nacimiento.split('-').map(Number)
    if (!mn || !dn) continue
    let anio = ah
    let cumple = fechaCumple(anio, mn, dn)
    if (cumple < hoy) { anio += 1; cumple = fechaCumple(anio, mn, dn) }
    const enDias = Math.round((cumple - hoy) / DIA_MS)
    if (enDias > dias) continue
    const edad = an > 1900 ? anio - an : null
    lista.push({ cliente: c, enDias, fecha: new Date(cumple).toISOString().slice(0, 10), edad })
  }
  return lista.sort((a, b) => a.enDias - b.enDias || (a.cliente.nombre || '').localeCompare(b.cliente.nombre || ''))
}

/* "Mañana", "Vie 24/10" */
export function cuandoCumple({ enDias, fecha }) {
  if (enDias === 0) return 'Hoy'
  if (enDias === 1) return 'Mañana'
  const d = new Date(fecha + 'T12:00:00Z')
  const dia = d.toLocaleDateString('es-VE', { weekday: 'short', timeZone: 'UTC' }).replace('.', '')
  const [, mm, dd] = fecha.split('-')
  return `${dia.charAt(0).toUpperCase()}${dia.slice(1)} ${dd}/${mm}`
}
