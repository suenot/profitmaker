import React from 'react';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Separator } from '../ui/separator';
import { Wallet, Table, PieChart, Eye, EyeOff } from 'lucide-react';
import { UserBalancesDisplayType } from '../../store/userBalancesWidgetStore';

interface UserBalancesSettingsProps {
  showTotal: boolean;
  hideSmallAmounts: boolean;
  displayType: UserBalancesDisplayType;
  smallAmountThreshold: number;
  onShowTotalChange: (value: boolean) => void;
  onHideSmallAmountsChange: (value: boolean) => void;
  onDisplayTypeChange: (value: UserBalancesDisplayType) => void;
  onSmallAmountThresholdChange: (value: number) => void;
}

const UserBalancesSettings: React.FC<UserBalancesSettingsProps> = ({
  showTotal,
  hideSmallAmounts,
  displayType,
  smallAmountThreshold,
  onShowTotalChange,
  onHideSmallAmountsChange,
  onDisplayTypeChange,
  onSmallAmountThresholdChange
}) => {
  return (
    <div className="space-y-6 text-terminal-text">
      {/* Display Settings */}
      <div className="space-y-4">
        <div>
          <Label className="text-sm font-medium text-terminal-text flex items-center gap-2">
            <Wallet className="w-4 h-4" />
            Display Settings
          </Label>
          <p className="text-xs text-terminal-muted">Configure how balances are displayed</p>
        </div>
        
        <div className="space-y-3">
          {/* Display Type */}
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <Label className="text-sm font-medium text-terminal-text">Display Type</Label>
              <p className="text-xs text-terminal-muted">Choose between table or pie chart view</p>
            </div>
            <Select value={displayType} onValueChange={onDisplayTypeChange}>
              <SelectTrigger className="w-32 bg-terminal-bg border-terminal-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="table">
                  <div className="flex items-center gap-2">
                    <Table className="w-4 h-4" />
                    Table
                  </div>
                </SelectItem>
                <SelectItem value="pie">
                  <div className="flex items-center gap-2">
                    <PieChart className="w-4 h-4" />
                    Pie Chart
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Show Total */}
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <Label className="text-sm font-medium text-terminal-text">Show Total</Label>
              <p className="text-xs text-terminal-muted">Display total portfolio value at bottom</p>
            </div>
            <Switch 
              checked={showTotal} 
              onCheckedChange={onShowTotalChange}
            />
          </div>
        </div>
      </div>

      <Separator className="border-terminal-border" />

      {/* Filtering Settings */}
      <div className="space-y-4">
        <div>
          <Label className="text-sm font-medium text-terminal-text flex items-center gap-2">
            {hideSmallAmounts ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            Filtering Settings
          </Label>
          <p className="text-xs text-terminal-muted">Control which balances to show or hide</p>
        </div>
        
        <div className="space-y-3">
          {/* Hide Small Amounts */}
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <Label className="text-sm font-medium text-terminal-text">Hide Small Amounts</Label>
              <p className="text-xs text-terminal-muted">Hide balances below threshold</p>
            </div>
            <Switch 
              checked={hideSmallAmounts} 
              onCheckedChange={onHideSmallAmountsChange}
            />
          </div>

          {/* Small Amount Threshold */}
          {hideSmallAmounts && (
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <Label className="text-sm font-medium text-terminal-text">Threshold (USD)</Label>
                <p className="text-xs text-terminal-muted">Hide balances below this USD value</p>
              </div>
              <div className="w-24">
                <Input
                  type="number"
                  min="0"
                  step="0.1"
                  value={smallAmountThreshold}
                  onChange={(e) => onSmallAmountThresholdChange(Math.max(0, parseFloat(e.target.value) || 0))}
                  aria-label="Small amount threshold in USD"
                  className="bg-terminal-bg border-terminal-border text-terminal-text text-right"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <Separator className="border-terminal-border" />

      {/* Preview Info */}
      <div className="space-y-2">
        <Label className="text-sm font-medium text-terminal-text">Current Settings</Label>
        <div className="text-xs text-terminal-muted space-y-1">
          <div>• Display: {displayType === 'table' ? 'Table View' : 'Pie Chart View'}</div>
          <div>• Total: {showTotal ? 'Shown' : 'Hidden'}</div>
          <div>• Small amounts: {hideSmallAmounts ? `Hidden (< $${smallAmountThreshold})` : 'Shown'}</div>
        </div>
      </div>
    </div>
  );
};

export default UserBalancesSettings;
