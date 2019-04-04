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
          <td>{{order.data.price || ""}}</td>
          <td>{{order.data.amount || ""}}</td>
          <td>{{order.data.filled || ""}}</td>
          <td>{{order.data.remaining || ""}}</td>
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
export default {
  data() {
    return {
      demo: false,
      interval: '',
      tube: '',
      hash: '',
      data: [],
      timer: 5000,
      serverBackend: 'https://kupi.network',
    }
  },
  fromMobx: {
    pair: {
      get() {
        return Store.pair
      }
    },
    accountId: {
      get() {
        return Store.accountId
      }
    },
  },
  mounted: function() {
    if (this.demo) {
      this.data = require('./data.js').default
      return
    }
    this.start()
  },
  methods: {
    start() {
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
      axios.get(`/user-api/openOrders/${accountId}/${pair}`)
      .then((response) => {
        this.data = response.data
      })
      .catch((error) => {
        this.data = []
      })
    },
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
