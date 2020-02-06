export type Sort = 'asc' | 'desc'

export type WidgetName = 'Orders'

export type PathString = string

export type URLPath = string

export type TagId = string

export type Channel = 'default' | 'kupi' | 'ccxt'

export type Category = 'Orders'

export type Pair = string

export type Block = {[widgetName in WidgetName]: WidgetConfig}

export type BidsAsksBoth = 'both' | 'asks' | 'bids';

export type BidsAsks = 'bids' | 'asks';

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
  settingsWidth: number,
  img: PathString,
  title: string,
  customTitle: string,
  description: string,
  author: TagId,
  authorLink: URLPath,
  source: string,
  stock: undefined,
  pair: undefined,
  channel: Channel,
  channels: Channel[],
  demo: boolean,
  type: BidsAsksBoth,
  visualMode: VisualMode,
  visualModeMax: VisualModeMax,
  visualModeCrocodileMax: number,
  visualModeWallsMax: number,
  categories: Category[];
  timeframe?: any;
}
