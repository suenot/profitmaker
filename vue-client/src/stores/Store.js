import { observable, action, reaction, computed } from 'mobx'
import { version, AsyncTrunk } from 'mobx-sync'
import _ from 'lodash'
// import uuidv1 from 'uuid/v1'
// import axios from 'axios'


@version(3)
class Store {
  constructor() {
    const trunk = new AsyncTrunk(this, { storage: localStorage, storageKey: 'store' })
    trunk.init().then(() => {
      if ( _.isEmpty(this.blocks) ) {
        this.blocks = {
          Orders: require('@/core_components/Orders/config.js').default,
          Trades: require('@/core_components/Trades/config.js').default,
          Candles: require('@/core_components/Candles/config.js').default,
          ReactStockcharts: require('@/react_components/ReactStockcharts/config.js').default,
          MyTrades: require('@/core_components/MyTrades/config.js').default,
          OpenOrders: require('@/core_components/OpenOrders/config.js').default,
          BalanceTable: require('@/core_components/Balance/config.js').default[0],
          BalancePie: require('@/core_components/Balance/config.js').default[1],
          BalanceHistory: require('@/core_components/Balance/config.js').default[2],
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
  @observable pair = 'ETH_BTC'
  @observable accountId = undefined
  @observable accountName = undefined
  @observable serverBackend = 'https://kupi.network/api' // TODO

  @action setStock(stock) {
    this.stock = stock.name
    this.accountId = stock.accountId
    this.accountName = stock.accountName
  }

  @action setPair(pair) {
    this.pair = pair
  }

  @action setAccountId(accountId) {
    this.accountId = accountId
  }
}

const store = window.Store = new Store()


export default store
