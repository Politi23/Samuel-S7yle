import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const AppContext = createContext()

export function AppProvider({ children }) {
  const [clientes,  setClientes]  = useState([])
  const [ingresos,  setIngresos]  = useState([])
  const [citas,     setCitas]     = useState([])
  const [egresos,   setEgresos]   = useState([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState(null)

  useEffect(() => {
    let cancelled = false

    async function cargarDatos() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session || cancelled) {
        if (!cancelled) setLoading(false)
        return
      }
      try {
        const [resClientes, resIngresos, resCitas, resEgresos] = await Promise.all([
          supabase.from('clientes').select('*').order('created_at', { ascending: false }).limit(5000),
          supabase.from('ingresos').select('*').order('created_at', { ascending: false }).limit(5000),
          supabase.from('citas').select('*').order('created_at',    { ascending: false }).limit(5000),
          supabase.from('egresos').select('*').order('created_at',  { ascending: false }).limit(5000),
        ])

        if (cancelled) return

        if (resClientes.error) throw resClientes.error
        if (resIngresos.error) throw resIngresos.error
        if (resCitas.error)    throw resCitas.error
        if (resEgresos.error)  throw resEgresos.error

        setClientes(resClientes.data || [])
        setIngresos(resIngresos.data || [])
        setCitas(resCitas.data       || [])
        setEgresos(resEgresos.data   || [])
      } catch (err) {
        if (!cancelled) {
          console.error('[Supabase] Error al cargar datos:', err.message)
          setError(err.message)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    cargarDatos()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        setLoading(true)
        setError(null)
        cargarDatos()
      } else if (event === 'SIGNED_OUT') {
        setClientes([])
        setIngresos([])
        setCitas([])
        setEgresos([])
        setLoading(false)
      }
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [])

  // ── Clientes ───────────────────────────────────────────────
  const agregarCliente = async (datos) => {
    const { data, error } = await supabase.from('clientes').insert(datos).select().single()
    if (error) throw error
    setClientes(prev => [data, ...prev])
    return data
  }

  const actualizarCliente = async (id, datos) => {
    const { data, error } = await supabase.from('clientes').update(datos).eq('id', id).select().single()
    if (error) throw error
    setClientes(prev => prev.map(c => c.id === id ? data : c))
  }

  const eliminarCliente = async (id) => {
    const { error } = await supabase.from('clientes').delete().eq('id', id)
    if (error) throw error
    setClientes(prev => prev.filter(c => c.id !== id))
    setIngresos(prev => prev.filter(i => i.cliente_id !== id))
    setCitas(prev    => prev.filter(c => c.cliente_id !== id))
  }

  // ── Ingresos ───────────────────────────────────────────────
  const agregarIngreso = async (datos) => {
    const { data, error } = await supabase.from('ingresos').insert(datos).select().single()
    if (error) throw error
    setIngresos(prev => [data, ...prev])
    return data
  }

  const actualizarIngreso = async (id, datos) => {
    const { data, error } = await supabase.from('ingresos').update(datos).eq('id', id).select().single()
    if (error) throw error
    setIngresos(prev => prev.map(i => i.id === id ? data : i))
  }

  const eliminarIngreso = async (id) => {
    const { error } = await supabase.from('ingresos').delete().eq('id', id)
    if (error) throw error
    setIngresos(prev => prev.filter(i => i.id !== id))
  }

  // ── Citas ──────────────────────────────────────────────────
  const agregarCita = async (datos) => {
    const { data, error } = await supabase.from('citas').insert(datos).select().single()
    if (error) throw error
    setCitas(prev => [data, ...prev])
    return data
  }

  const actualizarCita = async (id, datos) => {
    const { data, error } = await supabase.from('citas').update(datos).eq('id', id).select().single()
    if (error) throw error
    setCitas(prev => prev.map(c => c.id === id ? data : c))
  }

  const eliminarCita = async (id) => {
    const { error } = await supabase.from('citas').delete().eq('id', id)
    if (error) throw error
    setCitas(prev => prev.filter(c => c.id !== id))
  }

  // ── Egresos ────────────────────────────────────────────────
  const agregarEgreso = async (datos) => {
    const { data, error } = await supabase.from('egresos').insert(datos).select().single()
    if (error) throw error
    setEgresos(prev => [data, ...prev])
    return data
  }

  const actualizarEgreso = async (id, datos) => {
    const { data, error } = await supabase.from('egresos').update(datos).eq('id', id).select().single()
    if (error) throw error
    setEgresos(prev => prev.map(e => e.id === id ? data : e))
  }

  const eliminarEgreso = async (id) => {
    const { error } = await supabase.from('egresos').delete().eq('id', id)
    if (error) throw error
    setEgresos(prev => prev.filter(e => e.id !== id))
  }

  return (
    <AppContext.Provider value={{
      clientes, ingresos, citas, egresos,
      loading, error,
      agregarCliente, actualizarCliente, eliminarCliente,
      agregarIngreso, actualizarIngreso, eliminarIngreso,
      agregarCita, actualizarCita, eliminarCita,
      agregarEgreso, actualizarEgreso, eliminarEgreso,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export const useApp = () => useContext(AppContext)
