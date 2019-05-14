import { observable, action, reaction, computed } from 'mobx'
// import { version, AsyncTrunk } from 'mobx-sync'
import _ from 'lodash'
// import uuidv1 from 'uuid/v1'
// import axios from 'axios'


// @version(1)
class Store {
  // Deals
  @observable deals = []
  @observable deal = []

  @action addMyTradeToDeal(trade) {
    for(let [i, _trade] of Object.entries(this.deal)) {
      if (_trade.id === trade.id) {
        this.deal.splice(i, 1)
        return false
      }
    }
    console.log(trade)
    this.deal.push(trade)
  }
}

const store = window.Store = new Store()


export default store
