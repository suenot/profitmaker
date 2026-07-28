import React, { useMemo } from 'react';
import type { TickCandle } from '../scalperModel';
import { formatClock, formatPrice, formatSignedVolume, formatVolume, isBullish, tickDelta } from '../scalperModel';
import * as t from '../scalperTheme';

/**
 * Tape pane — the newest tick candles as a list, with a volume filter and the
 * delta of each print group.
 *
 * Ported from scalper-iced (`src/widget/tape.rs`, Unlicense). DOM rather than
 * canvas: it is a text table, and the browser is better at those.
 */

const MAX_ROWS = 100;

export interface TapePaneProps {
  candles: TickCandle[];
  /** Hide anything below this volume; 0 shows everything. */
  volumeFilter: number;
  onVolumeFilterChange: (value: number) => void;
}

export const TapePane: React.FC<TapePaneProps> = ({ candles, volumeFilter, onVolumeFilterChange }) => {
  const rows = useMemo(
    () => candles.filter(c => c.volume >= volumeFilter).slice(-MAX_ROWS).reverse(),
    [candles, volumeFilter],
  );

  return (
    <div className="w-full h-full flex flex-col text-[11px]" style={{ background: t.PANEL_BG }}>
      <div className="flex items-center gap-1 px-1 py-0.5" style={{ color: t.TEXT_DIM }}>
        <span className="w-[52px]">Time</span>
        <span className="w-[64px] text-right">Price</span>
        <span className="w-[52px] text-right">Vol</span>
        <span className="w-[52px] text-right">Δ</span>
        <input
          value={volumeFilter || ''}
          onChange={e => onVolumeFilterChange(Number(e.target.value) || 0)}
          placeholder="min"
          inputMode="decimal"
          title="Minimum volume"
          className="w-10 ml-auto bg-black/30 rounded px-1 outline-none border border-white/10"
          style={{ color: t.TEXT_PRIMARY }}
        />
      </div>

      <div className="flex-grow overflow-auto">
        {rows.map((candle, i) => {
          const color = isBullish(candle) ? t.BID_GREEN : t.ASK_RED;
          const delta = tickDelta(candle);
          // A print well above the filter is what the filter was set to find,
          // so it gets picked out rather than merely passing through.
          const big = volumeFilter > 0 && candle.volume > volumeFilter * 5;
          return (
            <div
              key={`${candle.timestamp}-${i}`}
              className="flex items-center gap-1 px-1"
              style={{ fontSize: big ? 12 : 11, background: big ? 'rgba(255,255,255,0.05)' : undefined }}
            >
              <span className="w-[52px]" style={{ color: t.TEXT_DIM }}>{formatClock(candle.timestamp)}</span>
              <span className="w-[64px] text-right" style={{ color }}>{formatPrice(candle.close)}</span>
              <span className="w-[52px] text-right" style={{ color }}>{formatVolume(candle.volume)}</span>
              <span className="w-[52px] text-right" style={{ color: delta >= 0 ? t.BID_GREEN : t.ASK_RED }}>
                {formatSignedVolume(delta)}
              </span>
            </div>
          );
        })}
        {!rows.length && (
          <div className="h-full flex items-center justify-center" style={{ color: t.TEXT_DIM }}>
            No prints
          </div>
        )}
      </div>
    </div>
  );
};

export default TapePane;
