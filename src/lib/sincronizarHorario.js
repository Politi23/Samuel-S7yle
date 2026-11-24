import { supabase } from './supabase'
import { aplicarCitas, libresFila } from './horario'

// Mantiene el horario público al día con las citas: ocupa los cupos que tienen
// cita, libera los que la perdieron y borra los de fechas pasadas. Corre en cola
// para que dos cambios seguidos de citas no se pisen.
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

  const cambios = data
    .map(f => aplicarCitas({ ...f, slots: Array.isArray(f.slots) ? f.slots : [] }, citas))
    .filter(Boolean)

  await Promise.all(cambios.map(f =>
    supabase.from('disponibilidad')
      .update({ slots: f.slots, cupos: libresFila(f), updated_at: new Date().toISOString() })
      .eq('id', f.id)
      .then(({ error: e }) => { if (e) throw e })
  ))
}
