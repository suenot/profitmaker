<template>
  <div class="logout">
    <el-button type="danger" plain @click="toLogout()">Logout</el-button>
  </div>
</template>


<script>
import AccountsStore from '../../stores/AccountsStore'
export default {
  fromMobx: {
    user() {
      return AccountsStore.user
    },
  },
  methods: {
    toLogout() {
      AccountsStore.toLogout()
    }
  }
}
</script>

<style lang="sass">
// TODO trash
.logout
  button
    font-size: 22px
  .el-input-group__prepend
    min-width: 90px
    font-weight: 700
</style>
