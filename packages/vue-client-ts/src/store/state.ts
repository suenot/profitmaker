// import { observable, action, reaction, computed } from 'mobx'
// import { version, AsyncTrunk } from 'mobx-sync'
import _ from 'lodash'
import { Block, Channel } from '@/types'
// import uuidv1 from 'uuid/v1'
// import axios from 'axios'

class BaseState {
  blocks: Block = {
    Selector: require('@/components/core/selector/config.ts').default[0],
    Orders: require('@/components/core/orders/config.ts').default[0],
    Trades: require('@/components/core/trades/config.ts').default[0],
    Candles: require('@/components/core/candles/config.ts').default[0]
    // MyTrades: require('@/core_components/MyTrades/config.js').default[0],
    // OpenOrders: require('@/core_components/OpenOrders/config.js').default[0],
    // BalanceTable: require('@/core_components/Balance/config.js').default[0],
    // BalanceTableStock: require('@/core_components/Balance/config.js').default[1],
    // BalancePie: require('@/core_components/Balance/config.js').default[2],
    // BalancePieStock: require('@/core_components/Balance/config.js').default[3],
    // BalanceHistory: require('@/core_components/Balance/config.js').default[4],
    // BalanceHistoryStock: require('@/core_components/Balance/config.js').default[5]
  }

  // @action setBlockData (name, param, value) {
  //   this.blocks[name][param] = value
  //   this.blocksTrigger = !this.blocksTrigger
  // }
  // blocksTrigger = false
  //
  background = '#000' // TODO
  color = '#fff' // TODO
  //
  readonly stock: string = 'BINANCE'
  channels: Channel[] = ['kupi']
  pair: string = 'ETH_BTC'
  accountId = undefined
  accountName = undefined
  serverBackend: string = 'https://kupi.network/api'
  signalHistoryUrl = 'https://kupi.network/api/signals-history'
  signalDetailsUrl = 'https://kupi.network/api/signals-details'
  //
  // @action setStock (stock) {
  //   this.stock = stock.name
  //   this.channels = stock.channels
  //   this.accountId = stock.accountId
  //   this.accountName = stock.accountName
  // }
  //
  // @action setPair (pair) {
  //   this.pair = pair
  // }
  //
  // @action setAccountId (accountId) {
  //   this.accountId = accountId
  // }
  //
  // @action setSignalHistoryUrl (url) {
  //   this.signalHistoryUrl = url
  // }
  //
  // @action setSignalDetailsUrl (url) {
  //   this.signalDetailsUrl = url
  // }
  //
  // // Deals
  // @observable deals = []
  // @observable deal = []
  //
  // @action addMyTradeToDeal (trade) {
  //   console.log(trade)
  //   this.deal.push(trade)
  // }
}

export default new BaseState()
