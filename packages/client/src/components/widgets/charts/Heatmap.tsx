/**
 * Historical-DOM heatmap: order-book depth over time, one column per sampled
 * slice, colored by resting size, with trades drawn on top.
 *
 * Ported from the ui-profitmaker-cc component library (public domain), which in
 * turn follows flowsurface's visual language for this chart type. Rendering only
 * — the widget wrapper owns sampling and the rolling buffer.
 */
import * as React from 'react'
import { cn } from '@/lib/utils'

export interface HeatmapLevel {
  price: number
  size: number
  /** Optional explicit side; otherwise derived from the slice mid (>= mid → ask). */
  side?: 'bid' | 'ask'
}

export interface HeatmapSlice {
  time: number
  /** Mid / last price used to split bids (below) from asks (above). */
  mid?: number
  levels: HeatmapLevel[]
}

export interface HeatmapTrade {
  time: number
  price: number
  size: number
  side: 'buy' | 'sell'
}

export interface HeatmapProps {
  slices: HeatmapSlice[]
  trades?: HeatmapTrade[]
  priceDecimals?: number
  tickSize?: number
  /** 'side' (flowsurface-style red asks / green bids), 'heat' ramp, or 'mono'. */
  colorScale?: 'side' | 'heat' | 'mono'
  showTrades?: boolean
  /** Draw the live order-book depth histogram at the right edge. */
  showDepth?: boolean
  className?: string
}

interface Sized {
  width: number
  height: number
}

const PRICE_GUTTER = 56

function cssVar(el: HTMLElement, name: string, fallback: string): string {
  const v = getComputedStyle(el).getPropertyValue(name).trim()
  return v ? `hsl(${v})` : fallback
}

function lerp(a: number, b: number, t: number) {
  return Math.round(a + (b - a) * t)
}

// Side ramps: dark resting fill -> saturated -> near-white wall (depth heatmap).
type Ramp = [number, [number, number, number]][]
const ASK_RAMP: Ramp = [
  [0, [34, 12, 16]],
  [0.55, [228, 66, 76]],
  [1, [255, 178, 180]],
]
const BID_RAMP: Ramp = [
  [0, [10, 38, 24]],
  [0.55, [56, 206, 128]],
  [1, [196, 255, 208]],
]
function rampColor(ramp: Ramp, t: number): [number, number, number] {
  for (let i = 1; i < ramp.length; i++) {
    if (t <= ramp[i][0]) {
      const [t0, c0] = ramp[i - 1]
      const [t1, c1] = ramp[i]
      const f = (t - t0) / (t1 - t0 || 1)
      return [lerp(c0[0], c1[0], f), lerp(c0[1], c1[1], f), lerp(c0[2], c1[2], f)]
    }
  }
  return ramp[ramp.length - 1][1]
}

function heatColor(t: number): [number, number, number] {
  const stops: [number, [number, number, number]][] = [
    [0, [8, 10, 24]],
    [0.35, [30, 60, 170]],
    [0.6, [40, 190, 210]],
    [0.82, [240, 220, 60]],
    [1, [255, 255, 255]],
  ]
  for (let i = 1; i < stops.length; i++) {
    if (t <= stops[i][0]) {
      const [t0, c0] = stops[i - 1]
      const [t1, c1] = stops[i]
      const f = (t - t0) / (t1 - t0 || 1)
      return [lerp(c0[0], c1[0], f), lerp(c0[1], c1[1], f), lerp(c0[2], c1[2], f)]
    }
  }
  return stops[stops.length - 1][1]
}

export function Heatmap({
  slices,
  trades = [],
  priceDecimals = 2,
  tickSize,
  colorScale = 'side',
  showTrades = true,
  showDepth = true,
  className,
}: HeatmapProps) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  const containerRef = React.useRef<HTMLDivElement>(null)
  const [size, setSize] = React.useState<Sized>({ width: 640, height: 380 })

  React.useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      const r = entries[0]?.contentRect
      if (r) setSize({ width: r.width, height: r.height })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

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

    const muted = cssVar(host, '--muted-foreground', '#9ca3af')
    const border = cssVar(host, '--border', '#27272a')

    if (slices.length === 0) return

    const allPrices = slices.flatMap((s) => s.levels.map((l) => l.price))
    for (const tr of trades) allPrices.push(tr.price)
    const minPrice = Math.min(...allPrices)
    const maxPrice = Math.max(...allPrices)
    const step =
      tickSize ??
      (() => {
        const sorted = Array.from(
          new Set(slices.flatMap((s) => s.levels.map((l) => l.price)))
        ).sort((a, b) => a - b)
        let min = Infinity
        for (let i = 1; i < sorted.length; i++) min = Math.min(min, sorted[i] - sorted[i - 1])
        return Number.isFinite(min) && min > 0 ? min : 1
      })()

    const plotW = size.width - PRICE_GUTTER
    const cw = plotW / slices.length
    const rowCount = Math.max(1, Math.round((maxPrice - minPrice) / step) + 1)
    const rh = size.height / rowCount
    const yForPrice = (price: number) => ((maxPrice - price) / step) * rh

    const sliceMid = (s: HeatmapSlice) =>
      s.mid ?? (s.levels.length ? (Math.min(...s.levels.map((l) => l.price)) + Math.max(...s.levels.map((l) => l.price))) / 2 : 0)

    let maxSize = 0
    for (const s of slices) for (const l of s.levels) maxSize = Math.max(maxSize, l.size)
    maxSize = maxSize || 1

    // Near-black background.
    ctx.fillStyle = '#08090c'
    ctx.fillRect(0, 0, plotW, size.height)

    const cellColor = (l: HeatmapLevel, mid: number, t: number): string => {
      if (colorScale === 'heat') {
        const [r, g, b] = heatColor(t)
        return `rgb(${r},${g},${b})`
      }
      if (colorScale === 'mono') return `rgba(74,222,128,${0.08 + 0.9 * t})`
      const isAsk = l.side ? l.side === 'ask' : l.price >= mid
      const [r, g, b] = rampColor(isAsk ? ASK_RAMP : BID_RAMP, Math.pow(t, 0.72))
      return `rgb(${r},${g},${b})`
    }

    slices.forEach((slice, si) => {
      const x = si * cw
      const mid = sliceMid(slice)
      for (const l of slice.levels) {
        const t = Math.min(1, l.size / maxSize)
        if (t <= 0) continue
        ctx.fillStyle = cellColor(l, mid, t)
        ctx.fillRect(Math.floor(x), Math.floor(yForPrice(l.price)), Math.ceil(cw) + 1, Math.ceil(rh) + 1)
      }
    })

    // Mid-price path across time.
    ctx.strokeStyle = 'rgba(220,225,235,0.35)'
    ctx.lineWidth = 1
    ctx.beginPath()
    slices.forEach((slice, si) => {
      const x = si * cw + cw / 2
      const y = yForPrice(sliceMid(slice)) + rh / 2
      if (si === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    })
    ctx.stroke()

    // Live order-book depth histogram at the right edge (from the last slice).
    const last = slices[slices.length - 1]
    if (showDepth && last && last.levels.length) {
      const mid = sliceMid(last)
      const lastMax = Math.max(...last.levels.map((l) => l.size)) || 1
      const maxBar = Math.min(120, plotW * 0.28)
      for (const l of last.levels) {
        const isAsk = l.side ? l.side === 'ask' : l.price >= mid
        const w = (l.size / lastMax) * maxBar
        if (w < 0.5) continue
        ctx.fillStyle = isAsk ? 'rgba(255,86,96,0.85)' : 'rgba(74,226,140,0.85)'
        ctx.fillRect(plotW - w, Math.floor(yForPrice(l.price)), w, Math.max(1, Math.ceil(rh)))
      }
    }

    // Trade dots.
    if (showTrades && trades.length) {
      const tMin = slices[0].time
      const tMax = slices[slices.length - 1].time
      const span = tMax - tMin || 1
      let maxTrade = 0
      for (const tr of trades) maxTrade = Math.max(maxTrade, tr.size)
      maxTrade = maxTrade || 1
      for (const tr of trades) {
        const x = ((tr.time - tMin) / span) * plotW
        const y = yForPrice(tr.price) + rh / 2
        const radius = 2 + 9 * Math.sqrt(Math.min(1, tr.size / maxTrade))
        ctx.beginPath()
        ctx.arc(x, y, radius, 0, Math.PI * 2)
        ctx.fillStyle = tr.side === 'buy' ? 'rgba(74,226,140,0.9)' : 'rgba(255,86,96,0.9)'
        ctx.fill()
      }
    }

    // Current price marker on the axis.
    if (last) {
      const y = yForPrice(sliceMid(last)) + rh / 2
      ctx.strokeStyle = 'rgba(220,225,235,0.5)'
      ctx.setLineDash([4, 3])
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(plotW, y)
      ctx.stroke()
      ctx.setLineDash([])
    }

    // Price axis (right gutter).
    ctx.font = '10px ui-monospace, SFMono-Regular, Menlo, monospace'
    ctx.textBaseline = 'middle'
    ctx.textAlign = 'left'
    ctx.fillStyle = muted
    const labelEvery = Math.max(1, Math.ceil(16 / rh))
    for (let i = 0; i < rowCount; i += labelEvery) {
      const price = maxPrice - i * step
      ctx.fillText(price.toFixed(priceDecimals), plotW + 6, i * rh + rh / 2)
    }

    ctx.strokeStyle = border
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(plotW + 0.5, 0)
    ctx.lineTo(plotW + 0.5, size.height)
    ctx.stroke()
  }, [slices, trades, priceDecimals, tickSize, colorScale, showTrades, showDepth, size])

  return (
    <div ref={containerRef} className={cn('relative w-full h-full bg-[#08090c] text-foreground', className)}>
      <canvas ref={canvasRef} className="block" />
    </div>
  )
}
