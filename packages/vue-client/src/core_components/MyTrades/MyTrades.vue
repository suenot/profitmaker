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
        <tr v-for="(item, index) in dataComputed" :key="item.uuid" :class="`${item.side} ${item.selected ? 'selected' : ''}`" @click="addMyTradeToDeal(data[index])">
          <td>{{item.order}}</td>
          <td>{{item.datetime}}</td>
          <td>{{item.symbol}}</td>
          <td>{{item.type}}</td>
          <td>{{item.side}}</td>
          <td>{{item.price}}</td>
          <td>{{item.amount}}</td>
          <td>{{item.fee}}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script>
import {fetchData} from '@/mixins/fetchData'
import { toJS } from 'mobx'
import AccountingStore from '@/stores/AccountingStore'
import moment from 'moment'
import _ from 'lodash'

export default {
  data() {
    return {
      demoData: require('./data.js').default,
      template_kupi: undefined,
      template_ccxt: '/user-api/myTrades/${accountId}/${pair}',
      timer_kupi: 3000,
      timer_ccxt: 10000,
    }
  },
  mixins: [fetchData],
  fromMobx: {
    deal: { get() { return toJS(AccountingStore.deal)} },
  },
  methods: {
    addMyTradeToDeal(trade) {
      if (this.widget.dealSelect) AccountingStore.addMyTradeToDeal(trade)
    }
  },
  computed: {
    dataComputed: function() {
      return _.map(this.data, (item)=>{
        if (this.widget.dealSelect) {
          var selected = _.find(this.deal.trades, ['id', item.id]) ? true : false
        } else {
          var selected = false
        }
        item.datetime = moment(item.datetime).format('DD.MM.YY HH:mm:ss')
        item.price = item.price.toFixed(8)
        item.fee = item.fee.cost.toFixed(8) + ' ' + item.fee.currency
        return item
      })
    }
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

