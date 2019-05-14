<template>
  <div class="kupi-table">
    <table class="table-header">
      <el-button type="success" icon="el-icon-plus" circle></el-button>
    </table>
    <table>
      <thead>
        <tr>
          <th>name</th>
          <th>coins</th>
          <th>stocks</th>
          <th>credited</th>
          <th>debited</th>
          <th>profit</th>
          <th>status</th>
          <th>time</th>
          <th>note</th>
          <th>actions</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>DNT LIQUI-BINANCE</td>
          <td>DNT, BTC, ETH, BNB</td>
          <td>BINANCE, LIQUI, TIDEX</td>
          <td>-500 USD (20 trades)</td>
          <td>+550 USD (5 trades)</td>
          <td>+50 USD</td>
          <td>closed / open</td>
          <td>time open -- time closed (duration)</td>
          <td>...note</td>
          <td class="nowrap">
            <el-button type="primary" icon="el-icon-edit" circle></el-button>
            <el-button type="danger" icon="el-icon-delete" circle></el-button>
          </td>
        </tr>
        <!-- <tr v-for="deal in deals" :key="deal.id" @click="addMyTradeToDeal(item)">
          <td>{{item['order']}}</td>
          <td>{{item['datetime']}}</td>
          <td>{{item['symbol']}}</td>
          <td>{{item['type']}}</td>
          <td>{{item['side']}}</td>
          <td>{{item['price']}}</td>
          <td>{{item['amount']}}</td>
          <td>{{item['cost']}}</td>
          <td>{{item['fee']}}</td>
        </tr> -->
      </tbody>
    </table>
  </div>
</template>

<script>
  import Store from '@/stores/Store'
  import { toJS } from 'mobx'
  export default {
  data() {
    return {
    }
  },
  props: ['widget'],
  fromMobx: {
    deal: {
      get() {
        return toJS(Store.deals)
      }
    }
  },
}
</script>
