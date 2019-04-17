<template>
  <div>
    <div class="kupi-tabs">
      <div v-for="(tabValue, tabKey) in tabs" :key="tabKey" :class="`kupi-tab ${tabValue}`" @click="activateTab(tabKey)">{{tabKey}}</div>
    </div>
    <SignalHistory v-if="tabs.History"/>
    <SignalCalculations v-if="tabs.Calculations"/>
    <Trade v-if="tabs.Trade"/>
    <div v-if="tabs.BalanceFrom">
      {{accountsFrom}}
      <div v-for="accountId in accountsFrom">
        <BalanceTable :widget="{demo: false, stock: stockFrom, accountId: accountId}" />
      </div>
    </div>
    <div v-if="tabs.BalanceTo">
      {{accountsTo}}
      <div v-for="accountId in accountsTo">
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
        History: true,
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
      // console.log(newTab)
      var tabs = _.clone(this.tabs)
      for(let [tabName, tabStatus] of Object.entries(tabs)) {
        if (tabName === newTab) tabs[tabName] = true
        else tabs[tabName] = false
      }
      this.tabs = tabs
      // console.log(this.tabs)
    }
  },
  mounted() {
    // BINANCE--ICX--BTC--TIDEX--ICX--BTC--buy
    var splitPath = this.$route.params.id.split('--')
    this.stockFrom = splitPath[0].toLowerCase()
    this.stockTo = splitPath[3].toLowerCase()
    // console.log(stockFromName, stockToName)
    // console.log(AccountsStore.accounts)
    var accountsFrom = []
    var accountsTo = []
    for (let [key, account] of Object.entries(AccountsStore.accounts)) {
      // console.log(account.stock)
      if(account.stock === this.stockFrom) {
        accountsFrom.push(key)
        // console.log(key)
        // console.log(account.stock)
      }
      if(account.stock === this.stockTo) {
        accountsTo.push(key)
        // console.log(key)
        // console.log(account.stock)
      }
    }
    this.accountsFrom = accountsFrom
    this.accountsTo = accountsTo
    // console.log(this.stockFrom)
    // console.log(this.stockTo)
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
    // margin: -1px
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

