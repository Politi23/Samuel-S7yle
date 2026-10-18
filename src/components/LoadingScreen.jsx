import Logo from './Logo'

export default function LoadingScreen({ error }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-5 px-8">
      <div className="fixed inset-0 -z-20 bg-mesh" />
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
      </div>

      {error ? (
        <div className="glass-card text-center max-w-xs w-full py-8 space-y-3">
          <p className="text-2xl">⚠️</p>
          <p className="text-white font-bold">Error de conexión</p>
          <p className="text-white/50 text-sm">{error}</p>
          <p className="text-white/35 text-xs">
            Verifica que el archivo <span className="text-white/60 font-mono">.env</span> tenga las credenciales de Supabase.
          </p>
          <button onClick={() => window.location.reload()} className="glass-btn-primary mt-2" style={{padding:'10px 24px', width:'auto'}}>
            Reintentar
          </button>
        </div>
      ) : (
        <>
          <Logo size={160} />
          <p className="text-white/40 text-sm">Cargando datos…</p>
          <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-amber-400/80 animate-spin" />
        </>
      )}
    </div>
  )
}
