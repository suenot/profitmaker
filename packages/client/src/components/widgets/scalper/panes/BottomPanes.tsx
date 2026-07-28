import React from 'react';
import { formatVolume } from '../scalperModel';
import type { PnlSummary } from '../scalperPnl';
import * as t from '../scalperTheme';

/**
 * The scalper's bottom bar: position, order entry, session P&L.
 *
 * Ported from scalper-iced (`src/panel/{position,order,pnl}.rs`, Unlicense).
 * There all three read from stubs — the Rust app had no private feed — so the
 * layout is the port and the numbers are real: position and orders come from
 * the account being polled, P&L from its own fills (see scalperPnl.ts).
 */

const money = (v: number, digits = 2) => `${v >= 0 ? '' : '-'}${Math.abs(v).toFixed(digits)}`;

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="flex-1 min-w-0 px-2 py-1.5 flex flex-col gap-1" style={{ background: t.PANEL_BG }}>
    <div style={{ color: t.TEXT_DIM, fontSize: 10 }}>{title}</div>
    {children}
  </div>
);

export interface PositionPaneProps {
  /** The exchange's position row for this instrument, or null when flat. */
  position: any | null;
  unrealized: number;
  openOrderCount: number;
  busy: boolean;
  onClose: () => void;
  onCancelAll: () => void;
}

export const PositionPane: React.FC<PositionPaneProps> = ({
  position,
  unrealized,
  openOrderCount,
  busy,
  onClose,
  onCancelAll,
}) => {
  const size = Number(position?.contracts ?? 0);
  const side = !size ? 'flat' : position?.side === 'short' || size < 0 ? 'short' : 'long';
  const sideColor = side === 'long' ? t.BID_GREEN : side === 'short' ? t.ASK_RED : t.TEXT_DIM;
  const entry = Number(position?.entryPrice ?? 0);

  return (
    <Section title="Position">
      <div className="flex items-baseline gap-2">
        <span style={{ color: sideColor }}>{side.toUpperCase()}</span>
        <span style={{ color: t.TEXT_PRIMARY }}>{size ? formatVolume(Math.abs(size)) : '—'}</span>
      </div>
      <div className="flex items-baseline gap-2" style={{ fontSize: 11 }}>
        <span style={{ color: t.TEXT_DIM }}>Entry {entry ? entry.toFixed(2) : '—'}</span>
        <span style={{ color: unrealized >= 0 ? t.BID_GREEN : t.ASK_RED }}>PnL {money(unrealized)}</span>
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={onClose}
          disabled={busy || !size}
          title="Flatten the position (d)"
          className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 disabled:opacity-40"
          style={{ color: t.TEXT_BRIGHT, fontSize: 11 }}
        >
          Close all
        </button>
        <button
          onClick={onCancelAll}
          disabled={busy || !openOrderCount}
          title="Cancel every working order (Space)"
          className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 disabled:opacity-40"
          style={{ color: t.TEXT_BRIGHT, fontSize: 11 }}
        >
          Cancel all{openOrderCount ? ` (${openOrderCount})` : ''}
        </button>
      </div>
    </Section>
  );
};

export interface OrderPaneProps {
  quantity: string;
  onQuantityChange: (value: string) => void;
  busy: boolean;
  canTrade: boolean;
  onBuy: () => void;
  onSell: () => void;
}

export const OrderPane: React.FC<OrderPaneProps> = ({
  quantity,
  onQuantityChange,
  busy,
  canTrade,
  onBuy,
  onSell,
}) => (
  <Section title="Order">
    <div className="flex items-center gap-1">
      <span style={{ color: t.TEXT_PRIMARY, fontSize: 11 }}>Qty</span>
      <input
        value={quantity}
        onChange={e => onQuantityChange(e.target.value)}
        inputMode="decimal"
        className="w-20 bg-black/30 rounded px-1 py-0.5 outline-none border border-white/10"
        style={{ color: t.TEXT_PRIMARY, fontSize: 11 }}
      />
    </div>
    <div className="flex items-center gap-1">
      <button
        onClick={onBuy}
        disabled={busy || !canTrade}
        title="Buy at market (t)"
        className="px-3 py-0.5 rounded disabled:opacity-40"
        style={{ background: t.BID_GREEN, color: '#04120f' }}
      >
        BUY
      </button>
      <button
        onClick={onSell}
        disabled={busy || !canTrade}
        title="Sell at market (y)"
        className="px-3 py-0.5 rounded disabled:opacity-40"
        style={{ background: t.ASK_RED, color: '#1a0505' }}
      >
        SELL
      </button>
    </div>
    {!canTrade && (
      <div style={{ color: t.TEXT_DIM, fontSize: 10 }}>Pick an account on this widget's group to trade</div>
    )}
  </Section>
);

export interface PnlPaneProps {
  summary: PnlSummary;
  unrealized: number;
}

export const PnlPane: React.FC<PnlPaneProps> = ({ summary, unrealized }) => {
  const total = summary.realized + unrealized - summary.fees;
  return (
    <Section title="P&L today">
      <div style={{ color: total >= 0 ? t.BID_GREEN : t.ASK_RED, fontSize: 13 }}>{money(total)}</div>
      <div className="flex gap-2" style={{ color: t.TEXT_DIM, fontSize: 10 }}>
        <span>Realized {money(summary.realized)}</span>
        <span>Unreal {money(unrealized)}</span>
      </div>
      <div className="flex gap-2" style={{ color: t.TEXT_DIM, fontSize: 10 }}>
        <span>Fills {summary.trades}</span>
        <span>WR {summary.winRate.toFixed(0)}%</span>
        <span>Fee {money(summary.fees)}</span>
      </div>
    </Section>
  );
};
