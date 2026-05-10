import React, { useEffect, useState } from 'react';
import { useDataProviderStore } from '../store/dataProviderStore';
import { getCCXT } from '../store/utils/ccxtUtils';
import { ccxtInstanceManager } from '../store/utils/ccxtInstanceManager';

const TestTimeframes: React.FC = () => {
  const { getTimeframesForExchange } = useDataProviderStore();
  const [results, setResults] = useState<Record<string, any>>({});

  useEffect(() => {
    const testExchanges = ['binance', 'bybit', 'okx', 'kucoin'];
    const testResults: Record<string, any> = {};

    const runTests = async () => {
      // Test direct CCXT access
      console.log('🧪 [TestTimeframes] Testing direct CCXT access');
      const ccxt = getCCXT();
      if (ccxt) {
        console.log('✅ [TestTimeframes] CCXT is available');
        console.log('📋 [TestTimeframes] Available exchanges:', Object.keys(ccxt).filter(key => typeof ccxt[key] === 'function').slice(0, 10));

        // Test specific exchange using ccxtInstanceManager
        if (ccxt.binance) {
          try {
            const binanceInstance = await ccxtInstanceManager.getExchangeInstanceForMarket(
              'binance',
              'test-timeframes-account',
              {
                apiKey: 'test',
                secret: 'test',
                sandbox: true
              },
              'spot'
            );
            console.log('📊 [TestTimeframes] Binance timeframes via ccxtInstanceManager:', binanceInstance.timeframes);
            testResults.binance_direct = binanceInstance.timeframes;
          } catch (error) {
            console.error('❌ [TestTimeframes] Error creating Binance instance via ccxtInstanceManager:', error);
            testResults.binance_direct = { error: error.message };

            // Fallback to direct instantiation for comparison
            try {
              const binanceInstanceFallback = new ccxt.binance();
              console.log('⚠️ [TestTimeframes] Fallback - Binance timeframes:', binanceInstanceFallback.timeframes);
              testResults.binance_direct = binanceInstanceFallback.timeframes;
            } catch (fallbackError) {
              console.error('❌ [TestTimeframes] Fallback also failed:', fallbackError);
              testResults.binance_direct = { error: fallbackError.message };
            }
          }
        }
      } else {
        console.error('❌ [TestTimeframes] CCXT is not available');
        testResults.ccxt_available = false;
      }

      // Test our store method
      testExchanges.forEach(exchange => {
        console.log(`🧪 [TestTimeframes] Testing ${exchange}`);
        try {
          const timeframes = getTimeframesForExchange(exchange);
          testResults[exchange] = timeframes;
          console.log(`✅ [TestTimeframes] ${exchange} timeframes:`, timeframes);
        } catch (error) {
          console.error(`❌ [TestTimeframes] Error getting timeframes for ${exchange}:`, error);
          testResults[exchange] = { error: error.message };
        }
      });

      setResults(testResults);
    };

    runTests();
  }, [getTimeframesForExchange]);

  return (
    <div className="p-4 bg-gray-900 text-white">
      <h2 className="text-xl font-bold mb-4">🧪 Timeframes Test Results</h2>
      <pre className="text-xs bg-gray-800 p-4 rounded overflow-auto">
        {JSON.stringify(results, null, 2)}
      </pre>
    </div>
  );
};

export default TestTimeframes; 