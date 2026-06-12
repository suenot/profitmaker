import React, { useState, useEffect, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useDataProviderStore } from '../store/dataProviderStore';
import { moduleFetch } from '../modules/api';
import { ChevronDown, Server, Globe, Database } from 'lucide-react';

export const ExchangesWidget: React.FC = () => {
  const { providers, getEnabledProviders } = useDataProviderStore();
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(null);
  const [availableExchanges, setAvailableExchanges] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [isProviderDropdownOpen, setIsProviderDropdownOpen] = useState(false);

  // Ref for handling clicks outside
  const widgetRef = useRef<HTMLDivElement>(null);

  // Function to close all dropdowns
  const closeAllDropdowns = () => {
    setIsProviderDropdownOpen(false);
  };

  // Handle clicks outside to close all dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (widgetRef.current && !widgetRef.current.contains(event.target as Node)) {
        closeAllDropdowns();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const enabledProviders = getEnabledProviders();

  // Auto-select first provider if none selected
  useEffect(() => {
    if (!selectedProviderId && enabledProviders.length > 0) {
      setSelectedProviderId(enabledProviders[0].id);
    }
  }, [selectedProviderId, enabledProviders]);

  // Load exchanges when provider changes
  useEffect(() => {
    if (!selectedProviderId) return;

    const loadExchanges = async () => {
      setLoading(true);
      try {
        const provider = providers[selectedProviderId];
        if (!provider) return;

        let exchanges: string[] = [];

        switch (provider.type) {
          case 'ccxt-server': {
            // Get all CCXT exchanges from the server
            const response = await moduleFetch('/api/exchange/list');
            if (response.ok) {
              const result = await response.json();
              exchanges = ((result.data ?? result.exchanges ?? []) as string[]).sort();
            }
            break;
          }
          case 'custom':
          case 'custom-server-with-adapter':
          case 'marketmaker.cc':
          default:
            // Use provider's configured exchanges or default examples
            if (provider.exchanges.includes('*')) {
              // If universal provider, use common exchanges as example
              exchanges = ['binance', 'bybit', 'okx', 'kucoin', 'moex', 'spbex'];
            } else {
              exchanges = provider.exchanges.filter(ex => ex !== '*');
            }
            break;
        }

        setAvailableExchanges(exchanges);
      } catch (error) {
        console.error('Failed to load exchanges:', error);
        setAvailableExchanges([]);
      } finally {
        setLoading(false);
      }
    };

    loadExchanges();
  }, [selectedProviderId, providers]);

  const selectedProvider = selectedProviderId ? providers[selectedProviderId] : null;

  const getProviderIcon = (type: string) => {
    switch (type) {
      case 'ccxt-browser':
        return <Globe size={16} className="text-terminal-text/80" />;
      case 'ccxt-server':
        return <Server size={16} className="text-terminal-text/80" />;
      case 'stocksharp':
        return <Database size={16} className="text-terminal-text/80" />;
      default:
        return <Server size={16} className="text-terminal-text/60" />;
    }
  };

  return (
    <div ref={widgetRef} className="h-full flex flex-col space-y-4">
      {/* Provider Selection */}
      <div>
        <label className="block text-sm font-medium text-terminal-text mb-2">
          Select Provider
        </label>
        <div className="relative">
          <button
            onClick={() => {
              closeAllDropdowns();
              setIsProviderDropdownOpen(!isProviderDropdownOpen);
            }}
            className="w-full flex items-center justify-between px-3 py-2 bg-terminal-bg border border-terminal-border rounded text-sm focus:outline-none focus:border-terminal-accent"
          >
            <div className="flex items-center space-x-2">
              {selectedProvider && getProviderIcon(selectedProvider.type)}
              <span>{selectedProvider?.name || 'Select provider...'}</span>
            </div>
            <ChevronDown size={16} className="text-terminal-text/70" />
          </button>

          {isProviderDropdownOpen && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-terminal-widget border border-terminal-border rounded-md shadow-lg z-50 max-h-48 overflow-y-auto">
              {enabledProviders.map((provider) => (
                <button
                  key={provider.id}
                  onClick={() => {
                    setSelectedProviderId(provider.id);
                    setIsProviderDropdownOpen(false);
                  }}
                  className="w-full flex items-center space-x-2 px-3 py-2 hover:bg-terminal-accent/20 text-left text-sm"
                >
                  {getProviderIcon(provider.type)}
                  <div>
                    <div className="font-medium">{provider.name}</div>
                    <div className="text-xs text-terminal-muted">{provider.type}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Exchanges List */}
      <div className="flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-terminal-text">
            Available Exchanges
          </h3>
          <span className="text-xs text-terminal-muted">
            {availableExchanges.length} exchanges
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8 text-terminal-muted">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-terminal-accent"></div>
            <span className="ml-2 text-sm">Loading exchanges...</span>
          </div>
        ) : (
          <VirtualizedExchangesList exchanges={availableExchanges} />
        )}
      </div>

      {/* Provider Info */}
      {selectedProvider && (
        <div className="bg-terminal-widget/50 border border-terminal-border/50 rounded p-3">
          <div className="text-xs text-terminal-muted space-y-1">
            <div><strong>Provider:</strong> {selectedProvider.name}</div>
            <div><strong>Type:</strong> {selectedProvider.type}</div>
            <div><strong>Status:</strong> {selectedProvider.status}</div>
            <div><strong>Priority:</strong> {selectedProvider.priority}</div>
            {selectedProvider.exchanges.includes('*') ? (
              <div><strong>Scope:</strong> All exchanges</div>
            ) : (
              <div><strong>Scope:</strong> {selectedProvider.exchanges.length} specific exchanges</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Virtualized exchanges list component
const VirtualizedExchangesList: React.FC<{
  exchanges: string[];
}> = ({ exchanges }) => {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: exchanges.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 40, // Fixed height for each exchange item
    overscan: 10, // Render 10 extra items outside visible area
  });

  if (exchanges.length === 0) {
    return (
      <div className="flex-1 bg-terminal-bg border border-terminal-border rounded">
        <div className="p-4 text-center text-terminal-muted text-sm">
          No exchanges available
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-terminal-bg border border-terminal-border rounded overflow-hidden">
      <div
        ref={parentRef}
        className="h-full overflow-auto"
        style={{ contain: 'strict' }}
      >
        <div
          style={{
            height: virtualizer.getTotalSize(),
            width: '100%',
            position: 'relative',
          }}
        >
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const exchange = exchanges[virtualRow.index];
            
            return (
              <div
                key={virtualRow.key}
                data-index={virtualRow.index}
                ref={virtualizer.measureElement}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <div className="px-3 py-2 hover:bg-terminal-accent/10 transition-colors border-b border-terminal-border/50 last:border-b-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-terminal-text">{exchange}</span>
                    <span className="text-xs text-terminal-muted">#{virtualRow.index + 1}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}; 