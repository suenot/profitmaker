<template>
  <div>
    <div class="aside-left">
      <ul>
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
        <!-- <li @click="addWidget()"><v-icon>add</v-icon></li> -->
        <li @click="drawerRightToggle()"><v-icon>add</v-icon></li>
      </ul>
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
.divider
  border-bottom: 1px solid rgba(0, 0, 0, 0.12)

.aside-left
  width: 72px
  max-width: 72px
  border-right: 1px solid rgba(0, 0, 0, 0.12)
  height: 100vh
  position: fixed
  left: 0
  top: 0
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
</style>
