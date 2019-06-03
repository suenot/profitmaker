<template>
  <div>
    <div class="main"
      :style="`margin: 0 ${right}px 0 ${left}px`"
    >
      <router-view :key="$route.path" />
      <div class="notificationCookies" v-if="privacy_policy">
        <span>Pressing this button you agree with our <a href="#">Privacy Policy</a> <el-button type="success" icon="el-icon-check" circle @click="acceptConditions()"></el-button> </span>
      </div>
    </div>
    <Aside v-for="aside in asidesComputed" :key="aside.id" :aside="aside"/>

  </div>
</template>

<script>
import { observer } from 'mobx-vue'
import AccountsStore from './stores/AccountsStore'
import AsidesStore from './stores/AsidesStore'
import Store from './stores/Store'

export default observer({
  data: () => ({
      privacy_policy: true,
      flag: true,
      left: 0,
      right: 0,
    }
  ),
  storage: {
    keys: ['privacy_policy'],
    namespace: 'app',
  },
  fromMobx: {
    asidesTrigger: {
      get() {
        return AsidesStore.asidesTrigger
      }
    }
  },
  created() {
    this.$nextTick(() => {
      this.rerender()
    })
    AccountsStore.fetchUserData()
  },
  methods: {
    rerender() {
      window.dispatchEvent(new Event('resize'))
    },
    acceptConditions() {
      this.privacy_policy = false
    }
  },
  computed: {
    asidesComputed() {
      var trigger = this.asidesTrigger
      var asides = _.cloneDeep(AsidesStore.asides)
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
})
</script>

<style lang="sass">
html
  overflow-y: auto !important
body
  font-family: 'Helvetica', 'Arial', sans-serif
  &.day
    background: #fff
    color: #000
  &.night
    background: #000
    color: #fff
.cont-30
  padding: 30px
.nowrap
  white-space: nowrap
.hide
  display: none
.muted
  color: #969595
.divider
  border-bottom: 1px solid rgba(0, 0, 0, 0.12)
.spacer
  flex: 1 0 auto
.pointer
  cursor: pointer
.m-16
  margin: 16px
.m-16+.m-16
  margin-top: 16px !important
.p-16
  margin: 16px
.el-input, .el-select
  margin: 0


.notificationCookies
  position: fixed !important
  top: calc(100vh - 40px)
  height: 40px
  left: 60px
  right: 0
  z-index: 5000
  background: #919191
  text-align: center
  color: #fff
  font-size: 18px
  box-shadow: 0 0 14px grey
  a
    color: #6eff6e
  button
    margin-left: 20px



// TODO: make only global
.el-button.block
  width: 100%
.el-button.large
  font-size: 22px !important
.el-input-group__prepend.large
  min-width: 90px
  font-weight: 700
.el-select-dropdown.el-popper
  z-index: 1000000 !important
.el-select
  width: 100%

.kupi-table
  width: 100%
  min-height: 44px
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

.kupi-pseudoTable
  .pseudotable
    border-bottom: 1px solid rgba(0, 0, 0, 0.12)
    max-width: 100%
    .pseudotable-header
      .pseudotable-row
        display: flex
        flex-wrap: nowrap
        border-top: 1px solid rgba(0, 0, 0, 0.12)
        border-bottom: 1px solid rgba(0, 0, 0, 0.12)
        div
          border-left: 1px solid rgba(0, 0, 0, 0.12)
          padding: 5px
          font-size: 12px
          text-align: center
          font-weight: 700
    .pseudotable-body
      .pseudotable-row
        display: flex
        flex-wrap: nowrap
        // border-top: 1px solid rgba(0, 0, 0, 0.12)
        border-bottom: 1px solid rgba(0, 0, 0, 0.12)
        // &+.pseudotable-row
          // border-top: none
        div
          display: flex
          flex-wrap: nowrap
          border-left: 1px solid rgba(0, 0, 0, 0.12)
          padding: 5px
          overflow: hidden
          white-space: nowrap
          text-overflow: clip


.el-input
  font-size: 18px
  .el-input__inner
    height: 54px
    line-height: 54px
  .el-input-group__prepend
    padding: 0 10px
.el-button
  border-radius: 0 !important
  // width: 100%
.el-input__inner
  border-radius: 0 !important
.el-input-group__prepend
  border-radius: 0 !important
.el-input-group__append
  border-radius: 0 !important


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
  .aside-header
    display: flex
    border-bottom: 1px solid rgba(0, 0, 0, 0.12)
    justify-content: space-between
    .aside-title
      padding: 8px 16px
    .aside-actions
      i
        padding: 9px 16px
        cursor: pointer

  // align-items: center
.aside
  .section+.section
    border-top: 1px solid rgba(0, 0, 0, 0.12)


.title
  display: flex
  align-items: center
  .title-header
    text-align: center
    flex: 1 0 auto
</style>
