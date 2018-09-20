import { observable, action, computed } from 'mobx'
import axios from 'axios'
import GlobalStore from './GlobalStore'

class OhlcvStore {

  @computed get stock() {return GlobalStore.stock }
  @computed get stockLowerCase() {return GlobalStore.stockLowerCase }
  @computed get pair() {return GlobalStore.pair }

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
    axios.get(`http://api.kupi.network/${this.stockLowerCase}/ohlcv/${this.pair}`)
    axios.get(`http://api.kupi.network/${this.stockLowerCase}/ohlcv/${this.pair}`)
    .then((response) => {
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

}

const store = window.OhlcvStore = new OhlcvStore()

export default store

setInterval(() => {
  store.fetchOhlcv()
}, 5000)
