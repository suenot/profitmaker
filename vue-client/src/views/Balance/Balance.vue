<template>
  <div class="main-container">
    <div class="balance-table-wrapper section">
      <BalanceTable />
    </div>
    <div class="balance-pie-wrapper section">
      <BalancePie />
    </div>
    <div class="balance-timeseries section">
      <BalanceTimeseries />
    </div>
  </div>
</template>

<style lang="sass">
.main-container
  display: grid
  grid-template-columns: [fist-column] 470px [second-column] auto [third-column]
  grid-template-rows: [first-row] 360px [second-row] calc(100vh - 360px)

.balance-table-wrapper
  grid-column: fist-column / second-column
  grid-row: first-row / second-row
  height: 100vh
.balance-pie-wrapper
  grid-column: second-column / third-column
  grid-row: first-row / third-row
  justify-self: stretch
  align-self: stretch
.balance-timeseries
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

