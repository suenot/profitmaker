export const columns = [
  {
    label: 'status',
    value: 'status',
    display: true,
  },
  {
    label: 'action',
    value: 'action',
    display: true,
  },
  {
    label: 'type',
    value: 'type',
    display: true,
  },
  {
    label: 'id',
    value: 'id',
    display: true,
  },
  {
    label: 'fromId',
    value: 'fromId',
    display: true,
  },
  {
    label: 'toId',
    value: 'toId',
    display: true,
  },
  {
    label: 'baseFrom',
    value: 'baseFrom',
    display: true,
  },
  {
    label: 'baseTo',
    value: 'baseTo',
    display: true,
  },
  {
    label: 'quoteFrom',
    value: 'quoteFrom',
    display: true,
  },
  {
    label: 'quoteTo',
    value: 'quoteTo',
    display: true,
  },
  {
    label: 'pairFrom',
    value: 'pairFrom',
    display: true,
  },
  {
    label: 'pairTo',
    value: 'pairTo',
    display: true,
  },
  {
    label: 'stockFrom',
    value: 'stockFrom',
    display: true,
  },
  {
    label: 'stockTo',
    value: 'stockTo',
    display: true,
  },
  {
    label: 'percent',
    value: 'percent',
    display: true,
  },
  {
    label: 'profitUSD',
    value: 'profitUSD',
    display: true,
  },
  {
    label: 'profitBTC',
    value: 'profitBTC',
    display: true,
  },
  {
    label: 'totalUSD',
    value: 'totalUSD',
    display: true,
  },
  {
    label: 'totalBTC',
    value: 'totalBTC',
    display: true,
  },
  {
    label: 'updated',
    value: 'updated',
    display: true,
  },
  {
    label: 'created',
    value: 'created',
    display: true,
  },
  {
    label: 'timelife',
    value: 'timelife',
    display: true,
  },
  {
    label: 'lag',
    value: 'lag',
    display: true,
  }
]

export const operators = [
  {
    label: '>=',
    value: '>=',
  },
  {
    label: '<=',
    value: '<=',
  },
  {
    label: '==',
    value: '==',
  },
  {
    label: '!=',
    value: '!=',
  }
]

export const comparisonOperators = [
  {
    label: 'and',
    value: 'and',
  },
  {
    label: 'or',
    value: 'or',
  }
]

export const stocks = [
  {
    label: 'BINANCE',
    value: 'BINANCE',
  },
  {
    label: 'KUCOIN',
    value: 'KUCOIN',
  },
  {
    label: 'TIDEX',
    value: 'TIDEX',
  },
  {
    label: 'BITZ',
    value: 'BITZ',
  },
  {
    label: 'BIGONE',
    value: 'BIGONE',
  },
  {
    label: 'BITFINEX',
    value: 'BITFINEX',
  },
  {
    label: 'BITTREX',
    value: 'BITTREX',
  },
  {
    label: 'OKEX',
    value: 'OKEX',
  },
]

export const scheme = [
  "status",
  "action",
  "type",
  "id",
  "fromId",
  "toId",
  "baseFrom",
  "baseTo",
  "quoteFrom",
  "quoteTo",
  "pairFrom",
  "pairTo",
  "stockFrom",
  "stockTo",
  "percent",
  "profitUSD",
  "profitBTC",
  "totalUSD",
  "totalBTC",
  "updated",
  "created",
  "timelife",
  "updatedFrom",
  "updatedTo",
  "lag",
]
export const data = [
  {
    "status": "lived",
    "action": "sell",
    "type": "clear",
    "id": "BINANCE--ICX--BTC--LIQUI--ICX--BTC--buy",
    "fromId": "BINANCE--ICX--BTC",
    "toId": "LIQUI--ICX--BTC",
    "baseFrom": "ICX",
    "baseTo": "ICX",
    "quoteFrom": "BTC",
    "quoteTo": "BTC",
    "pairFrom": "ICX_BTC",
    "pairTo": "ICX_BTC",
    "stockFrom": "BINANCE",
    "stockTo": "LIQUI",
    "percent": 1932.558139534884,
    "profitUSD": 2.77860757821,
    "profitBTC": 7.176178690697675,
    "totalUSD": 1596.5974749499317,
    "totalBTC": 0.44302710000000006,
    "updated": new Date(),
    "created": new Date() - 1*60*60*1000,
  },
  {
    "status": "lived",
    "action": "sell",
    "type": "gold",
    "id": "BINANCE--ICX--BTC--CRYPTOPIA--ICX--BTC--buy",
    "fromId": "BINANCE--ICX--BTC",
    "toId": "CRYPTOPIA--ICX--BTC",
    "baseFrom": "ICX",
    "baseTo": "ICX",
    "quoteFrom": "BTC",
    "quoteTo": "BTC",
    "pairFrom": "ICX_BTC",
    "pairTo": "ICX_BTC",
    "stockFrom": "BINANCE",
    "stockTo": "CRYPTOPIA",
    "percent": 50.558139534884,
    "profitUSD": 25861.77860757821,
    "profitBTC": 7.176178690697675,
    "totalUSD": 1596.5974749499317,
    "totalBTC": 0.44302710000000006,
    "updated": new Date(),
    "created": new Date() - 2*60*60*1000,
  },
  {
    "status": "lived",
    "action": "buy",
    "type": "dirty",
    "id": "BINANCE--ICX--BTC--TIDEX--ICX--BTC--buy",
    "fromId": "BINANCE--ICX--BTC",
    "toId": "TIDEX--ICX--BTC",
    "baseFrom": "ICX",
    "baseTo": "ICX",
    "quoteFrom": "BTC",
    "quoteTo": "BTC",
    "pairFrom": "ICX_BTC",
    "pairTo": "ICX_BTC",
    "stockFrom": "BINANCE",
    "stockTo": "TIDEX",
    "percent": 10.558139534884,
    "profitUSD": 25861.77860757821,
    "profitBTC": 7.176178690697675,
    "totalUSD": 1596.5974749499317,
    "totalBTC": 0.44302710000000006,
    "updated": new Date(),
    "created": new Date() - 3*60*60*1000,
  },
  {
    "status": "died",
    "action": "sell",
    "type": "clear",
    "id": "BINANCE--ICX--BTC--KUCOIN--ICX--BTC--buy",
    "fromId": "BINANCE--ICX--BTC",
    "toId": "KUCOIN--ICX--BTC",
    "baseFrom": "ICX",
    "baseTo": "ICX",
    "quoteFrom": "BTC",
    "quoteTo": "BTC",
    "pairFrom": "ICX_BTC",
    "pairTo": "ICX_BTC",
    "stockFrom": "BINANCE",
    "stockTo": "KUCOIN",
    "percent": 15.558139534884,
    "profitUSD": 25861.77860757821,
    "profitBTC": 7.176178690697675,
    "totalUSD": 1596.5974749499317,
    "totalBTC": 0.44302710000000006,
    "updated": new Date() - 4*60*60*1000,
    "created": new Date() - 4*60*60*1000,
  },
]
