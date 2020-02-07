import { Action, Module, VuexModule } from 'vuex-module-decorators'
import { KupiUser } from '../types'
import axios from 'axios'
import { Notification } from 'element-ui'

@Module({
  namespaced: true
})
export default class AccountsModule extends VuexModule {
  private _user: any = {}

  _kupiUser: KupiUser = {
    picture: {
      data: { url: '' }
    }
  }
  accounts: any = {}

  set user (value: any) {
    this._user = value
  }

  get user (): any {
    return this._user
  }

  @Action
  fetchAccounts () {
    axios.get(`/user-api/auth/accounts`)
      .then((response) => {
        this.accounts = response.data
        // this.accountsTrigger = !this.accountsTrigger
      })
      .catch(() => {
        this.accounts = {}
        // this.accountsTrigger = !this.accountsTrigger
      })
  }

  set kupiUser (user : any) {
    this._kupiUser = user
  }

  get kupiUser () {
    return this._kupiUser
  }

  get userRender () {
    return JSON.stringify(this._user) !== '{}'
  }

  get userRenderKupi () {
    return JSON.stringify(this.kupiUser) !== '{}'
  }

  get accountsRender () {
    return JSON.stringify(this.accounts) !== '{}'
  }

  @Action
  toLogout () {
    axios.get('/user-api/auth/logout')
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

  @Action
  toLogoutKupi () {
    axios.get('/api/auth/logout')
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

  @Action
  fetchUserData () {
    axios.get('/user-api/auth/user')
      .then((response) => {
        // this.user = response.data
        // this.fetchAccounts()
      })
      .catch(() => {
        // this.user = {}
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
  toLogin (email: string, password: string) {
    axios.post('/user-api/auth/login', {
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
