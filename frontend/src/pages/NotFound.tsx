import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Home, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'

const SIZE = 260
const CX = SIZE / 2
const CY = SIZE / 2
const R = SIZE * 0.40
const PURPLE = '#6548c8'
const PURPLE_L = '#7c5fdb'

function drawInstrument(ctx: CanvasRenderingContext2D, angle: number, turb: number) {
  ctx.clearRect(0, 0, SIZE, SIZE)

  // Bezel com sombra
  ctx.save()
  ctx.shadowColor = 'rgba(0,0,0,0.4)'
  ctx.shadowBlur = 24
  ctx.shadowOffsetY = 8
  const bezelGrad = ctx.createRadialGradient(CX, CY - R * 0.4, 4, CX, CY, R * 1.15)
  bezelGrad.addColorStop(0, '#26263a')
  bezelGrad.addColorStop(1, '#0b0b12')
  ctx.beginPath()
  ctx.arc(CX, CY, R * 1.12, 0, Math.PI * 2)
  ctx.fillStyle = bezelGrad
  ctx.fill()
  ctx.restore()

  // Rim do bezel
  ctx.beginPath()
  ctx.arc(CX, CY, R * 1.12, 0, Math.PI * 2)
  ctx.strokeStyle = 'rgba(255,255,255,0.07)'
  ctx.lineWidth = 2
  ctx.stroke()

  // Face do instrumento
  const faceGrad = ctx.createRadialGradient(CX, CY - R * 0.15, R * 0.05, CX, CY, R)
  faceGrad.addColorStop(0, '#1c1c2c')
  faceGrad.addColorStop(1, '#0e0e1a')
  ctx.beginPath()
  ctx.arc(CX, CY, R, 0, Math.PI * 2)
  ctx.fillStyle = faceGrad
  ctx.fill()

  // Clip na face para a rosa dos ventos
  ctx.save()
  ctx.beginPath()
  ctx.arc(CX, CY, R * 0.99, 0, Math.PI * 2)
  ctx.clip()

  // Rosa dos ventos (rotaciona)
  ctx.save()
  ctx.translate(CX, CY)
  ctx.rotate(((angle + turb) * Math.PI) / 180)

  // Marcações de grau
  for (let deg = 0; deg < 360; deg += 5) {
    const rad = (deg * Math.PI) / 180
    const isCard = deg % 90 === 0
    const isMaj = deg % 10 === 0
    const outer = R * 0.90
    const len = isCard ? R * 0.18 : isMaj ? R * 0.12 : R * 0.07
    const inner = outer - len
    ctx.beginPath()
    ctx.moveTo(Math.sin(rad) * outer, -Math.cos(rad) * outer)
    ctx.lineTo(Math.sin(rad) * inner, -Math.cos(rad) * inner)
    ctx.strokeStyle = isCard
      ? 'rgba(255,255,255,0.88)'
      : isMaj
      ? 'rgba(255,255,255,0.42)'
      : 'rgba(255,255,255,0.18)'
    ctx.lineWidth = isCard ? 2.5 : 1.5
    ctx.stroke()
  }

  // Números de grau a cada 30° (sem cardeais)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  for (let deg = 30; deg < 360; deg += 30) {
    if (deg % 90 === 0) continue
    const rad = (deg * Math.PI) / 180
    ctx.font = `600 ${Math.round(R * 0.11)}px system-ui, sans-serif`
    ctx.fillStyle = 'rgba(255,255,255,0.28)'
    ctx.fillText(
      String(deg / 10).padStart(2, '0'),
      Math.sin(rad) * R * 0.69,
      -Math.cos(rad) * R * 0.69,
    )
  }

  // Pontos cardeais — N em roxo, demais em branco
  const cards: [string, number, string, number][] = [
    ['N', 0,   PURPLE_L,                   R * 0.165],
    ['S', 180, 'rgba(255,255,255,0.58)',    R * 0.13],
    ['L', 90,  'rgba(255,255,255,0.58)',    R * 0.13],
    ['O', 270, 'rgba(255,255,255,0.58)',    R * 0.13],
  ]
  cards.forEach(([label, a, color, sz]) => {
    const rad = (a * Math.PI) / 180
    ctx.font = `700 ${Math.round(sz)}px system-ui, sans-serif`
    ctx.fillStyle = color
    ctx.fillText(label, Math.sin(rad) * R * 0.57, -Math.cos(rad) * R * 0.57)
  })

  ctx.restore()
  ctx.restore()

  // Linha de proa (fixa, roxa) — referência de heading
  ctx.beginPath()
  ctx.moveTo(CX, CY - R * 0.88)
  ctx.lineTo(CX, CY - R * 1.07)
  ctx.strokeStyle = PURPLE_L
  ctx.lineWidth = 3
  ctx.lineCap = 'round'
  ctx.stroke()

  // Triângulo da linha de proa
  const tipY = CY - R * 0.88
  ctx.beginPath()
  ctx.moveTo(CX, tipY)
  ctx.lineTo(CX - R * 0.055, tipY + R * 0.13)
  ctx.lineTo(CX + R * 0.055, tipY + R * 0.13)
  ctx.closePath()
  ctx.fillStyle = PURPLE_L
  ctx.fill()

  // "404" centralizado, fixo
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.shadowColor = 'rgba(130,100,210,0.55)'
  ctx.shadowBlur = 14
  ctx.font = `800 ${Math.round(R * 0.50)}px system-ui, sans-serif`
  ctx.fillStyle = 'rgba(255,255,255,0.95)'
  ctx.fillText('404', CX, CY - R * 0.04)
  ctx.shadowBlur = 0

  // Sublabel fixo
  ctx.font = `500 ${Math.round(R * 0.094)}px system-ui, sans-serif`
  ctx.fillStyle = 'rgba(255,255,255,0.2)'
  ctx.fillText('ROTA NÃO ENCONTRADA', CX, CY + R * 0.30)

  // Ponto central
  ctx.beginPath()
  ctx.arc(CX, CY + R * 0.08, 3, 0, Math.PI * 2)
  ctx.fillStyle = PURPLE
  ctx.fill()
}

export default function NotFound() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stateRef = useRef({ angle: 220, turb: 0, turbPhase: 0, isTurb: false })
  const rafRef = useRef<number | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    canvas.width = SIZE * dpr
    canvas.height = SIZE * dpr
    const ctx = canvas.getContext('2d')!
    ctx.scale(dpr, dpr)

    const s = stateRef.current

    const tick = () => {
      if (s.isTurb) {
        s.turbPhase += 0.18
        // Oscilação amortecida — simula turbulência real
        s.turb = Math.sin(s.turbPhase * 2.5) * 14 * Math.exp(-s.turbPhase * 0.055)
        if (s.turbPhase > 65) {
          s.isTurb = false
          s.turb = 0
          s.turbPhase = 0
        }
      }
      s.angle = (s.angle + 0.18) % 360
      drawInstrument(ctx, s.angle, s.turb)
      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  const handleClick = () => {
    const s = stateRef.current
    if (s.isTurb) return
    s.isTurb = true
    s.turbPhase = 0
    s.turb = 0
  }

  return (
    <div
      className="min-h-screen bg-background flex flex-col items-center justify-center"
      style={{
        backgroundImage: 'radial-gradient(circle, #e8e3f5 1px, transparent 1px)',
        backgroundSize: '28px 28px',
      }}
    >
      <div className="flex flex-col items-center gap-8 text-center max-w-xs px-6">
        <canvas
          ref={canvasRef}
          style={{ width: SIZE, height: SIZE, cursor: 'pointer' }}
          onClick={handleClick}
          aria-label="Indicador de direção — instrumento de navegação. Clique para simular turbulência."
          role="img"
        />

        <div className="flex flex-col gap-2">
          <span className="text-xs font-mono tracking-widest uppercase text-muted-foreground">
            Código de erro — 404
          </span>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Rota não encontrada
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Esta coordenada não consta no plano de voo.
            Retorne ao painel ou tente uma rota diferente.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full">
          <Button className="flex-1" onClick={() => navigate('/dashboard')}>
            <Home className="h-4 w-4" />
            Voltar ao painel
          </Button>
          <Button variant="outline" className="flex-1" onClick={() => navigate(-1)}>
            <RotateCcw className="h-4 w-4" />
            Página anterior
          </Button>
        </div>
      </div>
    </div>
  )
}
