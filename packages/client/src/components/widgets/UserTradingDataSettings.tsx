import React, { useMemo } from 'react';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { User } from 'lucide-react';
import { useUserStore } from '../../store/userStore';
import { UserTradingDataWidgetSettings } from '../../store/userTradingDataWidgetStore';

interface UserTradingDataSettingsProps {
  settings: UserTradingDataWidgetSettings;
  onShowZeroPositionsChange: (checked: boolean) => void;
  onShowClosedOrdersChange: (checked: boolean) => void;
  onTradesLimitChange: (limit: number) => void;
  onAccountChange: (accountId: string) => void;
}

const UserTradingDataSettings: React.FC<UserTradingDataSettingsProps> = ({
  settings,
  onShowZeroPositionsChange,
  onShowClosedOrdersChange,
  onTradesLimitChange,
  onAccountChange
}) => {
  // User store integration
  const { users, activeUserId } = useUserStore();
  const activeUser = users.find(u => u.id === activeUserId);
  
  // Central accounts: keys live server-side; list every account for the active
  // identity (no client-key gate).
  const accountsWithKeys = useMemo(() => {
    if (!activeUser?.accounts || !Array.isArray(activeUser.accounts)) {
      return [];
    }
    return activeUser.accounts.filter(acc => !!acc.id);
  }, [activeUser?.accounts]);
  const handleTradesLimitChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value >= 10 && value <= 1000) {
      onTradesLimitChange(value);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-terminal-text">Account Selection</h3>
        
        {/* Account Selector */}
        <div className="space-y-2">
          <Label className="text-sm text-terminal-text">Data Source</Label>
          <p className="text-xs text-terminal-muted">
            Choose which account(s) to display data for
          </p>
          <Select 
            value={settings.selectedAccountId || 'all'}
            onValueChange={onAccountChange}
          >
            <SelectTrigger className="w-full h-8 bg-terminal-bg border-terminal-border text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-terminal-widget border-terminal-border">
              <SelectItem value="all">
                <div className="flex items-center gap-2">
                  <User className="w-3 h-3" />
                  All Accounts ({accountsWithKeys.length})
                </div>
              </SelectItem>
              {accountsWithKeys.map((account) => (
                <SelectItem key={account.id} value={account.id}>
                  <div className="flex flex-col">
                    <span className="font-medium">{account.exchange}</span>
                    <span className="text-xs text-terminal-muted">{account.label || account.email || account.id.slice(0, 8)}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-medium text-terminal-text">Display Options</h3>
        
        {/* Show Zero Positions */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-sm text-terminal-text">Show Zero Positions</Label>
            <p className="text-xs text-terminal-muted">
              Display positions with zero amount
            </p>
          </div>
          <Switch
            checked={settings.showZeroPositions}
            onCheckedChange={onShowZeroPositionsChange}
          />
        </div>

        {/* Show Closed Orders */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-sm text-terminal-text">Show Closed Orders</Label>
            <p className="text-xs text-terminal-muted">
              Include closed and canceled orders
            </p>
          </div>
          <Switch
            checked={settings.showClosedOrders}
            onCheckedChange={onShowClosedOrdersChange}
          />
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-medium text-terminal-text">Data Limits</h3>
        
        {/* Trades Limit */}
        <div className="space-y-2">
          <Label className="text-sm text-terminal-text">Trades Limit</Label>
          <p className="text-xs text-terminal-muted">
            Maximum number of trades to fetch (10-1000)
          </p>
          <Input
            type="number"
            min="10"
            max="1000"
            step="10"
            value={settings.tradesLimit}
            onChange={handleTradesLimitChange}
            className="w-24 h-8 text-sm"
          />
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-medium text-terminal-text">Current Settings</h3>
        <div className="text-xs text-terminal-muted space-y-1">
          <p>Active Tab: <span className="text-terminal-text">{settings.activeTab}</span></p>
          <p>Selected Account: <span className="text-terminal-text">{settings.selectedAccountId === 'all' ? 'All Accounts' : 'Specific Account'}</span></p>
          <p>Zero Positions: <span className="text-terminal-text">{settings.showZeroPositions ? 'Yes' : 'No'}</span></p>
          <p>Closed Orders: <span className="text-terminal-text">{settings.showClosedOrders ? 'Yes' : 'No'}</span></p>
          <p>Trades Limit: <span className="text-terminal-text">{settings.tradesLimit}</span></p>
        </div>
      </div>
    </div>
  );
};

export default UserTradingDataSettings; 