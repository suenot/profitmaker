export type PrivateTradingDataType = 'orders' | 'myTrades' | 'positions';

/** Browser-to-server request. Exchange credentials are intentionally absent. */
export interface PrivateTradingSubscribeRequest {
  accountId: string;
  exchangeId: string;
  symbol: string;
  market?: string;
}

export interface PrivateTradingCapabilities {
  orders: boolean;
  myTrades: boolean;
  positions: boolean;
}

export interface PrivateTradingSubscribed {
  subscriptionId: string;
  accountId: string;
  exchangeId: string;
  symbol: string;
  capabilities: PrivateTradingCapabilities;
  generation: number;
}

export interface PrivateTradingDataEvent {
  subscriptionId: string;
  accountId: string;
  exchangeId: string;
  symbol: string;
  dataType: PrivateTradingDataType;
  data: unknown;
  source: 'stream';
  generation: number;
  timestamp: number;
}

export interface PrivateTradingErrorEvent {
  subscriptionId?: string;
  accountId?: string;
  dataType?: PrivateTradingDataType;
  error: string;
  fatal: boolean;
  /** This channel cannot be watched and must stay on REST reconciliation. */
  unavailable?: boolean;
  retryInMs?: number;
  generation?: number;
}

export interface PrivateTradingHeartbeat {
  subscriptionId: string;
  generation: number;
  capabilities: PrivateTradingCapabilities;
  lastEventAt: Partial<Record<PrivateTradingDataType, number>>;
  timestamp: number;
}
