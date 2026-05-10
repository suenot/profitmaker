import React, { useEffect, useState } from 'react';
import { useDataProviderStore } from '../store/dataProviderStore';
import { ccxtInstanceManager } from '../store/utils/ccxtInstanceManager';

export const TestChartWidget: React.FC = () => {
  const { 
    providers, 
    getProviderForExchange, 
    initializeChartData,
    getCandles,
    subscribe,
    unsubscribe,
    getActiveSubscriptionsList
  } = useDataProviderStore();

  const [testResults, setTestResults] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const addResult = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
    console.log(`[TestChart] ${message}`);
  };

  const testProviders = () => {
    addResult('=== Testing Providers ===');
    const providerList = Object.values(providers);
    addResult(`Found ${providerList.length} providers`);
    
    providerList.forEach(provider => {
      addResult(`Provider: ${provider.name} (${provider.id}) - Status: ${provider.status} - Exchanges: ${provider.exchanges.join(', ')}`);
    });

    const binanceProvider = getProviderForExchange('binance');
    addResult(`Provider for Binance: ${binanceProvider ? binanceProvider.name : 'None'}`);
  };

  const testCCXT = async () => {
    addResult('=== Testing CCXT ===');
    try {
      const ccxt = (window as any).ccxt;
      if (ccxt) {
        addResult(`CCXT loaded: version ${ccxt.version || 'unknown'}`);
        addResult(`Available exchanges: ${Object.keys(ccxt).filter(k => typeof ccxt[k] === 'function').slice(0, 5).join(', ')}...`);

        // Test Binance instance creation using ccxtInstanceManager
        try {
          const binance = await ccxtInstanceManager.getExchangeInstanceForMarket(
            'binance',
            'test-account',
            {
              apiKey: 'test',
              secret: 'test',
              sandbox: true
            },
            'spot'
          );
          addResult(`✅ Binance instance created via ccxtInstanceManager: ${binance.id}`);
        } catch (managerError) {
          addResult(`❌ ccxtInstanceManager error: ${managerError}`);
          // Fallback to direct instantiation for comparison
          const binance = new ccxt.binance();
          addResult(`⚠️ Fallback - Binance instance created directly: ${binance.id}`);
        }
      } else {
        addResult('❌ CCXT not loaded');
      }
    } catch (error) {
      addResult(`❌ CCXT error: ${error}`);
    }
  };

  const testInitializeChartData = async () => {
    addResult('=== Testing Chart Data Initialization ===');
    setIsLoading(true);
    
    try {
      const candles = await initializeChartData('binance', 'BTC/USDT', '1h', 'spot');
      addResult(`✅ Chart data loaded: ${candles.length} candles`);
      if (candles.length > 0) {
        const firstCandle = candles[0];
        const lastCandle = candles[candles.length - 1];
        addResult(`First candle: ${new Date(firstCandle.timestamp).toLocaleString()} - Close: ${firstCandle.close}`);
        addResult(`Last candle: ${new Date(lastCandle.timestamp).toLocaleString()} - Close: ${lastCandle.close}`);
      }
    } catch (error) {
      addResult(`❌ Chart data error: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testSubscription = async () => {
    addResult('=== Testing Subscription ===');
    
    try {
      const result = await subscribe('test-widget', 'binance', 'BTC/USDT', 'candles', '1h', 'spot');
      addResult(`Subscription result: ${result.success ? '✅ Success' : '❌ Failed'} - ${result.error || 'OK'}`);
      
      const subscriptions = getActiveSubscriptionsList();
      addResult(`Active subscriptions: ${subscriptions.length}`);
      
      subscriptions.forEach(sub => {
        addResult(`- ${sub.key.exchange}:${sub.key.symbol}:${sub.key.dataType} (${sub.method}) - Active: ${sub.isActive}`);
      });
      
      // Check stored data
      const storedCandles = getCandles('binance', 'BTC/USDT', '1h', 'spot');
      addResult(`Stored candles: ${storedCandles.length}`);
      
    } catch (error) {
      addResult(`❌ Subscription error: ${error}`);
    }
  };

  const runAllTests = async () => {
    setTestResults([]);
    testProviders();
    await testCCXT();
    await testInitializeChartData();
    await testSubscription();
    addResult('=== All Tests Completed ===');
  };

  useEffect(() => {
    // Auto-run tests on mount
    runAllTests();
  }, []);

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Chart Widget Test</h2>
      
      <div className="mb-4 space-x-2">
        <button 
          onClick={runAllTests}
          disabled={isLoading}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {isLoading ? 'Running Tests...' : 'Run All Tests'}
        </button>
        
        <button 
          onClick={testProviders}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
        >
          Test Providers
        </button>
        
        <button
          onClick={() => testCCXT()}
          className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
        >
          Test CCXT
        </button>
        
        <button 
          onClick={testInitializeChartData}
          disabled={isLoading}
          className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50"
        >
          Test Chart Data
        </button>
      </div>

      <div className="bg-gray-100 p-4 rounded-lg max-h-96 overflow-y-auto">
        <h3 className="font-bold mb-2">Test Results:</h3>
        {testResults.length === 0 ? (
          <p className="text-gray-500">No tests run yet</p>
        ) : (
          <div className="space-y-1">
            {testResults.map((result, index) => (
              <div 
                key={index} 
                className={`text-sm font-mono ${
                  result.includes('❌') ? 'text-red-600' : 
                  result.includes('✅') ? 'text-green-600' : 
                  result.includes('===') ? 'text-blue-600 font-bold' :
                  'text-gray-700'
                }`}
              >
                {result}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}; 