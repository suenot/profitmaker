import { observable, action, computed, autorun } from 'mobx'

class GlobalStore {
    @observable stock = 'LIQUI'
    @observable pair = 'ETH_BTC'
    @observable coinFrom = 'ETH'
    @observable coinTo = 'BTC'
}

const store = window.GlobalStore = new GlobalStore()

export default store