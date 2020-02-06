import Vue from 'vue'
import Vuex from 'vuex'
import state from '@/store/state'
import Coin from '@/store/coins-module'

Vue.use(Vuex)

export default new Vuex.Store({
  state,
  mutations: {
  },
  actions: {
  },
  modules: {
    Coin
  },
  strict: process.env.NODE_ENV !== 'production'
})
