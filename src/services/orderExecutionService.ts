import type { 
  PlaceOrderRequest, 
  PlaceOrderResponse, 
  AdvancedOrderOptions 
} from '../types/orders';
import type { CCXTBrowserProvider } from '../types/dataProviders';
import { createCCXTBrowserProvider } from '../store/providers/ccxtBrowserProvider';
import { useDataProviderStore } from '../store/dataProviderStore';
import { useUserStore } from '../store/userStore';

/**
 * Executes a trading order through CCXT
 */
export async function executeOrder(
  orderRequest: PlaceOrderRequest,
  advancedOptions?: AdvancedOrderOptions
): Promise<PlaceOrderResponse> {
  try {
    // Get user account credentials (decrypted)
    const userStore = useUserStore.getState();
    const user = userStore.users.find(u =>
      u.accounts.some(acc => acc.id === orderRequest.accountId)
    );

    if (!user) {
      throw new Error(`User not found for account ${orderRequest.accountId}`);
    }

    // Check if store is locked
    if (userStore.isLocked) {
      throw new Error('Store is locked. Please unlock with master password first.');
    }

    // Get decrypted account
    const account = await userStore.getDecryptedAccount(user.id, orderRequest.accountId);
    if (!account || !account.key || !account.privateKey) {
      throw new Error(`Account ${orderRequest.accountId} not found or missing API keys`);
    }

    // Get data provider for the exchange
    const dataProviderStore = useDataProviderStore.getState();
    const provider = dataProviderStore.getProviderForExchange(orderRequest.exchange);
    
    if (!provider || provider.type !== 'ccxt-browser') {
      throw new Error(`No CCXT browser provider found for exchange ${orderRequest.exchange}`);
    }

    // Get CCXT instance for trading
    const ccxtProvider = createCCXTBrowserProvider(provider as CCXTBrowserProvider);
    const tradingInstance = await ccxtProvider.getTradingInstance(
      user.id,
      orderRequest.accountId,
      orderRequest.exchange,
      orderRequest.market,
      'regular', // Use regular CCXT for order execution
      {
        apiKey: account.key,
        secret: account.privateKey,
        password: account.password,
        sandbox: false,
      }
    );

    // Prepare order parameters
    const { symbol, side, type, amount, price, stopPrice } = orderRequest;
    
    let ccxtOrderType: string;
    let orderParams: any = {};

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
    
    if (orderRequest.clientOrderId) {
      orderParams.clientOrderId = orderRequest.clientOrderId;
    }

    // Execute the order
    let ccxtOrder: any;
    
    try {
      ccxtOrder = await tradingInstance.createOrder(
        symbol,
        ccxtOrderType,
        side,
        amount,
        price, // Can be undefined for market orders
        orderParams
      );
    } catch (createOrderError: any) {
      console.error(`❌ [OrderExecution] Failed to create order:`, createOrderError);
      
      // Try to provide more helpful error messages
      let errorMessage = createOrderError.message || 'Unknown error';
      
      if (errorMessage.toLowerCase().includes('insufficient')) {
        errorMessage = 'Insufficient balance to place order';
      } else if (errorMessage.toLowerCase().includes('minimum')) {
        errorMessage = 'Order amount below minimum required';
      } else if (errorMessage.toLowerCase().includes('maximum')) {
        errorMessage = 'Order amount exceeds maximum allowed';
      } else if (errorMessage.toLowerCase().includes('invalid symbol')) {
        errorMessage = 'Trading pair not found or not tradeable';
      } else if (errorMessage.toLowerCase().includes('market closed')) {
        errorMessage = 'Market is currently closed for trading';
      }
      
      throw new Error(errorMessage);
    }

    // Handle advanced options (stop loss / take profit)
    const additionalOrders: any[] = [];
    const orderWarnings: string[] = [];

    if (advancedOptions?.stopLoss?.enabled && advancedOptions.stopLoss.price) {
      try {
        const stopLossOrder = await tradingInstance.createOrder(
          symbol,
          'stop',
          side === 'buy' ? 'sell' : 'buy', // Opposite side
          amount,
          undefined, // Market order
          {
            stopPrice: advancedOptions.stopLoss.price,
            reduceOnly: true,
          }
        );
        additionalOrders.push(stopLossOrder);
      } catch (stopLossError) {
        const errorMsg = stopLossError instanceof Error ? stopLossError.message : 'Unknown error';
        console.warn(`[OrderExecution] Failed to place stop loss:`, stopLossError);
        orderWarnings.push(`Stop loss order failed: ${errorMsg}`);
      }
    }

    if (advancedOptions?.takeProfit?.enabled && advancedOptions.takeProfit.price) {
      try {
        const takeProfitOrder = await tradingInstance.createOrder(
          symbol,
          'limit',
          side === 'buy' ? 'sell' : 'buy', // Opposite side
          amount,
          advancedOptions.takeProfit.price,
          {
            reduceOnly: true,
          }
        );
        additionalOrders.push(takeProfitOrder);
      } catch (takeProfitError) {
        const errorMsg = takeProfitError instanceof Error ? takeProfitError.message : 'Unknown error';
        console.warn(`[OrderExecution] Failed to place take profit:`, takeProfitError);
        orderWarnings.push(`Take profit order failed: ${errorMsg}`);
      }
    }

    // Format response
    const response: PlaceOrderResponse = {
      success: true,
      orderId: ccxtOrder.id,
      order: {
        id: ccxtOrder.id,
        clientOrderId: ccxtOrder.clientOrderId,
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
      warnings: orderWarnings.length > 0 ? orderWarnings : undefined,
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
    
    if (!provider || provider.type !== 'ccxt-browser') {
      throw new Error(`No CCXT browser provider found for exchange ${exchange}`);
    }

    const ccxtProvider = createCCXTBrowserProvider(provider as CCXTBrowserProvider);
    const metadataInstance = await ccxtProvider.getMetadataInstance(exchange, market);

    if (!metadataInstance.markets || !metadataInstance.markets[symbol]) {
      throw new Error(`Symbol ${symbol} not found on ${exchange}`);
    }

    const marketInfo = metadataInstance.markets[symbol];
    
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

    // Get user account credentials (decrypted)
    const userStore = useUserStore.getState();
    const user = userStore.users.find(u =>
      u.accounts.some(acc => acc.id === accountId)
    );

    if (!user) {
      throw new Error(`User not found for account ${accountId}`);
    }

    // Check if store is locked
    if (userStore.isLocked) {
      throw new Error('Store is locked. Please unlock with master password first.');
    }

    // Get decrypted account
    const account = await userStore.getDecryptedAccount(user.id, accountId);
    if (!account || !account.key || !account.privateKey) {
      throw new Error(`Account ${accountId} not found or missing API keys`);
    }

    // Get CCXT provider
    const dataProviderStore = useDataProviderStore.getState();
    const provider = dataProviderStore.getProviderForExchange(exchange);
    
    if (!provider || provider.type !== 'ccxt-browser') {
      throw new Error(`No CCXT browser provider found for exchange ${exchange}`);
    }

    const ccxtProvider = createCCXTBrowserProvider(provider as CCXTBrowserProvider);
    const tradingInstance = await ccxtProvider.getTradingInstance(
      user.id,
      accountId,
      exchange,
      market,
      'regular',
      {
        apiKey: account.key,
        secret: account.privateKey,
        password: account.password,
        sandbox: false,
      }
    );

    await tradingInstance.cancelOrder(orderId, symbol);

    return { success: true };

  } catch (error) {
    console.error(`❌ [OrderExecution] Failed to cancel order:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to cancel order',
    };
  }
} 