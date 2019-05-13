<template>
  <div>
    <MyTrades :widget="widget" />
    <br>
    <Deal />
    <br>
    <Deals />
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
</style>
