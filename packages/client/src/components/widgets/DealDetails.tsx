import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { ArrowLeft, Package, Trash2 } from 'lucide-react';
import { Deal, DealTrade } from '../../types/deals';
import MyTradesWidget from './MyTradesWidget';

interface DealDetailsProps {
  deal: Deal;
  onBack: () => void;
  onUpdateDeal: (updatedDeal: Deal) => void;
  onDeleteTrade: (trade: DealTrade) => void;
  onAddTrades: (trades: any[]) => void;
}

const DealDetails: React.FC<DealDetailsProps> = ({
  deal,
  onBack,
  onUpdateDeal,
  onDeleteTrade,
  onAddTrades
}) => {
  const [showMyTrades, setShowMyTrades] = useState(false);
  const [localDeal, setLocalDeal] = useState<Deal>(deal);

  const changeDealParam = (key: keyof Deal, value: string | number) => {
    const updatedDeal = { ...localDeal, [key]: value };
    setLocalDeal(updatedDeal);
    onUpdateDeal(updatedDeal);
  };

  const removeTradeFromDeal = (trade: DealTrade) => {
    const updatedDeal = {
      ...localDeal,
      trades: localDeal.trades.filter(t => t.uuid !== trade.uuid)
    };
    
    // Recalculate deal statistics
    const recalculatedDeal = recalculateDealStats(updatedDeal);
    setLocalDeal(recalculatedDeal);
    onUpdateDeal(recalculatedDeal);
    onDeleteTrade(trade);
  };

  const addTradesToDeal = (selectedTrades: any[]) => {
    const newTrades = selectedTrades.map(trade => ({
      uuid: trade.id,
      // Use the real exchange order id; fall back to the trade id (deterministic,
      // not a random label).
      order: trade.order ?? trade.id,
      datetime: trade.datetime,
      stock: trade.stock,
      symbol: trade.symbol,
      type: trade.type,
      side: trade.side,
      price: trade.price,
      amount: trade.amount,
      fee: trade.fee
    }));

    const updatedDeal = {
      ...localDeal,
      trades: [...localDeal.trades, ...newTrades]
    };

    // Recalculate deal statistics
    const recalculatedDeal = recalculateDealStats(updatedDeal);
    setLocalDeal(recalculatedDeal);
    onUpdateDeal(recalculatedDeal);
    onAddTrades(selectedTrades);
    setShowMyTrades(false);
  };

  const recalculateDealStats = (dealToUpdate: Deal): Deal => {
    const buyTrades = dealToUpdate.trades.filter(t => t.side === 'buy');
    const sellTrades = dealToUpdate.trades.filter(t => t.side === 'sell');
    
    const credited = sellTrades.reduce((sum, trade) => sum + (trade.price * trade.amount), 0);
    const debited = buyTrades.reduce((sum, trade) => sum + (trade.price * trade.amount), 0);
    const total = credited - debited;
    
    const stocks = new Set(dealToUpdate.trades.map(t => t.stock)).size;
    const pairs = new Set(dealToUpdate.trades.map(t => t.symbol)).size;
    const coins = dealToUpdate.trades.reduce((sum, trade) => sum + trade.amount, 0);

    return {
      ...dealToUpdate,
      credited,
      debited,
      total,
      credited_trades: sellTrades.length,
      debited_trades: buyTrades.length,
      total_trades: dealToUpdate.trades.length,
      stocks,
      pairs,
      coins
    };
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 8
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-US').format(value);
  };

  if (showMyTrades) {
    return (
      <MyTradesWidget 
        selectionMode={true}
        onBack={() => setShowMyTrades(false)}
        onTradesSelected={addTradesToDeal}
      />
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={onBack}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <span className="font-medium">Deal Details</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowMyTrades(true)}
          className="gap-2"
        >
          <Package className="h-4 w-4" />
          Add Trades
        </Button>
      </div>
      <div className="flex-1 p-3 overflow-auto">
        {/* Deal Info Form */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          <div className="lg:col-span-1">
            <label className="text-sm font-medium mb-1 block">Deal Name</label>
            <Input
              placeholder="Deal name"
              value={localDeal.name}
              onChange={(e) => changeDealParam('name', e.target.value)}
            />
          </div>
          <div className="lg:col-span-2">
            <label className="text-sm font-medium mb-1 block">Note</label>
            <Textarea
              placeholder="Deal note"
              value={localDeal.note || ''}
              onChange={(e) => changeDealParam('note', e.target.value)}
              rows={2}
            />
          </div>
        </div>

        {/* Deal Summary */}
        <div className="grid grid-cols-2 lg:grid-cols-7 gap-4 mb-6 p-4 bg-muted/50 rounded-lg">
          <div className="text-center">
            <div className="text-sm text-muted-foreground">Stocks</div>
            <div className="font-medium">{formatNumber(localDeal.stocks)}</div>
          </div>
          <div className="text-center">
            <div className="text-sm text-muted-foreground">Pairs</div>
            <div className="font-medium">{formatNumber(localDeal.pairs)}</div>
          </div>
          <div className="text-center">
            <div className="text-sm text-muted-foreground">Coins</div>
            <div className="font-medium">{formatNumber(localDeal.coins)}</div>
          </div>
          <div className="text-center">
            <div className="text-sm text-muted-foreground">Credited</div>
            <div className="font-medium text-green-400">
              {formatCurrency(localDeal.credited)}
              <div className="text-xs">({localDeal.credited_trades} trades)</div>
            </div>
          </div>
          <div className="text-center">
            <div className="text-sm text-muted-foreground">Debited</div>
            <div className="font-medium text-red-400">
              {formatCurrency(localDeal.debited)}
              <div className="text-xs">({localDeal.debited_trades} trades)</div>
            </div>
          </div>
          <div className="text-center">
            <div className="text-sm text-muted-foreground">Total</div>
            <div className={`font-medium ${localDeal.total >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {formatCurrency(localDeal.total)}
              <div className="text-xs">({localDeal.total_trades} trades)</div>
            </div>
          </div>
          <div className="text-center">
            <div className="text-sm text-muted-foreground">Time</div>
            <div className="text-xs">
              <div>{localDeal.timestamp_open}</div>
              <div>{localDeal.timestamp_closed}</div>
              <div className="text-muted-foreground">({localDeal.duration})</div>
            </div>
          </div>
        </div>

        {/* Trades Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order ID</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Pair</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Side</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Fee</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {localDeal.trades.map((trade) => (
                <TableRow 
                  key={trade.uuid}
                  className={trade.side === 'buy' ? 'bg-green-500/10' : 'bg-red-500/10'}
                >
                  <TableCell className="font-medium">{trade.order}</TableCell>
                  <TableCell className="text-xs">{trade.datetime}</TableCell>
                  <TableCell>{trade.stock}</TableCell>
                  <TableCell>{trade.symbol}</TableCell>
                  <TableCell className="text-xs">{trade.type}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      trade.side === 'buy' 
                        ? 'bg-green-500/20 text-green-400' 
                        : 'bg-red-500/20 text-red-400'
                    }`}>
                      {trade.side.toUpperCase()}
                    </span>
                  </TableCell>
                  <TableCell>{formatCurrency(trade.price)}</TableCell>
                  <TableCell>{formatNumber(trade.amount)}</TableCell>
                  <TableCell>{formatCurrency(trade.price * trade.amount)}</TableCell>
                  <TableCell>{formatCurrency(trade.fee)}</TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7 hover:bg-destructive hover:text-destructive-foreground"
                      onClick={() => removeTradeFromDeal(trade)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Empty State for Trades */}
        {localDeal.trades.length === 0 && (
          <div className="text-center py-12 border rounded-lg">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No trades in this deal</h3>
            <p className="text-muted-foreground mb-4">Add trades to track deal performance</p>
            <Button onClick={() => setShowMyTrades(true)} className="gap-2">
              <Package className="h-4 w-4" />
              Add Trades
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default DealDetails; 