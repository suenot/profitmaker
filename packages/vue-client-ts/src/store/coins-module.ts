import axios from 'axios'
import state from './state'
import { Action, Module, VuexModule } from 'vuex-module-decorators'

@Module({
  namespaced: true
})
export default class CoinsModule extends VuexModule {
  coins = {}

  hash = ''

  get serverBackend () {
    return state.serverBackend
  }

  @Action
  fetchCoins () {
    axios.get(`${this.serverBackend}/coinmarketcap`)
      .then((response) => {
        if (this.hash === JSON.stringify(response.data)) return true
        this.hash = JSON.stringify(response.data)
        this.coins = response.data
      })
      .catch(err => {
        console.error(err)
        this.coins = {}
      })
  }
}
