import { observable, action, computed } from 'mobx'
import axios from 'axios'

import Store from './Store'

class CoinsStore {
  constructor() {
    this.fetchCoins()
    setInterval(() => {
      this.fetchCoins()
    }, 60000)
  }

  @computed get serverBackend() {return Store.serverBackend }

  @observable coins = {}
  @observable hash = ''

  @action fetchCoins(){
    axios.get(`${this.serverBackend}/coinmarketcap`)
    .then((response) => {
      if (this.hash === JSON.stringify(response.data)) return true
      this.hash = JSON.stringify(response.data)
      this.coins = response.data
    })
    .catch((err) => {
      this.coins = {}
    })
  }
}

const store = window.CoinsStore = new CoinsStore()
export default store
