
export type WidgetName = 'Orders'

export type PathString = string

export type URLPath = string

export type TagId = string

export type Channel = 'default' | 'kupi' | 'ccxt'

export type Category = 'Orders'

export type Pair = string

export type Block = {[widgetName in WidgetName]: WidgetConfig}

export interface Notification {
  msg: string;
  type: 'alert' | 'warning' | 'info';
}

export interface Order {
  stock: string;
  coinFrom: string;
  coinTo: string;
  pair: Pair;
  id: string;
  bestpriceBid: number;
  bestpriceAsk: number;
  bids: number[][];
  asks: number[][];
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
  type: 'both',
  visualMode: 'crocodile',
  visualModeMax: 'total sum',
  visualModeCrocodileMax: number,
  visualModeWallsMax: number,
  categories: Category[];
  timeframe?: any;
}
