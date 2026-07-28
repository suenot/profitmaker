import React, { useCallback } from 'react';
import type { PriceAxis } from '../priceAxis';
import { priceToY } from '../priceAxis';
import type { ClusterCandle } from '../scalperModel';
import { aggregateCluster, formatVolume } from '../scalperModel';
import * as t from '../scalperTheme';
import { useCanvasRenderer } from '../useCanvas';

/**
 * Cluster (footprint) pane — traded volume per price per candle, coloured by
 * which side was the aggressor, on the shared price axis.
 *
 * Ported from scalper-iced (`src/widget/cluster_canvas.rs`, Unlicense).
 */

const MAX_CANDLE_WIDTH = 80;

export interface ClusterPaneProps {
  candles: ClusterCandle[];
  axis: PriceAxis;
  onWheel?: (e: React.WheelEvent) => void;
}

export const ClusterPane: React.FC<ClusterPaneProps> = ({ candles, axis, onWheel }) => {
  const draw = useCallback(
    (ctx: CanvasRenderingContext2D, width: number, height: number) => {
      ctx.fillStyle = t.PANEL_BG;
      ctx.fillRect(0, 0, width, height);
      ctx.font = `10px ${t.MONO_FONT}`;
      ctx.textBaseline = 'middle';

      if (!candles.length) {
        ctx.fillStyle = t.TEXT_DIM;
        ctx.textAlign = 'center';
        ctx.fillText('Clusters…', width / 2, height / 2);
        return;
      }

      const view =
        axis.displayStep > axis.tickSize * 1.5
          ? candles.map(c => aggregateCluster(c, axis.displayStep))
          : candles;

      const candleWidth = Math.min(width / view.length, MAX_CANDLE_WIDTH);
      const rowH = axis.rowHeight;

      // One scale across every candle: a cell's colour then means the same
      // thing left to right, which is the point of a cluster chart.
      let maxVol = 0;
      for (const candle of view) for (const p of candle.clusterPoints) if (p.volume > maxVol) maxVol = p.volume;
      maxVol = Math.max(maxVol, 1e-9);

      view.forEach((candle, i) => {
        // Newest candle hugs the right edge; history runs off to the left.
        const x = width - (view.length - i) * candleWidth;

        for (const point of candle.clusterPoints) {
          const y = priceToY(axis, point.price, height);
          if (y < -rowH || y > height + rowH) continue;
          const intensity = point.volume / maxVol;
          ctx.fillStyle = point.percent > 50 ? t.bidHeatmap(intensity) : t.askHeatmap(intensity);
          ctx.fillRect(x + 1, y + 1, candleWidth - 2, rowH - 2);

          if (candleWidth > 30 && rowH > 12) {
            ctx.fillStyle = t.TEXT_PRIMARY;
            ctx.textAlign = 'center';
            ctx.fillText(formatVolume(point.volume), x + candleWidth / 2, y + rowH / 2);
          }
        }

        ctx.strokeStyle = t.GRID_LINE;
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(Math.round(x) + 0.5, 0);
        ctx.lineTo(Math.round(x) + 0.5, height);
        ctx.stroke();
      });

      if (axis.lastPrice) {
        const y = priceToY(axis, axis.lastPrice, height) + rowH / 2;
        ctx.strokeStyle = t.LAST_PRICE_LINE;
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
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

export default ClusterPane;
