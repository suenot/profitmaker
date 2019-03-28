<template>
  <ve-line :data="dataComputed" :settings="settingsComputed" :key="componentKey"></ve-line>
</template>

<script>
import axios from 'axios'
import moment from 'moment'
import _ from 'lodash'
export default {
  data () {
    return {
      data: require('./dataTimeseries.js').default,
      componentKey: 0,
    }
  },
  methods: {
    forceRerender() {
      this.componentKey += 1
    }
  },
  computed: {
    settingsComputed() {
      this.forceU
      return {
        stack: { 'group1': this.data.coins },
        area: true
      }
    },
    dataComputed() {
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
      this.forceRerender()
      return chartData
    }
  }
}
</script>
