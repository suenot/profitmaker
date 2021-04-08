<template>
  <div>
    <div v-if="accountsComputed"></div>
    <div class="kupi-tabs">
      <div v-for="(tabValue, tabKey) in tabs" :key="tabKey" :class="`kupi-tab ${tabValue}`" @click="activateTab(tabKey)">{{tabKey}}</div>
    </div>
    <SignalDetails v-if="tabs.Details" />
    <SignalHistory v-if="tabs.History" />
    <SignalCalculations v-if="tabs.Calculations" />
    <div v-if="tabs.TradeFrom">
      <SignalAccounts :accounts="accountsFrom" :stock="stockFrom" :pair="pairFrom" />
      <Trade />
      <Balance />
    </div>
    <div v-if="tabs.TradeTo">
      <SignalAccounts :accounts="accountsTo" :stock="stockTo" :pair="pairTo" />
      <Trade />
      <Balance />
    </div>
    <div v-if="tabs.BalanceFrom">
      <div v-for="account in accountsFrom" :key="account.id">
        <BalanceTable :widget="{demo: false, stock: stockFrom, accountId: account.id}" />
      </div>
    </div>
    <div v-if="tabs.BalanceTo">
      <div v-for="account in accountsTo" :key="account.id">
        <BalanceTable :widget="{demo: false, stock: stockTo, accountId: account.id}" />
      </div>
    </div>
  </div>
</template>

<script>
import _ from 'lodash'
import { toJS } from 'mobx'
import AccountsStore from '@/stores/AccountsStore'
export default {
  data() {
    return {
      tabs: {
        Details: true,
        History: false,
        Calculations: false,
        TradeFrom: false,
        TradeTo: false,
        Accounting: false,
        BalanceFrom: false,
        BalanceTo: false
      },
      stockFrom: '',
      pairFrom: '',
      stockTo: '',
      pairTo: '',
      accountsFrom: [],
      accountsTo: []
    }
  },
  fromMobx: {
    accounts: {
      get() {
        return AccountsStore.accounts
      }
    },
    accountsTrigger: {
      get() {
        return AccountsStore.accountsTrigger
      }
    },
  },
  methods: {
    activateTab(newTab) {
      var tabs = _.clone(this.tabs)
      for(let [tabName, tabStatus] of Object.entries(tabs)) {
        if (tabName === newTab) tabs[tabName] = true
        else tabs[tabName] = false
      }
      this.tabs = tabs
    }
  },
  mounted() {
    // await AccountsStore.fetchAccounts()
    var splitPath = this.$route.params.id.split('--')
    this.stockFrom = splitPath[0].toUpperCase()
    this.pairFrom = splitPath[1].toUpperCase() + '_' + splitPath[2].toUpperCase()
    this.stockTo = splitPath[3].toUpperCase()
    this.pairTo = splitPath[4].toUpperCase() + '_' + splitPath[5].toUpperCase()
  },
  computed: {
    accountsComputed() {
      try {
        var accountsFrom = []
        var accountsTo = []
        for (let [key, account] of Object.entries(this.accounts)) {
          if(account.stock === this.stockFrom.toLowerCase()) {
            accountsFrom.push(account)
          }
          if(account.stock === this.stockTo.toLowerCase()) {
            accountsTo.push(account)
          }
        }
        this.accountsFrom = accountsFrom
        this.accountsTo = accountsTo
        return this.accounts
      } catch(err) {
        return []
      }
    },
  }
}
</script>

<style lang="sass">
// .selector-list
.kupi-tabs
  display: flex
  width: 100%
  .kupi-tab
    flex: 1 0 auto
    border: 1px solid rgba(0, 0, 0, 0.12)
    height: 40px
    display: flex
    align-items: center
    justify-content: center
    cursor: pointer
    &.true
      background: rgba(0,0,0,0.08)
    &:hover
      background: rgba(0,0,0,0.08)
</style>

