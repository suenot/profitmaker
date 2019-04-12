<template>
  <div>
    <div class="kupi-tabs">
      <div class="kupi-tab" @click="activateTab('history')">History</div>
      <div class="kupi-tab" @click="activateTab('calculations')">Calculations</div>
      <div class="kupi-tab" @click="activateTab('trade')">Trade</div>
    </div>
    <SignalHistory v-if="tabs.history"/>
    <SignalCalculations v-if="tabs.calculations"/>
    <Trade v-if="tabs.trade"/>
  </div>
</template>

<script>
import _ from 'lodash'
export default {
  data() {
    return {
      tabs: {
        history: true,
        calculations: false,
        trade: false,
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
    &:hover
      background: rgba(0,0,0,0.08)
</style>

