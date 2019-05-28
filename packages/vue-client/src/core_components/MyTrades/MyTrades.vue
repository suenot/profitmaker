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
        <tr v-for="item in dataComputed" :key="item.uuid" :class="`${item.side} ${item.selected ? 'selected' : ''}`" @click="addMyTradeToDeal(item)">
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
import { toJS } from 'mobx'
import Store from '@/stores/Store'
import AccountingStore from '@/stores/AccountingStore'
import axios from 'axios'
import moment from 'moment'
import _ from 'lodash'
export default {
  data() {
    return {
      interval: '',
      tube: '',
      hash: '',
      data: [],
      timer: 5000,
      serverBackend: 'https://kupi.network',
    }
  },
  props: ['widget'],
  fromMobx: {
    pair: { get() { return Store.pair } },
    accountId: { get() { return Store.accountId } },
    deal: { get() { return toJS( AccountingStore.deal) } },
  },
  mounted() {
    this.start()
  },
  beforeDestroy() {
    this.finish()
  },
  watch: {
    widget: function () {
      this.finish()
      this.start()
    }
  },
  methods: {
    start() {
      if (this.widget.demo) {
        this.data = require('./data.js').default
        this.$parent.notification = {
          type: "warning",
          msg: "Demo mode: using test data",
        }
        return
      } else this.$parent.notification = {}
      this.fetch()
      this.interval = setInterval(()=>{
        this.fetch()
      }, this.timer)
    },
    finish() {
      if (this.interval) {
        clearInterval(this.interval)
        this.interval = null
      }
    },
    fetch() {
      var accountId = this.accountId
      var pair = this.pair
      axios.get(`/user-api/myTrades/${accountId}/${pair}`)
      .then((response) => {
        this.data = response.data
        this.$parent.notification = {}
      })
      .catch((error) => {
        this.data = []
        this.$parent.notification = {
          type: "alert",
          msg: "Can't get data",
        }
      })
    },
    addMyTradeToDeal(trade) {
      AccountingStore.addMyTradeToDeal(trade)
    }
  },
  computed: {
    dataComputed: function() {
      // var data = _.cloneDeep(this.data)
      return _.map(this.data, (item)=>{
        return {
          id: item.id,
          uuid: item.uuid,
          order: item.order,
          datetime: moment(item).format('DD.MM.YY HH:mm:ss'),
          symbol: item.symbol,
          type: item.type,
          side: item.side,
          price: item.price.toFixed(8),
          amount: item.amount,
          cost: item.cost,
          fee: item['fee']['cost'].toFixed(8) + ' ' + item['fee']['currency'],
          selected: _.find(this.deal.trades, ['id', item.id])
        }
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

