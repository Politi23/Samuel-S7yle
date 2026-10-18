import QRCode from 'qrcode'

const W = 1080, H = 1920
const FUENTE = `Manrope, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`

// Escudo de la barbería; el PNG tiene margen transparente, este es el recorte útil
const LOGO_SRC = '/android-chrome-512x512.png'
const LOGO_RECORTE = { x: 85, y: 70, w: 349, h: 370 }

function cargarLogo() {
  return new Promise(res => {
    const img = new Image()
    img.onload = () => res(img)
    img.onerror = () => res(null)
    img.src = LOGO_SRC
  })
}

function dibujarLogo(ctx, logo, centroX, y, alto) {
  const { x: sx, y: sy, w: sw, h: sh } = LOGO_RECORTE
  const ancho = alto * sw / sh
  ctx.drawImage(logo, sx, sy, sw, sh, centroX - ancho / 2, y, ancho, alto)
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

/* Imagen vertical (tamaño de estado de WhatsApp / historia de Instagram) */
export async function dibujarEstado(canvas, url) {
  const ctx = canvas.getContext('2d')
  // El canvas solo usa la fuente si ya está cargada en esos pesos
  await Promise.all(['500 40px Manrope', '700 70px Manrope'].map(f => document.fonts?.load(f).catch(() => null)))
  const logo = await cargarLogo()
  canvas.width = W
  canvas.height = H

  // Fondo oscuro con brillos ámbar, como la app
  ctx.fillStyle = '#0c0a09'
  ctx.fillRect(0, 0, W, H)
  const brillo = (x, y, r, color) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r)
    g.addColorStop(0, color)
    g.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, W, H)
  }
  brillo(180, 260, 720, 'rgba(201,162,74,0.42)')
  brillo(960, 1700, 820, 'rgba(168,132,36,0.34)')
  brillo(980, 520, 460, 'rgba(226,201,138,0.12)')

  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'

  // Marca: el escudo (ya trae "Barbershop · Samuel S7yle"); si no carga, el nombre en texto
  if (logo) {
    ctx.shadowColor = 'rgba(226,201,138,0.35)'
    ctx.shadowBlur = 60
    dibujarLogo(ctx, logo, W / 2, 90, 330)
    ctx.shadowBlur = 0
  } else {
    ctx.fillStyle = '#d6b468'
    ctx.font = `700 34px ${FUENTE}`
    ctx.letterSpacing = '10px'
    ctx.fillText('BARBERSHOP', W / 2 + 5, 250)
    ctx.letterSpacing = '0px'
    ctx.fillStyle = '#ffffff'
    ctx.font = `800 104px ${FUENTE}`
    ctx.fillText('Samuel S7yle', W / 2, 360)
  }

  // Titular
  ctx.fillStyle = '#ecdcae'
  ctx.font = `700 70px ${FUENTE}`
  ctx.fillText('Regístrate como', W / 2, 540)
  ctx.fillText('cliente', W / 2, 622)
  ctx.fillStyle = 'rgba(255,255,255,0.62)'
  ctx.font = `500 40px ${FUENTE}`
  ctx.fillText('Escanea el código con tu cámara', W / 2, 700)

  // QR sobre tarjeta blanca (máximo contraste para que escanee bien)
  const lado = 640, pad = 48
  const cx = (W - lado - pad * 2) / 2, cy = 760
  ctx.shadowColor = 'rgba(201,162,74,0.45)'
  ctx.shadowBlur = 80
  ctx.fillStyle = '#ffffff'
  roundRect(ctx, cx, cy, lado + pad * 2, lado + pad * 2, 56)
  ctx.fill()
  ctx.shadowBlur = 0

  const qr = document.createElement('canvas')
  // Corrección 'H' (30%): el QR sigue escaneando aunque el logo tape el centro
  await QRCode.toCanvas(qr, url, { width: lado, margin: 0, errorCorrectionLevel: logo ? 'H' : 'M', color: { dark: '#111111', light: '#ffffff' } })
  ctx.drawImage(qr, cx + pad, cy + pad, lado, lado)

  // Logo en el centro del QR, sobre un recuadro blanco que tapa ~5% del código
  if (logo) {
    const caja = 156
    const qx = cx + pad + (lado - caja) / 2, qy = cy + pad + (lado - caja) / 2
    ctx.fillStyle = '#ffffff'
    roundRect(ctx, qx, qy, caja, caja, 28)
    ctx.fill()
    dibujarLogo(ctx, logo, W / 2, qy + 12, caja - 24)
  }

  // Link visible, para quien ve el estado en su propio teléfono
  const linkY = cy + lado + pad * 2 + 120
  ctx.fillStyle = 'rgba(255,255,255,0.55)'
  ctx.font = `500 38px ${FUENTE}`
  ctx.fillText('o entra a', W / 2, linkY)
  ctx.fillStyle = '#ffffff'
  ctx.font = `700 50px ${FUENTE}`
  ctx.fillText(url.replace(/^https?:\/\//, ''), W / 2, linkY + 70)

  // Pie
  ctx.fillStyle = 'rgba(255,255,255,0.40)'
  ctx.font = `500 34px ${FUENTE}`
  ctx.fillText('Puerto Cabello, Venezuela', W / 2, H - 120)
}
