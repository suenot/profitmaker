<template>
  <div class="kupi-pseudoTable">
    {{percentInverseToFixed}}
    <div class="pseudotable">
      <div v-if="thead" class="pseudotable-header">
        <div class="pseudotable-row">
          <div :style="`flex: 0 0 25%`">price <span className="muted">{{coinTo}}</span></div>
          <div :style="`flex: 0 0 25%`">amount <span className="muted">{{coinFrom}}</span></div>
          <div :style="`flex: 0 0 25%`">total <span className="muted">{{coinTo}}</span></div>
          <div :style="`flex: 0 0 25%`">sum <span className="muted">{{coinTo}}</span></div>
        </div>
      </div>
      <div class="pseudotable-body">
        <div class="pseudotable-row" v-for="order in orderBookItems" :key="order.id"
             :style="`background: linear-gradient(to right, #ffffff 0%, #ffffff ${order.percentInverseToFixed}%, ${background} ${order.percentInverseToFixed}%, ${background} 100%)`"
        >
          <div :style="`color: ${color}; flex: 0 0 25%;`">{{order.price.toFixed(8)}}</div>
          <div :style="`flex: 0 0 25%`">{{order.amount.toFixed(8)}}</div>
          <div :style="`flex: 0 0 25%`">{{order.total.toFixed(8)}}</div>
          <div :style="`flex: 0 0 25%`">{{order.sum.toFixed(8)}}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import _ from 'lodash'
import uuidv1 from 'uuid/v1'
import { Component, Prop, Vue, Watch } from 'vue-property-decorator'
import { BidsAsks, OrderBookItem, Orders, Pair, Sort, VisualMode, VisualModeMax } from '@/types'
import { State } from 'vuex-class'

@Component({
  name: 'OrderSide'
})
export default class OrderSide extends Vue {
  visualMode: VisualMode = 'walls'
  visualModeMax: VisualModeMax = 'fixed'
  visualModeCrocodileMax: number = 10000
  visualModeWallsMax: number = 1000
  pair: Pair = 'ETH_BTC'
  color: string = ''
  background: string = ''
  percentInverseToFixed: string = ''

  orderBookItems: OrderBookItem[] = []

  @State('coins', { namespace: 'Coin' })
  coins!: string[]

  @Prop()
  data!: Orders

  @Prop()
  type!: BidsAsks

  @Prop()
  sort!: Sort

  @Prop()
  thead: any

  @Watch('data')
  watchData () {
    this.computeOrderBookItems()
  }

  get coinFrom () {
    return this.pair.split('_')[0]
  }

  get coinTo () {
    return this.pair.split('_')[1]
  }

  computeOrderBookItems () {
    const type: BidsAsks = this.type
    let data = _.cloneDeep(this.data)
    const bidAskOrders = data[type].slice(0, 40)
    const sum = { asks: 0, bids: 0 }
    const orders = Array(40).fill(0)
    for (let [idx, order] of Object.entries(bidAskOrders)) {
      const [price, amount] = order
      const total = price * amount
      sum[type] = total + sum[type]
      orders[(idx as any)] = {
        id: uuidv1(),
        price,
        amount,
        total,
        sum: sum[type]
      }
    }
    let [coinFrom, coinTo] = this.pair.split('_')
    this.color = type === 'asks' ? 'rgb(234, 0, 112)' : 'rgb(112, 168, 0)'
    this.background = type === 'asks' ? '#FAEAF1' : '#F1FAE8'
    let percent = 0
    _.forEach(orders, (order) => {
      order.totalPercent = order.total / sum[type] * 100
      order.sumPercent = order.sum / sum[type] * 100
      order.totalPercentInverse = 100 - order.totalPercent
      order.sumPercentInverse = 100 - order.sumPercent
    })
    _.forEach(orders, (order) => {
      if (this.visualMode !== 'none') {
        if (this.visualModeMax === 'total sum') {
          percent = this.visualMode === 'crocodile' ? order.sumPercent : order.totalPercent
        } else {
          const hasCoinPrice = this.coins[coinTo] && this.coins[coinTo].price_usd
          let visualModeMaxInQuote
          if (this.visualMode === 'crocodile') {
            visualModeMaxInQuote = hasCoinPrice ? (this.visualModeCrocodileMax / this.coins[coinTo].price_usd) : 30
            if (visualModeMaxInQuote >= order.total) percent = 100
            percent = order.sum / visualModeMaxInQuote * 100
          } else {
            visualModeMaxInQuote = hasCoinPrice ? (this.visualModeWallsMax / this.coins[coinTo].price_usd) : 1
            if (visualModeMaxInQuote >= order.total) percent = 100
            percent = order.total / visualModeMaxInQuote * 100
          }
        }
      }
      const percentInverse = 100 - percent
      order.percentInverseToFixed = percentInverse.toFixed(2)
    })
    this.orderBookItems = _.orderBy(orders, ['price'], [this.sort])
  }
}
</script>

<style lang="sass"></style>
