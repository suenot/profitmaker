<template>
  <div class="profile-aside">
    <div class="body">
      <Profile v-if="userRender" />
      <Login  v-if="!userRender" />
      <Accounts v-if="accountsRender"/>
    </div>
    <div class="footer">
      <Logout v-if="userRender"/>
    </div>
  </div>
</template>

<script>
import AccountsStore from '../../stores/AccountsStore'
export default {
  fromMobx: {
    userRender() {
      return AccountsStore.userRender
    },
    accountsRender() {
      return AccountsStore.accountsRender
    },
  }
}
</script>

<style lang="sass">
.profile-aside
  display: flex
  flex-direction: column
  height: calc(100vh - 38px)
  .body
    flex: 1 0 auto
</style>
