<template>
  <div>
    <div class="kupi-tabs">
      <div v-for="(tabValue, tabKey) in tabs" :key="tabKey" :class="`kupi-tab ${tabValue}`" @click="activateTab(tabKey)">{{tabKey}}</div>
    </div>
    <SignalDetails v-if="tabs.Details"/>
    <SignalHistory v-if="tabs.History"/>
    <SignalCalculations v-if="tabs.Calculations"/>
    <Trade v-if="tabs.Trade"/>
    <div v-if="tabs.BalanceFrom">
      <div v-for="accountId in accountsFrom" :key="accountId">
        <BalanceTable :widget="{demo: false, stock: stockFrom, accountId: accountId}" />
      </div>
    </div>
    <div v-if="tabs.BalanceTo">
      <div v-for="accountId in accountsTo" :key="accountId">
        <BalanceTable :widget="{demo: false, stock: stockTo, accountId: accountId}" />
      </div>
    </div>
  </div>
</template>

<script>
import _ from 'lodash'
import AccountsStore from '@/stores/AccountsStore'
export default {
  data() {
    return {
      tabs: {
        Details: true,
        History: false,
        Calculations: false,
        Trade: false,
        Accounting: false,
        BalanceFrom: false,
        BalanceTo: false
      },
      stockFrom: '',
      stockTo: '',
      accountsFrom: [],
      accountsTo: []
    }
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
    var splitPath = this.$route.params.id.split('--')
    this.stockFrom = splitPath[0].toLowerCase()
    this.stockTo = splitPath[3].toLowerCase()
    var accountsFrom = []
    var accountsTo = []
    for (let [key, account] of Object.entries(AccountsStore.accounts)) {
      if(account.stock === this.stockFrom) {
        accountsFrom.push(key)
      }
      if(account.stock === this.stockTo) {
        accountsTo.push(key)
      }
    }
    this.accountsFrom = accountsFrom
    this.accountsTo = accountsTo
  }
}
</script>

<style lang="sass">
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

