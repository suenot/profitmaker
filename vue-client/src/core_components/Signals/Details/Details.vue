<template>
  <div>
    <!-- {{dataComputed}} -->
    lag: {{dataComputed.lag}}
    timelife:{{dataComputed.timelife}}
    updated:{{dataComputed.updated}}
    created:{{dataComputed.created}}

    type: {{dataComputed.type}}
    status:{{dataComputed.status}}
    action:{{dataComputed.action}}

    percent:{{dataComputed.percent}}
    profitUSD:{{dataComputed.profitUSD}}
    profitBTC:{{dataComputed.profitBTC}}
    totalUSD:{{dataComputed.totalUSD}}
    totalBTC:{{dataComputed.totalBTC}}


    maxProfitUSD:{{dataComputed.maxProfitUSD}}
    maxProfitBTC:{{dataComputed.maxProfitBTC}}
    maxPercent:{{dataComputed.maxPercent}}
    maxTotalUSD:{{dataComputed.maxTotalUSD}}
    maxTotalBTC:{{dataComputed.maxTotalBTC}}


    <div class="detailsWrap">
      <div>
        {{from}}
        pair: {{dataComputed.pairFrom}}
        stock: {{dataComputed.stockFrom}}
        updated: {{dataComputed.updatedFrom}}
        <el-checkbox v-model="from.white">White</el-checkbox>
        <el-checkbox v-model="from.black">Black</el-checkbox>
        <el-checkbox v-model="from.favorite">Favorite</el-checkbox>
        <div>Full name</div>
        <el-input placeholder="Full name" v-model="from.full_name" class="m-16" @change="changeData($event)"></el-input>
        <div>Note</div>
        <el-input type="textarea" v-model="from.note" @change="changeData($event)"></el-input>
      </div>
      <div>
        {{to}}
        pair: {{dataComputed.pairTo}}
        stock: {{dataComputed.stockTo}}
        updated: {{dataComputed.updatedTo}}
        <el-checkbox v-model="to.white">White</el-checkbox>
        <el-checkbox v-model="to.black">Black</el-checkbox>
        <el-checkbox v-model="to.favorite">Favorite</el-checkbox>
        <div>Full name</div>
        <el-input placeholder="Full name" v-model="to.full_name" class="m-16" @change="changeData($event, data.stockTo, data.pairTo, 'full_name')"></el-input>
        <div>Note</div>
        <el-input type="textarea" v-model="to.note" @change="changeData($event, data.stockTo, data.pairTo, 'note')"></el-input>
      </div>
    </div>
  </div>
</template>

<script>
import axios from 'axios'
import moment from 'moment'
var momentDurationFormatSetup = require("moment-duration-format")
momentDurationFormatSetup(moment)

import _ from 'lodash'
export default {
  data () {
    return {
      server: 'https://kupi.network/api/',
      data: {},
      from: {
        // full_name: '',
        // white: true,
        // black: false,
        // favorite: false,
        // note: '',
      },
      to: {
        // full_name: '',
        // white: true,
        // black: false,
        // favorite: false,
        // note: '',
      }
    }
  },
  mounted() {
    // this.getData()
    this.getDetails()
  },
  computed: {
    dataComputed: function() {
      var data = _.cloneDeep(this.data)
      data.percent = data.percent !== undefined ? data.percent.toFixed(2) + '%' : ''
      data.profitBTC = data.profitBTC !== undefined ? data.profitBTC.toFixed(8) + ' BTC' : ''
      data.profitUSD = data.profitUSD !== undefined ? data.profitUSD.toFixed(0) + ' USD' : ''
      data.totalBTC = data.totalBTC !== undefined ? data.totalBTC.toFixed(8) + ' BTC' : ''
      data.totalUSD = data.totalUSD !== undefined ? data.totalUSD.toFixed(0) + ' USD' : ''
      data.updated = moment(data.updated).fromNow()
      data.updatedFrom = moment(data.updatedFrom).fromNow()
      data.updatedTo = moment(data.updatedTo).fromNow()
      data.created = moment(data.created).fromNow()
      data.timelife = moment.duration(data.timelife, 'milliseconds').format('h:mm:ss')
      data.lag = moment.duration(data.lag, 'milliseconds').format('h:mm:ss')
      data.maxProfitUSD = data.maxProfitUSD !== undefined ? data.maxProfitUSD.toFixed(0) + ' USD' : ''
      data.maxProfitBTC = data.maxProfitBTC !== undefined ? data.maxProfitBTC.toFixed(8) + ' BTC' : ''
      data.maxTotalUSD = data.maxTotalUSD !== undefined ? data.maxTotalUSD.toFixed(0) + ' USD' : ''
      data.maxTotalBTC = data.maxTotalBTC !== undefined ? data.maxTotalBTC.toFixed(8) + ' BTC' : ''
      data.maxPercent = data.maxPercent !== undefined ? data.maxPercent.toFixed(2) + ' %' : ''
      return data
    }
  },
  methods: {
    getDetails() {
      axios.get(`${this.server}/intuition-details/${this.$route.params.id}`)
      .then((response) => {
        this.data = response.data
        this.getData()
      })
      .catch((error) => {
      })
    },
    getData() {
      axios.get(`${this.server}/pairs/${this.data.stockFrom}--${this.data.pairFrom}`)
      .then((response) => {
        this.from = response.data
      })
      .catch((error) => {
      }),

      axios.get(`${this.server}/pairs/${this.data.stockTo}--${this.data.pairTo}`)
      .then((response) => {
        console.log(response.data)
        this.to = response.data
      })
      .catch((error) => {
      })
    },
    changeData(value, stock, pair, key) {
      axios.post(`${this.server}/pairs/core`, {
        id: `${stock}--${pair}`,
        key,
        value
      })
      .then((response) => {
        this.getData()
      })
      .catch((error) => {
        console.log(error)
      })
    }
  }
}

</script>

<style lang="sass" scoped>
.detailsWrap
  display: flex
  & > div
    flex: 0 0 50%
    padding: 30px
</style>
