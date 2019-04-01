import { observable, action, computed } from 'mobx'
// import { version, AsyncTrunk } from 'mobx-sync'
import axios from 'axios'
import _ from 'lodash'

import { Notification } from 'element-ui'
class AccountsStore {
  @observable user = {}
  @observable accounts = {}
  @action fetchAccounts() {
    axios.get(`/user-api/auth/accounts`)
    .then((response) => {
      this.accounts = response.data
    })
    .catch(() => {
      this.accounts = {}
    })
  }

  @computed get userRender() {
    return JSON.stringify(this.user) === '{}' ? false : true
  }
  @computed get accountsRender() {
    return JSON.stringify(this.accounts) === '{}' ? false : true
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
      Notification.error({
        title: 'Error',
        message: 'Cannot logout'
      })
      this.fetchUserData()
    })
  }

  @action fetchUserData() {
    axios.get("/user-api/auth/user")
    .then((response) => {
      this.user = response.data
      this.fetchAccounts()
    })
    .catch(() => {
      this.user = {}
      this.fetchAccounts()
    })
  }

  @action toLogin(email, password) {
    axios.post("/user-api/auth/login", {
      email,
      password
    })
    .then(() => {
      this.fetchUserData()
      Notification({
        title: 'Success',
        message: 'Logged in',
        type: 'success'
      })
    })
    .catch(() => {
      this.fetchUserData()
      Notification.error({
        title: 'Error',
        message: 'Cannot login'
      })
    })
  }

}

const store = window.AccountsStore = new AccountsStore()
export default store
