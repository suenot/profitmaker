<template>
  <div v-loading="data.length < 0 && height > 0" class="candles" ref="box">
    <CandlesVchart v-if="widget.library === 'v-charts'" :data="data" :widget="widget" :height="height" />
    <ReactStockcharts v-if="widget.library === 'react-stockcharts' && reactStockChartsRender" type="hybrid" :data="reactStockChartsComputed" :_data="widget" :height="height" />
  </div>
</template>


<script>
import {fetchData} from '@/mixins/fetchData'
import Store from '@/stores/Store'
import axios from 'axios'
import _ from 'lodash'
export default {
  data () {
    return {
      height: 0,
      demoData: require('./data.js').default,
      template_kupi: '${serverBackend}/api/${stockLowerCase}/candles/${pair}/${timeframe}',
      template_ccxt: '/user-api/ccxt/${stockLowerCase}/candles/${pair}/${timeframe}',
      timer_kupi: 5000,
      timer_ccxt: 30000,
    }
  },
  mixins: [fetchData],
  mounted() {
      var height = this.$refs.box.parentElement.parentElement.parentElement.clientHeight
      this.height = height - 34
  },
  computed: {
    reactStockChartsComputed() {
      var data = _.cloneDeep(this.data)
      data = data.map((order) => {
        return {
          'date': new Date(order[0]),
          'open': order[1],
          'high': order[2],
          'low': order[3],
          'close': order[4],
          'volume': order[5],
          'absoluteChange': '',
          'dividend': '',
          'percentChange': '',
          'split': '',
        }
      })
      return data
    },
    reactStockChartsRender() {
      if (this.reactStockChartsComputed.length > 3) return true
      else return false
    }
  }
}
</script>

<style lang="sass">
.candles
  height: 100%
</style>
