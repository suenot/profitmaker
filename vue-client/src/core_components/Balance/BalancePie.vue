<template>
  <div><ve-pie :data="chartData" :extend="test"></ve-pie></div>


</template>

<script>

import axios from 'axios'
import moment from 'moment'
import _ from 'lodash'
export default {
  data () {
    return {
      data: require('./data.js').default,
      test: {"tooltip":{"trigger":"item","formatter":"{a} <br/>{b} : {c} ({d}%)"},"legend":{"type":"scroll","orient":"vertical","right":10,"top":20,"bottom":20,"data":["BTC","ETH","Other"],"selected":{"BTC":true,"ETH":true,"Other":true}},"series":[{"name":"balance","type":"pie","radius":"55%","center":["40%","50%"],"data":[{"name":"BTC","value":"10000.00000000"},{"name":"ETH","value":"40000.00000000"}],"itemStyle":{"emphasis":{"shadowBlur":10,"shadowOffsetX":0,"shadowColor":"rgba(0, 0, 0, 0.5)"}}}]},
      chartData: {
        columns: ['date', 'cost', 'profit'],
        rows: [
          { 'date': '01/01', 'cost': 123, 'profit': 3 },
          { 'date': '01/02', 'cost': 1223, 'profit': 6 },
          { 'date': '01/03', 'cost': 2123, 'profit': 90 },
          { 'date': '01/04', 'cost': 4123, 'profit': 12 },
          { 'date': '01/05', 'cost': 3123, 'profit': 15 },
          { 'date': '01/06', 'cost': 7123, 'profit': 20 }
        ]
      }
    }
  },
  created() {
  },
  methods: {
  },
  computed: {
    // dataComputed() {

    //   var data = _.cloneDeep(this.data)
    //   var legendData = []
    //   var seriesData = []
    //   var selected = {}
    //   var totalUSD = data.totalUSD
    //   var otherUSD = 0
    //   data.data.forEach(function(coin){
    //     if (coin.totalUSD !== 0) {
    //       if ( (coin.totalUSD/totalUSD*100 ) > 5) {
    //         seriesData.push({
    //           name: coin.shortName,
    //           value: coin.totalUSD.toFixed(8)
    //         })
    //         legendData.push(coin.shortName)
    //         selected[coin.shortName] = true
    //       } else {
    //         otherUSD += coin.totalUSD
    //       }
    //     }
    //   })
    //   if (otherUSD !==0) {
    //     seriesData.push({
    //       name: 'Other',
    //       value: otherUSD.toFixed(8)
    //     })
    //   }
    //   selected['Other'] = true
    //   legendData.push('Other')
    //   var optionData = {
    //     legendData,
    //     seriesData,
    //     selected
    //   }
    //   var option = {
    //     tooltip : {
    //       trigger: 'item',
    //       formatter: "{a} <br/>{b} : {c} ({d}%)"
    //     },
    //     legend: {
    //       type: 'scroll',
    //       orient: 'vertical',
    //       right: 10,
    //       top: 20,
    //       bottom: 20,
    //       data: optionData.legendData,
    //       selected: optionData.selected
    //     },
    //     series : [
    //       {
    //         name: 'balance',
    //         type: 'pie',
    //         radius : '55%',
    //         center: ['40%', '50%'],
    //         data: optionData.seriesData,
    //         itemStyle: {
    //           emphasis: {
    //             shadowBlur: 10,
    //             shadowOffsetX: 0,
    //             shadowColor: 'rgba(0, 0, 0, 0.5)'
    //           }
    //         }
    //       }
    //     ]
    //   }
    //   console.log(option)
    //   return option
    // }
  }
}
// export default {

  // data() {
  //   return {
  //     data: require('./data.js').default
  //   }
  // },

// }
</script>

<style lang="sass" scoped>

</style>
