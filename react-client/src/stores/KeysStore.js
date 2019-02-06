import { observable, action } from 'mobx'
// import { version, AsyncTrunk } from 'mobx-sync'
import uuidv1 from 'uuid/v1'

// @version(2)
class KeysStore {
  // constructor() {
  //   const trunk = new AsyncTrunk(this, { storage: localStorage, storageKey: 'keys' })
  //   trunk.init()
  //   reaction(
  //     () => this.keys,
  //     () => trunk.updateStore(this)
  //   )
  // }
  @observable keys = [{"id":"0c53fac0-207a-11e9-89e8-e5dd80d4c0b9","name":"Binance demo key","stock":"binance","publicKey":"aaa-aaa","privateKey":"bbb-bbb","proxy":"","enabled":true},{"id":"8d934a50-207a-11e9-89e8-e5dd80d4c0b9","name":"Liqui demo key","stock":"liqui","publicKey":"aaa-aaa","privateKey":"bbb-bbb","proxy":"http://localhost:1000","enabled":false},{"id":"90945550-207a-11e9-89e8-e5dd80d4c0b9","name":"Bittrex demo key","stock":"bittrex","publicKey":"aaa-aaa","privateKey":"bbb-bbb","proxy":"","enabled":false},{"id":"90e49830-207a-11e9-89e8-e5dd80d4c0b9","name":"Tidex demo key","stock":"tidex","publicKey":"aaa-aaa","privateKey":"bbb-bbb","proxy":"","enabled":false}]
  @action setKeyData(id, key, value) {
    var index = _.findIndex(this.keys, ['id', id])
    this.keys[index][key] = value || ''
  }
  @action toggleKeyData(id, key) {
    var index = _.findIndex(this.keys, ['id', id])
    this.keys[index][key] = !this.keys[index][key]
  }
  // @observable counter = 0
  @action addKey() {
    this.keys.push({
      id: uuidv1(),
      name: 'Undefined key',
      stock: 'binance',
      publicKey: '',
      privateKey: '',
      proxy: '',
      enabled: false
    })
    // this.counter += 1
  }
  @action removeKey(id) {
    console.log(JSON.stringify(this.keys))
    this.keys = _.filter(this.keys, (key)=>{
      if (key.id !== id) return true
      return false
    })
    // console.log(JSON.stringify(this.keys))
  }
}

const store = window.KeysStore = new KeysStore()
export default store
