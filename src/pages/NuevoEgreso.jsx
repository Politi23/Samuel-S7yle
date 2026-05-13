import { useState, useEffect } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { useToast } from '../context/ToastContext'
import { Save } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import { hoyVE } from '../lib/fecha'

export const CATS_BARBERIA = [
  'Alquiler local',
  'Electricidad / Agua / Internet',
  'Productos y suministros',
  'Equipos y herramientas',
  'Personal / Honorarios',
  'Publicidad',
  'Impuestos',
  'Mantenimiento',
  'Transporte',
  'Otro',
]

export const esEgresoPersonal = (egreso) => !CATS_BARBERIA.includes(egreso.categoria)

export default function NuevoEgreso() {
  const navigate = useNavigate()
  const { id: editId } = useParams()
  const { egresos, agregarEgreso, actualizarEgreso } = useApp()
  const toast = useToast()

  const [searchParams] = useSearchParams()
  const esEdicion = !!editId
  const egresoExistente = esEdicion ? egresos.find(e => e.id === editId) : null

  const [tipo, setTipo] = useState(() => searchParams.get('tipo') === 'personal' ? 'personal' : 'barberia')
  const [guardando, setGuardando] = useState(false)
  const [form, setForm] = useState({
    fecha: hoyVE(),
    categoria: searchParams.get('tipo') === 'personal' ? '' : 'Alquiler local',
    descripcion: '',
    monto: '',
    moneda: 'USD',
    notas: '',
  })
  const [errores, setErrores] = useState({})

  useEffect(() => {
    if (esEdicion && egresoExistente) {
      const personal = esEgresoPersonal(egresoExistente)
      setTipo(personal ? 'personal' : 'barberia')
      setForm({
        fecha: egresoExistente.fecha,
        categoria: egresoExistente.categoria,
        descripcion: egresoExistente.descripcion || '',
        monto: String(egresoExistente.monto),
        moneda: egresoExistente.moneda,
        notas: egresoExistente.notas || '',
      })
    }
  }, [esEdicion, egresoExistente])

  const set = (c, v) => { setForm(prev => ({ ...prev, [c]: v })); if (errores[c]) setErrores(prev => ({ ...prev, [c]: '' })) }

  const cambiarTipo = (t) => {
    setTipo(t)
    setForm(prev => ({ ...prev, categoria: t === 'barberia' ? 'Alquiler local' : '' }))
    setErrores({})
  }

  const guardar = async () => {
    const e = {}
    if (!form.monto || Number(form.monto) <= 0) e.monto = 'Monto inválido'
    if (tipo === 'personal' && !form.categoria.trim()) e.categoria = 'Escribe una descripción'
    setErrores(e)
    if (Object.keys(e).length) return
    const datos = {
      fecha: form.fecha,
      categoria: tipo === 'personal' ? form.categoria.trim() : form.categoria,
      descripcion: tipo === 'barberia' ? form.descripcion.trim() : '',
      monto: Number(form.monto),
      moneda: form.moneda,
      notas: form.notas.trim(),
    }
    setGuardando(true)
    try {
      if (esEdicion) {
        await actualizarEgreso(editId, datos)
        toast('Egreso actualizado', 'success')
      } else {
        await agregarEgreso(datos)
        toast('Egreso registrado', 'success')
      }
      navigate('/egresos')
    } catch (err) {
      toast(err.message || 'Error al guardar', 'error')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="min-h-screen">
      <PageHeader title={esEdicion ? 'Editar Egreso' : 'Nuevo Egreso'} back />

      <div className="px-4 pt-4 pb-6 space-y-4">

        <div className="flex rounded-2xl overflow-hidden" style={{border:'1px solid rgba(255,255,255,0.15)'}}>
          {[['barberia','✂️  Barbería (trabajo)'],['personal','🏠  Personal (vida)']].map(([v, l]) => (
            <button key={v} onClick={() => cambiarTipo(v)}
                    className="flex-1 py-3 text-sm font-semibold transition-all"
                    style={{
                      background: tipo === v ? 'rgba(239,68,68,0.30)' : 'rgba(255,255,255,0.05)',
                      color: tipo === v ? 'white' : 'rgba(255,255,255,0.40)',
                    }}>
              {l}
            </button>
          ))}
        </div>

        <div className="glass-card space-y-4">
          <div>
            <label className="glass-label">Fecha</label>
            <input type="date" className="glass-input" value={form.fecha} onChange={e => set('fecha', e.target.value)} />
          </div>

          {tipo === 'barberia' ? (
            <>
              <div>
                <label className="glass-label">Categoría</label>
                <select className="glass-input" value={form.categoria} onChange={e => set('categoria', e.target.value)}>
                  {CATS_BARBERIA.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="glass-label">Descripción</label>
                <input className="glass-input" placeholder="Ej: Pago mes de abril..."
                       value={form.descripcion} onChange={e => set('descripcion', e.target.value)} maxLength={120} />
              </div>
            </>
          ) : (
            <div>
              <label className="glass-label">¿En qué se gastó? *</label>
              <input className={`glass-input${errores.categoria ? ' error' : ''}`}
                     placeholder="Ej: Carro, Mercado, Teléfono..."
                     value={form.categoria} onChange={e => set('categoria', e.target.value)} maxLength={80} />
              {errores.categoria && <p className="text-red-400 text-xs mt-1">{errores.categoria}</p>}
            </div>
          )}

          <div>
            <label className="glass-label">Monto *</label>
            <div className="flex gap-2">
              <div className="flex rounded-2xl overflow-hidden flex-shrink-0" style={{border:'1px solid rgba(255,255,255,0.20)'}}>
                {['USD','Bs'].map(m => (
                  <button key={m} onClick={() => set('moneda', m)}
                          className="px-4 py-3 text-sm font-bold transition-colors"
                          style={{
                            background: form.moneda === m ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.06)',
                            color: 'white',
                          }}>
                    {m}
                  </button>
                ))}
              </div>
              <input type="number" step="0.01" min="0"
                     className={`glass-input flex-1${errores.monto ? ' error' : ''}`}
                     placeholder="0.00" value={form.monto} onChange={e => set('monto', e.target.value)} />
            </div>
            {errores.monto && <p className="text-red-400 text-xs mt-1">{errores.monto}</p>}
          </div>

          <div>
            <label className="glass-label">Notas</label>
            <input className="glass-input" placeholder="Observaciones..."
                   value={form.notas} onChange={e => set('notas', e.target.value)} maxLength={200} />
          </div>
        </div>

        <button onClick={guardar} disabled={guardando} className="glass-btn-primary" style={guardando ? {opacity:0.6} : {}}>
          <Save size={18} />
          {guardando ? 'Guardando…' : esEdicion ? 'Guardar cambios' : 'Registrar egreso'}
        </button>
      </div>
    </div>
  )
}
