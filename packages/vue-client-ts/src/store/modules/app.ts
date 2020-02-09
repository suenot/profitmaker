import {AppState, Channel, RootState, Stock} from '@/types'
import {Module} from 'vuex'
import axios from 'axios'

export default {
  namespaced: true,
  state: {
    blocks: {
      Selector: require('@/components/core/selector/config.ts').default[0],
      Orders: require('@/components/core/orders/config.ts').default[0],
      Trades: require('@/components/core/trades/config.ts').default[0],
      Candles: require('@/components/core/candles/config.ts').default[0],
      MyTrades: require('@/components/core/myTrades/config.ts').default[0],
      OpenOrders: require('@/components/core/openOrders/config.ts').default[0],
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
    deal: [],
    timeframe: '5m',
    candles: [],
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
    setPair ({commit}, pair: string) {
      commit('update', {
        pair
      })
    },
    setAccountId ({commit}, accountId: string) {
      commit('update', {
        accountId
      })
    },
    setSignalHistoryUrl ({commit}, url: string) {
      commit('update', {
        signalHistoryUrl: url
      })
    },
    setSignalDetailsUrl ({commit}, url: string) {
      commit('update', {
        signalDetailsUrl: url
      })
    },
    addMyTradeToDeal ({state, commit}, trade: any) {
      commit('update', {
        deal: [state.deal, trade]
      })
    },
    async fetchCandles ({state, commit}) {
      const {stock, serverBackend, pair, timeframe} = state
      const stockLowerCase = stock.toLowerCase()
      // eslint-disable-next-line
      const url = `${serverBackend}/${stockLowerCase}/candles/${pair}/${timeframe}`
      // '/user-api/ccxt/${stockLowerCase}/candles/${pair}/${timeframe}'
      const data = await axios.get(url)
        .then((response) => response.data)
      const candles = data.map((data: number[]) => {
        const [date, open, high, low, close, volume] = data
        return {
          date: new Date(date),
          open,
          high,
          low,
          close,
          volume,
          absoluteChange: '',
          dividend: '',
          percentChange: '',
          split: ''
        }
      })
      console.log(candles)
      commit('update', {
        candles
      })
      return data
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
