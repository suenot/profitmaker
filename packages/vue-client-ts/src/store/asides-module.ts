import uuidv1 from 'uuid/v1'
import { Action, Module, VuexModule } from 'vuex-module-decorators'
import { Aside, ComponentName, Side, WidgetConfig } from '@/types'
import _ from 'lodash'

@Module({
  namespaced: true
})
export default class AsidesModule extends VuexModule {
  asidesTrigger: boolean = false
  asides: Aside[] = [
    {
      id: '1',
      side: 'left',
      width: 60,
      component: 'Menu',
      title: '',
      permanent: true
    },
    // {
    //   id: '2',
    //   side: 'right',
    //   width: 320,
    //   component: 'Stocks'
    // },
    // {
    //   id: '3',
    //   side: 'left',
    //   width: 320,
    //   component: 'Pairs'
    // }
  ]

  @Action
  addAside (component: ComponentName, title: string, side: Side, width: number, widget: WidgetConfig, dashboardId: string, widgetId: string) {
    for (let aside of this.asides) {
      if (!aside.permanent && JSON.stringify(aside.widget) === JSON.stringify(widget) && aside.side === side &&
          aside.width === width && aside.component === component) {
        this.removeAside(aside.id)
        return
      }
    }
    // add new aside
    this.asides.push({
      id: uuidv1(),
      side: side || 'left',
      width: width || 320,
      component: component || 'Empty',
      title: title || '',
      permanent: false,
      widget: widget
    })
    this.asidesTrigger = !this.asidesTrigger
  }

  @Action
  removeAside (id: string) {
    this.asides = _.filter(this.asides, aside => aside.id !== id)
    this.asidesTrigger = !this.asidesTrigger
  }

  @Action
  removeAsides () {
    this.asides = _.filter(this.asides, (aside) => {
      return aside.permanent === true
    })
    this.asidesTrigger = !this.asidesTrigger
  }
}
