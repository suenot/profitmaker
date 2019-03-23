<template>
  <div class="kupi-table">
    <table>
      <thead>
        <tr>
          <th>price <span className="muted">{{coinTo}}</span></th>
          <th>amount <span className="muted">{{coinFrom}}</span></th>
          <th>total <span className="muted">{{coinTo}}</span></th>
          <th>sum <span className="muted">{{coinTo}}</span></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="order in dataComputed.asks" :key="order.id">
          <td>{{order.price.toFixed(8)}}</td>
          <td>{{order.amount.toFixed(8)}}</td>
          <td>{{order.total.toFixed(8)}}</td>
          <td>{{order.sum.toFixed(8)}}</td>
        </tr>
      </tbody>
    </table>

  </div>
</template>

<script>
import CoinsStore from '../../stores/CoinsStore'
import axios from 'axios'
import moment from 'moment'
import _ from 'lodash'
import uuidv1 from 'uuid/v1'

export default {
  data() {
    return {
      data: require('./data.js').default,
      type: "asks",
      visualMode: "crocodile",
      visualModeMax: "total sum",
      visualModeCrocodileMax: 10000,
      visualModeWallsMax: 1000,
      pair: 'ETH_BTC'
    }
  },
  created() {
  },
  methods: {
  },
  computed: {
    coinFrom() {
      return this.pair.split('_')[0]
    },
    coinTo() {
      return this.pair.split('_')[1]
    },
    dataComputed() {
      var data = _.cloneDeep(this.data)

      var sum = {asks: 0, bids: 0}
      for( let type of Object.keys(sum) ) {
        if ( !_.isEmpty(data[type]) ) {
          for( let [key, order] of Object.entries(data[type]) ) {
            var price = order[0]
            var amount = order[1]
            var total = price * amount
            sum[type] = total + sum[type]
            data[type][key] = {
              id: uuidv1(),
              price: price,
              amount: amount,
              total: total,
              sum: sum[type]
            }
          }
          data[type] = _.forEach(data[type], (order)=>{
            order.totalPercent = order.total / sum[type] * 100
            order.sumPercent = order.sum / sum[type] * 100
            order.totalPercentInverse = 100 - order.totalPercent
            order.sumPercentInverse = 100 - order.sumPercent
          })
        }
      }
      return data
    }


  }
}
</script>

<style lang="sass"></style>
