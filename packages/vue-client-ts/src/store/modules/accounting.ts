import uuidv1 from 'uuid/v1'
import {Module} from 'vuex'
import {AccountingState, RootState} from '@/types'
import _ from 'lodash'

// constructor() {
//   const trunk = new AsyncTrunk(this, { storage: localStorage, storageKey: 'accounting' })
//   trunk.init()
//   reaction(
//     () => this.activeDeal_trades_length,
//     () => {
//       this.calculateStocks()
//       this.calculatePairs()
//       this.calculateCoins()
//       this.calculateCredited()
//       this.calculateDebited()
//       this.calculateTotal()
//       this.calculateTimestamps()
//     }
//   )
// }

export default {
  namespaced: true,
  state: {
    stock: '',
    trade: '',
    deal: '',
    deals: {
      test_id: {
        id: 'test_id',
        name: 'my best trade with DNT LIQUI-BINANCE',
        stocks: 'BINANCE, LIQUI, TIDEX',
        coins: 'DNT, BTC, ETH, BNB',
        pairs: 'DNT_BTC, DNT_ETH, DNT_BNB',
        debited: -500,
        debited_trades: 20,
        credited: 550,
        credited_trades: 2,
        total: 50,
        total_trades: 22,
        status: 'closed',
        timestamp_open: 1558117760918,
        timestamp_closed: 1558117760918,
        note: 'bla-bla',
        trades: []
      }
    },
    state: '',
    activeDeal: 'test_id'
  },
  mutations: {
    calculateStocks (state) {
      // const deal = state.deals[state.activeDeal]
      // deal.stocks = _.uniq(
      //   deal.trades.map((trade) => {
      //     return trade.stock
      //   })
      // )
    },
    calculatePairs (state) {
      // const deal = state.deals[state.activeDeal]
      // deal.pairs = _.uniq(
      //   deal.trades.map((trade) => {
      //     return trade.symbol
      //   })
      // )
    },
    calculateCoins (state) {
      // const pairs = state.deals[state.activeDeal].pairs
      // let coins = pairs.map((pair) => {
      //   return pair.split('/')
      // })
      // coins = _.flatten(coins)
      // coins = _.uniq(coins)
      // state.deals[state.activeDeal].coins = coins
    },
    calculateCredited (state) {
      // const deal = state.deals[state.activeDeal]
      // const credit =
      //   deal.trades.filter((trade) => {
      //     return trade.side === 'buy'
      //   }).map((trade) => {
      //     return trade.amount * trade.price + trade.fee
      //   })
      // deal.credited_trades = credit.length
      // deal.credited = _.sum(credit)
    },
    calculateDebited (state) {
      // const deal = state.deals[state.activeDeal]
      // const debit =
      //   deal.trades.filter((trade) => {
      //     return trade.side === 'sell'
      //   }).map((trade) => {
      //     return trade.amount * trade.price + trade.fee
      //   })
      // deal.debited_trades = debit.length
      // deal.debited = _.sum(debit)
    },
    calculateTotal () {
      // const deal = this.deals[this.activeDeal]
      // const total =
      //   deal.trades.map((trade) => {
      //     return (trade.side === 'buy' ? -1 : 1) * trade.amount * trade.price + trade.fee
      //   })
      // deal.total_trades = total.length
      // deal.total = _.sum(total)
    },
    calculateTimestamps (state) {
      // const deal = state.deals[state.activeDeal]
      // deal.timestamp_open = _.minBy(deal.trades, 'timestamp').timestamp
      // deal.timestamp_closed = _.maxBy(deal.trades, 'timestamp').timestamp
      // deal.timestamp_duration = deal.timestamp_closed - deal.timestamp_open
    },
    setActiveDeal (state, id: any) {
      state.activeDeal = id
    },
    addDeal (state) {
      const id = uuidv1()
      state.deals[id] = {
        id: id,
        name: '',
        stocks: '',
        coins: '',
        pairs: '',
        debited: 0,
        debited_trades: 0,
        credited: 0,
        credited_trades: 0,
        total: 0,
        total_trades: 0,
        status: '',
        timestamp_open: 0,
        timestamp_closed: 0,
        note: '',
        trades: []
      }
      return id
    },
    removeDeal (state, id: any) {
      delete state.deals[id]
    },
    addMyTradeToDeal (state, trade: any) {
      const deal = state.deals[state.activeDeal]
      // проходим по всем трейдам сделки и ищем трейд, по которому кликнули
      if (!_.isEmpty(deal.trades)) {
        for (let [i, _trade] of Object.entries(deal.trades)) {
          if (state.state.id === trade.id) {
            // если уже есть такой id, то тоглим его (удаляем)
            deal.trades.splice(i, 1)
            return false
          }
        }
      }
      const stock = {stock: state.stock}
      trade = {...state.trade, ...stock}
      trade.fee = trade.fee.cost
      state.deal.trades.push(trade)
    },
    removeMyTradeFromDeal (state, trade: any) {
      // const deal = state.deals[state.activeDeal]
      // for (let [i, _trade] of Object.entries(deal.trades)) {
      //   if (_trade.id === trade.id) {
      //     // если уже есть такой id, то тоглим его (удаляем)
      //     deal.trades.splice(i, 1)
      //     return false
      //   }
      // }
    },
    changeDealParam (state, payload: {key: string, value: string}) {
      // state.deals[state.activeDeal][key] = value
    }
  },
  actions: {},
  getters: {
    activeDealTradesLength: (state) => () => {
      try {
        return state.deals[state.activeDeal].trades.length
      } catch (err) {
        return 0
      }
    },
    deal: (state) => () => {
      return state.deals[state.activeDeal]
    }
  }
} as Module<AccountingState, RootState>
