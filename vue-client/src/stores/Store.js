import { observable, action, reaction, computed } from 'mobx'
// import { version, AsyncTrunk } from 'mobx-sync'
// import _ from 'lodash'
// import uuidv1 from 'uuid/v1'
// import axios from 'axios'


// @version(1)
class Store {
  @observable stock = 'BINANCE'
  @observable pair = 'ETH_BTC'
  @observable accountId = undefined
  @observable serverBackend = 'https://kupi.network/api'

  @action setStock(stock) {
    this.stock = stock
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
