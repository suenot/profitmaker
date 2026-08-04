import { describe, expect, it, vi } from 'vitest';
import {
  createCatalogInstruments,
  createPublicInstrument,
  getMatchingPublicExchangeIds,
  getPublicExchangeIds,
  getStoredInstrumentAccount,
  loadExchangeMarketCatalog,
  PUBLIC_INSTRUMENT_ACCOUNT,
  toGroupInstrumentSelection,
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

  it('never mixes symbols between markets', () => {
    const instruments = createCatalogInstruments(
      'bybit',
      {
        spot: ['BTC/USDT'],
        futures: ['BTC/USDT:USDT'],
      },
      PUBLIC_INSTRUMENT_ACCOUNT,
      PUBLIC_INSTRUMENT_ACCOUNT,
    );

    expect(instruments.map(({ market, pair }) => ({ market, pair }))).toEqual([
      { market: 'spot', pair: 'BTC/USDT' },
      { market: 'futures', pair: 'BTC/USDT:USDT' },
    ]);
  });

  it('requests symbols separately for every supported market', async () => {
    const getMarkets = vi.fn().mockResolvedValue(['spot', 'futures']);
    const getSymbols = vi.fn()
      .mockImplementation(async (_exchange: string, _limit: number, market: string) =>
        market === 'futures' ? ['BTC/USDT:USDT'] : ['BTC/USDT']);

    await expect(loadExchangeMarketCatalog('bybit', getMarkets, getSymbols, 500)).resolves.toEqual({
      spot: ['BTC/USDT'],
      futures: ['BTC/USDT:USDT'],
    });
    expect(getSymbols).toHaveBeenNthCalledWith(1, 'bybit', 500, 'spot');
    expect(getSymbols).toHaveBeenNthCalledWith(2, 'bybit', 500, 'futures');
  });

  it('loads public exchanges only when the query names them', () => {
    const exchanges = [
      { id: 'binance', name: 'Binance' },
      { id: 'bybit', name: 'Bybit' },
      { id: 'kraken', name: 'Kraken' },
    ];

    expect(getMatchingPublicExchangeIds(exchanges, ['bybit'], 'BTC kraken')).toEqual(['kraken']);
    expect(getMatchingPublicExchangeIds(exchanges, ['bybit'], 'BTC/USDT')).toEqual([]);
  });

  it('does not persist the public account marker as a credential id', () => {
    expect(getStoredInstrumentAccount(PUBLIC_INSTRUMENT_ACCOUNT)).toBeUndefined();
    expect(getStoredInstrumentAccount('account-id')).toBe('account-id');
    expect(toGroupInstrumentSelection({
      account: PUBLIC_INSTRUMENT_ACCOUNT,
      exchange: 'kraken',
      market: 'spot',
      pair: 'BTC/USD',
    })).toEqual({
      account: undefined,
      exchange: 'kraken',
      market: 'spot',
      tradingPair: 'BTC/USD',
    });
  });
});
