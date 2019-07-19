<template>
  <div class="kupi-table">
    <table>
      <thead>
        <tr>
          <th>id</th>
          <th>status</th>
          <th>type</th>
          <th>side</th>
          <th>symbol</th>
          <th>date</th>
          <th>price</th>
          <th>amount</th>
          <th>filled</th>
          <th>remaining</th>
          <th>lastTrade</th>
          <th>action</th>
        </tr>
      </thead>
      <tbody>
        <tr :key="order._id" v-for="order in dataComputed" >
          <td>{{order.data.id || ""}}</td>
          <td>{{order.data.status || ""}}</td>
          <td>{{order.data.type || ""}}</td>
          <td>{{order.data.side || ""}}</td>
          <td>{{order.data.symbol || ""}}</td>
          <td>{{order.data.datetime || ""}}</td>
          <td>{{order.data.price | toFixed(8)}}</td>
          <td>{{order.data.amount | toFixed(8)}}</td>
          <td>{{order.data.filled | toFixed(8)}}</td>
          <td>{{order.data.remaining | toFixed(8)}}</td>
          <td>
            {{order.data.lastTradeTimestamp}}
          </td>
          <td>
            <el-button type="primary" @click="cancelOrder(order)">Cancel</el-button>
          </td>
        </tr>
      </tbody>
    </table>

  </div>
</template>

<script>
import axios from 'axios'
import moment from 'moment'
import _ from 'lodash'
import { Notification } from 'element-ui'
import {fetchData} from '@/mixins/fetchData'
export default {
  data() {
    return {
      demoData: require('./data.js').default,
      template_kupi: undefined,
      template_ccxt: '/user-api/openOrders/${accountId}/${pair}',
      timer_kupi: 3000,
      timer_ccxt: 10000,
    }
  },
  mixins: [fetchData],
  methods: {
    cancelOrder: function(order) {
      var post = {
        accountId: this.accountId,
        id: order.id,
        _id: order._id,
        symbol: order.symbol
      }
      axios.post('/user-api/cancelOrder', post)
      .then((response) => {
        Notification({
          title: 'Success',
          message: `Order #${order.id} cancelled`,
          type: 'success'
        })
      })
      .catch((error) => {
        Notification({
          title: 'Error',
          message: `Order #${order.id} cannot be canceled: ${error}`,
          type: 'error'
        })
      })
    }
  },
  computed: {
    dataComputed: function() {
      var data = _.cloneDeep(this.data)
      return _.forEach(data, (order)=>{
        order.data.datetime = order.data.datetime ? moment(order.data.datetime).format('DD.MM.YY HH:mm:ss') : 'None'
        order.data.lastTradeTimestamp = order.data.lastTradeTimestamp ? moment(order.data.lastTradeTimestamp).format('DD.MM.YY HH:mm:ss') : 'None'
      })
    }
  },
}
</script>
