import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { Search, Plus, ChevronRight, Users } from 'lucide-react'
import PageHeader from '../components/PageHeader'

export default function Clientes() {
  const { clientes } = useApp()
  const navigate = useNavigate()
  const [busqueda, setBusqueda] = useState('')

  const filtrados = clientes.filter(c => {
    const q = busqueda.toLowerCase()
    return (
      (c.nombre||'').toLowerCase().includes(q) ||
      (c.apellido||'').toLowerCase().includes(q) ||
      (c.cedula||'').toLowerCase().includes(q) ||
      (c.telefono && c.telefono.includes(q))
    )
  })

  return (
    <div className="min-h-screen">
      <PageHeader
        title="Clientes"
        action={
          <button onClick={() => navigate('/clientes/nuevo')} className="glass-btn-icon w-10 h-10 flex items-center justify-center">
            <Plus size={19} className="text-white" />
          </button>
        }
      />

      <div className="px-4 pt-4 pb-6 space-y-3">
        <div className="relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
          <input type="text" placeholder="Buscar cliente..." value={busqueda}
                 onChange={e => setBusqueda(e.target.value)}
                 className="glass-input" style={{paddingLeft:'40px'}} />
        </div>

        {filtrados.length === 0 && busqueda === '' && (
          <div className="glass-card text-center py-14 mt-4">
            <Users size={36} className="text-white/25 mx-auto mb-3" />
            <p className="text-white/45 text-sm mb-4">No hay clientes registrados</p>
            <div className="flex justify-center">
              <button onClick={() => navigate('/clientes/nuevo')} className="glass-btn-primary" style={{width:'auto', padding:'10px 24px'}}>
                Registrar primer cliente
              </button>
            </div>
          </div>
        )}

        {filtrados.length === 0 && busqueda !== '' && (
          <div className="text-center py-12">
            <p className="text-white/35 text-sm">Sin resultados para "{busqueda}"</p>
          </div>
        )}

        {filtrados.map(c => (
          <button key={c.id} onClick={() => navigate(`/clientes/${c.id}`)}
                  className="w-full glass-card flex items-center gap-3 active:bg-white/15 transition-colors text-left">
            <div className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0"
                 style={{background:'rgba(217,119,6,0.20)', border:'1px solid rgba(217,119,6,0.35)'}}>
              <span className="text-amber-300 font-bold text-sm">{(c.nombre||' ')[0]}{(c.apellido||' ')[0]}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold truncate">{c.nombre} {c.apellido}</p>
              {c.cedula && <p className="text-white/50 text-sm">{c.cedula}</p>}
              {c.telefono && <p className="text-white/35 text-xs">{c.telefono}</p>}
            </div>
            <ChevronRight size={17} className="text-white/25 flex-shrink-0" />
          </button>
        ))}

        {filtrados.length > 0 && (
          <p className="text-center text-white/25 text-xs py-1">
            {filtrados.length} {filtrados.length === 1 ? 'cliente' : 'clientes'}
          </p>
        )}
      </div>
    </div>
  )
}
