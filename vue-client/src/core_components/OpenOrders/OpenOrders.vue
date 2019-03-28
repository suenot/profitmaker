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
        <tr :key="order._id" v-for="order in openOrdersComputed" >
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
            <!-- {{ ( order['data']['lastTradeTimestamp'] && moment(order['data']['lastTradeTimestamp']).format('DD.MM.YY HH:mm:ss') ) || 'None'}} -->
          </td>
          <td>
            <el-button type="primary" @click="cancelOrder(order)">Cancel</el-button>
            <!-- <Button.Group>
              <Button type="warning" size="mini" onClick={this.cancelOrder.bind(this, item['data']['id'], item['data']['symbol'], item['data']['_id'], item['stock'])}>change</Button>
              <Button type="danger" size="mini" onClick={this.cancelOrder.bind(this, item['data']['id'], item['data']['symbol'], item['data']['_id'], item['stock'])}>close</Button>
            </Button.Group> -->
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
  export default {
  data() {
    return {
      openOrders: require('./data.js').default,
      error: ''
    }
  },
  created() {
  },
  mounted: function() {
    // var accountId = 'ID_Binance_2'
    // var pair = 'ETH_BTC'
    // axios.get(`http://localhost:8040/openOrders/${accountId}/${pair}`)
    // .then((response) => {
    //   this.openOrders = response.data
    // })
    // .catch((error) => {
    //   this.error = error
    // })
  },
  methods: {
    cancelOrder: function(order) {
      var post = {
        accountId: 'ID_Binance_2',
        id: order.id,
        _id: order._id,
        symbol: order.symbol
      }
      console.log(post)
      axios.post('http://localhost:8040/cancelOrder', post)
      .then((response) => {
        console.log(response)
      })
      .catch((error) => {
        console.log(error)
      })
    }
  },
  mounted: function() {
    var accountId = 'ID_Binance_2'
    var pair = 'ETH_BTC'
    axios.get(`http://localhost:8040/openOrders/${accountId}/${pair}`)
    .then((response) => {
      this.openOrders = response.data
    })
    .catch((error) => {
      this.error = error
    })
  },
  computed: {
    openOrdersComputed: function() {
      var openOrders = _.cloneDeep(this.openOrders)
      return _.forEach(openOrders, (order)=>{
        order.data.datetime = order.data.datetime ? moment(order.data.datetime).format('DD.MM.YY HH:mm:ss') : 'None'
        order.data.lastTradeTimestamp = order.data.lastTradeTimestamp ? moment(order.data.lastTradeTimestamp).format('DD.MM.YY HH:mm:ss') : 'None'
      })
    }
  },
}
</script>

<style lang="sass"></style>
