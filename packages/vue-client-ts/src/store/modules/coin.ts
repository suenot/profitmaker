import axios from 'axios'
import {Action, Module, Mutation, VuexModule} from 'vuex-module-decorators'

@Module({namespaced: true, name: 'coin'})
export default class CoinModule extends VuexModule {
  context!: any
  state!: any

  coins: object = {}

  hash = ''

  @Mutation
  setCoins (obj: object) {
    this.coins = obj
  }

  @Mutation
  setHash (hash: string) {
    this.hash = hash
  }

  @Action
  async fetchCoins () {
    axios.get(`${this.state.serverBackend}/coinmarketcap`)
      .then((response) => {
        if (this.hash === JSON.stringify(response.data)) return true
        this.context.commit('setHash', JSON.stringify(response.data))
        this.context.commit('setCoins', response.data)
      })
      .catch(err => {
        console.error(err)
        this.context.commit('setCoins', {})
      })
  }
}
