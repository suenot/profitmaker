import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { ErrorBoundary } from '../ui/ErrorBoundary';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Switch } from '../ui/switch';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { useDataProviderStore } from '../../store/dataProviderStore';
import { useNotificationStore } from '../../store/notificationStore';
import { DataProviderType, DataProvider } from '../../types/dataProviders';
import { Plus, Settings, X, Edit, Save, Trash2 } from 'lucide-react';

interface NewProviderFormData {
  type: 'ccxt-server' | 'marketmaker.cc' | 'custom-server-with-adapter';
  name: string;
  exchanges: string[];
  priority?: number;
  serverUrl?: string;
  timeout?: number;
  token?: string;
  apiUrl?: string;
  jsonSchema?: Record<string, any>;
}

const COMMON_EXCHANGES = [
  'binance', 'bybit', 'okx', 'kucoin', 'coinbase', 
  'huobi', 'kraken', 'bitfinex', 'gateio', 'mexc', 'bitget'
];

const DataProviderSetupWidgetInner: React.FC = () => {
  const { createProvider, updateProvider, removeProvider, providers } = useDataProviderStore();
  const { showSuccess, showError } = useNotificationStore();
  
  const [formData, setFormData] = useState<NewProviderFormData>({
    type: 'ccxt-server',
    name: '',
    exchanges: [],
    timeout: 30000
  });
  
  const [customExchange, setCustomExchange] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Editing state
  const [editingProviderId, setEditingProviderId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<NewProviderFormData | null>(null);

  const handleFormChange = (field: keyof NewProviderFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleEditFormChange = (field: keyof NewProviderFormData, value: any) => {
    setEditFormData(prev => prev ? { ...prev, [field]: value } : null);
  };

  const addExchange = (exchange: string, isEdit = false) => {
    const targetForm = isEdit ? editFormData : formData;
    const setter = isEdit ? setEditFormData : setFormData;
    
    if (exchange && targetForm && !targetForm.exchanges.includes(exchange)) {
      setter(prev => prev ? ({
        ...prev,
        exchanges: [...prev.exchanges, exchange]
      }) : null);
    }
  };

  const removeExchange = (exchange: string, isEdit = false) => {
    const setter = isEdit ? setEditFormData : setFormData;
    setter(prev => prev ? ({
      ...prev,
      exchanges: prev.exchanges.filter(ex => ex !== exchange)
    }) : null);
  };

  const addAllExchanges = (isEdit = false) => {
    const setter = isEdit ? setEditFormData : setFormData;
    setter(prev => prev ? ({
      ...prev,
      exchanges: ['*']
    }) : null);
  };

  const addCustomExchange = (isEdit = false) => {
    if (customExchange.trim()) {
      addExchange(customExchange.trim().toLowerCase(), isEdit);
      setCustomExchange('');
    }
  };

  const validateForm = (data: NewProviderFormData): boolean => {
    if (!data.name.trim()) return false;
    if (data.exchanges.length === 0) return false;
    if ((data.type === 'ccxt-server' || data.type === 'custom-server-with-adapter') && !data.serverUrl?.trim()) return false;
    if (data.type === 'marketmaker.cc' && !data.apiUrl?.trim()) return false;
    return true;
  };

  const startEdit = (provider: DataProvider) => {
    setEditingProviderId(provider.id);
    setEditFormData({
      type: provider.type as 'ccxt-server' | 'marketmaker.cc' | 'custom-server-with-adapter',
      name: provider.name,
      exchanges: [...provider.exchanges],
      priority: provider.priority,
      serverUrl: (provider.type === 'ccxt-server' || provider.type === 'custom-server-with-adapter') ? (provider.config as any).serverUrl : undefined,
      timeout: (provider.type === 'ccxt-server' || provider.type === 'marketmaker.cc' || provider.type === 'custom-server-with-adapter') ? (provider.config as any).timeout : 30000,
      token: provider.type === 'ccxt-server' ? (provider.config as any).token : undefined,
      apiUrl: provider.type === 'marketmaker.cc' ? (provider.config as any).apiUrl : undefined,
      jsonSchema: provider.type === 'custom-server-with-adapter' ? (provider.config as any).jsonSchema : undefined
    });
  };

  const cancelEdit = () => {
    setEditingProviderId(null);
    setEditFormData(null);
  };

  const saveEdit = async () => {
    if (!editFormData || !editingProviderId || !validateForm(editFormData)) return;

    setIsSubmitting(true);

    try {
      const updates: any = {
        name: editFormData.name,
        exchanges: editFormData.exchanges,
        priority: editFormData.priority
      };

      if (editFormData.type === 'ccxt-server') {
        updates.config = {
          serverUrl: editFormData.serverUrl,
          timeout: editFormData.timeout || 30000,
          token: editFormData.token
        };
      }

      updateProvider(editingProviderId, updates);
      
      // Показываем уведомление через notification store
      showSuccess(
        `Provider "${editFormData.name}" successfully updated!`,
        'Provider configuration has been updated'
      );
      
      setEditingProviderId(null);
      setEditFormData(null);
      
    } catch (error) {
      // Показываем ошибку через notification store
      showError(
        'Error updating provider',
        error instanceof Error ? error.message : 'Unknown error'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (providerId: string, providerName: string) => {
    if (confirm(`Are you sure you want to delete provider "${providerName}"?`)) {
      removeProvider(providerId);
      // Показываем уведомление через notification store
      showSuccess(
        `Provider "${providerName}" deleted successfully!`,
        'Provider has been removed from the system'
      );
    }
  };

  const handleSubmit = async () => {
    if (!validateForm(formData)) return;

    setIsSubmitting(true);

    try {
      const config: any = {};

      if (formData.type === 'ccxt-server') {
        config.serverUrl = formData.serverUrl;
        config.timeout = formData.timeout || 30000;
        config.token = formData.token;
      } else if (formData.type === 'marketmaker.cc') {
        config.apiUrl = formData.apiUrl;
        config.timeout = formData.timeout || 30000;
        config.authentication = {};
      } else if (formData.type === 'custom-server-with-adapter') {
        config.serverUrl = formData.serverUrl;
        config.timeout = formData.timeout || 30000;
        config.jsonSchema = formData.jsonSchema || {};
        config.authentication = {};
      }

      const newProvider = createProvider(
        formData.type,
        formData.name,
        formData.exchanges,
        config
      );

      // Update priority if manually set
      if (formData.priority !== undefined) {
        updateProvider(newProvider.id, { priority: formData.priority });
      }
      
      // Показываем уведомление через notification store
      showSuccess(
        `Provider "${newProvider.name}" successfully created!`,
        'New data provider has been added to the system'
      );
      
      // Clear form
      setFormData({
        type: 'ccxt-server',
        name: '',
        exchanges: [],
        timeout: 30000
      });
      
    } catch (error) {
      // Показываем ошибку через notification store
      showError(
        'Error creating provider',
        error instanceof Error ? error.message : 'Unknown error'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid = validateForm(formData);
  const isEditFormValid = editFormData ? validateForm(editFormData) : false;

  const renderExchangeSelection = (data: NewProviderFormData, onChange: typeof handleFormChange, isEdit = false) => (
    <div className="space-y-2">
      <Label>Supported Exchanges</Label>
      
      {/* Universal Provider Button */}
      <div className="flex gap-2 mb-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => addAllExchanges(isEdit)}
          disabled={data.exchanges.includes('*')}
        >
          ⭐ All Exchanges (Universal)
        </Button>
      </div>

      {/* Common Exchanges */}
      <div className="grid grid-cols-3 gap-2">
        {COMMON_EXCHANGES.map(exchange => (
          <Button
            key={exchange}
            type="button"
            size="sm"
            variant={data.exchanges.includes(exchange) ? "default" : "outline"}
            onClick={() => data.exchanges.includes(exchange) 
              ? removeExchange(exchange, isEdit) 
              : addExchange(exchange, isEdit)
            }
            disabled={data.exchanges.includes('*')}
            className="text-xs"
          >
            {exchange}
          </Button>
        ))}
      </div>

      {/* Custom Exchange */}
      <div className="flex gap-2">
        <Input
          placeholder="Custom exchange"
          value={customExchange}
          onChange={(e) => setCustomExchange(e.target.value)}
          disabled={data.exchanges.includes('*')}
          onKeyPress={(e) => e.key === 'Enter' && addCustomExchange(isEdit)}
        />
        <Button
          type="button"
          size="sm"
          onClick={() => addCustomExchange(isEdit)}
          disabled={!customExchange.trim() || data.exchanges.includes('*')}
        >
          Add
        </Button>
      </div>

      {/* Selected Exchanges */}
      <div className="flex flex-wrap gap-1">
        {data.exchanges.map(exchange => (
          <Badge key={exchange} variant="secondary" className="text-xs">
            {exchange === '*' ? '⭐ All Exchanges' : exchange}
            <X 
              className="h-3 w-3 ml-1 cursor-pointer" 
              onClick={() => removeExchange(exchange, isEdit)}
            />
          </Badge>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="text-xs text-muted-foreground">
        🔑 API keys are automatically taken from your active user accounts
      </div>

      <div className="space-y-4">
        {/* Provider type selection */}
          <div className="space-y-2">
            <Label>Provider Type</Label>
            <Select
              value={formData.type}
              onValueChange={(value: 'ccxt-server' | 'marketmaker.cc' | 'custom-server-with-adapter') => handleFormChange('type', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ccxt-server">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-medium">CCXT Server</span>
                    <span className="text-xs text-green-600 dark:text-green-400">Implemented</span>
                  </div>
                </SelectItem>

                <SelectItem value="marketmaker.cc" disabled>
                  <div className="flex flex-col gap-0.5">
                    <span className="font-medium text-muted-foreground">MarketMaker.cc</span>
                    <span className="text-xs text-red-500 dark:text-red-400">Not Implemented</span>
                  </div>
                </SelectItem>
                <SelectItem value="custom-server-with-adapter" disabled>
                  <div className="flex flex-col gap-0.5">
                    <span className="font-medium text-muted-foreground">Custom Server with Adapter</span>
                    <span className="text-xs text-red-500 dark:text-red-400">Not Implemented</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Provider Name */}
          <div className="space-y-2">
            <Label htmlFor="provider-name">Provider Name</Label>
            <Input
              id="provider-name"
              value={formData.name}
              onChange={(e) => handleFormChange('name', e.target.value)}
              placeholder="e.g., Main Trading Provider"
            />
          </div>

          {/* Exchanges Selection */}
          {renderExchangeSelection(formData, handleFormChange)}

          {/* Manual Priority */}
          <div className="space-y-2">
            <Label htmlFor="priority">Priority (optional)</Label>
            <Input
              id="priority"
              type="number"
              value={formData.priority || ''}
              onChange={(e) => handleFormChange('priority', e.target.value ? parseInt(e.target.value) : undefined)}
              placeholder="Auto-assigned if empty"
              min={1}
              max={1000}
            />
            <p className="text-xs text-muted-foreground">Lower number = higher priority</p>
          </div>

          {/* CCXT Server specific fields */}
          {formData.type === 'ccxt-server' && (
            <div className="space-y-4 border-t pt-4">
              <div className="space-y-2">
                <Label htmlFor="server-url">Server URL</Label>
                <Input
                  id="server-url"
                  value={formData.serverUrl || ''}
                  onChange={(e) => handleFormChange('serverUrl', e.target.value)}
                  placeholder="http://localhost:3001"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="token">Authentication Token</Label>
                <Input
                  id="token"
                  type="password"
                  value={formData.token || ''}
                  onChange={(e) => handleFormChange('token', e.target.value)}
                  placeholder="your-secret-token"
                />
                <p className="text-xs text-muted-foreground">Token for server authentication</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="timeout">Timeout (ms)</Label>
                <Input
                  id="timeout"
                  type="number"
                  value={formData.timeout || 30000}
                  onChange={(e) => handleFormChange('timeout', parseInt(e.target.value) || 30000)}
                  min={1000}
                  max={60000}
                />
              </div>
            </div>
          )}



        {/* Submit Button */}
        <Button
          onClick={handleSubmit}
          disabled={!isFormValid || isSubmitting}
          className="w-full flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          {isSubmitting ? 'Creating Provider...' : 'Create Provider'}
        </Button>
      </div>

      {/* Existing Providers */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium">Existing Providers</h3>
          <div className="space-y-3">
            {Object.values(providers).map(provider => (
              <div key={provider.id}>
                {editingProviderId === provider.id && editFormData ? (
                  // Edit Mode
                  <div className="border border-blue-200 dark:border-blue-800 rounded-lg p-4 bg-blue-50 dark:bg-blue-950/50">
                    <div className="space-y-4">
                      {/* Edit Name */}
                      <div className="space-y-2">
                        <Label>Provider Name</Label>
                        <Input
                          value={editFormData.name}
                          onChange={(e) => handleEditFormChange('name', e.target.value)}
                          placeholder="Provider name"
                        />
                      </div>

                      {/* Edit Exchanges */}
                      {renderExchangeSelection(editFormData, handleEditFormChange, true)}

                      {/* Edit Priority */}
                      <div className="space-y-2">
                        <Label>Priority</Label>
                        <Input
                          type="number"
                          value={editFormData.priority || ''}
                          onChange={(e) => handleEditFormChange('priority', e.target.value ? parseInt(e.target.value) : undefined)}
                          placeholder="Priority number"
                          min={1}
                          max={1000}
                        />
                      </div>

                      {/* CCXT Server fields for editing */}
                      {editFormData.type === 'ccxt-server' && (
                        <div className="space-y-4 border-t pt-4">
                          <div className="space-y-2">
                            <Label>Server URL</Label>
                            <Input
                              value={editFormData.serverUrl || ''}
                              onChange={(e) => handleEditFormChange('serverUrl', e.target.value)}
                              placeholder="http://localhost:3001"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Authentication Token</Label>
                            <Input
                              type="password"
                              value={editFormData.token || ''}
                              onChange={(e) => handleEditFormChange('token', e.target.value)}
                              placeholder="your-secret-token"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Timeout (ms)</Label>
                            <Input
                              type="number"
                              value={editFormData.timeout || 30000}
                              onChange={(e) => handleEditFormChange('timeout', parseInt(e.target.value) || 30000)}
                              min={1000}
                              max={60000}
                            />
                          </div>
                        </div>
                      )}

                      {/* Edit Actions */}
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={saveEdit}
                          disabled={!isEditFormValid || isSubmitting}
                          className="flex items-center gap-1"
                        >
                          <Save className="h-3 w-3" />
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={cancelEdit}
                        >
                          <X className="h-3 w-3" />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  // View Mode
                  <div className="flex items-center justify-between p-3 bg-muted/50 dark:bg-muted/20 rounded-lg border border-border">
                    <div className="flex flex-col">
                      <span className="font-medium text-sm">{provider.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {provider.type} • {provider.exchanges.join(', ')} • Priority: {provider.priority}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={provider.status === 'connected' ? 'default' : 'secondary'}>
                        {provider.status}
                      </Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => startEdit(provider)}
                        className="h-7 w-7 p-0"
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(provider.id, provider.name)}
                        className="h-7 w-7 p-0 text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {Object.keys(providers).length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No providers created yet
              </p>
            )}
          </div>
        </div>
    </div>
  );
};

export const DataProviderSetupWidget: React.FC = () => {
  return (
    <ErrorBoundary fallbackTitle="Data Provider Setup Widget Error" showDetails={false}>
      <DataProviderSetupWidgetInner />
    </ErrorBoundary>
  );
}; 