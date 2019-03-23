<template>
  <ve-candle :data="dataComputed" :settings="chartSettings" height="500px"></ve-candle>
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
      data: require('./data.js').default
    }
  },
  computed: {
    dataComputed: function() {

      var data = _.cloneDeep(this.data)
      // console.log(data)
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
      return {
        columns: ['date', 'open', 'close', 'lowest', 'highest', 'vol'],
        rows: data
      }
    }
  },
}
</script>

<style lang="sass">
.ve-candle
  height: auto
</style>
