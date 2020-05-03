import axios from 'axios'
import {CoinState, RootState} from '@/types'
import {Module} from 'vuex'

export default {
  namespaced: true,
  state: {
    context: '',
    state: '',
    coins: {},
    hash: '',
  },
  mutations: {
    setCoins (state, obj: object) {
      state.coins = obj
    },
    setHash (state, hash: string) {
      state.hash = hash
    }
  },
  actions: {
    fetchCoins ({state, commit, rootState}) {
      axios.get(`${rootState.app.serverBackend}/coinmarketcap`)
        .then((response) => {
          if (state.hash === JSON.stringify(response.data)) return true
          commit('setHash', JSON.stringify(response.data))
          commit('setCoins', response.data)
        })
        .catch(err => {
          console.error(err)
          commit('setCoins', {})
        })
    }
  }
} as Module<CoinState, RootState>
