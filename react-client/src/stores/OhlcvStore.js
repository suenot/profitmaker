import { observable, action, computed, autorun } from 'mobx'
import axios from 'axios'
import GlobalStore from './GlobalStore'

class OhlcvStore {

  @computed get stock() {return GlobalStore.stock }
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
    axios.get(`http://144.76.109.194:8051/ohlcv/${this.stock}/${this.pair}`)
    .then((response) => {
      this.ohlcv = response.data.data
    })
    .catch((error) => {
      this.ohlcv = []
    })
  }

}

const store = window.OhlcvStore = new OhlcvStore()

export default store

autorun(() => {
  console.log(store.stock)
  console.log(store.pair)
  store.fetchOhlcv()
})
