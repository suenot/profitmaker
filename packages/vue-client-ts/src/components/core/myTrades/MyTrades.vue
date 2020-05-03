<template>
  <div class="kupi-table">
    <table>
      <thead>
        <tr>
          <th>id</th>
          <th>date</th>
          <th>pair</th>
          <th>type</th>
          <th>side</th>
          <th>price</th>
          <th>amount</th>
          <th>fee</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(item, index) in dataComputed" :key="item.uuid" :class="`${item.side} ${item.selected ? 'selected' : ''}`" @click="addMyTradeToDealReq(data[index])">
          <td>{{item.order}}</td>
          <td>{{item.datetime}}</td>
          <td>{{item.symbol}}</td>
          <td>{{item.type}}</td>
          <td>{{item.side}}</td>
          <td>{{item.price | toFixed(8)}}</td>
          <td>{{item.amount | toFixed(8)}}</td>
          <td>{{item.fee | toFixed(8)}}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script lang="ts">
import moment from 'moment'
import _ from 'lodash'
import {mixins} from 'vue-class-component'
import FetchData from '@/components/mixins/FetchData.vue'
import {Mutation, State} from 'vuex-class'
import {Component} from 'vue-property-decorator'
import { Trade } from '@/types'

@Component({
  name: 'MyTrades'
})
export default class MyTrades extends mixins(FetchData) {
  demoData: Trade[] = require('./data.json')
  data!: Trade[]
  templateKupi: string= ''
  // eslint-disable-next-line
  templateCcxt: string = '/user-api/myTrades/${accountId}/${pair}'
  timerKupi: number = 3000
  timerCcxt: number = 10000

  @State('deal', { namespace: 'accounting' })
  deal!: any

  @Mutation('addMyTradeToDeal', { namespace: 'accounting' })
  addMyTradeToDeal!: Function

  addMyTradeToDealReq (trade: any) {
    if (this.$route.name !== 'Trade') this.addMyTradeToDeal(trade)
  }
  get dataComputed () {
    const data = _.cloneDeep(this.data)
    return _.map(data, (item: any) => {
      let selected
      if (this.$route.name !== 'Trade') {
        selected = !!_.find(this.deal.trades, ['id', item.id])
      } else {
        selected = false
      }
      return {
        id: item.id,
        uuid: item.uuid,
        order: item.order,
        datetime: moment(item.datetime).format('DD.MM.YY HH:mm:ss'),
        symbol: item.symbol,
        type: item.type,
        side: item.side,
        price: item.price.toFixed(8),
        amount: item.amount,
        cost: item.cost,
        fee: item.fee.cost.toFixed(8) + ' ' + item.fee.currency,
        selected: selected
      }
    })
  }
}
</script>

<style lang="sass" scoped>
.sell
  background: rgba(250, 234, 241, 0.4)
.buy
  background: rgba(241, 250, 232, 0.4)
.selected
  border-left: 5px solid rgb(64, 158, 255)
</style>
