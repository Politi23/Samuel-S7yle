import React from 'react'
import ReactDOM from 'react-dom/client'
import { AppProvider, useApp } from './context/AppContext'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import App from './App'
import Login from './pages/Login'
import LoadingScreen from './components/LoadingScreen'
import './index.css'

function Root() {
  const { autenticado, cargando } = useAuth()
  const { loading, error } = useApp()
  if (cargando) return <LoadingScreen />
  if (!autenticado) return <Login />
  if (loading || error) return <LoadingScreen error={error} />
  return <App />
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <AppProvider>
        <ToastProvider>
          <Root />
        </ToastProvider>
      </AppProvider>
    </AuthProvider>
  </React.StrictMode>
)
