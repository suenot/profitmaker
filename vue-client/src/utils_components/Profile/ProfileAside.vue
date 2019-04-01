<template>
  <div class="profile-aside">
    <Profile v-if="userRender" />
    <Login  v-if="!userRender" />
    <Logout v-if="userRender"/>
    <Accounts v-if="accountsRender"/>
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
