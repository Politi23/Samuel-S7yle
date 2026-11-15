import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { useToast } from '../context/ToastContext'
import { Save, CheckCircle2, Search, X } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import { PARENTESCOS } from '../lib/parentesco'

const PREFIJOS = [
  { valor: '0412', label: '0412 · Digitel' },
  { valor: '0422', label: '0422 · Digitel' },
  { valor: '0414', label: '0414 · Movilnet' },
  { valor: '0416', label: '0416 · Movilnet' },
  { valor: '0424', label: '0424 · Movistar' },
  { valor: '0426', label: '0426 · Movistar' },
]
/* 0414-1234567, 04141234567 y +58 414 1234567 son el mismo número */
const soloDigitos = (t) => (t || '').replace(/\D/g, '').replace(/^58(?=4)/, '0')
/* "José  Pérez" y "jose perez" son el mismo nombre */
const nombreNormal = (n, a) => `${n || ''} ${a || ''}`.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim()

const FORM_INICIAL = { nombre: '', apellido: '', tel_prefijo: '0414', tel_num: '', fecha_nacimiento: '', parentesco: '', representante: '' }
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
  const [buscaRep, setBuscaRep] = useState('')
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
        setForm({ nombre: c.nombre||'', apellido: c.apellido||'', tel_prefijo: prefijo, tel_num: telNum, fecha_nacimiento: c.fecha_nacimiento||'', parentesco: c.parentesco||'', representante: c.representante||'' })
      }
    }
  }, [id, esEdicion, clientes])

  const validarCampo = (c, v) => {
    if (c === 'nombre' || c === 'apellido') return validarNombre(v)
    if (c === 'tel_num') return validarTelNum(v)
    return ''
  }
  const elegirRepresentante = (c) => {
    const digitos = soloDigitos(c.telefono)
    setForm(f => ({
      ...f,
      representante: `${c.nombre} ${c.apellido}`.trim(),
      // el teléfono del niño es el de su papá/mamá, si todavía no tiene uno
      ...(digitos.length === 11 && !f.tel_num ? { tel_prefijo: digitos.slice(0, 4), tel_num: digitos.slice(4) } : {}),
      apellido: f.apellido || c.apellido || '',
    }))
    setBuscaRep('')
  }
  const busquedaRep = nombreNormal(buscaRep, '')
  const candidatosRep = busquedaRep.length >= 2
    ? clientes
        .filter(c => c.id !== id && (nombreNormal(c.nombre, c.apellido).includes(busquedaRep) || soloDigitos(c.telefono).includes(buscaRep.replace(/\D/g, '') || '—')))
        .sort((a, b) => (a.parentesco ? 1 : 0) - (b.parentesco ? 1 : 0)) // primero los titulares
        .slice(0, 5)
    : []
  const repRegistrado = form.representante
    ? clientes.find(c => nombreNormal(c.nombre, c.apellido) === nombreNormal(form.representante, ''))
    : null

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
    if (duplicado || otroTitular) return
    const telefono = form.tel_num.trim() ? `${form.tel_prefijo}-${form.tel_num.replace(/\D/g, '')}` : null
    const datos = { nombre: form.nombre.trim(), apellido: form.apellido.trim(), telefono, fecha_nacimiento: form.fecha_nacimiento || null }
    // El parentesco solo se envía si se usa (así guardar sigue funcionando aunque falte el SQL de familia)
    const original = esEdicion ? clientes.find(c => c.id === id) : null
    if (form.parentesco || original?.parentesco) {
      datos.parentesco = form.parentesco || null
      datos.representante = form.parentesco ? (form.representante.trim() || null) : null
    }
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

  const telCompleto = form.tel_num.replace(/\D/g, '').length === 7 ? `${form.tel_prefijo}${form.tel_num.replace(/\D/g, '')}` : null
  const mismoNumero = telCompleto
    ? clientes.filter(c => c.id !== id && soloDigitos(c.telefono) === telCompleto)
    : []
  const duplicado = mismoNumero.find(c => nombreNormal(c.nombre, c.apellido) === nombreNormal(form.nombre, form.apellido)) || null
  const familiar  = duplicado ? null : mismoNumero[0] || null
  // Un solo titular por número: si ya tiene uno, otra persona debe ser hijo, hija o familiar
  // (al editar, solo si le cambian el número: así los datos viejos con varios titulares se pueden seguir editando)
  const numeroOriginal = esEdicion ? soloDigitos(clientes.find(c => c.id === id)?.telefono) : null
  const otroTitular = !duplicado && !form.parentesco && (!esEdicion || numeroOriginal !== telCompleto)
    ? mismoNumero.find(c => !c.parentesco) || null
    : null

  const err = (c) => errores[c] && tocados[c]
  const cls = (c) => `glass-input${err(c) ? ' error' : ''}`

  return (
    <div className="min-h-screen">
      <PageHeader title={esEdicion ? 'Editar cliente' : 'Nuevo cliente'} back />
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
            <span className="glass-label">¿Quién es?</span>
            <div className="grid grid-cols-4 gap-1.5" role="radiogroup">
              {PARENTESCOS.map(p => {
                const on = form.parentesco === p.valor
                return (
                  <button key={p.valor || 'titular'} type="button" role="radio" aria-checked={on}
                          onClick={() => setForm(f => ({ ...f, parentesco: p.valor }))}
                          className="rounded-[10px] min-h-[42px] text-[13px] font-bold transition-colors duration-150"
                          style={{
                            background: on ? 'rgba(201,162,74,0.20)' : 'rgba(255,244,222,0.04)',
                            border: `1px solid ${on ? 'rgba(201,162,74,0.55)' : 'var(--line)'}`,
                            color: on ? '#e2c98a' : 'rgba(247,242,232,0.70)',
                          }}>
                    {p.app}
                  </button>
                )
              })}
            </div>
            {form.parentesco && (
              form.representante ? (
                /* Ya elegido */
                <div className="mt-2 flex items-center gap-3 rounded-[12px] px-3 py-2.5"
                     style={{ background: 'rgba(201,162,74,0.10)', border: '1px solid rgba(201,162,74,0.30)' }}>
                  <div className="flex-1 min-w-0">
                    <p className="text-white/55 text-[11px] font-semibold">
                      {form.parentesco === 'familiar' ? 'Familiar responsable' : 'Papá o mamá'}
                    </p>
                    <p className="text-white text-sm font-bold truncate">{form.representante}</p>
                    <p className="text-white/50 text-xs">{repRegistrado ? repRegistrado.telefono || 'Sin teléfono' : 'No está registrado como cliente'}</p>
                  </div>
                  <button type="button" onClick={() => setForm(f => ({ ...f, representante: '' }))}
                          aria-label="Cambiar papá o mamá"
                          className="w-9 h-9 flex items-center justify-center text-white/55 active:text-white">
                    <X size={16} />
                  </button>
                </div>
              ) : (
                /* Buscador entre los clientes */
                <div className="mt-2">
                  <div className="relative">
                    <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/45 pointer-events-none" />
                    <input className="glass-input" style={{ paddingLeft: 38 }} value={buscaRep} maxLength={80}
                           onChange={e => setBuscaRep(e.target.value)}
                           placeholder={form.parentesco === 'familiar' ? 'Buscar al familiar responsable…' : 'Buscar al papá o la mamá…'}
                           aria-label="Buscar papá o mamá entre los clientes" />
                  </div>
                  {busquedaRep.length >= 2 && (
                    <ul className="mt-1">
                      {candidatosRep.map((c, idx) => (
                        <li key={c.id} style={idx ? { borderTop: '1px solid var(--line)' } : undefined}>
                          <button type="button" onClick={() => elegirRepresentante(c)}
                                  className="w-full flex items-center gap-3 px-1 py-2.5 text-left active:opacity-70">
                            <span className="flex-1 min-w-0">
                              <span className="block text-white text-sm font-semibold truncate">{c.nombre} {c.apellido}</span>
                              <span className="block text-white/50 text-xs">{c.telefono || 'Sin teléfono'}</span>
                            </span>
                            <span className="text-amber-300 text-xs font-bold">Elegir</span>
                          </button>
                        </li>
                      ))}
                      {/[a-zA-ZáéíóúÁÉÍÓÚñÑ]{2}/.test(buscaRep) && (
                        <li style={candidatosRep.length ? { borderTop: '1px solid var(--line)' } : undefined}>
                          <button type="button"
                                  onClick={() => { setForm(f => ({ ...f, representante: buscaRep.replace(/[0-9]/g, '').trim() })); setBuscaRep('') }}
                                  className="w-full px-1 py-2.5 text-left text-sm text-white/70 active:opacity-70">
                            Usar «<span className="text-white font-semibold">{buscaRep.replace(/[0-9]/g, '').trim()}</span>» (no está registrado)
                          </button>
                        </li>
                      )}
                    </ul>
                  )}
                </div>
              )
            )}
          </div>

          <div>
            <label className="glass-label">Teléfono / WhatsApp <span className="text-white/35 font-normal">(opcional)</span></label>
            <div className="flex gap-2">
              <select className="glass-input" style={{width:'150px', flexShrink:0}}
                      value={form.tel_prefijo} onChange={e => set('tel_prefijo', e.target.value)}>
                {PREFIJOS.map(p => <option key={p.valor} value={p.valor}>{p.label}</option>)}
              </select>
              <input type="tel" inputMode="numeric"
                     className={`glass-input flex-1${err('tel_num') || duplicado ? ' error' : ''}`}
                     value={form.tel_num}
                     onChange={e => set('tel_num', e.target.value.replace(/\D/g,'').slice(0,7))}
                     onBlur={() => tocar('tel_num')} onPaste={onPasteTel}
                     placeholder="1234567" maxLength={7} />
            </div>
            {err('tel_num') && <p className="text-red-400 text-xs mt-1">{errores.tel_num}</p>}
            {!err('tel_num') && duplicado && (
              <div className="mt-1.5 flex items-center justify-between gap-2" role="alert">
                <p className="text-red-300 text-xs">{duplicado.nombre} {duplicado.apellido} ya está registrado con este número</p>
                <button type="button" onClick={() => navigate(`/clientes/${duplicado.id}`)}
                        className="text-amber-300 text-xs font-bold underline underline-offset-2 flex-shrink-0 min-h-[32px]">
                  Ver cliente
                </button>
              </div>
            )}
            {!err('tel_num') && otroTitular && (
              <div className="mt-1.5 space-y-1" role="alert">
                <p className="text-red-300 text-xs">
                  Este número ya es de {otroTitular.nombre} {otroTitular.apellido}. Si es otra persona de su familia, márcala arriba como Hijo, Hija o Familiar.
                </p>
                <button type="button" onClick={() => navigate(`/clientes/${otroTitular.id}`)}
                        className="text-amber-300 text-xs font-bold underline underline-offset-2 min-h-[32px]">
                  Ver a {otroTitular.nombre}
                </button>
              </div>
            )}
            {!err('tel_num') && familiar && !otroTitular && (
              <p className="text-amber-200/90 text-xs mt-1.5">
                Este número también es de {familiar.nombre} {familiar.apellido}
                {mismoNumero.length > 1 ? ` y ${mismoNumero.length - 1} más` : ''}. Si es un familiar, puedes guardarlo igual.
              </p>
            )}
            {!err('tel_num') && !duplicado && !familiar && !otroTitular && telCompleto && (
              <p className="text-emerald-400 text-xs mt-1 flex items-center gap-1"><CheckCircle2 size={12} /> Válido</p>
            )}
            {!telCompleto && !esEdicion && (
              <p className="text-white/45 text-xs mt-1.5">Si es un niño sin teléfono, puedes dejarlo vacío o poner el de su papá o mamá.</p>
            )}
          </div>
        </div>

        {errorGuardar && <p className="text-red-400 text-sm text-center">{errorGuardar}</p>}
        <button onClick={guardar} disabled={guardando || !!duplicado || !!otroTitular} className="glass-btn-primary" style={guardando || duplicado || otroTitular ? {opacity:0.6} : {}}>
          <Save size={18} />
          {guardando ? 'Guardando…' : esEdicion ? 'Guardar cambios' : 'Registrar cliente'}
        </button>
      </div>
    </div>
  )
}
