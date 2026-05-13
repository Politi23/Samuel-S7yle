import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { Eye, EyeOff, LogIn } from 'lucide-react'

export default function Login() {
  const { login } = useAuth()
  const [email, setEmail]           = useState('')
  const [contrasena, setContrasena] = useState('')
  const [verPass, setVerPass]       = useState(false)
  const [error, setError]           = useState('')
  const [loading, setLoading]       = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const ok = await login(email.trim(), contrasena)
    if (!ok) {
      setError('Usuario o contraseña incorrectos')
      setContrasena('')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6">
      <div className="fixed inset-0 -z-20 bg-mesh" />
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="orb orb-1" /><div className="orb orb-2" />
        <div className="orb orb-3" /><div className="orb orb-4" />
      </div>

      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto"
               style={{background:'rgba(217,119,6,0.25)', border:'1px solid rgba(217,119,6,0.50)', boxShadow:'inset 0 1px 0 rgba(255,255,255,0.35)'}}>
            <span className="text-white text-4xl font-bold">S</span>
          </div>
          <h1 className="text-white text-2xl font-bold">S7tyle</h1>
          <p className="text-white/40 text-sm">Inicia sesión para continuar</p>
        </div>

        <form onSubmit={handleSubmit} className="glass-card space-y-4">
          <div>
            <label className="glass-label">Correo</label>
            <input className="glass-input" type="email" placeholder="correo@ejemplo.com"
                   value={email} onChange={e => { setEmail(e.target.value); setError('') }}
                   autoCapitalize="none" autoCorrect="off" autoComplete="email" required />
          </div>
          <div>
            <label className="glass-label">Contraseña</label>
            <div className="relative">
              <input className="glass-input" style={{paddingRight:'44px'}}
                     type={verPass ? 'text' : 'password'} placeholder="Contraseña"
                     value={contrasena} onChange={e => { setContrasena(e.target.value); setError('') }}
                     autoComplete="current-password" required />
              <button type="button" onClick={() => setVerPass(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 active:text-white/70">
                {verPass ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && <p className="text-red-400 text-sm text-center">{error}</p>}

          <button type="submit" disabled={loading} className="glass-btn-primary">
            {loading ? (
              <span className="w-5 h-5 rounded-full border-2 border-amber-400 border-t-amber-700 animate-spin" />
            ) : (
              <><LogIn size={18} /> Ingresar</>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
