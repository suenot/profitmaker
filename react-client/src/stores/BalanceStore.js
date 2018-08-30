import { observable, action, computed, autorun } from 'mobx'
import axios from 'axios'
import _ from 'lodash'

class BalanceStore {
    // @observable precision = 8
    // @observable _total = 0
    // @observable _free = 0
    // @observable _used = 0
    @observable balance = {'TOTAL': {'data': {}}}
    @observable stock = 'TOTAL'

    // @computed get total() {
    //   if (this.balance) {
    //     console.log(this.balance)
    //     // return Object.assign(...Object.entries(this._total).map(([k, v]) => ({
    //     //   [k]: {
    //     //     usd: v.usd.toFixed(this.precision),
    //     //     btc: v.btc.toFixed(this.precision),
    //     //     tkn: v.tkn.toFixed(this.precision)
    //     //   }
    //     // })
    //     // ))
    //   }
    // }
    // @computed get free() {
    //   return _.map(this._free, (item) => {
    //     return {
    //       usd: item.usd.toFixed(this.precision),
    //       btc: item.btc.toFixed(this.precision),
    //       tkn: item.tkn.toFixed(this.precision)
    //     }
    //   })
    // }
    // @computed get used() {
    //   return _.map(this._used, (item) => {
    //     return {
    //       usd: item.usd.toFixed(this.precision),
    //       btc: item.btc.toFixed(this.precision),
    //       tkn: item.tkn.toFixed(this.precision)
    //     }
    //   })
    // }
    

    @action fetchBalance(){
      axios.get('http://localhost:8051/balance')
      .then((response) => {
        this.balance = response.data
        // this._free = response.data[this.stock]['free']
        // this._used = response.data[this.stock]['used']
      })
      .catch((error) => { console.log(error) })
    }
}

const store = window.BalanceStore = new BalanceStore()

export default store

autorun(() => {
  store.fetchBalance()
})
