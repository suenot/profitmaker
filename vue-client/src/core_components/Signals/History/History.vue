<template>
  <div>
    <ve-line :data="chartData" :settings="chartSettings"></ve-line>
  </div>
</template>

<script>
import axios from 'axios'
import VeLine from 'v-charts/lib/line.common'
import moment from 'moment-timezone'


export default {
  components: { VeLine },
  data () {
    return {
      server: 'https://kupi.network/api/signal-history',
      chartSettings: {
        axisSite: { right: ['profitUSD'] },
        yAxisType: ['normal', 'KMB' ],
        yAxisName: ['percent', 'profitUSD']
      },
      chartData: {
        columns: ['updated', 'percent', 'profitUSD'],
        rows: [

        ]
      }
    }
  },
  mounted() {
    axios.get(`${this.server}/${this.$route.params.id}`)
    .then((response) => {
      var data = response.data
      data.forEach(function(item){
        item.timestamp = moment(item.timestamp).format()
      })
      this.chartData.rows = data
    })
    .catch((error) => {
      console.log(error)
    })
  }
}
</script>
