import React, { useCallback } from 'react';
import type { PriceAxis } from '../priceAxis';
import { priceToY, visibleRows, yToPrice } from '../priceAxis';
import type { OrderBookSnapshot } from '../scalperModel';
import { aggregateBook, bookMaxVolume, formatPrice, formatVolume } from '../scalperModel';
import * as t from '../scalperTheme';
import { useCanvasRenderer } from '../useCanvas';

/**
 * DOM ladder pane — the book on the shared price axis, price in the middle
 * column, size bars growing outwards, resting size shading the whole row.
 *
 * Ported from scalper-iced (`src/widget/orderbook_canvas.rs`, Unlicense).
 */

const PRICE_LABEL_WIDTH = 90;

export interface OrderBookPaneProps {
  book: OrderBookSnapshot | null;
  axis: PriceAxis;
  /** Open orders of this account, drawn as markers on their price row. */
  openOrders?: { price: number; side: 'buy' | 'sell'; amount: number }[];
  onPriceClick?: (price: number, side: 'buy' | 'sell') => void;
  onWheel?: (e: React.WheelEvent) => void;
}

export const OrderBookPane: React.FC<OrderBookPaneProps> = ({
  book,
  axis,
  openOrders = [],
  onPriceClick,
  onWheel,
}) => {
  const draw = useCallback(
    (ctx: CanvasRenderingContext2D, width: number, height: number) => {
      ctx.fillStyle = t.PANEL_BG;
      ctx.fillRect(0, 0, width, height);
      ctx.font = `10px ${t.MONO_FONT}`;
      ctx.textBaseline = 'middle';

      if (!book) {
        ctx.fillStyle = t.TEXT_DIM;
        ctx.textAlign = 'center';
        ctx.fillText('Waiting for the book…', width / 2, height / 2);
        return;
      }

      // Only aggregate when the grouping is actually coarser than the tick;
      // below that the raw book is already one level per row.
      const view = axis.displayStep > axis.tickSize * 1.5 ? aggregateBook(book, axis.displayStep) : book;
      const maxVol = Math.max(bookMaxVolume(view), 1e-9);
      const rowH = axis.rowHeight;
      const halfWidth = width / 2;
      const barMax = halfWidth - PRICE_LABEL_WIDTH / 2 - 5;

      // Row grid.
      ctx.strokeStyle = t.GRID_LINE;
      ctx.lineWidth = 0.5;
      const half = Math.floor(visibleRows(axis, height) / 2);
      ctx.beginPath();
      for (let row = -half; row <= half; row++) {
        const y = Math.round(height / 2 + row * rowH) + 0.5;
        if (y < 0 || y > height) continue;
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      ctx.stroke();

      const drawSide = (levels: typeof view.asks, isAsk: boolean) => {
        for (const level of levels) {
          const y = priceToY(axis, level.price, height);
          if (y < -rowH || y > height) continue;
          const intensity = level.amount / maxVol;
          const barWidth = intensity * barMax;
          const shade = isAsk ? t.askHeatmap : t.bidHeatmap;

          // Whole-row wash, then the bar itself over it.
          ctx.fillStyle = shade(intensity * 0.3);
          ctx.fillRect(0, y, width, rowH);

          ctx.fillStyle = shade(intensity);
          if (isAsk) ctx.fillRect(halfWidth + PRICE_LABEL_WIDTH / 2, y + 1, barWidth, rowH - 2);
          else ctx.fillRect(halfWidth - PRICE_LABEL_WIDTH / 2 - barWidth, y + 1, barWidth, rowH - 2);

          if (rowH >= 10) {
            ctx.fillStyle = t.TEXT_PRIMARY;
            ctx.textAlign = isAsk ? 'left' : 'right';
            ctx.fillText(
              formatVolume(level.amount),
              halfWidth + (isAsk ? PRICE_LABEL_WIDTH / 2 + 4 : -PRICE_LABEL_WIDTH / 2 - 4),
              y + rowH / 2,
            );

            ctx.fillStyle = isAsk ? t.ASK_RED : t.BID_GREEN;
            ctx.textAlign = 'center';
            ctx.fillText(formatPrice(level.price), halfWidth, y + rowH / 2);
          }
        }
      };

      drawSide(view.asks, true);
      drawSide(view.bids, false);

      // Spread band between the two best levels.
      const bestBid = view.bids[0]?.price;
      const bestAsk = view.asks[0]?.price;
      if (bestBid !== undefined && bestAsk !== undefined) {
        const bidY = priceToY(axis, bestBid, height);
        const askY = priceToY(axis, bestAsk, height);
        const bandHeight = bidY - askY - rowH;
        if (bandHeight > 0) {
          ctx.fillStyle = 'rgba(26,26,51,0.5)';
          ctx.fillRect(0, askY + rowH, width, bandHeight);
          if (bandHeight > 10) {
            ctx.fillStyle = t.SPREAD_YELLOW;
            ctx.textAlign = 'center';
            ctx.fillText(
              `Spread ${formatPrice(bestAsk - bestBid)} (${view.spreadPercent.toFixed(3)}%)`,
              width / 2,
              askY + rowH + bandHeight / 2,
            );
          }
        }
      }

      // Own orders: a bracket on the price row, so a resting order is visible
      // against the book it sits in.
      for (const order of openOrders) {
        const y = priceToY(axis, order.price, height);
        if (y < -rowH || y > height) continue;
        ctx.fillStyle = order.side === 'buy' ? t.BID_GREEN : t.ASK_RED;
        ctx.fillRect(0, y + rowH / 2 - 1, 6, 2);
        ctx.fillRect(width - 6, y + rowH / 2 - 1, 6, 2);
        if (rowH >= 10) {
          ctx.textAlign = 'left';
          ctx.fillText(formatVolume(order.amount), 8, y + rowH / 2);
        }
      }

      // Last price line, drawn last so nothing covers it.
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
    [book, axis, openOrders],
  );

  const { canvasRef, containerRef } = useCanvasRenderer(draw, [book, axis, openOrders]);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!onPriceClick) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const price = yToPrice(axis, e.clientY - rect.top, rect.height);
      // Above the centre is where you sell, below is where you buy — the same
      // rule the ladder is read by.
      onPriceClick(price, price > axis.centerPrice ? 'sell' : 'buy');
    },
    [axis, onPriceClick],
  );

  return (
    <div ref={containerRef} className="w-full h-full relative" onClick={handleClick} onWheel={onWheel}>
      <canvas ref={canvasRef} className="block" />
    </div>
  );
};

export default OrderBookPane;
