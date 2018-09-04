import React from 'react'
import ReactDOM from 'react-dom'
import './index.css'
import App from './App'
import registerServiceWorker from './registerServiceWorker'
import {Provider} from 'mobx-react'

// stores
import OrdersStore from './stores/OrdersStore'
import BalanceStore from './stores/BalanceStore'
import OpenOrdersStore from './stores/OpenOrdersStore'
import MyTradesStore from './stores/MyTradesStore'
import RawTradesStore from './stores/RawTradesStore'
import DashboardsStore from './stores/DashboardsStore'
import OhlcvStore from './stores/OhlcvStore'
import GlobalStore from './stores/GlobalStore'
import CreateOrderStore from './stores/CreateOrderStore'

const Root = (
  <Provider
    GlobalStore={GlobalStore}
    DashboardsStore={DashboardsStore}
    OrdersStore={OrdersStore}
    BalanceStore={BalanceStore}
    OpenOrdersStore={OpenOrdersStore}
    MyTradesStore={MyTradesStore}
    RawTradesStore={RawTradesStore}
    OhlcvStore={OhlcvStore}
    CreateOrderStore={CreateOrderStore}
  >
    <App />
  </Provider>
)

ReactDOM.render(Root, document.getElementById('root'))
registerServiceWorker()
