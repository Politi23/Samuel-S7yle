import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'

const Dashboard      = lazy(() => import('./pages/Dashboard'))
const Clientes       = lazy(() => import('./pages/Clientes'))
const NuevoCliente   = lazy(() => import('./pages/NuevoCliente'))
const DetalleCliente = lazy(() => import('./pages/DetalleCliente'))
const Ingresos       = lazy(() => import('./pages/Ingresos'))
const NuevoIngreso   = lazy(() => import('./pages/NuevoIngreso'))
const Citas          = lazy(() => import('./pages/Citas'))
const NuevaCita      = lazy(() => import('./pages/NuevaCita'))
const Tasa           = lazy(() => import('./pages/Tasa'))
const Egresos        = lazy(() => import('./pages/Egresos'))
const NuevoEgreso    = lazy(() => import('./pages/NuevoEgreso'))
const Estadisticas   = lazy(() => import('./pages/Estadisticas'))

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={null}>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="clientes" element={<Clientes />} />
            <Route path="clientes/nuevo" element={<NuevoCliente />} />
            <Route path="clientes/:id" element={<DetalleCliente />} />
            <Route path="clientes/:id/editar" element={<NuevoCliente />} />
            <Route path="ingresos" element={<Ingresos />} />
            <Route path="ingresos/nuevo" element={<NuevoIngreso />} />
            <Route path="ingresos/:id/editar" element={<NuevoIngreso />} />
            <Route path="citas" element={<Citas />} />
            <Route path="citas/nueva" element={<NuevaCita />} />
            <Route path="citas/:id/editar" element={<NuevaCita />} />
            <Route path="egresos" element={<Egresos />} />
            <Route path="egresos/nuevo" element={<NuevoEgreso />} />
            <Route path="egresos/:id/editar" element={<NuevoEgreso />} />
            <Route path="tasa" element={<Tasa />} />
            <Route path="estadisticas" element={<Estadisticas />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
