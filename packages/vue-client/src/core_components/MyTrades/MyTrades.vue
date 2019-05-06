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
      interval: '',
      tube: '',
      hash: '',
      data: [],
      timer: 5000,
      serverBackend: 'https://kupi.network',
    }
  },
  props: ['widget'],
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
    this.start()
  },
  beforeDestroy() {
    this.finish()
  },
  watch: {
    widget: function () {
      this.finish()
      this.start()
    }
  },
  methods: {
    start() {
      if (this.widget.demo) {
        this.data = require('./data.js').default
        this.$parent.notification = {
          type: "warning",
          msg: "Demo mode: using test data",
        }
        return
      } else this.$parent.notification = {}
      this.fetch()
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
        this.$parent.notification = {}
      })
      .catch((error) => {
        this.data = []
        this.$parent.notification = {
          type: "alert",
          msg: "Can't get data",
        }
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
