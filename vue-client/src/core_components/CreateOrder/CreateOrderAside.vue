<template>
  <div>
    <Selector /><br />
    <CreateOrder type="buy" :widget="widget"/><br />
    <CreateOrder type="sell" :widget="widget"/>
  </div>
</template>

<script>
export default {
  props: ['aside'],
}
</script>
