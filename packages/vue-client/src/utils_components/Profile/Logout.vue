<template>
  <div class="logout">
    <el-button type="danger" plain class="block" @click="toLogout()">Logout</el-button>
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
