<template>
  <div v-loading="data.length < 0 && height > 0" class="candles" ref="box">
    <CandlesVchart v-if="widget.library === 'v-charts'" :data="data" :widget="widget" :height="height" />
    <!--<ReactStockcharts v-if="widget.library === 'react-stockcharts' && data.length > 3" type="hybrid"
                      :data="data" :_data="widget" :height="height" />-->
    <ReactStockcharts type="hybrid" :data="demoData" :_data="widget" :height="height" />
  </div>
</template>

<script lang="ts">
import {Component, Prop, Vue} from 'vue-property-decorator'
import {Candle, WidgetConfig} from '@/types'
import {Action, State} from 'vuex-class'

const data: number[][] = require('./data.json')

@Component({
  name: 'Candles',
})
export default class Candles extends Vue {
  height: number = 0;

  demoData: number[][] = data;

  @State('candles', {namespace: 'app'})
  data!: Candle[]

  @Prop()
  widget!: WidgetConfig

  $parent!: any

  interval: number | null = null

  @Action('fetchCandles', {namespace: 'app'})
  fetchCandles!: () => Promise<any>

  fetch () {
    this.fetchCandles()
      .catch((err) => {
        console.warn(`${this.widget.title} ${err}`)
        this.$parent.notification = {
          type: 'alert',
          msg: "Can't get data"
        }
        return null
      })
  }

  mounted () {
    // const height = (this.$refs.box as any).parentElement.parentElement.parentElement.clientHeight
    // this.height = height - 34
    this.$parent.notification = {}
    this.fetch()
    this.interval = window.setInterval(this.fetch, 10000)
  }

  beforeDestroy () {
    if (this.interval) {
      clearInterval(this.interval)
      this.interval = null
    }
  }
}
</script>

<style lang="sass">
  .candles
    height: 100%
</style>
