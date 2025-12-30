// Types for trading orders system

export type OrderType = 'market' | 'limit' | 'stop_loss' | 'take_profit' | 'stop_limit' | 'trailing_stop';
export type OrderSide = 'buy' | 'sell';
export type OrderStatus = 'pending' | 'open' | 'closed' | 'canceled' | 'expired' | 'rejected' | 'filled' | 'partially_filled';
export type TimeInForce = 'GTC' | 'IOC' | 'FOK' | 'DAY';

export interface OrderFormData {
  symbol: string;
  side: OrderSide;
  type: OrderType;
  amount: number;
  price?: number; // Required for limit orders
  stopPrice?: number; // Required for stop orders
  takeProfitPrice?: number; // For take profit orders
  stopLossPrice?: number; // For stop loss orders
  timeInForce?: TimeInForce;
  reduceOnly?: boolean; // For futures positions
  postOnly?: boolean; // Maker-only orders
  clientOrderId?: string;
}

export interface PlaceOrderRequest extends OrderFormData {
  exchange: string;
  accountId: string;
  market: string; // spot, futures, margin
}

export interface OrderValidationError {
  field: keyof OrderFormData;
  message: string;
}

export interface OrderEstimate {
  estimatedCost: number;
  commission: number;
  commissionCurrency: string;
  available: number;
  maxAmount: number;
  minAmount: number;
  priceStep: number;
  amountStep: number;
}

export interface PlaceOrderResponse {
  success: boolean;
  orderId?: string;
  error?: string;
  warnings?: string[]; // Warnings for partial failures (e.g., stop loss/take profit failed)
  order?: {
    id: string;
    clientOrderId?: string;
    symbol: string;
    side: OrderSide;
    type: OrderType;
    amount: number;
    price?: number;
    status: OrderStatus;
    timestamp: number;
    info?: any; // Raw exchange response
  };
}

// Stop Loss and Take Profit specific types
export interface StopLossConfig {
  enabled: boolean;
  price?: number;
  percentage?: number; // Stop loss as percentage from entry price
  trailing?: boolean;
  trailingAmount?: number;
}

export interface TakeProfitConfig {
  enabled: boolean;
  price?: number;
  percentage?: number; // Take profit as percentage from entry price
}

export interface AdvancedOrderOptions {
  stopLoss?: StopLossConfig;
  takeProfit?: TakeProfitConfig;
  icebergQty?: number; // For iceberg orders
  quoteOrderQty?: number; // For quote-based orders
}

// Market-specific constraints
export interface MarketConstraints {
  minNotional: number; // Minimum order value
  minQty: number; // Minimum quantity
  maxQty: number; // Maximum quantity
  stepSize: number; // Quantity step size
  tickSize: number; // Price step size
  maxPrice: number; // Maximum price
  minPrice: number; // Minimum price
}

// Order form validation rules
export interface OrderValidationRules {
  symbol: MarketConstraints;
  balance: {
    available: number;
    currency: string;
  };
  leverage?: number; // For futures
  marginMode?: 'isolated' | 'cross'; // For futures
} 