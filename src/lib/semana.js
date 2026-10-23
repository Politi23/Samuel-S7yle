// Ingresos de la semana en curso (lunes a domingo, hora de Venezuela).
// Las fechas son texto 'YYYY-MM-DD' y se suman en UTC para que la zona horaria
// del teléfono no corra el día.

const DIAS_CORTOS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

export function sumarDias(iso, n) {
  const d = new Date(iso + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

/* 0 = lunes … 6 = domingo */
const diaDeLaSemana = (iso) => (new Date(iso + 'T00:00:00Z').getUTCDay() + 6) % 7

/* Total en USD: USD directo + Bs a la tasa EUR guardada en cada cobro
   (o a `tasaRespaldo` si el cobro no tiene tasa) */
export function aUsd(lista, tasaRespaldo = null) {
  return lista.reduce((a, i) => {
    if (i.moneda === 'USD') return a + Number(i.monto)
    const t = Number(i.tasa_bcv) || tasaRespaldo
    return t ? a + Number(i.monto) / t : a
  }, 0)
}

export const fechaCorta = (iso) => {
  const [, m, d] = iso.split('-')
  return `${Number(d)} ${MESES_CORTOS[Number(m) - 1]}`
}

export function resumenSemana(ingresos, hoyStr, tasaRespaldo = null) {
  const lunes = sumarDias(hoyStr, -diaDeLaSemana(hoyStr))
  const domingo = sumarDias(lunes, 6)
  const lunesPrevio = sumarDias(lunes, -7)
  const enRango = (i, desde, hasta) => i.fecha && i.fecha >= desde && i.fecha <= hasta

  const deLaSemana = ingresos.filter(i => enRango(i, lunes, domingo))
  // La semana pasada se compara hasta el mismo día de la semana, para que un
  // martes no se compare contra una semana pasada completa
  const hoyIdx = diaDeLaSemana(hoyStr)
  const previaHastaHoy = ingresos.filter(i => enRango(i, lunesPrevio, sumarDias(lunesPrevio, hoyIdx)))
  const total = aUsd(deLaSemana, tasaRespaldo)
  const totalPrevio = aUsd(previaHastaHoy, tasaRespaldo)

  const dias = DIAS_CORTOS.map((etiqueta, k) => {
    const fecha = sumarDias(lunes, k)
    const delDia = deLaSemana.filter(i => i.fecha === fecha)
    return { fecha, etiqueta, total: aUsd(delDia, tasaRespaldo), cantidad: delDia.length, esHoy: fecha === hoyStr, esFuturo: fecha > hoyStr }
  })

  return {
    lunes, domingo, total, totalPrevio,
    pct: totalPrevio > 0 ? ((total - totalPrevio) / totalPrevio) * 100 : null,
    cantidad: deLaSemana.length,
    dias,
    tope: Math.max(0, ...dias.map(d => d.total)),
  }
}
