// Escudo de Samuel S7yle. El PNG trae ~14% de margen transparente arriba y abajo;
// los márgenes negativos lo compensan para que el espacio alrededor sea el real.
export default function Logo({ size = 160, glow = true, alt = 'Samuel S7yle Barbershop', style }) {
  const recorte = Math.round(size * 0.14)
  return (
    <img
      src="/android-chrome-512x512.png"
      alt={alt}
      width={size}
      height={size}
      style={{
        display: 'block',
        width: size,
        height: size,
        margin: `-${recorte}px auto`,
        filter: glow ? 'drop-shadow(0 0 24px rgba(251,191,36,0.28))' : undefined,
        ...style,
      }}
    />
  )
}
