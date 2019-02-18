import { observable, action } from 'mobx'
import uuidv1 from 'uuid/v1'

class CoinsStore {
  constructor() {
    fetchCoins()
    setInterval(() => {
      fetchCoins()
    }, 60000)
  }

  @observable coins = {}
  @observable hash = ''

  @action fetchCoins(){
    axios.get(`${this.serverBackend}/coinmarketcap`)
    .then((response) => {
      if (this.hash === JSON.stringify(response.data)) return true
      this.hash = JSON.stringify(response.data)
      this.coins = response.data
    })
    .catch(() => {
      this.coins = {}
    })
  }
}

const store = window.CoinsStore = new CoinsStore()
export default store
