<template>
  <form class="login" @submit.prevent="toLogin()">
    <el-input placeholder="Email" v-model="email">
      <template slot="prepend">Email</template>
    </el-input>
    <el-input placeholder="Password" v-model="password" type="password">
      <template slot="prepend">Password</template>
    </el-input>
    <el-button type="primary" plain native-type="submit" class="block">Login</el-button>
  </form>
</template>


<script>
import AccountsStore from '../../stores/AccountsStore'
export default {
  data: () => ({
    email: '',
    password: '',
  }),
  fromMobx: {
    user() {
      return AccountsStore.user
    },
  },
  methods: {
    toLogin() {
      AccountsStore.toLogin(this.email, this.password)
    }
  }
}
</script>
