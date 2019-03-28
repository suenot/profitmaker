<template>
  <ve-candle :data="dataComputed" :settings="chartSettings" height="500px" key="echarts-candles" :key="componentKey"></ve-candle>
</template>


<script>
import moment from 'moment'
import _ from 'lodash'
export default {
  data () {
    this.chartSettings = {
      showMA: true,
      showVol: true,
      digit: 8,
      MA: [5, 10, 20, 30],
      downColor: '#ec0000',
      upColor: '#00da3c',
      dataType: 'normal', // 'KMB', 'normal', 'percent'
      labelMap: {
        '日K': '5m'
      },
      legendName: {
        '日K': 'ETH_BTC 15m',
      },
      showDataZoom: true
    }
    return {
      data: require('./data.js').default,
      componentKey: 0,
    }
  },
  methods: {
    forceRerender() {
      this.componentKey += 1
    }
  },
  computed: {
    dataComputed: function() {
      var data = _.cloneDeep(this.data)
      data = _.map(data, (item)=>{
        return {
          date: moment(item[0]).format('DD.MM.YY HH:mm'),
          open: item[1],
          close: item[4],
          lowest: item[3],
          highest: item[2],
          vol: item[5]
        }
      })
      data = {
        columns: ['date', 'open', 'close', 'lowest', 'highest', 'vol'],
        rows: data
      }
      this.forceRerender()
      return data
    }
  },
}
</script>

<style lang="sass">
.ve-candle
  height: auto
</style>
