<template>
  <div class="candles" ref="box">
    <CandlesVchart v-if="widget.library === 'v-charts'" :data="candles" :widget="widget" :height="height" />
    <ReactStockcharts v-if="widget.library === 'react-stockcharts' && candles.length > 3" type="hybrid"
                      :data="candles" :_data="widget" :height="height" />
  </div>
</template>

<script lang="ts">
import {Component, Prop, Vue} from 'vue-property-decorator'
import {Candle, WidgetConfig} from '@/types'
import {Action, State} from 'vuex-class'
import Empty from '@/components/mixins/Empty.vue'

@Component({
  name: 'Candles',
  mixins: [Empty]
})
export default class Candles extends Vue {
  height: number = 0

  @Prop()
  widget!: WidgetConfig

  @State('candles', {namespace: 'app'})
  candles!: Candle[]

  @Action('fetchCandles', {namespace: 'app'})
  fetchCandles!: () => Promise<any>

  $parent!: any

  interval: number | null = null

  fetch () {
    this.fetchCandles()
      .then(res => console.log(res))
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
    const height = (this.$refs.box as any).parentElement.parentElement.parentElement.clientHeight
    this.height = height - 34
    this.$parent.notification = {}
    this.fetch()
    this.interval = window.setInterval(this.fetch, 10000)
  }
}
</script>

<style lang="sass">
  .candles
    height: 100%
</style>
