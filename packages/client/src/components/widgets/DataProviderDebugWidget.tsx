import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Separator } from '../ui/separator';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { useDataProviderStore } from '../../store/dataProviderStore';
import { ConnectionStatus, DataProvider, ActiveSubscription } from '../../types/dataProviders';
import { 
  Wifi, 
  WifiOff, 
  AlertCircle, 
  Clock, 
  Users,
  Activity,
  Trash2,
  RefreshCw,
  RotateCcw,
  Database,
  PlayCircle,
  Settings,
  Edit,
  X,
  Save,
  Power,
  PowerOff,
  Hash,
  ArrowRight,
  AlertTriangle
} from 'lucide-react';

const getStatusIcon = (status: ConnectionStatus) => {
  switch (status) {
    case 'connected':
      return <Wifi className="h-4 w-4 text-green-500" />;
    case 'connecting':
      return <Activity className="h-4 w-4 text-yellow-500 animate-spin" />;
    case 'disconnected':
      return <WifiOff className="h-4 w-4 text-gray-500" />;
    case 'error':
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    default:
      return <WifiOff className="h-4 w-4 text-gray-500" />;
  }
};

const getStatusBadge = (status: ConnectionStatus) => {
  const variants = {
    connected: 'default',
    connecting: 'secondary',
    disconnected: 'outline',
    error: 'destructive'
  } as const;

  return (
    <Badge variant={variants[status] || 'outline'} className="flex items-center gap-1">
      {getStatusIcon(status)}
      {status}
    </Badge>
  );
};

const formatTimestamp = (timestamp: number) => {
  if (timestamp === 0) return 'Never';
  return new Date(timestamp).toLocaleTimeString();
};

const formatDuration = (timestamp: number) => {
  if (timestamp === 0) return 'N/A';
  const diff = Date.now() - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
};

export const DataProviderDebugWidget: React.FC = () => {
  const {
    providers,
    activeProviderId,
    dataFetchSettings,
    getActiveSubscriptionsList,
    removeProvider,
    setActiveProvider,
    enableProvider,
    disableProvider,
    toggleProvider,
    isProviderEnabled,
    getEnabledProviders,
    updateProvider,
    cleanup,
    forceCloseSubscription,
    getSubscriptionKey
  } = useDataProviderStore();

  const [editingProviderId, setEditingProviderId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<{
    name: string;
    exchanges: string[];
    priority: number;
    type?: string;
    serverUrl?: string;
    token?: string;
    timeout?: number;
    apiUrl?: string;
    jsonSchema?: Record<string, any>;
  }>({ name: '', exchanges: [], priority: 1 });

  const activeSubscriptions = getActiveSubscriptionsList();
  const providerList = Object.values(providers);
  const enabledProviders = getEnabledProviders();
  
  // Separate subscriptions by methods
  const webSocketSubscriptions = activeSubscriptions.filter(sub => sub.method === 'websocket');
  const restSubscriptions = activeSubscriptions.filter(sub => sub.method === 'rest');

  const handleRemoveProvider = (providerId: string) => {
    removeProvider(providerId);
  };

  const handleSetActiveProvider = (providerId: string) => {
    setActiveProvider(providerId);
  };

  const handleToggleProvider = (providerId: string) => {
    toggleProvider(providerId);
  };

  const handleCleanup = () => {
    cleanup();
  };

  const handleForceCloseSubscription = (subscription: ActiveSubscription) => {
    const subscriptionKey = getSubscriptionKey(
      subscription.key.exchange,
      subscription.key.symbol,
      subscription.key.dataType,
      subscription.key.timeframe,
      subscription.key.market
    );
    forceCloseSubscription(subscriptionKey);
  };

  const startEdit = (provider: DataProvider) => {
    setEditingProviderId(provider.id);
    setEditFormData({
      name: provider.name,
      exchanges: provider.exchanges,
      priority: provider.priority,
      type: provider.type,
      serverUrl: (provider.type === 'ccxt-server' || provider.type === 'custom-server-with-adapter') ? (provider.config as any).serverUrl : undefined,
      token: provider.type === 'ccxt-server' ? (provider.config as any).token : undefined,
      timeout: (provider.type === 'ccxt-server' || provider.type === 'marketmaker.cc' || provider.type === 'custom-server-with-adapter') ? (provider.config as any).timeout : undefined,
      apiUrl: provider.type === 'marketmaker.cc' ? (provider.config as any).apiUrl : undefined,
      jsonSchema: provider.type === 'custom-server-with-adapter' ? (provider.config as any).jsonSchema : undefined
    });
  };

  const saveEdit = () => {
    if (!editingProviderId) return;

    const updates: any = {
      name: editFormData.name,
      exchanges: editFormData.exchanges,
      priority: editFormData.priority
    };

    // Add config updates based on provider type
    if (editFormData.type === 'ccxt-server') {
      updates.config = {
        serverUrl: editFormData.serverUrl,
        token: editFormData.token,
        timeout: editFormData.timeout || 30000
      };
    } else if (editFormData.type === 'marketmaker.cc') {
      updates.config = {
        apiUrl: editFormData.apiUrl,
        timeout: editFormData.timeout || 30000,
        authentication: {}
      };
    } else if (editFormData.type === 'custom-server-with-adapter') {
      updates.config = {
        serverUrl: editFormData.serverUrl,
        timeout: editFormData.timeout || 30000,
        jsonSchema: editFormData.jsonSchema || {},
        authentication: {}
      };
    }

    updateProvider(editingProviderId, updates);

    setEditingProviderId(null);
  };

  const cancelEdit = () => {
    setEditingProviderId(null);
  };

  const renderExchangeSelection = () => {
    const availableExchanges = ['*', 'binance', 'bybit', 'okx', 'kucoin', 'coinbase', 'huobi', 'kraken', 'bitfinex', 'gateio', 'mexc', 'bitget'];
    
    return (
      <div className="space-y-2">
        <Label className="text-xs">Exchanges</Label>
        <div className="flex flex-wrap gap-1">
          {availableExchanges.map(exchange => (
            <Button
              key={exchange}
              size="sm"
              variant={editFormData.exchanges.includes(exchange) ? "default" : "outline"}
              className="h-6 px-2 text-xs"
              onClick={() => {
                if (exchange === '*') {
                  // If selecting "all", clear other selections and add only "*"
                  setEditFormData(prev => ({
                    ...prev,
                    exchanges: ['*']
                  }));
                } else {
                  // If selecting specific exchange, remove "*" and toggle this exchange
                  setEditFormData(prev => {
                    let newExchanges = prev.exchanges.filter(e => e !== '*');
                    if (newExchanges.includes(exchange)) {
                      newExchanges = newExchanges.filter(e => e !== exchange);
                    } else {
                      newExchanges = [...newExchanges, exchange];
                    }
                    return { ...prev, exchanges: newExchanges };
                  });
                }
              }}
            >
              {exchange === '*' ? '🌍 All' : exchange}
            </Button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4 p-4">
      {/* Statistics and controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="flex items-center gap-1">
            <Activity className="h-3 w-3" />
            {activeSubscriptions.filter(s => s.isActive).length} active
          </Badge>
          <Badge variant="secondary" className="flex items-center gap-1">
            <Power className="h-3 w-3" />
            {enabledProviders.length} enabled
          </Badge>
        </div>
        <Button size="sm" variant="outline" onClick={handleCleanup}>
          <Trash2 className="h-3 w-3 mr-1" />
          Clear all
        </Button>
      </div>

      {/* General settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Current settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Fetch method:</span>
              <Badge variant={dataFetchSettings.method === 'websocket' ? 'default' : 'secondary'}>
                {dataFetchSettings.method === 'websocket' ? '📡 WebSocket' : '🔄 REST'}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Legacy active provider:</span>
              <span className="font-mono text-xs">{activeProviderId || 'Not selected'}</span>
            </div>
          </div>
          
          {enabledProviders.length > 0 && (
            <div className="border-t pt-3">
              <div className="text-xs text-gray-600 mb-2">Enabled providers by priority:</div>
              <div className="flex flex-wrap gap-1">
                {enabledProviders
                  .sort((a, b) => a.priority - b.priority)
                  .map(provider => (
                    <Badge key={provider.id} variant="secondary" className="text-xs">
                      #{provider.priority} {provider.name}
                    </Badge>
                  ))}
              </div>
            </div>
          )}
          
          {dataFetchSettings.method === 'rest' && (
            <div className="border-t pt-3">
              <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">REST request intervals:</div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="bg-blue-50 dark:bg-blue-950/50 p-2 rounded border border-blue-200 dark:border-blue-800">
                  <div className="font-medium text-blue-900 dark:text-blue-100">Trades</div>
                  <div className="font-mono text-blue-800 dark:text-blue-200">{dataFetchSettings.restIntervals.trades}ms</div>
                </div>
                <div className="bg-green-50 dark:bg-green-950/50 p-2 rounded border border-green-200 dark:border-green-800">
                  <div className="font-medium text-green-900 dark:text-green-100">Candles</div>
                  <div className="font-mono text-green-800 dark:text-green-200">{dataFetchSettings.restIntervals.candles}ms</div>
                </div>
                <div className="bg-purple-50 dark:bg-purple-950/50 p-2 rounded border border-purple-200 dark:border-purple-800">
                  <div className="font-medium text-purple-900 dark:text-purple-100">OrderBook</div>
                  <div className="font-mono text-purple-800 dark:text-purple-200">{dataFetchSettings.restIntervals.orderbook}ms</div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Data providers */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Database className="h-4 w-4" />
            Data providers ({providerList.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {providerList.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No configured data providers
            </p>
          ) : (
            providerList
              .sort((a, b) => a.priority - b.priority)
              .map((provider) => (
                <div key={provider.id} className={`p-3 border rounded-lg ${
                  editingProviderId === provider.id ? 'bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-800' : ''
                }`}>
                  {editingProviderId === provider.id ? (
                    // Edit mode
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs">Name</Label>
                          <Input
                            value={editFormData.name}
                            onChange={(e) => setEditFormData(prev => ({ ...prev, name: e.target.value }))}
                            className="h-8 text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Priority</Label>
                          <Input
                            type="number"
                            value={editFormData.priority}
                            onChange={(e) => setEditFormData(prev => ({ ...prev, priority: parseInt(e.target.value) || 1 }))}
                            className="h-8 text-sm"
                          />
                        </div>
                      </div>

                      {/* CCXT Server specific fields */}
                      {editFormData.type === 'ccxt-server' && (
                        <div className="space-y-3 border-t pt-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label className="text-xs">Server URL</Label>
                              <Input
                                value={editFormData.serverUrl || ''}
                                onChange={(e) => setEditFormData(prev => ({ ...prev, serverUrl: e.target.value }))}
                                placeholder="http://localhost:3001"
                                className="h-8 text-sm"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Timeout (ms)</Label>
                              <Input
                                type="number"
                                value={editFormData.timeout || 30000}
                                onChange={(e) => setEditFormData(prev => ({ ...prev, timeout: parseInt(e.target.value) || 30000 }))}
                                className="h-8 text-sm"
                                min={1000}
                                max={60000}
                              />
                            </div>
                          </div>
                          <div>
                            <Label className="text-xs">Authentication Token</Label>
                            <Input
                              type="password"
                              value={editFormData.token || ''}
                              onChange={(e) => setEditFormData(prev => ({ ...prev, token: e.target.value }))}
                              placeholder="your-secret-token"
                              className="h-8 text-sm"
                            />
                          </div>
                        </div>
                      )}

                      {renderExchangeSelection()}
                      
                      <div className="flex items-center gap-2 pt-2">
                        <Button size="sm" onClick={saveEdit}>
                          <Save className="h-3 w-3 mr-1" />
                          Save
                        </Button>
                        <Button size="sm" variant="outline" onClick={cancelEdit}>
                          <X className="h-3 w-3 mr-1" />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    // Display mode
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(provider.status)}
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-sm">{provider.name}</p>
                              <Badge variant="outline" className="text-xs">
                                <Hash className="h-3 w-3 mr-1" />
                                {provider.priority}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <span>{provider.type}</span>
                              <ArrowRight className="h-3 w-3" />
                              <span>
                                {provider.exchanges.includes('*') 
                                  ? '🌍 All exchanges'
                                  : provider.exchanges.join(', ')
                                }
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-1">
                          {provider.id === activeProviderId && (
                            <Badge variant="secondary" className="text-xs">Legacy Active</Badge>
                          )}
                          {provider.status === 'connected' && (
                            <Badge variant="default" className="text-xs">Enabled</Badge>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {getStatusBadge(provider.status)}
                        
                        <Button
                          size="sm"
                          variant={provider.status === 'connected' ? "destructive" : "default"}
                          onClick={() => handleToggleProvider(provider.id)}
                        >
                          {provider.status === 'connected' ? (
                            <>
                              <PowerOff className="h-3 w-3 mr-1" />
                              Disable
                            </>
                          ) : (
                            <>
                              <Power className="h-3 w-3 mr-1" />
                              Enable
                            </>
                          )}
                        </Button>
                        
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => startEdit(provider)}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRemoveProvider(provider.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))
          )}
          
          {enabledProviders.length === 0 && providerList.length > 0 && (
            <div className="p-3 border border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/50 rounded-lg flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
              <span className="text-sm text-orange-700 dark:text-orange-300">
                No providers are enabled. Enable at least one provider to receive data.
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* WebSocket subscriptions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Wifi className="h-4 w-4" />
            WebSocket subscriptions ({webSocketSubscriptions.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {webSocketSubscriptions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No active WebSocket subscriptions
            </p>
          ) : (
            webSocketSubscriptions.map((subscription, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${subscription.isActive ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                  <div>
                    <p className="font-medium text-sm">
                      {subscription.key.exchange} • {subscription.key.market || 'spot'} • {subscription.key.symbol}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {subscription.key.dataType}{subscription.key.timeframe ? ` • ${subscription.key.timeframe}` : ''} • Updated: {formatTimestamp(subscription.lastUpdate)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Users className="h-3 w-3" />
                    {subscription.subscriberCount}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {formatDuration(subscription.lastUpdate)}
                  </div>
                  <Badge variant={subscription.isActive ? 'default' : 'outline'}>
                    {subscription.isActive ? '🟢 Active' : '🔴 Inactive'}
                  </Badge>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                    onClick={() => handleForceCloseSubscription(subscription)}
                    title="Force close WebSocket connection"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* REST polling cycles */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <RotateCcw className="h-4 w-4" />
            REST polling cycles ({restSubscriptions.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {restSubscriptions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No active REST cycles
            </p>
          ) : (
            restSubscriptions.map((subscription, index) => (
              <div key={index} className={`flex items-center justify-between p-3 rounded-lg border ${
                subscription.isFallback 
                  ? 'bg-orange-50 dark:bg-orange-950/50 border-orange-200 dark:border-orange-800' 
                  : 'bg-background border-border'
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${subscription.isActive ? 'bg-orange-500' : 'bg-gray-400'}`}></div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">
                        {subscription.key.exchange} • {subscription.key.market || 'spot'} • {subscription.key.symbol}
                      </p>
                      {subscription.isFallback && (
                        <Badge variant="outline" className="text-xs bg-orange-100 dark:bg-orange-950/70 text-orange-700 dark:text-orange-300 border-orange-300 dark:border-orange-700">
                          🔄 Fallback
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {subscription.key.dataType}{subscription.key.timeframe ? ` • ${subscription.key.timeframe}` : ''} • Interval: {dataFetchSettings.restIntervals[subscription.key.dataType]}ms
                    </p>
                    {subscription.isFallback && (
                      <p className="text-xs text-orange-600">
                        WebSocket unavailable, using REST
                      </p>
                    )}
                    <p className="text-xs text-gray-500">
                      Last request: {formatTimestamp(subscription.lastUpdate)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Users className="h-3 w-3" />
                    {subscription.subscriberCount}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {formatDuration(subscription.lastUpdate)}
                  </div>
                  <Badge variant={subscription.isActive ? 'secondary' : 'outline'}>
                    {subscription.isActive ? '🔄 Polling' : '⏸️ Stopped'}
                  </Badge>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                    onClick={() => handleForceCloseSubscription(subscription)}
                    title="Force close REST polling"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">General statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Total subscriptions:</span>
                <span className="font-mono">{activeSubscriptions.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Active:</span>
                <span className="font-mono text-green-600">{activeSubscriptions.filter(s => s.isActive).length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">WebSocket:</span>
                <span className="font-mono text-blue-600">{webSocketSubscriptions.length}</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">REST cycles:</span>
                <span className="font-mono text-orange-600">{restSubscriptions.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Providers:</span>
                <span className="font-mono">{providerList.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Enabled:</span>
                <span className="font-mono text-green-600">{enabledProviders.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Subscribers:</span>
                <span className="font-mono">{activeSubscriptions.reduce((sum, s) => sum + s.subscriberCount, 0)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}; 