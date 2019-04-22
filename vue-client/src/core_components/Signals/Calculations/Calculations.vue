<template>
  <div>
    <div class="details-wrap">
      <div class="details-data">
        <el-slider class="details-slider"
          v-model="index"
          :max="max"
          show-stops
        ></el-slider>
        <div class="details-orders">
          <table class="details-table">
            <thead>
              <tr>
                <th colspan="2">ordersFrom</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="tr in changedTableData.ordersFrom" :key="tr.id">
                <td>
                  {{tr[0].toFixed(8)}}
                </td>
                <td>
                  {{tr[1].toFixed(8)}}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="details-orders">
          <table class="details-table">
            <thead>
              <tr>
                <th colspan="2">ordersTo</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="tr in changedTableData.ordersTo" :key="tr.id">
                <td>
                  {{tr[0].toFixed(8)}}
                </td>
                <td>
                  {{tr[1].toFixed(8)}}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="details-info">
        <table class="details-table">
          <tr>
            <td>_percent</td> <td>{{changedTableData._percent}}</td>
          </tr>
          <tr>
            <td>_profit</td> <td>{{changedTableData._profit}}</td>
          </tr>
          <tr>
            <td>_total</td> <td>{{changedTableData._total}}</td>
          </tr>
          <tr>
            <td>total</td> <td>{{changedTableData.total}}</td>
          </tr>
          <tr>
            <td>profit</td> <td>{{changedTableData.profit}}</td>
          </tr>
        </table>
      </div>
    </div>
  </div>
</template>

<script>
import axios from 'axios'
const uuidv1 = require('uuid/v1')

import Store from '@/stores/Store'
export default {
  data() {
    return {
      max: 0,
      index: 0,
      tableData: [],
      // server: 'https://kupi.network/api/signal-calculations',
    }
  },
  fromMobx: {
    signalDetailsUrl: {
      get() {
        return Store.signalDetailsUrl
      }
    },
  },
  mounted() {
    axios.get(`${this.signalDetailsUrl}/${this.$route.params.id}`)
    .then((response) => {
      var rsp = response.data
      this.tableData = rsp
      this.max = this.tableData.length
    })
    .catch((error) => {
      console.log(error)
    })
  },
  computed: {
    changedTableData: function() {
      return this.tableData[this.index]
    }
  }
}
</script>

<style lang="sass">
.details-wrap
  display: flex
  align-items: flex-start
  .details-data
    display: flex
    flex-wrap: wrap
    flex: 0 0 600px
  .details-url
    flex: 0 0 300px
  .details-slider
    flex: 0 0 100%
  .details-orders
    flex: 0 0 50%
  .details-info
    flex: 0 0 auto
    padding-top: 38px

.details-table
  table-layout: fixed
  border-collapse: separate
  td, th
    border-bottom: 1px solid #ebeef5
    padding: 12px 12px
    min-width: 0
    box-sizing: border-box
    text-overflow: ellipsis
    vertical-align: middle
    position: relative
    text-align: left
    font-size: 14px
    color: #606266
  th
    color: #909399
</style>
