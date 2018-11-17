import { observable, action, computed } from 'mobx'
import axios from 'axios'
import _ from 'lodash'
import DashboardsStore from './DashboardsStore'
import SettingsStore from './SettingsStore'

class BalanceStore {
  constructor() {
    // const fetchBalanceStock = () => {
    //   this.fetchBalance(this.stock)
    //   this.available()
    // }
    // if (this.balanceTotal_counter > 0 && (SettingsStore.fetchEnabled.value)) this.fetchBalance('TOTAL')
    // if (this.balanceStock_counter > 0 && (SettingsStore.fetchEnabled.value)) fetchBalanceStock()
    // if (this.balanceHistoryTotal_counter > 0 && (SettingsStore.fetchEnabled.value)) this.fetchBalanceHistory('TOTAL')
    // if (this.balanceHistoryStock_counter > 0 && (SettingsStore.fetchEnabled.value)) this.fetchBalanceHistory(this.stock)
    // setInterval(() => {
    //   if (this.balanceTotal_counter > 0 && (SettingsStore.fetchEnabled.value)) this.fetchBalance('TOTAL')
    //   if (this.balanceStock_counter > 0 && (SettingsStore.fetchEnabled.value)) fetchBalanceStock()
    //   if (this.balanceHistoryTotal_counter > 0 && (SettingsStore.fetchEnabled.value)) this.fetchBalanceHistory('TOTAL')
    //   if (this.balanceHistoryStock_counter > 0 && (SettingsStore.fetchEnabled.value)) this.fetchBalanceHistory(this.stock)
    // }, 5000)
    const start = () => {
      _.forEach(this.counters, (counter, key) => {
        if ( counter > 0 && (SettingsStore.fetchEnabled.value) ) {
          var [type, stock] = key.split('--')
          this.fetchBalance(stock, key, type)
        }
      })
    }
    start()
    setInterval(() => {
      start()
    }, 2000)
  }

  @computed get stock() {return DashboardsStore.stock }
  @computed get pair() {return DashboardsStore.pair }
  @computed get terminalBackend() {return SettingsStore.terminalBackend.value }

  // fetchBalanceStock_hash = ''
  // fetchBalanceTotal_hash = ''
  // fetchBalanceHistoryStock_hash = ''
  // fetchBalanceHistoryTotal_hash = ''
  hashes = {}

  @observable precision = 8
  balance = {}
  // @observable balanceTotal = {'totalBTC': 0, 'totalUSD': 0, 'datetime': 0, 'data': []}
  // @observable balanceStock = {'totalBTC': 0, 'totalUSD': 0, 'datetime': 0, 'data': []}
  // @observable balanceHistoryTotal = []
  // @observable balanceHistoryStock = []

  @observable availableBuy = 0
  @observable availableSell = 0

  @action available() {
    var current = this.pair.split('_')
    var availableBuy = _.find(this.balanceStock.data, {'shortName': current[1]})
    var availableSell = _.find(this.balanceStock.data, {'shortName': current[0]})

    this.availableBuy = availableBuy ? availableBuy.free : 0
    this.availableSell = availableSell ? availableSell.free : 0
  }

  @action fetchBalance(stock, key, type){
    axios.get(`${this.terminalBackend}/balance/${type}/${stock}`)
    .then(response => {
      if (this.hashes[key] === JSON.stringify(response.data)) return true
      this.hashes[key] = JSON.stringify(response.data)
      this.balance[key] = response.data
    })
    .catch(error => {
      this.balance[key] = {}
    })
  }

  // @action fetchBalanceHistory(stock, key){
  //   axios.get(`${this.terminalBackend}/balance/history/${type}/${stock}`)
  //   .then((response) => {
  //     if (this.hashes[key] === JSON.stringify(response.data)) return true
  //     this.hashes[key] = JSON.stringify(response.data)
  //     this.balance[key] = response.data
  //   })
  //   .catch((error) => {
  //     this.balance[key] = {}
  //   })
  // }

  // counters
  // balanceTotal_counter = 0
  // balanceStock_counter = 0
  // balanceHistoryTotal_counter = 0
  // balanceHistoryStock_counter = 0
  // @action count(counterName, n) {
  //   this[counterName] += n
  // }
  counters = {}
  @action count(n, data) {
    const {type, stock} = data
    var key = `${type}--${stock}`
    if (this.balance[key] === undefined) this.balance[key] = {}
    if (this.counters[key] === undefined) this.counters[key] = 0
    this.counters[key] += n
  }
}

const store = window.BalanceStore = new BalanceStore()

export default store
