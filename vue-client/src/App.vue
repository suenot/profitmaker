<template>
  <div>
    <div class="main"
      :style="`margin: 0 ${right}px 0 ${left}px`"
    >
      <router-view :key="$route.path" />
    </div>
    <Aside
      v-for="aside in asidesComputed" :key="aside.id" :class="`aside active aside-${aside.side}`"
      :style="`left: ${aside.left}px; right: ${aside.right}px; width: ${aside.width}px;`"
      :aside="aside"
    />
  </div>
</template>

<script>
import { observer } from 'mobx-vue'

import DashboardsStore from './stores/DashboardsStore'
import AsidesStore from './stores/AsidesStore'
import Store from './stores/Store'
// import DrawersStore from './stores/DrawersStore'

export default observer({
  data: () => ({
      flag: true,
      // dialog: false,
      // drawer: null,
      // drawerRight: null,
      // newId: '3',
      // state: DashboardsStore,
      // drawersStore: DrawersStore,
      // dashboardActiveId: '',
      left: 0,
      right: 0,
      // asides: [
      //   {
      //     key: '1',
      //     side: 'left',
      //     width: 60,
      //     component: 'Menu',
      //   },
      //   // {
      //   //   key: '3',
      //   //   side: 'left',
      //   //   width: 320,
      //   //   component: 'Pairs',
      //   // },
      //   // {
      //   //   key: '2',
      //   //   side: 'right',
      //   //   width: 320,
      //   //   component: 'Stocks',
      //   // },
      // ]
    }
  ),
  fromMobx: {
    background: {
      get() {
        return Store.background
      }
    },
    color: {
      get() {
        return Store.color
      }
    },
    asides: {
      get() {
        return AsidesStore.asides
      }
    },
    asidesTrigger: {
      get() {
        return AsidesStore.asidesTrigger
      }
    }
  },
  created() {
    // if (this.$route.name === 'Dashboard') this.dashboardActiveId = this.$route.params.id
    // document.addEventListener('resize', this.asidesComputed)
    // setTimeout(()=>{
    //   // this.asidesComputed()
    //   // this.flag = !this.flag
    //   window.dispatchEvent(new Event('resize'))
    // }, 10)
    this.$nextTick(() => {
      this.rerender()
    })
  },
  mounted() {

  },
  methods: {
    rerender() {
      window.dispatchEvent(new Event('resize'))
    }
    // openDashboard: function(id) {
    //   this.$router.push({ name: 'Dashboard', params: { id: id } })
    //   this.dashboardActiveId = id
    // },
  },
  computed: {
    asidesComputed() {
      var trigger = this.asidesTrigger
      var asides = _.cloneDeep(this.asides)
      var left = 0
      var right = 0
      var paddingLeft = 0
      var paddingRight = 0
      asides = _.map(asides, (aside)=>{
        if (aside.side === 'left') {
          aside.left = left
          left += aside.width
          if (aside.permanent) paddingLeft += aside.width
        } else {
          aside.right = right
          right += aside.width
          if (aside.permanent) paddingRight += aside.width
        }
        return aside
      })
      this.left = paddingLeft
      this.right = paddingRight
      this.rerender()
      return asides
    }
  },
  // created() {
  //   document.addEventListener('resize', this.asidesComputed)
  // },
  // destroyed() {
  //   document.removeEventListener('resize', this.asidesComputed)
  // }
})
</script>

<style lang="sass">
body
  font-family: 'Helvetica', 'Arial', sans-serif
  &.day
    background: #fff
    color: #000
  &.night
    background: #000
    color: #fff
.muted
  color: #969595
.divider
  border-bottom: 1px solid rgba(0, 0, 0, 0.12)
.spacer
  flex: 1 0 auto

.aside
  width: 320px
  z-index: 500000
  height: 100vh
  position: fixed
  left: 0
  top: 0
  display: flex
  flex-direction: column
  background: white
  overflow-x: hidden
  overflow-y: auto
  &.aside-left
    border-right: 1px solid rgba(0, 0, 0, 0.12)
  &.aside-right
    border-left: 1px solid rgba(0, 0, 0, 0.12)
    left: auto
    right: 0

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
