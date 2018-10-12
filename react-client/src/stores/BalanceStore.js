import { observable, action, computed } from 'mobx'
import axios from 'axios'
import _ from 'lodash'
import DashboardsStore from './DashboardsStore'
import SettingsStore from './SettingsStore'

class BalanceStore {
  constructor() {
    const fetchBalanceStock = () => {
      this.fetchBalance(this.stock)
      this.available()
    }
    if (this.balanceTotal_counter > 0 && (SettingsStore.fetchEnabled.value === "true")) this.fetchBalance('TOTAL')
    if (this.balanceStock_counter > 0 && (SettingsStore.fetchEnabled.value === "true")) fetchBalanceStock()
    if (this.balanceHistoryTotal_counter > 0 && (SettingsStore.fetchEnabled.value === "true")) this.fetchBalanceHistory('TOTAL')
    if (this.balanceHistoryStock_counter > 0 && (SettingsStore.fetchEnabled.value === "true")) this.fetchBalanceHistory(this.stock)
    setInterval(() => {
      if (this.balanceTotal_counter > 0 && (SettingsStore.fetchEnabled.value === "true")) this.fetchBalance('TOTAL')
      if (this.balanceStock_counter > 0 && (SettingsStore.fetchEnabled.value === "true")) fetchBalanceStock()
      if (this.balanceHistoryTotal_counter > 0 && (SettingsStore.fetchEnabled.value === "true")) this.fetchBalanceHistory('TOTAL')
      if (this.balanceHistoryStock_counter > 0 && (SettingsStore.fetchEnabled.value === "true")) this.fetchBalanceHistory(this.stock)
    }, 5000)
  }

  @computed get stock() {return DashboardsStore.stock }
  @computed get pair() {return DashboardsStore.pair }
  @computed get terminalBackend() {return SettingsStore.terminalBackend.value }

  fetchBalanceStock_hash = ''
  fetchBalanceTotal_hash = ''
  fetchBalanceHistoryStock_hash = ''
  fetchBalanceHistoryTotal_hash = ''

  @observable precision = 8
  @observable balanceTotal = {'totalBTC': 0, 'totalUSD': 0, 'datetime': 0, 'data': []}
  @observable balanceStock = {'totalBTC': 0, 'totalUSD': 0, 'datetime': 0, 'data': []}
  @observable balanceHistoryTotal = []
  @observable balanceHistoryStock = []

  @observable availableBuy = 0
  @observable availableSell = 0

  @action available() {
    var current = this.pair.split('_')
    var availableBuy = _.find(this.balanceStock.data, {'shortName': current[1]})
    var availableSell = _.find(this.balanceStock.data, {'shortName': current[0]})

    this.availableBuy = availableBuy ? availableBuy.free : 0
    this.availableSell = availableSell ? availableSell.free : 0
  }

  @action fetchBalance(stock){
    axios.get(`${this.terminalBackend}/balance/${stock}`)
    .then(response => {
      if (stock === 'TOTAL') {
        if (this.fetchBalanceTotal_hash === JSON.stringify(response.data)) return true
        this.fetchBalanceTotal_hash = JSON.stringify(response.data)
        this.balanceTotal = response.data
      } else {
        if (this.fetchBalanceStock_hash === JSON.stringify(response.data)) return true
        this.fetchBalanceStock_hash = JSON.stringify(response.data)
        this.balanceStock = response.data
      }
    })
    .catch(error => {
      // console.log(error)
    })
  }

  @action fetchBalanceHistory(stock){
    axios.get(`${this.terminalBackend}/balance/history/${stock}`)
    .then((response) => {
      if (stock === 'TOTAL') {
        if (this.fetchBalanceHistoryTotal_hash === JSON.stringify(response.data)) return true
        this.fetchBalanceHistoryTotal_hash = JSON.stringify(response.data)
        this.balanceHistoryTotal = response.data
      } else {
        if (this.fetchBalanceHistoryStock_hash === JSON.stringify(response.data)) return true
        this.fetchBalanceHistoryStock_hash = JSON.stringify(response.data)
        this.balanceHistoryStock = response.data
      }
    })
    .catch((error) => {
    })
  }

  // counters
  balanceTotal_counter = 0
  balanceStock_counter = 0
  balanceHistoryTotal_counter = 0
  balanceHistoryStock_counter = 0
  @action count(counterName, n) {
    this[counterName] += n
  }
}

const store = window.BalanceStore = new BalanceStore()

export default store
