import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { Group, CreateGroupData, UpdateGroupData, GroupStoreState, GroupColors, GroupColor } from '../types/groups';
import { sync } from '@/services/syncBridge';

interface GroupStoreActions {
  // Group actions
  createGroup: (data: CreateGroupData) => Group; // for internal use only
  updateGroup: (id: string, data: UpdateGroupData) => void;
  deleteGroup: (id: string) => void;
  
  // Group selection
  selectGroup: (groupId: string | undefined) => void;
  
  // Data retrieval
  getGroupById: (id: string) => Group | undefined;
  getTransparentGroup: () => Group | undefined;
  setTradingPair: (groupId: string, tradingPair: string | undefined) => void;
  setAccount: (groupId: string, account: string | undefined) => void;
  setExchange: (groupId: string, exchange: string | undefined) => void;
  setMarket: (groupId: string, market: string | undefined) => void;
  resetGroup: (groupId: string) => void;
  
  // Test data initialization
  initializeDefaultGroups: () => void;
}

type GroupStore = GroupStoreState & GroupStoreActions;

export const useGroupStore = create<GroupStore>()(
  persist(
    (set, get) => ({
      // Initial state
      groups: [],
      selectedGroupId: undefined,
      
      // Create group
      createGroup: (data: CreateGroupData) => {
        const newGroup: Group = {
          ...data,
          id: uuidv4(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        
        set((state) => ({
          groups: [...state.groups, newGroup]
        }));

        sync.groupCreated(
          {
            name: newGroup.name, color: newGroup.color, tradingPair: newGroup.tradingPair,
            account: newGroup.account, exchange: newGroup.exchange, market: newGroup.market,
            description: newGroup.description,
          },
          newGroup.id,
        );

        return newGroup;
      },

      // Update group
      updateGroup: (id: string, data: UpdateGroupData) => {
        set((state) => ({
          groups: state.groups.map(group =>
            group.id === id
              ? { ...group, ...data, updatedAt: new Date().toISOString() }
              : group
          )
        }));

        sync.groupUpdated(id, data);
      },

      // Delete group
      deleteGroup: (id: string) => {
        const transparentGroup = get().getTransparentGroup();
        set((state) => ({
          groups: state.groups.filter(group => group.id !== id),
          selectedGroupId: state.selectedGroupId === id ? transparentGroup?.id : state.selectedGroupId
        }));

        sync.groupRemoved(id);
      },
      
      // Select group
      selectGroup: (groupId: string | undefined) => {
        set({ selectedGroupId: groupId });
      },
      
      // Get group by ID
      getGroupById: (id: string) => {
        return get().groups.find(group => group.id === id);
      },

      // Get transparent group (always exists)
      getTransparentGroup: () => {
        return get().groups.find(group => group.color === 'transparent');
      },
      
      // Set trading pair for group
      setTradingPair: (groupId: string, tradingPair: string | undefined) => {
        set((state) => ({
          groups: state.groups.map(group =>
            group.id === groupId
              ? { ...group, tradingPair, updatedAt: new Date().toISOString() }
              : group
          )
        }));
        sync.groupUpdated(groupId, { tradingPair });
      },

      // Set account for group
      setAccount: (groupId: string, account: string | undefined) => {
        set((state) => ({
          groups: state.groups.map(group =>
            group.id === groupId
              ? { ...group, account, updatedAt: new Date().toISOString() }
              : group
          )
        }));
        sync.groupUpdated(groupId, { account });
      },

      // Set exchange for group
      setExchange: (groupId: string, exchange: string | undefined) => {
        set((state) => ({
          groups: state.groups.map(group =>
            group.id === groupId
              ? { ...group, exchange, updatedAt: new Date().toISOString() }
              : group
          )
        }));
        sync.groupUpdated(groupId, { exchange });
      },

      // Set market for group
      setMarket: (groupId: string, market: string | undefined) => {
        set((state) => ({
          groups: state.groups.map(group =>
            group.id === groupId
              ? { ...group, market, updatedAt: new Date().toISOString() }
              : group
          )
        }));
        sync.groupUpdated(groupId, { market });
      },

      // Reset group settings
      resetGroup: (groupId: string) => {
        set((state) => ({
          groups: state.groups.map(group =>
            group.id === groupId
              ? {
                  ...group,
                  account: undefined,
                  exchange: undefined,
                  market: undefined,
                  tradingPair: undefined,
                  updatedAt: new Date().toISOString()
                }
              : group
          )
        }));
        sync.groupUpdated(groupId, { account: undefined, exchange: undefined, market: undefined, tradingPair: undefined });
      },
      
      // Initialize test data
      initializeDefaultGroups: () => {
        const { groups } = get();
        if (groups.length === 0) {
          const defaultGroups: CreateGroupData[] = [
            { 
              name: 'Transparent', 
              color: 'transparent',
              // Initialize transparent group with default instrument data
              account: 'suenot@gmail.com',
              exchange: 'binance',
              market: 'spot',
              tradingPair: 'BTC/USDT'
            }, // transparent group with default instrument
            { name: 'Cyan', color: '#00BCD4' },
            { name: 'Red', color: '#F44336' },
            { name: 'Purple', color: '#9C27B0' },
            { name: 'Blue', color: '#2196F3' },
            { name: 'Green', color: '#4CAF50' },
            { name: 'Orange', color: '#FF9800' },
            { name: 'Pink', color: '#E91E63' },
          ];
          
          defaultGroups.forEach(groupData => {
            get().createGroup(groupData);
          });
          
          // Set transparent group as selected by default
          const transparentGroup = get().getTransparentGroup();
          if (transparentGroup) {
            set({ selectedGroupId: transparentGroup.id });
            console.log(`🎯 [GroupStore] Initialized transparent group as selected:`, {
              id: transparentGroup.id,
              account: transparentGroup.account,
              exchange: transparentGroup.exchange,
              market: transparentGroup.market,
              tradingPair: transparentGroup.tradingPair
            });
          }
        }
      },
    }),
    {
      name: 'group-store',
      version: 2,
    }
  )
); 