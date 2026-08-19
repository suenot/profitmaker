import { describe, expect, it } from 'vitest';
import { PrivateTradingLedger } from './privateTradingLedger';

const symbol = 'BTC/USDT:USDT';

describe('PrivateTradingLedger', () => {
  it('deduplicates overlapping trades and does not reopen a terminal order with an older update', () => {
    const ledger = new PrivateTradingLedger();
    ledger.applyBackfill({
      symbol,
      snapshotAt: 200,
      openOrders: [{ id: 'o1', symbol, status: 'open', timestamp: 100 }],
      positions: [],
      myTrades: [{ id: 't1', symbol, timestamp: 150, amount: 1 }],
    });
    ledger.applyEvent('orders', [{ id: 'o1', symbol, status: 'closed', timestamp: 300 }], 300);
    ledger.applyEvent('orders', [{ id: 'o1', symbol, status: 'open', timestamp: 250 }], 301);
    ledger.applyEvent('myTrades', [{ id: 't1', symbol, timestamp: 150, amount: 1 }], 302);
    ledger.applyEvent('myTrades', [{ id: 't2', symbol, timestamp: 301, amount: 1 }], 302);

    expect(ledger.snapshot(symbol).openOrders).toEqual([]);
    expect(ledger.snapshot(symbol).myTrades.map((trade) => trade.id)).toEqual(['t1', 't2']);
  });

  it('ignores an out-of-order position update after a newer fill-driven position', () => {
    const ledger = new PrivateTradingLedger();
    ledger.applyEvent('positions', [{ symbol, side: 'long', contracts: 2, timestamp: 500 }], 500);
    ledger.applyEvent('positions', [{ symbol, side: 'long', contracts: 1, timestamp: 400 }], 600);
    expect(ledger.snapshot(symbol).positions[0]?.contracts).toBe(2);
  });

  it('reconciles a reconnect gap from an overlapping REST backfill', () => {
    const ledger = new PrivateTradingLedger();
    ledger.applyEvent('myTrades', [{ id: 'before', symbol, timestamp: 1000 }], 1000);
    ledger.applyBackfill({
      symbol,
      snapshotAt: 1200,
      openOrders: [],
      positions: [{ symbol, side: 'long', contracts: 2 }],
      myTrades: [
        { id: 'before', symbol, timestamp: 1000 },
        { id: 'gap-fill', symbol, timestamp: 1100 },
      ],
    });
    expect(ledger.snapshot(symbol).myTrades.map((trade) => trade.id)).toEqual(['before', 'gap-fill']);
    expect(ledger.snapshot(symbol).positions[0]?.contracts).toBe(2);
  });

  it('joins exchange and client order ids without duplicating or reopening the order', () => {
    const ledger = new PrivateTradingLedger();
    ledger.applyEvent('orders', [{ clientOrderId: 'client-1', symbol, status: 'open', filled: 0, timestamp: 100 }], 100);
    ledger.applyEvent('orders', [{ id: 'exchange-1', symbol, status: 'open', filled: 1, timestamp: 120 }], 120);
    ledger.applyEvent('orders', [{
      id: 'exchange-1',
      clientOrderId: 'client-1',
      symbol,
      status: 'open',
      filled: 1,
      timestamp: 150,
    }], 150);
    expect(ledger.snapshot(symbol).openOrders).toHaveLength(1);

    ledger.applyEvent('orders', [{ id: 'exchange-1', symbol, status: 'closed', filled: 2, timestamp: 200 }], 200);
    ledger.applyEvent('orders', [{ clientOrderId: 'client-1', symbol, status: 'open', filled: 1, timestamp: 180 }], 250);

    expect(ledger.snapshot(symbol).openOrders).toEqual([]);
  });
});
