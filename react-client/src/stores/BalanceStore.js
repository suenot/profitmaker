import { observable, action, computed } from 'mobx'
import axios from 'axios'
import _ from 'lodash'
import DashboardsStore from './DashboardsStore'
import SettingsStore from './SettingsStore'

class BalanceStore {
  constructor() {
    const start = () => {
      this.fetchBalance(this.stock)
      this.fetchBalance('TOTAL')
      this.fetchBalanceHistory(this.stock)
      this.fetchBalanceHistory('TOTAL')
      this.available()
    }
    start()
    setInterval(() => {
      if (this.counter > 0) start()
    }, 5000)
  }

  @computed get stock() {return DashboardsStore.stock }
  @computed get pair() {return DashboardsStore.pair }
  @computed get terminalBackend() {return SettingsStore.terminalBackend.value }

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
        this.balanceTotal = response.data
      } else {
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
        this.balanceHistoryTotal = response.data
      } else {
        this.balanceHistoryStock = response.data
      }
    })
    .catch((error) => {
    })
  }

  counter = 0
  @action count(n) {
    this.counter += n
  }
}

const store = window.BalanceStore = new BalanceStore()

export default store
