import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, useParams } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { useBcv } from '../hooks/useBcv'
import { useToast } from '../context/ToastContext'
import { Save, Search, Plus, X } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import { hoyVE } from '../lib/fecha'

const SERVICIOS = ['Corte de cabello','Corte + Barba','Cejas','Colorimetría','Pigmentación','Lavado','Otro']
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

  // Segundo método de pago
  const [pago2Activo, setPago2Activo] = useState(false)
  const [pago2, setPago2] = useState({ metodo: 'Pago Móvil', monto: '', moneda: 'USD' })
  const [bs2Personalizado, setBs2Personalizado] = useState(false)
  const [montoBs2Custom, setMontoBs2Custom] = useState('')

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

  const setMetodo2 = (metodo) => {
    let moneda = pago2.moneda
    if (METODOS_USD.includes(metodo)) moneda = 'USD'
    setBs2Personalizado(false); setMontoBs2Custom('')
    setPago2(prev => ({ ...prev, metodo, moneda }))
  }

  const setMoneda2 = (moneda) => {
    setBs2Personalizado(false); setMontoBs2Custom('')
    setPago2(prev => ({ ...prev, moneda }))
  }

  const activarPago2 = () => {
    setPago2Activo(true)
    setPago2({ metodo: 'Pago Móvil', monto: '', moneda: 'USD' })
    setBs2Personalizado(false); setMontoBs2Custom('')
  }

  const desactivarPago2 = () => {
    setPago2Activo(false)
    setBs2Personalizado(false); setMontoBs2Custom('')
  }

  const seleccionar = (c) => { setForm(prev => ({ ...prev, cliente_id: c.id, cliente_nombre: `${c.nombre} ${c.apellido}` })); setMostrarBuscador(false); setBusqueda('') }
  const recientes = clientes.slice(0, 5)
  const filtrados = busqueda.trim()
    ? clientes.filter(c => { const q = busqueda.toLowerCase(); return c.nombre.toLowerCase().includes(q) || c.apellido.toLowerCase().includes(q) || (c.telefono||'').includes(q) }).slice(0, 8)
    : recientes

  const tasaEur = bcv?.eur ?? null
  const monto1 = Number(form.monto)
  const monto2 = Number(pago2.monto)
  const esBs = form.moneda === 'Bs'
  const esBs2 = pago2.moneda === 'Bs'
  const metodoBs = METODOS_BS.includes(form.metodo_pago)
  const metodoBs2 = METODOS_BS.includes(pago2.metodo)
  const soloUsd = ['Efectivo USD', 'Zelle', 'PayPal'].includes(form.metodo_pago)
  const soloUsd2 = ['Efectivo USD', 'Zelle', 'PayPal'].includes(pago2.metodo)
  const mostrarConvBs = !esBs && metodoBs && monto1 > 0
  const mostrarConvBs2 = pago2Activo && !esBs2 && metodoBs2 && monto2 > 0
  const montoBsAuto = tasaEur ? (monto1 * tasaEur).toFixed(2) : null
  const montoBs2Auto = tasaEur ? (monto2 * tasaEur).toFixed(2) : null
  const montoEur = esBs && tasaEur && monto1 > 0 ? (monto1 / tasaEur).toFixed(2) : null
  const totalUSD = pago2Activo ? (monto1 + monto2).toFixed(2) : null

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
    if (!form.monto || monto1 <= 0) e.monto = 'Monto inválido'
    if (pago2Activo && (!pago2.monto || monto2 <= 0)) e.monto2 = 'Monto del segundo método inválido'
    setErrores(e)
    if (Object.keys(e).length) return

    const partes = form.servicios.length
      ? form.servicios.map(s => s === 'Otro' ? (form.servicio_custom.trim() || 'Otro') : s)
      : ['Sin especificar']
    const concepto = partes.join(' + ')

    let montoFinal, monedaFinal, metodoPagoFinal, involucraBS

    if (pago2Activo) {
      montoFinal = monto1 + monto2
      monedaFinal = 'USD'
      metodoPagoFinal = `${form.metodo_pago} + ${pago2.metodo}`
      involucraBS = esBs || metodoBs || esBs2 || metodoBs2
    } else {
      montoFinal = monto1
      monedaFinal = form.moneda
      metodoPagoFinal = form.metodo_pago
      involucraBS = esBs || metodoBs
    }

    const datos = {
      cliente_id: form.cliente_id, cliente_nombre: form.cliente_nombre,
      fecha: form.fecha, concepto,
      monto: montoFinal, moneda: monedaFinal,
      metodo_pago: metodoPagoFinal, notas: form.notas.trim(),
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
                  <span className="text-amber-300 font-bold text-xs">{(form.cliente_nombre||'').split(' ').filter(n=>n).map(n=>n[0].toUpperCase()).slice(0,2).join('')}</span>
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

          {/* Método de pago 1 */}
          <div>
            <label className="glass-label">{pago2Activo ? 'Primer método de pago' : 'Método de pago'}</label>
            <select className="glass-input" value={form.metodo_pago} onChange={e => setMetodo(e.target.value)}>
              {METODOS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          {/* Monto 1 */}
          <div>
            <label className="glass-label">{pago2Activo ? 'Monto — primer método *' : 'Monto *'}</label>
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

            {esBs && monto1 > 0 && !pago2Activo && (
              <div className="mt-2 rounded-2xl px-3 py-2.5 flex items-center justify-between"
                   style={{background:'rgba(52,211,153,0.10)', border:'1px solid rgba(52,211,153,0.20)'}}>
                <span className="text-emerald-300/70 text-xs">Equivalente EUR</span>
                <div className="text-right">
                  {tasaEur ? (
                    <>
                      <p className="text-emerald-300 text-sm font-bold">€{montoEur}</p>
                      <p className="text-white/35 text-xs">Tasa EUR: Bs {parseFloat(tasaEur.toFixed(4))}</p>
                    </>
                  ) : <p className="text-white/40 text-xs">Sin tasa disponible</p>}
                </div>
              </div>
            )}
          </div>

          {/* Segundo método de pago */}
          {pago2Activo ? (
            <div className="space-y-3 rounded-2xl px-3 py-3" style={{background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.10)'}}>
              <div className="flex items-center justify-between">
                <label className="glass-label mb-0">Segundo método de pago</label>
                <button type="button" onClick={desactivarPago2} className="text-white/35 hover:text-white/60 transition-colors">
                  <X size={16} />
                </button>
              </div>

              <select className="glass-input" value={pago2.metodo} onChange={e => setMetodo2(e.target.value)}>
                {METODOS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>

              <div>
                <label className="glass-label">Monto — segundo método *</label>
                <div className="flex gap-2">
                  <div className="flex rounded-2xl overflow-hidden flex-shrink-0" style={{border:'1px solid rgba(255,255,255,0.20)'}}>
                    {['USD','Bs'].map(m => {
                      const bloqueado = soloUsd2 && m === 'Bs'
                      return (
                        <button key={m} onClick={() => !bloqueado && setMoneda2(m)}
                                className="px-4 py-3 text-sm font-bold transition-colors"
                                style={{
                                  background: pago2.moneda === m ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.06)',
                                  color: bloqueado ? 'rgba(255,255,255,0.20)' : 'white',
                                  cursor: bloqueado ? 'not-allowed' : 'pointer'
                                }}>
                          {m}
                        </button>
                      )
                    })}
                  </div>
                  <input type="number" step="0.01" min="0"
                         className={`glass-input flex-1${errores.monto2 ? ' error' : ''}`}
                         placeholder="0.00" value={pago2.monto}
                         onChange={e => { setPago2(prev => ({ ...prev, monto: e.target.value })); if (errores.monto2) setErrores(prev => ({ ...prev, monto2: '' })) }} />
                </div>
                {errores.monto2 && <p className="text-red-400 text-xs mt-1">{errores.monto2}</p>}

                {mostrarConvBs2 && (
                  <div className="mt-2 rounded-2xl px-3 py-2.5 space-y-2"
                       style={{background:'rgba(217,119,6,0.15)', border:'1px solid rgba(217,119,6,0.30)'}}>
                    <div className="flex items-center justify-between">
                      <span className="text-amber-300/70 text-xs">Equivalente en Bs</span>
                      <button type="button"
                              onClick={() => { setBs2Personalizado(v => !v); setMontoBs2Custom(montoBs2Auto || '') }}
                              className="text-xs font-semibold"
                              style={{color: bs2Personalizado ? 'rgba(251,191,36,1)' : 'rgba(255,255,255,0.40)'}}>
                        {bs2Personalizado ? 'Usar BCV' : 'Personalizar'}
                      </button>
                    </div>
                    {bs2Personalizado ? (
                      <input type="number" step="0.01" min="0" className="glass-input"
                             placeholder="Monto en Bs exacto..." value={montoBs2Custom}
                             onChange={e => setMontoBs2Custom(e.target.value)} />
                    ) : (
                      <div className="flex items-end justify-between">
                        {tasaEur ? (
                          <>
                            <p className="text-amber-200 text-sm font-bold">Bs {montoBs2Auto}</p>
                            <p className="text-white/35 text-xs">Tasa EUR: {parseFloat(tasaEur.toFixed(4))}</p>
                          </>
                        ) : (
                          <p className="text-white/40 text-xs">Sin tasa disponible</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {monto1 > 0 && monto2 > 0 && (
                <div className="rounded-2xl px-3 py-2.5 flex items-center justify-between"
                     style={{background:'rgba(217,119,6,0.20)', border:'1px solid rgba(217,119,6,0.35)'}}>
                  <span className="text-amber-300/80 text-xs font-semibold">Total</span>
                  <span className="text-white font-bold text-sm">${totalUSD} USD</span>
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={activarPago2}
              className="w-full flex items-center justify-center gap-2 rounded-2xl py-2.5 text-sm font-semibold text-white/50 hover:text-white/75 transition-colors"
              style={{background:'rgba(255,255,255,0.05)', border:'1px dashed rgba(255,255,255,0.20)'}}
            >
              <Plus size={15} />
              Agregar segundo método de pago
            </button>
          )}

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
