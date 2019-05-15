<template>
  <div class="accounting">
    <div class="hide">
      <h3>Deals</h3>
      <Deals />
    </div>
    <div>
      <h3>Deal</h3>
      <Deal />
    </div>
    <div>
      <h3>My trades</h3>
      <MyTrades :widget="widget" />
    </div>

  </div>
</template>

<script>
export default {
  data() {
    return {
      widget: {
        demo: true
      }
    }
  },
}
</script>

<style lang="sass" scoped>
.accounting
  display: flex
  &>div
    flex: 1 1 50%
</style>
