const TZ = 'America/Caracas'

export function hoyVE() {
  return new Date().toLocaleDateString('en-CA', { timeZone: TZ })
}

export function toFechaVE(date = new Date()) {
  return date.toLocaleDateString('en-CA', { timeZone: TZ })
}

export function ahoraVE() {
  return new Date().toLocaleTimeString('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit' })
}
