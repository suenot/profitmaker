import { observable, action, reaction, computed } from 'mobx'
import { version, AsyncTrunk } from 'mobx-sync'
// import _ from 'lodash'
// import uuidv1 from 'uuid/v1'
// import axios from 'axios'


@version(1)
class Store {
  constructor() {
    const trunk = new AsyncTrunk(this, { storage: localStorage, storageKey: 'store' })
    trunk.init().then(() => {})
  }
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
