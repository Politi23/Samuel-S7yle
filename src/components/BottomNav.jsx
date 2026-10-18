import { NavLink } from 'react-router-dom'
import { Home, Users, BarChart2, CalendarDays, DollarSign, ArrowDownCircle, CalendarCheck } from 'lucide-react'

const links = [
  { to: '/',               label: 'Inicio',    Icon: Home },
  { to: '/clientes',       label: 'Clientes',  Icon: Users },
  { to: '/citas',          label: 'Citas',     Icon: CalendarDays },
  { to: '/ingresos',       label: 'Ingresos',  Icon: DollarSign },
  { to: '/egresos',        label: 'Egresos',   Icon: ArrowDownCircle },
  { to: '/estadisticas',   label: 'Stats',     Icon: BarChart2 },
  { to: '/disponibilidad', label: 'Horario',   Icon: CalendarCheck },
]

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass-nav" aria-label="Navegación principal">
      <div className="max-w-md mx-auto flex items-stretch px-1">
        {links.map(({ to, label, Icon }) => (
          <NavLink key={to} to={to} end={to === '/'}
                   className="relative flex-1 flex flex-col items-center justify-center gap-1 pt-2.5 pb-2 min-h-[56px]">
            {({ isActive }) => (
              <>
                {/* Filete dorado sobre la pestaña activa */}
                <span aria-hidden="true"
                      className="absolute top-0 left-1/2 -translate-x-1/2 h-[2px] rounded-full transition-all duration-200"
                      style={{
                        width: isActive ? 22 : 0,
                        background: 'linear-gradient(90deg, #9c7a2c, #e2c98a, #9c7a2c)',
                      }} />
                <Icon size={20} strokeWidth={isActive ? 2.2 : 1.7}
                      className="transition-colors duration-200"
                      style={{ color: isActive ? '#e2c98a' : 'rgba(247,242,232,0.50)' }} />
                <span className="text-[10px] font-semibold leading-none transition-colors duration-200"
                      style={{ color: isActive ? '#e2c98a' : 'rgba(247,242,232,0.50)' }}>
                  {label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
