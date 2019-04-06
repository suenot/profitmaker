<template>
  <div>
    <Selector /><br />
    <CreateOrder type="buy" /><br />
    <CreateOrder type="sell" />
  </div>
</template>

<script>
export default {
  props: ['aside'],
}
</script>
