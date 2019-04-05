<template>
  <div class="main-container">
    <div class="balance-table-wrapper section">
      <Widget :widget="blocks.BalanceTable" />
    </div>
    <div class="balance-pie-wrapper section">
      <Widget :widget="blocks.BalancePie" />
    </div>
    <div class="balance-history section">
      <Widget :widget="blocks.BalanceHistory" />
    </div>
  </div>
</template>

<script>
import Store from '../../stores/Store'
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
  display: grid
  grid-template-columns: [fist-column] 470px [second-column] auto [third-column]
  grid-template-rows: [first-row] 440px [second-row] calc(100vh - 440px)

.balance-table-wrapper
  grid-column: fist-column / second-column
  grid-row: first-row / second-row
  height: 100vh
.balance-pie-wrapper
  grid-column: second-column / third-column
  grid-row: first-row / second-row
  justify-self: stretch
  align-self: stretch
.balance-history
  grid-column: second-column / third-column
  grid-row: second-row / third-row
  justify-self: stretch
  align-self: stretch

.section
  border: 1px solid #d9d9d9
  margin: -1px
  background: white
  overflow-y: auto
  overflow-x: hidden
</style>

