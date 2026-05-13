import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export default function PageHeader({ title, back = false, action }) {
  const navigate = useNavigate()

  return (
    <div className="glass-header sticky top-0 z-40 px-4 py-3">
      <div className="max-w-md mx-auto flex items-center justify-between gap-3">
        <div className="w-10 flex-shrink-0 flex justify-start">
          {back ? (
            <button onClick={() => navigate(-1)} className="glass-btn-icon w-10 h-10 flex items-center justify-center">
              <ArrowLeft size={19} className="text-white" />
            </button>
          ) : (
            <div className="w-10 h-10" />
          )}
        </div>
        <h1 className="flex-1 text-center text-white text-[17px] font-bold tracking-tight truncate">
          {title}
        </h1>
        <div className="min-w-10 flex-shrink-0 flex justify-end">
          {action ?? <div className="w-10 h-10" />}
        </div>
      </div>
    </div>
  )
}
