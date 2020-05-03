/* eslint-disable */
export type Sort = 'asc' | 'desc'

export type Stock = 'BINANCE'

export type WidgetConfigName = 'Orders' | 'Candles' | 'Trades' | 'Selector'

export type WidgetName = 'Orders' | 'Candles' | 'Create order' | 'Selector' | 'Trades' | 'Stocks' | 'OpenOrders' | 'MyTrades'

export type PathString = string

export type URLPath = string

export type TagId = string

export type Channel = 'default' | 'kupi' | 'ccxt'

export type Category = 'Orders' | 'Trades' | 'Candles' | 'Utils' | 'Stocks' | 'Private api'

export type Pair = string

export type Block = {[widgetName in WidgetConfigName]: WidgetConfig}

export type BidsAsksBoth = 'both' | 'asks' | 'bids'

export type BidsAsks = 'bids' | 'asks'

export type Timeframe = '1m' | '3m' | '5m' | '15m' | '30m' | '1H' | '2H' | '4H' | '6H' | '12H' | 'D' | 'W' | 'M'

export interface Notification {
  msg: string;
  type: 'alert' | 'warning' | 'info';
}

// order book.
export type VisualMode = 'walls' | 'none' | 'crocodile'

export type VisualModeMax = 'total sum' | 'fixed'

export interface OrderBookItem {
  id: string;
  price: number;
  amount: number;
  total: number;
  sum: number;
  totalPercent: number;
  sumPercent: number;
  totalPercentInverse: number;
  sumPercentInverse: number;
  percentInverseToFixed: number;
}

export type ApiData = Orders | Candle[] | Trade[]

export interface Trade {
  id: string,
  order: string,
  timestamp: number,
  datetime: string, // "2018-11-13T09:46:24.000Z"
  symbol: string,
  type: string,
  side: string,
  price: number,
  amount: number,
  fee: {
    type: string,
    currency: string,
    rate: number,
    cost: number
  },
  info: {
    trade_id: number,
    pair: string,
    type: string,
    amount: number,
    rate: number,
    order_id: number,
    is_your_order: boolean,
    timestamp: number
  },
  uuid: string
}

export interface Candle {
  date: Date,
  open: number,
  high: number,
  low: number,
  close: number,
  volume: number,
  absoluteChange: string,
  dividend: string,
  percentChange: string,
  split: string
}

export interface Orders {
  stock: string;
  coinFrom: string;
  coinTo: string;
  pair: Pair;
  id: string;
  bestpriceBid: number;
  bestpriceAsk: number;
  bids: [[number, number]];
  asks: [[number, number]];
  timestamp: number;
  datetime: Date;
}

export interface WidgetConfig {
  name: string;
  component: WidgetName,
  settings: string,
  settingsWidth: number | string,
  img: PathString,
  header?: 'Trades',
  customHeader?: '',
  title: string,
  customTitle: string,
  description: string,
  author: TagId,
  authorLink: URLPath,
  source: string,
  library?: 'react-stockcharts' | 'v-charts',
  libraries?: ['react-stockcharts', 'v-charts'],
  stock: undefined,
  pair: undefined,
  channel: Channel,
  channels: Channel[],
  categories: Category[],
  demo: boolean,
  type?: BidsAsksBoth,
  visualMode?: VisualMode,
  visualModeMax?: VisualModeMax,
  visualModeCrocodileMax?: number,
  visualModeWallsMax?: number,
  timeframe?: Timeframe
  data?: {
    stock: Stock,
    pair: Pair,
    group: string,
    groupColor: string
  },
}

export type Side = 'left' | 'right'

export type ComponentName = 'Menu' | 'Empty' | 'Pairs' | 'Stocks'

export interface Aside {
  id: string,
  side: Side,
  width: number,
  component: ComponentName,
  title?: string,
  permanent: boolean,
  widget?: WidgetConfig,
  right?: number, // position
  left?: number, // position
}

export interface KupiUser {
  picture: {
    data: { url: string }
  }
}

export interface Account {
  id: string,
  name: string,
  stock: Stock,
}

export interface AppState {
  blocks: Block,
  blocksTrigger: boolean,
  background: string,
  color: string,
  stock: Stock
  channels: Channel[]
  pair: string,
  accountId: string | null,
  accountName: string | null,
  serverBackend: string,
  signalHistoryUrl: string,
  signalDetailsUrl: string,
  deals: [],
  deal: [],
  timeframe: Timeframe,
  candles: number[][],
}

export interface AccountState {
  user: any
  kupiUser: KupiUser
  accounts: Account[]
}

export interface AsideState {
  asidesTrigger: boolean
  asides: Aside[]
}

export interface CoinState {
  context: any
  state: any
  coins: object
  hash: string
}

export interface AccountingState {
  deals: any,
  state: any,
  activeDeal: string,
  stock: any,
  trade: any,
  deal: any,
}

export interface RootState {
  app: AppState,
  account: AccountState,
  aside: AsideState,
  coin: CoinState,
  accounting: AccountingState
}
