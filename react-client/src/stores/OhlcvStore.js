import { observable, action, computed } from 'mobx'
import axios from 'axios'
import DashboardsStore from './DashboardsStore'
import SettingsStore from './SettingsStore'

class OhlcvStore {
  constructor() {
    const start = () => {
      this.fetchOhlcv()
    }
    start()
    setInterval(() => {
      if ( this.counter > 0 && (SettingsStore.fetchEnabled.value) ) start()
    }, 5000)
  }
  @computed get stock() {return DashboardsStore.stock }
  @computed get stockLowerCase() {return DashboardsStore.stockLowerCase }
  @computed get pair() {return DashboardsStore.pair }
  @computed get serverBackend() {return SettingsStore.serverBackend.value }

  hash = ''
  @observable ohlcv = []

  @computed get ohlcvComputed() {
    if ( JSON.stringify(this.ohlcv) !== '[]' ) {
      return this.ohlcv.map((item) => {
        return {
          'date': new Date(item[0]),
          'open': item[1],
          'high': item[2],
          'low': item[3],
          'close': item[4],
          'volume': item[5],
          'absoluteChange': '',
          'dividend': '',
          'percentChange': '',
          'split': '',
        }
      })
    } else {
      return []
    }
  }

  @action async fetchOhlcv() {
    axios.get(`${this.serverBackend}/${this.stockLowerCase}/ohlcv/${this.pair}`)
    .then((response) => {
      if (this.hash === JSON.stringify(response.data)) return true
      this.hash = JSON.stringify(response.data)

      if (!response.data) {
        this.ohlcv = []
      } else {
        this.ohlcv = response.data
      }
    })
    .catch((error) => {
      this.ohlcv = []
    })
  }

  counter = 0
  @action count(n) {
    this.counter += n
  }
}

const store = window.OhlcvStore = new OhlcvStore()
export default store
