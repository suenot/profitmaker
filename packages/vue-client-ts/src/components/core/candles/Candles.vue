<template>
  <div v-loading="data.length < 0 && height > 0" class="candles" ref="box">
    <CandlesVchart v-if="widget.library === 'v-charts'" :data="data" :widget="widget" :height="height" />
    <ReactStockcharts v-if="widget.library === 'react-stockcharts' && reactStockChartsRender" type="hybrid"
                      :data="reactStockChartsComputed" :_data="widget" :height="height" />
  </div>
</template>

<script lang="ts">
import _ from 'lodash'
import { mixins } from 'vue-class-component'
import FetchData from '@/components/mixins/FetchData.vue'
import { Component } from 'vue-property-decorator'
import { Candle } from '@/types'

const data: number[][] = require('./data.json')

@Component({
  name: 'Candles',
  mixins: [FetchData],
})
export default class Candles extends mixins(FetchData) {
  height: number = 0;

  demoData: number[][] = data;

  // eslint-disable-next-line
  templateKupi: string = '${serverBackend}/api/${stockLowerCase}/candles/${pair}/${timeframe}'

  // eslint-disable-next-line
  templateCcxt: string = '/user-api/ccxt/${stockLowerCase}/candles/${pair}/${timeframe}'

  data: Candle[] = []

  mounted () {
    const height = (this.$refs.box as any).parentElement.parentElement.parentElement.clientHeight
    this.height = height - 34
  }

  get reactStockChartsComputed () {
    let data = _.cloneDeep(this.demoData)
    return data.map((order: number[]): Candle => {
      const [date, open, high, low, close, volume] = order
      return {
        date: new Date(date),
        open,
        high,
        low,
        close,
        volume,
        absoluteChange: '',
        dividend: '',
        percentChange: '',
        split: ''
      }
    })
  }

  reactStockChartsRender () {
    return this.reactStockChartsComputed.length > 3
  }
}
</script>

<style lang="sass">
  .candles
    height: 100%
</style>
