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
        <div class="pseudotable-row" v-for="order in dataComputed" :key="order.id"
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
// import CoinsStore from '../../stores/CoinsStore'
import _ from 'lodash'
import uuidv1 from 'uuid/v1'
import { Component, Prop, Vue, Watch } from 'vue-property-decorator'
import { Pair } from '@/types'

@Component({
  name: 'OrderSide'
})
export default class OrderSide extends Vue {
  visualMode: string = 'walls'
  visualModeMax: string = 'fixed'
  visualModeCrocodileMax: number = 10000
  visualModeWallsMax: number = 1000
  pair: Pair = 'ETH_BTC'
  color: string = ''
  background: string = ''
  percentInverseToFixed: string = ''
  dataComputed: [] = []

  @Prop()
  data: any

  @Prop()
  type!: 'bids' | 'asks'

  @Prop()
  sort: any

  @Prop()
  thead: any

  @Watch('data')
  watchData () {
    this.computeData()
  }

  get coinFrom () {
    return this.pair.split('_')[0]
  }

  get coinTo () {
    return this.pair.split('_')[1]
  }

  computeData () {
  //   const type = this.type
  //   let data = _.cloneDeep(this.data)
  //   data = data[type].slice(0, 40)
  //   const sum = { asks: 0, bids: 0 }
  //   for (let [key, order] of Object.entries(data) as any) {
  //     const price = order[0]
  //     const amount = order[1]
  //     const total = price * amount
  //     sum[type] = total + sum[type]
  //     data[key] = {
  //       id: uuidv1(),
  //       price: price,
  //       amount: amount,
  //       total: total,
  //       sum: sum[type]
  //     }
  //   }
  //   data = _.forEach(data, (order) => {
  //     order.totalPercent = order.total / sum[type] * 100
  //     order.sumPercent = order.sum / sum[type] * 100
  //     order.totalPercentInverse = 100 - order.totalPercent
  //     order.sumPercentInverse = 100 - order.sumPercent
  //   })
  //   let [coinFrom, coinTo] = this.pair.split('_')
  //   this.color = type === 'asks' ? 'rgb(234, 0, 112)' : 'rgb(112, 168, 0)'
  //   this.background = type === 'asks' ? '#FAEAF1' : '#F1FAE8'
  //   let percent = 0
  //   data = _.map(data, (order) => {
  //     if (this.visualMode !== 'none') {
  //       if (this.visualModeMax === 'total sum') {
  //         percent = this.visualMode === 'crocodile' ? order.sumPercent : order.totalPercent
  //       } else { // fixed
  //         if (this.visualMode === 'crocodile') {
  //           const visualModeCrocodileMaxInQuote = (CoinsStore.coins[coinTo] && CoinsStore.coins[coinTo].price_usd) ? (this.visualModeCrocodileMax / CoinsStore.coins[coinTo].price_usd) : 30
  //           if (visualModeCrocodileMaxInQuote >= order.total) percent = 100
  //           percent = order.sum / visualModeCrocodileMaxInQuote * 100
  //         } else { // wall
  //           const visualModeWallsMaxInQuote = (CoinsStore.coins[coinTo] && CoinsStore.coins[coinTo].price_usd) ? (this.visualModeWallsMax / CoinsStore.coins[coinTo].price_usd) : 1
  //           if (visualModeWallsMaxInQuote >= order.total) percent = 100
  //           percent = order.total / visualModeWallsMaxInQuote * 100
  //         }
  //       }
  //     }
  //     const percentInverse = 100 - percent
  //     order.percentInverseToFixed = percentInverse.toFixed(2)
  //     return order
  //   })
  //   data = _.orderBy(data, ['price'], [this.sort])
  //   this.dataComputed = data
  }
}
</script>

<style lang="sass"></style>
