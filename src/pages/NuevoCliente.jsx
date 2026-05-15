import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { useToast } from '../context/ToastContext'
import { Save, CheckCircle2 } from 'lucide-react'
import PageHeader from '../components/PageHeader'

const PREFIJOS = [
  { valor: '0412', label: '0412 · Digitel' },
  { valor: '0422', label: '0422 · Digitel' },
  { valor: '0414', label: '0414 · Movilnet' },
  { valor: '0416', label: '0416 · Movilnet' },
  { valor: '0424', label: '0424 · Movistar' },
  { valor: '0426', label: '0426 · Movistar' },
]
const FORM_INICIAL = { nombre: '', apellido: '', tel_prefijo: '0414', tel_num: '', fecha_nacimiento: '' }
const DRAFT_KEY = 'draft_nuevo_cliente'

function validarNombre(v) {
  if (!v.trim()) return 'Requerido'
  if (v.trim().length < 2) return 'Mínimo 2 caracteres'
  if (!/^[a-zA-ZáéíóúÁÉÍÓÚüÜñÑ\s'-]+$/.test(v.trim())) return 'Solo letras'
  return ''
}
function validarTelNum(v) {
  if (!v.trim()) return ''
  const solo = v.replace(/\D/g, '')
  if (solo.length !== 7) return '7 dígitos restantes'
  return ''
}

export default function NuevoCliente() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { clientes, agregarCliente, actualizarCliente } = useApp()
  const toast = useToast()
  const [form, setForm] = useState(() => {
    if (!id) {
      try {
        const saved = sessionStorage.getItem(DRAFT_KEY)
        if (saved) return { ...FORM_INICIAL, ...JSON.parse(saved) }
      } catch {}
    }
    return FORM_INICIAL
  })
  const [errores, setErrores] = useState({})
  const [tocados, setTocados] = useState({})
  const [errorGuardar, setErrorGuardar] = useState('')
  const [guardando, setGuardando] = useState(false)
  const esEdicion = Boolean(id)

  useEffect(() => {
    if (!esEdicion) {
      // Excluir fecha_nacimiento del draft (PII sensible)
      const { fecha_nacimiento: _, ...draftSafe } = form
      try { sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draftSafe)) } catch {}
    }
  }, [form, esEdicion])

  useEffect(() => {
    if (esEdicion) {
      const c = clientes.find(c => c.id === id)
      if (c) {
        const tel = c.telefono || ''
        const prefijo = PREFIJOS.find(p => tel.startsWith(p.valor))?.valor || '0414'
        const telNum = tel.replace(/\D/g, '').slice(4)
        setForm({ nombre: c.nombre||'', apellido: c.apellido||'', tel_prefijo: prefijo, tel_num: telNum, fecha_nacimiento: c.fecha_nacimiento||'' })
      }
    }
  }, [id, esEdicion, clientes])

  const validarCampo = (c, v) => {
    if (c === 'nombre' || c === 'apellido') return validarNombre(v)
    if (c === 'tel_num') return validarTelNum(v)
    return ''
  }
  const set = (c, v) => {
    setForm(prev => ({ ...prev, [c]: v }))
    if (tocados[c]) setErrores(prev => ({ ...prev, [c]: validarCampo(c, v) }))
  }
  const tocar = (c) => {
    setTocados(prev => ({ ...prev, [c]: true }))
    setErrores(prev => ({ ...prev, [c]: validarCampo(c, form[c]) }))
  }
  const onPasteTel = (e) => {
    const texto = e.clipboardData.getData('text')
    const soloDigitos = texto.replace(/\D/g, '')
    let prefijo = null, numero = null
    if (soloDigitos.startsWith('58') && soloDigitos.length === 12) {
      prefijo = '0' + soloDigitos.slice(2, 5)
      numero = soloDigitos.slice(5)
    } else if (soloDigitos.startsWith('0') && soloDigitos.length === 11) {
      prefijo = soloDigitos.slice(0, 4)
      numero = soloDigitos.slice(4)
    }
    const prefijoValido = PREFIJOS.find(p => p.valor === prefijo)
    if (prefijoValido && numero && numero.length === 7) {
      e.preventDefault()
      setForm(prev => ({ ...prev, tel_prefijo: prefijo, tel_num: numero }))
      if (tocados.tel_num) setErrores(prev => ({ ...prev, tel_num: validarTelNum(numero) }))
    }
  }

  const guardar = async () => {
    const campos = ['nombre', 'apellido']
    const e = Object.fromEntries(campos.map(c => [c, validarCampo(c, form[c])]))
    if (form.tel_num.trim()) e.tel_num = validarTelNum(form.tel_num)
    const camposTocados = [...campos, ...(form.tel_num.trim() ? ['tel_num'] : [])]
    setErrores(e); setTocados(Object.fromEntries(camposTocados.map(c => [c, true])))
    if (Object.values(e).some(v => v)) return
    const telefono = form.tel_num.trim() ? `${form.tel_prefijo}-${form.tel_num.replace(/\D/g, '')}` : null
    const datos = { nombre: form.nombre.trim(), apellido: form.apellido.trim(), telefono, fecha_nacimiento: form.fecha_nacimiento || null }
    setGuardando(true)
    try {
      if (esEdicion) {
        await actualizarCliente(id, datos)
        toast('Cambios guardados', 'success')
        navigate(`/clientes/${id}`)
      } else {
        await agregarCliente(datos)
        try { sessionStorage.removeItem(DRAFT_KEY) } catch {}
        toast('Cliente registrado', 'success')
        navigate('/clientes')
      }
    } catch (err) {
      setErrorGuardar(err.message || 'Error al guardar')
    } finally {
      setGuardando(false)
    }
  }

  const err = (c) => errores[c] && tocados[c]
  const cls = (c) => `glass-input${err(c) ? ' error' : ''}`

  return (
    <div className="min-h-screen">
      <PageHeader title={esEdicion ? 'Editar Cliente' : 'Nuevo Cliente'} back />
      <div className="px-4 pt-4 pb-6 space-y-4">
        <div className="glass-card space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="glass-label">Nombre *</label>
              <input className={cls('nombre')} value={form.nombre}
                     onChange={e => set('nombre', e.target.value.replace(/[0-9]/g, ''))}
                     onBlur={() => tocar('nombre')} placeholder="Carlos" maxLength={50} />
              {err('nombre') && <p className="text-red-400 text-xs mt-1">{errores.nombre}</p>}
            </div>
            <div>
              <label className="glass-label">Apellido *</label>
              <input className={cls('apellido')} value={form.apellido}
                     onChange={e => set('apellido', e.target.value.replace(/[0-9]/g, ''))}
                     onBlur={() => tocar('apellido')} placeholder="Pérez" maxLength={50} />
              {err('apellido') && <p className="text-red-400 text-xs mt-1">{errores.apellido}</p>}
            </div>
          </div>

          <div>
            <label className="glass-label">Fecha de nacimiento <span className="text-white/35 font-normal">(opcional)</span></label>
            <input type="date" className="glass-input" value={form.fecha_nacimiento}
                   onChange={e => setForm(f => ({ ...f, fecha_nacimiento: e.target.value }))} />
          </div>

          <div>
            <label className="glass-label">Teléfono / WhatsApp <span className="text-white/35 font-normal">(opcional)</span></label>
            <div className="flex gap-2">
              <select className="glass-input" style={{width:'150px', flexShrink:0}}
                      value={form.tel_prefijo} onChange={e => set('tel_prefijo', e.target.value)}>
                {PREFIJOS.map(p => <option key={p.valor} value={p.valor}>{p.label}</option>)}
              </select>
              <input type="tel" inputMode="numeric"
                     className={`glass-input flex-1${err('tel_num') ? ' error' : ''}`}
                     value={form.tel_num}
                     onChange={e => set('tel_num', e.target.value.replace(/\D/g,'').slice(0,7))}
                     onBlur={() => tocar('tel_num')} onPaste={onPasteTel}
                     placeholder="1234567" maxLength={7} />
            </div>
            {err('tel_num') && <p className="text-red-400 text-xs mt-1">{errores.tel_num}</p>}
            {!err('tel_num') && form.tel_num.replace(/\D/g,'').length === 7 && (
              <p className="text-emerald-400 text-xs mt-1 flex items-center gap-1"><CheckCircle2 size={12} /> Válido</p>
            )}
          </div>
        </div>

        {errorGuardar && <p className="text-red-400 text-sm text-center">{errorGuardar}</p>}
        <button onClick={guardar} disabled={guardando} className="glass-btn-primary" style={guardando ? {opacity:0.6} : {}}>
          <Save size={18} />
          {guardando ? 'Guardando…' : esEdicion ? 'Guardar cambios' : 'Registrar cliente'}
        </button>
      </div>
    </div>
  )
}
