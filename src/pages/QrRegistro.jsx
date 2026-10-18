import { useState, useEffect, useRef } from 'react'
import { Share2, Download, Copy, CheckCircle2 } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import { useToast } from '../context/ToastContext'
import { dibujarEstado } from '../lib/qrEstado'

export default function QrRegistro() {
  const toast = useToast()
  const canvasRef = useRef(null)
  const [preview, setPreview] = useState(null)
  const [copiado, setCopiado] = useState(false)

  const url = `${window.location.origin}/registro`
  const textoCompartir = `💈 Regístrate como cliente de Samuel S7yle: ${url}`

  useEffect(() => {
    let cancelado = false
    ;(async () => {
      await document.fonts?.ready
      const canvas = canvasRef.current
      await dibujarEstado(canvas, url)
      if (!cancelado) setPreview(canvas.toDataURL('image/png'))
    })().catch(() => toast('No se pudo generar el QR', 'error'))
    return () => { cancelado = true }
  }, [url]) // eslint-disable-line react-hooks/exhaustive-deps

  const obtenerArchivo = () => new Promise(res =>
    canvasRef.current.toBlob(b => res(new File([b], 'registro-samuel-s7yle.png', { type: 'image/png' })), 'image/png'))

  const descargar = async () => {
    const archivo = await obtenerArchivo()
    const a = document.createElement('a')
    a.href = URL.createObjectURL(archivo)
    a.download = archivo.name
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 1000)
  }

  const compartir = async () => {
    const archivo = await obtenerArchivo()
    if (navigator.canShare?.({ files: [archivo] })) {
      try {
        await navigator.share({ files: [archivo], text: textoCompartir })
      } catch (e) {
        if (e.name !== 'AbortError') toast('No se pudo compartir', 'error')
      }
    } else {
      await descargar()
      toast('Imagen descargada. Súbela a tu estado.', 'success')
    }
  }

  const copiarLink = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2200)
    } catch {
      toast('No se pudo copiar', 'error')
    }
  }

  return (
    <div className="min-h-screen">
      <PageHeader title="QR de registro" back />
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      <div className="px-4 pt-4 pb-8 space-y-4 max-w-md mx-auto">
        <div className="glass-card" style={{ padding: 12 }}>
          {preview ? (
            <img src={preview} alt="Imagen para estado con el QR de registro"
                 style={{ width: '100%', maxWidth: 300, margin: '0 auto', display: 'block', borderRadius: 18, aspectRatio: '9 / 16' }} />
          ) : (
            <div style={{ width: '100%', maxWidth: 300, margin: '0 auto', borderRadius: 18, aspectRatio: '9 / 16', background: 'rgba(255,255,255,0.06)' }} />
          )}
        </div>

        <button onClick={compartir} disabled={!preview} className="glass-btn-primary" style={!preview ? { opacity: 0.6 } : {}}>
          <Share2 size={18} />
          Compartir en mi estado
        </button>

        <div className="grid grid-cols-2 gap-2">
          <button onClick={descargar} disabled={!preview}
                  className="glass-card flex items-center justify-center gap-2 py-3 text-sm font-semibold text-white/75 active:bg-white/10">
            <Download size={16} /> Descargar
          </button>
          <button onClick={copiarLink}
                  className="glass-card flex items-center justify-center gap-2 py-3 text-sm font-semibold active:bg-white/10"
                  style={{ color: copiado ? '#7cc093' : 'rgba(255,255,255,0.75)' }}>
            {copiado ? <CheckCircle2 size={16} /> : <Copy size={16} />}
            {copiado ? 'Copiado' : 'Copiar link'}
          </button>
        </div>

        <div className="glass-card space-y-2">
          <p className="text-white text-sm font-semibold">Cómo usarlo</p>
          <p className="text-white/50 text-xs leading-relaxed">
            Quien vea tu estado en su teléfono no puede escanear su propia pantalla, así que pega
            también el link en el texto del estado: así pueden tocarlo. El QR sirve cuando lo ven
            en otro teléfono o si lo imprimes para la barbería.
          </p>
          <p className="text-white/50 text-xs leading-relaxed">
            Los que se registren aparecen solos en Clientes, marcados con <span className="text-amber-300 font-semibold">QR</span>.
            Si alguien ya estaba registrado con ese número, no se duplica.
          </p>
          <p className="text-white/30 text-xs break-all">{url}</p>
        </div>
      </div>
    </div>
  )
}
