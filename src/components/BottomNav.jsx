import { NavLink } from 'react-router-dom'
import { Home, Users, BarChart2, CalendarDays, DollarSign, ArrowDownCircle } from 'lucide-react'

const links = [
  { to: '/',            label: 'Inicio',   Icon: Home },
  { to: '/clientes',    label: 'Clientes', Icon: Users },
  { to: '/citas',       label: 'Citas',    Icon: CalendarDays },
  { to: '/ingresos',    label: 'Ingresos', Icon: DollarSign },
  { to: '/egresos',     label: 'Egresos',  Icon: ArrowDownCircle },
  { to: '/estadisticas',label: 'Stats',    Icon: BarChart2 },
]

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass-nav">
      <div className="max-w-md mx-auto flex items-center px-1 py-1">
        {links.map(({ to, label, Icon }) => (
          <NavLink key={to} to={to} end={to === '/'} className="flex-1 flex flex-col items-center justify-center">
            {({ isActive }) => (
              <div className="flex flex-col items-center gap-0.5 py-2 rounded-xl transition-all duration-200">
                <div className={`p-1.5 rounded-xl transition-all duration-200 ${
                  isActive ? 'bg-white/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.4)]' : ''
                }`}>
                  <Icon size={19} strokeWidth={isActive ? 2.5 : 1.8} className={isActive ? 'text-white' : 'text-white/45'} />
                </div>
                <span className={`text-[9px] font-semibold tracking-wide ${isActive ? 'text-white' : 'text-white/40'}`}>
                  {label}
                </span>
              </div>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
