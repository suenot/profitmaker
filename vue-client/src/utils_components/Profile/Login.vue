<template>
  <div class="login">
    <el-input placeholder="Price" v-model="email">
      <template slot="prepend">Email</template>
    </el-input>
    <el-input placeholder="Password" v-model="password" type="password">
      <template slot="prepend">Password</template>
    </el-input>
    <el-button type="primary" plain @click="toLogin()">Login</el-button>
  </div>
</template>


<script>
import AccountsStore from '../../stores/AccountsStore'
export default {
  data: () => ({
      email: '',
      password: ''
    }
  ),
  methods: {
    toLogin() {
      AccountsStore.toLogin(this.email, this.password)
    }
  }
}
</script>

<style lang="sass">
// TODO trash
.login
  button
    font-size: 22px
  .el-input-group__prepend
    min-width: 90px
    font-weight: 700
</style>
