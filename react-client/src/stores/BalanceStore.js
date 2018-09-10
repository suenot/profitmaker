import { observable, action, computed, autorun } from 'mobx'
import axios from 'axios'
import GlobalStore from './GlobalStore'

class BalanceStore {
  @computed get stock() {return GlobalStore.stock }
  @computed get pair() {return GlobalStore.pair }
  @observable precision = 8
  @observable balanceTotal = {'totalBTC': 0, 'totalUSD': 0, 'datetime': 0, 'data': []}
  @observable balanceStock = {'totalBTC': 0, 'totalUSD': 0, 'datetime': 0, 'data': []}
  @observable balanceHistoryTotal = []
  @observable balanceHistoryStock = []


  @action fetchBalance(stock){
    axios.get(`http://localhost:8051/balance/${stock}`)
    .then((response) => {
      if (stock === 'TOTAL') {
        this.balanceTotal = response.data
      } else {
        this.balanceStock = response.data
      }
    })
    .catch((error) => { console.log(error) })
  }

  @action fetchBalanceHistory(stock){
    axios.get(`http://localhost:8051/balance/history/${stock}`)
    .then((response) => {
      if (stock === 'TOTAL') {
        this.balanceHistoryTotal = response.data
        console.log(response.data)
      } else {
        this.balanceHistoryStock = response.data
      }
    })
    .catch((error) => { console.log(error) })
  }


  // @action fetchBalanceByStocks(stock){
  //   axios.get(`http://localhost:8051/balance/byStocks`)
  //   .then((response) => {
  //     console.log(response.data)
  //   })
  //   .catch((error) => { console.log(error) })
  // }
}

const store = window.BalanceStore = new BalanceStore()

export default store

autorun(() => {
  console.log(store.stock)
  console.log(store.pair)
  store.fetchBalance(store.stock)
  store.fetchBalance('TOTAL')
  store.fetchBalanceHistory(store.stock)
  store.fetchBalanceHistory('TOTAL')
})
