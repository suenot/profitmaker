import React, { useState } from 'react';
import { Deal, DealsViewMode, DealTrade } from '../../types/deals';
import { useDealsStore } from '../../store/dealsStore';
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

  // Real, persisted deals (replaces the previous mock + local-useState).
  const deals = useDealsStore((s) => s.deals);
  const addDeal = useDealsStore((s) => s.addDeal);
  const updateDeal = useDealsStore((s) => s.updateDeal);
  const deleteDeal = useDealsStore((s) => s.deleteDeal);

  // NOTE (live data source, DEFERRED — task #5 §B): to auto-populate deals from
  // real trade history, call dataProviderStore.fetchMyTrades(accountId) and feed
  // the result into useDealsStore.getState().ingestTrades(trades). The store seam
  // is ready; wiring the account/credential selection here is gated on the
  // trading→accountId flow (the same MyTradesWidget picker is still mock too).

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
    />
  );
};

export default DealsWidget;
