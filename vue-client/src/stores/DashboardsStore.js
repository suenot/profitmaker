import { observable, action, reaction, computed } from 'mobx'
import { version, AsyncTrunk } from 'mobx-sync'
import _ from 'lodash'
import axios from 'axios'


@version(3)
class DashboardsStore {
  constructor() {
    const trunk = new AsyncTrunk(this, { storage: localStorage, storageKey: 'dashboards' })
    trunk.init()
    reaction(
      () => this.widgets,
      () => trunk.updateStore(this)
    )
  }

  @observable dashboards = {
    '1': {"id":"1","name":"First","bg":"#ccc","icon":"/img/widgets/viking-ship.svg","type":"terminal","stock":"BINANCE","pair":"ETH_BTC","widgets":[{"i":"1","uid":"1_1","name":"selector","component":"core_components/Selector/Selector.js","settings":"core_components/Selector/Settings.js","settingsWidth":"300px","header":"Selector","customHeader":"","data":{"stock": "BINANCE", "pair": "ETH_BTC", "group":"", "groupColor": ""},"x":0,"y":0,"w":7,"h":4,"minW":2,"minH":3}],"counter":"1"},
  }


}

const store = window.DashboardsStore = new DashboardsStore()
export default store
