module.exports = [
  {
    name: 'create-order',
    component: 'core_components/CreateOrder/CreateOrder.js',
    settings: 'core_components/CreateOrder/Settings.js',
    settingsWidth: '300px',
    img: 'core_components/CreateOrder/Buy.png',
    header: 'Limit buy',
    customHeader: '',
    description: 'Place order to buy',
    author: '#core',
    authorLink: 'https://github.com/kupi-network/kupi-terminal',
    source: 'https://github.com/kupi-network/kupi-terminal/blob/master/react-client/src/core_components/CreateOrder/CreateOrder.js',
    data: {type: 'buy'}
  },
  {
    name: 'create-order',
    component: 'core_components/CreateOrder/CreateOrder.js',
    settings: 'core_components/CreateOrder/Settings.js',
    settingsWidth: '300px',
    img: 'core_components/CreateOrder/Sell.png',
    header: 'Limit sell',
    customHeader: '',
    description: 'Place order to buy',
    author: '#core',
    authorLink: 'https://github.com/kupi-network/kupi-terminal',
    source: 'https://github.com/kupi-network/kupi-terminal/blob/master/react-client/src/core_components/CreateOrder/CreateOrder.js',
    data: {type: 'sell'}
  }
]
