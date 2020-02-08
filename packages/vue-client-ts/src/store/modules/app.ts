import {Block, Channel, Stock} from '@/types'
import {Action, Module, Mutation, VuexModule} from 'vuex-module-decorators'

@Module({namespaced: true, name: 'app'})
export default class AppModule extends VuexModule {
  blocks: Block = {
    Selector: require('@/components/core/selector/config.ts').default[0],
    Orders: require('@/components/core/orders/config.ts').default[0],
    Trades: require('@/components/core/trades/config.ts').default[0],
    Candles: require('@/components/core/candles/config.ts').default[0]
    // MyTrades: require('@/core_components/MyTrades/config.js').default[0],
    // OpenOrders: require('@/core_components/OpenOrders/config.js').default[0],
    // BalanceTable: require('@/core_components/Balance/config.js').default[0],
    // BalanceTableStock: require('@/core_components/Balance/config.js').default[1],
    // BalancePie: require('@/core_components/Balance/config.js').default[2],
    // BalancePieStock: require('@/core_components/Balance/config.js').default[3],
    // BalanceHistory: require('@/core_components/Balance/config.js').default[4],
    // BalanceHistoryStock: require('@/core_components/Balance/config.js').default[5]
  }

  blocksTrigger = false

  background = '#000' // TODO
  color = '#FFF' // TODO

  stock: string = 'BINANCE'
  channels: Channel[] = ['kupi']
  pair: string = 'ETH_BTC'
  accountId = undefined
  accountName = undefined
  serverBackend: string = 'https://kupi.network/api'
  signalHistoryUrl = 'https://kupi.network/api/signals-history'
  signalDetailsUrl = 'https://kupi.network/api/signals-details'

  deals = []
  deal = []

  @Mutation
  update (payload: any) {
    Object.assign(this, payload)
  }

  @Action
  setStock (stock: { name: Stock, channels: Channel[], accountId: string, accountName: string }) {
    this.update({
      stock: stock.name,
      channels: stock.channels,
      accountId: stock.accountId,
      accountName: stock.accountName,
    })
  }

  @Action
  setPair (pair: string) {
    this.update({
      pair
    })
  }

  @Action
  setAccountId (accountId: string) {
    this.update({
      accountId
    })
  }

  @Action
  setSignalHistoryUrl (url: string) {
    this.update({
      signalHistoryUrl: url
    })
  }

  setSignalDetailsUrl (url: string) {
    this.update({
      signalDetailsUrl: url
    })
  }

  @Action
  addMyTradeToDeal (trade: any) {
    this.update({
      deal: [this.deal, trade]
    })
  }

  // @Action
  // setBlockData (name: string, param: any, value: any) {
  //   this.blocks[name][param] = value
  //   this.blocksTrigger = !this.blocksTrigger
  // }
}
