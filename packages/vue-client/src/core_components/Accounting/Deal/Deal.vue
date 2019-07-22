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
        <td colspan="2">
          <el-input placeholder="Name" :value="deal.name || ''" @input="changeDealParam('name', $event)"></el-input>
        </td>
        <td colspan="5">
          <el-input type="textarea" :rows=2 :value="deal.note || ''" @input="changeDealParam('note', $event)"></el-input>
        </td>
      </tr>
      <tr>
        <td>{{deal.stocks | commas}}</td>
        <td>{{deal.pairs | commas}}</td>
        <td>{{deal.coins | commas}}</td>
        <!-- <td>DNT, BTC, ETH, BNB</td> -->
        <td>-{{deal.credited | toFixed(8)}} ({{deal.credited_trades}} trades)</td>
        <td>+{{deal.debited | toFixed(8)}} ({{deal.debited_trades}} trades)</td>
        <td>{{deal.total | toFixed(8)}} ({{deal.total_trades}} trades)</td>
        <!-- <td>closed / open</td> -->
        <td>{{deal.timestamp_open | moment('dmyhms')}} — {{deal.timestamp_closed | moment('dmyhms')}} ({{deal.timestamp_duration | duration() }})</td>
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
          <td>{{trade.datetime | moment('dmyhms')}}</td>
          <td>{{trade.stock}}</td>
          <td>{{trade.symbol}}</td>
          <td>{{trade.type}}</td>
          <td>{{trade.side}}</td>
          <td>{{trade.price | toFixed(8)}}</td>
          <td>{{trade.amount}}</td>
          <td>{{trade.fee | toFixed(8)}}</td>
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
    },
    changeDealParam: function(key, value) {
      AccountingStore.changeDealParam(key, value)
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

