<template>
  <div class="profile-aside">
    <div class="profile-aside-terminal">
      <div class="body">
        <div class="block-header">
          <div class="block-title">
            Profile on user own terminal server for trading
          </div>
        </div>
        <Profile v-if="userRender" server="terminal" />
        <Accounts v-if="accountsRender"/>
      </div>
      <div class="footer">
        <Login  v-if="!userRender" />
        <Logout v-if="userRender"/>
      </div>
    </div>
    <!-- <div class="profile-aside-kupi">
      <div class="body">
        <div class="block-header">
          <div class="block-title">
            Profile on KUPI api server for signals
          </div>
        </div>
        <Profile v-if="userRenderKupi" server="kupi" />
      </div>
      <div class="footer">
        <el-button v-if="!userRenderKupi" type="primary" plain @click="toLoginKupi()">Login with Facebook</el-button>
        <el-button v-if="userRenderKupi" type="danger" plain @click="toLogoutKupi()">Logout</el-button>
      </div>
    </div> -->
  </div>
</template>

<script>
import AccountsStore from '../../stores/AccountsStore'
export default {
  fromMobx: {
    userRender() {
      return AccountsStore.userRender
    },
    userRenderKupi() {
      return AccountsStore.userRenderKupi
    },
    accountsRender() {
      return AccountsStore.accountsRender
    },
  },
  methods: {
    toLoginKupi() {
      window.location.href = '/api/auth/facebook'
    },
    toLogoutKupi() {
      AccountsStore.toLogoutKupi()
    }
  }
}
</script>

<style lang="sass">
.profile-aside
  display: flex
  .profile-aside-terminal
    display: flex
    flex-direction: column
    height: calc(100vh - 38px)
    flex: 0 0 auto
    // width: 50%
    width: 100%
    border-right: 1px solid rgba(0, 0, 0, 0.12)
    .body
      flex: 1 0 auto
  .profile-aside-kupi
    display: flex
    flex-direction: column
    height: calc(100vh - 38px)
    flex: 0 0 auto
    width: 50%
    .body
      flex: 1 0 auto
</style>
