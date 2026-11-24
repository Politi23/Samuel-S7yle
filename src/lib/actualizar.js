// La app guarda una copia en el teléfono para abrir rápido y sin internet. Cuando se
// publica una versión nueva, el service worker la descarga y toma el control; aquí se
// recarga la página para mostrarla. Para no interrumpir a Samuel mientras escribe, solo
// se recarga si la app estaba en segundo plano o si acaba de volver a abrirla.

const VENTANA_AL_VOLVER = 15000 // ms después de volver a la app en los que sí se puede recargar
const CADA = 30 * 60 * 1000     // revisar si hay versión nueva cada 30 minutos

export function actualizarSola() {
  if (!('serviceWorker' in navigator)) return

  const habiaVersion = !!navigator.serviceWorker.controller // la primera instalación no recarga
  let volvio = Date.now()
  let pendiente = false
  let recargando = false

  const recargar = () => {
    if (recargando) return
    recargando = true
    window.location.reload()
  }

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!habiaVersion) return
    const recienAbierta = Date.now() - volvio < VENTANA_AL_VOLVER
    if (document.visibilityState === 'hidden' || recienAbierta) recargar()
    else pendiente = true // se recarga la próxima vez que vuelva a la app
  })

  const revisar = () => navigator.serviceWorker.getRegistration().then(r => r?.update()).catch(() => {})

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return
    volvio = Date.now()
    if (pendiente) recargar()
    else revisar()
  })
  setInterval(revisar, CADA)
}
