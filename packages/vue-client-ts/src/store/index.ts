import Vue from 'vue'
import Vuex from 'vuex'
import state from '@/store/state'
import coin from '@/store/coins-module'

Vue.use(Vuex)

export default new Vuex.Store({
  state,
  mutations: {
  },
  actions: {
  },
  modules: {
    coin
  },
  strict: process.env.NODE_ENV !== 'production'
})
