<template>
  <div>
    <div v-if="accountsComputed"></div>
    <div class="kupi-tabs">
      <div v-for="(tabValue, tabKey) in tabs" :key="tabKey" :class="`kupi-tab ${tabValue}`" @click="activateTab(tabKey)">{{tabKey}}</div>
    </div>
    <SignalDetails v-if="tabs.Details" />
    <SignalHistory v-if="tabs.History" />
    <SignalCalculations v-if="tabs.Calculations" />
    <Trade v-if="tabs.TradeFrom" />
    <Trade v-if="tabs.TradeTo" />
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
      stockTo: '',
      // accountsFrom: [],
      // accountsTo: []
    }
  },
  fromMobx: {
    accounts: {
      get() {
        // if (AccountsStore.accountsTrigger) {
          return AccountsStore.accounts
        // }
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
  async mounted() {
    await AccountsStore.fetchAccounts()
    var accounts = _.cloneDeep(this.accounts)
    var splitPath = this.$route.params.id.split('--')
    this.stockFrom = splitPath[0].toLowerCase()
    this.stockTo = splitPath[3].toLowerCase()
  },
  computed: {
    accountsComputed() {
      return this.accounts
    },
    accountsFrom() {
      var accounts = []
      for (let [key, account] of Object.entries(this.accountsComputed)) {
        if(account.stock === this.stockFrom) {
          accounts.push(key)
        }
      }
      return accounts
    },
    accountsTo() {
      var accounts = []
      for (let [key, account] of Object.entries(this.accountsComputed)) {
        if(account.stock === this.stockTo) {
          accounts.push(key)
        }
      }
      return accounts
    },
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

