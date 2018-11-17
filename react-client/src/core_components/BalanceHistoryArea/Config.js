module.exports = [
  {
    name: 'balance-history-area',
    component: 'core_components/BalanceHistoryArea/BalanceHistoryArea.js',
    settings: 'core_components/BalanceHistoryArea/Settings.js',
    settingsWidth: '300px',
    img: 'core_components/BalanceHistoryArea/BalanceHistoryArea.png',
    header: 'Total balance history',
    customHeader: '',
    description: 'Stacked area chart view',
    author: '#core',
    authorLink: 'https://github.com/kupi-network/kupi-terminal',
    source: 'https://github.com/kupi-network/kupi-terminal/blob/master/react-client/src/core_components/BalanceHistoryArea/BalanceHistoryArea.js',
    data: {stock: 'TOTAL', stockTemp: 'BINANCE', total: true, type: 'history'}
  },
  {
    name: 'balance-history-area',
    component: 'core_components/BalanceHistoryArea/BalanceHistoryArea.js',
    settings: 'core_components/BalanceHistoryArea/Settings.js',
    settingsWidth: '300px',
    img: 'core_components/BalanceHistoryArea/BalanceHistoryArea.png',
    header: 'Balance history',
    customHeader: '',
    description: 'Stacked area chart view',
    author: '#core',
    authorLink: 'https://github.com/kupi-network/kupi-terminal',
    source: 'https://github.com/kupi-network/kupi-terminal/blob/master/react-client/src/core_components/BalanceHistoryArea/BalanceHistoryArea.js',
    data: {stock: 'BINANCE', stockTemp: 'BINANCE', total: false, type: 'history'}
  }
]
