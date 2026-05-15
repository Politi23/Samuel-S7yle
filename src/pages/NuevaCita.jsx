import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, useParams } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { useToast } from '../context/ToastContext'
import { Save, Search } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import { hoyVE } from '../lib/fecha'

const MOTIVOS = ['Corte de cabello','Afeitado','Diseño de barba','Corte + Barba','Coloración','Cejas','Colorimetría','Pigmentación','Tratamiento capilar','Lavado','Diseño','Otro']

export default function NuevaCita() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { id: editId } = useParams()
  const { clientes, citas, agregarCita, actualizarCita } = useApp()
  const fechaParam   = searchParams.get('fecha')   || hoyVE()
  const clienteParam = searchParams.get('cliente') || ''

  const esEdicion = !!editId
  const citaExistente = esEdicion ? citas.find(c => c.id === editId) : null
  const toast = useToast()

  const [form, setForm] = useState({ cliente_id:'', cliente_nombre:'', fecha: fechaParam, hora:'', motivos:[], motivo_custom:'', notas:'' })
  const [busqueda, setBusqueda] = useState('')
  const [mostrarBuscador, setMostrarBuscador] = useState(!clienteParam && !esEdicion)
  const [errores, setErrores] = useState({})
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    if (esEdicion && citaExistente) {
      const partes = citaExistente.motivo ? citaExistente.motivo.split(' + ') : ['Corte de cabello']
      const enLista = partes.filter(p => MOTIVOS.includes(p))
      const custom  = partes.filter(p => !MOTIVOS.includes(p)).join(', ')
      setForm({
        cliente_id: citaExistente.cliente_id,
        cliente_nombre: citaExistente.cliente_nombre,
        fecha: citaExistente.fecha,
        hora: citaExistente.hora || '',
        motivos: enLista.length ? (custom ? [...enLista, 'Otro'] : enLista) : ['Otro'],
        motivo_custom: custom,
        notas: citaExistente.notas || ''
      })
      setMostrarBuscador(false)
    }
  }, [esEdicion, citaExistente])

  useEffect(() => {
    if (!esEdicion && clienteParam) {
      const c = clientes.find(c => c.id === clienteParam)
      if (c) { setForm(prev => ({ ...prev, cliente_id: c.id, cliente_nombre: `${c.nombre} ${c.apellido}` })); setMostrarBuscador(false) }
    }
  }, [clienteParam, clientes, esEdicion])

  const set = (c, v) => { setForm(prev => ({ ...prev, [c]: v })); if (errores[c]) setErrores(prev => ({ ...prev, [c]: '' })) }
  const seleccionar = (c) => { setForm(prev => ({ ...prev, cliente_id: c.id, cliente_nombre: `${c.nombre} ${c.apellido}` })); setMostrarBuscador(false); setBusqueda('') }
  const recientes = clientes.slice(0, 5)
  const filtrados = busqueda.trim()
    ? clientes.filter(c => { const q = busqueda.toLowerCase(); return c.nombre.toLowerCase().includes(q) || c.apellido.toLowerCase().includes(q) || (c.telefono||'').includes(q) }).slice(0, 8)
    : recientes

  const toggleMotivo = (m) => {
    setForm(prev => {
      const ya = prev.motivos.includes(m)
      const next = ya ? prev.motivos.filter(x => x !== m) : [...prev.motivos, m]
      return { ...prev, motivos: next }
    })
  }

  const guardar = async () => {
    const e = {}
    if (!form.cliente_id) e.cliente_id = 'Selecciona un cliente'
    if (!form.fecha) e.fecha = 'Requerido'
    if (!form.hora)  e.hora  = 'Requerido'
    setErrores(e)
    if (Object.keys(e).length) return
    const partes = form.motivos.length
      ? form.motivos.map(m => m === 'Otro' ? (form.motivo_custom.trim() || 'Otro') : m)
      : ['Sin especificar']
    const motivo = partes.join(' + ')
    const datos = { cliente_id: form.cliente_id, cliente_nombre: form.cliente_nombre, fecha: form.fecha, hora: form.hora, motivo, notas: form.notas.trim() }
    setGuardando(true)
    try {
      if (esEdicion) {
        await actualizarCita(editId, datos)
        toast('Cita actualizada', 'success')
        navigate(-1)
      } else {
        await agregarCita(datos)
        toast('Cita agendada', 'success')
        navigate('/citas')
      }
    } catch (err) {
      toast(err.message || 'Error al guardar', 'error')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="min-h-screen">
      <PageHeader title={esEdicion ? 'Editar Cita' : 'Nueva Cita'} back />

      <div className="px-4 pt-4 pb-6 space-y-4">

        {/* Cliente */}
        <div className="glass-card space-y-3">
          <label className="glass-label">Cliente *</label>
          {form.cliente_id && !mostrarBuscador ? (
            <div className="flex items-center justify-between rounded-2xl px-3 py-3"
                 style={{background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.15)'}}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{background:'rgba(217,119,6,0.20)'}}>
                  <span className="text-amber-300 font-bold text-xs">{form.cliente_nombre.split(' ').map(n=>n[0]).slice(0,2).join('')}</span>
                </div>
                <span className="text-white text-sm font-semibold">{form.cliente_nombre}</span>
              </div>
              {!esEdicion && <button onClick={() => { setMostrarBuscador(true); set('cliente_id',''); set('cliente_nombre','') }} className="text-white/45 text-xs">Cambiar</button>}
            </div>
          ) : (
            <div className="space-y-2">
              <div className="relative">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
                <input className="glass-input" style={{paddingLeft:'40px'}} placeholder="Buscar cliente..."
                       value={busqueda} onChange={e => setBusqueda(e.target.value)} autoFocus />
              </div>
              {!busqueda.trim() && recientes.length > 0 && <p className="text-white/30 text-xs px-1">Recientes</p>}
              {filtrados.length > 0 && (
                <div className="space-y-1 max-h-52 overflow-y-auto">
                  {filtrados.map(c => (
                    <button key={c.id} onClick={() => seleccionar(c)} className="w-full flex items-center gap-3 rounded-2xl px-3 py-2.5 active:bg-white/10 text-left" style={{background:'rgba(255,255,255,0.06)'}}>
                      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{background:'rgba(217,119,6,0.20)'}}>
                        <span className="text-amber-300 font-bold text-xs">{c.nombre[0].toUpperCase()}{c.apellido[0].toUpperCase()}</span>
                      </div>
                      <div>
                        <p className="text-white text-sm font-semibold">{c.nombre} {c.apellido}</p>
                        {c.telefono && <p className="text-white/40 text-xs">{c.telefono}</p>}
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {errores.cliente_id && <p className="text-red-400 text-xs">{errores.cliente_id}</p>}
            </div>
          )}
        </div>

        {/* Detalles */}
        <div className="glass-card space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="glass-label">Fecha *</label>
              <input type="date" className={`glass-input${errores.fecha ? ' error' : ''}`}
                     value={form.fecha} onChange={e => set('fecha', e.target.value)} />
              {errores.fecha && <p className="text-red-400 text-xs mt-1">{errores.fecha}</p>}
            </div>
            <div>
              <label className="glass-label">Hora *</label>
              <input type="time" className={`glass-input${errores.hora ? ' error' : ''}`}
                     value={form.hora} onChange={e => set('hora', e.target.value)} />
              {errores.hora && <p className="text-red-400 text-xs mt-1">{errores.hora}</p>}
            </div>
          </div>

          <div>
            <label className="glass-label">Servicio <span className="text-white/35 font-normal">(puedes elegir varios)</span></label>
            <div className="flex flex-wrap gap-2 mt-1">
              {MOTIVOS.map(m => {
                const activo = form.motivos.includes(m)
                return (
                  <button key={m} type="button" onClick={() => toggleMotivo(m)}
                          className="px-3 py-1.5 rounded-2xl text-xs font-semibold transition-all"
                          style={{
                            background: activo ? 'rgba(217,119,6,0.45)' : 'rgba(255,255,255,0.08)',
                            border: `1px solid ${activo ? 'rgba(217,119,6,0.70)' : 'rgba(255,255,255,0.15)'}`,
                            color: activo ? 'white' : 'rgba(255,255,255,0.50)',
                          }}>
                    {m}
                  </button>
                )
              })}
            </div>
            {form.motivos.includes('Otro') && (
              <input className="glass-input mt-2" placeholder="Especifica el servicio..."
                     value={form.motivo_custom} onChange={e => set('motivo_custom', e.target.value)} maxLength={120} />
            )}
          </div>

          <div>
            <label className="glass-label">Notas</label>
            <input className="glass-input" placeholder="Indicaciones, recordatorios..."
                   value={form.notas} onChange={e => set('notas', e.target.value)} maxLength={200} />
          </div>
        </div>

        <button onClick={guardar} disabled={guardando} className="glass-btn-primary" style={guardando ? {opacity:0.6} : {}}>
          <Save size={18} />
          {guardando ? 'Guardando…' : esEdicion ? 'Guardar cambios' : 'Agendar cita'}
        </button>
      </div>
    </div>
  )
}
