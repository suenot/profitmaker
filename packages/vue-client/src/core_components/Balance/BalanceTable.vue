<template>
  <div class="kupi-table">
    <table>
      <thead>
        <tr>
          <th colSpan="1">{{dataComputed.datetime}}</th>
          <th colSpan="1">{{dataComputed.totalBTC}}</th>
          <th colSpan="2">{{dataComputed.totalUSD}}</th>
        </tr>
        <tr>
          <th>coins</th>
          <th>on orders</th>
          <th>BTC</th>
          <th>USD</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item in dataComputed.data" :key="item.shortName">
          <td>
            {{item.free}}  {{item.shortName}}
          </td>
          <td>
            {{item.used}}
          </td>
          <td>
            {{item.totalBTC}}
          </td>
          <td>
            {{item.totalUSD}}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script>
import moment from 'moment'
import {fetchData} from '@/mixins/fetchData'
import _ from 'lodash'

export default {
  data() {
    return {
      demoData: require('./data.js').default,
      template_kupi: undefined,
      template_ccxt: '/user-api/balance?type=${type}&stock=${stock}&accountId=${accountId}',
      timer_kupi: 3000,
      timer_ccxt: 30000,
    }
  },
  mixins: [fetchData],
  computed: {
    dataComputed() {
      var data = _.cloneDeep(this.data)
      data.datetime = data.datetime !== undefined ? moment(data.datetime).format('DD.MM.YY HH:mm') : '-'
      data.totalBTC = data.totalBTC ? data.totalBTC.toFixed(8) + ' BTC' : '0 BTC'
      data.totalUSD = data.totalUSD ? data.totalUSD.toFixed(2) + ' USD' : '0 USD'
      data.data = _.map(data.data, (item)=>{
        item.free = item.free ? item.free.toFixed(8) : 0
        item.used = item.used ? item.used.toFixed(8) : 0
        item.totalBTC = item.totalBTC ? item.totalBTC.toFixed(8) : 0
        item.totalUSD = item.totalUSD ? item.totalUSD.toFixed(2) : 0
        return item
      })
      return data
    }
  }
}
</script>
