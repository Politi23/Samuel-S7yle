import { supabase } from './supabase'
import { ordenarDesdeHoy, aplicarCitas, libresDe } from './horario'

// Mantiene el horario público al día con las citas: ocupa los cupos que tienen
// cita y libera los que la perdieron. Corre en cola para que dos cambios
// seguidos de citas no se pisen.
let cola = Promise.resolve()

export function sincronizarHorario(userId, citas) {
  if (!userId) return cola
  cola = cola.then(() => sincronizar(userId, citas)).catch(err => {
    console.error('[Horario] No se pudo sincronizar con las citas:', err.message)
  })
  return cola
}

async function sincronizar(userId, citas) {
  const { data, error } = await supabase
    .from('disponibilidad')
    .select('id, dia, orden, abierto, slots')
    .eq('user_id', userId)
  if (error) throw error
  if (!data?.length) return

  const dias = ordenarDesdeHoy(data.map(d => ({ ...d, slots: Array.isArray(d.slots) ? d.slots : [] })))
  const cambios = dias.map(d => aplicarCitas(d, citas)).filter(Boolean)

  await Promise.all(cambios.map(d =>
    supabase.from('disponibilidad')
      .update({ slots: d.slots, cupos: libresDe(d), updated_at: new Date().toISOString() })
      .eq('id', d.id)
      .then(({ error: e }) => { if (e) throw e })
  ))
}
