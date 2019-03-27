import { observable, action } from 'mobx'
import uuidv1 from 'uuid/v1'

class AsidesStore {
  constructor() {
    document.onkeyup = (e) => {
      if (e.keyCode==27) {
        this.asidesClose()
      }
    }
  }

  @observable asides = [
    {
      key: '1',
      side: 'left',
      width: 60,
      component: 'Menu',
    },
    // {
    //   key: '3',
    //   side: 'left',
    //   width: 320,
    //   component: 'Pairs',
    // },
    // {
    //   key: '2',
    //   side: 'right',
    //   width: 320,
    //   component: 'Stocks',
    // },
  ]

  @action getAsides(side) {

  }

  @action addAside(component, side, width, data, dashboardId, widgetId) {
    this.asides.push({
      key: uuidv1(),
      side: side || 'left',
      width: width || 320,
      component: component || 'Empty',
    })
  }

  @action closeAsides() {

  }
}

const store = window.AsidesStore = new AsidesStore()

export default store
