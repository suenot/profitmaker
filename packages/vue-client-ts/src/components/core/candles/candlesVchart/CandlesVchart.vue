<template>
  <ve-candle :data="dataComputed" :settings="chartSettings" :events="chartEvents" :height="height.toString() + 'px'" key="echarts-candles"></ve-candle>
</template>

<script lang="ts">
import moment from 'moment'
import _ from 'lodash'
import { WidgetConfig } from '@/types'
import { Component, Prop, Vue } from 'vue-property-decorator'

@Component({
  name: 'CandlesVchart'
})
export default class CandlesVchart extends Vue {
  chartEvents: any = {
    dataZoom: (e: any) => {
      this.chartSettings.start = e.start
      this.chartSettings.end = e.end
    }
  }

  @Prop()
  widget!: WidgetConfig

  @Prop()
  data!: any

  @Prop()
  height!: number;

  get dataComputed () {
    let data = _.cloneDeep(this.data)
    data = _.map(data, (item) => {
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
    return data
  }

  get chartSettings () {
    return {
      showMA: true,
      showVol: true,
      digit: 8,
      MA: [5, 10, 20, 30],
      downColor: '#ec0000',
      upColor: '#00da3c',
      dataType: 'normal', // 'KMB', 'normal', 'percent'
      labelMap: {
        '日K': `${this.widget.timeframe}`
      },
      legendName: {
        '日K': `${this.widget.timeframe}`
      },
      showDataZoom: true,
      start: false,
      end: false
    }
  }
}
</script>

<style lang="sass">
.ve-candle
  height: auto
</style>
