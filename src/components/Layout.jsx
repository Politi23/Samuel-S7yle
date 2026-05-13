import { Outlet } from 'react-router-dom'
import BottomNav from './BottomNav'

export default function Layout() {
  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="fixed inset-0 -z-20 bg-mesh" />
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
        <div className="orb orb-4" />
      </div>
      <div className="relative z-0 max-w-md mx-auto w-full min-h-screen flex flex-col pb-20">
        <div className="page-enter flex-1">
          <Outlet />
        </div>
      </div>
      <BottomNav />
    </div>
  )
}
