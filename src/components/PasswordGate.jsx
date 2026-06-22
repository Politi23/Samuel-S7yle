import { useState } from 'react'
import { Lock, Eye, EyeOff } from 'lucide-react'

const CLAVE       = 'samuel7'
const STORAGE_KEY = 'horario_auth'

export default function PasswordGate({ children }) {
  const [ok, setOk]           = useState(() => sessionStorage.getItem(STORAGE_KEY) === '1')
  const [valor, setValor]     = useState('')
  const [error, setError]     = useState(false)
  const [verPass, setVerPass] = useState(false)

  if (ok) return children

  const intentar = (e) => {
    e.preventDefault()
    if (valor === CLAVE) {
      sessionStorage.setItem(STORAGE_KEY, '1')
      setOk(true)
    } else {
      setError(true)
      setValor('')
    }
  }

  return (
    <div style={{
      minHeight: '100svh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', padding: 24,
    }}>
      <div style={{ width: '100%', maxWidth: 320, display: 'flex', flexDirection: 'column', gap: 28 }}>

        {/* Encabezado */}
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 60, height: 60, borderRadius: 17,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(217,119,6,0.20)',
            border: '1px solid rgba(217,119,6,0.42)',
            boxShadow: '0 0 28px rgba(217,119,6,0.16), inset 0 1px 0 rgba(255,255,255,0.28)',
          }}>
            <Lock size={22} color="#fbbf24" strokeWidth={2} />
          </div>
          <div>
            <h1 style={{ margin: 0, color: '#fff', fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }}>
              Horario
            </h1>
            <p style={{ margin: '6px 0 0', color: 'rgba(255,255,255,0.42)', fontSize: 13 }}>
              Ingresa la contraseña para continuar
            </p>
          </div>
        </div>

        {/* Formulario */}
        <form onSubmit={intentar} className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label className="glass-label">Contraseña</label>
            <div style={{ position: 'relative' }}>
              <input
                className="glass-input"
                type={verPass ? 'text' : 'password'}
                value={valor}
                onChange={e => { setValor(e.target.value); setError(false) }}
                placeholder="••••••••"
                autoFocus
                autoComplete="current-password"
                style={{ paddingRight: 44 }}
              />
              <button
                type="button"
                onClick={() => setVerPass(v => !v)}
                style={{
                  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'rgba(255,255,255,0.40)', display: 'flex', padding: 4,
                }}>
                {verPass ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && (
            <p style={{ margin: 0, color: '#f87171', fontSize: 13, textAlign: 'center' }}>
              Contraseña incorrecta
            </p>
          )}

          <button type="submit" className="glass-btn-primary" style={{ gap: 8 }}>
            <Lock size={16} />
            Entrar
          </button>
        </form>

      </div>
    </div>
  )
}
