import React, { useCallback } from 'react';
import type { PriceAxis } from '../priceAxis';
import { priceToY, visibleRows, yToPrice } from '../priceAxis';
import type { TickCandle } from '../scalperModel';
import { formatPrice, isBullish } from '../scalperModel';
import * as t from '../scalperTheme';
import { useCanvasRenderer } from '../useCanvas';

/**
 * Bubble pane — one circle per tick candle: x is time (newest at the right),
 * y is price on the shared axis, radius is volume, colour is direction.
 *
 * Ported from scalper-iced (`src/widget/bubble_chart_canvas.rs`, Unlicense).
 */

const LABEL_WIDTH = 60;

export interface BubblePaneProps {
  candles: TickCandle[];
  axis: PriceAxis;
  onWheel?: (e: React.WheelEvent) => void;
}

export const BubblePane: React.FC<BubblePaneProps> = ({ candles, axis, onWheel }) => {
  const draw = useCallback(
    (ctx: CanvasRenderingContext2D, width: number, height: number) => {
      ctx.fillStyle = t.PANEL_BG;
      ctx.fillRect(0, 0, width, height);
      ctx.font = `9px ${t.MONO_FONT}`;
      ctx.textBaseline = 'middle';

      if (!candles.length) {
        ctx.fillStyle = t.TEXT_DIM;
        ctx.textAlign = 'center';
        ctx.fillText('Bubbles…', width / 2, height / 2);
        return;
      }

      const rowH = axis.rowHeight;
      const chartWidth = width - LABEL_WIDTH;

      // Price grid and labels first, so bubbles sit on top of them.
      const rows = visibleRows(axis, height);
      const gridEvery = Math.max(1, Math.floor(rows / 8));
      ctx.strokeStyle = t.GRID_LINE;
      ctx.lineWidth = 0.5;
      ctx.fillStyle = t.TEXT_DIM;
      ctx.textAlign = 'right';
      for (let row = -Math.floor(rows / 2); row <= Math.floor(rows / 2); row += gridEvery) {
        const y = height / 2 + row * rowH;
        if (y <= 10 || y >= height - 10) continue;
        ctx.beginPath();
        ctx.moveTo(0, Math.round(y) + 0.5);
        ctx.lineTo(chartWidth, Math.round(y) + 0.5);
        ctx.stroke();
        ctx.fillText(formatPrice(yToPrice(axis, y, height)), width - 3, y);
      }

      let maxVol = 0;
      for (const c of candles) if (c.volume > maxVol) maxVol = c.volume;
      maxVol = Math.max(maxVol, 1e-9);

      const colWidth = Math.max(6, Math.min(40, chartWidth / candles.length));
      const maxRadius = Math.min(colWidth / 2, rowH * 2, 20);

      candles.forEach((candle, i) => {
        const x = chartWidth - (candles.length - i) * colWidth + colWidth / 2;
        const price = (candle.open + candle.close) / 2;
        const y = priceToY(axis, price, height) + rowH / 2;
        if (y < -maxRadius || y > height + maxRadius) return;

        const ratio = candle.volume / maxVol;
        // Area, not radius, tracks volume — a linear radius makes a 4× print
        // look 16× bigger.
        const radius = Math.max(2, Math.sqrt(ratio) * maxRadius);
        const up = isBullish(candle);

        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = up ? t.bidHeatmap(ratio * 0.5) : t.askHeatmap(ratio * 0.5);
        ctx.fill();
        ctx.strokeStyle = up ? t.BID_GREEN : t.ASK_RED;
        ctx.lineWidth = 1;
        ctx.stroke();
      });

      ctx.strokeStyle = t.GRID_LINE;
      ctx.beginPath();
      ctx.moveTo(Math.round(chartWidth) + 0.5, 0);
      ctx.lineTo(Math.round(chartWidth) + 0.5, height);
      ctx.stroke();

      if (axis.lastPrice) {
        const y = priceToY(axis, axis.lastPrice, height) + rowH / 2;
        ctx.strokeStyle = t.LAST_PRICE_LINE;
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(chartWidth, y);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    },
    [candles, axis],
  );

  const { canvasRef, containerRef } = useCanvasRenderer(draw, [candles, axis]);

  return (
    <div ref={containerRef} className="w-full h-full" onWheel={onWheel}>
      <canvas ref={canvasRef} className="block" />
    </div>
  );
};

export default BubblePane;
