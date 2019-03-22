<template>
  <div class="kupi-table">
    <table>
      <thead>
        <tr>
          <th>price</th>
          <th>amount</th>
          <th>datetime</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="trade in dataComputed" :key="trade.id">
          <td :style="trade.side === 'buy'?{color: '#ea0371'}:{color: '#83b327'}">
            <span>{{trade.price}}</span>
          </td>
          <td>{{trade.amount}}</td>
          <td>{{trade.datetime}}</td>
        </tr>
      </tbody>
    </table>

  </div>
</template>

<script>
  import moment from 'moment'
  import _ from 'lodash'
  export default {
  data() {
    return {
      data: require('./data.js').default
    }
  },
  created() {
  },
  methods: {
  },
  computed: {
    dataComputed: function() {
      var data = _.cloneDeep(this.data).slice(0, 40)
      return _.map(data, (item)=>{
        item.datetime = item.datetime ? moment(item.datetime).format('DD.MM.YY HH:mm:ss') : 'None'
        return item
      })
    }
  },
}
</script>

<style lang="sass" scoped>
table
  margin: -1px

</style>
