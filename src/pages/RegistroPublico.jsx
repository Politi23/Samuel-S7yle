import { useState } from 'react'
import { supabase } from '../lib/supabase'
import Logo from '../components/Logo'
import { CheckCircle2, CalendarClock } from 'lucide-react'

const PREFIJOS = ['0412', '0422', '0414', '0416', '0424', '0426']
const FORM_INICIAL = { nombre: '', apellido: '', tel_prefijo: '0414', tel_num: '', fecha_nacimiento: '', website: '' }

function validarNombre(v) {
  if (!v.trim()) return 'Requerido'
  if (v.trim().length < 2) return 'Mínimo 2 caracteres'
  if (!/^[a-zA-ZáéíóúÁÉÍÓÚüÜñÑ\s'-]+$/.test(v.trim())) return 'Solo letras'
  return ''
}
function validarTelNum(v) {
  const solo = v.replace(/\D/g, '')
  if (!solo) return 'Requerido'
  if (solo.length !== 7) return 'Faltan dígitos (son 7)'
  return ''
}
const VALIDAR = { nombre: validarNombre, apellido: validarNombre, tel_num: validarTelNum }

function waLink(nombre) {
  const msg = `Hola Samuel! Soy ${nombre}, me acabo de registrar 💈`
  return `https://wa.me/584121381501?text=${encodeURIComponent(msg)}`
}

export default function RegistroPublico() {
  const [form, setForm]         = useState(FORM_INICIAL)
  const [errores, setErrores]   = useState({})
  const [tocados, setTocados]   = useState({})
  const [enviando, setEnviando] = useState(false)
  const [errorEnvio, setErrorEnvio] = useState('')
  const [resultado, setResultado]   = useState(null) // 'creado' | 'existe'

  const set = (c, v) => {
    setForm(prev => ({ ...prev, [c]: v }))
    if (tocados[c] && VALIDAR[c]) setErrores(prev => ({ ...prev, [c]: VALIDAR[c](v) }))
  }
  const tocar = (c) => {
    setTocados(prev => ({ ...prev, [c]: true }))
    setErrores(prev => ({ ...prev, [c]: VALIDAR[c](form[c]) }))
  }
  const onPasteTel = (e) => {
    const d = e.clipboardData.getData('text').replace(/\D/g, '')
    let prefijo = null, numero = null
    if (d.startsWith('58') && d.length === 12)     { prefijo = '0' + d.slice(2, 5); numero = d.slice(5) }
    else if (d.startsWith('0') && d.length === 11) { prefijo = d.slice(0, 4);       numero = d.slice(4) }
    if (PREFIJOS.includes(prefijo) && numero?.length === 7) {
      e.preventDefault()
      setForm(prev => ({ ...prev, tel_prefijo: prefijo, tel_num: numero }))
      setErrores(prev => ({ ...prev, tel_num: '' }))
    }
  }

  const enviar = async (e) => {
    e.preventDefault()
    const errs = Object.fromEntries(Object.keys(VALIDAR).map(c => [c, VALIDAR[c](form[c])]))
    setErrores(errs)
    setTocados(Object.fromEntries(Object.keys(VALIDAR).map(c => [c, true])))
    if (Object.values(errs).some(Boolean)) return

    // Campo trampa: solo los bots lo llenan
    if (form.website) { setResultado('creado'); return }

    setEnviando(true)
    setErrorEnvio('')
    const { data, error } = await supabase.rpc('registrar_cliente_publico', {
      p_nombre:           form.nombre.trim(),
      p_apellido:         form.apellido.trim(),
      p_telefono:         `${form.tel_prefijo}-${form.tel_num}`,
      p_fecha_nacimiento: form.fecha_nacimiento || null,
    })
    setEnviando(false)
    if (error) {
      setErrorEnvio(error.message?.includes('inválid') || error.message?.includes('Demasiados')
        ? error.message
        : 'No se pudo completar el registro. Intenta de nuevo.')
      return
    }
    setResultado(data === 'existe' ? 'existe' : 'creado')
  }

  const err = (c) => tocados[c] && errores[c]
  const nombreCorto = form.nombre.trim().split(/\s+/)[0]

  return (
    <>
      <style>{`@media (prefers-reduced-motion: reduce) { .orb { animation: none !important; } }`}</style>

      <div className="bg-mesh" style={{ position: 'fixed', inset: 0, zIndex: -2 }} />
      <div style={{ position: 'fixed', inset: 0, zIndex: -1, overflow: 'hidden', pointerEvents: 'none' }}>
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
        <div className="orb orb-4" />
      </div>

      <main style={{ minHeight: '100svh', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 16px' }}>
        <div style={{ width: '100%', maxWidth: 380, display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* Marca */}
          <header style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            {/* El escudo ya dice "Samuel S7yle" */}
            <h1 style={{ margin: 0, lineHeight: 0 }}>
              <Logo size={200} />
            </h1>
            <div>
              <p style={{ margin: '6px 0 0', color: 'rgba(255,255,255,0.52)', fontSize: 13 }}>
                {resultado ? 'Puerto Cabello, Venezuela' : 'Regístrate como cliente en menos de un minuto'}
              </p>
            </div>
          </header>

          {resultado ? (
            <section className="glass-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, textAlign: 'center', padding: '28px 20px' }}>
              <div style={{
                width: 56, height: 56, borderRadius: 16,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(52,211,153,0.14)', border: '1px solid rgba(52,211,153,0.30)',
              }}>
                <CheckCircle2 size={28} color="#34d399" />
              </div>
              <div>
                <p style={{ margin: 0, color: '#fff', fontSize: 19, fontWeight: 700, letterSpacing: '-0.01em' }}>
                  {resultado === 'existe' ? `${nombreCorto}, ya estabas registrado` : `¡Listo, ${nombreCorto}!`}
                </p>
                <p style={{ margin: '8px 0 0', color: 'rgba(255,255,255,0.50)', fontSize: 14, lineHeight: 1.5 }}>
                  {resultado === 'existe'
                    ? 'Tus datos ya estaban guardados. Ahora puedes apartar tu cupo.'
                    : 'Ya quedaste registrado. Ahora puedes apartar tu cupo.'}
                </p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%' }}>
                <a href="/horario" className="glass-btn-primary" style={{ textDecoration: 'none' }}>
                  <CalendarClock size={18} />
                  Ver cupos disponibles
                </a>
                <a href={waLink(nombreCorto)} target="_blank" rel="noopener noreferrer"
                   style={{
                     display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                     padding: '13px 20px', borderRadius: 16, textDecoration: 'none',
                     background: 'rgba(37,211,102,0.10)', border: '1px solid rgba(37,211,102,0.30)',
                     color: '#6ee7b7', fontSize: 14, fontWeight: 600,
                   }}>
                  Escribirle a Samuel por WhatsApp
                </a>
              </div>
            </section>
          ) : (
            <form onSubmit={enviar} noValidate className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="glass-label" htmlFor="r-nombre">Nombre</label>
                  <input id="r-nombre" className={`glass-input${err('nombre') ? ' error' : ''}`}
                         value={form.nombre} autoComplete="given-name" maxLength={50}
                         onChange={e => set('nombre', e.target.value.replace(/[0-9]/g, ''))}
                         onBlur={() => tocar('nombre')} placeholder="Carlos" />
                  {err('nombre') && <p className="text-red-400 text-xs mt-1">{errores.nombre}</p>}
                </div>
                <div>
                  <label className="glass-label" htmlFor="r-apellido">Apellido</label>
                  <input id="r-apellido" className={`glass-input${err('apellido') ? ' error' : ''}`}
                         value={form.apellido} autoComplete="family-name" maxLength={50}
                         onChange={e => set('apellido', e.target.value.replace(/[0-9]/g, ''))}
                         onBlur={() => tocar('apellido')} placeholder="Pérez" />
                  {err('apellido') && <p className="text-red-400 text-xs mt-1">{errores.apellido}</p>}
                </div>
              </div>

              <div>
                <label className="glass-label" htmlFor="r-tel">WhatsApp</label>
                <div className="flex gap-2">
                  <select className="glass-input" style={{ width: 96, flexShrink: 0 }} aria-label="Prefijo"
                          value={form.tel_prefijo} onChange={e => set('tel_prefijo', e.target.value)}>
                    {PREFIJOS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                  <input id="r-tel" type="tel" inputMode="numeric" autoComplete="tel-local"
                         className={`glass-input flex-1${err('tel_num') ? ' error' : ''}`}
                         value={form.tel_num} maxLength={7} placeholder="1234567"
                         onChange={e => set('tel_num', e.target.value.replace(/\D/g, '').slice(0, 7))}
                         onBlur={() => tocar('tel_num')} onPaste={onPasteTel} />
                </div>
                {err('tel_num') && <p className="text-red-400 text-xs mt-1">{errores.tel_num}</p>}
              </div>

              <div>
                <label className="glass-label" htmlFor="r-nac">
                  Cumpleaños <span className="text-white/35 font-normal">(opcional)</span>
                </label>
                <input id="r-nac" type="date" className="glass-input" value={form.fecha_nacimiento}
                       max={new Date().toISOString().slice(0, 10)}
                       onChange={e => set('fecha_nacimiento', e.target.value)} />
              </div>

              {/* Campo trampa para bots, invisible para personas */}
              <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true"
                     value={form.website} onChange={e => set('website', e.target.value)}
                     style={{ position: 'absolute', left: -9999, width: 1, height: 1, opacity: 0 }} />

              {errorEnvio && <p className="text-red-400 text-sm text-center" role="alert">{errorEnvio}</p>}

              <button type="submit" disabled={enviando} className="glass-btn-primary" style={enviando ? { opacity: 0.6 } : {}}>
                {enviando ? 'Registrando…' : 'Registrarme'}
              </button>

              <p style={{ margin: 0, color: 'rgba(255,255,255,0.30)', fontSize: 11, textAlign: 'center', lineHeight: 1.5 }}>
                Tus datos solo los ve Samuel, para atenderte y avisarte de tus cupos.
              </p>
            </form>
          )}

        </div>
      </main>
    </>
  )
}
