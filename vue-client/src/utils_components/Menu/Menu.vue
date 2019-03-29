<template>
  <div class="menu">
    <ul>
      <el-tooltip content="Trade" placement="right">
        <router-link tag="li" to="/trade"><img src="/img/widgets/002-business-and-finance.svg"></router-link>
      </el-tooltip>
      <el-tooltip content="Balance" placement="right">
        <router-link tag="li" to="/balance"><img src="/img/widgets/040-business-and-finance-18.svg"></router-link>
      </el-tooltip>
    </ul>
    <div class="spacer"></div>
    <ul class="ul-bottom">
      <el-tooltip content="Profile" placement="right">
        <li v-if="user" @click="showProfile()" class="avatar"><img src="/_img/avatar.jpeg"></li>
        <li v-else @click="showProfile()"><img src="/img/widgets/051-user.svg"></li>
      </el-tooltip>
      <el-tooltip content="User" placement="right">
      </el-tooltip>
    </ul>
  </div>
</template>

<script>
import AsidesStore from '../../stores/AsidesStore'
export default {
  data: () => ({
      user: false
    }
  ),
  methods: {
    showProfile() {
      var component = 'Profile'
      var title = 'Profile'
      var side = 'left'
      var width = 640
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

