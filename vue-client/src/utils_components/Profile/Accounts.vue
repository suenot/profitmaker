<template>
  <div class="accounts">
    {{accounts}}
  </div>
</template>


<script>
import AccountsStore from '../../stores/AccountsStore'
export default {
  data() {
    return {
      accounts: require('./data.js').default
    }
  },
  // fromMobx: {
  //   accounts: {
  //     get() {
  //       return AccountsStore.accounts
  //     }
  //   },
  // },
}
</script>

<style lang="sass"></style>
