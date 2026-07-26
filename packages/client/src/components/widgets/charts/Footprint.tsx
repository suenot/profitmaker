/**
 * Footprint (cluster) chart: per-candle volume split by price level into
 * bid (sell-aggressor) and ask (buy-aggressor) volume, with diagonal imbalances,
 * POC and a delta footer.
 *
 * Ported from the ui-profitmaker-cc component library (public domain). Rendering
 * only — the widget wrapper builds the candles from the trade tape.
 */
import * as React from 'react'
import { cn } from '@/lib/utils'

export interface FootprintPriceLevel {
  price: number
  bidVolume: number
  askVolume: number
}

export interface FootprintCandle {
  time: number
  open: number
  high: number
  low: number
  close: number
  levels: FootprintPriceLevel[]
}

export interface FootprintProps {
  candles: FootprintCandle[]
  /** 'numbers' = bid×ask volume cells per level; 'profile' = divergent volume-profile bars per candle. */
  mode?: 'numbers' | 'profile'
  priceDecimals?: number
  /** Imbalance trigger: a side is flagged when its volume >= ratio × the diagonal opposite volume (numbers mode). */
  imbalanceRatio?: number
  showPOC?: boolean
  /** Show the per-candle delta (ask − bid volume) footer row. */
  showDelta?: boolean
  tickSize?: number
  width?: number
  height?: number
  className?: string
}

interface Sized {
  width: number
  height: number
}

const COL_WIDTH = 110
const ROW_HEIGHT = 16
const PRICE_GUTTER = 56
const AXIS_HEIGHT = 18
const DELTA_HEIGHT = 18

// Read a CSS color from the canvas host so we honor the active theme.
function cssVar(el: HTMLElement, name: string, fallback: string): string {
  const v = getComputedStyle(el).getPropertyValue(name).trim()
  return v ? `hsl(${v})` : fallback
}

export function Footprint({
  candles,
  mode = 'numbers',
  priceDecimals = 2,
  imbalanceRatio = 3,
  showPOC = true,
  showDelta = true,
  tickSize,
  width,
  height,
  className,
}: FootprintProps) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  const containerRef = React.useRef<HTMLDivElement>(null)
  const [size, setSize] = React.useState<Sized>({ width: width ?? 600, height: height ?? 360 })

  React.useEffect(() => {
    if (width && height) return
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      const r = entries[0]?.contentRect
      if (r) setSize({ width: width ?? r.width, height: height ?? r.height })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [width, height])

  React.useLayoutEffect(() => {
    const canvas = canvasRef.current
    const host = containerRef.current
    if (!canvas || !host || size.width === 0 || size.height === 0) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    canvas.width = Math.round(size.width * dpr)
    canvas.height = Math.round(size.height * dpr)
    canvas.style.width = `${size.width}px`
    canvas.style.height = `${size.height}px`
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, size.width, size.height)

    const fg = cssVar(host, '--foreground', '#e5e7eb')
    const muted = cssVar(host, '--muted-foreground', '#9ca3af')
    const border = cssVar(host, '--border', '#27272a')

    ctx.font = '10px ui-monospace, SFMono-Regular, Menlo, monospace'
    ctx.textBaseline = 'middle'

    if (candles.length === 0) return

    // Shared price grid so rows align across all candles.
    const allPrices = candles.flatMap((c) => c.levels.map((l) => l.price))
    const minPrice = Math.min(...allPrices)
    const maxPrice = Math.max(...allPrices)
    const step =
      tickSize ??
      (() => {
        const sorted = Array.from(new Set(allPrices)).sort((a, b) => a - b)
        let min = Infinity
        for (let i = 1; i < sorted.length; i++) min = Math.min(min, sorted[i] - sorted[i - 1])
        return Number.isFinite(min) && min > 0 ? min : 1
      })()

    const rowCount = Math.max(1, Math.round((maxPrice - minPrice) / step) + 1)
    const deltaH = showDelta ? DELTA_HEIGHT : 0
    const plotHeight = size.height - AXIS_HEIGHT - deltaH
    const rh = Math.min(ROW_HEIGHT, plotHeight / rowCount)
    const cw = Math.min(COL_WIDTH, (size.width - PRICE_GUTTER) / candles.length)
    const half = (cw - 2) / 2

    const rowYForPrice = (price: number) => Math.round((maxPrice - price) / step) * rh

    // Global max volume drives background intensity.
    let maxVol = 0
    for (const c of candles)
      for (const l of c.levels) maxVol = Math.max(maxVol, l.bidVolume, l.askVolume)
    maxVol = maxVol || 1

    const intensity = (v: number) => 0.08 + 0.55 * Math.min(1, v / maxVol)

    candles.forEach((candle, ci) => {
      const x0 = PRICE_GUTTER + ci * cw
      const bidX = x0 + 1
      const askX = x0 + 1 + half

      // POC = price level with the greatest total volume in this candle.
      let pocPrice = candle.levels[0]?.price
      let pocVol = -1
      for (const l of candle.levels) {
        const t = l.bidVolume + l.askVolume
        if (t > pocVol) {
          pocVol = t
          pocPrice = l.price
        }
      }

      // Map price -> level for diagonal imbalance lookups.
      const byPrice = new Map<number, FootprintPriceLevel>()
      for (const l of candle.levels) byPrice.set(l.price, l)

      if (mode === 'profile') {
        // Divergent volume profile per candle (flowsurface-style): each price
        // level is a horizontal bar — bid extends left (red), ask right (green),
        // self-scaled to the candle's busiest level.
        let maxSide = 0
        for (const l of candle.levels) maxSide = Math.max(maxSide, l.bidVolume, l.askVolume)
        maxSide = maxSide || 1
        const center = x0 + cw / 2
        const maxBar = cw / 2 - 2

        for (const l of candle.levels) {
          const y = rowYForPrice(l.price)
          const bidLen = (l.bidVolume / maxSide) * maxBar
          const askLen = (l.askVolume / maxSide) * maxBar
          const diagBelow = byPrice.get(l.price - step)
          const diagAbove = byPrice.get(l.price + step)
          const buyImb = diagBelow ? l.askVolume >= imbalanceRatio * Math.max(1e-9, diagBelow.bidVolume) : false
          const sellImb = diagAbove ? l.bidVolume >= imbalanceRatio * Math.max(1e-9, diagAbove.askVolume) : false

          ctx.fillStyle = sellImb ? 'rgba(248,113,113,1)' : 'rgba(248,113,113,0.8)'
          ctx.fillRect(center - bidLen, y + 1, bidLen, rh - 2)
          ctx.fillStyle = buyImb ? 'rgba(74,222,128,1)' : 'rgba(74,222,128,0.8)'
          ctx.fillRect(center, y + 1, askLen, rh - 2)

          if (showPOC && l.price === pocPrice) {
            ctx.strokeStyle = cssVar(host, '--accent', '#fbbf24') || '#fbbf24'
            ctx.lineWidth = 1.5
            ctx.strokeRect(x0 + 1.5, y + 0.5, cw - 3, rh - 2)
          }
        }

        // Candle wick/body along the column center.
        const up = candle.close >= candle.open
        ctx.strokeStyle = up ? 'rgba(74,222,128,0.65)' : 'rgba(248,113,113,0.65)'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(center + 0.5, rowYForPrice(candle.high))
        ctx.lineTo(center + 0.5, rowYForPrice(candle.low) + rh)
        ctx.stroke()
      } else {
        for (const l of candle.levels) {
          const y = rowYForPrice(l.price)
          const diagBelow = byPrice.get(l.price - step)
          const diagAbove = byPrice.get(l.price + step)
          // Buy (ask) imbalance vs bid one level down; sell (bid) imbalance vs ask one level up.
          const buyImb = diagBelow ? l.askVolume >= imbalanceRatio * Math.max(1e-9, diagBelow.bidVolume) : false
          const sellImb = diagAbove ? l.bidVolume >= imbalanceRatio * Math.max(1e-9, diagAbove.askVolume) : false

          // Bid cell (left)
          ctx.fillStyle = `rgba(248,113,113,${intensity(l.bidVolume)})`
          ctx.fillRect(bidX, y, half, rh - 1)
          // Ask cell (right)
          ctx.fillStyle = `rgba(74,222,128,${intensity(l.askVolume)})`
          ctx.fillRect(askX, y, half, rh - 1)

          if (sellImb) {
            ctx.strokeStyle = 'rgba(248,113,113,0.9)'
            ctx.lineWidth = 1
            ctx.strokeRect(bidX + 0.5, y + 0.5, half - 1, rh - 2)
          }
          if (buyImb) {
            ctx.strokeStyle = 'rgba(74,222,128,0.9)'
            ctx.lineWidth = 1
            ctx.strokeRect(askX + 0.5, y + 0.5, half - 1, rh - 2)
          }

          if (rh >= 11) {
            ctx.fillStyle = muted
            ctx.textAlign = 'center'
            ctx.fillText(l.bidVolume.toFixed(0), bidX + half / 2, y + rh / 2)
            ctx.fillStyle = fg
            ctx.fillText(l.askVolume.toFixed(0), askX + half / 2, y + rh / 2)
          }

          if (showPOC && l.price === pocPrice) {
            ctx.strokeStyle = cssVar(host, '--accent', '#fbbf24') || '#fbbf24'
            ctx.lineWidth = 1.5
            ctx.strokeRect(bidX + 0.5, y + 0.5, cw - 3, rh - 2)
          }
        }

        // Thin OHLC candle marker at the right edge of the column.
        const markX = x0 + cw - 2
        const up = candle.close >= candle.open
        ctx.strokeStyle = up ? 'rgba(74,222,128,0.9)' : 'rgba(248,113,113,0.9)'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(markX, rowYForPrice(candle.high))
        ctx.lineTo(markX, rowYForPrice(candle.low) + rh)
        ctx.stroke()
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.moveTo(markX, rowYForPrice(Math.max(candle.open, candle.close)))
        ctx.lineTo(markX, rowYForPrice(Math.min(candle.open, candle.close)) + rh)
        ctx.stroke()
      }

      // Per-candle delta footer (ask − bid volume).
      if (showDelta) {
        let bidSum = 0
        let askSum = 0
        for (const l of candle.levels) {
          bidSum += l.bidVolume
          askSum += l.askVolume
        }
        const delta = askSum - bidSum
        ctx.fillStyle = delta >= 0 ? 'rgba(74,222,128,0.95)' : 'rgba(248,113,113,0.95)'
        ctx.textAlign = 'center'
        ctx.fillText(`${delta >= 0 ? '+' : ''}${delta.toFixed(0)}`, x0 + cw / 2, plotHeight + deltaH / 2)
      }

      // Time axis label.
      ctx.fillStyle = muted
      ctx.textAlign = 'center'
      const d = new Date(candle.time)
      const label = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
      ctx.fillText(label, x0 + cw / 2, size.height - AXIS_HEIGHT / 2)
    })

    // Price gutter labels (left).
    ctx.fillStyle = muted
    ctx.textAlign = 'right'
    const labelEvery = Math.max(1, Math.ceil(14 / rh))
    for (let i = 0; i < rowCount; i += labelEvery) {
      const price = maxPrice - i * step
      ctx.fillText(price.toFixed(priceDecimals), PRICE_GUTTER - 6, i * rh + rh / 2)
    }

    // Separators.
    ctx.strokeStyle = border
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(PRICE_GUTTER, 0)
    ctx.lineTo(PRICE_GUTTER, plotHeight + deltaH)
    ctx.moveTo(0, plotHeight + 0.5)
    ctx.lineTo(size.width, plotHeight + 0.5)
    if (deltaH) {
      ctx.moveTo(0, plotHeight + deltaH + 0.5)
      ctx.lineTo(size.width, plotHeight + deltaH + 0.5)
    }
    ctx.stroke()
  }, [candles, mode, priceDecimals, imbalanceRatio, showPOC, showDelta, tickSize, size])

  return (
    <div
      ref={containerRef}
      className={cn('relative w-full h-full bg-card text-foreground', className)}
      style={width && height ? { width, height } : undefined}
    >
      <canvas ref={canvasRef} className="block" />
    </div>
  )
}
