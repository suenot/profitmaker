import { observable, action, reaction, computed } from 'mobx'
import { version, AsyncTrunk } from 'mobx-sync'
import _ from 'lodash'
import uuidv1 from 'uuid/v1'
// import axios from 'axios'
import Store from './Store'

@version(1)
class AccountingStore {
  constructor() {
    const trunk = new AsyncTrunk(this, { storage: localStorage, storageKey: 'accounting' })
    trunk.init()
    reaction(
      () => this.active_deal_trades_length,
      () => {
        this.calculateStocks()
        this.calculatePairs()
        this.calculateCoins()
        this.calculateCredited()
        this.calculateDebited()
        this.calculateTotal()
        this.calculateTimestamps()
      }
    )
  }
  @computed get stock() { return Store.stock }

  // Deals
  @observable deals = {
    // test_id: {
    //   id: 'test_id',
    //   name: 'my best trade with DNT LIQUI-BINANCE',
    //   stocks: 'BINANCE, LIQUI, TIDEX',
    //   coins: 'DNT, BTC, ETH, BNB',
    //   pairs: 'DNT_BTC, DNT_ETH, DNT_BNB',
    //   debited: -500,
    //   debited_trades: 20,
    //   credited: 550,
    //   credited_trades: 2,
    //   total: 50,
    //   total_trades: 22,
    //   status: 'closed',
    //   timestamp_open: 1558117760918,
    //   timestamp_closed: 1558117760918,
    //   note: 'bla-bla',
    //   trades: []
    // }
  }
  @observable active_deal = 'test_id'
  @computed get active_deal_trades_length() {
    try {
      return this.deals[this.active_deal].trades.length
    } catch(err) {
      return 0
    }
  }

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
    var stock = {stock: this.stock}
    trade = {...trade, ...stock}
    trade.fee = trade.fee.cost
    this.deal.trades.push(trade)
  }
  @action removeMyTradeFromDeal(trade) {
    var deal = this.deals[this.active_deal]
    for(let [i, _trade] of Object.entries(deal.trades)) {
      if (_trade.id === trade.id) {
        // если уже есть такой id, то тоглим его (удаляем)
        deal.trades.splice(i, 1)
        return false
      }
    }
  }
  @action changeDealParam(key, value) {
    this.deals[this.active_deal][key] = value
  }

  calculateStocks() {
    var deal = this.deals[this.active_deal]
    deal.stocks = _.uniq(
      deal.trades.map((trade) => {
        return trade.stock
      })
    )
  }
  calculatePairs() {
    var deal = this.deals[this.active_deal]
    deal.pairs = _.uniq(
      deal.trades.map((trade) => {
        return trade.symbol
      })
    )
  }
  calculateCoins() {
    var pairs = this.deals[this.active_deal].pairs
    var coins = pairs.map((pair)=>{
      return pair.split('/')
    })
    coins = _.flatten(coins)
    coins = _.uniq(coins)
    this.deals[this.active_deal].coins = coins
  }
  calculateCredited() {
    var deal = this.deals[this.active_deal]
    var credit =
      deal.trades.filter((trade) => {
        return trade.side === 'buy'
      }).map((trade)=>{
        return trade.amount*trade.price+trade.fee
      })
    deal.credited_trades = credit.length
    deal.credited = _.sum(credit)
  }
  calculateDebited() {
    var deal = this.deals[this.active_deal]
    var debit =
      deal.trades.filter((trade) => {
        return trade.side === 'sell'
      }).map((trade)=>{
        return trade.amount*trade.price+trade.fee
      })
    deal.debited_trades = debit.length
    deal.debited = _.sum(debit)
  }
  calculateTotal() {
    var deal = this.deals[this.active_deal]
    var total =
      deal.trades.map((trade)=>{
        return (trade.side === 'buy' ? -1 : 1) * trade.amount*trade.price+trade.fee
      })
    deal.total_trades = total.length
    deal.total = _.sum(total)
  }
  calculateTimestamps() {
    var deal = this.deals[this.active_deal]
    deal.timestamp_open = _.minBy(deal.trades, 'timestamp').timestamp
    deal.timestamp_closed = _.maxBy(deal.trades, 'timestamp').timestamp
    deal.timestamp_duration = deal.timestamp_closed - deal.timestamp_open
  }

}

const store = window.AccountingStore = new AccountingStore()

export default store
