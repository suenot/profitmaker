<template>
<div>
  <div class="title">
    <h3 class="title-header">Deals</h3>
    <span class="title-actions">
      <router-link to="/deal">
        <el-button type="success" icon="el-icon-plus" circle></el-button>
      </router-link>
    </span>
  </div>
  <div class="kupi-table">
    <table>
      <thead>
        <tr>
          <th>name</th>
          <th>stocks</th>
          <th>coins</th>
          <th>pairs</th>
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
        <!-- <tr>
          <td>DNT LIQUI-BINANCE</td>
          <td>BINANCE, LIQUI, TIDEX</td>
          <td>DNT, BTC, ETH, BNB</td>
          <td>DNT_BTC, DNT_ETH, DNT_BNB</td>
          <td>-500 USD (20 trades)</td>
          <td>+550 USD (5 trades)</td>
          <td>+50 USD</td>
          <td>closed / open</td>
          <td>time open -- time closed (duration)</td>
          <td>...note</td>
          <td class="nowrap">
            <router-link to="/deal">
              <el-button type="primary" icon="el-icon-edit" circle></el-button>
            </router-link>
            <el-button type="danger" icon="el-icon-delete" circle></el-button>
          </td>
        </tr> -->
        <tr v-for="deal in deals" :key="deal.name">
          <td>{{deal.name}}</td>
          <td>{{deal.stocks}}</td>
          <td>{{deal.coins}}</td>
          <td>{{deal.pairs}}</td>
          <td>{{deal.credited}} USD ({{deal.credited_trades}})</td>
          <td>{{deal.debited}} USD ({{deal.debited_trades}})</td>
          <td>{{deal.profit}} USD ({{deal.trades}})</td>
          <td>{{deal.status}}</td>
          <td>{{deal.timestamp_open}} -- {{deal.timestamp_closed}}</td>
          <td>{{deal.note}}</td>
          <td class="nowrap">
            <router-link to="/deal">
              <el-button type="primary" icon="el-icon-edit" circle></el-button>
            </router-link>
            <el-button type="danger" icon="el-icon-delete" circle></el-button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</div>
</template>

<script>
  import AccountingStore from '@/stores/AccountingStore'
  import { toJS } from 'mobx'
  export default {
  data() {
    return {
    }
  },
  props: ['widget'],
  fromMobx: {
    deals: {
      get() {
        return toJS(AccountingStore.deals)
      }
    }
  },
}
</script>
