import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, useParams } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { useBcv } from '../hooks/useBcv'
import { useToast } from '../context/ToastContext'
import { Save, Search } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import { hoyVE } from '../lib/fecha'

const SERVICIOS = ['Corte de cabello','Afeitado','Diseño de barba','Corte + Barba','Coloración','Cejas','Colorimetría','Pigmentación','Tratamiento capilar','Lavado','Diseño','Otro']
const METODOS   = ['Efectivo USD','Efectivo Bs','Transferencia bancaria','Zelle','PayPal','Pago Móvil','Binance / Cripto','Otro']
const METODOS_BS  = ['Efectivo Bs', 'Transferencia bancaria', 'Pago Móvil']
const METODOS_USD = ['Efectivo USD', 'Zelle', 'PayPal', 'Binance / Cripto']

export default function NuevoIngreso() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { id: editId } = useParams()
  const { clientes, ingresos, agregarIngreso, actualizarIngreso } = useApp()
  const { data: bcv } = useBcv()
  const clienteParam = searchParams.get('cliente') || ''
  const esEdicion = !!editId
  const ingresoExistente = esEdicion ? ingresos.find(i => i.id === editId) : null
  const toast = useToast()

  const [form, setForm] = useState({
    cliente_id: '', cliente_nombre: '',
    fecha: hoyVE(),
    servicios: [], servicio_custom: '',
    monto: '', moneda: 'USD',
    metodo_pago: 'Efectivo USD', notas: ''
  })
  const [busqueda, setBusqueda] = useState('')
  const [mostrarBuscador, setMostrarBuscador] = useState(!clienteParam && !esEdicion)
  const [errores, setErrores] = useState({})
  const [bsPersonalizado, setBsPersonalizado] = useState(false)
  const [montoBsCustom, setMontoBsCustom] = useState('')
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    if (esEdicion && ingresoExistente) {
      const partes = ingresoExistente.concepto ? ingresoExistente.concepto.split(' + ') : []
      const enLista = partes.filter(p => SERVICIOS.includes(p))
      const custom  = partes.filter(p => !SERVICIOS.includes(p)).join(', ')
      setForm({
        cliente_id: ingresoExistente.cliente_id,
        cliente_nombre: ingresoExistente.cliente_nombre,
        fecha: ingresoExistente.fecha,
        servicios: enLista.length ? (custom ? [...enLista, 'Otro'] : enLista) : ['Otro'],
        servicio_custom: custom,
        monto: String(ingresoExistente.monto),
        moneda: ingresoExistente.moneda,
        metodo_pago: ingresoExistente.metodo_pago,
        notas: ingresoExistente.notas || ''
      })
      setMostrarBuscador(false)
    }
  }, [esEdicion, ingresoExistente])

  useEffect(() => {
    if (!esEdicion && clienteParam) {
      const c = clientes.find(c => c.id === clienteParam)
      if (c) { setForm(prev => ({ ...prev, cliente_id: c.id, cliente_nombre: `${c.nombre} ${c.apellido}` })); setMostrarBuscador(false) }
    }
  }, [clienteParam, clientes, esEdicion])

  const set = (c, v) => { setForm(prev => ({ ...prev, [c]: v })); if (errores[c]) setErrores(prev => ({ ...prev, [c]: '' })) }

  const setMetodo = (metodo) => {
    let moneda = form.moneda
    if (METODOS_USD.includes(metodo)) moneda = 'USD'
    setBsPersonalizado(false); setMontoBsCustom('')
    setForm(prev => ({ ...prev, metodo_pago: metodo, moneda }))
  }

  const setMoneda = (moneda) => {
    setBsPersonalizado(false); setMontoBsCustom('')
    setForm(prev => ({ ...prev, moneda }))
  }

  const seleccionar = (c) => { setForm(prev => ({ ...prev, cliente_id: c.id, cliente_nombre: `${c.nombre} ${c.apellido}` })); setMostrarBuscador(false); setBusqueda('') }
  const recientes = clientes.slice(0, 5)
  const filtrados = busqueda.trim()
    ? clientes.filter(c => { const q = busqueda.toLowerCase(); return c.nombre.toLowerCase().includes(q) || c.apellido.toLowerCase().includes(q) || (c.telefono||'').includes(q) }).slice(0, 8)
    : recientes

  const tasaEur = bcv?.eur ?? null
  const monto = Number(form.monto)
  const esBs = form.moneda === 'Bs'
  const metodoBs = METODOS_BS.includes(form.metodo_pago)
  const soloUsd = ['Efectivo USD', 'Zelle', 'PayPal'].includes(form.metodo_pago)
  const mostrarConvBs = !esBs && metodoBs && monto > 0
  const montoBsAuto = tasaEur ? (monto * tasaEur).toFixed(2) : null
  const montoBsMostrar = bsPersonalizado ? montoBsCustom : montoBsAuto
  const montoEur = esBs && tasaEur && monto > 0 ? (monto / tasaEur).toFixed(2) : null

  const toggleServicio = (s) => {
    setForm(prev => {
      const ya = prev.servicios.includes(s)
      const next = ya ? prev.servicios.filter(x => x !== s) : [...prev.servicios, s]
      return { ...prev, servicios: next }
    })
  }

  const guardar = async () => {
    const e = {}
    if (!form.cliente_id) e.cliente_id = 'Selecciona un cliente'
    if (!form.monto || Number(form.monto) <= 0) e.monto = 'Monto inválido'
    setErrores(e)
    if (Object.keys(e).length) return
    const partes = form.servicios.length
      ? form.servicios.map(s => s === 'Otro' ? (form.servicio_custom.trim() || 'Otro') : s)
      : ['Sin especificar']
    const concepto = partes.join(' + ')
    const involucraBS = esBs || metodoBs
    const datos = {
      cliente_id: form.cliente_id, cliente_nombre: form.cliente_nombre,
      fecha: form.fecha, concepto,
      monto: Number(form.monto), moneda: form.moneda,
      metodo_pago: form.metodo_pago, notas: form.notas.trim(),
      tasa_bcv: involucraBS && tasaEur ? tasaEur : null
    }
    setGuardando(true)
    try {
      if (esEdicion) {
        await actualizarIngreso(editId, datos)
        toast('Ingreso actualizado', 'success')
        navigate(-1)
      } else {
        await agregarIngreso(datos)
        toast('Ingreso registrado', 'success')
        clienteParam ? navigate(`/clientes/${clienteParam}`) : navigate('/ingresos')
      }
    } catch (err) {
      toast(err.message || 'Error al guardar', 'error')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="min-h-screen">
      <PageHeader title={esEdicion ? 'Editar Ingreso' : 'Nuevo Ingreso'} back />

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
          <div>
            <label className="glass-label">Fecha</label>
            <input type="date" className="glass-input" value={form.fecha} onChange={e => set('fecha', e.target.value)} />
          </div>

          <div>
            <label className="glass-label">Servicio <span className="text-white/35 font-normal">(puedes elegir varios)</span></label>
            <div className="flex flex-wrap gap-2 mt-1">
              {SERVICIOS.map(s => {
                const activo = form.servicios.includes(s)
                return (
                  <button key={s} type="button" onClick={() => toggleServicio(s)}
                          className="px-3 py-1.5 rounded-2xl text-xs font-semibold transition-all"
                          style={{
                            background: activo ? 'rgba(217,119,6,0.45)' : 'rgba(255,255,255,0.08)',
                            border: `1px solid ${activo ? 'rgba(217,119,6,0.70)' : 'rgba(255,255,255,0.15)'}`,
                            color: activo ? 'white' : 'rgba(255,255,255,0.50)',
                          }}>
                    {s}
                  </button>
                )
              })}
            </div>
            {form.servicios.includes('Otro') && (
              <input className="glass-input mt-2" placeholder="Especifica el servicio..."
                     value={form.servicio_custom} onChange={e => set('servicio_custom', e.target.value)} maxLength={120} />
            )}
          </div>

          <div>
            <label className="glass-label">Método de pago</label>
            <select className="glass-input" value={form.metodo_pago} onChange={e => setMetodo(e.target.value)}>
              {METODOS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          <div>
            <label className="glass-label">Monto *</label>
            <div className="flex gap-2">
              <div className="flex rounded-2xl overflow-hidden flex-shrink-0" style={{border:'1px solid rgba(255,255,255,0.20)'}}>
                {['USD','Bs'].map(m => {
                  const bloqueado = soloUsd && m === 'Bs'
                  return (
                    <button key={m} onClick={() => !bloqueado && setMoneda(m)}
                            className="px-4 py-3 text-sm font-bold transition-colors"
                            style={{
                              background: form.moneda === m ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.06)',
                              color: bloqueado ? 'rgba(255,255,255,0.20)' : 'white',
                              cursor: bloqueado ? 'not-allowed' : 'pointer'
                            }}>
                      {m}
                    </button>
                  )
                })}
              </div>
              <input type="number" step="0.01" min="0"
                     className={`glass-input flex-1${errores.monto ? ' error' : ''}`}
                     placeholder="0.00" value={form.monto} onChange={e => set('monto', e.target.value)} />
            </div>
            {errores.monto && <p className="text-red-400 text-xs mt-1">{errores.monto}</p>}

            {mostrarConvBs && (
              <div className="mt-2 rounded-2xl px-3 py-2.5 space-y-2"
                   style={{background:'rgba(217,119,6,0.15)', border:'1px solid rgba(217,119,6,0.30)'}}>
                <div className="flex items-center justify-between">
                  <span className="text-amber-300/70 text-xs">Equivalente en Bs</span>
                  <button type="button"
                          onClick={() => { setBsPersonalizado(v => !v); setMontoBsCustom(montoBsAuto || '') }}
                          className="text-xs font-semibold"
                          style={{color: bsPersonalizado ? 'rgba(251,191,36,1)' : 'rgba(255,255,255,0.40)'}}>
                    {bsPersonalizado ? 'Usar BCV' : 'Personalizar'}
                  </button>
                </div>
                {bsPersonalizado ? (
                  <input type="number" step="0.01" min="0" className="glass-input"
                         placeholder="Monto en Bs exacto..." value={montoBsCustom}
                         onChange={e => setMontoBsCustom(e.target.value)} />
                ) : (
                  <div className="flex items-end justify-between">
                    {tasaEur ? (
                      <>
                        <p className="text-amber-200 text-sm font-bold">Bs {montoBsAuto}</p>
                        <p className="text-white/35 text-xs">Tasa EUR: {parseFloat(tasaEur.toFixed(4))}</p>
                      </>
                    ) : (
                      <p className="text-white/40 text-xs">Sin tasa disponible</p>
                    )}
                  </div>
                )}
              </div>
            )}

            {esBs && monto > 0 && (
              <div className="mt-2 rounded-2xl px-3 py-2.5 flex items-center justify-between"
                   style={{background:'rgba(52,211,153,0.10)', border:'1px solid rgba(52,211,153,0.20)'}}>
                <span className="text-emerald-300/70 text-xs">Equivalente EUR</span>
                <div className="text-right">
                  {tasaEur ? (
                    <>
                      <p className="text-emerald-300 text-sm font-bold">€{montoEur}</p>
                      <p className="text-white/35 text-xs">Tasa BCV: Bs {parseFloat(tasaEur.toFixed(4))}</p>
                    </>
                  ) : <p className="text-white/40 text-xs">Sin tasa disponible</p>}
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="glass-label">Notas</label>
            <input className="glass-input" placeholder="Observaciones..." value={form.notas}
                   onChange={e => set('notas', e.target.value)} maxLength={200} />
          </div>
        </div>

        <button onClick={guardar} disabled={guardando} className="glass-btn-primary" style={guardando ? {opacity:0.6} : {}}>
          <Save size={18} />
          {guardando ? 'Guardando…' : esEdicion ? 'Guardar cambios' : 'Registrar ingreso'}
        </button>
      </div>
    </div>
  )
}
