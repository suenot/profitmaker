import uuidv1 from 'uuid/v1'
import {AsideState, ComponentName, RootState, Side, WidgetConfig} from '@/types'
import _ from 'lodash'
import {Module} from 'vuex'

export default {
  namespaced: true,
  state: {
    asidesTrigger: false,
    asides: [
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
  },
  mutations: {
    addAside (state, {component, title = '', side = 'left', width = 320, widget, dashboardId, widgetId}: {
      component: ComponentName, title: string, side: Side, width: number, widget: WidgetConfig, dashboardId: string, widgetId: string
    }) {
      console.log(arguments[1])
      for (let aside of state.asides) {
        const id = aside.id
        if (!aside.permanent && JSON.stringify(aside.widget) === JSON.stringify(widget) && aside.side === side &&
          aside.width === width && aside.component === component) {
          state.asides = _.filter(state.asides, aside => aside.id !== id)
          state.asidesTrigger = !state.asidesTrigger
          return
        }
      }
      // add new aside
      state.asides = [...state.asides, {
        id: uuidv1(),
        side,
        width,
        component,
        title,
        permanent: false,
        widget
      }]
      state.asidesTrigger = !state.asidesTrigger
    },
    removeAside (state, id: string) {
      state.asides = _.filter(state.asides, aside => aside.id !== id)
      state.asidesTrigger = !state.asidesTrigger
    },
    removeAsides (state) {
      state.asides = _.filter(state.asides, (aside) => aside.permanent)
      state.asidesTrigger = !state.asidesTrigger
    }
  },
} as Module<AsideState, RootState>
