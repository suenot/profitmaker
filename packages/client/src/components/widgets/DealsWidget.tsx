import React, { useState, useCallback } from 'react';
import { Deal, DealsViewMode, DealTrade } from '../../types/deals';
import { useDealsStore } from '../../store/dealsStore';
import { useUserStore } from '../../store/userStore';
import { useDataProviderStore } from '../../store/dataProviderStore';
import DealsList from './DealsList';
import DealDetails from './DealDetails';

interface DealsWidgetProps {
  dashboardId?: string;
  widgetId?: string;
  initialMode?: DealsViewMode;
  initialDealId?: string;
}

const DealsWidget: React.FC<DealsWidgetProps> = ({
  dashboardId = 'default',
  widgetId = 'deals-widget',
  initialMode = 'list',
  initialDealId
}) => {
  const [viewMode, setViewMode] = useState<DealsViewMode>(initialMode);
  const [selectedDealId, setSelectedDealId] = useState<string | null>(initialDealId || null);
  const [syncing, setSyncing] = useState(false);

  // Real, persisted deals (replaces the previous mock + local-useState).
  const deals = useDealsStore((s) => s.deals);
  const addDeal = useDealsStore((s) => s.addDeal);
  const updateDeal = useDealsStore((s) => s.updateDeal);
  const deleteDeal = useDealsStore((s) => s.deleteDeal);
  const ingestTrades = useDealsStore((s) => s.ingestTrades);

  // Live source: pull real trade history for the active user's accounts via the
  // accountId flow (fetchMyTrades routes through want='read') and aggregate it
  // into deals (group-by-symbol). The per-deal "Add Trades" picker (MyTradesWidget)
  // is the other live entry point.
  const { users, activeUserId } = useUserStore();
  const { fetchMyTrades } = useDataProviderStore();

  const handleSyncFromAccount = useCallback(async () => {
    const activeUser = users.find(u => u.id === activeUserId);
    const accounts = (activeUser?.accounts || []).filter(acc => acc.key && acc.privateKey);
    if (!accounts.length || syncing) return;

    setSyncing(true);
    try {
      for (const account of accounts) {
        try {
          const trades = await fetchMyTrades(account.id, undefined, undefined, 200);
          if (trades.length) ingestTrades(trades);
        } catch (err) {
          console.error(`Failed to sync trades for account ${account.id}:`, err);
        }
      }
    } finally {
      setSyncing(false);
    }
  }, [users, activeUserId, fetchMyTrades, ingestTrades, syncing]);

  const handleSelectDeal = (dealId: string) => {
    setSelectedDealId(dealId);
    setViewMode('details');
  };

  const handleBackToList = () => {
    setViewMode('list');
    setSelectedDealId(null);
  };

  const handleAddDeal = () => {
    const newDeal = addDeal({ name: 'New Deal' });
    setSelectedDealId(newDeal.id);
    setViewMode('details');
  };

  const handleEditDeal = (dealId: string) => {
    setSelectedDealId(dealId);
    setViewMode('details');
  };

  const handleDeleteDeal = (dealId: string) => {
    deleteDeal(dealId);
    if (selectedDealId === dealId) {
      handleBackToList();
    }
  };

  const handleUpdateDeal = (updatedDeal: Deal) => {
    updateDeal(updatedDeal);
  };

  // DealDetails already mutates the deal locally and persists via onUpdateDeal for
  // both trade removal and addition (it owns the per-deal edit UX). These callbacks
  // are notification hooks only — do NOT re-apply the change here or it double-counts.
  const handleDeleteTrade = (_trade: DealTrade) => {
    // no-op: persistence happens through handleUpdateDeal -> updateDeal
  };

  const handleAddTrades = (_trades: unknown[]) => {
    // no-op: persistence happens through handleUpdateDeal -> updateDeal
  };

  const selectedDeal = deals.find(deal => deal.id === selectedDealId);

  if (viewMode === 'details' && selectedDeal) {
    return (
      <DealDetails
        deal={selectedDeal}
        onBack={handleBackToList}
        onUpdateDeal={handleUpdateDeal}
        onDeleteTrade={handleDeleteTrade}
        onAddTrades={handleAddTrades}
      />
    );
  }

  return (
    <DealsList
      deals={deals}
      onSelectDeal={handleSelectDeal}
      onAddDeal={handleAddDeal}
      onEditDeal={handleEditDeal}
      onDeleteDeal={handleDeleteDeal}
      onSyncFromAccount={handleSyncFromAccount}
      syncing={syncing}
    />
  );
};

export default DealsWidget;
