<template>
  <div class="kupi-table">
    <table>
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
    </table>
  </div>
</template>

<script>
  import axios from 'axios'
  import moment from 'moment'
  import _ from 'lodash'
  export default {
  data() {
    return {
      demo: false,
      interval: '',
      tube: '',
      hash: '',
      data: [],
      timer: 5000,
      serverBackend: 'https://kupi.network',
    }
  },
  fromMobx: {
    pair: {
      get() {
        return Store.pair
      }
    },
    accountId: {
      get() {
        return Store.accountId
      }
    },
  },
  mounted() {
    if (this.demo) {
      this.data = require('./data.js').default
      return
    }
    this.start()
  },
  beforeDestroy() {
    this.finish()
  },
  methods: {
    start() {
      this.interval = setInterval(()=>{
        this.fetch()
      }, this.timer)
    },
    finish() {
      if (this.interval) {
        clearInterval(this.interval)
        this.interval = null
      }
    },
    fetch() {
      var accountId = this.accountId
      var pair = this.pair
      axios.get(`/user-api/myTrades/${accountId}/${pair}`)
      .then((response) => {
        this.data = response.data
      })
      .catch((error) => {
        this.data = []
      })
    }
  },
  computed: {
    dataComputed: function() {
      var data = _.cloneDeep(this.data)
      return _.map(data, (item)=>{
        return {
          uuid: item.uuid,
          order: item.order,
          datetime: moment(item).format('DD.MM.YY HH:mm:ss'),
          symbol: item.symbol,
          type: item.type,
          side: item.side,
          price: item.price.toFixed(8),
          amount: item.amount,
          cost: item.cost,
          fee: item['fee']['cost'].toFixed(8) + ' ' + item['fee']['currency']
        }
      })

    }
  }
}
</script>
