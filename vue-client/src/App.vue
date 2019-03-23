<template>
  <div>
    <div class="aside-left">
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
        <el-tooltip content="Login" placement="right">
          <li><img src="/img/widgets/051-user.svg"></li>
        </el-tooltip>
        <el-tooltip content="User" placement="right">
          <li class="avatar"><img src="/_img/avatar.jpeg"></li>
        </el-tooltip>
      </ul>
      <!-- <ul>
        <li @click="state.addDashboard()"><v-icon>add_to_queue</v-icon></li>
        <li
          v-for="dashboard in state.dashboards"
          :key="dashboard.id"
          @click.left="openDashboard(dashboard.id)"
          @click.right="state.removeDashboard(dashboard.id)"
          :class="dashboard.id === dashboardActiveId ? 'active' : ''"
        >
          <img :src="dashboard.icon" alt="">
        </li>
        <li @click="addWidget()"><v-icon>add</v-icon></li>
        <li @click="drawerRightToggle()"><v-icon>add</v-icon></li>
      </ul> -->
    </div>
    <div class="main">
       <router-view :key="$route.path" />
    </div>
    <div id="aside-right" :class="'aside-right' + (drawersStore.drawerRightOpen ? ' active' : '')">
      <!-- <component is="Market"></component> -->
      <Market />
    </div>
  </div>
</template>

<script>
import { observer } from 'mobx-vue'

import DashboardsStore from './stores/DashboardsStore'
import DrawersStore from './stores/DrawersStore'

export default observer({
  data: () => ({
      dialog: false,
      drawer: null,
      drawerRight: null,
      newId: '3',
      state: DashboardsStore,
      drawersStore: DrawersStore,
      dashboardActiveId: ''
    }
  ),
  created() {
    if (this.$route.name === 'Dashboard') this.dashboardActiveId = this.$route.params.id
  },
  methods: {
    openDashboard: function(id) {
      this.$router.push({ name: 'Dashboard', params: { id: id } })
      this.dashboardActiveId = id
      // console.log(this.$route)
      // console.log(id)
    },
    // addDashboard: function() {
    //   this
    // }
    // editDashboard: function() {
    //   this.drawerRight = !this.drawerRight
    // },
    // removeDashboard: function(id) {
    //   this.$delete(this.dashboards, id)
    // }
    // addWidget: function() {
    //   this.$bus.emit('addWidget')
    // },
    drawerRightToggle: function() {
      DrawersStore.drawerRightToggle()
    }
  },
})
</script>

<style lang="sass">
body
  font-family: 'Helvetica', 'Arial', sans-serif
.muted
  color: #969595
.divider
  border-bottom: 1px solid rgba(0, 0, 0, 0.12)
.spacer
  flex: 1 0 auto
.aside-left
  width: 72px
  max-width: 72px
  border-right: 1px solid rgba(0, 0, 0, 0.12)
  height: 100vh
  position: fixed
  left: 0
  top: 0
  display: flex
  flex-direction: column
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
.aside-right
  width: 320px
  display: none
  position: fixed
  right: 0
  top: 0
  height: 100%
  border-left: 1px solid rgba(0, 0, 0, 0.12)
  background: #fff
  &.active
    display: block
.main
  margin-left: 72px
.kupi-table
  width: 100%
  table
    border-collapse: collapse
    width: 100%
    tbody
      tr:hover
        cursor: pointer
        background: rgba(0,0,0,0.08)
      tr.died
        opacity: 0.5
    td, th
      border: 1px solid rgba(0,0,0,0.12)
      padding: 5px
</style>
