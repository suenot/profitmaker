import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Switch } from '../ui/switch';
import { Separator } from '../ui/separator';
import { Badge } from '../ui/badge';
import { RefreshCw, Play, Pause, Wifi, WifiOff, Activity, Loader2 } from 'lucide-react';
import { Timeframe, MarketType } from '../../types/dataProviders';
import { useExchangesList } from '../../hooks/useExchangesList';
import { useDataProviderStore } from '../../store/dataProviderStore';
import { SearchableSelect } from '../ui/SearchableSelect';
import { FALLBACK_CHART_SYMBOLS, getCompatibleChartSymbol } from '../../utils/chartSettings';

// Mapping timeframes to display labels (CCXT format - lowercase)
const TIMEFRAME_LABELS: Record<Timeframe, string> = {
  '1m': '1m',
  '3m': '3m',
  '5m': '5m',
  '15m': '15m',
  '30m': '30m',
  '1h': '1h',
  '2h': '2h',
  '4h': '4h',
  '6h': '6h',
  '12h': '12h',
  '1d': '1d',
  '1w': '1w',
  '1M': '1M',
};

interface ChartSettingsProps {
  exchange: string;
  symbol: string;
  timeframe: Timeframe;
  market: MarketType;
  isSubscribed: boolean;
  isLoading: boolean;
  error: string | null;
  dataFetchMethod: 'websocket' | 'rest';
  connectionStatus: 'connected' | 'connecting' | 'disconnected';
  onExchangeChange: (exchange: string) => void;
  onSymbolChange: (symbol: string) => void;
  onTimeframeChange: (timeframe: Timeframe) => void;
  onMarketChange: (market: MarketType) => void;
  onSubscribe: () => void;
  onUnsubscribe: () => void;
  // Новые пропсы для управления редактированием
  isReadOnly?: boolean;
}

const ChartSettings: React.FC<ChartSettingsProps> = ({
  exchange,
  symbol,
  timeframe,
  market,
  isSubscribed,
  isLoading,
  error,
  dataFetchMethod,
  connectionStatus,
  onExchangeChange,
  onSymbolChange,
  onTimeframeChange,
  onMarketChange,
  onSubscribe,
  onUnsubscribe,
  isReadOnly = false
}) => {
  // Загружаем реальные данные из провайдеров с безопасной обработкой ошибок
  const { exchanges, loading: exchangesLoading, error: exchangesError } = useExchangesList();
  const { getMarketsForExchange, getSymbolsForExchange, getTimeframesForExchange } = useDataProviderStore();

  // Get available timeframes for current exchange (memoized)
  const availableTimeframes = useMemo(() => {
    if (!exchange) {
      // Fallback timeframes when no exchange selected
      const fallbackTimeframes: Timeframe[] = ['1m', '5m', '15m', '30m', '1h', '4h', '1d'];
      return fallbackTimeframes.map(tf => ({
        id: tf,
        label: TIMEFRAME_LABELS[tf] || tf
      }));
    }
    
    console.log(`🎯 [ChartSettings] Getting timeframes for exchange: ${exchange}`);
    const timeframes = getTimeframesForExchange(exchange);
    console.log(`🎯 [ChartSettings] Received timeframes:`, timeframes);
    
    return timeframes.map(tf => ({
      id: tf,
      label: TIMEFRAME_LABELS[tf] || tf
    }));
  }, [exchange, getTimeframesForExchange]);

  // Auto-switch timeframe if current one is not available for the exchange
  useEffect(() => {
    const availableTimeframeIds = availableTimeframes.map(tf => tf.id);
    if (timeframe && !availableTimeframeIds.includes(timeframe)) {
      console.log(`🔧 [ChartSettings] Current timeframe ${timeframe} not available for ${exchange}, switching to ${availableTimeframeIds[0]}`);
      onTimeframeChange(availableTimeframeIds[0]);
    }
  }, [availableTimeframes, timeframe, exchange, onTimeframeChange]);
  
  // Fallback данные на случай ошибок
  const fallbackExchanges = [
    { id: 'binance', name: 'Binance' },
    { id: 'bybit', name: 'Bybit' },
    { id: 'okx', name: 'OKX' },
    { id: 'kucoin', name: 'KuCoin' },
    { id: 'coinbase', name: 'Coinbase' },
    { id: 'kraken', name: 'Kraken' },
    { id: 'huobi', name: 'Huobi' },
    { id: 'gateio', name: 'Gate.io' }
  ];

  const safeExchanges = exchangesError || exchanges.length === 0 ? fallbackExchanges : exchanges;
  
  // Состояние для загрузки рынков и символов
  const [availableMarkets, setAvailableMarkets] = useState<string[]>(['spot', 'futures', 'margin']);
  const [availableSymbols, setAvailableSymbols] = useState<string[]>(FALLBACK_CHART_SYMBOLS);
  const [marketsLoading, setMarketsLoading] = useState(false);
  const [symbolsLoading, setSymbolsLoading] = useState(false);
  const currentMarketRef = useRef(market);
  const currentSymbolRef = useRef(symbol);
  const onMarketChangeRef = useRef(onMarketChange);
  const onSymbolChangeRef = useRef(onSymbolChange);

  useEffect(() => {
    currentMarketRef.current = market;
    currentSymbolRef.current = symbol;
    onMarketChangeRef.current = onMarketChange;
    onSymbolChangeRef.current = onSymbolChange;
  }, [market, symbol, onMarketChange, onSymbolChange]);

  // Безопасная загрузка рынков при изменении биржи
  useEffect(() => {
    if (!exchange || !getMarketsForExchange) {
      setAvailableMarkets(['spot', 'futures', 'margin']);
      return;
    }

    let cancelled = false;
    const loadMarkets = async () => {
      setMarketsLoading(true);
      try {
        console.log(`🔍 Loading markets for exchange: ${exchange}`);
        const markets = await getMarketsForExchange(exchange);
        if (cancelled) return;
        console.log(`✅ Loaded markets for ${exchange}:`, markets);
        const nextMarkets = markets && markets.length > 0 ? markets : ['spot', 'futures', 'margin'];
        setAvailableMarkets(nextMarkets);

        const compatibleMarket = nextMarkets.includes(currentMarketRef.current)
          ? currentMarketRef.current
          : nextMarkets[0];
        if (compatibleMarket && compatibleMarket !== currentMarketRef.current) {
          onMarketChangeRef.current(compatibleMarket as MarketType);
        }
      } catch (error) {
        if (cancelled) return;
        console.error('❌ Failed to load markets:', error);
        setAvailableMarkets(['spot', 'futures', 'margin']);
      } finally {
        if (!cancelled) setMarketsLoading(false);
      }
    };

    const timeoutId = setTimeout(loadMarkets, 100);
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [exchange, getMarketsForExchange]);

  // Загрузка реальных символов из провайдера
  useEffect(() => {
    if (!exchange || !market || !getSymbolsForExchange) return;

    let cancelled = false;
    const loadSymbols = async () => {
      setSymbolsLoading(true);
      try {
        console.log(`🔍 Loading symbols for ${exchange}:${market}`);
        // Загружаем ВСЕ символы без лимита для полного списка
        const symbols = await getSymbolsForExchange(exchange, undefined, market);
        if (cancelled) return;
        console.log(`✅ Loaded ${symbols.length} symbols for ${exchange}:${market}`);

        const nextSymbols = symbols && symbols.length > 0 ? symbols : FALLBACK_CHART_SYMBOLS;
        setAvailableSymbols(nextSymbols);

        const compatibleSymbol = getCompatibleChartSymbol(currentSymbolRef.current, nextSymbols);
        if (compatibleSymbol && compatibleSymbol !== currentSymbolRef.current) {
          onSymbolChangeRef.current(compatibleSymbol);
        }

        if (!symbols || symbols.length === 0) {
          console.warn(`⚠️ No symbols loaded for ${exchange}:${market}, using fallback`);
        }
      } catch (error) {
        if (cancelled) return;
        console.error('❌ Failed to load symbols:', error);
        // Fallback на популярные символы при ошибке
        setAvailableSymbols(FALLBACK_CHART_SYMBOLS);

        const compatibleSymbol = getCompatibleChartSymbol(currentSymbolRef.current, FALLBACK_CHART_SYMBOLS);
        if (compatibleSymbol && compatibleSymbol !== currentSymbolRef.current) {
          onSymbolChangeRef.current(compatibleSymbol);
        }
      } finally {
        if (!cancelled) setSymbolsLoading(false);
      }
    };

    const timeoutId = setTimeout(loadSymbols, 100);
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [exchange, market, getSymbolsForExchange]);
  const getStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return <Wifi className="w-4 h-4 text-green-500" />;
      case 'connecting':
        return <Activity className="w-4 h-4 text-yellow-500 animate-spin" />;
      default:
        return <WifiOff className="w-4 h-4 text-red-500" />;
    }
  };

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'text-green-400';
      case 'connecting': return 'text-yellow-400';
      default: return 'text-red-400';
    }
  };

  return (
    <div className="space-y-6 p-4">
      {/* Status */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Connection Status</Label>
        <div className="flex items-center gap-3">
          {getStatusIcon()}
          <div className="flex items-center gap-2">
            <span className="font-medium">{symbol}</span>
            <span className="text-muted-foreground">({exchange.toUpperCase()})</span>
            <Badge variant={connectionStatus === 'connected' ? 'default' : 'secondary'}>
              {connectionStatus}
            </Badge>
          </div>
        </div>
        {error && (
          <div className="text-red-400 text-sm bg-red-50 dark:bg-red-950/20 p-2 rounded">
            {error}
          </div>
        )}
      </div>

      <Separator />

      {/* Exchange Settings */}
      <div className="space-y-4">
        <Label className="text-sm font-medium">Market Configuration</Label>
        
        <div className="space-y-3">
          <div className="space-y-2">
            <Label className="text-xs">Exchange</Label>
            {isReadOnly ? (
              <div className="h-8 px-3 py-2 bg-muted border border-input rounded-md text-sm flex items-center">
                {safeExchanges.find(ex => ex.id === exchange)?.name || exchange}
              </div>
            ) : (
              <SearchableSelect
                value={exchange}
                onValueChange={onExchangeChange}
                options={safeExchanges.map(ex => ex.id)}
                placeholder="Select exchange..."
                searchPlaceholder="Search exchanges..."
                loading={exchangesLoading}
                className="h-8"
                optionLabels={safeExchanges.reduce((acc, ex) => ({ ...acc, [ex.id]: ex.name }), {})}
              />
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Market</Label>
            {isReadOnly ? (
              <div className="h-8 px-3 py-2 bg-muted border border-input rounded-md text-sm flex items-center">
                {market.charAt(0).toUpperCase() + market.slice(1)}
              </div>
            ) : (
              <Select value={market} onValueChange={onMarketChange}>
                <SelectTrigger className="h-8">
                  <SelectValue />
                  {marketsLoading && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
                </SelectTrigger>
                <SelectContent>
                  {availableMarkets.map(m => (
                    <SelectItem key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Symbol</Label>
          {isReadOnly ? (
            <Input
              value={symbol}
              readOnly
              className="h-8 bg-muted"
            />
          ) : (
            <SearchableSelect
              value={symbol}
              onValueChange={onSymbolChange}
              options={availableSymbols}
              placeholder="Select symbol..."
              loading={symbolsLoading}
              className="h-8"
              searchPlaceholder="Search symbols..."
            />
          )}
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Timeframe</Label>
          <Select value={timeframe} onValueChange={onTimeframeChange}>
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableTimeframes.map(tf => (
                <SelectItem key={tf.id} value={tf.id}>{tf.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Separator />

      {/* Connection Control */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Data Connection</Label>
        
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-xs">
            Method: {dataFetchMethod.toUpperCase()}
          </Badge>
          
          <Button
            onClick={isSubscribed ? onUnsubscribe : onSubscribe}
            disabled={isLoading}
            size="sm"
            variant={isSubscribed ? "destructive" : "default"}
            className="flex items-center gap-2"
          >
            {isLoading ? (
              <RefreshCw className="w-3 h-3 animate-spin" />
            ) : isSubscribed ? (
              <Pause className="w-3 h-3" />
            ) : (
              <Play className="w-3 h-3" />
            )}
            {isLoading ? 'Loading...' : isSubscribed ? 'Disconnect' : 'Connect'}
          </Button>
        </div>
        
        <div className="text-xs text-muted-foreground">
          <p>• WebSocket provides real-time updates</p>
          <p>• REST polling updates at intervals</p>
          <p>• Chart data is cached for performance</p>
        </div>
      </div>
    </div>
  );
};

export default ChartSettings;
