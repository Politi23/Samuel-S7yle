// Para quién es un registro. Vacío = la persona dueña del número.
export const PARENTESCOS = [
  { valor: '',         registro: 'Para mí',       app: 'Titular' },
  { valor: 'hijo',     registro: 'Mi hijo',       app: 'Hijo' },
  { valor: 'hija',     registro: 'Mi hija',       app: 'Hija' },
  { valor: 'familiar', registro: 'Otro familiar', app: 'Familiar' },
]

/* "Hija de Carlos Pérez", "Familiar de Ana Gómez", o null si es el titular */
export function etiquetaParentesco(cliente) {
  const p = PARENTESCOS.find(x => x.valor && x.valor === cliente?.parentesco)
  if (!p) return null
  return cliente.representante ? `${p.app} de ${cliente.representante}` : p.app
}

/* "hija", "hijo", "familiar" para listar dentro de una familia */
export const parentescoCorto = (cliente) => PARENTESCOS.find(x => x.valor && x.valor === cliente?.parentesco)?.app.toLowerCase() || null
