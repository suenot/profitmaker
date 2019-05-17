<template>
  <div class="main-container">
    <div class="left-column">
      <div class="balance-table-wrapper section">
        <Widget :widget="blocks.BalanceTable" />
      </div>
    </div>
    <div class="right-column">
      <div class="balance-pie-wrapper section">
        <Widget :widget="blocks.BalancePie" />
      </div>
      <div class="balance-history section">
        <Widget :widget="blocks.BalanceHistory" />
      </div>
    </div>
  </div>
</template>

<script>
import Store from '@/stores/Store'
import { toJS } from 'mobx'
export default {
  fromMobx: {
    blocks: {
      get() {
        return toJS(Store.blocks)
      }
    },
  },
}
</script>

<style lang="sass" scoped>
.main-container
  min-width: 100%
  max-width: 100%
  width: 100%
  height: 100%
  display: -webkit-box !important
  display: flex
  // display: grid
  // grid-template-columns: [fist-column] 470px [second-column] auto [third-column]
  // grid-template-rows: [first-row] 440px [second-row] calc(100vh - 440px)

.left-column
  flex: 0 0 400px
  max-width: 400px
  min-width: 400px
.right-column
  flex: 1 0 auto
  display: flex
  flex-direction: column
.balance-table-wrapper
  height: 100vh
.balance-pie-wrapper
  flex: 0 0 auto
  height: calc(50vh + 2px)
.balance-history
  flex: 0 0 auto
  height: 50vh


.section
  border: 1px solid #d9d9d9
  margin: -1px
  background: white
  overflow-y: auto
  overflow-x: hidden
</style>

