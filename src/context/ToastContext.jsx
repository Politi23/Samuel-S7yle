import { createContext, useContext, useState, useCallback, useRef } from 'react'
import { CheckCircle2, XCircle, AlertCircle, X } from 'lucide-react'

const ToastCtx = createContext(null)

const ICONS = {
  success: CheckCircle2,
  error:   XCircle,
  warning: AlertCircle,
}
const COLORS = {
  success: { bg: 'rgba(52,211,153,0.18)',  border: 'rgba(52,211,153,0.40)',  icon: '#6ee7b7' },
  error:   { bg: 'rgba(239,68,68,0.18)',   border: 'rgba(239,68,68,0.40)',   icon: '#fca5a5' },
  warning: { bg: 'rgba(251,191,36,0.18)',  border: 'rgba(251,191,36,0.40)',  icon: '#fde68a' },
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const idRef = useRef(0)

  const toast = useCallback((message, type = 'success') => {
    const id = ++idRef.current
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3200)
  }, [])

  const dismiss = (id) => setToasts(prev => prev.filter(t => t.id !== id))

  return (
    <ToastCtx.Provider value={toast}>
      {children}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2 w-[calc(100%-2rem)] max-w-sm pointer-events-none">
        {toasts.map(({ id, message, type }) => {
          const Icon = ICONS[type] || ICONS.success
          const c = COLORS[type] || COLORS.success
          return (
            <div key={id}
                 className="flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl pointer-events-auto animate-toast-in"
                 style={{ background: c.bg, border: `1px solid ${c.border}`, backdropFilter: 'blur(20px)' }}>
              <Icon size={17} style={{ color: c.icon, flexShrink: 0 }} />
              <span className="text-white text-sm font-medium flex-1">{message}</span>
              <button onClick={() => dismiss(id)} className="text-white/40 active:text-white/70 flex-shrink-0">
                <X size={15} />
              </button>
            </div>
          )
        })}
      </div>
    </ToastCtx.Provider>
  )
}

export function useToast() {
  return useContext(ToastCtx)
}
