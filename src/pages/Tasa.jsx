import { useState } from 'react'
import { RefreshCw, ArrowLeftRight } from 'lucide-react'
import { useBcv } from '../hooks/useBcv'
import PageHeader from '../components/PageHeader'

function formatBs(valor) {
  if (!valor && valor !== 0) return '—'
  return valor.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 4 })
}

function formatHora(isoStr) {
  if (!isoStr) return ''
  return new Date(isoStr).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Caracas' })
}

const MONEDAS = [
  { id: 'bs',  label: 'Bs.',  color: 'text-sky-300' },
  { id: 'usd', label: 'USD',  color: 'text-emerald-300' },
  { id: 'eur', label: 'EUR',  color: 'text-amber-300' },
]

export default function Tasa() {
  const { data, loading, error, refetch } = useBcv()
  const [monto, setMonto]     = useState('')
  const [desde, setDesde]     = useState('usd')
  const [hacia, setHacia]     = useState('bs')

  const intercambiar = () => { setDesde(hacia); setHacia(desde) }

  function convertir() {
    const n = parseFloat(monto)
    if (!n || !data) return null
    const rates = { usd: data.usd, eur: data.eur, bs: 1 }
    const enBs     = desde === 'bs' ? n : n * rates[desde]
    const resultado = hacia === 'bs' ? enBs : enBs / rates[hacia]
    return resultado
  }

  const resultado  = convertir()
  const monedaHacia = MONEDAS.find(m => m.id === hacia)
  const monedaDesde = MONEDAS.find(m => m.id === desde)

  return (
    <div className="min-h-screen">
      <PageHeader
        title="Tasa BCV"
        action={
          <button onClick={refetch} disabled={loading} className="glass-btn-icon w-10 h-10 flex items-center justify-center">
            <RefreshCw size={17} className={`text-white ${loading ? 'animate-spin' : ''}`} />
          </button>
        }
      />

      <div className="px-4 pt-4 pb-6 space-y-4">

        {data?.fecha && (
          <p className="text-center text-white/40 text-xs">
            Fecha valor: {data.fecha}
          </p>
        )}

        {/* Tasas oficiales */}
        {loading && !data ? (
          <div className="grid grid-cols-2 gap-3">
            {[0, 1].map(i => (
              <div key={i} className="glass-card text-center py-6 animate-pulse">
                <div className="h-3 w-12 rounded mx-auto mb-3" style={{background:'rgba(255,255,255,0.12)'}} />
                <div className="h-7 w-24 rounded mx-auto" style={{background:'rgba(255,255,255,0.10)'}} />
              </div>
            ))}
          </div>
        ) : error && !data ? (
          <div className="glass-card text-center py-8">
            <p className="text-red-400/80 text-sm">No se pudo obtener la tasa</p>
            <p className="text-white/30 text-xs mt-1">{error}</p>
            <button onClick={refetch} className="mt-3 text-amber-300 text-sm font-medium">
              Reintentar
            </button>
          </div>
        ) : data && (
          <div className="grid grid-cols-2 gap-3">
            <div className="glass-card text-center py-5"
                 style={{background:'rgba(52,211,153,0.10)', border:'1px solid rgba(52,211,153,0.22)'}}>
              <p className="text-xs text-emerald-300/65 font-semibold mb-2">1 USD</p>
              <p className="text-2xl font-bold text-emerald-300">{formatBs(data.usd)}</p>
              <p className="text-emerald-300/45 text-xs mt-1">bolívares</p>
            </div>
            <div className="glass-card text-center py-5"
                 style={{background:'rgba(251,191,36,0.10)', border:'1px solid rgba(251,191,36,0.22)'}}>
              <p className="text-xs text-amber-300/65 font-semibold mb-2">1 EUR</p>
              <p className="text-2xl font-bold text-amber-300">{formatBs(data.eur)}</p>
              <p className="text-amber-300/45 text-xs mt-1">bolívares</p>
            </div>
          </div>
        )}

        {data && (
          <p className="text-white/55 text-[10px] text-center -mt-2">
            {data.stale ? '⚠ Datos desactualizados · ' : data.cached ? 'En caché · ' : 'Actualizado · '}
            {formatHora(data.fetchedAt)}
          </p>
        )}

        {/* Accesos rápidos */}
        {data && (
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => { setDesde('usd'); setHacia('bs') }}
                    className="py-2.5 rounded-2xl text-xs font-semibold transition-all"
                    style={{
                      background: desde === 'usd' && hacia === 'bs' ? 'rgba(52,211,153,0.25)' : 'rgba(52,211,153,0.09)',
                      border: `1px solid ${desde === 'usd' && hacia === 'bs' ? 'rgba(52,211,153,0.50)' : 'rgba(52,211,153,0.20)'}`,
                      color: '#6ee7b7'
                    }}>
              USD → Bs
              {data.usd && <span className="block text-[10px] opacity-60 mt-0.5">1 USD = {formatBs(data.usd)} Bs</span>}
            </button>
            <button onClick={() => { setDesde('eur'); setHacia('bs') }}
                    className="py-2.5 rounded-2xl text-xs font-semibold transition-all"
                    style={{
                      background: desde === 'eur' && hacia === 'bs' ? 'rgba(251,191,36,0.25)' : 'rgba(251,191,36,0.09)',
                      border: `1px solid ${desde === 'eur' && hacia === 'bs' ? 'rgba(251,191,36,0.50)' : 'rgba(251,191,36,0.20)'}`,
                      color: '#fcd34d'
                    }}>
              EUR → Bs
              {data.eur && <span className="block text-[10px] opacity-60 mt-0.5">1 EUR = {formatBs(data.eur)} Bs</span>}
            </button>
            <button onClick={() => { setDesde('bs'); setHacia('usd') }}
                    className="py-2.5 rounded-2xl text-xs font-semibold transition-all"
                    style={{
                      background: desde === 'bs' && hacia === 'usd' ? 'rgba(52,211,153,0.25)' : 'rgba(52,211,153,0.09)',
                      border: `1px solid ${desde === 'bs' && hacia === 'usd' ? 'rgba(52,211,153,0.50)' : 'rgba(52,211,153,0.20)'}`,
                      color: '#6ee7b7'
                    }}>
              Bs → USD
            </button>
            <button onClick={() => { setDesde('bs'); setHacia('eur') }}
                    className="py-2.5 rounded-2xl text-xs font-semibold transition-all"
                    style={{
                      background: desde === 'bs' && hacia === 'eur' ? 'rgba(251,191,36,0.25)' : 'rgba(251,191,36,0.09)',
                      border: `1px solid ${desde === 'bs' && hacia === 'eur' ? 'rgba(251,191,36,0.50)' : 'rgba(251,191,36,0.20)'}`,
                      color: '#fcd34d'
                    }}>
              Bs → EUR
            </button>
          </div>
        )}

        {/* Calculadora */}
        <div className="glass-card space-y-4">
          <h2 className="text-white font-semibold text-sm">Calculadora</h2>

          <div>
            <label className="glass-label">Monto</label>
            <input type="number" inputMode="decimal" className="glass-input"
                   placeholder="0.00" value={monto} onChange={e => setMonto(e.target.value)} />
          </div>

          <div className="flex items-center gap-2">
            <div className="flex-1">
              <label className="glass-label">De</label>
              <div className="grid grid-cols-3 gap-1 rounded-2xl overflow-hidden"
                   style={{border:'1px solid rgba(255,255,255,0.18)'}}>
                {MONEDAS.map(m => (
                  <button key={m.id}
                          onClick={() => { if (m.id === hacia) intercambiar(); else setDesde(m.id) }}
                          className="py-2.5 text-sm font-bold transition-colors"
                          style={{
                            background: desde === m.id ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.05)',
                            color: desde === m.id ? 'white' : 'rgba(255,255,255,0.38)'
                          }}>
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            <button onClick={intercambiar} className="glass-btn-icon mt-5 w-10 h-10 flex items-center justify-center flex-shrink-0">
              <ArrowLeftRight size={16} className="text-white" />
            </button>

            <div className="flex-1">
              <label className="glass-label">A</label>
              <div className="grid grid-cols-3 gap-1 rounded-2xl overflow-hidden"
                   style={{border:'1px solid rgba(255,255,255,0.18)'}}>
                {MONEDAS.map(m => (
                  <button key={m.id}
                          onClick={() => { if (m.id === desde) intercambiar(); else setHacia(m.id) }}
                          className="py-2.5 text-sm font-bold transition-colors"
                          style={{
                            background: hacia === m.id ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.05)',
                            color: hacia === m.id ? 'white' : 'rgba(255,255,255,0.38)'
                          }}>
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-2xl px-4 py-5 text-center"
               style={{background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.12)'}}>
            {!data ? (
              <p className="text-white/30 text-sm">Esperando tasa del BCV…</p>
            ) : !monto || parseFloat(monto) === 0 ? (
              <p className="text-white/30 text-sm">Ingresa un monto</p>
            ) : resultado !== null ? (
              <>
                <p className="text-white/45 text-xs mb-1">
                  {parseFloat(monto).toLocaleString('es-VE', {minimumFractionDigits:2})} {monedaDesde?.label} =
                </p>
                <p className={`text-3xl font-bold ${monedaHacia?.color}`}>
                  {resultado.toLocaleString('es-VE', {
                    minimumFractionDigits: hacia === 'bs' ? 2 : 4,
                    maximumFractionDigits: hacia === 'bs' ? 2 : 6,
                  })}
                </p>
                <p className="text-white/40 text-sm mt-1">{monedaHacia?.label}</p>
              </>
            ) : (
              <p className="text-white/30 text-sm">—</p>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
