<template>
<div>
  <div class="title">
    <span class="title-actions">
      <router-link to="/deals">
        <el-button type="default" icon="el-icon-back" circle></el-button>
      </router-link>
    </span>
    <h3 class="title-header">Deal</h3>

    <span class="title-actions">
      <router-link to="/my_trades">
        <el-button type="default" icon="el-icon-goods" circle></el-button>
      </router-link>
    </span>
  </div>
  <div class="kupi-table">
    <table class="table-header">
      <tr>
        <td colspan="2"><el-input placeholder="Name" v-model="name"></el-input></td>
        <td colspan="5">
          <textarea placeholder="Note" v-model="note"></textarea><br/>
        </td>
      </tr>
      <tr>
        <td>BINANCE, LIQUI, TIDEX</td>
        <td>DNT, BTC, ETH, BNB</td>
        <td>-500 USD (20 trades)</td>
        <td>+550 USD (5 trades)</td>
        <td>+50 USD</td>
        <!-- <td>closed / open</td> -->
        <td>time open -- time closed (duration)</td>
      </tr>
    </table>
    <table>
      <thead>
        <tr>
          <th>id</th>
          <th>date</th>
          <th>stock</th>
          <th>pair</th>
          <th>type</th>
          <th>side</th>
          <th>price</th>
          <th>amount</th>
          <th>fee</th>
          <th>actions</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="trade in deal.trades" :key="trade.uuid" :class="trade.side">
          <td>{{trade.order}}</td>
          <td>{{trade.datetime}}</td>
          <td>{{trade.stock}}</td>
          <td>{{trade.symbol}}</td>
          <td>{{trade.type}}</td>
          <td>{{trade.side}}</td>
          <td>{{trade.price}}</td>
          <td>{{trade.amount}}</td>
          <td>{{trade.fee}}</td>
          <td><el-button type="danger" icon="el-icon-delete" circle @click="removeMyTradeFromDeal(trade)"></el-button></td>
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
      name: '',
      note: ''
    }
  },
  props: ['widget'],
  fromMobx: {
    deal: { get() { return toJS(AccountingStore.deal) } },
    // deals: { get() { return toJS(AccountingStore.deals) } },
    // active_deal: { get() { return toJS(AccountingStore.active_deal) } },
  },
  mounted() {
    AccountingStore.setActiveDeal(this.$route.params.id)
  },
  methods: {
    removeMyTradeFromDeal: function(my_trade) {
      AccountingStore.removeMyTradeFromDeal(my_trade)
    }
  },
  computed: {
    // deal: function() {
    //   return this.deals[this.active_deal]
    // }
  }
}
</script>

<style lang="sass" scoped>
.sell
  background: rgba(250, 234, 241, 0.4)
.buy
  background: rgba(241, 250, 232, 0.4)
textarea
  border: 1px solid #ddd
  outline: none
  width: 100%
.table-header
  button
    width: 100%
</style>

