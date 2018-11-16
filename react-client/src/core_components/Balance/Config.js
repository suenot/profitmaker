module.exports = [
  {
    name: 'balance-table',
    component: 'core_components/Balance/Balance.js',
    settings: 'core_components/Balance/Settings.js',
    settingsWidth: '300px',
    img: 'core_components/Balance/Balance.png',
    header: 'Total balance',
    customHeader: '',
    description: 'Table view',
    author: '#core',
    authorLink: 'https://github.com/kupi-network/kupi-terminal',
    source: 'https://github.com/kupi-network/kupi-terminal/blob/master/react-client/src/core_components/Balance/Balance.js',
    data: {stock: 'BINANCE', total: true, type: 'table'}
  },
  {
    name: 'balance-table',
    component: 'core_components/Balance/Balance.js',
    settings: 'core_components/Balance/Settings.js',
    settingsWidth: '300px',
    img: 'core_components/Balance/Balance.png',
    header: 'Balance',
    customHeader: '',
    description: 'Table view',
    author: '#core',
    authorLink: 'https://github.com/kupi-network/kupi-terminal',
    source: 'https://github.com/kupi-network/kupi-terminal/blob/master/react-client/src/core_components/Balance/Balance.js',
    data: {stock: 'BINANCE', total: false, type: 'table'}
  }
]
