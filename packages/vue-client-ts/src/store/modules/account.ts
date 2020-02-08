import {Action, Module, VuexModule} from 'vuex-module-decorators'
import {Account, KupiUser} from '@/types'
import axios from 'axios'
import {Notification} from 'element-ui'

@Module({namespaced: true, name: 'account'})
export default class AccountModule extends VuexModule {
  private _user: any = {}

  _kupiUser: KupiUser = {
    picture: {
      data: {url: ''}
    }
  }

  accounts: Account[] = []

  @Action
  async fetchAccounts () {
    axios.get(`/user-api/auth/accounts`)
      .then((response) => {
        // this.accounts = response.data
        // this.accountsTrigger = !this.accountsTrigger
      })
      .catch(() => {
        // this.accounts = []
        // this.accountsTrigger = !this.accountsTrigger
      })
  }

  @Action
  async toLogout () {
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
  }

  @Action
  async toLogoutKupi () {
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
  }

  @Action
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
  }

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

  @Action
  async toLogin (email: string, password: string) {
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
