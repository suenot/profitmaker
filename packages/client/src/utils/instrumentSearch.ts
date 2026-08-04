/**
 * Display-only account marker for instruments loaded from public exchange data.
 * It must never be persisted as a credential id or passed to trading APIs.
 */
export const PUBLIC_INSTRUMENT_ACCOUNT = '-';

export const getPublicExchangeIds = (
  exchangeIds: string[],
  accountExchangeIds: string[],
): string[] => {
  const connectedExchanges = new Set(accountExchangeIds);

  return Array.from(new Set(exchangeIds)).filter(
    (exchangeId) => !connectedExchanges.has(exchangeId),
  );
};

export const createPublicInstrument = (
  exchange: string,
  market: string,
  pair: string,
) => ({
  account: PUBLIC_INSTRUMENT_ACCOUNT,
  accountLabel: PUBLIC_INSTRUMENT_ACCOUNT,
  exchange,
  market,
  pair,
});
