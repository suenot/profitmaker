import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Plus, Info, Edit, Trash2, TrendingUp, Eye, RefreshCw } from 'lucide-react';
import { Deal } from '../../types/deals';

interface DealsListProps {
  deals: Deal[];
  onSelectDeal: (dealId: string) => void;
  onAddDeal: () => void;
  onEditDeal: (dealId: string) => void;
  onDeleteDeal: (dealId: string) => void;
  onSyncFromAccount?: () => void;
  syncing?: boolean;
}

const DealsList: React.FC<DealsListProps> = ({
  deals,
  onSelectDeal,
  onAddDeal,
  onEditDeal,
  onDeleteDeal,
  onSyncFromAccount,
  syncing
}) => {
  const [selectedNote, setSelectedNote] = useState<string | null>(null);
  const [noteContent, setNoteContent] = useState<string>('');

  const showNote = (deal: Deal) => {
    if (selectedNote === deal.id) {
      setSelectedNote(null);
      setNoteContent('');
    } else {
      setSelectedNote(deal.id);
      setNoteContent(deal.note || '');
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-US').format(value);
  };

  // Calculate summary statistics
  const totalProfit = deals.reduce((sum, deal) => sum + (deal.total > 0 ? deal.total : 0), 0);
  const totalLoss = deals.reduce((sum, deal) => sum + (deal.total < 0 ? Math.abs(deal.total) : 0), 0);
  const winningDeals = deals.filter(deal => deal.total > 0).length;
  const winRate = deals.length > 0 ? (winningDeals / deals.length) * 100 : 0;

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-3 border-b border-border">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          <span className="font-medium">Deals</span>
        </div>
        <div className="flex items-center gap-2">
          {onSyncFromAccount && (
            <Button
              onClick={onSyncFromAccount}
              size="sm"
              variant="outline"
              className="gap-2"
              disabled={syncing}
              title="Aggregate your trade history into deals"
            >
              <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing…' : 'Sync Trades'}
            </Button>
          )}
          <Button onClick={onAddDeal} size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            Add Deal
          </Button>
        </div>
      </div>
      <div className="flex-1 p-3 overflow-auto">
        {/* Summary Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 p-4 bg-muted/50 rounded-lg">
          <div className="text-center">
            <div className="text-sm text-muted-foreground">Total Deals</div>
            <div className="text-lg font-bold">{deals.length}</div>
          </div>
          <div className="text-center">
            <div className="text-sm text-muted-foreground">Win Rate</div>
            <div className="text-lg font-bold text-green-400">{winRate.toFixed(1)}%</div>
          </div>
          <div className="text-center">
            <div className="text-sm text-muted-foreground">Total Profit</div>
            <div className="text-lg font-bold text-green-400">+{formatCurrency(totalProfit)}</div>
          </div>
          <div className="text-center">
            <div className="text-sm text-muted-foreground">Total Loss</div>
            <div className="text-lg font-bold text-red-400">-{formatCurrency(totalLoss)}</div>
          </div>
        </div>

        {/* Note Display */}
        {noteContent && (
          <div className="mb-4 p-3 bg-muted/50 rounded-lg border border-border/50">
            <p className="text-sm text-muted-foreground">{noteContent}</p>
          </div>
        )}
        
        {/* Deals Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="text-center">Stocks</TableHead>
                <TableHead className="text-center">Coins</TableHead>
                <TableHead className="text-center">Pairs</TableHead>
                <TableHead className="text-center">Credited</TableHead>
                <TableHead className="text-center">Debited</TableHead>
                <TableHead className="text-center">Total</TableHead>
                <TableHead className="text-center">Time</TableHead>
                <TableHead className="text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deals.map((deal) => (
                <TableRow 
                  key={deal.id}
                  className="hover:bg-muted/50 cursor-pointer"
                  onClick={() => onSelectDeal(deal.id)}
                >
                  <TableCell className="font-medium">
                    <div className="flex flex-col">
                      <span>{deal.name || 'Unnamed Deal'}</span>
                      {deal.note && (
                        <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                          {deal.note}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    {formatNumber(deal.stocks)}
                  </TableCell>
                  <TableCell className="text-center">
                    {formatNumber(deal.coins)}
                  </TableCell>
                  <TableCell className="text-center">
                    {formatNumber(deal.pairs)}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="text-sm">
                      {formatCurrency(deal.credited)}
                      <div className="text-xs text-muted-foreground">
                        ({deal.credited_trades} trades)
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="text-sm">
                      {formatCurrency(deal.debited)}
                      <div className="text-xs text-muted-foreground">
                        ({deal.debited_trades} trades)
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className={`text-sm font-medium ${
                      deal.total >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {formatCurrency(deal.total)}
                      <div className="text-xs text-muted-foreground">
                        ({deal.total_trades} trades)
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="text-xs">
                      <div>{deal.timestamp_open}</div>
                      <div>{deal.timestamp_closed}</div>
                      <div className="text-muted-foreground">({deal.duration})</div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex justify-center gap-1">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectDeal(deal.id);
                        }}
                      >
                        <Eye className="h-3 w-3" />
                      </Button>
                      <Button
                        variant={selectedNote === deal.id ? "default" : "outline"}
                        size="icon"
                        className="h-7 w-7"
                        onClick={(e) => {
                          e.stopPropagation();
                          showNote(deal);
                        }}
                      >
                        <Info className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditDeal(deal.id);
                        }}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7 hover:bg-destructive hover:text-destructive-foreground"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteDeal(deal.id);
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Empty State */}
        {deals.length === 0 && (
          <div className="text-center py-12">
            <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No deals yet</h3>
            <p className="text-muted-foreground mb-4">Start tracking your trading deals</p>
            <Button onClick={onAddDeal} className="gap-2">
              <Plus className="h-4 w-4" />
              Create First Deal
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default DealsList; 