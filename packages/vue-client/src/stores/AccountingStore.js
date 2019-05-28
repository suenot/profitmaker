import { observable, action, reaction, computed } from 'mobx'
// import { version, AsyncTrunk } from 'mobx-sync'
import _ from 'lodash'
import uuidv1 from 'uuid/v1'
// import axios from 'axios'


// @version(1)
class Store {
  // Deals
  @observable deals = {
    test_id: {
      id: 'test_id',
      name: 'my best trade with DNT LIQUI-BINANCE',
      stocks: 'BINANCE, LIQUI, TIDEX',
      coins: 'DNT, BTC, ETH, BNB',
      pairs: 'DNT_BTC, DNT_ETH, DNT_BNB',
      debited: -500,
      debited_trades: 20,
      credited: 550,
      credited_trades: 2,
      total: 50,
      total_trades: 22,
      status: 'closed',
      timestamp_open: 1558117760918,
      timestamp_closed: 1558117760918,
      note: 'bla-bla',
      trades: []
    }
  }
  @observable active_deal = 'test_id'
  @computed get deal() {
    return this.deals[this.active_deal]
  }
  @action setActiveDeal(id) {
    this.active_deal = id
  }

  @action async addDeal() {
    const id = uuidv1()

    this.deals[id] = {
      id: id,
      name: '',
      stocks: '',
      coins: '',
      pairs: '',
      debited: 0,
      debited_trades: 0,
      credited: 0,
      credited_trades: 0,
      total: 0,
      total_trades: 0,
      status: '',
      timestamp_open: 0,
      timestamp_closed: 0,
      note: '',
      trades: []
    }

    return id
  }

  @action removeDeal(id) {
    delete this.deals[id]
  }

  @action addMyTradeToDeal(trade) {
    var deal = this.deals[this.active_deal]
    // проходим по всем трейдам сделки и ищем трейд, по которому кликнули
    if (!_.isEmpty(deal.trades)) {
      for(let [i, _trade] of Object.entries(deal.trades)) {
        if (_trade.id === trade.id) {
          // если уже есть такой id, то тоглим его (удаляем)
          deal.trades.splice(i, 1)
          return false
        }
      }
    }
    this.deal.trades.push(trade)
  }
}

const store = window.AccountingStore = new Store()


export default store
