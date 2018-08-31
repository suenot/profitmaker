import React from 'react'
import ReactDOM from 'react-dom'
import './index.css'
import App from './App'
import registerServiceWorker from './registerServiceWorker'
import {Provider} from 'mobx-react'
import OrdersStore from './stores/OrdersStore'
import CreateOrderStore from './stores/CreateOrderStore'
import BalanceStore from './stores/BalanceStore'
import OpenOrdersStore from './stores/OpenOrdersStore'
import MyTradesStore from './stores/MyTradesStore'
import RawTradesStore from './stores/RawTradesStore'

const Root = (
    <Provider
      OrdersStore={OrdersStore}
      CreateOrderStore={CreateOrderStore}
      BalanceStore={BalanceStore}
      OpenOrdersStore={OpenOrdersStore}
      MyTradesStore={MyTradesStore}
      RawTradesStore={RawTradesStore}
    >
    <App />
  </Provider>
)

ReactDOM.render(Root, document.getElementById('root'))
registerServiceWorker()
