<template>
  <div>
    <ve-pie :data="dataComputed"></ve-pie>
  </div>
</template>

<script>

import axios from 'axios'
import moment from 'moment'
import _ from 'lodash'
export default {
  data () {
    return {
      data: require('./data.js').default
    }
  },
  created() {
  },
  methods: {
  },
  computed: {
    dataComputed() {
      var data = _.cloneDeep(this.data)
      var legendData = ['name', 'USD', 'BTC', 'free', 'used']
      var seriesData = []
      var totalUSD = data.totalUSD
      var otherUSD = 0
      // var otherBTC = 0
      data.data.forEach(function(coin){
        if (coin.totalUSD !== 0) {
          if ( (coin.totalUSD/totalUSD*100 ) > 5) {
            seriesData.push({
              name: coin.shortName,
              USD: coin.totalUSD.toFixed(2)
              // BTC: coin.totalBTC.toFixed(8),
              // free: coin.free.toFixed(8),
              // used: coin.used.toFixed(8)
            })
          } else {
            otherUSD += coin.totalUSD
            // otherBTC += coin.totalBTC
          }
        }
      })
      seriesData.push({
        name: 'OTHER',
        USD: otherUSD.toFixed(2)
        // BTC: otherBTC.toFixed(8)
      })

      var chartData = {
        columns: legendData,
        rows: seriesData
      }

      return chartData
    }
  }
}
</script>

<style lang="sass" scoped>

</style>
