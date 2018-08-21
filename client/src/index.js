import React from 'react'
import ReactDOM from 'react-dom'
import './index.css'
import App from './App'
import registerServiceWorker from './registerServiceWorker'
import {Provider} from 'mobx-react'
import OrdersStore from './stores/OrdersStore'
import CreateOrderStore from './stores/CreateOrderStore'
import BalanceStore from './stores/BalanceStore'

const Root = (
    <Provider
      OrdersStore={OrdersStore}
      CreateOrderStore={CreateOrderStore}
      BalanceStore={BalanceStore}
    >
    <App />
  </Provider>
)

ReactDOM.render(Root, document.getElementById('root'))
registerServiceWorker()
