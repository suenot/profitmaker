import {AppState, Channel, RootState, Stock} from '@/types'
import {Module} from 'vuex'

export default {
  namespaced: true,
  state: {
    blocks: {
      Selector: require('@/components/core/selector/config.ts').default[0],
      Orders: require('@/components/core/orders/config.ts').default[0],
      Trades: require('@/components/core/trades/config.ts').default[0],
      Candles: require('@/components/core/candles/config.ts').default[0],
      // MyTrades: require('@/core_components/MyTrades/config.js').default[0],
      // OpenOrders: require('@/core_components/OpenOrders/config.js').default[0],
      // BalanceTable: require('@/core_components/Balance/config.js').default[0],
      // BalanceTableStock: require('@/core_components/Balance/config.js').default[1],
      // BalancePie: require('@/core_components/Balance/config.js').default[2],
      // BalancePieStock: require('@/core_components/Balance/config.js').default[3],
      // BalanceHistory: require('@/core_components/Balance/config.js').default[4],
      // BalanceHistoryStock: require('@/core_components/Balance/config.js').default[5]
    },
    blocksTrigger: false,
    background: '#000', // TODO
    color: '#FFF', // TODO
    stock: 'BINANCE',
    channels: ['kupi'],
    pair: 'ETH_BTC',
    accountId: null,
    accountName: null,
    serverBackend: 'https://kupi.network/api',
    signalHistoryUrl: 'https://kupi.network/api/signals-history',
    signalDetailsUrl: 'https://kupi.network/api/signals-details',
    deals: [],
    deal: []
  },
  actions: {
    setStock ({commit}, stock: { name: Stock, channels: Channel[], accountId: string, accountName: string }) {
      commit('update', {
        stock: stock.name,
        channels: stock.channels,
        accountId: stock.accountId,
        accountName: stock.accountName,
      })
    },
    setPair ({commit}: any, pair: string) {
      commit('update', {
        pair
      })
    },
    setAccountId ({commit}: any, accountId: string) {
      commit('update', {
        accountId
      })
    },
    setSignalHistoryUrl ({commit}: any, url: string) {
      commit('update', {
        signalHistoryUrl: url
      })
    },
    setSignalDetailsUrl ({commit}: any, url: string) {
      commit('update', {
        signalDetailsUrl: url
      })
    },
    addMyTradeToDeal ({state, commit}: any, trade: any) {
      commit('update', {
        deal: [state.deal, trade]
      })
    },
    // setBlockData (name: string, param: any, value: any) {
    //   this.blocks[name][param] = value
    //   this.blocksTrigger = !this.blocksTrigger
    // }
  },
  mutations: {
    update (state: any, payload: any) {
      Object.assign(state, payload)
    },
  }
} as Module<AppState, RootState>
