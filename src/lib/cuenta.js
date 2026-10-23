import { useState, useEffect } from 'react'
import { supabase } from './supabase'

// Las páginas públicas (/horario y /registro) son de Samuel. Un link sin marca
// siempre es de su cuenta. Las demás cuentas (por ejemplo la de pruebas) generan
// links con `?b=<id>` para probar sin tocar lo de Samuel.
export const CORREO_SAMUEL = 'ss7barbershop@gmail.com'

const ES_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/* Cuenta que pide el link público, o null si es el de Samuel */
export function cuentaDelLink() {
  const b = new URLSearchParams(window.location.search).get('b')
  return b && ES_UUID.test(b) ? b : null
}

/* Marca que la sesión actual agrega a sus links públicos: '' para Samuel,
   '?b=<id>' para cualquier otra cuenta, null mientras se averigua */
export function useMarcaCuenta() {
  const [marca, setMarca] = useState(null)
  useEffect(() => {
    let vivo = true
    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user
      if (vivo) setMarca(!u || u.email === CORREO_SAMUEL ? '' : `?b=${u.id}`)
    })
    return () => { vivo = false }
  }, [])
  return marca
}
