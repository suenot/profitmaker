<template>
  <div class="kupi-table">
    <table class="table-header">
      <tr>
        <td><el-input placeholder="Name" v-model="name"></el-input></td>
        <td>BINANCE, LIQUI, TIDEX</td>
        <td>DNT, BTC, ETH, BNB</td>
        <td>-500 USD (20 trades)</td>
        <td>+550 USD (5 trades)</td>
        <td>+50 USD</td>
        <td>closed / open</td>
        <td>time open -- time closed (duration)</td>
      </tr>
      <tr>
        <td colspan="7">
          <textarea placeholder="Note" v-model="note"></textarea><br/>
        </td>
        <td>
          <el-button type="primary">Save</el-button><br/>
        </td>
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
        <tr v-for="item in deal" :key="item.uuid" :class="item.side" @click="addMyTradeToDeal(item)">
          <td>{{item.order}}</td>
          <td>{{item.datetime}}</td>
          <td>{{item.stock}}</td>
          <td>{{item.symbol}}</td>
          <td>{{item.type}}</td>
          <td>{{item.side}}</td>
          <td>{{item.price}}</td>
          <td>{{item.amount}}</td>
          <td>{{item.fee}}</td>
          <td><el-button type="danger" icon="el-icon-delete" circle></el-button></td>
        </tr>
      </tbody>
    </table>
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

