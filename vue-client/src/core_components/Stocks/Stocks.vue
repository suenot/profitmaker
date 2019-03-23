<template>
  <div class="kupi-table">
    <!-- <table>
      <thead>
        <tr>
          <th>id</th>
          <th>date</th>
          <th>symbol</th>
          <th>type</th>
          <th>side</th>
          <th>price</th>
          <th>amount</th>
          <th>cost</th>
          <th>fee</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item in dataComputed" :key="item.uuid">
          <td>{{item['order']}}</td>
          <td>{{item['datetime']}}</td>
          <td>{{item['symbol']}}</td>
          <td>{{item['type']}}</td>
          <td>{{item['side']}}</td>
          <td>{{item['price']}}</td>
          <td>{{item['amount']}}</td>
          <td>{{item['cost']}}</td>
          <td>{{item['fee']}}</td>
        </tr>
      </tbody>
    </table> -->
  </div>
</template>

<script>
// import moment from 'moment'
// import _ from 'lodash'
// export default {
//   data() {
//     return {
//       data: require('./data.js').default
//     }
//   },
//   created() {
//   },
//   methods: {
//   },
//   computed: {
//     dataComputed: function() {
//       var data = _.cloneDeep(this.data)
//       // console.log(data)
//       // return _.map(data, (item)=>{
//       //   return {
//       //     uuid: item.uuid,
//       //     order: item.order,
//       //     datetime: moment(item).format('DD.MM.YY HH:mm:ss'),
//       //     symbol: item.symbol,
//       //     type: item.type,
//       //     side: item.side,
//       //     price: item.price.toFixed(8),
//       //     amount: item.amount,
//       //     cost: item.cost,
//       //     fee: item['fee']['cost'].toFixed(8) + ' ' + item['fee']['currency']
//       //   }
//       })

//     }
//   }
// }
</script>

<style lang="sass"></style>
