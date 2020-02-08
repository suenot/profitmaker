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

<script lang="ts">
import axios from 'axios'
import moment from 'moment'
import _ from 'lodash'
import { Notification } from 'element-ui'
import {mixins} from 'vue-class-component'
import FetchData from '@/components/mixins/FetchData.vue'
import {State} from 'vuex-class'
import {Component} from 'vue-property-decorator'

const data = require('./data.json')

@Component({
  name: 'OpenOrders'
})
export default class OpenOrders extends mixins(FetchData) {
  demoData: any = data
  templateKupi: undefined | string = undefined
  // eslint-disable-next-line
  templateCcxt: string = '/user-api/openOrders/${accountId}/${pair}'
  timerKupi: number = 3000
  timerCcxt: number = 10000
  data!: any

  @State('accountId', {namespace: 'accountId'})
  accountId!: string

  cancelOrder (order: any) {
    const post = {
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

  get dataComputed () {
    const data: any = _.cloneDeep(this.data)
    return _.forEach(data, (order: any) => {
      order.data.datetime = order.data.datetime ? moment(order.data.datetime).format('DD.MM.YY HH:mm:ss') : 'None'
      order.data.lastTradeTimestamp = order.data.lastTradeTimestamp ? moment(order.data.lastTradeTimestamp).format('DD.MM.YY HH:mm:ss') : 'None'
    })
  }
}
</script>
