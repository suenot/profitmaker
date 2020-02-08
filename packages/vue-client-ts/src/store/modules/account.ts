import {AccountState, RootState} from '@/types'
import axios from 'axios'
import {Notification} from 'element-ui'
import {Module} from 'vuex'

export default {
  namespaced: true,
  state: {
    user: {},
    kupiUser: {
      picture: {
        data: {url: ''}
      }
    },
    accounts: []
  },
  actions: {
    fetchAccounts () {
      axios.get(`/user-api/auth/accounts`)
        .then((response) => {
          // this.accounts = response.data
          // this.accountsTrigger = !this.accountsTrigger
        })
        .catch(() => {
          // this.accounts = []
          // this.accountsTrigger = !this.accountsTrigger
        })
    },
    toLogout () {
      axios.get('/user-api/auth/logout')
        .then(() => {
          Notification({
            title: 'Success',
            message: 'Logged out',
            type: 'success'
          })
          // this.fetchUserData()
        })
        .catch(() => {
          Notification.error({
            title: 'Error',
            message: 'Cannot logout'
          })
          // this.fetchUserData()
        })
    },

    toLogoutKupi () {
      axios.get('/api/auth/logout')
        .then(() => {
          Notification({
            title: 'Success',
            message: 'Logged out',
            type: 'success'
          })
          // this.fetchUserData()
        })
        .catch(() => {
          Notification.error({
            title: 'Error',
            message: 'Cannot logout'
          })
          // this.fetchUserData()
        })
    },

    fetchUserData () {
      axios.get('/user-api/auth/user')
        .then((response) => {
          // this.user = response.data
          // this.fetchAccounts()
        })
        .catch(() => {
          // this.user = {}fetchUserData
          // this.fetchAccounts()
        })

      axios.get('/api/auth/user_data')
        .then((response) => {
          // this.kupiUser = response.data.user.json
        })
        .catch(() => {
          // this.kupiUser = {
          //   picture: {
          //     data: { url: '' }
          //   }
          // }
        })
    },
    // @action toLoginKupi() {
    //   axios.get('/api/auth/facebook')
    //   .then((response) => {
    //     // this.result = response.data
    //     console.log(response.data)
    //   })
    //   .catch((error) => {
    //     // this.result = JSON.stringify(error)
    //     console.log(error)
    //   })
    // }
    toLogin ({commit}, {email, password}: {email: string, password: string}) {
      axios.post('/user-api/auth/login', {
        email,
        password
      })
        .then(() => {
          // this.fetchUserData()
          Notification({
            title: 'Success',
            message: 'Logged in',
            type: 'success'
          })
        })
        .catch(() => {
          // this.fetchUserData()
          Notification.error({
            title: 'Error',
            message: 'Cannot login'
          })
        })
    }
  }
} as Module<AccountState, RootState>
