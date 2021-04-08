import { observable, action, reaction, computed } from 'mobx'
import { version, AsyncTrunk } from 'mobx-sync'
import _ from 'lodash'
// import uuidv1 from 'uuid/v1'
// import axios from 'axios'


@version(8)
class Store {
  constructor() {
    const trunk = new AsyncTrunk(this, { storage: localStorage, storageKey: 'store' })
    trunk.init().then(() => {
      if ( _.isEmpty(this.blocks) ) {
        this.blocks = {
          Selector: require('@/core_components/Selector/config.js').default[0],
          Orders: require('@/core_components/Orders/config.js').default[0],
          Trades: require('@/core_components/Trades/config.js').default[0],
          Candles: require('@/core_components/Candles/config.js').default[0],
          MyTrades: require('@/core_components/MyTrades/config.js').default[0],
          OpenOrders: require('@/core_components/OpenOrders/config.js').default[0],
          BalanceTable: require('@/core_components/Balance/config.js').default[0],
          BalanceTableStock: require('@/core_components/Balance/config.js').default[1],
          BalancePie: require('@/core_components/Balance/config.js').default[2],
          BalancePieStock: require('@/core_components/Balance/config.js').default[3],
          BalanceHistory: require('@/core_components/Balance/config.js').default[4],
          BalanceHistoryStock: require('@/core_components/Balance/config.js').default[5],
        }
      }
    })
  }

  @observable blocks = {}

  @action setBlockData(name, param, value) {
    this.blocks[name][param] = value
    this.blocksTrigger = !this.blocksTrigger
  }
  @observable blocksTrigger = false

  @observable background = '#000' // TODO
  @observable color = '#fff' // TODO

  @observable stock = 'BINANCE'
  @observable channels = ['ccxt']
  @observable pair = 'ETH_BTC'
  @observable accountId = undefined
  @observable accountName = undefined
  @observable serverBackend = 'https://kupi.network/api' // TODO
  @observable signalHistoryUrl = 'https://kupi.network/api/signals-history'
  @observable signalDetailsUrl = 'https://kupi.network/api/signals-details'

  @action setStock(stock) {
    this.stock = stock.name
    this.channels = stock.channels
    this.accountId = stock.accountId
    this.accountName = stock.accountName
  }

  @action setPair(pair) {
    this.pair = pair
  }

  @action setAccountId(accountId) {
    this.accountId = accountId
  }

  @action setSignalHistoryUrl(url) {
    this.signalHistoryUrl = url
  }

  @action setSignalDetailsUrl(url) {
    this.signalDetailsUrl = url
  }

  // Deals
  @observable deals = []
  @observable deal = []

  @action addMyTradeToDeal(trade) {
    console.log(trade)
    this.deal.push(trade)
  }
}

const store = window.Store = new Store()


export default store
