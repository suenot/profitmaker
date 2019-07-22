<template>
  <div class="kupi-table">
    <!-- {{widget}} -->
    <table>
      <thead>
        <tr>
          <th>price</th>
          <th>amount</th>
          <th>datetime</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="trade in dataComputed" :key="trade.id">
          <td :style="trade.side === 'buy'?{color: '#ea0371'}:{color: '#83b327'}">
            <span>{{trade.price | toFixed(8)}}</span>
          </td>
          <td>{{trade.amount | toFixed(8)}}</td>
          <td>{{trade.datetime}}</td>
        </tr>
      </tbody>
    </table>

  </div>
</template>

<script>
import {fetchData} from '@/mixins/fetchData'
import moment from 'moment'
import _ from 'lodash'

export default {
  data() {
    return {
      demoData: require('./data.js').default,
      template_kupi: '${serverBackend}/api/${stockLowerCase}/trades/${pair}',
      template_ccxt: '/user-api/ccxt/${stockLowerCase}/trades/${pair}',
      timer_kupi: 3000,
      timer_ccxt: 10000,
    }
  },
  mixins: [fetchData],
  computed: {
    dataComputed: function() {
      var data = _.cloneDeep(this.data).slice(0, 40)
      return _.map(data, (item)=>{
        item.datetime = item.datetime ? moment(item.datetime).format('DD.MM.YY HH:mm:ss') : 'None'
        return item
      })
    }
  },
}
</script>
