<template>
  <div class="menu">
    <ul>
      <el-tooltip content="Trade" placement="right">
        <router-link tag="li" to="/trade"><img src="/img/widgets/trade.svg"></router-link>
      </el-tooltip>
      <el-tooltip content="Balance" placement="right">
        <router-link tag="li" to="/balance"><img src="/img/widgets/balance.svg"></router-link>
      </el-tooltip>
      <el-tooltip content="Accounting" placement="right">
        <router-link tag="li" to="/deals"><img src="/img/widgets/accounting.svg"></router-link>
      </el-tooltip>
      <el-tooltip content="Sentiments" placement="right">
        <router-link tag="li" to="/sentiments/btc"><img src="/img/widgets/sentiments.svg"></router-link>
      </el-tooltip>
      <!-- <el-tooltip content="Signals" placement="right">
        <router-link tag="li" to="/signals"><img src="/img/widgets/021-order.svg"></router-link>
      </el-tooltip> -->
    </ul>
    <div class="spacer"></div>
    <ul class="ul-bottom">
      <!-- v-if="$route.name === 'Trade'" -->
      <el-tooltip content="Create order" placement="right">
        <li @click="showCreateOrder()"><img src="/img/widgets/auction.svg"></li>
      </el-tooltip>
      <el-tooltip content="Profile" placement="right">
        <li v-if="kupiUser && kupiUser.picture && kupiUser.picture.data && kupiUser.picture.data.url" @click="showProfile()" class="avatar"><img :src="avatar"></li>
        <li v-else @click="showProfile()"><img src="/img/widgets/user.svg"></li>
      </el-tooltip>
      <el-tooltip content="User" placement="right">
      </el-tooltip>
    </ul>
  </div>
</template>

<script>
import AccountsStore from '@/stores/AccountsStore'
import AsidesStore from '@/stores/AsidesStore'
export default {
  data: () => ({
      user: false
    }
  ),
  fromMobx: {
    kupiUser: {
      get() {
        return AccountsStore.kupiUser
      }
    },
  },
  methods: {
    showProfile() {
      var component = 'ProfileAside'
      var title = 'Profile'
      var side = 'left'
      var width = 361
      var data = {}
      AsidesStore.addAside(component, title, side, width, data)
    },
    showCreateOrder() {
      var component = 'CreateOrderAside'
      var title = 'Create order'
      var side = 'left'
      var width = 361
      var data = {}
      AsidesStore.addAside(component, title, side, width, data)
    }
  },
}
</script>

<style lang="sass" scoped>
.menu
  display: flex
  flex-direction: column
  height: 100vh
  ul
    list-style: none
    margin: 0
    padding: 0
    li
      border-bottom: 1px solid rgba(0, 0, 0, 0.12)
      padding: 10px
      display: flex
      justify-content: center
      align-items: center
      position: relative
      &:hover
        background: rgba(0, 0, 0, 0.08)
        cursor: pointer
      &.active:after
        display: block
        content: ''
        position: absolute
        right: 0px
        border-right: 1px solid #049bfd
        height: 100%
      img
        width: 24px
        height: 24px
    .avatar
      img
        border-radius: 100%
  .ul-bottom
    li:first-child
      border-top: 1px solid rgba(0, 0, 0, 0.12)
</style>

