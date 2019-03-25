import { observable, action } from 'mobx'

class AsidesStore {
  constructor() {
    document.onkeyup = (e) => {
      if (e.keyCode==27) {
        this.asidesClose()
      }
    }
  }

  @observable asides = [

  ]

  @action getAsides(side) {

  }

  @action asideAdd(aside, component, width, side, data, dashboardId, widgetId) {

  }

  @action asidesClose() {

  }
}

const store = window.AsidesStore = new AsidesStore()

export default store
