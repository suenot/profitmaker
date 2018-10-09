import { version, AsyncTrunk, ignore } from 'mobx-sync'
import { observable, action, computed } from 'mobx'
import axios from 'axios'
import _ from 'lodash'

@version(1)
class PairsStore {
  constructor(GlobalStore) {
    this.GlobalStore = GlobalStore
    const trunk = new AsyncTrunk(this, { storage: localStorage, storageKey: 'pairs' })
    trunk.init()
  }
  @observable pair = 'ETH_BTC'
  @ignore @observable pairsFilter = ''
  @computed get base() {
    return this.pair.split('_')[0]
  }
  @computed get quote() {
    return this.pair.split('_')[1]
  }

  @ignore @observable pairs = []

  @computed get pairsComputed() {
    return this.pairs.filter( (pair) => {
      return pair.toLowerCase().indexOf( this.pairsFilter.toLowerCase() ) !== -1
    })
  }

  @action setPairsFilter(_pair) {
    this.pairsFilter = _pair
  }



  @action setPair(_pair) {
    this.pair = _pair
  }

  @action async fetchPairs() {
    axios.get(`http://api.kupi.network/${this.stockLowerCase}/pairs/`)
    .then((response) => {
      this.pairs = response.data.map((pair) => {
        return pair.split('/').join('_')
      })
    })
    .catch((error) => {
      this.pairs = []
      console.log(error) })
  }
}

// const store = window.PairsStore = new PairsStore()
// export default store

export default PairsStore

