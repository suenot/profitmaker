import { describe, expect, it } from 'vitest';
import {
  createPublicInstrument,
  getPublicExchangeIds,
  PUBLIC_INSTRUMENT_ACCOUNT,
} from './instrumentSearch';

describe('instrument search public instruments', () => {
  it('keeps only exchanges without connected accounts', () => {
    expect(getPublicExchangeIds(['binance', 'bybit', 'kraken'], ['bybit'])).toEqual([
      'binance',
      'kraken',
    ]);
  });

  it('uses a display-only account marker for public instruments', () => {
    expect(createPublicInstrument('binance', 'spot', 'BTC/USDT')).toEqual({
      account: PUBLIC_INSTRUMENT_ACCOUNT,
      accountLabel: '-',
      exchange: 'binance',
      market: 'spot',
      pair: 'BTC/USDT',
    });
  });
});
