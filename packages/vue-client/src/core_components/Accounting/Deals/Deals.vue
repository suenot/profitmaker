<template>
<div>
  <div class="title">
    <h3 class="title-header">Deals</h3>
    <span class="title-actions">
      <el-button type="success" icon="el-icon-plus" circle @click="addDeal()"></el-button>
    </span>
  </div>
  {{note}}
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
          <th>total</th>
          <!-- <th>status</th> -->
          <th>time</th>
          <th>actions</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="deal in deals" :key="deal.id">
          <td>{{deal.name}}</td>
          <td>{{deal.stocks}}</td>
          <td>{{deal.coins}}</td>
          <td>{{deal.pairs}}</td>
          <td>{{deal.credited}} USD ({{deal.credited_trades}})</td>
          <td>{{deal.debited}} USD ({{deal.debited_trades}})</td>
          <td>{{deal.total}} USD ({{deal.total_trades}})</td>
          <!-- <td>{{deal.status}}</td> -->
          <td>{{deal.timestamp_open}} -- {{deal.timestamp_closed}}</td>
          <td class="nowrap">
            <el-button :type="note_id === deal.id ? 'warning' : ''" icon="el-icon-info" circle @click="showNote(deal)"></el-button>
            <router-link :to="{ name: 'Deal', params: {id: deal.id } }">
              <el-button type="primary" icon="el-icon-edit" circle></el-button>
            </router-link>
            <el-button type="danger" icon="el-icon-delete" circle @click="removeDeal(deal.id)"></el-button>
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
      note_id: '',
      note: ''
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
  methods: {
    async addDeal() {
      const id = await AccountingStore.addDeal()
      // this.$router.push({ name: 'Deal', params: {id: id } })
    },
    removeDeal(id) {
      AccountingStore.removeDeal(id)
    },
    showNote(deal) {
      if (this.note_id === deal.id) {
        this.note = ''
        this.note_id = ''
      } else {
        this.note = deal.note
        this.note_id = deal.id
      }
    }
  }
}
</script>
