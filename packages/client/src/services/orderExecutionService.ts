import type {
  PlaceOrderRequest,
  AdvancedOrderOptions
} from '../types/orders';
import type { CCXTServerProvider } from '../types/dataProviders';
import type { AccountRef } from '@profitmaker/types';
import { createCCXTServerProvider } from '../store/providers/ccxtServerProvider';
import { useDataProviderStore } from '../store/dataProviderStore';
import type { OrderSubmitResponse } from '../store/placeOrderStore';
import { generateClientOrderId } from '../utils/orderMath';

/**
 * Order statuses that mean the venue did NOT accept the order, even though the
 * createOrder call itself resolved. Several exchanges return a well-formed order
 * object carrying one of these instead of throwing.
 */
const NON_EXECUTED_STATUSES = new Set(['rejected', 'canceled', 'cancelled', 'expired']);

/**
 * True when the exchange's response describes an order that will never execute.
 * An absent status is treated as accepted — that is the common shape for a
 * successful createOrder on many venues.
 */
export function isRejectedStatus(status: unknown): boolean {
  if (typeof status !== 'string') return false;
  return NON_EXECUTED_STATUSES.has(status.trim().toLowerCase());
}

/**
 * Executes a trading order through CCXT
 */
export async function executeOrder(
  orderRequest: PlaceOrderRequest,
  advancedOptions?: AdvancedOrderOptions
): Promise<OrderSubmitResponse> {
  try {
    console.log(`🚀 [OrderExecution] Executing order:`, orderRequest);

    if (!orderRequest.accountId) {
      throw new Error('No account selected for order');
    }

    // Central accounts: the browser sends only an account reference; the server
    // resolves the decrypted keys under the caller's SSO identity. Orders are
    // trade-level, so the server rejects read-only accounts/grants with a 403.
    const creds: AccountRef = { accountId: orderRequest.accountId, want: 'trade' };

    // Get data provider for the exchange
    const dataProviderStore = useDataProviderStore.getState();
    const provider = dataProviderStore.getProviderForExchange(orderRequest.exchange);

    if (!provider || provider.type !== 'ccxt-server') {
      throw new Error(`No CCXT server provider found for exchange ${orderRequest.exchange}`);
    }

    const serverProvider = createCCXTServerProvider(provider as CCXTServerProvider);

    // Prepare order parameters
    const { symbol, side, type, amount, price, stopPrice } = orderRequest;
    
    let ccxtOrderType: string;
    let orderParams: any = {};
    const clientOrderId = orderRequest.clientOrderId ?? generateClientOrderId();

    // Map our order types to CCXT order types
    switch (type) {
      case 'market':
        ccxtOrderType = 'market';
        break;
      case 'limit':
        ccxtOrderType = 'limit';
        if (!price) {
          throw new Error('Price is required for limit orders');
        }
        break;
      case 'stop_loss':
        ccxtOrderType = 'stop';
        if (!stopPrice) {
          throw new Error('Stop price is required for stop loss orders');
        }
        orderParams.stopPrice = stopPrice;
        break;
      case 'take_profit':
        ccxtOrderType = 'take_profit';
        if (!price) {
          throw new Error('Price is required for take profit orders');
        }
        break;
      case 'stop_limit':
        ccxtOrderType = 'stop_limit';
        if (!price || !stopPrice) {
          throw new Error('Both price and stop price are required for stop limit orders');
        }
        orderParams.stopPrice = stopPrice;
        break;
      default:
        throw new Error(`Unsupported order type: ${type}`);
    }

    // Add advanced options
    if (orderRequest.timeInForce && orderRequest.timeInForce !== 'GTC') {
      orderParams.timeInForce = orderRequest.timeInForce;
    }
    
    if (orderRequest.reduceOnly) {
      orderParams.reduceOnly = true;
    }
    
    if (orderRequest.postOnly) {
      orderParams.postOnly = true;
    }
    
    orderParams.clientOrderId = clientOrderId;

    // Execute the order
    console.log(`📤 [OrderExecution] Placing ${ccxtOrderType} ${side} order:`, {
      symbol,
      amount,
      price,
      params: orderParams,
    });

    let ccxtOrder: any;

    try {
      ccxtOrder = await serverProvider.trading.createOrder(creds, {
        exchange: orderRequest.exchange,
        symbol,
        type: ccxtOrderType,
        side,
        amount,
        price, // Can be undefined for market orders
        market: orderRequest.market as any,
        params: orderParams,
      });
    } catch (createOrderError: any) {
      console.error(`❌ [OrderExecution] Failed to create order:`, createOrderError);
      
      // Prefix a friendly hint where we recognise the failure, but ALWAYS keep
      // the exchange's own message — it is the only thing that says which filter
      // actually rejected the order (e.g. Binance's "Filter failure: MIN_NOTIONAL").
      const rawMessage = createOrderError.message || 'Unknown error';
      const lowered = rawMessage.toLowerCase();

      let hint = '';
      if (lowered.includes('insufficient')) {
        hint = 'Insufficient balance to place order';
      } else if (lowered.includes('min_notional') || lowered.includes('minimum')) {
        hint = 'Order is below the exchange minimum';
      } else if (lowered.includes('invalid symbol')) {
        hint = 'Trading pair not found or not tradeable';
      } else if (lowered.includes('market closed')) {
        hint = 'Market is currently closed for trading';
      }

      throw new Error(hint ? `${hint} — ${rawMessage}` : rawMessage);
    }

    console.log(`✅ [OrderExecution] Order placed successfully:`, ccxtOrder);

    // The call resolved, but that is not the same as the venue accepting the
    // order — some exchanges hand back an order object with a terminal status.
    if (isRejectedStatus(ccxtOrder?.status)) {
      const status = String(ccxtOrder.status).toLowerCase();
      console.error(`❌ [OrderExecution] Exchange returned a non-executed status:`, status, ccxtOrder);
      return {
        success: false,
        error: `Exchange ${status} the order (id ${ccxtOrder.id ?? 'unknown'}). It was not executed.`,
        orderId: ccxtOrder.id,
      };
    }

    // Handle advanced options (stop loss / take profit).
    //
    // These are sized to the FULL entry amount and fired immediately, before the
    // entry is known to have filled. That is a real limitation: on spot the
    // reduce-only flag is not honoured, and a market buy of 1 BTC credits less
    // than 1 BTC once fees are taken, so the protective leg can be rejected.
    // Every failure below is therefore reported back to the caller — a stop that
    // silently failed to place is worse than no stop at all, because the user
    // believes they are protected.
    const additionalOrders: any[] = [];
    const warnings: string[] = [];

    if (advancedOptions?.stopLoss?.enabled && advancedOptions.stopLoss.price) {
      try {
        const stopLossOrder = await serverProvider.trading.createOrder(creds, {
          exchange: orderRequest.exchange,
          symbol,
          type: 'stop',
          side: side === 'buy' ? 'sell' : 'buy', // Opposite side
          amount,
          market: orderRequest.market as any,
          params: {
            clientOrderId: generateClientOrderId(),
            stopPrice: advancedOptions.stopLoss.price,
            reduceOnly: true,
          },
        });
        if (isRejectedStatus(stopLossOrder?.status)) {
          warnings.push(
            `STOP-LOSS NOT ACTIVE: the exchange ${String(stopLossOrder.status).toLowerCase()} it. This position is unprotected.`
          );
        } else {
          additionalOrders.push(stopLossOrder);
          console.log(`✅ [OrderExecution] Stop loss order placed:`, stopLossOrder);
        }
      } catch (stopLossError) {
        const reason = stopLossError instanceof Error ? stopLossError.message : 'unknown error';
        console.error(`❌ [OrderExecution] Failed to place stop loss:`, stopLossError);
        warnings.push(`STOP-LOSS NOT PLACED: ${reason}. This position is unprotected.`);
      }
    }

    if (advancedOptions?.takeProfit?.enabled && advancedOptions.takeProfit.price) {
      try {
        const takeProfitOrder = await serverProvider.trading.createOrder(creds, {
          exchange: orderRequest.exchange,
          symbol,
          type: 'limit',
          side: side === 'buy' ? 'sell' : 'buy', // Opposite side
          amount,
          price: advancedOptions.takeProfit.price,
          market: orderRequest.market as any,
          params: {
            clientOrderId: generateClientOrderId(),
            reduceOnly: true,
          },
        });
        if (isRejectedStatus(takeProfitOrder?.status)) {
          warnings.push(
            `TAKE-PROFIT NOT ACTIVE: the exchange ${String(takeProfitOrder.status).toLowerCase()} it.`
          );
        } else {
          additionalOrders.push(takeProfitOrder);
          console.log(`✅ [OrderExecution] Take profit order placed:`, takeProfitOrder);
        }
      } catch (takeProfitError) {
        const reason = takeProfitError instanceof Error ? takeProfitError.message : 'unknown error';
        console.error(`❌ [OrderExecution] Failed to place take profit:`, takeProfitError);
        warnings.push(`TAKE-PROFIT NOT PLACED: ${reason}.`);
      }
    }

    // Format response
    const response: OrderSubmitResponse = {
      success: true,
      orderId: ccxtOrder.id,
      ...(warnings.length > 0 ? { warnings } : {}),
      order: {
        id: ccxtOrder.id,
        clientOrderId: ccxtOrder.clientOrderId ?? clientOrderId,
        symbol: ccxtOrder.symbol,
        side: ccxtOrder.side as any,
        type: ccxtOrder.type as any,
        amount: ccxtOrder.amount,
        price: ccxtOrder.price,
        status: ccxtOrder.status as any,
        timestamp: ccxtOrder.timestamp || Date.now(),
        info: {
          main: ccxtOrder.info,
          stopLoss: additionalOrders.find(o => o.type === 'stop')?.info,
          takeProfit: additionalOrders.find(o => o.type === 'limit')?.info,
        },
      },
    };

    return response;

  } catch (error) {
    console.error(`❌ [OrderExecution] Order execution failed:`, error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred while placing order',
    };
  }
}

/**
 * Gets market constraints for order validation
 */
export async function getMarketConstraints(
  exchange: string,
  symbol: string,
  market: string = 'spot'
): Promise<any> {
  try {
    const dataProviderStore = useDataProviderStore.getState();
    const provider = dataProviderStore.getProviderForExchange(exchange);

    if (!provider || provider.type !== 'ccxt-server') {
      throw new Error(`No CCXT server provider found for exchange ${exchange}`);
    }

    const serverProvider = createCCXTServerProvider(provider as CCXTServerProvider);
    const marketInfo = await serverProvider.getMarketInfo(exchange, symbol, market as any);

    if (!marketInfo) {
      throw new Error(`Symbol ${symbol} not found on ${exchange}`);
    }

    return {
      minNotional: marketInfo.limits?.cost?.min || 0,
      minQty: marketInfo.limits?.amount?.min || 0,
      maxQty: marketInfo.limits?.amount?.max || Infinity,
      stepSize: marketInfo.precision?.amount || 0.00000001,
      tickSize: marketInfo.precision?.price || 0.00000001,
      maxPrice: marketInfo.limits?.price?.max || Infinity,
      minPrice: marketInfo.limits?.price?.min || 0,
      active: marketInfo.active,
      fees: {
        maker: marketInfo.maker || 0.001,
        taker: marketInfo.taker || 0.001,
      },
    };

  } catch (error) {
    console.error(`❌ [OrderExecution] Failed to get market constraints:`, error);
    throw error;
  }
}

/**
 * Cancels an existing order
 */
export async function cancelOrder(
  orderId: string,
  symbol: string,
  exchange: string,
  accountId: string,
  market: string = 'spot'
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`🗑️ [OrderExecution] Cancelling order ${orderId} on ${exchange}`);

    if (!accountId) {
      throw new Error('No account selected for cancel');
    }

    // Central accounts: send only the account reference (trade-level — cancelling
    // is a trading op); the server resolves keys and enforces access.
    const creds: AccountRef = { accountId, want: 'trade' };

    // Get CCXT provider
    const dataProviderStore = useDataProviderStore.getState();
    const provider = dataProviderStore.getProviderForExchange(exchange);

    if (!provider || provider.type !== 'ccxt-server') {
      throw new Error(`No CCXT server provider found for exchange ${exchange}`);
    }

    const serverProvider = createCCXTServerProvider(provider as CCXTServerProvider);

    const result = await serverProvider.trading.cancelOrder(creds, exchange, orderId, symbol, market as any);
    console.log(`✅ [OrderExecution] Order cancelled successfully:`, result);

    return { success: true };

  } catch (error) {
    console.error(`❌ [OrderExecution] Failed to cancel order:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to cancel order',
    };
  }
}
