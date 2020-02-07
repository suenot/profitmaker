import Vue from 'vue'
import Vuex from 'vuex'
import state from '@/store/state'
import Coin from '@/store/coins-module'
import Aside from '@/store/asides-module'
import Accounts from '@/store/accounts-module'

Vue.use(Vuex)

export default new Vuex.Store({
  state,
  mutations: {
  },
  actions: {
  },
  modules: {
    Coin, Aside, Accounts
  },
  strict: process.env.NODE_ENV !== 'production'
})
