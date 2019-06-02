<template>
  <ve-line :data="dataComputed" :settings="settingsComputed" key="balanceTimeseries"></ve-line>
</template>

<script>
import {fetchData} from '@/mixins/fetchData'
import _ from 'lodash'

export default {
  data() {
    return {
      demoData: require('./dataHistory.js').default,
      template_kupi: undefined,
      template_ccxt: '/user-api/balance/?type=${type}&stock=${stock}&accountId=${accountId}',
      timer_kupi: 3000,
      timer_ccxt: 30000,
    }
  },
  mixins: [fetchData],
  computed: {
    settingsComputed() {
      return {
        stack: { 'group1': this.data.coins },
        area: true
      }
    },
    dataComputed() {
      if (_.isEmpty(this.data)) return []
      var data = _.cloneDeep(this.data)
      var columns = ['date']
      var rows = []

      data.coins.forEach(function(coin){
        columns.push(coin)
      })

      data.timestamps.forEach(function(timestamp, i){
        var item = {'date': timestamp}
        data.series.forEach(function(coin){
          item[coin.name] = coin.data[i]
        })
        rows.push(item)
      })
      var chartData = {
        columns: columns,
        rows: rows
      }
      return chartData
    }
  }
}
</script>
