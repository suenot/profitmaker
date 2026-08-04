export const FALLBACK_CHART_SYMBOLS = [
  'BTC/USDT',
  'ETH/USDT',
  'BNB/USDT',
  'ADA/USDT',
  'SOL/USDT',
  'XRP/USDT',
  'DOT/USDT',
  'DOGE/USDT',
  'AVAX/USDT',
  'MATIC/USDT',
];

/** Keep the selected pair when it is supported, otherwise choose a valid pair. */
export const getCompatibleChartSymbol = (
  currentSymbol: string,
  availableSymbols: string[],
): string | undefined => {
  const symbols = [...new Set(availableSymbols.filter(Boolean))];

  if (currentSymbol && symbols.includes(currentSymbol)) {
    return currentSymbol;
  }

  // CCXT uses a `BASE/QUOTE:SETTLE` form for some contract markets. Prefer
  // the same base/quote pair when moving between contract and spot markets.
  const currentBaseQuote = currentSymbol.split(':')[0];
  const matchingBaseQuote = symbols.find((symbol) => symbol.split(':')[0] === currentBaseQuote);
  if (matchingBaseQuote) {
    return matchingBaseQuote;
  }

  return symbols[0];
};
