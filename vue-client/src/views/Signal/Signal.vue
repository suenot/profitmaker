<template>
  <div>
    <div class="kupi-tabs">
      <div v-for="(tabValue, tabKey) in tabs" :key="tabKey" :class="`kupi-tab ${tabValue}`" @click="activateTab(tabKey)">{{tabKey}}</div>
    </div>
    <SignalHistory v-if="tabs.History"/>
    <SignalCalculations v-if="tabs.Calculations"/>
    <Trade v-if="tabs.Trade"/>
  </div>
</template>

<script>
import _ from 'lodash'
export default {
  data() {
    return {
      tabs: {
        History: true,
        Calculations: false,
        Trade: false,
        Accounting: false,
      }
    }
  },
  methods: {
    activateTab(newTab) {
      console.log(newTab)
      var tabs = _.clone(this.tabs)
      for(let [tabName, tabStatus] of Object.entries(tabs)) {
        if (tabName === newTab) tabs[tabName] = true
        else tabs[tabName] = false
      }
      this.tabs = tabs
      console.log(this.tabs)
    }
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

