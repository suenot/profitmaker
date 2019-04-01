import { observable, action, computed } from 'mobx'
// import { version, AsyncTrunk } from 'mobx-sync'
import axios from 'axios'

import { Notification } from 'element-ui'
class AccountsStore {
  constructor() {
    this.fetchUserData()
  }

  @observable user = {}
  @observable accounts = {}
  @observable accountsHash = ''

  @action fetchAccounts() {
    axios.get(`/user-api/auth/accounts`)
    .then((response) => {
      if (this.accountsHash === JSON.stringify(response.data)) return true
      this.accountsHash = JSON.stringify(response.data)
      this.accounts = response.data
    })
    .catch(() => {
      this.accounts = {}
    })
  }

  @action toLogout() {
    axios.get("/user-api/auth/logout")
    .then(() => {
      Notification({
        title: 'Success',
        message: 'Logged out',
        type: 'success'
      })
      this.fetchUserData()

    })
    .catch(() => {
      this.fetchUserData()
      Notification.error({
        title: 'Error',
        message: 'Cannot logout'
      })
    })
  }

  @action fetchUserData() {
    axios.get("/user-api/auth/user")
    .then((response) => {
      this.user = response.data
    })
    .catch(() => {
      this.user = {}
    })
    this.fetchAccounts()
  }

  @action toLogin(email, password) {
    console.log('toLogin')
    console.log(this.$notify)
    axios.post("/user-api/auth/login", {
      email,
      password
    })
    .then(() => {
      console.log('win')
      this.fetchUserData()
      Notification({
        title: 'Success',
        message: 'Logged in',
        type: 'success'
      })
    })
    .catch(() => {
      console.log('fail')
      Notification.error({
        title: 'Error',
        message: 'Cannot login'
      })
    })
  }

}

const store = window.AccountsStore = new AccountsStore()
export default store
